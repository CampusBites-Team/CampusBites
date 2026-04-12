jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  storage: {},
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  FacebookAuthProvider: jest.fn(),
  TwitterAuthProvider: jest.fn(),
  OAuthProvider: jest.fn(),
  serverTimestamp: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

document.body.innerHTML = `
  <form id="registerForm"></form>
  <input id="registerName" />
  <input id="registerEmail" />
  <input id="registerPassword" />
  <select id="registerRole"></select>
  <input id="shop-name" />
  <input id="shop-location" />
  <input id="logoInput" />
  <section id="shop-name-container" class="hidden"></section>
  <section id="shop-location-container" class="hidden"></section>
  <section id="shop-logo-container" class="hidden"></section>
  <button id="googleRegister"></button>
  <button id="facebookRegister"></button>
  <button id="twitterRegister"></button>
  <button id="microsoftRegister"></button>
  <button id="appleRegister"></button>
`;

const { buildUserObject } = require('../scripts/register.js');

test('builds vendor object with pending status', () => {
  const result = buildUserObject({
    fullName: 'John',
    email: 'john@test.com',
    role: 'vendor',
    shopName: 'Food Spot',
    location: 'Campus',
    image: 'logo.png'
  });
  expect(result.status).toBe('pending');
  expect(result.shopName).toBe('Food Spot');
});

test('builds customer object with approved status', () => {
  const result = buildUserObject({
    fullName: 'Jane',
    email: 'jane@test.com',
    role: 'customer'
  });
  expect(result.status).toBe('approved');
  expect(result.shopName).toBeNull();
  expect(result.location).toBeNull();
});

test('vendor object includes location and image', () => {
  const result = buildUserObject({
    fullName: 'John',
    email: 'john@test.com',
    role: 'vendor',
    shopName: 'Food Spot',
    location: 'Campus A',
    image: 'logo.png'
  });
  expect(result.location).toBe('Campus A');
  expect(result.image).toBe('logo.png');
});

test('image defaults to null when not provided', () => {
  const result = buildUserObject({
    fullName: 'John',
    email: 'john@test.com',
    role: 'vendor',
    shopName: 'Food Spot'
  });
  expect(result.image).toBeNull();
});