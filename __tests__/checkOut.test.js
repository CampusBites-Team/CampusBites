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
  where: jest.fn()
}));

const makeSnapshot = (orders) => ({
  docs: orders.map((order, index) => ({
    id: order.id || `order-${index + 1}`,
    data: () => order
  }))
});

describe("checkOut.js", () => {
  let db;

  beforeEach(() => {
    jest.resetModules();

    document.body.innerHTML = `
      <table>
        <tbody id="order-table-body"></tbody>
      </table>

      <h3 id="modal-title"></h3>
      <div id="item-details-modal" class="hidden"></div>
      <div id="itemList"></div>
      <p id="numItemsOrder"></p>
    `;

    db = require("../scripts/database.js");
  });

  test("renders the logged-in user's orders", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
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
    await Promise.resolve();
    await Promise.resolve();

    const html = document.getElementById("order-table-body").innerHTML;

    expect(html).toContain("Burger");
    expect(html).toContain("Preparing");
    expect(html).toContain("Details");
  });

  test("falls back to pending when order status is missing", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "user-123" });
    });

    db.getDocs.mockResolvedValue(
      makeSnapshot([
        {
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
    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById("order-table-body").innerHTML).toContain("pending");
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
    await Promise.resolve();
    await Promise.resolve();

    const detailsButton = document.querySelector('#order-table-body button[data-index="0"]');
    detailsButton.click();

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
    await Promise.resolve();
    await Promise.resolve();

    const detailsButton = document.querySelector('#order-table-body button[data-index="0"]');
    detailsButton.click();

    expect(document.getElementById("numItemsOrder").textContent).toBe("1 item in order");
  });

  test("does nothing when user is not logged in", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(null);
    });

    require("../scripts/checkOut.js");
    await Promise.resolve();

    expect(db.getDocs).not.toHaveBeenCalled();
    expect(document.getElementById("order-table-body").innerHTML)
  .toContain("Please log in to view your orders.");
  });
  test("cancels pending order when Cancel Order button is clicked", async () => {
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

  db.updateDoc.mockResolvedValue({});

  require("../scripts/checkOut.js");
  await Promise.resolve();
  await Promise.resolve();

  const cancelButton = document.querySelector(
    '#order-table-body button[data-index="-1"]'
  );

  cancelButton.click();

  await Promise.resolve();
  await Promise.resolve();

  expect(db.updateDoc).toHaveBeenCalledWith(
    undefined,
    { status: "cancelled" }
  );
});
test("alerts when cancelled order is cancelled again", async () => {
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

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
  await Promise.resolve();
  await Promise.resolve();

  document.querySelector('#order-table-body button[data-index="-1"]').click();

  expect(alertSpy).toHaveBeenCalledWith("Order is already cancelled");
});
test("alerts when order cannot be cancelled because it is in progress", async () => {
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

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
  await Promise.resolve();
  await Promise.resolve();

  document.querySelector('#order-table-body button[data-index="-1"]').click();

  expect(alertSpy).toHaveBeenCalledWith(
    "Order cannot be cancelled, it is already in progress."
  );
});
test("cancels order when status is lowercase pending", async () => {
  db.onAuthStateChanged.mockImplementation((_auth, cb) => {
    cb({ uid: "user-123" });
  });

  db.getDocs.mockResolvedValue(
    makeSnapshot([
      {
        id: "order-1",
        userId: "user-123",
        status: "pending",
        menuItems: [{ name: "Burger", price: 50 }]
      }
    ])
  );

  db.updateDoc.mockResolvedValue({});

  require("../scripts/checkOut.js");
  await Promise.resolve();
  await Promise.resolve();

  document.querySelector('#order-table-body button[data-index="-1"]').click();

  await Promise.resolve();

  expect(db.updateDoc).toHaveBeenCalled();
});
test("alerts when order status is capital Cancelled", async () => {
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

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
  await Promise.resolve();
  await Promise.resolve();

  document.querySelector('#order-table-body button[data-index="-1"]').click();

  expect(alertSpy).toHaveBeenCalledWith("Order is already cancelled");
});
test("handles updateDoc failure when cancelling order", async () => {
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
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
  await Promise.resolve();
  await Promise.resolve();

  document.querySelector('#order-table-body button[data-index="-1"]').click();

  await Promise.resolve();

  expect(errorSpy).toHaveBeenCalled();
  expect(alertSpy).toHaveBeenCalledWith("Failed to cancel order");
});
});