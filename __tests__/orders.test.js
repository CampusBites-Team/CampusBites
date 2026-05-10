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
  onSnapshot: jest.fn()
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
      <section id="inProgress"></section>
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

  test("renders Preparing and Ready orders into inProgress", async () => {
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

    const html = document.getElementById("inProgress").innerHTML;
    expect(html).toContain("Bob Jones");
    expect(html).toContain("Cara Lee");
    expect(html).toContain("Preparing");
    expect(html).toContain("Ready");
    expect(html).toContain("Pizza");
    expect(html).toContain("Juice");
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
    expect(document.getElementById("inProgress").innerHTML).toContain("No orders in progress.");
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
});