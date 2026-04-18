// __tests__/login.test.js

import { navigateTo, redirectUser, initPasswordToggle } from '../scripts/login.js';

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

  test('navigateTo preserves exact page string', () => {
  const mockAssign = jest.fn();
  navigateTo('admin-dashboard.html', { assign: mockAssign });
  expect(mockAssign).toHaveBeenCalledWith('admin-dashboard.html');
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

});
describe('initPasswordToggle', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input type="password" id="loginPassword" />
      <button type="button" id="toggleLoginPassword"></button>
    `;

    global.lucide = {
      createIcons: jest.fn()
    };
  });

  test('toggles password visibility from password to text', () => {
    const passwordInput = document.getElementById('loginPassword');
    const toggleButton = document.getElementById('toggleLoginPassword');

    initPasswordToggle();

    expect(passwordInput.type).toBe('password');

    toggleButton.click();

    expect(passwordInput.type).toBe('text');
  });

  test('toggles password visibility back from text to password', () => {
    const passwordInput = document.getElementById('loginPassword');
    const toggleButton = document.getElementById('toggleLoginPassword');

    initPasswordToggle();

    toggleButton.click();
    toggleButton.click();

    expect(passwordInput.type).toBe('password');
  });

  test('does not throw if password input is missing', () => {
    document.body.innerHTML = `
      <button type="button" id="toggleLoginPassword"></button>
    `;

    expect(() => initPasswordToggle()).not.toThrow();
  });

  test('does not throw if toggle button is missing', () => {
    document.body.innerHTML = `
      <input type="password" id="loginPassword" />
    `;

    expect(() => initPasswordToggle()).not.toThrow();
  });
});