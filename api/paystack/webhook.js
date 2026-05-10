const { admin, getDb } = require("../_lib/firebase-admin");
const { verifyWebhookSignature } = require("../_lib/paystack");

// Vercel Node parses JSON bodies automatically, but the HMAC must be computed
// over the exact bytes Paystack sent — so we read the raw stream ourselves.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.body === "string" && req.body.length > 0) {
      return resolve(req.body);
    }
    if (Buffer.isBuffer(req.body)) {
      return resolve(req.body.toString("utf8"));
    }
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  // Always 200 once we've decided so Paystack stops retrying. We log and
  // short-circuit on rejections without writing to Firestore.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  let raw;
  try {
    raw = await readRawBody(req);
  } catch (err) {
    console.error("[paystack-webhook] failed to read body", err);
    return res.status(200).end();
  }

  const signature = req.headers["x-paystack-signature"];
  if (!verifyWebhookSignature(raw, signature)) {
    console.warn("[paystack-webhook] signature mismatch", {
      received_signature: signature,
      raw_length: raw.length
    });
    return res.status(200).end();
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch (err) {
    console.error("[paystack-webhook] invalid JSON", err);
    return res.status(200).end();
  }

  try {
    if (event.event === "charge.success") {
      await handleChargeSuccess(event.data || {});
    } else if (event.event === "refund.processed") {
      await handleRefundProcessed(event.data || {});
    } else {
      // Other events (transfer.success, subaccount.created, etc.) — ack and move on.
      console.log("[paystack-webhook] ignoring event", event.event);
    }
  } catch (err) {
    console.error("[paystack-webhook] handler failed", err);
  }

  return res.status(200).end();
};

async function handleChargeSuccess(data) {
  const reference = data.reference;
  const amountCents = Number(data.amount) || 0;
  const amountRand = Math.round(amountCents) / 100;

  if (!reference) {
    console.warn("[paystack-webhook] charge.success missing reference");
    return;
  }

  const db = getDb();
  const pendingRef = db.collection("pending_payments").doc(reference);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(pendingRef);
    if (!snap.exists) {
      throw new Error(`pending_payments/${reference} not found`);
    }
    const pending = snap.data();
    if (pending.status === "paid") {
      return;
    }
    if (Math.abs(Number(pending.total) - amountRand) > 0.01) {
      throw new Error(
        `amount mismatch: pending=${pending.total} paystack=${amountRand}`
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const paidAtIso = new Date().toISOString();
    const paystackTransactionId = data.id ? String(data.id) : null;
    const orderIds = [];

    for (const v of pending.vendorBreakdown) {
      const orderRef = db.collection("orders").doc();
      tx.set(orderRef, {
        userId: pending.userId,
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        menuItems: v.items,
        status: "pending",
        paymentStatus: "paid",
        total: v.subtotal,
        paystackReference: reference,
        paystackTransactionId,
        paidAt: paidAtIso,
        createdAt: now
      });
      orderIds.push(orderRef.id);

      const vendorLedgerRef = db.collection("wallet_ledger").doc();
      tx.set(vendorLedgerRef, {
        type: "credit",
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        orderId: orderRef.id,
        paystackReference: reference,
        amount: v.subtotal,
        status: "settled",
        createdAt: now
      });
    }

    const platformLedgerRef = db.collection("wallet_ledger").doc();
    tx.set(platformLedgerRef, {
      type: "credit",
      vendorId: null,
      wallet: "campus_bites",
      orderIds,
      paystackReference: reference,
      amount: pending.total,
      status: "received",
      createdAt: now
    });

    tx.update(pendingRef, {
      status: "paid",
      paystackTransactionId,
      paystackReceivedAt: paidAtIso,
      orderIds
    });
  });
}

async function handleRefundProcessed(data) {
  // Paystack's refund.processed payload nests the original transaction details
  // under data.transaction, with the merchant reference at .reference.
  const reference =
    data.transaction?.reference ||
    data.transaction_reference ||
    data.reference;
  if (!reference) {
    console.warn("[paystack-webhook] refund.processed missing transaction reference");
    return;
  }

  const refundAmountCents = Number(data.amount ?? data.transaction?.amount) || 0;
  const refundAmountRand = Math.round(refundAmountCents) / 100;
  const processedAt = new Date().toISOString();

  const db = getDb();

  const ordersSnap = await db.collection("orders")
    .where("paystackReference", "==", reference)
    .get();

  if (ordersSnap.empty) {
    console.warn("[paystack-webhook] no orders found for refund", reference);
    return;
  }

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  ordersSnap.forEach((orderDoc) => {
    const order = orderDoc.data();
    batch.update(orderDoc.ref, {
      status: "refunded",
      paymentStatus: "refunded",
      refundedAt: processedAt
    });

    const reversalRef = db.collection("wallet_ledger").doc();
    batch.set(reversalRef, {
      type: "debit",
      vendorId: order.vendorId,
      vendorName: order.vendorName,
      orderId: orderDoc.id,
      paystackReference: reference,
      amount: order.total,
      status: "refunded",
      reason: "refund.processed",
      createdAt: now
    });
  });

  const platformReversalRef = db.collection("wallet_ledger").doc();
  batch.set(platformReversalRef, {
    type: "debit",
    vendorId: null,
    wallet: "campus_bites",
    paystackReference: reference,
    amount: refundAmountRand || ordersSnap.docs.reduce((s, d) => s + (d.data().total || 0), 0),
    status: "refunded",
    reason: "refund.processed",
    createdAt: now
  });

  await batch.commit();
}
