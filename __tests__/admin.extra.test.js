jest.mock('../scripts/database.js', () => ({
  db: {},
  getDocs: jest.fn(),
  collection: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
}));

let calculateVendorStats;
let initAdminDashboard;
let getDocs;

beforeEach(() => {
  jest.resetModules();

  document.body.innerHTML = `
    <table>
      <tbody id="vendor-table-body"></tbody>
    </table>
    <span id="admin-total-vendors"></span>
    <span id="admin-active-today"></span>
    <span id="admin-pending"></span>
  `;

  window.__JEST__ = true;

  ({ getDocs } = require('../scripts/database.js'));
  ({ calculateVendorStats, initAdminDashboard } = require('../scripts/admin.js'));
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

test('dashboard renders', async () => {
  getDocs.mockResolvedValue({
    docs: [
      { id: '1', data: () => ({ role: 'vendor', fullName: 'Shop A' }) }
    ]
  });

  await initAdminDashboard();
  await new Promise(r => setTimeout(r, 10));

  expect(document.getElementById("vendor-table-body").innerHTML)
    .toContain("Shop A");
});