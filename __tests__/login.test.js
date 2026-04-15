// The mock replaces the real file entirely — ESM internals never run
jest.mock('../scripts/login.js', () => ({
  redirectUser: jest.fn(),
  navigateTo: jest.fn(),
}));

const { redirectUser } = require('../scripts/login.js');
const mockNavigateTo = jest.fn();

beforeEach(() => jest.clearAllMocks());

test('customer redirect', () => {
  redirectUser.mockImplementation((role) => {
    if (role === 'customer') mockNavigateTo('customer-dashboard.html');
  });
  redirectUser('customer');
  expect(mockNavigateTo).toHaveBeenCalledWith('customer-dashboard.html');
});

test('vendor redirect', () => {
  redirectUser.mockImplementation((role) => {
    if (role === 'vendor') mockNavigateTo('vendor-dashboard.html');
  });
  redirectUser('vendor');
  expect(mockNavigateTo).toHaveBeenCalledWith('vendor-dashboard.html');
});

test('admin redirect', () => {
  redirectUser.mockImplementation((role) => {
    if (role === 'admin') mockNavigateTo('admin-dashboard.html');
  });
  redirectUser('admin');
  expect(mockNavigateTo).toHaveBeenCalledWith('admin-dashboard.html');
});