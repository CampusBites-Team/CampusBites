const { admin, getAdminApp, getDb } = require("../_lib/firebase-admin");
const { paystackFetch, bankCodeFor } = require("../_lib/paystack");

async function verifyAdmin(req) {
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
  const callerSnap = await db.collection("users").doc(decoded.uid).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    const err = new Error("Admin role required");
    err.status = 403;
    throw err;
  }
  return decoded.uid;
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

    await verifyAdmin(req);

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON body" }); }
    }
    const { vendorId } = body || {};
    if (!vendorId || typeof vendorId !== "string") {
      return res.status(400).json({ error: "vendorId required" });
    }

    const db = getDb();
    const vendorRef = db.collection("users").doc(vendorId);
    const snap = await vendorRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Vendor not found" });

    const vendor = snap.data() || {};
    if (vendor.role !== "vendor") {
      return res.status(400).json({ error: "User is not a vendor" });
    }

    if (vendor.paystackSubaccountCode) {
      return res.status(200).json({
        subaccount_code: vendor.paystackSubaccountCode,
        alreadyExisted: true
      });
    }

    if (!hasFullBankDetails(vendor.bankDetails)) {
      return res.status(400).json({ error: "Vendor banking details are incomplete" });
    }

    const bankCode = bankCodeFor(vendor.bankDetails.bankName);
    if (!bankCode) {
      return res.status(400).json({
        error: `No Paystack bank code mapping for "${vendor.bankDetails.bankName}"`
      });
    }

    const businessName = vendor.shopName || vendor.fullName || vendor.email || vendorId;

    const result = await paystackFetch("/subaccount", {
      method: "POST",
      body: {
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: vendor.bankDetails.accountNumber,
        percentage_charge: 0,
        primary_contact_name: vendor.bankDetails.accountHolder,
        primary_contact_email: vendor.email || undefined,
        description: `CampusBites vendor ${vendorId}`
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

    return res.status(200).json({
      subaccount_code: subaccountCode,
      alreadyExisted: false
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("create-subaccount error:", err.paystackBody || err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
};
