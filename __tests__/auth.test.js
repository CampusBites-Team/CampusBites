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
});