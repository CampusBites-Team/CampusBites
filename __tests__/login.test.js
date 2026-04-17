// __tests__/login.test.js

import { navigateTo, redirectUser } from '../scripts/login.js';

describe('navigateTo', () => {
  test('calls location.assign with the given page', () => {
    const mockAssign = jest.fn();

    const mockLocation = {
      assign: mockAssign
    };

    navigateTo('some-page.html', mockLocation);

    expect(mockAssign).toHaveBeenCalledWith('some-page.html');
    expect(mockAssign).toHaveBeenCalledTimes(1);
  });

  test('throws error if invalid location object is passed', () => {
    expect(() => navigateTo('page.html', {})).toThrow('Invalid location object');
  });
});

describe('redirectUser', () => {
  let mockAssign;
  let mockLocation;

  beforeEach(() => {
    mockAssign = jest.fn();
    mockLocation = { assign: mockAssign };
  });

  test('redirects customer correctly', () => {
    redirectUser('customer', mockLocation);
    expect(mockAssign).toHaveBeenCalledWith('customer-dashboard.html');
  });

  test('redirects vendor correctly', () => {
    redirectUser('vendor', mockLocation);
    expect(mockAssign).toHaveBeenCalledWith('vendor-dashboard.html');
  });

  test('redirects admin correctly', () => {
    redirectUser('admin', mockLocation);
    expect(mockAssign).toHaveBeenCalledWith('admin-dashboard.html');
  });

  test('does nothing for unknown role', () => {
    redirectUser('unknown', mockLocation);
    expect(mockAssign).not.toHaveBeenCalled();
  });

  test('throws error if invalid location object is passed', () => {
    expect(() => redirectUser('customer', {})).toThrow('Invalid location object');
  });
  test('redirectUser does nothing for null role', () => {
  const mockAssign = jest.fn();
  redirectUser(null, { assign: mockAssign });
  expect(mockAssign).not.toHaveBeenCalled();
});

test('redirectUser does nothing for empty role', () => {
  const mockAssign = jest.fn();
  redirectUser('', { assign: mockAssign });
  expect(mockAssign).not.toHaveBeenCalled();
});

test('navigateTo preserves exact page string', () => {
  const mockAssign = jest.fn();
  navigateTo('admin-dashboard.html', { assign: mockAssign });
  expect(mockAssign).toHaveBeenCalledWith('admin-dashboard.html');
});
});