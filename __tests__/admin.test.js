jest.mock('../scripts/database.js', () => ({
  db: {},
  getDocs: jest.fn(),
  collection: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
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

describe('calculateVendorStats', () => {

  test('counts correctly', () => {
    const users = [
      { role: 'vendor', status: 'approved' },
      { role: 'vendor', status: 'pending' },
      { role: 'vendor' },
      { role: 'customer', status: 'approved' },
    ];

    const result = calculateVendorStats(users);

    expect(result.total).toBe(3);
    expect(result.active).toBe(1);
    expect(result.pending).toBe(2);
  });

  test('empty', () => {
    const result = calculateVendorStats([]);
    expect(result).toEqual({ total: 0, active: 0, pending: 0 });
  });
});