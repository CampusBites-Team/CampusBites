const { admin, getDb } = require("../_lib/firebase-admin");
const {
  parseUrlEncodedOrdered,
  verifyItnSignature,
  validateAtPayFast,
  isPayFastIp
} = require("../_lib/payfast");

// Vercel Node functions parse url-encoded bodies into req.body by default,
// but we need the *raw* body so we can re-POST it to PayFast and parse it
// in the exact order PayFast sent. Read the stream ourselves.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.body === "string" && req.body.length > 0) {
      return resolve(req.body);
    }
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "";
}

function pairsToObject(pairs) {
  const obj = {};
  for (const [k, v] of pairs) obj[k] = v;
  return obj;
}

module.exports = async (req, res) => {
  // PayFast retries on non-200, so we always 200 after we've decided. We log
  // and short-circuit on any rejection without writing to Firestore.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  let raw;
  try {
    raw = await readRawBody(req);
  } catch (err) {
    console.error("[ITN] failed to read body", err);
    return res.status(200).end();
  }

  const pairs = parseUrlEncodedOrdered(raw);
  const fields = pairsToObject(pairs);
  const passphrase = process.env.PAYFAST_PASSPHRASE || "";
  const host = process.env.PAYFAST_HOST || "https://sandbox.payfast.co.za";

  // 1. Signature
  if (!verifyItnSignature(pairs, passphrase)) {
    // Log the field names (not values — values can contain PII) so we can spot
    // unexpected fields in the body, plus passphrase length to confirm env is
    // configured. Body length helps spot truncation.
    console.warn("[ITN] signature mismatch", {
      m_payment_id: fields.m_payment_id,
      received_signature: fields.signature,
      field_keys: pairs.map(([k]) => k),
      raw_body_length: raw.length,
      passphrase_length: passphrase.length
    });
    return res.status(200).end();
  }

  // 2. Source IP (skip in local dev where PayFast can't reach us anyway)
  const skipIpCheck = process.env.PAYFAST_SKIP_IP_CHECK === "true";
  const clientIp = getClientIp(req);
  if (!skipIpCheck && !isPayFastIp(clientIp)) {
    console.warn("[ITN] source IP not in PayFast range", {
      clientIp,
      m_payment_id: fields.m_payment_id
    });
    return res.status(200).end();
  }

  // 3. Server-to-server validation (re-POST raw body, expect "VALID")
  let valid = false;
  let validateError = null;
  try {
    valid = await validateAtPayFast(raw, host);
  } catch (err) {
    validateError = err.message;
    console.error("[ITN] validate request failed", err);
  }
  if (!valid) {
    console.warn("[ITN] PayFast did not respond VALID", {
      m_payment_id: fields.m_payment_id,
      host,
      validateError
    });
    return res.status(200).end();
  }

  const m_payment_id = fields.m_payment_id;
  const paymentStatus = fields.payment_status;
  const amountGross = parseFloat(fields.amount_gross);

  if (!m_payment_id) {
    console.warn("[ITN] missing m_payment_id");
    return res.status(200).end();
  }

  const db = getDb();
  const pendingRef = db.collection("pending_payments").doc(m_payment_id);

  if (paymentStatus !== "COMPLETE") {
    // Cancellations / failures: just record state, don't create orders.
    await pendingRef.set({
      status: paymentStatus === "CANCELLED" ? "cancelled" : "failed",
      pf_payment_id: fields.pf_payment_id || null,
      itnReceivedAt: new Date().toISOString(),
      itnRawStatus: paymentStatus
    }, { merge: true });
    return res.status(200).end();
  }

  // 4. Idempotent transaction: load pending, verify amount, create orders + ledger
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(pendingRef);
      if (!snap.exists) {
        throw new Error(`pending_payments/${m_payment_id} not found`);
      }
      const pending = snap.data();
      if (pending.status === "paid") {
        // Already processed — nothing to do
        return;
      }
      if (Math.abs(Number(pending.total) - amountGross) > 0.01) {
        throw new Error(
          `amount mismatch: pending=${pending.total} payfast=${amountGross}`
        );
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      const paidAtIso = new Date().toISOString();
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
          m_payment_id,
          pf_payment_id: fields.pf_payment_id || null,
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
          m_payment_id,
          amount: v.subtotal,
          status: "pending_payout",
          createdAt: now
        });
      }

      const platformLedgerRef = db.collection("wallet_ledger").doc();
      tx.set(platformLedgerRef, {
        type: "credit",
        vendorId: null,
        wallet: "campus_bites",
        orderIds,
        m_payment_id,
        amount: pending.total,
        status: "received",
        createdAt: now
      });

      tx.update(pendingRef, {
        status: "paid",
        pf_payment_id: fields.pf_payment_id || null,
        itnReceivedAt: paidAtIso,
        orderIds
      });
    });
  } catch (err) {
    console.error("[ITN] transaction failed", err);
    // Still respond 200 — PayFast retries are useful only for transient network
    // errors, and we don't want infinite retries for permanent mismatches.
    return res.status(200).end();
  }

  return res.status(200).end();
};
