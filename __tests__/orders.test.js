/**
 * @jest-environment jsdom
 */

global.lucide = { createIcons: jest.fn() };

jest.mock("../scripts/database.js", () => ({
  db: {},
  auth: {},
  getDoc: jest.fn(),
  collection: jest.fn((_db, name) => name),
  doc: jest.fn((...args) => args),
  where: jest.fn(),
  query: jest.fn(),
  onAuthStateChanged: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
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

    const freshBody = document.createElement("body");
    document.documentElement.replaceChild(freshBody, document.body);

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

    const fakeDate = new Date("2026-05-08T10:00:00");

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
              createdAt: { seconds: 1, toDate: () => fakeDate },
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

    expect(html).toContain("Order #001");
    expect(html).toContain("Alice Smith");
    expect(html).toContain("Burger");
    expect(html).toContain("x2");
    expect(html).toContain("Pending");
  });

  test("renders Preparing orders into preparingOrders and Ready orders into readyOrders", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "vendor-1" }));

    const fakeDate = new Date("2026-05-08T10:00:00");

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
              createdAt: { seconds: 1, toDate: () => fakeDate },
              menuItems: [{ name: "Pizza", quantity: 1 }]
            })
          },
          {
            id: "order-2",
            data: () => ({
              vendorId: "vendor-1",
              userId: "customer-2",
              status: "Ready",
              createdAt: { seconds: 2, toDate: () => fakeDate },
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

    expect(preparingHtml).toContain("Order #001");
    expect(preparingHtml).toContain("Bob Jones");
    expect(preparingHtml).toContain("Preparing");
    expect(preparingHtml).toContain("Pizza");

    expect(readyHtml).toContain("Order #002");
    expect(readyHtml).toContain("Cara Lee");
    expect(readyHtml).toContain("Ready");
    expect(readyHtml).toContain("Juice");
  });

  test("renders collected orders into completedOrders", async () => {
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "vendor-1" }));

    const fakeDate = new Date("2026-05-08T10:00:00");

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
              createdAt: { seconds: 1, toDate: () => fakeDate },
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

    expect(html).toContain("Order #001");
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

    const fakeDate = new Date("2026-05-08T10:00:00");

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
            id: "order-abc123",
            data: () => ({
              vendorId: "vendor-1",
              userId: "customer-1",
              status: "Pending",
              createdAt: { seconds: 1, toDate: () => fakeDate },
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

    const html = document.getElementById("newOrders").innerHTML;

    expect(html).toContain("Unknown Customer");
    expect(html).toContain("Order #001");
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
              createdAt: { seconds: 1, toDate: () => fakeDate },
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

    const html = buildOrderHTML({
      id: "order-1",
      status: "Collected",
      customerName: "Test Customer",
      dailyOrderNumber: "006",
      menuItems: [{ name: "Burger", quantity: 1 }]
    });

    expect(html).toContain("Order #006");
    expect(html).toContain('draggable="false"');
    expect(html).toContain('data-order-status="Collected"');
  });

  test("daily order numbers stay stable across different statuses", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { buildOrderHTML } = require("../scripts/orders.js");

    const pendingHtml = buildOrderHTML({
      id: "abc123xyz",
      status: "Pending",
      dailyOrderNumber: "003",
      customerName: "Test Customer",
      menuItems: []
    });

    const readyHtml = buildOrderHTML({
      id: "abc123xyz",
      status: "Ready",
      dailyOrderNumber: "003",
      customerName: "Test Customer",
      menuItems: []
    });

    expect(pendingHtml).toContain("Order #003");
    expect(readyHtml).toContain("Order #003");
    expect(pendingHtml).not.toContain("Order 1");
    expect(readyHtml).not.toContain("Order 1");
  });

  test("adds daily order numbers by date in oldest first order", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { addDailyOrderNumbers } = require("../scripts/orders.js");

    const dayOne = new Date("2026-05-08T09:00:00");
    const dayTwo = new Date("2026-05-09T09:00:00");

    const numberedOrders = addDailyOrderNumbers([
      {
        id: "order-1",
        createdAt: { toDate: () => dayOne }
      },
      {
        id: "order-2",
        createdAt: { toDate: () => dayOne }
      },
      {
        id: "order-3",
        createdAt: { toDate: () => dayTwo }
      }
    ]);

    expect(numberedOrders[0].dailyOrderNumber).toBe("001");
    expect(numberedOrders[1].dailyOrderNumber).toBe("002");
    expect(numberedOrders[2].dailyOrderNumber).toBe("001");
  });

  test("formats daily order numbers with three digits", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { formatDailyOrderNumber } = require("../scripts/orders.js");

    expect(formatDailyOrderNumber(1)).toBe("001");
    expect(formatDailyOrderNumber(12)).toBe("012");
    expect(formatDailyOrderNumber(123)).toBe("123");
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
        Order #001
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

  test("buildOrderHTML renders Card badge for non-cash orders", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { buildOrderHTML } = require("../scripts/orders.js");

    const html = buildOrderHTML(
      {
        id: "order-1",
        status: "Pending",
        paymentMethod: "card",
        paymentStatus: "paid",
        customerName: "Card Customer",
        menuItems: [{ name: "Burger", quantity: 1 }]
      },
      0
    );

    expect(html).toContain("Card");
    expect(html).not.toContain("Mark as Paid");
    expect(html).not.toContain("Awaiting cash payment");
    expect(html).toContain('data-payment-method="card"');
  });

  test("buildOrderHTML renders unpaid cash banner and Mark as Paid button", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { buildOrderHTML } = require("../scripts/orders.js");

    const html = buildOrderHTML(
      {
        id: "order-2",
        status: "Pending",
        paymentMethod: "cash",
        paymentStatus: "unpaid",
        total: 42.5,
        customerName: "Cash Customer",
        menuItems: [{ name: "Wrap", quantity: 1 }]
      },
      0
    );

    expect(html).toContain("Cash • Unpaid");
    expect(html).toContain("Awaiting cash payment");
    expect(html).toContain("R42.50");
    expect(html).toContain("mark-paid-btn");
    expect(html).toContain('data-mark-paid-id="order-2"');
    expect(html).toContain('data-payment-method="cash"');
    expect(html).toContain('data-payment-status="unpaid"');
  });

  test("buildOrderHTML renders paid cash badge without Mark as Paid button", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { buildOrderHTML } = require("../scripts/orders.js");

    const html = buildOrderHTML(
      {
        id: "order-3",
        status: "Ready",
        paymentMethod: "cash",
        paymentStatus: "paid",
        total: 30,
        customerName: "Cash Paid",
        menuItems: [{ name: "Juice", quantity: 1 }]
      },
      0
    );

    expect(html).toContain("Cash • Paid");
    expect(html).not.toContain("Mark as Paid");
    expect(html).not.toContain("Awaiting cash payment");
  });

  test("markCashOrderAsPaid updates order and writes cash ledger credit", async () => {
    db.updateDoc.mockResolvedValue({});
    db.addDoc.mockResolvedValue({ id: "ledger-1" });

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { markCashOrderAsPaid } = require("../scripts/orders.js");

    await markCashOrderAsPaid({
      id: "order-9",
      vendorId: "vendor-1",
      vendorName: "Shop1",
      total: 75
    });

    expect(db.updateDoc).toHaveBeenCalledWith(
      [{}, "orders", "order-9"],
      expect.objectContaining({
        paymentStatus: "paid",
        paidAt: "mock-timestamp",
        updatedAt: "mock-timestamp"
      })
    );

    expect(db.addDoc).toHaveBeenCalledWith(
      "wallet_ledger",
      expect.objectContaining({
        type: "credit",
        source: "cash",
        vendorId: "vendor-1",
        vendorName: "Shop1",
        orderId: "order-9",
        amount: 75,
        status: "settled"
      })
    );
  });

  test("drag-drop blocks unpaid cash orders from being marked Collected", async () => {
    db.updateDoc.mockResolvedValue({});
    window.alert = jest.fn();

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
          if (key === "orderId") return "order-cash-1";
          if (key === "orderStatus") return "Ready";
          if (key === "paymentMethod") return "cash";
          if (key === "paymentStatus") return "unpaid";
          return "";
        })
      }
    });

    completedColumn.dispatchEvent(dropEvent);

    await flush();

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("Mark this cash order as paid")
    );
    expect(db.updateDoc).not.toHaveBeenCalled();
  });

  test("drag-drop allows paid cash orders to be marked Collected", async () => {
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
          if (key === "orderId") return "order-cash-2";
          if (key === "orderStatus") return "Ready";
          if (key === "paymentMethod") return "cash";
          if (key === "paymentStatus") return "paid";
          return "";
        })
      }
    });

    completedColumn.dispatchEvent(dropEvent);

    await flush();

    expect(db.updateDoc).toHaveBeenCalledWith(
      [{}, "orders", "order-cash-2"],
      expect.objectContaining({ status: "Collected" })
    );
  });

  test("dragstart on non-draggable card does not populate dataTransfer", () => {
    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { attachDragAndDropListeners } = require("../scripts/orders.js");

    document.getElementById("completedOrders").innerHTML = `
      <article
        draggable="false"
        data-order-id="order-c"
        data-order-status="Collected"
        data-payment-method="card"
        data-payment-status="paid"
      >Collected card</article>
    `;

    attachDragAndDropListeners();

    const card = document.querySelector("article[data-order-id='order-c']");
    const setData = jest.fn();

    const dragStartEvent = new Event("dragstart", { bubbles: true });
    Object.defineProperty(dragStartEvent, "dataTransfer", {
      value: { setData, getData: jest.fn() }
    });

    card.dispatchEvent(dragStartEvent);

    expect(setData).not.toHaveBeenCalled();
  });

  test("mark-paid button click loads order and marks it paid", async () => {
    db.updateDoc.mockResolvedValue({});
    db.addDoc.mockResolvedValue({ id: "ledger-1" });
    db.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        vendorId: "vendor-1",
        vendorName: "Shop1",
        total: 50
      })
    });

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const btn = document.createElement("button");
    btn.className = "mark-paid-btn";
    btn.dataset.markPaidId = "order-mp-1";
    document.body.appendChild(btn);

    btn.click();

    await flush();
    await flush();

    expect(db.getDoc).toHaveBeenCalled();
    expect(db.updateDoc).toHaveBeenCalledWith(
      [{}, "orders", "order-mp-1"],
      expect.objectContaining({ paymentStatus: "paid" })
    );
    expect(db.addDoc).toHaveBeenCalledWith(
      "wallet_ledger",
      expect.objectContaining({ source: "cash", orderId: "order-mp-1", amount: 50 })
    );
  });

  test("mark-paid button alerts when order no longer exists", async () => {
    db.getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
    window.alert = jest.fn();

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const btn = document.createElement("button");
    btn.className = "mark-paid-btn";
    btn.dataset.markPaidId = "missing-order";
    document.body.appendChild(btn);

    btn.click();

    await flush();
    await flush();

    expect(window.alert).toHaveBeenCalledWith("Order no longer exists.");
    expect(db.updateDoc).not.toHaveBeenCalled();
  });

  test("mark-paid button re-enables itself when the update fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    db.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ vendorId: "v", vendorName: "V", total: 10 })
    });
    db.updateDoc.mockRejectedValue(new Error("boom"));
    window.alert = jest.fn();

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const btn = document.createElement("button");
    btn.className = "mark-paid-btn";
    btn.dataset.markPaidId = "order-fail";
    document.body.appendChild(btn);

    btn.click();

    await flush();
    await flush();

    expect(errorSpy).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("Failed to mark order as paid.");
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe("Mark as Paid");

    errorSpy.mockRestore();
  });

  test("enrichOrdersWithCustomerNames falls back when getDoc rejects", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    db.getDoc.mockRejectedValue(new Error("network down"));

    jest.isolateModules(() => {
      require("../scripts/orders.js");
    });

    const { enrichOrdersWithCustomerNames } = require("../scripts/orders.js");

    const enriched = await enrichOrdersWithCustomerNames([
      { id: "o-1", userId: "u-1", status: "Pending" }
    ]);

    expect(enriched[0].customerName).toBe("Unknown Customer");
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  test("checks whether an order is from today", () => {
  jest.isolateModules(() => {
    require("../scripts/orders.js");
  });

  const { isOrderFromToday } = require("../scripts/orders.js");

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  expect(
    isOrderFromToday({
      createdAt: {
        toDate: () => today
      }
    })
  ).toBe(true);

  expect(
    isOrderFromToday({
      createdAt: {
        toDate: () => yesterday
      }
    })
  ).toBe(false);

  expect(isOrderFromToday({})).toBe(false);
});

test("formats missing timestamps and unknown date keys", () => {
  jest.isolateModules(() => {
    require("../scripts/orders.js");
  });

  const { formatTimestamp, getDateKey } = require("../scripts/orders.js");

  expect(formatTimestamp(null)).toBe("Not available");
  expect(formatTimestamp({})).toBe("Not available");

  expect(getDateKey(null)).toBe("unknown-date");
  expect(getDateKey({})).toBe("unknown-date");
});

test("returns ISO date key when timestamp is valid", () => {
  jest.isolateModules(() => {
    require("../scripts/orders.js");
  });

  const { getDateKey } = require("../scripts/orders.js");

  expect(
    getDateKey({
      toDate: () => new Date("2026-05-08T10:00:00.000Z")
    })
  ).toBe("2026-05-08");
});

test("mark-paid click does nothing when button has no order id", async () => {
  jest.isolateModules(() => {
    require("../scripts/orders.js");
  });

  const btn = document.createElement("button");
  btn.className = "mark-paid-btn";
  document.body.appendChild(btn);

  btn.click();

  await flush();

  expect(db.getDoc).not.toHaveBeenCalled();
  expect(db.updateDoc).not.toHaveBeenCalled();
  expect(db.addDoc).not.toHaveBeenCalled();
});
});