/**
 * @jest-environment jsdom
 */

jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  doc: jest.fn((...args) => args),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn((...args) => args),
  onAuthStateChanged: jest.fn(),
}));

const makeLedgerSnapshot = (rows = []) => ({
  forEach(cb) {
    rows.forEach((r, i) =>
      cb({
        id: r.id || `e${i}`,
        data: () => {
          const { id, ...rest } = r;
          return rest;
        },
      })
    );
  },
});

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const setupDom = () => {
  document.body.innerHTML = `
    <section id="auth-warning" class="hidden"></section>
    <span id="summary-settled"></span>
    <span id="summary-refunded"></span>
    <span id="summary-campus"></span>
    <table><tbody id="payouts-body"></tbody></table>
  `;
};

describe('admin-payouts.js', () => {
  let database;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    setupDom();

    database = require('../scripts/database.js');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadPayouts', () => {
    test('renders empty state when no settled payouts', async () => {
      database.getDocs.mockResolvedValueOnce(makeLedgerSnapshot([]));

      const { loadPayouts } = require('../scripts/admin-payouts.js');
      await loadPayouts();

      expect(document.getElementById('payouts-body').innerHTML)
        .toContain('No settled payouts yet.');
      expect(document.getElementById('summary-settled').textContent).toBe('R0.00');
      expect(document.getElementById('summary-refunded').textContent).toBe('R0.00');
      expect(document.getElementById('summary-campus').textContent).toBe('R0.00');
    });

    test('groups settled vendor entries and computes totals', async () => {
      database.getDocs.mockResolvedValueOnce(makeLedgerSnapshot([
        { id: 'e1', vendorId: 'v1', vendorName: 'Shop A', amount: 100, status: 'settled' },
        { id: 'e2', vendorId: 'v1', vendorName: 'Shop A', amount: 50, status: 'settled' },
        { id: 'e3', vendorId: 'v2', vendorName: 'Shop B', amount: 30, status: 'settled' },
        { id: 'e4', vendorId: 'v3', vendorName: 'Shop C', amount: 200, status: 'refunded' },
        { id: 'e5', wallet: 'campus_bites', amount: 25, status: 'received' },
      ]));

      const { loadPayouts } = require('../scripts/admin-payouts.js');
      await loadPayouts();

      expect(document.getElementById('summary-settled').textContent).toBe('R180.00');
      expect(document.getElementById('summary-refunded').textContent).toBe('R200.00');
      expect(document.getElementById('summary-campus').textContent).toBe('R25.00');

      const html = document.getElementById('payouts-body').innerHTML;
      expect(html).toContain('Shop A');
      expect(html).toContain('Shop B');
      expect(html).not.toContain('Shop C');
      expect(html).toContain('R150.00');
      expect(html).toContain('R30.00');
    });

    test('orders rows by total desc', async () => {
      database.getDocs.mockResolvedValueOnce(makeLedgerSnapshot([
        { id: 'e1', vendorId: 'small', vendorName: 'Small', amount: 10, status: 'settled' },
        { id: 'e2', vendorId: 'big', vendorName: 'Big', amount: 500, status: 'settled' },
        { id: 'e3', vendorId: 'big', vendorName: 'Big', amount: 100, status: 'settled' },
      ]));

      const { loadPayouts } = require('../scripts/admin-payouts.js');
      await loadPayouts();

      const rows = document.querySelectorAll('#payouts-body tr');
      expect(rows[0].dataset.vendorId).toBe('big');
      expect(rows[1].dataset.vendorId).toBe('small');
    });

    test('treats entries with null vendorId and received status as campus_bites revenue', async () => {
      database.getDocs.mockResolvedValueOnce(makeLedgerSnapshot([
        { id: 'e1', vendorId: null, amount: 40, status: 'received', wallet: 'campus_bites' },
      ]));

      const { loadPayouts } = require('../scripts/admin-payouts.js');
      await loadPayouts();

      expect(document.getElementById('summary-campus').textContent).toBe('R40.00');
    });
  });

  describe('auth flow', () => {
    test('shows auth-warning when no user is signed in', async () => {
      database.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

      require('../scripts/admin-payouts.js');
      await flush();

      expect(document.getElementById('auth-warning').classList.contains('hidden')).toBe(false);
    });

    test('non-admin user sees Admins only message', async () => {
      database.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: 'u1' }));
      database.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: 'customer' }),
      });

      require('../scripts/admin-payouts.js');
      await flush();

      expect(document.getElementById('payouts-body').innerHTML).toContain('Admins only.');
      expect(document.getElementById('auth-warning').classList.contains('hidden')).toBe(false);
    });

    test('admin user loads payouts and hides auth-warning', async () => {
      database.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: 'admin1' }));
      database.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: 'admin' }),
      });
      database.getDocs.mockResolvedValueOnce(makeLedgerSnapshot([]));

      require('../scripts/admin-payouts.js');
      await flush();

      expect(document.getElementById('auth-warning').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('payouts-body').innerHTML).toContain('No settled payouts yet.');
    });
  });
});
