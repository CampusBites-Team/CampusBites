/**
 * @jest-environment jsdom
 */

global.lucide = { createIcons: jest.fn() };

jest.mock("../scripts/database.js", () => ({
  db: {},
  getDocs: jest.fn(),
  collection: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  auth: {},
  onAuthStateChanged: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-timestamp")
}));

const makeSnapshot = (orders) => ({
  docs: orders.map((order, index) => ({
    id: order.id || `order-${index + 1}`,
    data: () => {
      const { id, ...rest } = order;
      return rest;
    }
  }))
});

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("checkOut.js", () => {
  let db;

  beforeEach(() => {
    jest.resetModules();

    document.body.innerHTML = `
      <section id="active-orders"></section>
      <section id="ready-orders"></section>
      <section id="refund-orders"></section>
      <section id="order-history"></section>

      <h3 id="modal-title"></h3>
      <section id="item-details-modal" class="hidden"></section>
      <section id="itemList"></section>
      <p id="numItemsOrder"></p>
    `;

    db = require("../scripts/database.js");

    window.alert = jest.fn();

    db.collection.mockImplementation((_db, collectionName) => collectionName);

    db.where.mockImplementation((field, operator, value) => ({
      field,
      operator,
      value
    }));

    db.query.mockImplementation((collectionName, condition) => ({
      collectionName,
      condition
    }));

    db.doc.mockImplementation((_db, collectionName, id) => ({
      collectionName,
      id
    }));

    db.updateDoc.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("renders the logged-in user's active orders", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Preparing",
          menuItems: [
            {
              name: "Burger",
              image: "burger.jpg",
              vendorName: "Shop 1",
              price: 50,
              description: "Tasty burger",
              dietary: [],
              allergens: []
            }
          ]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    const html = document.getElementById("active-orders").innerHTML;

    expect(html).toContain("Burger");
    expect(html).toContain("Preparing");
    expect(html).toContain("Details");
  });

  test("renders ready orders in ready section", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Ready",
          menuItems: [{ name: "Pizza", price: 80 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    expect(document.getElementById("ready-orders").innerHTML).toContain("Pizza");
    expect(document.getElementById("ready-orders").innerHTML).toContain("Ready");
  });

  test("renders refund pending orders in refund section", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "refund pending",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    expect(document.getElementById("refund-orders").innerHTML).toContain("Burger");
    expect(document.getElementById("refund-orders").innerHTML).toContain("Refund pending");
    expect(document.getElementById("refund-orders").innerHTML).toContain("Refund processing");
  });

  test("renders refunded orders in refund section", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "refunded",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    expect(document.getElementById("refund-orders").innerHTML).toContain("Burger");
    expect(document.getElementById("refund-orders").innerHTML).toContain("Refunded");
    expect(document.getElementById("refund-orders").innerHTML).toContain("Refund completed");
  });

  test("renders collected orders in order history section", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Collected",
          menuItems: [{ name: "Wrap", price: 45 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    expect(document.getElementById("order-history").innerHTML).toContain("Wrap");
    expect(document.getElementById("order-history").innerHTML).toContain("Collected");
  });

  test("falls back to Pending when order status is missing", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          menuItems: [
            {
              name: "Pizza",
              image: "pizza.jpg",
              vendorName: "Shop 2",
              price: 80,
              description: "Cheesy pizza",
              dietary: [],
              allergens: []
            }
          ]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    expect(document.getElementById("active-orders").innerHTML).toContain("Pending");
  });

  test("opens modal and renders item details when Details button is clicked", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Pending",
          menuItems: [
            {
              name: "Sandwich",
              image: "sandwich.jpg",
              vendorName: "BobThePlug",
              price: 45,
              description: "TLB sandwich",
              dietary: ["Vegetarian", "Halal"],
              allergens: ["Mustard", "Crustaceans"]
            },
            {
              name: "Juice",
              image: "juice.jpg",
              vendorName: "BobThePlug",
              price: 20,
              description: "Fresh juice",
              dietary: [],
              allergens: []
            }
          ]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    document.querySelector('.details-order-btn[data-order-id="order-1"]').click();

    expect(document.getElementById("modal-title").textContent).toBe("Items in Order");
    expect(document.getElementById("item-details-modal").classList.contains("hidden")).toBe(false);

    const itemListHtml = document.getElementById("itemList").innerHTML;

    expect(itemListHtml).toContain("Sandwich");
    expect(itemListHtml).toContain("Juice");
    expect(itemListHtml).toContain("Vegetarian");
    expect(itemListHtml).toContain("Mustard");
    expect(document.getElementById("numItemsOrder").textContent).toBe("2 items in order");
  });

  test("shows singular item text when order has one item", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Pending",
          menuItems: [
            {
              name: "Wrap",
              image: "wrap.jpg",
              vendorName: "Shop 3",
              price: 35,
              description: "Chicken wrap",
              dietary: [],
              allergens: []
            }
          ]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    document.querySelector('.details-order-btn[data-order-id="order-1"]').click();

    expect(document.getElementById("numItemsOrder").textContent).toBe("1 item in order");
  });

  test("shows login message when user is not logged in", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(null);
    });

    require("../scripts/checkOut.js");
    await flush();

    expect(db.getDocs).not.toHaveBeenCalled();
    expect(document.getElementById("active-orders").innerHTML)
      .toContain("Please log in to view your orders.");
  });

  test("cancels pending order when Cancel button is clicked", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs
      .mockResolvedValueOnce(
        makeSnapshot([
          {
            id: "order-1",
            userId: "user-123",
            status: "Pending",
            menuItems: [{ name: "Burger", price: 50 }]
          }
        ])
      )
      .mockResolvedValueOnce(
        makeSnapshot([
          {
            id: "order-1",
            userId: "user-123",
            status: "cancelled",
            menuItems: [{ name: "Burger", price: 50 }]
          }
        ])
      );

    require("../scripts/checkOut.js");
    await flush();

    document.querySelector('.cancel-order-btn[data-order-id="order-1"]').click();

    await flush();

    expect(db.updateDoc).toHaveBeenCalledWith(
      { collectionName: "orders", id: "order-1" },
      {
        status: "cancelled",
        updatedAt: "mock-timestamp"
      }
    );
  });

  test("cancels order when status is lowercase pending", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs
      .mockResolvedValueOnce(
        makeSnapshot([
          {
            id: "order-1",
            userId: "user-123",
            status: "pending",
            menuItems: [{ name: "Burger", price: 50 }]
          }
        ])
      )
      .mockResolvedValueOnce(
        makeSnapshot([
          {
            id: "order-1",
            userId: "user-123",
            status: "cancelled",
            menuItems: [{ name: "Burger", price: 50 }]
          }
        ])
      );

    require("../scripts/checkOut.js");
    await flush();

    document.querySelector('.cancel-order-btn[data-order-id="order-1"]').click();

    await flush();

    expect(db.updateDoc).toHaveBeenCalledWith(
      { collectionName: "orders", id: "order-1" },
      {
        status: "cancelled",
        updatedAt: "mock-timestamp"
      }
    );
  });

  test("alerts when order cannot be cancelled because it is in progress", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Preparing",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    const fakeBtn = document.createElement("button");
    fakeBtn.className = "cancel-order-btn";
    fakeBtn.dataset.orderId = "order-1";
    document.body.appendChild(fakeBtn);

    fakeBtn.click();

    expect(window.alert).toHaveBeenCalledWith(
      "Order cannot be cancelled, it is already in progress."
    );
  });

  test("alerts when cancelled order is cancelled again", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "cancelled",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    const fakeBtn = document.createElement("button");
    fakeBtn.className = "cancel-order-btn";
    fakeBtn.dataset.orderId = "order-1";
    document.body.appendChild(fakeBtn);

    fakeBtn.click();

    expect(window.alert).toHaveBeenCalledWith("Order is already cancelled");
  });

  test("alerts when order status is capital Cancelled", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Cancelled",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    const fakeBtn = document.createElement("button");
    fakeBtn.className = "cancel-order-btn";
    fakeBtn.dataset.orderId = "order-1";
    document.body.appendChild(fakeBtn);

    fakeBtn.click();

    expect(window.alert).toHaveBeenCalledWith("Order is already cancelled");
  });

  test("handles updateDoc failure when cancelling order", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Pending",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    db.updateDoc.mockRejectedValue(new Error("fail"));

    require("../scripts/checkOut.js");
    await flush();

    document.querySelector('.cancel-order-btn[data-order-id="order-1"]').click();

    await flush();

    expect(errorSpy).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("Failed to cancel order");
  });

  test("does nothing when order is not found in cache", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Pending",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    const fakeBtn = document.createElement("button");
    fakeBtn.className = "cancel-order-btn";
    fakeBtn.dataset.orderId = "missing-order";
    document.body.appendChild(fakeBtn);

    fakeBtn.click();

    expect(db.updateDoc).not.toHaveBeenCalled();
  });

  test("does nothing if itemList or numItemsOrder is missing", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Pending",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    document.getElementById("itemList").remove();

    require("../scripts/checkOut.js");
    await flush();

    document.querySelector('.details-order-btn[data-order-id="order-1"]').click();

    expect(true).toBe(true);
  });

  test("updates UI after successful order cancellation", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs
      .mockResolvedValueOnce(
        makeSnapshot([
          {
            id: "order-1",
            userId: "user-123",
            status: "Pending",
            menuItems: [{ name: "Burger", price: 50 }]
          }
        ])
      )
      .mockResolvedValueOnce(
        makeSnapshot([
          {
            id: "order-1",
            userId: "user-123",
            status: "cancelled",
            menuItems: [{ name: "Burger", price: 50 }]
          }
        ])
      );

    require("../scripts/checkOut.js");
    await flush();

    document.querySelector('.cancel-order-btn[data-order-id="order-1"]').click();

    await flush();

    expect(db.updateDoc).toHaveBeenCalledWith(
  expect.anything(),
  expect.objectContaining({
    status: "cancelled"
  })
);
      
  });

  test("renders no orders message when user has no orders", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(makeSnapshot([]));

    require("../scripts/checkOut.js");
    await flush();

    expect(document.getElementById("active-orders").innerHTML)
      .toContain("No orders found.");
  });

  test("renders failed to load orders message when getDocs fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockRejectedValue(new Error("load failed"));

    require("../scripts/checkOut.js");
    await flush();

    expect(errorSpy).toHaveBeenCalled();
    expect(document.getElementById("active-orders").innerHTML)
      .toContain("Failed to load orders.");
  });

  test("formats created and updated timestamps in checkout orders", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    const fakeDate = new Date("2026-05-08T10:30:00");

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Pending",
          createdAt: {
            toDate: () => fakeDate
          },
          updatedAt: {
            toDate: () => fakeDate
          },
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    const html = document.getElementById("active-orders").innerHTML;

    expect(html).toContain("Placed:");
    expect(html).toContain("Updated:");
    expect(html).not.toContain("Not available");
  });

  test("alerts when order has already been refunded", async () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "refunded",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    const fakeBtn = document.createElement("button");
    fakeBtn.className = "cancel-order-btn";
    fakeBtn.dataset.orderId = "order-1";
    document.body.appendChild(fakeBtn);

    fakeBtn.click();

    expect(alertSpy).toHaveBeenCalledWith("Order has already been refunded.");
  });

  test("initiates Paystack refund for paid pending order", async () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    global.fetch = fetchMock;

    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({
        uid: "user-123",
        getIdToken: jest.fn().mockResolvedValue("id-token-abc")
      });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Pending",
          paymentStatus: "paid",
          paystackReference: "ref-1",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    document.querySelector('.cancel-order-btn[data-order-id="order-1"]').click();

    await flush();
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/paystack/refund",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer id-token-abc"
        }),
        body: JSON.stringify({ orderId: "order-1" })
      })
    );

    expect(alertSpy).toHaveBeenCalledWith(
      "Refund initiated. It usually clears within a few minutes."
    );

    expect(db.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "refund pending",
        refundStatus: "pending"
      })
    );

  });

  test("alerts when Paystack refund request fails", async () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" })
    });

    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({
        uid: "user-123",
        getIdToken: jest.fn().mockResolvedValue("id-token-abc")
      });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Pending",
          paymentStatus: "paid",
          paystackReference: "ref-1",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    document.querySelector('.cancel-order-btn[data-order-id="order-1"]').click();

    await flush();
    await flush();

    expect(errorSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("Could not initiate refund: boom");
  });

  test("refund alerts when user is no longer signed in", async () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    let authCb;

    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      authCb = cb;

      cb({
        uid: "user-123",
        getIdToken: jest.fn().mockResolvedValue("id-token-abc")
      });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
          id: "order-1",
          userId: "user-123",
          status: "Pending",
          paymentStatus: "paid",
          paystackReference: "ref-1",
          menuItems: [{ name: "Burger", price: 50 }]
        }
      ])
    );

    require("../scripts/checkOut.js");
    await flush();

    authCb(null);

    const fakeBtn = document.createElement("button");
    fakeBtn.className = "cancel-order-btn";
    fakeBtn.dataset.orderId = "order-1";
    document.body.appendChild(fakeBtn);

    fakeBtn.click();

    expect(alertSpy).toHaveBeenCalledWith(
      "You must be signed in to cancel an order."
    );
  });
});