// __mocks__/firebase-auth.js
// Intercepts: https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js

const getAuth                    = jest.fn(() => ({}));
const signInWithEmailAndPassword = jest.fn();
const createUserWithEmailAndPassword = jest.fn();
const signInWithPopup            = jest.fn();
const onAuthStateChanged         = jest.fn();
const signOut                    = jest.fn();

const GoogleAuthProvider   = jest.fn().mockImplementation(() => ({}));
const FacebookAuthProvider = jest.fn().mockImplementation(() => ({}));
const TwitterAuthProvider  = jest.fn().mockImplementation(() => ({}));
const OAuthProvider        = jest.fn().mockImplementation(() => ({}));

module.exports = {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
};
