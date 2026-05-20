jest.mock('../scripts/database.js', () => ({
  auth: { currentUser: null },
  db: {},
  getDocs: jest.fn(),
  collection: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
}));

let checkPaystackHealth;

const mountHealthCard = () => {
  document.body.innerHTML = `
    <article id="paystack-health" class="flex justify-between items-center p-3 bg-green-50 rounded-lg">
      <span class="text-green-800">Payment Gateway</span>
      <span class="text-gray-600 text-sm font-medium">Checking…</span>
    </article>
  `;
};

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mountHealthCard();
  document.addEventListener = jest.fn();
  ({ checkPaystackHealth } = require('../scripts/admin.js'));
});

afterEach(() => {
  delete global.fetch;
});

test('renders Operational with latency when backend reports healthy', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({ status: 'operational', latencyMs: 123 })
  });

  await checkPaystackHealth();

  const card = document.getElementById('paystack-health');
  const label = card.querySelector('span:last-child');
  expect(label.textContent).toBe('Operational (123ms)');
  expect(card.className).toContain('bg-green-50');
  expect(label.className).toContain('text-green-600');
});

test('renders Down + red when backend reports degraded', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({ status: 'degraded', reason: 'auth failed' })
  });

  await checkPaystackHealth();

  const card = document.getElementById('paystack-health');
  const label = card.querySelector('span:last-child');
  expect(label.textContent).toBe('Down');
  expect(card.className).toContain('bg-red-50');
  expect(label.className).toContain('text-red-600');
});

test('renders Unreachable when fetch itself throws', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('network'));

  await checkPaystackHealth();

  const label = document.getElementById('paystack-health').querySelector('span:last-child');
  expect(label.textContent).toBe('Unreachable');
});

test('no-ops safely when the health card is not in the DOM', async () => {
  document.body.innerHTML = '';
  global.fetch = jest.fn();

  await expect(checkPaystackHealth()).resolves.toBeUndefined();
  expect(global.fetch).not.toHaveBeenCalled();
});
