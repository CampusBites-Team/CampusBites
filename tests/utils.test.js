const isValidEmail = require('./utils');

test('valid email check', () => {
  expect(isValidEmail("test@gmail.com")).toBe(true);
});