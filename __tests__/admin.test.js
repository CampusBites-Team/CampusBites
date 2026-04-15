// ── Mock database before anything else ──────────────────────────────────────
jest.mock('../scripts/database.js', () => ({
  db: {},
  getDocs: jest.fn(),
  collection: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
}));

// ── Stub DOM elements admin.js touches at module load ────────────────────────
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
  test('counts total, active and pending vendors correctly', () => {
    const users = [
      { role: 'vendor', status: 'approved' },
      { role: 'vendor', status: 'pending' },
      { role: 'vendor', status: 'pending' },
      { role: 'customer', status: 'approved' }, // should be ignored
    ];

    const result = calculateVendorStats(users);

    expect(result.total).toBe(3);
    expect(result.active).toBe(1);
    expect(result.pending).toBe(2);
  });

  test('returns zeros when no vendors', () => {
    const result = calculateVendorStats([
      { role: 'customer', status: 'approved' },
    ]);

    expect(result.total).toBe(0);
    expect(result.active).toBe(0);
    expect(result.pending).toBe(0);
  });

  test('defaults missing status to pending', () => {
    const users = [
      { role: 'vendor' }, // no status field
    ];

    const result = calculateVendorStats(users);

    expect(result.total).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.active).toBe(0);
  });

  test('suspended vendors count in total but not active or pending', () => {
    const users = [
      { role: 'vendor', status: 'suspended' },
      { role: 'vendor', status: 'approved' },
    ];

    const result = calculateVendorStats(users);

    expect(result.total).toBe(2);
    expect(result.active).toBe(1);
    expect(result.pending).toBe(0);
  });

  test('handles empty array', () => {
    const result = calculateVendorStats([]);
    expect(result).toEqual({ total: 0, active: 0, pending: 0 });
  });
});