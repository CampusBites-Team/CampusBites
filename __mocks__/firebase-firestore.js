// __mocks__/firebase-firestore.js
// Intercepts: https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js

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

module.exports = {
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
};
