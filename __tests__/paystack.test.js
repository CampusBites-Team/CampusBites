/**
 * @jest-environment node
 */

const crypto = require("crypto");

const {
  BANK_CODE_MAP,
  bankCodeFor,
  toCents,
  verifyWebhookSignature
} = require("../api/_lib/paystack");

describe("toCents", () => {
  test("converts whole rand to cents", () => {
    expect(toCents(45)).toBe(4500);
  });

  test("converts two-decimal rand to integer cents", () => {
    expect(toCents(12.34)).toBe(1234);
  });

  test("rounds half-cent values to nearest integer", () => {
    expect(toCents(12.345)).toBe(1235);
  });

  test("returns 0 for 0", () => {
    expect(toCents(0)).toBe(0);
  });
});

describe("BANK_CODE_MAP", () => {
  test("covers every bankName option exposed in the registration form", () => {
    const expected = [
      "absa", "capitec", "discovery", "fnb", "investec",
      "nedbank", "standard_bank", "tymebank", "african_bank", "bidvest"
    ];
    for (const key of expected) {
      expect(BANK_CODE_MAP[key]).toMatch(/^\d+$/);
    }
  });

  test("bankCodeFor returns null for unknown banks", () => {
    expect(bankCodeFor("not_a_real_bank")).toBeNull();
  });

  test("bankCodeFor returns the same value as a direct map lookup", () => {
    expect(bankCodeFor("capitec")).toBe(BANK_CODE_MAP.capitec);
  });
});

describe("verifyWebhookSignature", () => {
  const SECRET = "sk_test_" + "a".repeat(40);
  const RAW_BODY = JSON.stringify({ event: "charge.success", data: { reference: "cb_abc" } });

  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = SECRET;
  });

  afterEach(() => {
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  test("accepts a signature computed with the same secret + body", () => {
    const sig = crypto.createHmac("sha512", SECRET).update(RAW_BODY).digest("hex");
    expect(verifyWebhookSignature(RAW_BODY, sig)).toBe(true);
  });

  test("rejects a tampered body with the original signature", () => {
    const sig = crypto.createHmac("sha512", SECRET).update(RAW_BODY).digest("hex");
    const tampered = RAW_BODY.replace("cb_abc", "cb_evil");
    expect(verifyWebhookSignature(tampered, sig)).toBe(false);
  });

  test("rejects when the wrong secret was used", () => {
    const sig = crypto.createHmac("sha512", "sk_test_other").update(RAW_BODY).digest("hex");
    expect(verifyWebhookSignature(RAW_BODY, sig)).toBe(false);
  });

  test("rejects when the signature header is missing", () => {
    expect(verifyWebhookSignature(RAW_BODY, undefined)).toBe(false);
    expect(verifyWebhookSignature(RAW_BODY, "")).toBe(false);
  });

  test("rejects when the secret env var is unset", () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const sig = crypto.createHmac("sha512", SECRET).update(RAW_BODY).digest("hex");
    expect(verifyWebhookSignature(RAW_BODY, sig)).toBe(false);
  });
});
