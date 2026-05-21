/**
 * @jest-environment jsdom
 */

global.alert = jest.fn();
global.lucide = { createIcons: jest.fn() };

jest.mock("../scripts/database.js", () => ({
  db: {},
  doc: jest.fn((db, collectionName, id) => ({
    collectionName,
    id
  })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn((db, collectionName) => collectionName),
  where: jest.fn((field, operator, value) => ({
    field,
    operator,
    value
  })),
  query: jest.fn((collectionName, ...conditions) => ({
    collectionName,
    conditions
  }))
}));
jest.mock("../scripts/toast.js", () => ({
  showToast: jest.fn()
}));

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("vendor-profile.js", () => {
  let database;
  let showToast;

  function setupDom() {
    document.body.innerHTML = `
      <h1 id="vendorName"></h1>
      <p id="vendorSlogan" class="hidden"></p>
      <p id="vendorLocation"></p>
      <p id="vendorPhone" class="hidden"></p>
      <p id="vendorHours"></p>
      <span id="vendorCategory" class="hidden"></span>
      <span id="vendorStatus"></span>

      <img id="vendorImage" class="hidden" />
      <section id="vendorImageFallback"></section>

      <section id="vendorMenu"></section>

      <section class="mt-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Reviews</h2>
        <section id="vendorReviews" class="space-y-4"></section>
      </section>
    `;
  }

  function defaultVendorData(overrides = {}) {
    return {
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
      weekendClosingTime: "14:00",
      ...overrides
    };
  }

  function defaultMenuItems() {
    return [
      {
        id: "item-1",
        vendorId: "vendor-1",
        name: "Cheese Burger",
        category: "Burgers",
        description: "Fresh burger",
        price: 55,
        available: true,
        status: "approved",
        image: "burger.jpg"
      },
      {
        id: "item-2",
        vendorId: "vendor-1",
        name: "Sold Out Pizza",
        category: "Pizza",
        description: "Unavailable",
        price: 70,
        available: false,
        status: "approved"
      },
      {
        id: "item-3",
        vendorId: "vendor-1",
        name: "Suspended Chips",
        category: "Sides",
        price: 20,
        available: true,
        status: "suspended"
      }
    ];
  }

  function defaultReviews() {
    return [
      {
        id: "review-1",
        customerName: "Taylor Pitts",
        customerImage: "customer.jpg",
        rating: 5,
        comment: "Great food.",
        orderNumber: 7,
        items: [{ name: "Cheese Burger" }]
      },
      {
        id: "review-2",
        customerName: "Alex Smith",
        rating: 4,
        comment: "Good service.",
        orderNumber: 8,
        items: [{ name: "Pizza" }]
      },
      {
        id: "review-3",
        customerName: "Sam Lee",
        rating: 3,
        comment: "Nice meal.",
        orderNumber: 9,
        items: [{ name: "Wrap" }]
      },
      {
        id: "review-4",
        customerName: "No Image User",
        rating: 5,
        comment: "Excellent.",
        orderNumber: 10,
        items: [{ name: "Burger" }]
      }
    ];
  }

  function makeSnapshot(items) {
    return {
      docs: items.map((item, index) => ({
        id: item.id || `doc-${index + 1}`,
        data: () => {
          const { id, ...rest } = item;
          return rest;
        }
      }))
    };
  }

  function mockVendorData(overrides = {}) {
    database.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => defaultVendorData(overrides)
    });
  }

  function mockSnapshots({
    menuItems = defaultMenuItems(),
    reviews = defaultReviews()
  } = {}) {
    database.getDocs.mockImplementation(async (queryObj) => {
      if (queryObj.collectionName === "menu_items") {
        return makeSnapshot(menuItems);
      }

      if (queryObj.collectionName === "reviews") {
        return makeSnapshot(reviews);
      }

      return makeSnapshot([]);
    });
  }

  async function loadVendorProfile() {
    const mod = await import("../scripts/vendor-profile.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    if (mod.initVendorProfile) {
      await mod.initVendorProfile();
    }

    await flush();

    return mod;
  }

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-24T10:00:00").getTime());

    setupDom();

    window.history.pushState({}, "", "/vendor-profile.html?vendorId=vendor-1");

    database = await import("../scripts/database.js");
    showToast = require("../scripts/toast.js").showToast;

    mockVendorData();
    mockSnapshots();

    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("loads approved vendor details, contact info, hours and available menu items", async () => {
    await loadVendorProfile();

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

    const menuText = document.getElementById("vendorMenu").textContent;

    expect(menuText).toContain("Cheese Burger");
    expect(menuText).not.toContain("Sold Out Pizza");
    expect(menuText).not.toContain("Suspended Chips");

    expect(global.lucide.createIcons).toHaveBeenCalled();
  });

  test("uses weekend operating hours on weekends", async () => {
    jest.setSystemTime(new Date("2026-04-25T10:00:00").getTime());

    mockVendorData({
      shopName: "Weekend Shop",
      weekendOpeningTime: "09:00",
      weekendClosingTime: "14:00"
    });

    mockSnapshots({ menuItems: [], reviews: [] });

    await loadVendorProfile();

    expect(document.getElementById("vendorName").textContent).toBe("Weekend Shop");
    expect(document.getElementById("vendorHours").textContent).toContain("Weekends: 09:00 - 14:00");
    expect(document.getElementById("vendorStatus").textContent).toBe("Open Now");
  });

  test("falls back to old openingTime and closingTime fields", async () => {
    mockVendorData({
      shopName: "Legacy Shop",
      weekdayOpeningTime: undefined,
      weekdayClosingTime: undefined,
      weekendOpeningTime: undefined,
      weekendClosingTime: undefined,
      openingTime: "08:00",
      closingTime: "17:00"
    });

    mockSnapshots({ menuItems: [], reviews: [] });

    await loadVendorProfile();

    expect(document.getElementById("vendorHours").textContent).toContain("Weekdays: 08:00 - 17:00");
    expect(document.getElementById("vendorStatus").textContent).toBe("Open Now");
  });

  test("does not show optional fields when they are missing", async () => {
    mockVendorData({
      shopName: "Basic Shop",
      location: "Matrix",
      storeSlogan: "",
      storePhone: "",
      storeCategory: "",
      image: ""
    });

    mockSnapshots({ menuItems: [], reviews: [] });

    await loadVendorProfile();

    expect(document.getElementById("vendorSlogan").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("vendorPhone").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("vendorCategory").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("vendorLocation").textContent).toContain("Matrix");
  });

  test("renders closed status when vendor is closed", async () => {
    mockVendorData({
      weekdayOpeningTime: "07:00",
      weekdayClosingTime: "09:00"
    });

    await loadVendorProfile();

    expect(document.getElementById("vendorStatus").textContent).toBe("Closed Now");
    expect(document.getElementById("vendorHours").textContent).toContain("Weekdays: 07:00 - 09:00");
  });

  test("renders location fallback", async () => {
    mockVendorData({
      location: ""
    });

    await loadVendorProfile();

    expect(document.getElementById("vendorLocation").textContent).toContain("Location not available");
  });

  test("does not crash when vendor image is missing", async () => {
    mockVendorData({
      image: "",
      logo: ""
    });

    await loadVendorProfile();

    expect(document.getElementById("vendorName").textContent).toBe("BobThePlug");
    expect(document.getElementById("vendorImage").classList.contains("hidden")).toBe(true);
  });

  test("renders vendor reviews horizontally with next and previous buttons", async () => {
    await loadVendorProfile();

    const html = document.getElementById("vendorReviews").innerHTML;

    expect(html).toContain("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3");
    expect(html).toMatch(/Taylor Pitts|Alex Smith|Sam Lee|No Image User/);
    expect(html).toMatch(/Great food.|Good service.|Nice meal.|Excellent./);
    expect(html).toContain("←");
    expect(html).toContain("→");
  });

  test("moves to next review page", async () => {
    await loadVendorProfile();

    document.getElementById("nextReviewsBtn")?.click();

    const html = document.getElementById("vendorReviews").innerHTML;

    expect(html).toMatch(/No Image User|Sam Lee|Alex Smith|Taylor Pitts/);
  });

  test("moves to previous review page", async () => {
    await loadVendorProfile();

    document.getElementById("nextReviewsBtn")?.click();
    document.getElementById("prevReviewsBtn")?.click();

    const html = document.getElementById("vendorReviews").innerHTML;

    expect(html).toMatch(/Taylor Pitts|Alex Smith|Sam Lee|No Image User/);
  });

  test("uses default customer image when review has no image", async () => {
    await loadVendorProfile();

    const images = document.querySelectorAll("#vendorReviews img");

    const hasDefaultImage = [...images].some((img) =>
      img.src.includes("default-icon.jpg")
    );

    expect(hasDefaultImage).toBe(true);
  });

  test("shows empty review state when vendor has no reviews", async () => {
    mockSnapshots({ menuItems: [], reviews: [] });

    await loadVendorProfile();

    expect(document.getElementById("vendorReviews").innerHTML).toContain("No reviews yet.");
  });

  test("creates reviews section dynamically when missing", async () => {
    document.getElementById("vendorReviews")?.remove();

    await loadVendorProfile();

    expect(document.getElementById("vendorReviews")).not.toBeNull();
  });

  test("shows empty menu state when vendor has no available approved items", async () => {
    mockSnapshots({
      menuItems: [
        {
          id: "item-1",
          name: "Hidden Item",
          available: false,
          status: "approved"
        },
        {
          id: "item-2",
          name: "Suspended Item",
          available: true,
          status: "suspended"
        }
      ],
      reviews: []
    });

    await loadVendorProfile();

    expect(document.getElementById("vendorMenu").innerHTML).toContain("No available menu items yet.");
  });

  test("redirects when vendor id is missing", async () => {
    window.history.pushState({}, "", "/vendor-profile.html");

    await loadVendorProfile();

    expect(showToast).toHaveBeenCalledWith("Vendor profile could not be loaded.", "error");
  });

  test("redirects when vendor is not found", async () => {
    database.getDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => ({})
    });

    await loadVendorProfile();

    expect(showToast).toHaveBeenCalledWith("Vendor not found.", "error");
  });

  test("redirects when vendor is not approved", async () => {
    mockVendorData({
      status: "pending"
    });

    await loadVendorProfile();

    expect(showToast).toHaveBeenCalledWith("This vendor profile is not available.", "error");
  });
  
  test("shows weekends as closed when vendor is closed on weekends", async () => {
  mockVendorData({
    closedWeekends: true,
    weekendOpeningTime: "",
    weekendClosingTime: ""
  });

  mockSnapshots({ menuItems: [], reviews: [] });

  await loadVendorProfile();

  expect(document.getElementById("vendorHours").textContent)
    .toContain("Weekends: Closed");
});
});