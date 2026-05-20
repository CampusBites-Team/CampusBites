const { paystackFetch } = require("../_lib/paystack");

module.exports = async function (req, res) {
  const startedAt = Date.now();
  try {
    // Cheap, read-only call. If this succeeds, auth + connectivity are fine.
    await paystackFetch("/bank?country=south%20africa&perPage=1");
    return res.json({
      status: "operational",
      latencyMs: Date.now() - startedAt
    });
  } catch (err) {
    // 401 = bad/missing key, 5xx = Paystack down, network error = no connection
    return res.status(200).json({
      status: "degraded",
      reason: err.message,
      paystackStatus: err.paystackStatus || null,
      latencyMs: Date.now() - startedAt
    });
  }
};
