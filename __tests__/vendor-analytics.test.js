/**
 * @jest-environment jsdom
 */

let authCallback;

let mockGetDoc;
let mockGetDocs;
let mockDoc;
let mockCollection;
let mockQuery;
let mockWhere;

const mockOrders = [
  {
    id: "order1",
    vendorId: "vendor123",
    status: "Collected",
    total: 100,
    createdAt: {
      toDate: () => new Date("2026-04-01")
    }
  },
  {
    id: "order2",
    vendorId: "vendor123",
    status: "Pending",
    total: 50,
    createdAt: {
      toDate: () => new Date("2026-04-02")
    }
  },
  {
    id: "order3",
    vendorId: "vendor123",
    status: "Collected",
    total: 75.5,
    createdAt: {
      toDate: () => new Date("2026-04-03")
    }
  }
];

function setupDOM(includeChart = true) {
  document.body.innerHTML = `
    <p id="totalOrders"></p>
    <p id="collectedOrders"></p>
    <p id="totalRevenue"></p>
    <p id="analyticsMessage"></p>

    <input id="startDate" type="date" />
    <input id="endDate" type="date" />
    <button id="filterBtn">Apply Filter</button>

    ${includeChart ? `<canvas id="analyticsChart"></canvas>` : ""}
  `;
}

function setupDatabaseMock() {
  mockGetDoc = jest.fn();
  mockGetDocs = jest.fn();
  mockDoc = jest.fn();
  mockCollection = jest.fn();
  mockQuery = jest.fn();
  mockWhere = jest.fn();

  mockDoc.mockReturnValue({});
  mockCollection.mockReturnValue({});
  mockWhere.mockReturnValue({});
  mockQuery.mockReturnValue({});

  jest.doMock("../scripts/database.js", () => ({
    auth: {},
    db: {},
    doc: (...args) => mockDoc(...args),
    getDoc: (...args) => mockGetDoc(...args),
    getDocs: (...args) => mockGetDocs(...args),
    collection: (...args) => mockCollection(...args),
    query: (...args) => mockQuery(...args),
    where: (...args) => mockWhere(...args),
    onAuthStateChanged: jest.fn((auth, callback) => {
      authCallback = callback;
    })
  }));
}

beforeEach(() => {
  jest.resetModules();

  authCallback = undefined;

  setupDOM();
  setupDatabaseMock();

  global.lucide = {
    createIcons: jest.fn()
  };

  global.Chart = jest.fn(() => ({
    destroy: jest.fn()
  }));
});

describe("vendor-analytics.js", () => {
  test("registers onAuthStateChanged and creates lucide icons when the page loads", async () => {
    await import("../scripts/vendor-analytics.js");

    expect(authCallback).toEqual(expect.any(Function));
    expect(global.lucide.createIcons).toHaveBeenCalled();
  });

  test("loads vendor orders and updates analytics for a valid vendor", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    mockGetDocs.mockResolvedValue({
      docs: mockOrders.map((order) => ({
        id: order.id,
        data: () => order
      }))
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "vendor123"
    });

    expect(mockDoc).toHaveBeenCalledWith({}, "users", "vendor123");
    expect(mockCollection).toHaveBeenCalledWith({}, "orders");
    expect(mockWhere).toHaveBeenCalledWith("vendorId", "==", "vendor123");
    expect(mockQuery).toHaveBeenCalled();
    expect(mockGetDocs).toHaveBeenCalled();

    expect(document.getElementById("totalOrders").textContent).toBe("3");
    expect(document.getElementById("collectedOrders").textContent).toBe("2");
    expect(document.getElementById("totalRevenue").textContent).toBe("R175.50");

    expect(document.getElementById("analyticsMessage").textContent).toBe(
      "Showing 3 orders, with 2 collected orders and R175.50 revenue."
    );

    expect(global.Chart).toHaveBeenCalled();
  });

  test("only collected orders are included in total revenue", async () => {
    const orders = [
      {
        id: "order1",
        status: "Collected",
        total: 200,
        createdAt: {
          toDate: () => new Date("2026-04-01")
        }
      },
      {
        id: "order2",
        status: "Pending",
        total: 500,
        createdAt: {
          toDate: () => new Date("2026-04-02")
        }
      },
      {
        id: "order3",
        status: "Cancelled",
        total: 300,
        createdAt: {
          toDate: () => new Date("2026-04-03")
        }
      }
    ];

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    mockGetDocs.mockResolvedValue({
      docs: orders.map((order) => ({
        id: order.id,
        data: () => order
      }))
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "vendor123"
    });

    expect(document.getElementById("totalOrders").textContent).toBe("3");
    expect(document.getElementById("collectedOrders").textContent).toBe("1");
    expect(document.getElementById("totalRevenue").textContent).toBe("R200.00");
  });

  test("uses R0.00 revenue when collected orders have missing totals", async () => {
    const orders = [
      {
        id: "order1",
        status: "Collected",
        createdAt: {
          toDate: () => new Date("2026-04-01")
        }
      },
      {
        id: "order2",
        status: "Collected",
        total: "",
        createdAt: {
          toDate: () => new Date("2026-04-02")
        }
      }
    ];

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    mockGetDocs.mockResolvedValue({
      docs: orders.map((order) => ({
        id: order.id,
        data: () => order
      }))
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "vendor123"
    });

    expect(document.getElementById("totalOrders").textContent).toBe("2");
    expect(document.getElementById("collectedOrders").textContent).toBe("2");
    expect(document.getElementById("totalRevenue").textContent).toBe("R0.00");
  });

  test("creates a chart with collected revenue grouped by date", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    mockGetDocs.mockResolvedValue({
      docs: mockOrders.map((order) => ({
        id: order.id,
        data: () => order
      }))
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "vendor123"
    });

    const firstDate = new Date("2026-04-01").toLocaleDateString("en-CA");
    const thirdDate = new Date("2026-04-03").toLocaleDateString("en-CA");

    expect(global.Chart).toHaveBeenCalledWith(
      document.getElementById("analyticsChart"),
      expect.objectContaining({
        type: "line",
        data: expect.objectContaining({
          labels: [firstDate, thirdDate],
          datasets: [
            expect.objectContaining({
              label: "Revenue Over Time",
              data: [100, 75.5],
              tension: 0.3
            })
          ]
        }),
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      })
    );
  });

  test("does not create a chart if the analytics chart element is missing", async () => {
    setupDOM(false);

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    mockGetDocs.mockResolvedValue({
      docs: mockOrders.map((order) => ({
        id: order.id,
        data: () => order
      }))
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "vendor123"
    });

    expect(global.Chart).not.toHaveBeenCalled();
  });

  test("filter button filters loaded orders by selected date range", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    mockGetDocs.mockResolvedValue({
      docs: mockOrders.map((order) => ({
        id: order.id,
        data: () => order
      }))
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "vendor123"
    });

    document.getElementById("startDate").value = "2026-04-01";
    document.getElementById("endDate").value = "2026-04-01";

    document.getElementById("filterBtn").click();

    expect(document.getElementById("totalOrders").textContent).toBe("1");
    expect(document.getElementById("collectedOrders").textContent).toBe("1");
    expect(document.getElementById("totalRevenue").textContent).toBe("R100.00");

    expect(document.getElementById("analyticsMessage").textContent).toBe(
      "Showing 1 orders, with 1 collected orders and R100.00 revenue."
    );
  });

  test("filter button keeps all orders when start date is missing", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    mockGetDocs.mockResolvedValue({
      docs: mockOrders.map((order) => ({
        id: order.id,
        data: () => order
      }))
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "vendor123"
    });

    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "2026-04-01";

    document.getElementById("filterBtn").click();

    expect(document.getElementById("totalOrders").textContent).toBe("3");
    expect(document.getElementById("collectedOrders").textContent).toBe("2");
    expect(document.getElementById("totalRevenue").textContent).toBe("R175.50");
  });

  test("filter button keeps all orders when end date is missing", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    mockGetDocs.mockResolvedValue({
      docs: mockOrders.map((order) => ({
        id: order.id,
        data: () => order
      }))
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "vendor123"
    });

    document.getElementById("startDate").value = "2026-04-01";
    document.getElementById("endDate").value = "";

    document.getElementById("filterBtn").click();

    expect(document.getElementById("totalOrders").textContent).toBe("3");
    expect(document.getElementById("collectedOrders").textContent).toBe("2");
    expect(document.getElementById("totalRevenue").textContent).toBe("R175.50");
  });

  test("filter button excludes orders without createdAt date", async () => {
    const orders = [
      {
        id: "order1",
        status: "Collected",
        total: 100,
        createdAt: null
      },
      {
        id: "order2",
        status: "Collected",
        total: 50,
        createdAt: {
          toDate: () => new Date("2026-04-02")
        }
      }
    ];

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    mockGetDocs.mockResolvedValue({
      docs: orders.map((order) => ({
        id: order.id,
        data: () => order
      }))
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "vendor123"
    });

    document.getElementById("startDate").value = "2026-04-01";
    document.getElementById("endDate").value = "2026-04-03";

    document.getElementById("filterBtn").click();

    expect(document.getElementById("totalOrders").textContent).toBe("1");
    expect(document.getElementById("collectedOrders").textContent).toBe("1");
    expect(document.getElementById("totalRevenue").textContent).toBe("R50.00");
  });

  test("handles empty vendor order list", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    mockGetDocs.mockResolvedValue({
      docs: []
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "vendor123"
    });

    expect(document.getElementById("totalOrders").textContent).toBe("0");
    expect(document.getElementById("collectedOrders").textContent).toBe("0");
    expect(document.getElementById("totalRevenue").textContent).toBe("R0.00");

    expect(document.getElementById("analyticsMessage").textContent).toBe(
      "Showing 0 orders, with 0 collected orders and R0.00 revenue."
    );
  });

  test("does not fetch orders when user is not logged in", async () => {
    await import("../scripts/vendor-analytics.js");

    await authCallback(null);

    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  test("does not fetch orders when user document does not exist", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "vendor123"
    });

    expect(mockGetDoc).toHaveBeenCalled();
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  test("does not fetch orders when logged-in user is not a vendor", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "customer"
      })
    });

    await import("../scripts/vendor-analytics.js");

    await authCallback({
      uid: "customer123"
    });

    expect(mockGetDoc).toHaveBeenCalled();
    expect(mockGetDocs).not.toHaveBeenCalled();
  });
});