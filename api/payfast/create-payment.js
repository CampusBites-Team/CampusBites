const crypto = require("crypto");
const { getDb } = require("../_lib/firebase-admin");
const { buildSignature } = require("../_lib/payfast");

function badRequest(res, message) {
  res.status(400).json({ error: message });
}

function generatePaymentId() {
  // Short URL-safe id (PayFast m_payment_id has a 100-char limit; we keep it small)
  return "cb_" + crypto.randomBytes(12).toString("hex");
}

module.exports = async (req, res) => {
  try {
    return await handler(req, res);
  } catch (err) {
    console.error("create-payment error:", err);
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

  // Verify user exists and is a customer
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) return badRequest(res, "User not found");
  const userData = userSnap.data() || {};
  if (userData.role && userData.role !== "customer") {
    return badRequest(res, "Only customers can place orders");
  }

  // Re-fetch every menu item from Firestore (server-side pricing is the source of truth)
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

  // Group items by vendor
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

  const vendorBreakdown = Object.values(grouped).map((g) => ({
    ...g,
    subtotal: Math.round(g.subtotal * 100) / 100
  }));
  const total = Math.round(vendorBreakdown.reduce((s, v) => s + v.subtotal, 0) * 100) / 100;

  if (total <= 0) return badRequest(res, "Cart total must be positive");

  const m_payment_id = generatePaymentId();

  await db.collection("pending_payments").doc(m_payment_id).set({
    m_payment_id,
    userId,
    vendorBreakdown,
    total,
    status: "pending",
    createdAt: new Date().toISOString()
  });

  // Build PayFast field set in the order PayFast documents (we control this order
  // for signature generation). Every present field is included in the signature.
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE || "";
  const host = process.env.PAYFAST_HOST || "https://sandbox.payfast.co.za";

  if (!merchantId || !merchantKey) {
    return res.status(500).json({ error: "Server misconfigured: PayFast credentials missing" });
  }

  const itemName = vendorBreakdown.length === 1
    ? `CampusBites order - ${vendorBreakdown[0].vendorName}`
    : `CampusBites order (${vendorBreakdown.length} vendors)`;

  const orderedFields = [
    ["merchant_id", merchantId],
    ["merchant_key", merchantKey],
    ["return_url", process.env.PAYFAST_RETURN_URL],
    ["cancel_url", process.env.PAYFAST_CANCEL_URL],
    ["notify_url", process.env.PAYFAST_NOTIFY_URL],
    ["name_first", userData.fullName ? String(userData.fullName).split(" ")[0] : ""],
    ["name_last", userData.fullName ? String(userData.fullName).split(" ").slice(1).join(" ") : ""],
    ["email_address", userData.email || ""],
    ["m_payment_id", m_payment_id],
    ["amount", total.toFixed(2)],
    ["item_name", itemName.slice(0, 100)],
    ["custom_str1", userId]
  ];

  const signature = buildSignature(orderedFields, passphrase);

  const fields = {};
  for (const [k, v] of orderedFields) {
    if (v !== undefined && v !== null && String(v).length > 0) fields[k] = String(v);
  }
  fields.signature = signature;

  return res.status(200).json({
    action: `${host.replace(/\/$/, "")}/eng/process`,
    fields,
    m_payment_id
  });
}
