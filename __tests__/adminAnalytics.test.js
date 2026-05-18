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
  let setReportGenerated;

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
    ({
      analytics,
      __setReportGenerated: setReportGenerated
    } = await import("../scripts/adminAnalytics.js"));
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
      setReportGenerated(true);
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
      setReportGenerated(true);
    await analytics.exportPDF();

    expect(window.jspdf.jsPDF).toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith("PDF exported successfully");
  });
  test("updateCustomView blocks logged out users", async () => {
  database.auth.currentUser = null;

  await analytics.updateCustomView();

  expect(alert).toHaveBeenCalledWith("You must be logged in.");
});

test("updateCustomView blocks non-admin users", async () => {
  database.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ role: "customer" })
  });

  await analytics.updateCustomView();

  expect(alert).toHaveBeenCalledWith("Access denied.");
});

test("updateCustomView handles missing user profile", async () => {
  database.getDoc.mockResolvedValue({
    exists: () => false
  });

  await analytics.updateCustomView();

  expect(alert).toHaveBeenCalledWith("User profile not found.");
});

test("generateSampleData blocks when orders already exist", async () => {
  database.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ role: "admin" })
  });

  database.getDocs.mockResolvedValueOnce({
    empty: false,
    docs: [{ id: "existing-order", data: () => ({ total: 100 }) }]
  });

  await analytics.generateSampleData();

  expect(alert).toHaveBeenCalledWith("Orders already exist. Sample data was not generated.");
  expect(database.addDoc).not.toHaveBeenCalled();
});

test("generateSampleData blocks when no approved vendors or items exist", async () => {
  database.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ role: "admin" })
  });

  database.getDocs
    .mockResolvedValueOnce({ empty: true, docs: [] }) // orders
    .mockResolvedValueOnce({ docs: [] }) // vendors
    .mockResolvedValueOnce({ docs: [] }); // menu_items

  await analytics.generateSampleData();

  expect(alert).toHaveBeenCalledWith(
    "Need approved vendors and menu items before generating sample data."
  );
});

test("generateSampleData creates sample orders successfully", async () => {
  database.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ role: "admin" })
  });

  database.getDocs
    .mockResolvedValueOnce({ empty: true, docs: [] }) // orders
    .mockResolvedValueOnce({
      docs: [
        {
          id: "vendor-1",
          data: () => ({
            role: "vendor",
            status: "approved",
            shopName: "Campus Grill"
          })
        }
      ]
    }) // vendors
    .mockResolvedValueOnce({
      docs: [
        {
          id: "item-1",
          data: () => ({
            name: "Burger",
            price: 50,
            vendorId: "vendor-1",
            vendorName: "Campus Grill",
            category: "Fast Food"
          })
        }
      ]
    }); // items

  database.addDoc.mockResolvedValue({});

  await analytics.generateSampleData();

  expect(database.addDoc).toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith("Sample analytics data generated successfully.");
});

test("updateCustomView handles items metric", async () => {
  document.getElementById("report-metric").value = "items";

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
  const html = document.getElementById("custom-report-body").innerHTML;

  expect(lastHeader.textContent).toBe("Selected Metric (Items)");
  expect(html).toContain(">2<");
});

test("exportCSV blocks non-admin users", async () => {
  database.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ role: "customer" })
  });

  await analytics.exportCSV();

  expect(alert).toHaveBeenCalledWith("Access denied.");
});

test("exportPDF blocks when jsPDF is missing", async () => {
  database.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ role: "admin" })
  });
  setReportGenerated(true);
  delete window.jspdf;

  await analytics.exportPDF();

  expect(alert).toHaveBeenCalledWith("jsPDF library is not loaded.");
});

test("populateVendorFilter adds approved vendors to dropdown", async () => {
  const { populateVendorFilter } = await import("../scripts/adminAnalytics.js");

  database.getDocs.mockResolvedValue({
    docs: [
      {
        id: "vendor-1",
        data: () => ({
          role: "vendor",
          status: "approved",
          shopName: "Campus Grill"
        })
      },
      {
        id: "vendor-2",
        data: () => ({
          role: "vendor",
          status: "suspended",
          shopName: "Blocked Shop"
        })
      }
    ]
  });

  await populateVendorFilter();

  const html = document.getElementById("report-vendor").innerHTML;
  expect(html).toContain("Campus Grill");
  expect(html).not.toContain("Blocked Shop");
});
});