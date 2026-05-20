/**
 * @jest-environment node
 */

jest.mock('../api/_lib/paystack', () => ({
  paystackFetch: jest.fn()
}));

const { paystackFetch } = require('../api/_lib/paystack');
const handler = require('../api/paystack/health');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

afterEach(() => {
  jest.clearAllMocks();
});

test('returns operational when Paystack responds', async () => {
  paystackFetch.mockResolvedValue({ status: true, data: [] });

  const res = makeRes();
  await handler({}, res);

  expect(paystackFetch).toHaveBeenCalledWith(expect.stringContaining('/bank'));
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'operational',
      latencyMs: expect.any(Number)
    })
  );
  expect(res.status).not.toHaveBeenCalled(); // default 200 path
});

test('returns degraded with paystackStatus when Paystack rejects (e.g. 401)', async () => {
  const err = new Error('Invalid key');
  err.paystackStatus = 401;
  paystackFetch.mockRejectedValue(err);

  const res = makeRes();
  await handler({}, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'degraded',
      reason: 'Invalid key',
      paystackStatus: 401,
      latencyMs: expect.any(Number)
    })
  );
});

test('returns degraded with null paystackStatus on network error', async () => {
  paystackFetch.mockRejectedValue(new Error('fetch failed'));

  const res = makeRes();
  await handler({}, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'degraded',
      reason: 'fetch failed',
      paystackStatus: null
    })
  );
});
