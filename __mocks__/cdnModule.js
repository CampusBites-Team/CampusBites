// __mocks__/cdnModule.js
// Intercepts ALL https:// imports (CDN URLs) via moduleNameMapper in jest.config.js
// Must export every Firebase symbol that any script imports from a CDN URL.

const initializeApp                  = jest.fn(() => ({ name: '[DEFAULT]' }));

const getAuth                        = jest.fn(() => ({}));
const signInWithEmailAndPassword     = jest.fn();
const createUserWithEmailAndPassword = jest.fn();
const signInWithPopup                = jest.fn();
const onAuthStateChanged             = jest.fn();
const signOut                        = jest.fn();
const GoogleAuthProvider             = jest.fn().mockImplementation(() => ({}));
const FacebookAuthProvider           = jest.fn().mockImplementation(() => ({}));
const TwitterAuthProvider            = jest.fn().mockImplementation(() => ({}));
const OAuthProvider                  = jest.fn().mockImplementation(() => ({}));

const getFirestore    = jest.fn(() => ({}));
const doc             = jest.fn();
const getDoc          = jest.fn();
const setDoc          = jest.fn();
const addDoc          = jest.fn();
const getDocs         = jest.fn();
const updateDoc       = jest.fn();
const deleteDoc       = jest.fn();
const collection      = jest.fn();
const query           = jest.fn();
const where           = jest.fn();
const serverTimestamp = jest.fn(() => 'MOCK_TIMESTAMP');

const getStorage     = jest.fn(() => ({}));
const ref            = jest.fn();
const uploadBytes    = jest.fn();
const getDownloadURL = jest.fn();

module.exports = {
  // firebase/app
  initializeApp,

  // firebase/auth
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

  // firebase/firestore
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,

  // firebase/storage
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
};