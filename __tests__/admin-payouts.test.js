/**
 * @jest-environment jsdom
 */

jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  doc: jest.fn((...args) => args),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn((...args) => args),
  query: jest.fn((...args) => args),
  where: jest.fn((...args) => args),
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
    <div id="auth-warning" class="hidden"></div>
    <span id="summary-pending"></span>
    <span id="summary-paid-out"></span>
    <span id="summary-campus"></span>
    <table><tbody id="payouts-body"></tbody></table>
  `;
};

describe('admin-payouts.js', () => {
  let database;
  let documentClickHandlers;
  let realAddEventListener;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    setupDom();

    documentClickHandlers = [];
    realAddEventListener = document.addEventListener.bind(document);
    jest.spyOn(document, 'addEventListener').mockImplementation((event, cb, opts) => {
      if (event === 'click') documentClickHandlers.push(cb);
      return realAddEventListener(event, cb, opts);
    });

    database = require('../scripts/database.js');
  });

  afterEach(() => {
    for (const cb of documentClickHandlers) {
      document.removeEventListener('click', cb);
    }
    jest.restoreAllMocks();
  });

  describe('loadPayouts', () => {
    test('renders empty state when no pending payouts', async () => {
      database.getDocs.mockResolvedValueOnce(makeLedgerSnapshot([]));

      const { loadPayouts } = require('../scripts/admin-payouts.js');
      await loadPayouts();

      expect(document.getElementById('payouts-body').innerHTML)
        .toContain('No pending payouts.');
      expect(document.getElementById('summary-pending').textContent).toBe('R0.00');
      expect(document.getElementById('summary-paid-out').textContent).toBe('R0.00');
      expect(document.getElementById('summary-campus').textContent).toBe('R0.00');
    });

    test('groups vendor entries and computes totals', async () => {
      database.getDocs.mockResolvedValueOnce(makeLedgerSnapshot([
        { id: 'e1', vendorId: 'v1', vendorName: 'Shop A', amount: 100, status: 'pending_payout' },
        { id: 'e2', vendorId: 'v1', vendorName: 'Shop A', amount: 50, status: 'pending_payout' },
        { id: 'e3', vendorId: 'v2', vendorName: 'Shop B', amount: 30, status: 'pending_payout' },
        { id: 'e4', vendorId: 'v3', vendorName: 'Shop C', amount: 200, status: 'paid_out' },
        { id: 'e5', wallet: 'campus_bites', amount: 25 },
      ]));

      const { loadPayouts } = require('../scripts/admin-payouts.js');
      await loadPayouts();

      expect(document.getElementById('summary-pending').textContent).toBe('R180.00');
      expect(document.getElementById('summary-paid-out').textContent).toBe('R200.00');
      expect(document.getElementById('summary-campus').textContent).toBe('R25.00');

      const html = document.getElementById('payouts-body').innerHTML;
      expect(html).toContain('Shop A');
      expect(html).toContain('Shop B');
      expect(html).not.toContain('Shop C');
      expect(html).toContain('R150.00');
      expect(html).toContain('R30.00');
    });

    test('orders rows by total desc and stashes entry ids on the button', async () => {
      database.getDocs.mockResolvedValueOnce(makeLedgerSnapshot([
        { id: 'e1', vendorId: 'small', vendorName: 'Small', amount: 10, status: 'pending_payout' },
        { id: 'e2', vendorId: 'big', vendorName: 'Big', amount: 500, status: 'pending_payout' },
        { id: 'e3', vendorId: 'big', vendorName: 'Big', amount: 100, status: 'pending_payout' },
      ]));

      const { loadPayouts } = require('../scripts/admin-payouts.js');
      await loadPayouts();

      const rows = document.querySelectorAll('#payouts-body tr');
      expect(rows[0].dataset.vendorId).toBe('big');
      expect(rows[1].dataset.vendorId).toBe('small');

      const bigBtn = document.querySelector('button[data-vendor-id="big"]');
      expect(bigBtn.dataset.entryIds.split(',').sort()).toEqual(['e2', 'e3']);
    });

    test('treats entries with null vendorId as campus_bites revenue', async () => {
      database.getDocs.mockResolvedValueOnce(makeLedgerSnapshot([
        { id: 'e1', vendorId: null, amount: 40 },
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
      expect(document.getElementById('payouts-body').innerHTML).toContain('No pending payouts.');
    });
  });

  describe('mark-as-paid click handler', () => {
    const triggerClick = (target) => {
      for (const cb of documentClickHandlers) {
        cb({ target });
      }
    };

    test('alerts and aborts when current role is not admin', async () => {
      database.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      require('../scripts/admin-payouts.js');
      await flush();

      const btn = document.createElement('button');
      btn.className = 'mark-paid-btn';
      btn.dataset.vendorId = 'v1';
      btn.dataset.entryIds = 'e1,e2';
      document.body.appendChild(btn);

      triggerClick(btn);
      await flush();

      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('admin'));
      expect(database.updateDoc).not.toHaveBeenCalled();
    });

    test('admin click marks all entry ids as paid_out and reloads', async () => {
      database.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: 'admin1' }));
      database.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: 'admin' }),
      });
      database.getDocs
        .mockResolvedValueOnce(makeLedgerSnapshot([
          { id: 'e1', vendorId: 'v1', vendorName: 'Shop A', amount: 100, status: 'pending_payout' },
          { id: 'e2', vendorId: 'v1', vendorName: 'Shop A', amount: 50, status: 'pending_payout' },
        ]))
        .mockResolvedValueOnce(makeLedgerSnapshot([]));
      database.updateDoc.mockResolvedValue();
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      require('../scripts/admin-payouts.js');
      await flush();

      const btn = document.querySelector('button[data-vendor-id="v1"]');
      triggerClick(btn);
      await flush();
      await flush();

      expect(database.updateDoc).toHaveBeenCalledTimes(2);
      expect(database.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'paid_out', paidOutAt: expect.any(String) })
      );
      expect(document.getElementById('payouts-body').innerHTML).toContain('No pending payouts.');
    });

    test('admin click does nothing when confirm is cancelled', async () => {
      database.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: 'admin1' }));
      database.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: 'admin' }),
      });
      database.getDocs.mockResolvedValueOnce(makeLedgerSnapshot([
        { id: 'e1', vendorId: 'v1', vendorName: 'Shop A', amount: 100, status: 'pending_payout' },
      ]));
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      require('../scripts/admin-payouts.js');
      await flush();

      const btn = document.querySelector('button[data-vendor-id="v1"]');
      triggerClick(btn);
      await flush();

      expect(database.updateDoc).not.toHaveBeenCalled();
      expect(btn.disabled).toBe(false);
      expect(btn.textContent.trim()).toBe('Mark as paid');
    });

    test('admin click recovers UI on updateDoc failure', async () => {
      database.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: 'admin1' }));
      database.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: 'admin' }),
      });
      database.getDocs.mockResolvedValueOnce(makeLedgerSnapshot([
        { id: 'e1', vendorId: 'v1', vendorName: 'Shop A', amount: 100, status: 'pending_payout' },
      ]));
      database.updateDoc.mockRejectedValue(new Error('boom'));
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      jest.spyOn(window, 'alert').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});

      require('../scripts/admin-payouts.js');
      await flush();

      const btn = document.querySelector('button[data-vendor-id="v1"]');
      triggerClick(btn);
      await flush();
      await flush();

      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('boom'));
      expect(btn.disabled).toBe(false);
      expect(btn.textContent.trim()).toBe('Mark as paid');
    });
  });
});
