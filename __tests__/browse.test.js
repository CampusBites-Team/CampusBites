jest.mock('../scripts/database.js', () => ({
  db: {},
  getDocs: jest.fn(),
  collection: jest.fn(),
}));

global.lucide = { createIcons: jest.fn() };

const sampleItems = [
  {
    id: '1',
    name: 'Burger',
    vendorName: 'Shop1',
    price: 50,
    description: 'Tasty',
    category: 'Mains',
    available: true,
    dietary: ['Vegan'],
    allergens: []
  },
  {
    id: '2',
    name: 'Pizza',
    vendorName: 'Shop2',
    price: 80,
    description: 'Cheesy',
    category: 'Mains',
    available: true,
    dietary: [],
    allergens: ['Gluten']
  }
];

function makeSnapshot(items) {
  return {
    docs: items.map(i => ({
      id: i.id,
      data: () => i
    }))
  };
}

beforeEach(() => {
  document.body.innerHTML = `
    <div id="menu"></div>
    <div id="cartList"></div>
    <span id="numItems"></span>
    <button id="cart"></button>
  `;
});

test('loads and renders items', async () => {
  const { getDocs } = require('../scripts/database.js');

  getDocs.mockResolvedValue(makeSnapshot(sampleItems));

  await import('../scripts/browse.js');

  await new Promise(r => setTimeout(r, 0));

  expect(document.getElementById('menu').innerHTML).toContain('Burger');
});

test('filters only available items', async () => {
  const { getDocs } = require('../scripts/database.js');

  getDocs.mockResolvedValue(makeSnapshot(sampleItems));

  await import('../scripts/browse.js');

  await new Promise(r => setTimeout(r, 0));

  expect(document.getElementById('menu').innerHTML).toContain('Pizza');
});