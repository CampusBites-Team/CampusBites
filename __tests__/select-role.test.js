jest.mock('../scripts/database.js', () => ({
  auth: {
    currentUser: {
      uid: 'test-uid-123',
      email: 'test@example.com'
    }
  },
  db: {},
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
}));

document.body.innerHTML = `
  <button id="customer">Customer</button>
  <button id="vendor">Vendor</button>
`;

const { setDoc } = require('../scripts/database.js');
const { saveRole, setNavigate } = require('../scripts/select-role.js');

const mockNavigate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  setNavigate(mockNavigate); // ✅ inject mock — never touches window.location
});

test('clicking customer button calls setDoc', async () => {
  document.getElementById('customer').click();
  await new Promise(r => setTimeout(r, 50));
  expect(setDoc).toHaveBeenCalledTimes(1);
});

test('customer redirects', async () => {
  document.getElementById('customer').click();
  await new Promise(r => setTimeout(r, 50));
  expect(mockNavigate).toHaveBeenCalledWith('customer-dashboard.html');
});