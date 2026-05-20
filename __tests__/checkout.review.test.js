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
  query: jest.fn((collectionName, condition) => ({
    collectionName,
    condition
  })),
  where: jest.fn((field, operator, value) => ({
    field,
    operator,
    value
  })),
  onAuthStateChanged: jest.fn(),
  serverTimestamp: jest.fn(() => "timestamp")
}));
let database;

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};
const loadCheckout = async () => {
  await import("../scripts/checkOut.js");

  document.dispatchEvent(new Event("DOMContentLoaded"));

  await flush();
  await flush();
};

const todayTimestamp = () => ({
  toDate: () => new Date()
});

function makeSnapshot(items) {
  return {
    docs: items.map((item) => ({
      id: item.id,
      data: () => {
        const { id, ...rest } = item;
        return rest;
      }
    }))
  };
}

function mockDefaultOrders({ reviewed = false } = {}) {
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
          reviewed,
          createdAt: todayTimestamp(),
          updatedAt: todayTimestamp(),
          menuItems: [
            {
              name: "Cheese Burger",
              quantity: 2,
              vendorId: "vendor-1",
              vendorName: "Campus Café",
              price: 55
            }
          ]
        },
        {
          id: "order-2",
          userId: "customer-1",
          vendorId: "vendor-1",
          vendorName: "Campus Café",
          orderNumber: 8,
          status: "Ready",
          reviewed: false,
          createdAt: todayTimestamp(),
          updatedAt: todayTimestamp(),
          menuItems: [
            {
              name: "Pizza",
              quantity: 1,
              vendorId: "vendor-1",
              vendorName: "Campus Café",
              price: 80
            }
          ]
        }
      ]);
    }

    if (queryObj.collectionName === "reviews") {
      return { docs: [] };
    }

    return { docs: [] };
  });
}

describe("customer-orders review flow", () => {
  beforeEach(() => {
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

    global.alert = jest.fn();
    window.alert = global.alert;

    database.onAuthStateChanged.mockImplementation((_auth, callback) => {
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

    expect(alert).toHaveBeenCalledWith("Please select a rating.");
    expect(database.addDoc).not.toHaveBeenCalled();
  });

  test("validates comment before submitting review", async () => {
await loadCheckout();

    document.querySelector(".review-order-btn").click();

    document.getElementById("reviewRating").value = "5";
    document.getElementById("submitReviewBtn").click();

    await flush();

    expect(alert).toHaveBeenCalledWith("Please write a review.");
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

    expect(alert).toHaveBeenCalledWith("Review submitted successfully.");
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

    expect(alert).toHaveBeenCalledWith("Failed to submit review.");
  });
});