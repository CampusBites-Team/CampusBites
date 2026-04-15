jest.mock('../scripts/database.js', () => ({
  db: {},
  auth: {},
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

// Full DOM stub for vendor-dashboard.js (menu.js)
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

import {
  formatMenuPrice,
  buildItemData,
  openAddItemModal,
  closeModal,
  confirmDelete,
  closeDeleteModal
} from '../scripts/menu.js';

describe('formatMenuPrice', () => {
  test('formats integer price', () => {
    expect(formatMenuPrice(25)).toBe('R25.00');
  });

  test('formats float price', () => {
    expect(formatMenuPrice(9.5)).toBe('R9.50');
  });

  test('formats zero', () => {
    expect(formatMenuPrice(0)).toBe('R0.00');
  });

  test('formats string number', () => {
    expect(formatMenuPrice('12.3')).toBe('R12.30');
  });
});

describe('buildItemData', () => {
  const base = {
    vendorId: 'v1',
    vendorName: 'Janes Bites',
    name: 'Burger',
    description: 'Tasty burger',
    price: 49.99,
    category: 'Mains',
    allergens: ['Gluten'],
    dietary: ['Halal'],
    imageUrl: null,
  };

  test('builds item with available:true by default', () => {
    const result = buildItemData(base);
    expect(result.available).toBe(true);
  });

  test('does not include image key when imageUrl is null', () => {
    const result = buildItemData(base);
    expect(result).not.toHaveProperty('image');
  });

  test('includes image when imageUrl is provided', () => {
    const result = buildItemData({ ...base, imageUrl: 'https://img.com/pic.jpg' });
    expect(result.image).toBe('https://img.com/pic.jpg');
  });

  test('passes through all core fields', () => {
    const result = buildItemData(base);
    expect(result.vendorId).toBe('v1');
    expect(result.name).toBe('Burger');
    expect(result.price).toBe(49.99);
    expect(result.allergens).toEqual(['Gluten']);
    expect(result.dietary).toEqual(['Halal']);
  });
});

describe('Modal helpers', () => {
  beforeEach(() => {
    // reset modal state
    document.getElementById('item-edit-modal').classList.add('hidden');
    document.getElementById('delete-modal').classList.add('hidden');
    document.getElementById('edit-item-id').value = '';
    document.getElementById('modal-title').textContent = '';
  });

  test('openAddItemModal shows modal and sets title', () => {
    openAddItemModal();
    expect(document.getElementById('item-edit-modal').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('modal-title').textContent).toBe('Add Menu Item');
    expect(document.getElementById('edit-item-id').value).toBe('');
  });

  test('closeModal hides the item modal', () => {
    document.getElementById('item-edit-modal').classList.remove('hidden');
    closeModal();
    expect(document.getElementById('item-edit-modal').classList.contains('hidden')).toBe(true);
  });

  test('confirmDelete shows delete modal', () => {
    confirmDelete('item-abc');
    expect(document.getElementById('delete-modal').classList.contains('hidden')).toBe(false);
  });

  test('closeDeleteModal hides delete modal', () => {
    document.getElementById('delete-modal').classList.remove('hidden');
    closeDeleteModal();
    expect(document.getElementById('delete-modal').classList.contains('hidden')).toBe(true);
  });
});