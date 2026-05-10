const crypto = require("crypto");
const { getDb } = require("../_lib/firebase-admin");
const { paystackFetch, toCents } = require("../_lib/paystack");

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function generateReference() {
  return "cb_" + crypto.randomBytes(12).toString("hex");
}

module.exports = async (req, res) => {
  try {
    return await handler(req, res);
  } catch (err) {
    console.error("create-payment error:", err.paystackBody || err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
};

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return badRequest(res, "Invalid JSON body"); }
  }
  if (!body || typeof body !== "object") return badRequest(res, "Missing body");

  const { userId, cart } = body;
  if (!userId || typeof userId !== "string") return badRequest(res, "userId required");
  if (!Array.isArray(cart) || cart.length === 0) return badRequest(res, "cart must be a non-empty array");

  const ids = cart.map((c) => c && c.menuItemId).filter(Boolean);
  if (ids.length !== cart.length) return badRequest(res, "every cart entry must have menuItemId");

  const db = getDb();

  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) return badRequest(res, "User not found");
  const userData = userSnap.data() || {};
  if (userData.role && userData.role !== "customer") {
    return badRequest(res, "Only customers can place orders");
  }
  if (!userData.email) {
    return badRequest(res, "User has no email on file");
  }

  const itemRefs = ids.map((id) => db.collection("menu_items").doc(id));
  const itemSnaps = await db.getAll(...itemRefs);

  const enrichedItems = [];
  for (let i = 0; i < itemSnaps.length; i++) {
    const snap = itemSnaps[i];
    if (!snap.exists) return badRequest(res, `Menu item ${ids[i]} not found`);
    const data = snap.data() || {};
    if (data.available === false) return badRequest(res, `Menu item ${data.name || ids[i]} is unavailable`);
    if (typeof data.price !== "number" || data.price <= 0) {
      return badRequest(res, `Menu item ${data.name || ids[i]} has an invalid price`);
    }
    enrichedItems.push({ id: snap.id, ...data });
  }

  const grouped = {};
  for (const item of enrichedItems) {
    const vid = item.vendorId;
    if (!vid) return badRequest(res, `Menu item ${item.name} is missing a vendorId`);
    if (!grouped[vid]) {
      grouped[vid] = {
        vendorId: vid,
        vendorName: item.vendorName || "",
        items: [],
        subtotal: 0
      };
    }
    grouped[vid].items.push({
      id: item.id,
      name: item.name,
      price: item.price,
      vendorName: item.vendorName || "",
      dietary: item.dietary || [],
      allergens: item.allergens || [],
      description: item.description || "",
      image: item.image || ""
    });
    grouped[vid].subtotal += item.price;
  }

  const vendorIds = Object.keys(grouped);
  const vendorSnaps = await db.getAll(...vendorIds.map((vid) => db.collection("users").doc(vid)));

  for (let i = 0; i < vendorSnaps.length; i++) {
    const vSnap = vendorSnaps[i];
    const g = grouped[vendorIds[i]];
    if (!vSnap.exists) return badRequest(res, `Vendor ${g.vendorName || g.vendorId} not found`);
    const vData = vSnap.data() || {};
    if (!vData.paystackSubaccountCode) {
      return badRequest(res, `Vendor ${vData.shopName || g.vendorName || g.vendorId} is not set up for payouts yet`);
    }
    g.paystackSubaccountCode = vData.paystackSubaccountCode;
  }

  const vendorBreakdown = Object.values(grouped).map((g) => ({
    ...g,
    subtotal: Math.round(g.subtotal * 100) / 100
  }));
  const total = Math.round(vendorBreakdown.reduce((s, v) => s + v.subtotal, 0) * 100) / 100;

  if (total <= 0) return badRequest(res, "Cart total must be positive");

  const reference = generateReference();
  const callbackUrl = process.env.PAYSTACK_CALLBACK_URL;
  if (!callbackUrl) {
    return res.status(500).json({ error: "Server misconfigured: PAYSTACK_CALLBACK_URL missing" });
  }

  await db.collection("pending_payments").doc(reference).set({
    reference,
    userId,
    vendorBreakdown,
    total,
    status: "pending",
    createdAt: new Date().toISOString()
  });

  const split = {
    type: "flat",
    bearer_type: "all-proportional",
    subaccounts: vendorBreakdown.map((v) => ({
      subaccount: v.paystackSubaccountCode,
      share: toCents(v.subtotal)
    }))
  };

  const initBody = {
    email: userData.email,
    amount: toCents(total),
    reference,
    callback_url: callbackUrl,
    metadata: {
      userId,
      reference,
      vendorCount: vendorBreakdown.length
    },
    split
  };

  let initResult;
  try {
    initResult = await paystackFetch("/transaction/initialize", {
      method: "POST",
      body: initBody
    });
  } catch (err) {
    await db.collection("pending_payments").doc(reference).set({
      status: "failed",
      failedReason: err.message,
      failedAt: new Date().toISOString()
    }, { merge: true });
    throw err;
  }

  const { authorization_url, access_code } = initResult.data || {};
  if (!authorization_url) {
    throw new Error("Paystack response missing authorization_url");
  }

  return res.status(200).json({
    authorization_url,
    access_code,
    reference
  });
}
