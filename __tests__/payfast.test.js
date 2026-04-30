/**
 * @jest-environment node
 */

const crypto = require("crypto");
const {
  pfEncode,
  buildSignature,
  parseUrlEncodedOrdered,
  verifyItnSignature,
  isPayFastIp
} = require("../api/_lib/payfast");

const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");

describe("pfEncode", () => {
  test("encodes spaces as + (PayFast's PHP-style urlencode)", () => {
    expect(pfEncode("hello world")).toBe("hello+world");
  });

  test("escapes special chars", () => {
    expect(pfEncode("a&b=c")).toBe("a%26b%3Dc");
  });

  test("leaves bare ASCII alone", () => {
    expect(pfEncode("abc-XYZ_123")).toBe("abc-XYZ_123");
  });
});

describe("buildSignature", () => {
  const fields = [
    ["merchant_id", "10000100"],
    ["merchant_key", "46f0cd694581a"],
    ["amount", "100.00"],
    ["item_name", "Test Product"]
  ];

  test("matches md5 of urlencoded ordered fields without passphrase", () => {
    const expected = md5("merchant_id=10000100&merchant_key=46f0cd694581a&amount=100.00&item_name=Test+Product");
    expect(buildSignature(fields, "")).toBe(expected);
  });

  test("appends passphrase as the final field", () => {
    const expected = md5(
      "merchant_id=10000100&merchant_key=46f0cd694581a&amount=100.00&item_name=Test+Product&passphrase=jt7NOE43FZPn"
    );
    expect(buildSignature(fields, "jt7NOE43FZPn")).toBe(expected);
  });

  test("skips empty / null / undefined fields", () => {
    const withGaps = [
      ["merchant_id", "10000100"],
      ["name_first", ""],
      ["email_address", null],
      ["custom_str1", undefined],
      ["amount", "50.00"]
    ];
    const expected = md5("merchant_id=10000100&amount=50.00");
    expect(buildSignature(withGaps, "")).toBe(expected);
  });

  test("trims whitespace before encoding", () => {
    const expected = md5("merchant_id=10000100&item_name=Test+Product");
    expect(buildSignature([["merchant_id", " 10000100 "], ["item_name", " Test Product "]], "")).toBe(expected);
  });
});

describe("parseUrlEncodedOrdered + verifyItnSignature", () => {
  test("preserves field order from raw body", () => {
    const raw = "b=2&a=1&c=3";
    expect(parseUrlEncodedOrdered(raw)).toEqual([["b", "2"], ["a", "1"], ["c", "3"]]);
  });

  test("decodes + as space", () => {
    expect(parseUrlEncodedOrdered("item_name=Test+Product")).toEqual([["item_name", "Test Product"]]);
  });

  test("verifies a signature that matches the body order", () => {
    const fields = [
      ["m_payment_id", "cb_xyz"],
      ["pf_payment_id", "1234"],
      ["payment_status", "COMPLETE"],
      ["amount_gross", "150.00"]
    ];
    const sig = buildSignature(fields, "secret");
    const raw = fields.map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`).join("&") + `&signature=${sig}`;
    const pairs = parseUrlEncodedOrdered(raw);
    expect(verifyItnSignature(pairs, "secret")).toBe(true);
  });

  test("rejects a signature when a field has been tampered with", () => {
    const fields = [["m_payment_id", "cb_xyz"], ["amount_gross", "150.00"]];
    const sig = buildSignature(fields, "secret");
    const tampered = parseUrlEncodedOrdered(`m_payment_id=cb_xyz&amount_gross=999.00&signature=${sig}`);
    expect(verifyItnSignature(tampered, "secret")).toBe(false);
  });

  test("rejects a signature with the wrong passphrase", () => {
    const fields = [["m_payment_id", "cb_xyz"]];
    const sig = buildSignature(fields, "secret-A");
    const pairs = parseUrlEncodedOrdered(`m_payment_id=cb_xyz&signature=${sig}`);
    expect(verifyItnSignature(pairs, "secret-B")).toBe(false);
  });

  test("verifies ITN bodies that include empty fields (PayFast includes them in md5)", () => {
    // PayFast's PHP sample iterates every POSTed field — including empties like
    // item_description= and name_last= — when computing the ITN signature.
    const sigBody =
      "m_payment_id=cb_xyz" +
      "&pf_payment_id=12345" +
      "&payment_status=COMPLETE" +
      "&item_name=CampusBites+order" +
      "&item_description=" +
      "&amount_gross=150.00" +
      "&amount_fee=-3.00" +
      "&amount_net=147.00" +
      "&custom_str1=user_abc" +
      "&custom_str2=" +
      "&custom_str3=" +
      "&name_first=Jane" +
      "&name_last=" +
      "&email_address=jane%40example.com" +
      "&merchant_id=10000100";
    const sig = crypto.createHash("md5")
      .update(sigBody + "&passphrase=secret")
      .digest("hex");
    const pairs = parseUrlEncodedOrdered(sigBody + `&signature=${sig}`);
    expect(verifyItnSignature(pairs, "secret")).toBe(true);
  });
});

describe("isPayFastIp", () => {
  test.each([
    ["197.97.145.144", true],
    ["197.97.145.155", true],
    ["197.97.145.160", false],
    ["41.74.179.192", true],
    ["41.74.179.223", true],
    ["41.74.179.224", false],
    ["8.8.8.8", false],
    ["127.0.0.1", false]
  ])("classifies %s correctly", (ip, expected) => {
    expect(isPayFastIp(ip)).toBe(expected);
  });

  test("strips IPv6-mapped IPv4 prefix", () => {
    expect(isPayFastIp("::ffff:197.97.145.144")).toBe(true);
  });
});
