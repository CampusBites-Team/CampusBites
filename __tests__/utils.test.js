import {
  redirectUser,
  filterAvailableItems,
  toggleItemAvailability,
  formatPrice
} from '../scripts/utils.js';

describe('redirectUser', () => {
  test('redirects customer correctly', () => {
    expect(redirectUser('customer')).toBe('customer-dashboard.html');
  });

  test('redirects vendor correctly', () => {
    expect(redirectUser('vendor')).toBe('vendor-dashboard.html');
  });

  test('redirects admin correctly', () => {
    expect(redirectUser('admin')).toBe('admin-dashboard.html');
  });

  test('returns null for unknown role', () => {
    expect(redirectUser('unknown')).toBeNull();
  });

  test('returns null for null role', () => {
    expect(redirectUser(null)).toBeNull();
  });

  test('returns null for undefined role', () => {
    expect(redirectUser(undefined)).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(redirectUser('')).toBeNull();
  });
});

describe('filterAvailableItems', () => {
  test('returns only available items', () => {
    const items = [
      { id: 1, available: true },
      { id: 2, available: false },
      { id: 3, available: true }
    ];

    expect(filterAvailableItems(items)).toEqual([
      { id: 1, available: true },
      { id: 3, available: true }
    ]);
  });

  test('returns empty array when no items are available', () => {
    const items = [
      { id: 1, available: false },
      { id: 2, available: false }
    ];

    expect(filterAvailableItems(items)).toEqual([]);
  });

  test('returns empty array for empty input', () => {
    expect(filterAvailableItems([])).toEqual([]);
  });
});

describe('toggleItemAvailability', () => {
  test('toggles available from true to false', () => {
    const item = { id: 1, name: 'Burger', available: true };

    expect(toggleItemAvailability(item)).toEqual({
      id: 1,
      name: 'Burger',
      available: false
    });
  });

  test('toggles available from false to true', () => {
    const item = { id: 2, name: 'Pizza', available: false };

    expect(toggleItemAvailability(item)).toEqual({
      id: 2,
      name: 'Pizza',
      available: true
    });
  });

  test('does not mutate the original item', () => {
    const item = { id: 3, name: 'Wrap', available: true };
    const updated = toggleItemAvailability(item);

    expect(item.available).toBe(true);
    expect(updated).not.toBe(item);
  });
});

describe('formatPrice', () => {
  test('formats integer price', () => {
    expect(formatPrice(50)).toBe('R50.00');
  });

  test('formats string price', () => {
    expect(formatPrice('80')).toBe('R80.00');
  });

  test('formats decimal price to 2 decimal places', () => {
    expect(formatPrice(12.5)).toBe('R12.50');
  });

  test('rounds long decimal values', () => {
    expect(formatPrice(19.999)).toBe('R20.00');
  });
});