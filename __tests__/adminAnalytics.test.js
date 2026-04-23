/**
 * @jest-environment jsdom
 */

jest.mock("../scripts/database.js", () => ({
  db: {},
  auth: { currentUser: { uid: "admin-1" } },
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn((...args) => args),
  doc: jest.fn((...args) => args),
  query: jest.fn((...args) => args),
  where: jest.fn((...args) => args),
  Timestamp: {
    fromDate: jest.fn((date) => ({
      toDate: () => date
    }))
  }
}));

describe("adminAnalytics.js", () => {
  let database;
  let analytics;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    document.body.innerHTML = `
      <select id="report-range">
        <option value="7">Last 7 Days</option>
        <option value="30" selected>Last 30 Days</option>
      </select>

      <select id="report-vendor">
        <option value="">All Vendors</option>
        <option value="vendor-1">Campus Grill</option>
        <option value="vendor-2">Healthy Bites</option>
      </select>

      <select id="report-metric">
        <option value="revenue" selected>Revenue</option>
        <option value="orders">Orders</option>
        <option value="items">Items Sold</option>
      </select>

      <section id="custom-report-view">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Vendor</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>Avg Order Value</th>
            </tr>
          </thead>
          <tbody id="custom-report-body"></tbody>
        </table>
      </section>

      <canvas id="salesChart"></canvas>
      <canvas id="peakChart"></canvas>
      <canvas id="itemsChart"></canvas>
    `;

    global.alert = jest.fn();

    global.Chart = jest.fn(() => ({
      destroy: jest.fn()
    }));

    window.jspdf = {
      jsPDF: jest.fn(() => ({
        setFontSize: jest.fn(),
        text: jest.fn(),
        addPage: jest.fn(),
        save: jest.fn()
      }))
    };

    global.URL.createObjectURL = jest.fn(() => "blob:url");

    const realCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      const el = realCreateElement(tagName);
      if (tagName === "a") {
        el.click = jest.fn();
      }
      return el;
    });

    database = require("../scripts/database.js");

    database.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "admin" })
    });

    // Mock Papa for CSV export
    jest.doMock("https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm", () => ({
      __esModule: true,
      default: {
        unparse: jest.fn(() => "csv-content")
      }
    }), { virtual: true });

    ({ analytics } = await import("../scripts/adminAnalytics.js"));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("updateCustomView populates the report table", async () => {
    const recentDate = new Date("2026-04-20T10:00:00");

    database.getDocs
      // orders
      .mockResolvedValueOnce({
        docs: [
          {
            id: "order-1",
            data: () => ({
              vendorId: "vendor-1",
              total: 120,
              menuItems: [{ name: "Burger", quantity: 2 }],
              createdAt: {
                toDate: () => recentDate
              }
            })
          },
          {
            id: "order-2",
            data: () => ({
              vendorId: "vendor-1",
              total: 210,
              menuItems: [{ name: "Wrap", quantity: 3 }],
              createdAt: {
                toDate: () => recentDate
              }
            })
          }
        ]
      })
      // vendors
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor-1",
            data: () => ({
              role: "vendor",
              shopName: "Campus Grill",
              status: "approved"
            })
          }
        ]
      });

    await analytics.updateCustomView();

    const html = document.getElementById("custom-report-body").innerHTML;
    expect(html).toContain("Campus Grill");
    expect(html).toContain("R330.00");
    expect(html).toContain("2");
  });

  test("updateCustomView filters by selected vendor", async () => {
    document.getElementById("report-vendor").value = "vendor-2";

    const recentDate = new Date("2026-04-20T10:00:00");

    database.getDocs
      // orders
      .mockResolvedValueOnce({
        docs: [
          {
            id: "order-1",
            data: () => ({
              vendorId: "vendor-1",
              total: 120,
              menuItems: [{ name: "Burger", quantity: 2 }],
              createdAt: { toDate: () => recentDate }
            })
          },
          {
            id: "order-2",
            data: () => ({
              vendorId: "vendor-2",
              total: 80,
              menuItems: [{ name: "Salad", quantity: 1 }],
              createdAt: { toDate: () => recentDate }
            })
          }
        ]
      })
      // vendors
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor-1",
            data: () => ({
              role: "vendor",
              shopName: "Campus Grill",
              status: "approved"
            })
          },
          {
            id: "vendor-2",
            data: () => ({
              role: "vendor",
              shopName: "Healthy Bites",
              status: "approved"
            })
          }
        ]
      });

    await analytics.updateCustomView();

    const html = document.getElementById("custom-report-body").innerHTML;
    expect(html).toContain("Healthy Bites");
    expect(html).not.toContain("Campus Grill");
  });

  test("updateCustomView updates metric header for orders", async () => {
    document.getElementById("report-metric").value = "orders";

    const recentDate = new Date("2026-04-20T10:00:00");

    database.getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: "order-1",
            data: () => ({
              vendorId: "vendor-1",
              total: 120,
              menuItems: [{ name: "Burger", quantity: 2 }],
              createdAt: { toDate: () => recentDate }
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor-1",
            data: () => ({
              role: "vendor",
              shopName: "Campus Grill",
              status: "approved"
            })
          }
        ]
      });

    await analytics.updateCustomView();

    const lastHeader = document.querySelector("#custom-report-view thead tr th:last-child");
    expect(lastHeader.textContent).toBe("Selected Metric (Orders)");
  });

  test("exportCSV runs successfully", async () => {
    database.getDocs
      // orders
      .mockResolvedValueOnce({
        docs: [
          {
            id: "order-1",
            data: () => ({
              vendorId: "vendor-1",
              total: 120,
              status: "Collected",
              userId: "customer-1",
              menuItems: [{ name: "Burger", quantity: 2 }],
              createdAt: {
                toDate: () => new Date("2026-04-20T10:00:00")
              }
            })
          }
        ]
      })
      // vendors
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor-1",
            data: () => ({
              role: "vendor",
              shopName: "Campus Grill",
              status: "approved"
            })
          }
        ]
      });

    await analytics.exportCSV();

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith("CSV exported successfully");
  });

  test("exportPDF runs successfully when jsPDF is loaded", async () => {
    database.getDocs
      // orders
      .mockResolvedValueOnce({
        docs: [
          {
            id: "order-1",
            data: () => ({
              vendorId: "vendor-1",
              total: 120,
              status: "Collected",
              createdAt: {
                toDate: () => new Date("2026-04-20T10:00:00")
              }
            })
          }
        ]
      })
      // vendors
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor-1",
            data: () => ({
              role: "vendor",
              shopName: "Campus Grill",
              status: "approved"
            })
          }
        ]
      });

    await analytics.exportPDF();

    expect(window.jspdf.jsPDF).toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith("PDF exported successfully");
  });
});