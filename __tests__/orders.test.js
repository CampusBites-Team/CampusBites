/**
 * @jest-environment jsdom
 */

global.lucide = { createIcons: jest.fn() };

jest.mock("../scripts/database.js", () => ({
  db: {},
  auth: {},
  getDoc: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn((...args) => args),
  where: jest.fn(),
  query: jest.fn(),
  onAuthStateChanged: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-timestamp")
}));

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("orders.js", () => {
  let db;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    document.body.innerHTML = `
      <section id="newOrders"></section>
      <section id="preparingOrders"></section>
      <section id="readyOrders"></section>
      <section id="completedOrders"></section>
    `;

    global.lucide = { createIcons: jest.fn() };
    db = require("../scripts/database.js");
  });

  test("does nothing when no user is logged in", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    await flush();

    expect(db.getDoc).not.toHaveBeenCalled();
    expect(db.onSnapshot).not.toHaveBeenCalled();
  });

  test("does not start listener when vendor profile does not exist", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "vendor-1" }));

    db.getDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({})
    });

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    await flush();

    expect(db.getDoc).toHaveBeenCalledTimes(1);
    expect(db.onSnapshot).not.toHaveBeenCalled();
  });

  test("renders pending orders into newOrders with customer names", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "vendor-1" }));

    db.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: "vendor", status: "approved" })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ fullName: "Alice Smith" })
      });

    db.onSnapshot.mockImplementation((_q, cb) => {
      cb({
        docs: [
          {
            id: "order-1",
            data: () => ({
              vendorId: "vendor-1",
              userId: "customer-1",
              status: "Pending",
              menuItems: [{ name: "Burger", quantity: 2 }]
            })
          }
        ]
      });
      return jest.fn();
    });

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    await flush();

    const html = document.getElementById("newOrders").innerHTML;

    expect(html).toContain("Order 1");
    expect(html).toContain("Alice Smith");
    expect(html).toContain("Burger");
    expect(html).toContain("x2");
    expect(html).toContain("Pending");
  });

  test("renders Preparing orders into preparingOrders and Ready orders into readyOrders", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "vendor-1" }));

    db.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: "vendor", status: "approved" })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ fullName: "Bob Jones" })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ fullName: "Cara Lee" })
      });

    db.onSnapshot.mockImplementation((_q, cb) => {
      cb({
        docs: [
          {
            id: "order-1",
            data: () => ({
              vendorId: "vendor-1",
              userId: "customer-1",
              status: "Preparing",
              menuItems: [{ name: "Pizza", quantity: 1 }]
            })
          },
          {
            id: "order-2",
            data: () => ({
              vendorId: "vendor-1",
              userId: "customer-2",
              status: "Ready",
              menuItems: [{ name: "Juice", quantity: 1 }]
            })
          }
        ]
      });
      return jest.fn();
    });

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    await flush();

    const preparingHtml = document.getElementById("preparingOrders").innerHTML;
    const readyHtml = document.getElementById("readyOrders").innerHTML;

    expect(preparingHtml).toContain("Bob Jones");
    expect(preparingHtml).toContain("Preparing");
    expect(preparingHtml).toContain("Pizza");

    expect(readyHtml).toContain("Cara Lee");
    expect(readyHtml).toContain("Ready");
    expect(readyHtml).toContain("Juice");
  });

  test("renders collected orders into completedOrders", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "vendor-1" }));

    db.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: "vendor", status: "approved" })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ fullName: "David King" })
      });

    db.onSnapshot.mockImplementation((_q, cb) => {
      cb({
        docs: [
          {
            id: "order-1",
            data: () => ({
              vendorId: "vendor-1",
              userId: "customer-1",
              status: "Collected",
              menuItems: [{ name: "Wrap", quantity: 1 }]
            })
          }
        ]
      });
      return jest.fn();
    });

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    await flush();

    const html = document.getElementById("completedOrders").innerHTML;

    expect(html).toContain("David King");
    expect(html).toContain("Collected");
    expect(html).toContain("Wrap");
  });

  test("shows fallback text when there are no orders", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "vendor-1" }));

    db.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "vendor", status: "approved" })
    });

    db.onSnapshot.mockImplementation((_q, cb) => {
      cb({ docs: [] });
      return jest.fn();
    });

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    await flush();

    expect(document.getElementById("newOrders").innerHTML).toContain("No pending orders.");
    expect(document.getElementById("preparingOrders").innerHTML).toContain("No preparing orders.");
    expect(document.getElementById("readyOrders").innerHTML).toContain("No ready orders.");
    expect(document.getElementById("completedOrders").innerHTML).toContain("No collected orders.");
  });

  test("falls back to Unknown Customer when customer doc does not exist", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "vendor-1" }));

    db.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: "vendor", status: "approved" })
      })
      .mockResolvedValueOnce({
        exists: () => false,
        data: () => ({})
      });

    db.onSnapshot.mockImplementation((_q, cb) => {
      cb({
        docs: [
          {
            id: "order-1",
            data: () => ({
              vendorId: "vendor-1",
              userId: "customer-1",
              status: "Pending",
              menuItems: [{ name: "Burger" }]
            })
          }
        ]
      });
      return jest.fn();
    });

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    await flush();

    expect(document.getElementById("newOrders").innerHTML).toContain("Unknown Customer");
  });

  test("formats created and updated timestamps in vendor orders", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "vendor-1" }));

    const fakeDate = new Date("2026-05-08T10:30:00");

    db.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: "vendor", status: "approved" })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ fullName: "Test Customer" })
      });

    db.onSnapshot.mockImplementation((_q, cb) => {
      cb({
        docs: [
          {
            id: "order-1",
            data: () => ({
              vendorId: "vendor-1",
              userId: "customer-1",
              status: "Pending",
              createdAt: { toDate: () => fakeDate },
              updatedAt: { toDate: () => fakeDate },
              menuItems: [{ name: "Burger", quantity: 1 }]
            })
          }
        ]
      });
      return jest.fn();
    });

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    await flush();

    expect(document.body.innerHTML).toContain("Placed:");
    expect(document.body.innerHTML).toContain("Updated:");
    expect(document.body.innerHTML).not.toContain("Not available");
  });

  test("allows pending orders to move only to preparing through drag and drop", async () => {
    db.updateDoc.mockResolvedValue({});

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    await flush();

    const { getNextDropStatus, updateOrderStatus } = require("../scripts/orders.js");

    expect(getNextDropStatus("Pending", "preparingOrders")).toBe("Preparing");
    expect(getNextDropStatus("Pending", "readyOrders")).toBe(null);
    expect(getNextDropStatus("Pending", "completedOrders")).toBe(null);

    await updateOrderStatus("order-1", "Preparing");

    expect(db.updateDoc).toHaveBeenCalledWith(
  [{}, "orders", "order-1"],
  {
    status: "Preparing",
    updatedAt: "mock-timestamp"
  }
);
  });

  test("allows preparing orders to move only to ready", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { getNextDropStatus } = require("../scripts/orders.js");

    expect(getNextDropStatus("Preparing", "readyOrders")).toBe("Ready");
    expect(getNextDropStatus("Preparing", "newOrders")).toBe(null);
    expect(getNextDropStatus("Preparing", "completedOrders")).toBe(null);
  });

  test("allows ready orders to move only to collected", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { getNextDropStatus } = require("../scripts/orders.js");

    expect(getNextDropStatus("Ready", "completedOrders")).toBe("Collected");
    expect(getNextDropStatus("Ready", "newOrders")).toBe(null);
    expect(getNextDropStatus("Ready", "preparingOrders")).toBe(null);
  });

  test("does not allow collected orders to move backwards", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { getNextDropStatus } = require("../scripts/orders.js");

    expect(getNextDropStatus("Collected", "newOrders")).toBe(null);
    expect(getNextDropStatus("Collected", "preparingOrders")).toBe(null);
    expect(getNextDropStatus("Collected", "readyOrders")).toBe(null);
  });

    test("formats unknown statuses as Pending", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { formatStatus } = require("../scripts/orders.js");

    expect(formatStatus(undefined)).toBe("Pending");
    expect(formatStatus("")).toBe("Pending");
    expect(formatStatus("something weird")).toBe("Pending");
  });

  test("renders collected orders as not draggable", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { buildOrderHTML } = require("../scripts/orders.js");

    const html = buildOrderHTML(
      {
        id: "order-1",
        status: "Collected",
        customerName: "Test Customer",
        menuItems: [{ name: "Burger", quantity: 1 }]
      },
      0
    );

    expect(html).toContain('draggable="false"');
    expect(html).toContain('data-order-status="Collected"');
  });

  test("attaches drag listeners only once", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { attachDragAndDropListeners } = require("../scripts/orders.js");

    attachDragAndDropListeners();
    attachDragAndDropListeners();

    expect(document.getElementById("newOrders").dataset.dragListenerAttached).toBe("true");
    expect(document.getElementById("preparingOrders").dataset.dragListenerAttached).toBe("true");
    expect(document.getElementById("readyOrders").dataset.dragListenerAttached).toBe("true");
    expect(document.getElementById("completedOrders").dataset.dragListenerAttached).toBe("true");
  });

  test("drag and drop updates order status when drop is valid", async () => {
    db.updateDoc.mockResolvedValue({});

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { attachDragAndDropListeners } = require("../scripts/orders.js");

    document.getElementById("newOrders").innerHTML = `
      <article
        draggable="true"
        data-order-id="order-1"
        data-order-status="Pending"
      >
        Order 1
      </article>
    `;

    attachDragAndDropListeners();

    const card = document.querySelector("article[data-order-id]");
    const preparingColumn = document.getElementById("preparingOrders");

    const dataStore = {};

    const dragStartEvent = new Event("dragstart", { bubbles: true });
    Object.defineProperty(dragStartEvent, "dataTransfer", {
      value: {
        setData: jest.fn((key, value) => {
          dataStore[key] = value;
        }),
        getData: jest.fn((key) => dataStore[key])
      }
    });

    card.dispatchEvent(dragStartEvent);

    const dropEvent = new Event("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: jest.fn((key) => dataStore[key])
      }
    });

    preparingColumn.dispatchEvent(dropEvent);

    await flush();

    expect(db.updateDoc).toHaveBeenCalledWith(
      [{}, "orders", "order-1"],
      {
        status: "Preparing",
        updatedAt: "mock-timestamp"
      }
    );
  });

  test("drag and drop does not update order status when drop is invalid", async () => {
    db.updateDoc.mockResolvedValue({});

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { attachDragAndDropListeners } = require("../scripts/orders.js");

    attachDragAndDropListeners();

    const completedColumn = document.getElementById("completedOrders");

    const dropEvent = new Event("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: jest.fn((key) => {
          if (key === "orderId") return "order-1";
          if (key === "orderStatus") return "Pending";
          return "";
        })
      }
    });

    completedColumn.dispatchEvent(dropEvent);

    await flush();

    expect(db.updateDoc).not.toHaveBeenCalled();
  });
});