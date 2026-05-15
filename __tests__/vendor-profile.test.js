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
    global.lucide = { createIcons: jest.fn() };

    document.body.innerHTML = `
      <section id="vendorImageFallback" class=""></section>
      <img id="vendorImage" class="hidden" />
      <span id="vendorCategory" class="hidden"></span>
      <span id="vendorStatus"></span>
      <h1 id="vendorName"></h1>
      <p id="vendorSlogan" class="hidden"></p>
      <p id="vendorLocation"></p>
      <p id="vendorPhone" class="hidden"></p>
      <p id="vendorHours"></p>
      <section id="vendorMenu"></section>
    `;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("loads approved vendor details, contact info, hours and available menu items", async () => {
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
        storeSlogan: "Fresh food fast",
        storePhone: "0712345678",
        storeCategory: "Fast Food",
        weekdayOpeningTime: "08:00",
        weekdayClosingTime: "17:00",
        weekendOpeningTime: "09:00",
        weekendClosingTime: "14:00"
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
    expect(document.getElementById("vendorSlogan").textContent).toBe("Fresh food fast");
    expect(document.getElementById("vendorSlogan").classList.contains("hidden")).toBe(false);

    expect(document.getElementById("vendorCategory").textContent).toBe("Fast Food");
    expect(document.getElementById("vendorCategory").classList.contains("hidden")).toBe(false);

    expect(document.getElementById("vendorLocation").textContent).toContain("Matrix Ground Floor");
    expect(document.getElementById("vendorPhone").textContent).toContain("0712345678");
    expect(document.getElementById("vendorPhone").classList.contains("hidden")).toBe(false);

    expect(document.getElementById("vendorHours").textContent).toContain("Weekdays: 08:00 - 17:00");
    expect(document.getElementById("vendorHours").textContent).toContain("Weekends: 09:00 - 14:00");
    expect(document.getElementById("vendorStatus").textContent).toBe("Open Now");

    expect(document.getElementById("vendorImage").src).toContain("vendor-logo-url");
    expect(document.getElementById("vendorImage").classList.contains("hidden")).toBe(false);

    expect(document.getElementById("vendorMenu").textContent).toContain("Cheese Burger");
    expect(document.getElementById("vendorMenu").textContent).not.toContain("Sold Out Pizza");

    expect(global.lucide.createIcons).toHaveBeenCalled();
  });

  test("uses weekend operating hours on weekends", async () => {
    jest.setSystemTime(new Date("2026-04-25T10:00:00").getTime());
    window.history.pushState({}, "", "/vendor-profile.html?vendorId=vendor-123");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "Weekend Shop",
        weekendOpeningTime: "09:00",
        weekendClosingTime: "14:00"
      })
    });

    getDocs.mockResolvedValue({
      docs: []
    });

    await initVendorProfile();

    expect(document.getElementById("vendorHours").textContent).toContain("Weekends: 09:00 - 14:00");
    expect(document.getElementById("vendorStatus").textContent).toBe("Open Now");
  });

  test("falls back to old openingTime and closingTime fields", async () => {
    window.history.pushState({}, "", "/vendor-profile.html?vendorId=vendor-123");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "Legacy Shop",
        openingTime: "08:00",
        closingTime: "17:00"
      })
    });

    getDocs.mockResolvedValue({
      docs: []
    });

    await initVendorProfile();

    expect(document.getElementById("vendorHours").textContent).toContain("Weekdays: 08:00 - 17:00");
    expect(document.getElementById("vendorStatus").textContent).toBe("Open Now");
  });

  test("shows closed status when current time is outside operating hours", async () => {
    window.history.pushState({}, "", "/vendor-profile.html?vendorId=vendor-123");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "BobThePlug",
        weekdayOpeningTime: "07:00",
        weekdayClosingTime: "09:00"
      })
    });

    getDocs.mockResolvedValue({
      docs: []
    });

    await initVendorProfile();

    expect(document.getElementById("vendorStatus").textContent).toBe("Closed Now");
    expect(document.getElementById("vendorHours").textContent).toContain("Weekdays: 07:00 - 09:00");
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

    expect(document.getElementById("vendorHours").textContent).toContain("Weekdays: Not set");
    expect(document.getElementById("vendorHours").textContent).toContain("Weekends: Not set");
    expect(document.getElementById("vendorStatus").textContent).toBe("Closed Now");
  });

  test("does not show optional fields when they are missing", async () => {
    window.history.pushState({}, "", "/vendor-profile.html?vendorId=vendor-123");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "Basic Shop",
        location: "Matrix"
      })
    });

    getDocs.mockResolvedValue({
      docs: []
    });

    await initVendorProfile();

    expect(document.getElementById("vendorSlogan").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("vendorPhone").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("vendorCategory").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("vendorLocation").textContent).toContain("Matrix");
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
        weekdayOpeningTime: "08:00",
        weekdayClosingTime: "17:00"
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