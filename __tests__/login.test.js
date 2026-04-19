// __tests__/login.test.js

jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  signInWithEmailAndPassword: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(() => ({ provider: 'google' })),
  FacebookAuthProvider: jest.fn(() => ({ provider: 'facebook' })),
  TwitterAuthProvider: jest.fn(() => ({ provider: 'twitter' })),
  OAuthProvider: jest.fn((name) => ({ provider: name }))
}));

import {
  navigateTo,
  redirectUser,
  initPasswordToggle,
  initLoginForm,
  initSocialLogins,
  initLoginPage
} from '../scripts/login.js';

import {
  signInWithEmailAndPassword,
  getDoc,
  doc,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider
} from '../scripts/database.js';

describe('navigateTo', () => {
  test('calls location.assign with the given page', () => {
    const mockAssign = jest.fn();
    const mockLocation = { assign: mockAssign };

    navigateTo('some-page.html', mockLocation);

    expect(mockAssign).toHaveBeenCalledWith('some-page.html');
    expect(mockAssign).toHaveBeenCalledTimes(1);
  });

  test('throws error if invalid location object is passed', () => {
    expect(() => navigateTo('page.html', {})).toThrow('Invalid location object');
  });

  test('preserves exact page string', () => {
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

  test('does nothing for null role', () => {
    redirectUser(null, mockLocation);
    expect(mockAssign).not.toHaveBeenCalled();
  });

  test('does nothing for empty role', () => {
    redirectUser('', mockLocation);
    expect(mockAssign).not.toHaveBeenCalled();
  });

  test('throws error if invalid location object is passed', () => {
    expect(() => redirectUser('customer', {})).toThrow('Invalid location object');
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('toggles password visibility from password to text', () => {
    const passwordInput = document.getElementById('loginPassword');
    const toggleButton = document.getElementById('toggleLoginPassword');

    initPasswordToggle();
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

  test('updates icon and calls lucide.createIcons when toggled', () => {
    const toggleButton = document.getElementById('toggleLoginPassword');

    initPasswordToggle();
    toggleButton.click();

    expect(toggleButton.innerHTML).toContain('eye-off');
    expect(global.lucide.createIcons).toHaveBeenCalled();
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

describe('initLoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <form id="loginForm">
        <input type="email" id="loginEmail" value="test@example.com" />
        <input type="password" id="loginPassword" value="123456" />
      </form>
    `;

    global.alert = jest.fn();
  });

  test('does nothing if login form is missing', () => {
    document.body.innerHTML = `<section>No form here</section>`;

    expect(() => initLoginForm()).not.toThrow();
  });

  test('submits login and reads user profile', async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'abc123' }
    });

    doc.mockReturnValue({ id: 'mock-doc-ref' });

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'customer' })
    });

    initLoginForm();

    const form = document.getElementById('loginForm');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, 'test@example.com', '123456');
    expect(doc).toHaveBeenCalled();
    expect(getDoc).toHaveBeenCalled();
    expect(global.alert).not.toHaveBeenCalled();
  });

  test('alerts if user profile does not exist', async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'abc123' }
    });

    doc.mockReturnValue({ id: 'mock-doc-ref' });

    getDoc.mockResolvedValue({
      exists: () => false
    });

    initLoginForm();

    const form = document.getElementById('loginForm');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(global.alert).toHaveBeenCalledWith('User profile not found.');
  });

  test('alerts when login fails', async () => {
    signInWithEmailAndPassword.mockRejectedValue(new Error('Invalid credentials'));

    initLoginForm();

    const form = document.getElementById('loginForm');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(global.alert).toHaveBeenCalledWith('Invalid credentials');
  });
});

describe('initSocialLogins', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <button type="button" id="googleLogin"></button>
      <button type="button" id="facebookLogin"></button>
      <button type="button" id="twitterLogin"></button>
      <button type="button" id="microsoftLogin"></button>
      <button type="button" id="appleLogin"></button>
    `;

    global.alert = jest.fn();

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        setItem: jest.fn()
      },
      writable: true
    });
  });

  test('sets up all providers', () => {
    initSocialLogins();

    expect(GoogleAuthProvider).toHaveBeenCalled();
    expect(FacebookAuthProvider).toHaveBeenCalled();
    expect(TwitterAuthProvider).toHaveBeenCalled();
    expect(OAuthProvider).toHaveBeenCalledWith('microsoft.com');
    expect(OAuthProvider).toHaveBeenCalledWith('apple.com');
  });

  test('alerts when social sign-in fails', async () => {
    signInWithPopup.mockRejectedValue(new Error('Popup blocked'));

    initSocialLogins();
    document.getElementById('googleLogin').click();

    await Promise.resolve();
    await Promise.resolve();

    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining('googleLogin sign-in failed: Popup blocked')
    );
  });
});

describe('initLoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <form id="loginForm">
        <input type="email" id="loginEmail" value="user@test.com" />
        <input type="password" id="loginPassword" value="pass123" />
        <button type="submit">Sign In</button>
      </form>

      <button type="button" id="toggleLoginPassword"></button>

      <button type="button" id="googleLogin"></button>
      <button type="button" id="facebookLogin"></button>
      <button type="button" id="twitterLogin"></button>
      <button type="button" id="microsoftLogin"></button>
      <button type="button" id="appleLogin"></button>
    `;

    global.lucide = {
      createIcons: jest.fn()
    };
  });

  test('initializes page helpers and creates icons', () => {
    initLoginPage();

    expect(global.lucide.createIcons).toHaveBeenCalled();
  });
});