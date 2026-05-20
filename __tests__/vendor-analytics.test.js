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
let mockPapaUnparse;

const mockOrders = [
  {
    id: "order1",
    vendorId: "vendor123",
    status: "Collected",
    total: 100,
    customerName: "Aisha",
    paymentMethod: "Card",
    createdAt: {
      toDate: () => new Date("2026-04-01T10:00:00")
    },
    menuItems: [{ name: "Burger", quantity: 2 }]
  },
  {
    id: "order2",
    vendorId: "vendor123",
    status: "Pending",
    total: 50,
    userId: "customer2",
    createdAt: {
      toDate: () => new Date("2026-04-02T12:00:00")
    },
    menuItems: [{ name: "Pizza", quantity: 1 }]
  },
  {
    id: "order3",
    vendorId: "vendor123",
    status: "Collected",
    total: 75.5,
    createdAt: {
      toDate: () => new Date("2026-04-03T14:00:00")
    },
    menuItems: [{ name: "Burger", quantity: 1 }]
  }
];

function setupDOM(includeAnalyticsChart = true, includeExtraCharts = true) {
  document.body.innerHTML = `
    <p id="totalOrders"></p>
    <p id="collectedOrders"></p>
    <p id="totalRevenue"></p>
    <p id="analyticsMessage"></p>

    <input id="startDate" type="date" />
    <input id="endDate" type="date" />
    <button id="filterBtn">Apply Filter</button>
    <button id="exportCsvBtn">Export CSV</button>
    <button id="exportPdfBtn">Export PDF</button>

    ${includeAnalyticsChart ? `<canvas id="analyticsChart"></canvas>` : ""}
    ${includeExtraCharts ? `<canvas id="peakChart"></canvas>` : ""}
    ${includeExtraCharts ? `<canvas id="itemsChart"></canvas>` : ""}

    <table>
      <tbody id="customReportBody"></tbody>
    </table>
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

function setupPapaMock() {
  mockPapaUnparse = jest.fn(() => "csv-content");

  jest.doMock("https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm", () => ({
    __esModule: true,
    default: {
      unparse: mockPapaUnparse
    }
  }), { virtual: true });
}

function setupVendorUser(orders = mockOrders) {
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
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();

  authCallback = undefined;

  setupDOM();
  setupDatabaseMock();
  setupPapaMock();

  global.lucide = {
    createIcons: jest.fn()
  };

  global.Chart = jest.fn(() => ({
    destroy: jest.fn()
  }));

  global.alert = jest.fn();

  global.URL.createObjectURL = jest.fn(() => "blob:test-url");
  global.URL.revokeObjectURL = jest.fn();

  HTMLAnchorElement.prototype.click = jest.fn();
});

describe("vendor-analytics.js", () => {
  test("registers onAuthStateChanged and creates lucide icons when the page loads", async () => {
    await import("../scripts/vendor-analytics.js");

    expect(authCallback).toEqual(expect.any(Function));
    expect(global.lucide.createIcons).toHaveBeenCalled();
  });

  test("loads vendor orders and updates summary analytics", async () => {
    setupVendorUser();

    await import("../scripts/vendor-analytics.js");

    await authCallback({ uid: "vendor123" });

    expect(mockDoc).toHaveBeenCalledWith({}, "users", "vendor123");
    expect(mockCollection).toHaveBeenCalledWith({}, "orders");
    expect(mockWhere).toHaveBeenCalledWith("vendorId", "==", "vendor123");

    expect(document.getElementById("totalOrders").textContent).toBe("3");
    expect(document.getElementById("collectedOrders").textContent).toBe("2");
    expect(document.getElementById("totalRevenue").textContent).toBe("R175.50");

    expect(document.getElementById("analyticsMessage").textContent).toBe(
      "Showing 3 orders, with 2 collected orders and R175.50 revenue."
    );
  });

  test("only collected orders are included in revenue", async () => {
    const orders = [
      {
        id: "order1",
        status: "Collected",
        total: 200,
        createdAt: { toDate: () => new Date("2026-04-01") }
      },
      {
        id: "order2",
        status: "Pending",
        total: 500,
        createdAt: { toDate: () => new Date("2026-04-02") }
      }
    ];

    setupVendorUser(orders);

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    expect(document.getElementById("totalRevenue").textContent).toBe("R200.00");
  });

  test("creates analytics revenue chart grouped by date", async () => {
    setupVendorUser();

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    expect(global.Chart).toHaveBeenCalledWith(
      document.getElementById("analyticsChart"),
      expect.objectContaining({
        type: "line",
        data: expect.objectContaining({
          labels: ["2026-04-01", "2026-04-03"],
          datasets: [
            expect.objectContaining({
              label: "Revenue Over Time",
              data: [100, 75.5],
              tension: 0.3
            })
          ]
        })
      })
    );
  });

  test("creates peak orders chart and popular items chart", async () => {
    setupVendorUser();

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    expect(global.Chart).toHaveBeenCalledWith(
      document.getElementById("peakChart"),
      expect.objectContaining({
        type: "line",
        data: expect.objectContaining({
          labels: ["10", "12", "14"],
          datasets: [
            expect.objectContaining({
              label: "Orders",
              data: [1, 1, 1]
            })
          ]
        })
      })
    );

    expect(global.Chart).toHaveBeenCalledWith(
      document.getElementById("itemsChart"),
      expect.objectContaining({
        type: "doughnut",
        data: expect.objectContaining({
          labels: ["Burger", "Pizza"],
          datasets: [
            expect.objectContaining({
              data: [3, 1]
            })
          ]
        })
      })
    );
  });

  test("does not create additional charts if chart canvases are missing", async () => {
    setupDOM(true, false);
    setupVendorUser();

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    expect(global.Chart).toHaveBeenCalledTimes(1);
    expect(global.Chart).toHaveBeenCalledWith(
      document.getElementById("analyticsChart"),
      expect.any(Object)
    );
  });

  test("updates custom report table grouped by date", async () => {
    setupVendorUser();

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    const html = document.getElementById("customReportBody").innerHTML;

    expect(html).toContain("2026/04/01");
    expect(html).toContain("2026/04/02");
    expect(html).toContain("2026/04/03");
    expect(html).toContain("R100.00");
    expect(html).toContain("R75.50");
    expect(html).toContain("R0.00");
  });

  test("does not update custom report if customReportBody is missing", async () => {
    setupDOM();
    document.getElementById("customReportBody").remove();

    setupVendorUser();

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    expect(document.getElementById("totalOrders").textContent).toBe("3");
  });

  test("filter button filters loaded orders by selected date range", async () => {
    setupVendorUser();

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    document.getElementById("startDate").value = "2026-04-01";
    document.getElementById("endDate").value = "2026-04-01";

    document.getElementById("filterBtn").click();

    expect(document.getElementById("totalOrders").textContent).toBe("1");
    expect(document.getElementById("collectedOrders").textContent).toBe("1");
    expect(document.getElementById("totalRevenue").textContent).toBe("R100.00");
  });

  test("filter button keeps all orders when start date is missing", async () => {
    setupVendorUser();

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "2026-04-01";

    document.getElementById("filterBtn").click();

    expect(document.getElementById("totalOrders").textContent).toBe("3");
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

    setupVendorUser(orders);

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    document.getElementById("startDate").value = "2026-04-01";
    document.getElementById("endDate").value = "2026-04-03";

    document.getElementById("filterBtn").click();

    expect(document.getElementById("totalOrders").textContent).toBe("1");
    expect(document.getElementById("totalRevenue").textContent).toBe("R50.00");
  });

  test("exports filtered orders as CSV", async () => {
    setupVendorUser();

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    document.getElementById("exportCsvBtn").click();

    expect(mockPapaUnparse).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  test("exports PDF when jsPDF is loaded", async () => {
    const mockPdf = {
      setFontSize: jest.fn(),
      text: jest.fn(),
      save: jest.fn(),
      addPage: jest.fn()
    };

    window.jspdf = {
      jsPDF: jest.fn(() => mockPdf)
    };

    setupVendorUser();

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    document.getElementById("exportPdfBtn").click();

    expect(window.jspdf.jsPDF).toHaveBeenCalled();
    expect(mockPdf.text).toHaveBeenCalledWith(
      "CampusBites Vendor Analytics Report",
      20,
      20
    );
    expect(mockPdf.save).toHaveBeenCalled();
  });

  test("shows alert when jsPDF is missing", async () => {
    delete window.jspdf;

    setupVendorUser();

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    document.getElementById("exportPdfBtn").click();

    expect(global.alert).toHaveBeenCalledWith("jsPDF library is not loaded.");
  });

  test("handles empty vendor order list", async () => {
    setupVendorUser([]);

    await import("../scripts/vendor-analytics.js");
    await authCallback({ uid: "vendor123" });

    expect(document.getElementById("totalOrders").textContent).toBe("0");
    expect(document.getElementById("collectedOrders").textContent).toBe("0");
    expect(document.getElementById("totalRevenue").textContent).toBe("R0.00");
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
    await authCallback({ uid: "vendor123" });

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
    await authCallback({ uid: "customer123" });

    expect(mockGetDoc).toHaveBeenCalled();
    expect(mockGetDocs).not.toHaveBeenCalled();
  });
});