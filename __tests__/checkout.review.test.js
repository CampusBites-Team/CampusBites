/**
 * @jest-environment jsdom
 */

global.lucide = { createIcons: jest.fn() };

jest.mock("../scripts/database.js", () => ({
  db: {},
  auth: {},
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn((db, collectionName, id) => ({
    collectionName,
    id
  })),
  collection: jest.fn((db, collectionName) => collectionName),
  query: jest.fn((collectionName, ...conditions) => ({
    collectionName,
    conditions
  })),
  where: jest.fn((field, operator, value) => ({
    field,
    operator,
    value
  })),
  serverTimestamp: jest.fn(() => "timestamp"),
  onAuthStateChanged: jest.fn()
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("customer-orders review flow", () => {
  let database;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    document.body.innerHTML = `
      <section id="active-orders"></section>
      <section id="ready-orders"></section>
      <section id="refund-orders"></section>
      <section id="order-history"></section>

      <section id="item-details-modal" class="hidden"></section>
      <h2 id="modal-title"></h2>
      <section id="itemList"></section>
      <p id="numItemsOrder"></p>
    `;

    global.alert = jest.fn();
    jest.spyOn(console, "error").mockImplementation(() => {});

    database = await import("../scripts/database.js");

    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({
        uid: "customer-1",
        displayName: "Taylor Pitts",
        photoURL: "customer-photo.jpg",
        getIdToken: jest.fn()
      });
    });

    database.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Taylor Pitts",
        image: "customer-profile.jpg"
      })
    });

    database.getDocs.mockImplementation(async (queryObj) => {
      if (queryObj.collectionName === "orders") {
        return {
          docs: [
            {
              id: "order-1",
              data: () => ({
                userId: "customer-1",
                vendorId: "vendor-1",
                vendorName: "Campus Café",
                orderNumber: 7,
                status: "Collected",
                reviewed: false,
                menuItems: [
                  {
                    name: "Cheese Burger",
                    quantity: 2,
                    vendorId: "vendor-1",
                    vendorName: "Campus Café",
                    price: 55
                  }
                ],
                createdAt: {
                  toDate: () => new Date("2026-05-01T10:00:00")
                },
                updatedAt: {
                  toDate: () => new Date("2026-05-01T11:00:00")
                }
              })
            },
            {
              id: "order-2",
              data: () => ({
                userId: "customer-1",
                vendorId: "vendor-1",
                vendorName: "Campus Café",
                orderNumber: 8,
                status: "Ready",
                reviewed: false,
                menuItems: [
                  {
                    name: "Pizza",
                    quantity: 1
                  }
                ]
              })
            }
          ]
        };
      }

      if (queryObj.collectionName === "reviews") {
        return { docs: [] };
      }

      return { docs: [] };
    });

    database.addDoc.mockResolvedValue({ id: "review-1" });
    database.updateDoc.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("shows review button only for collected unreviewed orders", async () => {
    await import("../scripts/checkout.js");
    await flush();
    await flush();

    const historyHtml = document.getElementById("order-history").innerHTML;
    const readyHtml = document.getElementById("ready-orders").innerHTML;

    expect(historyHtml).toContain("Review");
    expect(historyHtml).toContain("Order 7");
    expect(readyHtml).not.toContain("Review");
  });

  test("opens review modal with order number and items", async () => {
    await import("../scripts/checkout.js");
    await flush();
    await flush();

    document.querySelector(".review-order-btn").click();

    const modal = document.getElementById("review-modal");

    expect(modal).not.toBeNull();
    expect(modal.innerHTML).toContain("Review Order 7");
    expect(modal.innerHTML).toContain("Campus Café");
    expect(modal.innerHTML).toContain("Cheese Burger");
  });

  test("validates rating before submitting review", async () => {
    await import("../scripts/checkout.js");
    await flush();
    await flush();

    document.querySelector(".review-order-btn").click();

    document.getElementById("reviewComment").value = "Great food.";
    document.getElementById("submitReviewBtn").click();

    await flush();

    expect(alert).toHaveBeenCalledWith("Please select a rating.");
    expect(database.addDoc).not.toHaveBeenCalled();
  });

  test("validates comment before submitting review", async () => {
    await import("../scripts/checkout.js");
    await flush();
    await flush();

    document.querySelector(".review-order-btn").click();

    document.getElementById("reviewRating").value = "5";
    document.getElementById("submitReviewBtn").click();

    await flush();

    expect(alert).toHaveBeenCalledWith("Please write a review.");
    expect(database.addDoc).not.toHaveBeenCalled();
  });

  test("submits review and marks order as reviewed", async () => {
    await import("../scripts/checkout.js");
    await flush();
    await flush();

    document.querySelector(".review-order-btn").click();

    document.getElementById("reviewRating").value = "5";
    document.getElementById("reviewComment").value = "Excellent order.";
    document.getElementById("submitReviewBtn").click();

    await flush();
    await flush();

    expect(database.addDoc).toHaveBeenCalledWith(
      "reviews",
      expect.objectContaining({
        customerId: "customer-1",
        customerName: "Taylor Pitts",
        customerImage: "customer-profile.jpg",
        vendorId: "vendor-1",
        vendorName: "Campus Café",
        orderId: "order-1",
        orderNumber: 7,
        rating: 5,
        comment: "Excellent order.",
        createdAt: "timestamp"
      })
    );

    expect(database.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionName: "orders",
        id: "order-1"
      }),
      expect.objectContaining({
        reviewed: true,
        updatedAt: "timestamp"
      })
    );

    expect(alert).toHaveBeenCalledWith("Review submitted successfully.");
  });

  test("does not show review button if order already reviewed", async () => {
    database.getDocs.mockImplementation(async (queryObj) => {
      if (queryObj.collectionName === "orders") {
        return {
          docs: [
            {
              id: "order-1",
              data: () => ({
                userId: "customer-1",
                vendorId: "vendor-1",
                vendorName: "Campus Café",
                orderNumber: 7,
                status: "Collected",
                reviewed: true,
                menuItems: [{ name: "Cheese Burger", quantity: 1 }]
              })
            }
          ]
        };
      }

      if (queryObj.collectionName === "reviews") {
        return { docs: [] };
      }

      return { docs: [] };
    });

    await import("../scripts/checkout.js");
    await flush();
    await flush();

    expect(document.getElementById("order-history").innerHTML)
      .toContain("Review submitted");

    expect(document.querySelector(".review-order-btn")).toBeNull();
  });
});