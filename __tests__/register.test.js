jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  storage: {},
  createUserWithEmailAndPassword: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  FacebookAuthProvider: jest.fn(),
  TwitterAuthProvider: jest.fn(),
  OAuthProvider: jest.fn(),
  serverTimestamp: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  sendEmailVerification: jest.fn(),
  signOut: jest.fn()
}));

global.lucide = { createIcons: jest.fn() };
global.alert = jest.fn();

// Stub all DOM elements register.js touches at load time
document.body.innerHTML = `
  <form id="registerForm"></form>
  <input id="registerName" value="" />
  <input id="registerEmail" value="" />
  <input id="registerPassword" value="" />
  <select id="registerRole"><option value="customer">Customer</option><option value="vendor">Vendor</option></select>
  <input id="shop-name" value="" />
  <input id="shop-location" value="" />
  <input id="logoInput" type="file" />
  <section id="shop-name-container" class="hidden"></section>
  <section id="shop-location-container" class="hidden"></section>
  <section id="shop-logo-container" class="hidden"></section>
  <button id="googleRegister"></button>
  <button id="facebookRegister"></button>
  <button id="twitterRegister"></button>
  <button id="microsoftRegister"></button>
  <button id="appleRegister"></button>
`;

const {
  buildUserObject,
  initRegisterUI
} = require('../scripts/register.js');
const {
  createUserWithEmailAndPassword
} = require('../scripts/database.js');

describe('buildUserObject', () => {
  test('builds customer object correctly', () => {
    const result = buildUserObject({
      fullName: 'John Doe',
      email: 'john@example.com',
      role: 'customer',
      shopName: 'Ignored Shop',
      location: 'Ignored Location',
      image: null,
    });

    expect(result.fullName).toBe('John Doe');
    expect(result.email).toBe('john@example.com');
    expect(result.role).toBe('customer');
    expect(result.shopName).toBeNull();   // customers get null
    expect(result.location).toBeNull();   // customers get null
    expect(result.status).toBe('approved');
    expect(result.image).toBeNull();
  });

  test('builds vendor object correctly', () => {
    const result = buildUserObject({
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      role: 'vendor',
      shopName: 'Janes Bites',
      location: 'Block B',
      image: 'https://example.com/logo.png',
    });

    expect(result.shopName).toBe('Janes Bites');
    expect(result.location).toBe('Block B');
    expect(result.status).toBe('pending');  // vendors start as pending
    expect(result.image).toBe('https://example.com/logo.png');
  });

  test('vendor with no image sets image to null', () => {
    const result = buildUserObject({
      fullName: 'Test',
      email: 't@t.com',
      role: 'vendor',
      shopName: 'Shop',
      location: 'Here',
      image: undefined,
    });

    expect(result.image).toBeNull();
  });

  test('customer shopName and location are always null regardless of input', () => {
    const result = buildUserObject({
      fullName: 'Test',
      email: 't@t.com',
      role: 'customer',
      shopName: 'ShouldBeNull',
      location: 'ShouldBeNull',
    });

    expect(result.shopName).toBeNull();
    expect(result.location).toBeNull();
  });

  test('customer status is approved', () => {
    const result = buildUserObject({ role: 'customer', fullName: '', email: '' });
    expect(result.status).toBe('approved');
  });

  test('vendor status is pending', () => {
    const result = buildUserObject({ role: 'vendor', fullName: '', email: '' });
    expect(result.status).toBe('pending');
  });
test("alerts when branch code is invalid", async () => {
  document.body.innerHTML = `
    <form id="registerForm"></form>

    <input id="registerName" value="John"/>
    <input id="registerEmail" value="john@test.com"/>
    <input id="registerPassword" value="123456"/>

    <select id="registerRole">
      <option value="vendor" selected>vendor</option>
    </select>

    <input id="shop-name" value="My Shop"/>
    <input id="shop-location" value="Campus"/>

    <input id="logoInput" type="file"/>

    <input id="bank-name" value="FNB"/>
    <input id="account-holder" value="John"/>
    <input id="account-number" value="123456"/>
    <input id="branch-code" value="12"/>
    <input id="account-type" value="Savings"/>
  `;

  window.alert = jest.fn();

  initRegisterUI();

  const logoInput = document.getElementById("logoInput");

  const fakeLogo = new File(
    ["dummy"],
    "logo.png",
    { type: "image/png" }
  );

  Object.defineProperty(logoInput, "files", {
    value: [fakeLogo]
  });

  logoInput.dispatchEvent(
    new Event("change")
  );

  document
    .getElementById("registerForm")
    .dispatchEvent(
      new Event("submit", {
        bubbles: true,
        cancelable: true
      })
    );

  await new Promise(r => setTimeout(r,0));

  expect(window.alert)
    .toHaveBeenCalledWith(
      "Branch code must be exactly 6 digits."
    );
});
test("handles registration failure", async()=>{

 createUserWithEmailAndPassword
   .mockRejectedValue(
      new Error("firebase failed")
   );

 document.body.innerHTML=`
 <form id="registerForm"></form>

 <input id="registerName" value="John"/>
 <input id="registerEmail" value="john@test.com"/>
 <input id="registerPassword" value="123456"/>
 <select id="registerRole">
   <option value="customer" selected>
      customer
   </option>
 </select>
 `;

 const spy=
   jest.spyOn(console,"error")
   .mockImplementation(()=>{});

 window.alert=jest.fn();

 initRegisterUI();

 document
   .getElementById("registerForm")
   .dispatchEvent(
      new Event(
       "submit",
       {bubbles:true,cancelable:true}
      )
   );

 await new Promise(r=>setTimeout(r,0));

 expect(spy)
   .toHaveBeenCalled();

 expect(window.alert)
   .toHaveBeenCalledWith(
      "firebase failed"
   );
});
test("registers DOMContentLoaded listener", () => {
  const spy = jest.spyOn(document, "addEventListener");

  Object.defineProperty(document, "readyState", {
    value: "loading",
    configurable: true
  });

  jest.isolateModules(() => {
    require("../scripts/register.js");
  });

  expect(spy).toHaveBeenCalledWith(
    "DOMContentLoaded",
    expect.any(Function)
  );
});
test("shows error and resets when invalid logo is selected", async () => {
  document.body.innerHTML = `
    <input id="logoInput" type="file" />
    <section id="shop-logo-container"></section>
  `;

  window.alert = jest.fn();

  initRegisterUI();

  const logoInput = document.getElementById("logoInput");

  const invalidFile = new File(
    ["dummy"],
    "logo.txt",
    { type: "text/plain" }
  );

  Object.defineProperty(logoInput, "files", {
    value: [invalidFile]
  });

  logoInput.dispatchEvent(new Event("change"));

  expect(window.alert).toHaveBeenCalledWith(
    "Shop logo must be a PNG or JPEG image."
  );

  expect(logoInput.value).toBe("");
});

});