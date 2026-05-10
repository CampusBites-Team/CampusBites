const { admin, getAdminApp, getDb } = require("../_lib/firebase-admin");
const { paystackFetch, bankCodeFor } = require("../_lib/paystack");

async function verifyVendor(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const err = new Error("Missing bearer token");
    err.status = 401;
    throw err;
  }

  getAdminApp();
  const decoded = await admin.auth().verifyIdToken(match[1]);

  const db = getDb();
  const snap = await db.collection("users").doc(decoded.uid).get();
  if (!snap.exists) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  const data = snap.data();
  if (data.role !== "vendor") {
    const err = new Error("Vendor role required");
    err.status = 403;
    throw err;
  }
  if (data.status !== "approved") {
    const err = new Error("Vendor account is not approved");
    err.status = 403;
    throw err;
  }
  return { uid: decoded.uid, vendor: data };
}

function hasFullBankDetails(b) {
  return b && b.bankName && b.accountHolder && b.accountNumber && b.branchCode && b.accountType;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { uid, vendor } = await verifyVendor(req);

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON body" }); }
    }
    const { bankDetails } = body || {};

    if (!hasFullBankDetails(bankDetails)) {
      return res.status(400).json({ error: "All banking fields are required" });
    }

    if (!/^\d{6,12}$/.test(bankDetails.accountNumber)) {
      return res.status(400).json({ error: "Account number must be 6 to 12 digits" });
    }

    if (!/^\d{6}$/.test(bankDetails.branchCode)) {
      return res.status(400).json({ error: "Branch code must be 6 digits" });
    }

    const bankCode = bankCodeFor(bankDetails.bankName);
    if (!bankCode) {
      return res.status(400).json({ error: `Unsupported bank: "${bankDetails.bankName}"` });
    }

    const db = getDb();
    const vendorRef = db.collection("users").doc(uid);

    await vendorRef.update({
      bankDetails,
      paystackSubaccountCode: null,
      paystackSubaccountCreatedAt: null
    });

    const businessName = vendor.shopName || vendor.fullName || vendor.email || uid;

    const result = await paystackFetch("/subaccount", {
      method: "POST",
      body: {
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: bankDetails.accountNumber,
        percentage_charge: 0,
        primary_contact_name: bankDetails.accountHolder,
        primary_contact_email: vendor.email || undefined,
        description: `CampusBites vendor ${uid}`
      }
    });

    const subaccountCode = result.data && result.data.subaccount_code;
    if (!subaccountCode) {
      throw new Error("Paystack response missing subaccount_code");
    }

    await vendorRef.update({
      paystackSubaccountCode: subaccountCode,
      paystackSubaccountCreatedAt: new Date().toISOString()
    });

    return res.status(200).json({ subaccount_code: subaccountCode });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("update-bank-details error:", err.paystackBody || err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
};
