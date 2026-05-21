const { admin, getDb } = require("../_lib/firebase-admin");

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

module.exports = async (req, res) => {
  try {
    return await handler(req, res);
  } catch (err) {
    console.error("create-cash error:", err);
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

  const vendorBreakdown = Object.values(grouped).map((g) => ({
    ...g,
    subtotal: Math.round(g.subtotal * 100) / 100
  }));
  const total = Math.round(vendorBreakdown.reduce((s, v) => s + v.subtotal, 0) * 100) / 100;

  if (total <= 0) return badRequest(res, "Cart total must be positive");

  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  const orderIds = [];

const customerName =
  userData.fullName ||
  userData.name ||
  userData.displayName ||
  userData.email ||
  "A customer";

for (const v of vendorBreakdown) {
  const orderRef = db.collection("orders").doc();
  const notificationRef = db.collection("notifications").doc();

  const orderSummary = v.items
    .map((item) => `${item.name} - R${Number(item.price || 0).toFixed(2)}`)
    .join(", ");
console.log("Creating vendor notification for:", v.vendorId);

  batch.set(orderRef, {
    userId,
    vendorId: v.vendorId,
    vendorName: v.vendorName,
    menuItems: v.items,
    status: "Pending",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    total: v.subtotal,
    createdAt: now,
    updatedAt: now
  });

  batch.set(notificationRef, {
    userId: v.vendorId,
    role: "vendor",
    title: "New Order Received",
    message: `${customerName} placed an order: ${orderSummary}`,
    type: "new-order",
    orderId: orderRef.id,
    read: false,
    createdAt: now
  });

  orderIds.push(orderRef.id);
}

  await batch.commit();

  return res.status(200).json({ orderIds });
}
