const crypto = require("crypto");

// PayFast signs requests using PHP urlencode() output. encodeURIComponent leaves
// `! * ' ( ) ~` unencoded and encodes spaces as %20; PHP urlencode encodes those
// chars and uses + for space. Without this normalization, any field containing
// parens (e.g. "CampusBites order (2 vendors)") or apostrophes ("O'Brien")
// produces a signature PayFast rejects with "Generated signature does not match".
function pfEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/~/g, "%7E");
}

// Build the signature for an ordered set of fields. Used both for outgoing
// create-payment requests (we control field order) and for verifying ITN
// callbacks (we re-use the order PayFast sent in the raw POST body).
//
// fieldsInOrder: array of [key, value] pairs in the order they will be posted.
// passphrase:    merchant passphrase; appended as a final pair if non-empty.
// options.filterEmpty: drop fields whose value is empty/null/undefined. Default
//                      true, which is right for outgoing requests. Must be
//                      false for ITN verification — PayFast includes empty
//                      fields like item_description= and name_last= in their
//                      md5, so dropping them here produces a mismatch.
// options.trim:        trim whitespace before encoding. Default true. Must be
//                      false for ITN verification — PayFast's PHP sample does
//                      not trim, and trimming would break verification of
//                      values that legitimately contain leading/trailing space.
function buildSignature(fieldsInOrder, passphrase, { filterEmpty = true, trim = true } = {}) {
  const fields = filterEmpty
    ? fieldsInOrder.filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
    : fieldsInOrder;
  const parts = fields.map(([k, v]) => {
    const sv = v === null || v === undefined ? "" : String(v);
    return `${k}=${pfEncode(trim ? sv.trim() : sv)}`;
  });

  if (passphrase && passphrase.length > 0) {
    parts.push(`passphrase=${pfEncode(passphrase.trim())}`);
  }

  return crypto.createHash("md5").update(parts.join("&")).digest("hex");
}

// Parse a raw URL-encoded POST body into an ordered array of [key, value] pairs,
// preserving the order PayFast sent. We need this because ITN signature must be
// computed against the exact field order received.
function parseUrlEncodedOrdered(rawBody) {
  if (!rawBody) return [];
  return rawBody.split("&").map((pair) => {
    const eq = pair.indexOf("=");
    if (eq === -1) return [decodeURIComponent(pair.replace(/\+/g, " ")), ""];
    const k = decodeURIComponent(pair.slice(0, eq).replace(/\+/g, " "));
    const v = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, " "));
    return [k, v];
  });
}

// Verify ITN signature: the `signature` field is excluded from the calculation,
// then md5 of remaining fields (in received order) plus passphrase must match.
// Empties and whitespace are preserved — PayFast's ITN signature is computed
// over every field it posts, including empty ones, without trimming.
function verifyItnSignature(orderedPairs, passphrase) {
  const received = orderedPairs.find(([k]) => k === "signature")?.[1];
  if (!received) return false;
  const withoutSig = orderedPairs.filter(([k]) => k !== "signature");
  const computed = buildSignature(withoutSig, passphrase, { filterEmpty: false, trim: false });
  return computed === received;
}

// Re-POST the raw body back to PayFast for server-side validation.
// PayFast responds with the literal text "VALID" on success.
async function validateAtPayFast(rawBody, host) {
  const url = `${host.replace(/\/$/, "")}/eng/query/validate`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: rawBody
  });
  const text = (await res.text()).trim();
  return text === "VALID";
}

// PayFast's published sandbox + production server IP ranges (CIDR).
// Source: https://developers.payfast.co.za/docs#notify_method
const PAYFAST_IP_RANGES = [
  "197.97.145.144/28",
  "41.74.179.192/27",
  "102.216.36.0/28",
  "102.216.36.128/28",
  "144.126.193.139/32"
];

function ipToInt(ip) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function ipInRange(ip, cidr) {
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  if (!ip.includes(".")) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(base) & mask);
}

function isPayFastIp(ip) {
  if (!ip) return false;
  // Strip IPv6-mapped IPv4 prefix if present
  const v4 = ip.replace(/^::ffff:/, "");
  return PAYFAST_IP_RANGES.some((range) => ipInRange(v4, range));
}

module.exports = {
  pfEncode,
  buildSignature,
  parseUrlEncodedOrdered,
  verifyItnSignature,
  validateAtPayFast,
  isPayFastIp,
  PAYFAST_IP_RANGES
};
