jest.mock('../scripts/database.js', () => ({
  db: {},
  getDocs: jest.fn(),
  collection: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
}));

const { calculateVendorStats, initAdminDashboard } = require('../scripts/admin.js');
const { getDocs } = require('../scripts/database.js');

beforeEach(() => {
  document.body.innerHTML = `
    <tbody id="vendor-table-body"></tbody>
    <span id="admin-total-vendors"></span>
    <span id="admin-active-today"></span>
    <span id="admin-pending"></span>
  `;

  window.__JEST__ = true;
});

const makeSnapshot = (items) => ({
  docs: items.map(i => ({
    id: i.id || '1',
    data: () => i
  }))
});

describe('extra coverage', () => {

  test('stats mixed', () => {
    const users = [
      { role: 'vendor', status: 'approved' },
      { role: 'vendor', status: 'approved' },
      { role: 'vendor', status: 'pending' },
      { role: 'customer' },
    ];

    const result = calculateVendorStats(users);

    expect(result.total).toBe(3);
    expect(result.active).toBe(2);
    expect(result.pending).toBe(1);
  });

  test('init dashboard renders', async () => {
    getDocs.mockResolvedValue(makeSnapshot([
      { role: 'vendor', fullName: 'Shop A', status: 'approved' }
    ]));

    await initAdminDashboard();

    expect(document.getElementById('vendor-table-body').innerHTML).toContain('Shop A');
  });

  test('empty vendors', async () => {
    getDocs.mockResolvedValue(makeSnapshot([]));

    await initAdminDashboard();

    expect(document.getElementById('vendor-table-body').innerHTML).toBe('');
  });
});