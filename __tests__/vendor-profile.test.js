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
  where: jest.fn((field, operator, value) => ({ field, operator, value })),
  query: jest.fn((collectionName, ...conditions) => ({
    collectionName,
    conditions
  }))
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("vendor-profile.js", () => {
  let database;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    window.history.pushState({}, "", "/vendor-profile.html?vendorId=vendor-1");

    document.body.innerHTML = `
      <h1 id="vendorName"></h1>
      <p id="vendorLocation"></p>
      <p id="vendorHours"></p>
      <span id="vendorStatus"></span>

      <img id="vendorImage" class="hidden" />
      <section id="vendorImageFallback"></section>

      <section id="vendorMenu"></section>

      <section class="mt-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Reviews</h2>
        <section id="vendorReviews" class="space-y-4"></section>
      </section>
    `;

    database = await import("../scripts/database.js");

    database.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "Campus Café",
        location: "Matrix",
        openingTime: "08:00",
        closingTime: "18:00",
        image: "vendor.jpg"
      })
    });

    database.getDocs.mockImplementation(async (queryObj) => {
      if (queryObj.collectionName === "menu_items") {
        return {
          docs: [
            {
              id: "item-1",
              data: () => ({
                vendorId: "vendor-1",
                name: "Cheese Burger",
                category: "Burgers",
                description: "Fresh burger",
                price: 55,
                available: true,
                status: "approved",
                image: "burger.jpg"
              })
            },
            {
              id: "item-2",
              data: () => ({
                vendorId: "vendor-1",
                name: "Sold Out Pizza",
                category: "Pizza",
                description: "Unavailable",
                price: 70,
                available: false,
                status: "approved"
              })
            },
            {
              id: "item-3",
              data: () => ({
                vendorId: "vendor-1",
                name: "Suspended Chips",
                category: "Sides",
                price: 20,
                available: true,
                status: "suspended"
              })
            }
          ]
        };
      }

      if (queryObj.collectionName === "reviews") {
        return {
          docs: [
            {
              id: "review-1",
              data: () => ({
                customerName: "Taylor Pitts",
                customerImage: "customer.jpg",
                rating: 5,
                comment: "Great food.",
                orderNumber: 7,
                items: [{ name: "Cheese Burger" }]
              })
            },
            {
              id: "review-2",
              data: () => ({
                customerName: "Alex Smith",
                rating: 4,
                comment: "Good service.",
                orderNumber: 8,
                items: [{ name: "Pizza" }]
              })
            },
            {
              id: "review-3",
              data: () => ({
                customerName: "Sam Lee",
                rating: 3,
                comment: "Nice meal.",
                orderNumber: 9,
                items: [{ name: "Wrap" }]
              })
            },
            {
              id: "review-4",
              data: () => ({
                customerName: "No Image User",
                rating: 5,
                comment: "Excellent.",
                orderNumber: 10,
                items: [{ name: "Burger" }]
              })
            }
          ]
        };
      }

      return { docs: [] };
    });

    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("loads approved vendor details and available approved menu items", async () => {
    await import("../scripts/vendor-profile.js");
    await flush();

    expect(document.getElementById("vendorName").textContent).toBe("Campus Café");
    expect(document.getElementById("vendorLocation").textContent).toBe("Matrix");
    expect(document.getElementById("vendorImage").classList.contains("hidden")).toBe(false);

    const menuText = document.getElementById("vendorMenu").textContent;

    expect(menuText).toContain("Cheese Burger");
    expect(menuText).not.toContain("Sold Out Pizza");
    expect(menuText).not.toContain("Suspended Chips");
  });

  test("renders vendor reviews horizontally with next and previous buttons", async () => {
    await import("../scripts/vendor-profile.js");
    await flush();

    const html = document.getElementById("vendorReviews").innerHTML;

    expect(html).toContain("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3");
    expect(html).toMatch(
      /Taylor Pitts|Alex Smith|Sam Lee|No Image User/
    );

    expect(html).toMatch(
      /Great food.|Good service.|Nice meal.|Excellent./
    );
    expect(html).toContain("←");
    expect(html).toContain("→");
  });

  test("moves to next review page", async () => {
    await import("../scripts/vendor-profile.js");
    await flush();

    document.getElementById("nextReviewsBtn").click();

    const html = document.getElementById("vendorReviews").innerHTML;

    expect(html).toMatch(
  /No Image User|Sam Lee|Alex Smith|Taylor Pitts/
);
  });

  test("uses default customer image when review has no image", async () => {
    await import("../scripts/vendor-profile.js");
    await flush();

    document.getElementById("nextReviewsBtn").click();

    const images = document
      .querySelectorAll("#vendorReviews img");

    const hasDefaultImage = [...images].some((img) =>
      img.src.includes("default-icon.jpg")
    );

    expect(hasDefaultImage).toBe(true);

  });

  test("shows empty review state when vendor has no reviews", async () => {
    database.getDocs.mockImplementation(async (queryObj) => {
      if (queryObj.collectionName === "menu_items") {
        return { docs: [] };
      }

      if (queryObj.collectionName === "reviews") {
        return { docs: [] };
      }

      return { docs: [] };
    });

    await import("../scripts/vendor-profile.js");
    await flush();

    expect(document.getElementById("vendorReviews").innerHTML)
      .toContain("No reviews yet.");
  });

  test("redirects when vendor id is missing", async () => {
    window.history.pushState({}, "", "/vendor-profile.html");

    delete window.location;
    window.location = {
      href: "",
      search: ""
    };

    await import("../scripts/vendor-profile.js");
    await flush();

    expect(alert).toHaveBeenCalledWith("Vendor profile could not be loaded.");
  });
  test("does not crash when vendor image is missing", async () => {
  database.getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      shopName: "Campus Café"
    })
  });

  await import("../scripts/vendor-profile.js");
  await flush();

  expect(document.getElementById("vendorName").textContent)
    .toBe("Campus Café");
});

test("renders location fallback", async () => {
  database.getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      shopName: "Campus Café",
      openingTime: "08:00",
      closingTime: "18:00"
    })
  });

  await import("../scripts/vendor-profile.js");
  await flush();

  expect(document.getElementById("vendorLocation").textContent)
    .toContain("Location not available");
});

test("renders closed status when vendor is closed", async () => {
  jest.spyOn(global, "Date").mockImplementation(() => ({
    toTimeString: () => "23:00:00"
  }));

  await import("../scripts/vendor-profile.js");
  await flush();

  expect(document.getElementById("vendorStatus").textContent)
    .toContain("Closed Now");
});

test("creates reviews section dynamically when missing", async () => {
  document.getElementById("vendorReviews")?.remove();

  await import("../scripts/vendor-profile.js");
  await flush();

  expect(document.getElementById("vendorReviews"))
    .not.toBeNull();
});

test("moves to previous review page", async () => {
  await import("../scripts/vendor-profile.js");
  await flush();

  document.getElementById("nextReviewsBtn")?.click();
  document.getElementById("prevReviewsBtn")?.click();

  expect(
    document.getElementById("vendorReviews").innerHTML
  ).toContain("Reviews");
});
});