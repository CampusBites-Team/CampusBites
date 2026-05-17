// Mock Firebase modules
jest.mock("../scripts/database.js", () => ({
  auth: {},
  db: {},
  doc: jest.fn(),
  getDoc: jest.fn()
}));

// Suppress jsdom navigation warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.message?.includes('Not implemented: navigation')) return;
    originalError(...args);
  };
});

jest.mock(
  "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js",
  () => ({
    onAuthStateChanged: jest.fn(),
    signOut: jest.fn(() => Promise.resolve())
  }),
  { virtual: true }
);

const { doc, getDoc, auth } = require("../scripts/database.js");
const {
  onAuthStateChanged,
  signOut
} = require("https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js");

const { initAuthUI, logout } = require("../scripts/auth.js");

describe("auth.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <a id="CustomerdashboardLink" class="hidden"></a>
      <a id="VendordashboardLink" class="hidden"></a>
      <a id="loginLink"></a>
      <button id="logoutBtn" class="hidden"></button>
    `;
  });

  test("logout calls signOut with auth", async () => {
    signOut.mockResolvedValue();

    logout();

    await Promise.resolve();

    expect(signOut).toHaveBeenCalledWith(auth);
  });

  test("shows customer dashboard link when logged in as customer", async () => {
    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "customer" })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "123" });
    });

    initAuthUI();

    await Promise.resolve();
    await Promise.resolve();

    const customerLink = document.getElementById("CustomerdashboardLink");
    const vendorLink = document.getElementById("VendordashboardLink");
    const loginBtn = document.getElementById("loginLink");
    const logoutBtn = document.getElementById("logoutBtn");

    expect(customerLink.classList.contains("hidden")).toBe(false);
    expect(vendorLink.classList.contains("hidden")).toBe(true);
    expect(logoutBtn.classList.contains("hidden")).toBe(false);
    expect(loginBtn.classList.contains("hidden")).toBe(true);
  });

  test("shows vendor dashboard link when logged in as vendor", async () => {
    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "vendor" })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "456" });
    });

    initAuthUI();

    await Promise.resolve();
    await Promise.resolve();

    const customerLink = document.getElementById("CustomerdashboardLink");
    const vendorLink = document.getElementById("VendordashboardLink");
    const loginBtn = document.getElementById("loginLink");
    const logoutBtn = document.getElementById("logoutBtn");

    expect(customerLink.classList.contains("hidden")).toBe(true);
    expect(vendorLink.classList.contains("hidden")).toBe(false);
    expect(logoutBtn.classList.contains("hidden")).toBe(false);
    expect(loginBtn.classList.contains("hidden")).toBe(true);
  });

  test("shows login and hides dashboard links when no user is logged in", () => {
    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback(null);
    });

    initAuthUI();

    const customerLink = document.getElementById("CustomerdashboardLink");
    const vendorLink = document.getElementById("VendordashboardLink");
    const loginBtn = document.getElementById("loginLink");
    const logoutBtn = document.getElementById("logoutBtn");

    expect(customerLink.classList.contains("hidden")).toBe(true);
    expect(vendorLink.classList.contains("hidden")).toBe(true);
    expect(logoutBtn.classList.contains("hidden")).toBe(true);
    expect(loginBtn.classList.contains("hidden")).toBe(false);
  });
  test("reloads authenticated user", async () => {
  let callback;

  onAuthStateChanged.mockImplementation((auth, cb) => {
    callback = cb;
  });

  const reloadMock = jest.fn().mockResolvedValue();

  initAuthUI();

  await callback({
    uid: "u1",
    reload: reloadMock
  });

  expect(reloadMock).toHaveBeenCalled();
});
test("hides dashboards for unverified users", async () => {
  let callback;

  onAuthStateChanged.mockImplementation((a, cb) => {
    callback = cb;
  });

  document.body.innerHTML=`
    <a id="CustomerdashboardLink"></a>
    <a id="RecommendationLink"></a>
    <a id="VendordashboardLink"></a>
    <a id="AdmindashboardLink"></a>
    <a id="CheckOutLink"></a>
    <a id="CustomerProfileLink"></a>
    <a id="loginLink"></a>
    <a id="logoutBtn"></a>
  `;

  initAuthUI();

  await callback({
    uid:"u1",
    emailVerified:false
  });

  expect(
    document
      .getElementById("logoutBtn")
      .classList.contains("hidden")
  ).toBe(false);
});
test("shows admin dashboard", async()=>{

 let callback;

 onAuthStateChanged.mockImplementation((a,cb)=>{
   callback=cb;
 });

 getDoc.mockResolvedValue({
   exists:()=>true,
   data:()=>({
      role:"admin"
   })
 });

 document.body.innerHTML=`
 <a id="AdmindashboardLink" class="hidden"></a>
 <a id="loginLink"></a>
 <a id="logoutBtn"></a>
 `;

 initAuthUI();

 await callback({
   uid:"u1"
 });

 expect(
   document
   .getElementById("AdmindashboardLink")
   .classList.contains("hidden")
 ).toBe(false);

});
test("handles auth UI errors", async()=>{

 let callback;

 onAuthStateChanged.mockImplementation((a,cb)=>{
   callback=cb;
 });

 getDoc.mockRejectedValue(
   new Error("db failed")
 );

 const spy=
   jest.spyOn(console,"error")
   .mockImplementation(()=>{});

 initAuthUI();

 await callback({
   uid:"u1"
 });

 expect(spy)
   .toHaveBeenCalled();

});
test("handles logout errors", async()=>{

 signOut.mockRejectedValue(
   new Error("logout failed")
 );

 const spy=
   jest.spyOn(console,"error")
   .mockImplementation(()=>{});

 await logout();

 expect(spy)
   .toHaveBeenCalled();

});
});