jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  storage: {},
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

document.body.innerHTML = `
  <button id="viewAnalyticsBtn"></button>
  <button id="manageVendorsBtn"></button>
  <span id="admin-total-vendors"></span>
  <span id="admin-active-today"></span>
  <span id="admin-pending"></span>
  <span id="admin-total-revenue"></span>
  <tbody id="vendor-table-body"></tbody>
`;

const { calculateVendorStats } = require('../scripts/admin.js');

test('calculates vendor stats correctly', () => {
  const users = [
    { role: 'vendor', status: 'approved' },
    { role: 'vendor', status: 'pending' },
    { role: 'vendor', status: 'approved' }
  ];
  const result = calculateVendorStats(users);
  expect(result.total).toBe(3);
  expect(result.active).toBe(2);
  expect(result.pending).toBe(1);
});

test('returns zeros when no vendors', () => {
  const result = calculateVendorStats([]);
  expect(result.total).toBe(0);
  expect(result.active).toBe(0);
  expect(result.pending).toBe(0);
});

test('ignores non-vendor users', () => {
  const users = [
    { role: 'customer', status: 'approved' },
    { role: 'vendor', status: 'approved' }
  ];
  const result = calculateVendorStats(users);
  expect(result.total).toBe(1);
  expect(result.active).toBe(1);
});

test('treats missing status as pending', () => {
  const users = [
    { role: 'vendor' },
    { role: 'vendor', status: 'approved' }
  ];
  const result = calculateVendorStats(users);
  expect(result.pending).toBe(1);
  expect(result.active).toBe(1);
});