jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  doc: jest.fn(),
  getDoc: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(),
}));

// Stub every DOM element vendor-dashboard.js references at load time
document.body.innerHTML = `
  <button id="logoutBtn"></button>
  <div id="loading-state" class="hidden"></div>
  <div id="empty-state" class="hidden"></div>
  <div id="menu-table-wrapper" class="hidden"></div>
  <tbody id="menu-table-body"></tbody>
  <div id="item-edit-modal" class="hidden"></div>
  <div id="delete-modal" class="hidden"></div>
  <button id="confirm-delete-btn"></button>
  <form id="item-form"></form>
  <input id="edit-item-id" value="" />
  <input id="item-name" value="" />
  <textarea id="item-description"></textarea>
  <input id="item-price" value="" />
  <select id="item-category"><option value="Mains">Mains</option></select>
  <input type="checkbox" id="item-available" />
  <span id="modal-title"></span>
  <span id="form-error" class="hidden"></span>
  <span id="save-btn-text">Save Item</span>
  <button id="save-btn"></button>
  <div id="save-spinner" class="hidden"></div>
`;

const { calculateRevenue } = require('../scripts/vendor-dashboard.js');

describe('calculateRevenue', () => {
  test('sums order totals correctly', () => {
    const orders = [
      { total: 100 },
      { total: 50.5 },
      { total: 25 },
    ];
    expect(calculateRevenue(orders)).toBeCloseTo(175.5);
  });

  test('returns 0 for empty array', () => {
    expect(calculateRevenue([])).toBe(0);
  });

  test('defaults missing total to 0', () => {
    const orders = [
      { total: 100 },
      {},            // no total field
      { total: 50 },
    ];
    expect(calculateRevenue(orders)).toBe(150);
  });

  test('handles single order', () => {
    expect(calculateRevenue([{ total: 42 }])).toBe(42);
  });

  test('handles all zero totals', () => {
    expect(calculateRevenue([{ total: 0 }, { total: 0 }])).toBe(0);
  });
});