/**
 * @jest-environment jsdom
 */

jest.mock("../scripts/database.js", () => ({
  auth: {},
  db: {},
  doc: jest.fn(),
  getDoc: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(),
}));

const dbModule = require("../scripts/database.js");

const vendorDashboard = require("../scripts/vendor-dashboard.js");

const {
  calculateRevenue,
  initVendorDashboard,
  getStatusButtons,
  renderOrders,
  updateOrderStatus,
  fetchVendorOrders,
  attachOrderStatusListeners,
} = vendorDashboard;

describe("calculateRevenue", () => {
  test("sums order totals correctly", () => {
    const orders = [{ total: 100 }, { total: 50.5 }, { total: 25 }];
    expect(calculateRevenue(orders)).toBeCloseTo(175.5);
  });

  test("returns 0 for empty array", () => {
    expect(calculateRevenue([])).toBe(0);
  });

  test("defaults missing total to 0", () => {
    const orders = [{ total: 100 }, {}, { total: 50 }];
    expect(calculateRevenue(orders)).toBe(150);
  });

  test("handles single order", () => {
    expect(calculateRevenue([{ total: 42 }])).toBe(42);
  });

  test("handles all zero totals", () => {
    expect(calculateRevenue([{ total: 0 }, { total: 0 }])).toBe(0);
  });
});

describe("getStatusButtons", () => {
  test("renders only the next status button for pending orders", () => {
    const html = getStatusButtons({
      id: "order-1",
      status: "Pending",
    });

    expect(html).toContain("Preparing");
    expect(html).toContain('data-status="Preparing"');
    expect(html).toContain('data-order-id="order-1"');
    expect(html).not.toContain('data-status="Pending"');
    expect(html).not.toContain('data-status="Ready"');
  });

  test("renders ready as the next status for preparing orders", () => {
    const html = getStatusButtons({
      id: "order-2",
      status: "Preparing",
    });

    expect(html).toContain("Ready");
    expect(html).toContain('data-status="Ready"');
    expect(html).toContain('data-order-id="order-2"');
  });

  test("renders collected as the next status for ready orders", () => {
    const html = getStatusButtons({
      id: "order-3",
      status: "Ready",
    });

    expect(html).toContain("Collected");
    expect(html).toContain('data-status="Collected"');
    expect(html).toContain('data-order-id="order-3"');
  });

  test("defaults missing status to pending and shows preparing as next status", () => {
    const html = getStatusButtons({
      id: "order-4",
    });

    expect(html).toContain("Preparing");
    expect(html).toContain('data-status="Preparing"');
    expect(html).toContain('data-order-id="order-4"');
  });

  test("does not render a status button for collected orders", () => {
    const html = getStatusButtons({
      id: "order-5",
      status: "Collected",
    });

    expect(html).toContain(
      "This order has been collected and can no longer be updated."
    );
    expect(html).not.toContain("button");
    expect(html).not.toContain("data-status=");
  });
});

describe("renderOrders", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="orders-list"></section>
    `;
  });

  test("shows empty message when there are no current orders", () => {
    renderOrders([]);

    expect(document.getElementById("orders-list").innerHTML).toContain(
      "No current orders available."
    );
  });

  test("renders order details correctly", () => {
    renderOrders([
      {
        id: "Test order 1",
        status: "pending",
        total: 75,
      },
    ]);

    const html = document.getElementById("orders-list").innerHTML;

    expect(html).toContain("Order 1");
    expect(html).toContain("Status: Pending");
    expect(html).toContain("Total: R75");
    expect(html).toContain("Preparing");
  });

  test("renders multiple current orders correctly", () => {
    renderOrders([
      { id: "1", status: "pending", total: 10 },
      { id: "2", status: "ready", total: 20 },
    ]);

    const html = document.getElementById("orders-list").innerHTML;

    expect(html).toContain("Order 1");
    expect(html).toContain("Order 2");
    expect(html).toContain("Status: Pending");
    expect(html).toContain("Status: Ready");
  });

  test("does not render collected orders in current orders", () => {
    renderOrders([{ id: "1", status: "Collected", total: 10 }]);

    const html = document.getElementById("orders-list").innerHTML;

    expect(html).toContain("No current orders available.");
    expect(html).not.toContain("Order 1");
  });

  test("does nothing if orders-list element does not exist", () => {
    document.body.innerHTML = "";

    expect(() =>
      renderOrders([{ id: "x", status: "pending", total: 20 }])
    ).not.toThrow();
  });
});

describe("fetchVendorOrders", () => {
  test("fetches and maps vendor orders correctly", async () => {
    dbModule.collection.mockReturnValue("orders-ref");
    dbModule.where.mockReturnValue("where-clause");
    dbModule.query.mockReturnValue("orders-query");
    dbModule.getDocs.mockResolvedValue({
      docs: [
        {
          id: "order-1",
          data: () => ({ vendorId: "vendor-1", total: 50, status: "pending" }),
        },
        {
          id: "order-2",
          data: () => ({ vendorId: "vendor-1", total: 75, status: "ready" }),
        },
      ],
    });

    const result = await fetchVendorOrders("vendor-1");

    expect(dbModule.collection).toHaveBeenCalledWith(dbModule.db, "orders");
    expect(dbModule.where).toHaveBeenCalledWith("vendorId", "==", "vendor-1");
    expect(dbModule.query).toHaveBeenCalledWith("orders-ref", "where-clause");
    expect(dbModule.getDocs).toHaveBeenCalledWith("orders-query");

    expect(result).toEqual([
      { id: "order-1", vendorId: "vendor-1", total: 50, status: "pending" },
      { id: "order-2", vendorId: "vendor-1", total: 75, status: "ready" },
    ]);
  });

  test("sorts vendor orders by newest createdAt first", async () => {
    dbModule.collection.mockReturnValue("orders-ref");
    dbModule.where.mockReturnValue("where-clause");
    dbModule.query.mockReturnValue("orders-query");
    dbModule.getDocs.mockResolvedValue({
      docs: [
        {
          id: "old-order",
          data: () => ({
            vendorId: "vendor-1",
            total: 50,
            status: "pending",
            createdAt: { seconds: 10 },
          }),
        },
        {
          id: "new-order",
          data: () => ({
            vendorId: "vendor-1",
            total: 75,
            status: "ready",
            createdAt: { seconds: 20 },
          }),
        },
      ],
    });

    const result = await fetchVendorOrders("vendor-1");

    expect(result[0].id).toBe("new-order");
    expect(result[1].id).toBe("old-order");
  });
});

describe("updateOrderStatus", () => {
  test("updates Firestore order status", async () => {
    dbModule.doc.mockReturnValue("order-ref");
    dbModule.updateDoc.mockResolvedValue();

    await updateOrderStatus("order-1", "Preparing");

    expect(dbModule.doc).toHaveBeenCalledWith(
      dbModule.db,
      "orders",
      "order-1"
    );
    expect(dbModule.updateDoc).toHaveBeenCalledWith("order-ref", {
      status: "Preparing",
    });
  });
});

describe("attachOrderStatusListeners", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <section id="orders-list"></section>
    `;
  });

  test("returns if orders-list does not exist", () => {
    document.body.innerHTML = "";

    expect(() => attachOrderStatusListeners()).not.toThrow();
  });

  test("attaches listener only once", () => {
    attachOrderStatusListeners();
    attachOrderStatusListeners();

    const ordersList = document.getElementById("orders-list");
    expect(ordersList.dataset.listenerAttached).toBe("true");
  });

  test("ignores clicks that are not on buttons", async () => {
    const ordersList = document.getElementById("orders-list");
    ordersList.innerHTML = `<article><p>No button here</p></article>`;

    attachOrderStatusListeners();

    ordersList.querySelector("p").click();

    expect(dbModule.updateDoc).not.toHaveBeenCalled();
  });

  test("ignores button clicks with missing data attributes", async () => {
    const ordersList = document.getElementById("orders-list");
    ordersList.innerHTML = `<button type="button">Broken button</button>`;

    attachOrderStatusListeners();

    ordersList.querySelector("button").click();
    await Promise.resolve();

    expect(dbModule.updateDoc).not.toHaveBeenCalled();
  });

  test("updates firestore and ui when a valid status button is clicked", async () => {
    dbModule.doc.mockReturnValue("order-ref");
    dbModule.updateDoc.mockResolvedValue();

    renderOrders([{ id: "order-1", status: "pending", total: 75 }]);

    attachOrderStatusListeners();

    const button = document.querySelector(
      '[data-order-id="order-1"][data-status="Preparing"]'
    );
    button.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(dbModule.doc).toHaveBeenCalledWith(
      dbModule.db,
      "orders",
      "order-1"
    );
    expect(dbModule.updateDoc).toHaveBeenCalledWith("order-ref", {
      status: "Preparing",
    });

    const html = document.getElementById("orders-list").innerHTML;
    expect(html).toContain("Status: Preparing");
    expect(html).toContain("Ready");
  });

  test("removes order from current orders when marked as collected", async () => {
    dbModule.doc.mockReturnValue("order-ref");
    dbModule.updateDoc.mockResolvedValue();

    renderOrders([{ id: "order-1", status: "Ready", total: 75 }]);

    attachOrderStatusListeners();

    const button = document.querySelector(
      '[data-order-id="order-1"][data-status="Collected"]'
    );
    button.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(dbModule.updateDoc).toHaveBeenCalledWith("order-ref", {
      status: "Collected",
    });
    expect(document.getElementById("orders-list").innerHTML).toContain(
      "No current orders available."
    );
  });

  test("decrements ready count and increments collected count when marking order as collected", async () => {
    dbModule.doc.mockReturnValue("order-ref");
    dbModule.updateDoc.mockResolvedValue();

    document.body.innerHTML = `
      <section id="orders-list"></section>
      <span id="pending-count">0</span>
      <span id="preparing-count">0</span>
      <span id="ready-count">1</span>
      <span id="collected-count">0</span>
    `;

    renderOrders([{ id: "order-1", status: "Ready", total: 75 }]);

    attachOrderStatusListeners();

    const button = document.querySelector(
      '[data-order-id="order-1"][data-status="Collected"]'
    );
    button.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById("ready-count").textContent).toBe("0");
    expect(document.getElementById("collected-count").textContent).toBe("1");
  });

  test("does not crash if updated order article is missing", async () => {
    dbModule.doc.mockReturnValue("order-ref");
    dbModule.updateDoc.mockResolvedValue();

    const ordersList = document.getElementById("orders-list");
    ordersList.innerHTML = `
      <button data-order-id="order-1" data-status="Preparing">Preparing</button>
    `;

    attachOrderStatusListeners();

    ordersList.querySelector("button").click();

    await Promise.resolve();
    await Promise.resolve();

    expect(dbModule.updateDoc).toHaveBeenCalled();
  });
});

describe("initVendorDashboard", () => {
  let mockLocation;
  let mockAlert;

  beforeEach(() => {
    mockLocation = { href: "" };
    mockAlert = jest.fn();

    jest.clearAllMocks();

    document.body.innerHTML = `
      <button id="logoutBtn"></button>
      <section id="loading-state" class="hidden"></section>
      <section id="empty-state" class="hidden"></section>
      <section id="menu-table-wrapper" class="hidden"></section>
      <tbody id="menu-table-body"></tbody>
      <section id="item-edit-modal" class="hidden"></section>
      <section id="delete-modal" class="hidden"></section>
      <button id="confirm-delete-btn"></button>
      <form id="item-form"></form>
      <input id="edit-item-id" value="" />
      <input id="item-name" value="" />
      <textarea id="item-description"></textarea>
      <input id="item-price" value="" />
      <select id="item-category"><option value="Mains">Mains</option></select>
      <input type="checkbox" id="item-available" />
      <span id="modal-title"></span>
      <span id="form-error" class="hidden"></span>
      <span id="save-btn-text">Save Item</span>
      <button id="save-btn"></button>
      <section id="save-spinner" class="hidden"></section>
      <section id="orders-list"></section>
    `;
  });

  test("redirects to login if no user", async () => {
    dbModule.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
    });

    initVendorDashboard(mockLocation, mockAlert);

    expect(mockLocation.href).toBe("login.html");
  });

  test("redirects if user doc does not exist", async () => {
    dbModule.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "123" });
    });

    dbModule.getDoc.mockResolvedValue({
      exists: () => false,
    });

    initVendorDashboard(mockLocation, mockAlert);
    await Promise.resolve();

    expect(mockLocation.href).toBe("login.html");
  });

  test("redirects if not vendor", async () => {
    dbModule.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "123" });
    });

    dbModule.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "customer" }),
    });

    initVendorDashboard(mockLocation, mockAlert);
    await Promise.resolve();

    expect(mockLocation.href).toBe("index.html");
  });

  test("redirects pending vendor", async () => {
    dbModule.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "123" });
    });

    dbModule.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "vendor", status: "pending" }),
    });

    dbModule.getDocs.mockResolvedValue({ docs: [] });

    initVendorDashboard(mockLocation, mockAlert);
    await Promise.resolve();

    expect(mockLocation.href).toBe("pending-approval.html");
  });

  test("handles suspended vendor", async () => {
    dbModule.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "123" });
    });

    dbModule.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "vendor", status: "suspended" }),
    });

    initVendorDashboard(mockLocation, mockAlert);
    await Promise.resolve();

    expect(mockAlert).toHaveBeenCalledWith("Your account is suspended");
    expect(mockLocation.href).toBe("login.html");
  });

  test("allows approved vendor and renders orders", async () => {
    console.log = jest.fn();

    dbModule.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "123" });
    });

    dbModule.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "vendor", status: "approved" }),
    });

    dbModule.getDocs.mockResolvedValue({
      docs: [
        {
          id: "order-1",
          data: () => ({ vendorId: "123", total: 60, status: "pending" }),
        },
      ],
    });

    initVendorDashboard(mockLocation, mockAlert);

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById("orders-list").innerHTML).toContain(
      "Order 1"
    );
    expect(document.getElementById("orders-list").innerHTML).toContain(
      "Status: Pending"
    );
  });
});

describe("formatStatus and dashboard counts coverage", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="orders-list"></section>
      <span id="pending-count"></span>
      <span id="preparing-count"></span>
      <span id="ready-count"></span>
      <span id="collected-count"></span>
    `;
  });

  test("defaults unknown status to Pending", () => {
    renderOrders([{ id: "order-1", status: "unknown-status", total: 20 }]);

    const html = document.getElementById("orders-list").innerHTML;

    expect(html).toContain("Status: Pending");
    expect(html).toContain("Preparing");
  });

  test("updates dashboard status counts when rendering orders", () => {
    renderOrders([
      { id: "order-1", status: "Pending", total: 10 },
      { id: "order-2", status: "Preparing", total: 20 },
      { id: "order-3", status: "Ready", total: 30 },
      { id: "order-4", status: "Collected", total: 40 },
    ]);

    expect(document.getElementById("pending-count").textContent).toBe("1");
    expect(document.getElementById("preparing-count").textContent).toBe("1");
    expect(document.getElementById("ready-count").textContent).toBe("1");
    expect(document.getElementById("collected-count").textContent).toBe("1");
  });

  test("does not update counts when count elements are missing", () => {
    document.body.innerHTML = `
      <section id="orders-list"></section>
    `;

    expect(() => {
      renderOrders([{ id: "order-1", status: "Pending", total: 10 }]);
    }).not.toThrow();

    expect(document.getElementById("orders-list").innerHTML).toContain(
      "Order 1"
    );
  });
});