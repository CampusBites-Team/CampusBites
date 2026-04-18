// __mocks__/firebase-app.js
// Intercepts: https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js

const initializeApp = jest.fn(() => ({ name: '[DEFAULT]' }));

module.exports = { initializeApp };
