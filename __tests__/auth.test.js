// Mock Firebase modules
jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  doc: jest.fn(),
  getDoc: jest.fn()
}));

jest.mock('https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js', () => ({
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(() => Promise.resolve())
}), { virtual: true });

const { logout } = require('../scripts/auth.js');

test('logout calls signOut', async () => {
  const { signOut } = require('https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js');
  signOut.mockResolvedValue();
  await logout();
  expect(signOut).toHaveBeenCalled();
});