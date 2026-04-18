const { filterAvailableItems, toggleItemAvailability, formatPrice } = require('../scripts/menu_utils.js');

// ── filterAvailableItems ─────────────────────────────────────────────────────
test('filters out unavailable items', () => {
  const items = [
    { name: 'Burger', available: true },
    { name: 'Pizza', available: false },
    { name: 'Salad', available: true }
  ];
  const result = filterAvailableItems(items);
  expect(result).toHaveLength(2);
  expect(result.every(i => i.available)).toBe(true);
});

test('returns empty array when all items are unavailable', () => {
  const items = [
    { name: 'Burger', available: false },
    { name: 'Pizza', available: false }
  ];
  expect(filterAvailableItems(items)).toHaveLength(0);
});

test('returns all items when all are available', () => {
  const items = [
    { name: 'Burger', available: true },
    { name: 'Pizza', available: true }
  ];
  expect(filterAvailableItems(items)).toHaveLength(2);
});

test('returns empty array for empty input', () => {
  expect(filterAvailableItems([])).toHaveLength(0);
});

// ── toggleItemAvailability ───────────────────────────────────────────────────
test('toggles available item to unavailable', () => {
  const item = { name: 'Burger', available: true, price: 50 };
  const result = toggleItemAvailability(item);
  expect(result.available).toBe(false);
});

test('toggles unavailable item to available', () => {
  const item = { name: 'Burger', available: false, price: 50 };
  const result = toggleItemAvailability(item);
  expect(result.available).toBe(true);
});

test('does not mutate the original item', () => {
  const item = { name: 'Burger', available: true };
  const result = toggleItemAvailability(item);
  expect(item.available).toBe(true);
  expect(result.available).toBe(false);
});

test('preserves all other item properties', () => {
  const item = { name: 'Burger', available: true, price: 50, category: 'Main' };
  const result = toggleItemAvailability(item);
  expect(result.name).toBe('Burger');
  expect(result.price).toBe(50);
  expect(result.category).toBe('Main');
});

// ── formatPrice ──────────────────────────────────────────────────────────────
test('formats whole number price correctly', () => {
  expect(formatPrice(50)).toBe('R50.00');
});

test('formats decimal price correctly', () => {
  expect(formatPrice(29.9)).toBe('R29.90');
});

test('formats zero correctly', () => {
  expect(formatPrice(0)).toBe('R0.00');
});

test('rounds to 2 decimal places', () => {
  expect(formatPrice(10.999)).toBe('R11.00');
});