// __mocks__/firebase-storage.js
// Intercepts: https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js

const getStorage      = jest.fn(() => ({}));
const ref             = jest.fn();
const uploadBytes     = jest.fn();
const getDownloadURL  = jest.fn();

module.exports = { getStorage, ref, uploadBytes, getDownloadURL };
