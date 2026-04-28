jest.mock("../scripts/database.js", () => ({
  db: {},
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn()
}));

Object.defineProperty(document, "readyState", {
  value: "loading",
  configurable: true
});

const {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where
} = require("../scripts/database.js");

const { initVendorProfile } = require("../scripts/vendor-profile.js");

const originalError = console.error;

describe("vendor-profile.js", () => {
  beforeAll(() => {
    console.error = (...args) => {
      if (args[0]?.message?.includes("Not implemented: navigation")) return;
      originalError(...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-24T10:00:00").getTime());
    global.alert = jest.fn();

    document.body.innerHTML = `
      <section id="vendorImageFallback" class=""></section>
      <img id="vendorImage" class="hidden" />
      <h1 id="vendorName"></h1>
      <p id="vendorLocation"></p>
      <span id="vendorStatus"></span>
      <span id="vendorHours"></span>
      <section id="vendorMenu"></section>
    `;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("loads approved vendor details and available menu items", async () => {
    window.history.pushState({}, "", "/vendor-profile.html?vendorId=vendor-123");

    doc.mockReturnValue({});
    collection.mockReturnValue({});
    where.mockReturnValue({});
    query.mockReturnValue({});

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "BobThePlug",
        location: "Matrix Ground Floor",
        image: "vendor-logo-url",
        openingTime: "08:00",
        closingTime: "17:00"
      })
    });

    getDocs.mockResolvedValue({
      docs: [
        {
          id: "item-1",
          data: () => ({
            name: "Cheese Burger",
            category: "Main Course",
            description: "Beef burger",
            price: 45,
            image: "burger-url",
            available: true
          })
        },
        {
          id: "item-2",
          data: () => ({
            name: "Sold Out Pizza",
            category: "Light Meals",
            description: "Unavailable",
            price: 30,
            image: "pizza-url",
            available: false
          })
        }
      ]
    });

    await initVendorProfile();

    expect(document.getElementById("vendorName").textContent).toBe("BobThePlug");
    expect(document.getElementById("vendorLocation").textContent).toBe("Matrix Ground Floor");
    expect(document.getElementById("vendorHours").textContent).toBe("08:00 - 17:00");
    expect(document.getElementById("vendorStatus").textContent).toBe("Open Now");

    expect(document.getElementById("vendorImage").src).toContain("vendor-logo-url");
    expect(document.getElementById("vendorImage").classList.contains("hidden")).toBe(false);

    expect(document.getElementById("vendorMenu").textContent).toContain("Cheese Burger");
    expect(document.getElementById("vendorMenu").textContent).not.toContain("Sold Out Pizza");
  });

  test("shows closed status when current time is outside operating hours", async () => {
    window.history.pushState({}, "", "/vendor-profile.html?vendorId=vendor-123");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "BobThePlug",
        openingTime: "07:00",
        closingTime: "09:00"
      })
    });

    getDocs.mockResolvedValue({
      docs: []
    });

    await initVendorProfile();

    expect(document.getElementById("vendorStatus").textContent).toBe("Closed Now");
    expect(document.getElementById("vendorHours").textContent).toBe("07:00 - 09:00");
  });

  test("shows fallback text when operating hours are missing", async () => {
    window.history.pushState({}, "", "/vendor-profile.html?vendorId=vendor-123");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "BobThePlug"
      })
    });

    getDocs.mockResolvedValue({
      docs: []
    });

    await initVendorProfile();

    expect(document.getElementById("vendorHours").textContent).toBe("Operating hours not set");
    expect(document.getElementById("vendorStatus").textContent).toBe("Closed Now");
  });

  test("alerts when vendor id is missing from URL", async () => {
    window.history.pushState({}, "", "/vendor-profile.html");

    await initVendorProfile();

    expect(global.alert).toHaveBeenCalledWith("Vendor profile could not be loaded.");
  });

  test("alerts when vendor document does not exist", async () => {
    window.history.pushState({}, "", "/vendor-profile.html?vendorId=missing-vendor");

    getDoc.mockResolvedValue({
      exists: () => false
    });

    await initVendorProfile();

    expect(global.alert).toHaveBeenCalledWith("Vendor not found.");
  });

  test("alerts when vendor is not approved", async () => {
    window.history.pushState({}, "", "/vendor-profile.html?vendorId=vendor-123");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "pending",
        shopName: "Pending Vendor"
      })
    });

    await initVendorProfile();

    expect(global.alert).toHaveBeenCalledWith("This vendor profile is not available.");
  });

  test("shows message when vendor has no available menu items", async () => {
    window.history.pushState({}, "", "/vendor-profile.html?vendorId=vendor-123");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "BobThePlug",
        openingTime: "08:00",
        closingTime: "17:00"
      })
    });

    getDocs.mockResolvedValue({
      docs: [
        {
          id: "item-1",
          data: () => ({
            name: "Unavailable Item",
            available: false
          })
        }
      ]
    });

    await initVendorProfile();

    expect(document.getElementById("vendorMenu").textContent).toContain("No available menu items yet.");
  });
});