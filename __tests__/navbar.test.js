/**
 * @jest-environment jsdom
 */

jest.mock("../scripts/orders.js", () => ({
  formatTimestamp: jest.fn(() => "Today")
}));
jest.mock("../toast.js", () => ({
  showToast: jest.fn()
}));

jest.mock("../scripts/database.js", () => ({
  auth: {
    signOut: jest.fn()
  },
  db: {},
  doc: jest.fn((db, collectionName, id) => ({
    collectionName,
    id
  })),
  getDoc: jest.fn(),
  onAuthStateChanged: jest.fn(),

  collection: jest.fn((db, collectionName) => ({
    collectionName
  })),
  query: jest.fn((...args) => args),
  where: jest.fn((field, op, value) => ({
    field,
    op,
    value
  })),
  orderBy: jest.fn((field, direction) => ({
    field,
    direction
  })),
  onSnapshot: jest.fn()
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function loadNavbar() {
  jest.isolateModules(() => {
    require("../scripts/navbar.js");
  });

  document.dispatchEvent(
    new Event("DOMContentLoaded")
  );

  await flush();
}

describe("navbar.js", () => {
  let database;

  function setPath(pathname) {
    window.history.pushState({}, "", pathname);
  }

  function setupDom() {
    document.body.innerHTML = `
      <nav>
        <section id="navLinks"></section>

        <section id="profileMenuContainer" class="hidden flex items-center gap-4">

          <section class="relative">
            <button id="notificationBtn" type="button">
              Bell
              <span id="notificationBadge" class="hidden">0</span>
            </button>

            <section id="notificationDropdown" class="hidden"></section>
          </section>

          <section class="relative">
            <button id="profileMenuBtn" type="button">
              <img id="profileAvatar" />
            </button>

            <section id="profileDropdown" class="hidden"></section>
          </section>
        </section>

        <button id="logoutBtn" class="hidden">Logout</button>
      </nav>
    `;
  }

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    setupDom();
    setPath("/index.html");

    database = require("../scripts/database.js");

    database.auth.signOut.mockResolvedValue();

    database.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "customer"
      })
    });

    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
    });

    database.onSnapshot.mockImplementation((q, success) => {
      success({
        docs: []
      });

      return jest.fn();
    });

    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders guest links and sign in option when user is not logged in", async () => {
    await loadNavbar();

    const navHtml = document.getElementById("navLinks").innerHTML;
    const dropdownHtml = document.getElementById("profileDropdown").innerHTML;

    expect(navHtml).toContain("Home");
    expect(navHtml).toContain("Browse");
    expect(navHtml).not.toContain("Dashboard");

    expect(document.getElementById("profileMenuContainer").classList.contains("hidden"))
      .toBe(false);

    expect(dropdownHtml).toContain("Sign in");
  });

  test("renders customer links when user role is customer", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer123" });
    });

    database.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "customer"
      })
    });

    await loadNavbar();

    const navHtml = document.getElementById("navLinks").innerHTML;
    const dropdownHtml = document.getElementById("profileDropdown").innerHTML;

    expect(navHtml).toContain("Home");
    expect(navHtml).toContain("Menu");
    expect(navHtml).toContain("Dashboard");
    expect(navHtml).toContain("Orders");

    expect(dropdownHtml).toContain("Profile");
    expect(dropdownHtml).toContain("For You");
    expect(dropdownHtml).toContain("Logout");
  });

  test("renders vendor links when user role is vendor", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "vendor123" });
    });

    database.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    await loadNavbar();

    const navHtml = document.getElementById("navLinks").innerHTML;
    const dropdownHtml = document.getElementById("profileDropdown").innerHTML;

    expect(navHtml).toContain("Home");
    expect(navHtml).toContain("Browse");
    expect(navHtml).toContain("Dashboard");
    expect(navHtml).toContain("Orders");

    expect(dropdownHtml).toContain("Menu");
    expect(dropdownHtml).toContain("Analytics");
    expect(dropdownHtml).toContain("Store Settings");
    expect(dropdownHtml).toContain("Logout");
  });

  test("renders admin links when user role is admin", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "admin123" });
    });

    database.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "admin"
      })
    });

    await loadNavbar();

    const navHtml = document.getElementById("navLinks").innerHTML;
    const dropdownHtml = document.getElementById("profileDropdown").innerHTML;

    expect(navHtml).toContain("Home");
    expect(navHtml).toContain("Dashboard");
    expect(navHtml).toContain("Vendors");
    expect(navHtml).toContain("Menu Management");

    expect(dropdownHtml).toContain("Browse");
    expect(dropdownHtml).toContain("Analytics");
    expect(dropdownHtml).toContain("Pay Outs");
    expect(dropdownHtml).toContain("Logout");
  });

  test("hides profile menu on pages not listed for auth controls", async () => {
    setPath("/pending-approval.html");

    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "vendor123" });
    });

    database.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    await loadNavbar();

    expect(document.getElementById("profileMenuContainer").classList.contains("hidden"))
      .toBe(true);
  });

  test("shows profile menu on dashboard pages", async () => {
    setPath("/vendor-dashboard.html");

    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "vendor123" });
    });

    database.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    await loadNavbar();

    expect(document.getElementById("profileMenuContainer").classList.contains("hidden"))
      .toBe(false);

    expect(document.getElementById("profileDropdown").innerHTML)
      .toContain("Logout");
  });

  test("falls back to guest links when user document does not exist", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "missing-user" });
    });

    database.getDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => ({})
    });

    await loadNavbar();

    const navHtml = document.getElementById("navLinks").innerHTML;

    expect(navHtml).toContain("Home");
    expect(navHtml).toContain("Browse");
    expect(navHtml).not.toContain("Orders");
  });

  test("falls back to guest links when getDoc fails", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "broken-user" });
    });

    database.getDoc.mockRejectedValueOnce(new Error("Firestore failed"));

    await loadNavbar();

    const navHtml = document.getElementById("navLinks").innerHTML;

    expect(navHtml).toContain("Home");
    expect(navHtml).toContain("Browse");

    expect(console.error).toHaveBeenCalledWith(
      "Error loading navbar role:",
      expect.any(Error)
    );
  });

  test("toggles dropdown when profile button is clicked", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer123" });
    });

    await loadNavbar();

    const dropdown = document.getElementById("profileDropdown");
    const button = document.getElementById("profileMenuBtn");

    expect(dropdown.classList.contains("hidden")).toBe(true);

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dropdown.classList.contains("hidden")).toBe(false);

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dropdown.classList.contains("hidden")).toBe(true);
  });

  test("closes dropdown when clicking outside", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer123" });
    });

    await loadNavbar();

    const dropdown = document.getElementById("profileDropdown");

    dropdown.classList.remove("hidden");

    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(dropdown.classList.contains("hidden")).toBe(true);
  });

  test("renders default avatar when user has no image", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer123" });
    });

    await loadNavbar();

    expect(document.getElementById("profileAvatar").src)
      .toContain("default-icon.png");
  });

  test("renders user image when available", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({
        uid: "customer123",
        photoURL: "https://example.com/photo.png"
      });
    });

    database.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "customer",
        image: "https://example.com/custom.png"
      })
    });

    await loadNavbar();

    expect(document.getElementById("profileAvatar").src)
      .toContain("custom.png");
  });

  test("uses user photoURL when userData has no image or logo", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({
        uid: "customer123",
        photoURL: "https://example.com/photo.png"
      });
    });

    await loadNavbar();

    expect(document.getElementById("profileAvatar").src)
      .toContain("photo.png");
  });

  test("uses vendor logo when available", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "vendor123" });
    });

    database.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "vendor",
        logo: "https://example.com/logo.png"
      })
    });

    await loadNavbar();

    expect(document.getElementById("profileAvatar").src)
      .toContain("logo.png");
  });

  test("logs user out from dropdown", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer123" });
    });

    await loadNavbar();

    document.getElementById("dropdownLogoutBtn").click();

    await flush();

    expect(database.auth.signOut).toHaveBeenCalled();
  });

  test("handles dropdown logout failure", async () => {
    database.auth.signOut.mockRejectedValueOnce(
      new Error("logout failed")
    );

    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer123" });
    });

    await loadNavbar();

    document.getElementById("dropdownLogoutBtn").click();

    await flush();

    expect(console.error).toHaveBeenCalledWith(
      "Logout failed:",
      expect.any(Error)
    );
  });

  test("logs user out from old logout button if present", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer123" });
    });

    await loadNavbar();

    document.getElementById("logoutBtn").click();

    await flush();

    expect(database.auth.signOut).toHaveBeenCalled();
  });

  test("handles old logout button failure", async () => {
    database.auth.signOut.mockRejectedValueOnce(
      new Error("logout failed")
    );

    await loadNavbar();

    document.getElementById("logoutBtn").click();

    await flush();

    expect(console.error).toHaveBeenCalledWith(
      "Logout failed:",
      expect.any(Error)
    );
  });

  test("listens for notifications when user is logged in", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer123" });
    });

    await loadNavbar();

    expect(database.collection).toHaveBeenCalledWith(
      database.db,
      "notifications"
    );

    expect(database.where).toHaveBeenCalledWith(
      "userId",
      "==",
      "customer123"
    );

    expect(database.orderBy).toHaveBeenCalledWith(
      "createdAt",
      "desc"
    );

    expect(database.onSnapshot).toHaveBeenCalled();
  });

  test("renders notifications and unread badge", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer123" });
    });

    database.onSnapshot.mockImplementation((q, success) => {
      success({
        docs: [
          {
            id: "n1",
            data: () => ({
              title: "New Order Received",
              message: "John placed an order",
              type: "new-order",
              read: false,
              createdAt: {}
            })
          }
        ]
      });

      return jest.fn();
    });

    await loadNavbar();

    expect(document.getElementById("notificationBadge").textContent)
      .toBe("1");

    expect(document.getElementById("notificationBadge").classList.contains("hidden"))
      .toBe(false);

    expect(document.getElementById("notificationDropdown").innerHTML)
      .toContain("John placed an order");

    expect(document.getElementById("profileAvatar").classList.contains("ring-red-500"))
      .toBe(true);
  });

  test("toggles notification dropdown and closes profile dropdown", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer123" });
    });

    await loadNavbar();

    const notificationDropdown = document.getElementById("notificationDropdown");
    const profileDropdown = document.getElementById("profileDropdown");

    profileDropdown.classList.remove("hidden");

    document.getElementById("notificationBtn")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(notificationDropdown.classList.contains("hidden"))
      .toBe(false);

    expect(profileDropdown.classList.contains("hidden"))
      .toBe(true);
  });

  test("handles notification listener errors", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer123" });
    });

    database.onSnapshot.mockImplementation((q, success, error) => {
      error(new Error("listener failed"));
      return jest.fn();
    });

    await loadNavbar();

    expect(console.error).toHaveBeenCalledWith(
      "Notification listener error:",
      expect.any(Error)
    );
  });

  test("does nothing if navLinks element is missing", async () => {
    document.body.innerHTML = `
      <section id="profileMenuContainer">
        <button id="profileMenuBtn"></button>
        <img id="profileAvatar" />
        <section id="profileDropdown"></section>
      </section>
    `;

    await loadNavbar();

    expect(document.getElementById("navLinks")).toBeNull();
  });

  test("does nothing if profile elements are missing", async () => {
    document.body.innerHTML = `
      <section id="navLinks"></section>
    `;

    await loadNavbar();

    expect(document.getElementById("navLinks").innerHTML)
      .toContain("Home");
  });
});