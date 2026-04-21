jest.mock('../scripts/database.js', () => ({
  db: {},
  getDocs: jest.fn(),
  collection: jest.fn((...args) => args),
  updateDoc: jest.fn(),
  doc: jest.fn((...args) => args),
}));

let calculateVendorStats;
let initAdminDashboard;
let adminActions;
let getDocs;
let updateDoc;

const makeSnapshot = (rows = []) => ({
  docs: rows.map(r => ({
    id: r.id,
    data: () => r
  })),
  forEach(cb) {
    rows.forEach(r =>
      cb({
        id: r.id,
        data: () => r
      })
    );
  }
});

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();

  document.body.innerHTML = `
    <button id="viewAnalyticsBtn"></button>
    <button id="manageVendorsBtn"></button>

    <span id="admin-total-vendors"></span>
    <span id="admin-active-today"></span>
    <span id="admin-pending"></span>
    <span id="admin-total-revenue"></span>

    <table>
      <tbody id="vendor-table-body"></tbody>
    </table>
  `;

  document.addEventListener = jest.fn();

  ({ getDocs, updateDoc } = require('../scripts/database.js'));

  ({
    calculateVendorStats,
    initAdminDashboard,
    adminActions
  } = require('../scripts/admin.js'));
});

test('stats calculation', () => {
  const result = calculateVendorStats([
    { role: 'vendor', status: 'approved' },
    { role: 'vendor', status: 'pending' },
    { role: 'customer' }
  ]);

  expect(result.total).toBe(2);
  expect(result.active).toBe(1);
  expect(result.pending).toBe(1);
});

test('dashboard renders vendor rows', async () => {
  getDocs
    .mockResolvedValueOnce(makeSnapshot([
      { id: '1', role: 'vendor', status: 'approved' }
    ]))
    .mockResolvedValueOnce(makeSnapshot([
      { id: 'o1', total: 100 }
    ]))
    .mockResolvedValueOnce(makeSnapshot([
      {
        id: '1',
        role: 'vendor',
        fullName: 'Shop A',
        shopName: 'Shop A Store',
        email: 'shop@test.com',
        location: 'Campus',
        status: 'pending'
      }
    ]));

  await initAdminDashboard();

  expect(document.getElementById('vendor-table-body').innerHTML)
    .toContain('Shop A');
});

test('renders revenue correctly', async () => {
  getDocs
    .mockResolvedValueOnce(makeSnapshot([
      { id: '1', role: 'vendor', status: 'approved' },
      { id: '2', role: 'vendor', status: 'pending' }
    ]))
    .mockResolvedValueOnce(makeSnapshot([
      { id: 'o1', total: 50 },
      { id: 'o2', total: 25 }
    ]))
    .mockResolvedValueOnce(makeSnapshot([]));

  await initAdminDashboard();

  expect(document.getElementById('admin-total-revenue').textContent)
    .toBe('R75.00');
});

test('approveVendor updates', async () => {
  updateDoc.mockResolvedValue();
  getDocs.mockResolvedValue(makeSnapshot([]));

  await adminActions.approveVendor('abc');

  expect(updateDoc).toHaveBeenCalled();
});

test('suspendVendor updates', async () => {
  updateDoc.mockResolvedValue();
  getDocs.mockResolvedValue(makeSnapshot([]));

  await adminActions.suspendVendor('abc');

  expect(updateDoc).toHaveBeenCalled();
});