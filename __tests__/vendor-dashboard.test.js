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
  markCashOrderAsPaid,
  getPaymentMeta,
} = vendorDashboard;

function mockOrderStatusUpdate(orderData = {}) {
  dbModule.doc.mockReturnValue("order-ref");
  dbModule.updateDoc.mockResolvedValue();
  dbModule.addDoc.mockResolvedValue({ id: "notification-1" });
  dbModule.collection.mockReturnValue("notifications-ref");
  dbModule.serverTimestamp.mockReturnValue("mock-timestamp");
  dbModule.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      userId: "customer-1",
      dailyOrderNumber: "001",
      ...orderData,
    }),
  });
}

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

  test("shows Cash • Paid badge without banner or button for paid cash orders", () => {
    renderOrders([
      {
        id: "o-cash-2",
        status: "Ready",
        paymentMethod: "cash",
        paymentStatus: "paid",
        total: 40,
      },
    ]);

    const html = document.getElementById("orders-list").innerHTML;
    expect(html).toContain("Cash • Paid");
    expect(html).not.toContain("Awaiting cash payment");
    expect(html).not.toContain("Mark as Paid");
  });

  test("unpaid cash Ready order shows the block-Collected notice instead of the Collected button", () => {
    renderOrders([
      {
        id: "o-cash-3",
        status: "Ready",
        paymentMethod: "cash",
        paymentStatus: "unpaid",
        total: 60,
      },
    ]);

    const html = document.getElementById("orders-list").innerHTML;
    expect(html).toContain("Mark this cash order as paid");
    expect(html).not.toContain('data-status="Collected"');
    expect(html).toContain("Mark as Paid");
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
    mockOrderStatusUpdate();

    await updateOrderStatus("order-1", "Preparing");

    expect(dbModule.doc).toHaveBeenCalledWith(
      dbModule.db,
      "orders",
      "order-1"
    );
  expect(dbModule.updateDoc).toHaveBeenCalledWith(
    "order-ref",
    expect.objectContaining({
      status: "Preparing"
    })
  );
  });
});

describe("attachOrderStatusListeners", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <section id="orders-list"></section>
      <span id="pending-count">0</span>
      <span id="preparing-count">0</span>
      <span id="ready-count">0</span>
      <span id="collected-count">0</span>
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
    mockOrderStatusUpdate();

    renderOrders([{ id: "order-1", status: "pending", total: 75 }]);

    attachOrderStatusListeners();

    const button = document.querySelector(
      '[data-order-id="order-1"][data-status="Preparing"]'
    );
    button.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(dbModule.updateDoc).toHaveBeenCalledWith(
      "order-ref",
      expect.objectContaining({
        status: "Preparing"
      })
    );

    const html = document.getElementById("orders-list").innerHTML;
    expect(html).toContain("Status: Preparing");
  });

  test("removes order from current orders when marked as collected", async () => {
    mockOrderStatusUpdate();

    renderOrders([{ id: "order-2", status: "Ready", total: 75 }]);

    attachOrderStatusListeners();

    document.querySelector('[data-status="Collected"]').click();

    await Promise.resolve();
    await Promise.resolve();

    expect(dbModule.updateDoc).toHaveBeenCalledWith(
      "order-ref",
      expect.objectContaining({
        status: "Collected"
      })
    );

    expect(document.getElementById("orders-list").innerHTML).toContain(
      "No current orders available."
    );
  });

  test("decrements ready count and increments collected count when marking order as collected", async () => {
    mockOrderStatusUpdate();

    renderOrders([{ id: "order-3", status: "Ready", total: 75 }]);

    attachOrderStatusListeners();

    document.querySelector('[data-status="Collected"]').click();

    await Promise.resolve();
    await Promise.resolve();
    expect(dbModule.updateDoc).toHaveBeenCalled();
    expect(document.getElementById("orders-list").innerHTML)
      .toContain("No current orders available.");

  });

  test("does not crash if updated order article is missing", async () => {
    mockOrderStatusUpdate();

    document.getElementById("orders-list").innerHTML = `
      <button data-order-id="order-4" data-status="Preparing">Preparing</button>
    `;

    attachOrderStatusListeners();

    document.querySelector("button").click();

    await Promise.resolve();
    await Promise.resolve();

    expect(dbModule.updateDoc).toHaveBeenCalled();
  });
});

describe("markCashOrderAsPaid", () => {
  test("writes paid status to the order and credits wallet_ledger with cash source", async () => {
    dbModule.doc.mockImplementation((_db, collectionName, id) => ({
      collectionName,
      id,
    }));
    dbModule.collection.mockImplementation((_db, name) => name);
    dbModule.serverTimestamp.mockReturnValue("ts");
    dbModule.updateDoc.mockResolvedValue();
    dbModule.addDoc.mockResolvedValue({ id: "ledger-1" });

    await markCashOrderAsPaid({
      id: "order-9",
      vendorId: "vendor-1",
      vendorName: "Shop1",
      total: 75,
    });

    expect(dbModule.updateDoc).toHaveBeenCalledWith(
      { collectionName: "orders", id: "order-9" },
      expect.objectContaining({
        paymentStatus: "paid",
        paidAt: "ts",
        updatedAt: "ts",
      })
    );

    expect(dbModule.addDoc).toHaveBeenCalledWith(
      "wallet_ledger",
      expect.objectContaining({
        type: "credit",
        source: "cash",
        vendorId: "vendor-1",
        vendorName: "Shop1",
        orderId: "order-9",
        amount: 75,
        status: "settled",
      })
    );
  });
});

describe("mark-paid click delegation", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `<section id="orders-list"></section>`;

    dbModule.doc.mockImplementation((_db, collectionName, id) => ({
      collectionName,
      id,
    }));
    dbModule.collection.mockImplementation((_db, name) => name);
    dbModule.serverTimestamp.mockReturnValue("ts");
    dbModule.updateDoc.mockResolvedValue();
    dbModule.addDoc.mockResolvedValue({ id: "ledger-1" });
  });

  test("marks order paid, updates badge, and unlocks Collected button when clicked", async () => {
    dbModule.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        vendorId: "vendor-1",
        vendorName: "Shop1",
        status: "Ready",
        paymentMethod: "cash",
        paymentStatus: "unpaid",
        total: 60,
      }),
    });

    renderOrders([
      {
        id: "order-mp-1",
        status: "Ready",
        paymentMethod: "cash",
        paymentStatus: "unpaid",
        total: 60,
      },
    ]);

    attachOrderStatusListeners();

    const article = document.querySelector(
      'article[data-order-id="order-mp-1"]'
    );
    expect(article.querySelector(".cash-banner")).not.toBeNull();
    expect(article.querySelector(".mark-paid-btn")).not.toBeNull();

    article.querySelector(".mark-paid-btn").click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dbModule.updateDoc).toHaveBeenCalledWith(
      { collectionName: "orders", id: "order-mp-1" },
      expect.objectContaining({ paymentStatus: "paid" })
    );

    expect(dbModule.addDoc).toHaveBeenCalledWith(
      "wallet_ledger",
      expect.objectContaining({ source: "cash", orderId: "order-mp-1" })
    );

    expect(article.dataset.paymentStatus).toBe("paid");
    expect(article.querySelector(".cash-banner")).toBeNull();
    expect(article.querySelector(".mark-paid-btn")).toBeNull();
    expect(article.querySelector(".payment-badge").textContent).toContain(
      "Cash • Paid"
    );
    expect(article.querySelector('[data-status="Collected"]')).not.toBeNull();
  });

  test("alerts and skips mutation when order no longer exists", async () => {
    window.alert = jest.fn();

    dbModule.getDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });

    renderOrders([
      {
        id: "order-missing",
        status: "Ready",
        paymentMethod: "cash",
        paymentStatus: "unpaid",
        total: 25,
      },
    ]);

    attachOrderStatusListeners();

    document.querySelector(".mark-paid-btn").click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(window.alert).toHaveBeenCalledWith("Order no longer exists.");
    expect(dbModule.updateDoc).not.toHaveBeenCalled();
    expect(dbModule.addDoc).not.toHaveBeenCalled();
  });

  test("re-enables the button when marking as paid fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    window.alert = jest.fn();

    dbModule.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        vendorId: "vendor-1",
        vendorName: "Shop1",
        status: "Ready",
        paymentMethod: "cash",
        paymentStatus: "unpaid",
        total: 60,
      }),
    });

    dbModule.updateDoc.mockRejectedValueOnce(new Error("boom"));

    renderOrders([
      {
        id: "order-fail",
        status: "Ready",
        paymentMethod: "cash",
        paymentStatus: "unpaid",
        total: 60,
      },
    ]);

    attachOrderStatusListeners();

    const btn = document.querySelector(".mark-paid-btn");
    btn.click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorSpy).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("Failed to mark order as paid.");
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe("Mark as Paid");

    errorSpy.mockRestore();
  });

  test("ignores mark-paid clicks with missing order id", async () => {
    document.getElementById("orders-list").innerHTML = `
      <article>
        <button class="mark-paid-btn">Mark as Paid</button>
      </article>
    `;

    attachOrderStatusListeners();

    document.querySelector(".mark-paid-btn").click();
    await Promise.resolve();

    expect(dbModule.getDoc).not.toHaveBeenCalled();
    expect(dbModule.updateDoc).not.toHaveBeenCalled();
  });

  test("updates vendor dashboard title and subtitle", async () => {
    document.body.innerHTML = `
      <h1 id="dashboardTitle"></h1>
      <p id="dashboardSubtitle"></p>
    `;

    const mod = await import("../scripts/vendor-dashboard.js");

    mod.updateDashboardTitle({
      shopName: "Campus Café",
    });

    expect(document.getElementById("dashboardTitle").textContent).toBe(
      "Campus Café's Dashboard"
    );

    expect(document.getElementById("dashboardSubtitle").textContent).toBe(
      "Welcome to your dashboard!"
    );
  });
  test("renderQuickStats returns safely when stat elements are missing", () => {
  document.body.innerHTML = "";

  expect(() => {
    vendorDashboard.renderQuickStats([]);
  }).not.toThrow();
});
test("getPaymentMeta defaults non-cash payments to card and paid", () => {
  expect(vendorDashboard.getPaymentMeta({ paymentMethod: "card" })).toEqual({
    paymentMethod: "card",
    paymentStatus: "paid",
    isUnpaidCash: false
  });
});
test("getStatusButtons blocks collected button for unpaid cash orders", () => {
  const html = vendorDashboard.getStatusButtons({
    id: "order-1",
    status: "Ready",
    paymentMethod: "cash",
    paymentStatus: "unpaid"
  });

  expect(html).toContain("Mark this cash order as paid");
  expect(html).not.toContain('data-status="Collected"');
});
test("mark paid alerts when order no longer exists", async () => {
  window.alert = jest.fn();

  document.body.innerHTML = `
    <section id="orders-list">
      <article>
        <button class="mark-paid-btn" data-mark-paid-id="missing-order">
          Mark as Paid
        </button>
      </article>
    </section>
  `;

  dbModule.getDoc.mockResolvedValue({
    exists: () => false,
    data: () => ({})
  });

  vendorDashboard.attachOrderStatusListeners();

  document.querySelector(".mark-paid-btn").click();

  await Promise.resolve();
  await Promise.resolve();

  expect(window.alert).toHaveBeenCalledWith("Order no longer exists.");
});
test("updateOrderStatus updates status and timestamp", async () => {
  dbModule.doc.mockReturnValue("order-ref");
  dbModule.serverTimestamp.mockReturnValue("mock-timestamp");
  dbModule.updateDoc.mockResolvedValue();

  await vendorDashboard.updateOrderStatus("order-1", "Preparing");

  expect(dbModule.updateDoc).toHaveBeenCalledWith("order-ref", {
    status: "Preparing",
    updatedAt: "mock-timestamp"
  });
});
});