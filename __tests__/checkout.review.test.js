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
  collection: jest.fn((_db, collectionName) => collectionName),
  doc: jest.fn((_db, collectionName, id) => ({
    collectionName,
    id
  })),
  
  collection: jest.fn((db, collectionName) => collectionName),
  query: jest.fn((collectionName, ...conditions) => ({
    collectionName,
    condition
  })),
  where: jest.fn((field, operator, value) => ({
    field,
    operator,
    value
  })),
  serverTimestamp: jest.fn(() => "timestamp"),
  onAuthStateChanged: jest.fn()
}));
jest.mock("../scripts/toast.js", () => ({
  showToast: jest.fn()
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("customer-orders review flow", () => {
  let database;
  let showToast;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    database = require("../scripts/database.js");

    document.body.innerHTML = `
      <input type="date" id="orderDateFilter" />
      <select id="vendorFilter"></select>

      <section id="active-orders"></section>
      <section id="ready-orders"></section>
      <section id="refund-orders"></section>
      <section id="order-history"></section>

      <section id="item-details-modal" class="hidden"></section>
      <h2 id="modal-title"></h2>
      <section id="itemList"></section>
      <p id="numItemsOrder"></p>
    `;

    jest.spyOn(console, "error").mockImplementation(() => {});

    database = await import("../scripts/database.js");
    showToast = require("../scripts/toast.js").showToast;

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

    mockDefaultOrders();

    database.addDoc.mockResolvedValue({ id: "review-1" });
    database.updateDoc.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("shows review button only for collected unreviewed orders", async () => {
await loadCheckout();

    const historyHtml = document.getElementById("order-history").innerHTML;
    const readyHtml = document.getElementById("ready-orders").innerHTML;

    expect(historyHtml).toContain("Review");
    expect(historyHtml).toContain("Order 7");
    expect(readyHtml).not.toContain("Review");
  });

  test("opens review modal with order number and items", async () => {
await loadCheckout();

    document.querySelector(".review-order-btn").click();

    const modal = document.getElementById("review-modal");

    expect(modal).not.toBeNull();
    expect(modal.innerHTML).toContain("Review Order 7");
    expect(modal.innerHTML).toContain("Campus Café");
    expect(modal.innerHTML).toContain("Cheese Burger");
  });

  test("validates rating before submitting review", async () => {
await loadCheckout();

    document.querySelector(".review-order-btn").click();

    document.getElementById("reviewComment").value = "Great food.";
    document.getElementById("submitReviewBtn").click();

    await flush();

    expect(showToast).toHaveBeenCalledWith("Please select a rating.", "warning");
    expect(database.addDoc).not.toHaveBeenCalled();
  });

  test("validates comment before submitting review", async () => {
await loadCheckout();

    document.querySelector(".review-order-btn").click();

    document.getElementById("reviewRating").value = "5";
    document.getElementById("submitReviewBtn").click();

    await flush();

    expect(showToast).toHaveBeenCalledWith("Please write a review.", "warning");
    expect(database.addDoc).not.toHaveBeenCalled();
  });

  test("submits review and marks order as reviewed", async () => {
await loadCheckout();

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
      {
        collectionName: "orders",
        id: "order-1"
      },
      expect.objectContaining({
        reviewed: true,
        updatedAt: "timestamp"
      })
    );

    expect(showToast).toHaveBeenCalledWith("Review submitted successfully.", "success");
  });

  test("does not show review button if order already reviewed", async () => {
    mockDefaultOrders({ reviewed: true });

await loadCheckout();;

    expect(document.getElementById("order-history").innerHTML)
      .toContain("Review submitted");

    expect(document.querySelector(".review-order-btn")).toBeNull();
  });

  test("prevents review submission when user is missing", async () => {
    database.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
    });

await loadCheckout();

expect(document.getElementById("active-orders").textContent)
  .toContain("Please log in");
  });

  test("prevents duplicate reviews", async () => {
    database.getDocs.mockImplementation(async (queryObj) => {
      if (queryObj.collectionName === "orders") {
        return makeSnapshot([
          {
            id: "order-1",
            userId: "customer-1",
            vendorId: "vendor-1",
            vendorName: "Campus Café",
            orderNumber: 7,
            status: "Collected",
            reviewed: true,
            createdAt: todayTimestamp(),
            updatedAt: todayTimestamp(),
            menuItems: [
              {
                name: "Cheese Burger",
                quantity: 1,
                vendorId: "vendor-1",
                vendorName: "Campus Café"
              }
            ]
          }
        ]);
      }

      if (queryObj.collectionName === "reviews") {
        return {
          docs: [
            {
              id: "review-1",
              data: () => ({
                orderId: "order-1"
              })
            }
          ]
        };
      }

      return { docs: [] };
    });

await loadCheckout();

    expect(document.getElementById("order-history").innerHTML)
      .toContain("Review submitted");
  });

  test("shows review failure alert", async () => {
    database.addDoc.mockRejectedValueOnce(new Error("fail"));

await loadCheckout();

    document.querySelector(".review-order-btn").click();

    document.getElementById("reviewRating").value = "5";
    document.getElementById("reviewComment").value = "Excellent";

    document.getElementById("submitReviewBtn").click();

    await flush();
    await flush();

  expect(showToast).toHaveBeenCalledWith("Failed to submit review.", "error");
});
});