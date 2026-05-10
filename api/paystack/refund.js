const { admin, getAdminApp, getDb } = require("../_lib/firebase-admin");
const { paystackFetch, toCents } = require("../_lib/paystack");

async function verifyCaller(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const err = new Error("Missing bearer token");
    err.status = 401;
    throw err;
  }
  getAdminApp();
  return await admin.auth().verifyIdToken(match[1]);
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const decoded = await verifyCaller(req);

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON body" }); }
    }
    const { orderId } = body || {};
    if (!orderId || typeof orderId !== "string") {
      return res.status(400).json({ error: "orderId required" });
    }

    const db = getDb();
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return res.status(404).json({ error: "Order not found" });

    const order = orderSnap.data() || {};

    // Caller must be the customer who placed the order, or an admin.
    if (order.userId !== decoded.uid) {
      const callerSnap = await db.collection("users").doc(decoded.uid).get();
      const callerRole = callerSnap.exists ? callerSnap.data().role : null;
      if (callerRole !== "admin") {
        return res.status(403).json({ error: "Not authorised to refund this order" });
      }
    }

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({ error: `Order is not in a refundable state (paymentStatus=${order.paymentStatus})` });
    }
    if (order.refundInitiatedAt || order.paymentStatus === "refunded") {
      return res.status(400).json({ error: "Refund already initiated for this order" });
    }
    if (!order.paystackReference) {
      return res.status(400).json({ error: "Order has no paystackReference" });
    }

    const result = await paystackFetch("/refund", {
      method: "POST",
      body: {
        transaction: order.paystackReference,
        amount: toCents(order.total)
      }
    });

    await orderRef.update({
      refundInitiatedAt: new Date().toISOString(),
      refundInitiatedBy: decoded.uid,
      refundPaystackId: result.data && result.data.id ? String(result.data.id) : null
    });

    return res.status(200).json({
      ok: true,
      refundId: result.data && result.data.id ? String(result.data.id) : null
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("paystack/refund error:", err.paystackBody || err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
};
