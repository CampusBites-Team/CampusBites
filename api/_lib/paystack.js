const crypto = require("crypto");

const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Internal bankName values (set at vendor registration in scripts/register.js)
// → Paystack ZA settlement_bank codes. These are the SA Universal Branch Codes
// returned by Paystack's GET /bank?country=south%20africa endpoint. If Paystack
// changes a code, subaccount creation for that bank will fail with a 400 — at
// which point fetch the live list and update this map.
const BANK_CODE_MAP = {
  absa: "632005",
  capitec: "470010",
  discovery: "679000",
  fnb: "250655",
  investec: "580105",
  nedbank: "198765",
  standard_bank: "051001",
  tymebank: "678910",
  african_bank: "430000",
  bidvest: "462005"
};

function bankCodeFor(bankName) {
  return BANK_CODE_MAP[bankName] || null;
}

// Paystack works in minor units. Cart totals are already rounded to 2dp at the
// vendor-breakdown stage, so Math.round is exact for our inputs.
function toCents(rand) {
  return Math.round(Number(rand) * 100);
}

async function paystackFetch(path, { method = "GET", body } = {}) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY env var is not set");
  }

  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Paystack ${method} ${path} returned non-JSON (status ${res.status})`);
  }

  if (!res.ok || json.status === false) {
    const msg = json.message || `Paystack ${method} ${path} failed (status ${res.status})`;
    const err = new Error(msg);
    err.paystackStatus = res.status;
    err.paystackBody = json;
    throw err;
  }

  return json;
}

// Paystack signs webhook payloads with HMAC-SHA512 over the raw request body
// using the merchant's secret key. The hex digest arrives in x-paystack-signature.
function verifyWebhookSignature(rawBody, headerSignature) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !headerSignature) return false;

  const computed = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  if (computed.length !== headerSignature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(computed, "hex"),
    Buffer.from(headerSignature, "hex")
  );
}

module.exports = {
  PAYSTACK_BASE_URL,
  BANK_CODE_MAP,
  bankCodeFor,
  toCents,
  paystackFetch,
  verifyWebhookSignature
};
