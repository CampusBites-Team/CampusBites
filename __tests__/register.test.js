jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  storage: {},
  createUserWithEmailAndPassword: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  FacebookAuthProvider: jest.fn(),
  TwitterAuthProvider: jest.fn(),
  OAuthProvider: jest.fn(),
  serverTimestamp: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

global.lucide = { createIcons: jest.fn() };
global.alert = jest.fn();

// Stub all DOM elements register.js touches at load time
document.body.innerHTML = `
  <form id="registerForm"></form>
  <input id="registerName" value="" />
  <input id="registerEmail" value="" />
  <input id="registerPassword" value="" />
  <select id="registerRole"><option value="customer">Customer</option><option value="vendor">Vendor</option></select>
  <input id="shop-name" value="" />
  <input id="shop-location" value="" />
  <input id="logoInput" type="file" />
  <div id="shop-name-container" class="hidden"></div>
  <div id="shop-location-container" class="hidden"></div>
  <div id="shop-logo-container" class="hidden"></div>
  <button id="googleRegister"></button>
  <button id="facebookRegister"></button>
  <button id="twitterRegister"></button>
  <button id="microsoftRegister"></button>
  <button id="appleRegister"></button>
`;

const { buildUserObject } = require('../scripts/register.js');

describe('buildUserObject', () => {
  test('builds customer object correctly', () => {
    const result = buildUserObject({
      fullName: 'John Doe',
      email: 'john@example.com',
      role: 'customer',
      shopName: 'Ignored Shop',
      location: 'Ignored Location',
      image: null,
    });

    expect(result.fullName).toBe('John Doe');
    expect(result.email).toBe('john@example.com');
    expect(result.role).toBe('customer');
    expect(result.shopName).toBeNull();   // customers get null
    expect(result.location).toBeNull();   // customers get null
    expect(result.status).toBe('approved');
    expect(result.image).toBeNull();
  });

  test('builds vendor object correctly', () => {
    const result = buildUserObject({
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      role: 'vendor',
      shopName: 'Janes Bites',
      location: 'Block B',
      image: 'https://example.com/logo.png',
    });

    expect(result.shopName).toBe('Janes Bites');
    expect(result.location).toBe('Block B');
    expect(result.status).toBe('pending');  // vendors start as pending
    expect(result.image).toBe('https://example.com/logo.png');
  });

  test('vendor with no image sets image to null', () => {
    const result = buildUserObject({
      fullName: 'Test',
      email: 't@t.com',
      role: 'vendor',
      shopName: 'Shop',
      location: 'Here',
      image: undefined,
    });

    expect(result.image).toBeNull();
  });

  test('customer shopName and location are always null regardless of input', () => {
    const result = buildUserObject({
      fullName: 'Test',
      email: 't@t.com',
      role: 'customer',
      shopName: 'ShouldBeNull',
      location: 'ShouldBeNull',
    });

    expect(result.shopName).toBeNull();
    expect(result.location).toBeNull();
  });

  test('customer status is approved', () => {
    const result = buildUserObject({ role: 'customer', fullName: '', email: '' });
    expect(result.status).toBe('approved');
  });

  test('vendor status is pending', () => {
    const result = buildUserObject({ role: 'vendor', fullName: '', email: '' });
    expect(result.status).toBe('pending');
  });
});