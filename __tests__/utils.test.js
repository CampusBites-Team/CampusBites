import { redirectUser } from '../scripts/utils.js';

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
