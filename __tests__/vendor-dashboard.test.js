jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  storage: {},
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

const { calculateRevenue } = require('../scripts/vendor-dashboard.js');

test('calculates revenue correctly', () => {
  const orders = [{ total: 100 }, { total: 50 }];
  expect(calculateRevenue(orders)).toBe(150);
});

test('returns 0 for empty orders', () => {
  expect(calculateRevenue([])).toBe(0);
});

test('handles missing total field gracefully', () => {
  const orders = [{ total: 100 }, {}];
  expect(calculateRevenue(orders)).toBe(100);
});

test('handles single order', () => {
  expect(calculateRevenue([{ total: 75 }])).toBe(75);
});