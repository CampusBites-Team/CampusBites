/**
 * @jest-environment jsdom
 */

global.lucide = { createIcons: jest.fn() };

jest.mock("../scripts/database.js", () => ({
  auth: {},
  db: {},
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn((...args) => args),
  onAuthStateChanged: jest.fn()
}));

const sampleItems = [
  {
    id: "1",
    name: "Burger",
    vendorName: "Shop1",
    vendorId: "vendor-1",
    price: 50,
    description: "Tasty",
    category: "Mains",
    available: true,
    dietary: ["Vegan"],
    allergens: []
  },
  {
    id: "2",
    name: "Pizza",
    vendorName: "Shop2",
    vendorId: "vendor-2",
    price: 80,
    description: "Cheesy",
    category: "Mains",
    available: true,
    dietary: [],
    allergens: ["Gluten"]
  },
  {
    id: "3",
    name: "Salad",
    vendorName: "Shop1",
    vendorId: "vendor-1",
    price: 35,
    description: "Fresh",
    category: "Sides",
    available: false,
    dietary: ["Vegetarian"],
    allergens: []
  },
  {
    id: "4",
    name: "Wrap",
    vendorName: "Shop3",
    vendorId: "vendor-3",
    price: 45,
    description: "Halal wrap",
    category: "Wraps",
    available: true,
    dietary: ["Halal"],
    allergens: []
  }
];

const approvedVendors = [
  { id: "vendor-1", role: "vendor", status: "approved", shopName: "Shop1" },
  { id: "vendor-2", role: "vendor", status: "approved", shopName: "Shop2" },
  { id: "vendor-3", role: "vendor", status: "approved", shopName: "Shop3" }
];

const makeSnapshot = (items) => ({
  docs: items.map((item) => ({
    id: item.id,
    data: () => {
      const { id, ...rest } = item;
      return rest;
    }
  }))
});

const mockBrowseQueries = (db, items = sampleItems, vendors = approvedVendors) => {
  db.getDocs
    .mockResolvedValueOnce(makeSnapshot(items))
    .mockResolvedValueOnce(makeSnapshot(vendors));
};

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("browse.js", () => {
  let db;
  let alertSpy;
  let errorSpy;

  beforeEach(() => {
    jest.resetModules();

    document.body.innerHTML = `
      <a id="AdmindashboardLink"></a>
      <a id="CustomerdashboardLink"></a>
      <a id="VendordashboardLink"></a>
      <a id="loginLink"></a>

      <select id="Vendors">
        <option value="AllVendors">AllVendors</option>
      </select>

      <select id="Categories">
        <option value="AllCategories">AllCategories</option>
        <option value="Mains">Mains</option>
        <option value="Sides">Sides</option>
        <option value="Wraps">Wraps</option>
      </select>

      <input id="Vegan" type="checkbox" />
      <input id="Vegetarian" type="checkbox" />
      <input id="Gluten-Free" type="checkbox" />
      <input id="Halal" type="checkbox" />

      <button id="cart"></button>
      <p id="numItems"></p>
      <p id="numItemsCart"></p>
      <section id="cartWarning" class="hidden"></section>

      <section id="menu"></section>

      <section id="item-edit-modal" class="hidden"></section>
      <h3 id="modal-title"></h3>
      <section id="cartList"></section>

      <button id="checkOut">Check Out</button>
    `;

    db = require("../scripts/database.js");

    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders available items only", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).toContain("Pizza");
    expect(html).toContain("Wrap");
    expect(html).not.toContain("Salad");
  });

  test("updates count text for multiple items", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    expect(document.getElementById("numItems").textContent).toBe("3 items found");
  });

  test("adds item to cart and opens cart modal", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.getElementById("Shop1Burger").click();
    document.getElementById("cart").click();

    expect(document.getElementById("modal-title").textContent).toBe("Items in Cart");
    expect(document.getElementById("item-edit-modal").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("cartList").innerHTML).toContain("Burger");
    expect(document.getElementById("numItemsCart").textContent).toBe("1 item in cart");
  });

  test("removes item from cart", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.getElementById("Shop1Burger").click();
    document.getElementById("cart").click();

    const removeButton = document.querySelector("#cartList button");
    removeButton.click();

    expect(document.getElementById("cartList").innerHTML).not.toContain("Burger");
    expect(document.getElementById("numItemsCart").textContent).toBe("0 items in cart");
  });

  test("shows warning when logged in user checks out with empty cart", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.getElementById("checkOut").click();

    expect(document.getElementById("cartWarning").classList.contains("hidden")).toBe(false);
    expect(db.addDoc).not.toHaveBeenCalled();
  });

  test("alerts when logged out user tries to check out", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.getElementById("checkOut").click();

    expect(alertSpy).toHaveBeenCalledWith("You must be logged in to proceed to checkout");
  });

  test("creates one order per vendor on checkout", async () => {
    mockBrowseQueries(db);
    db.addDoc.mockResolvedValue({});
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.getElementById("Shop1Burger").click();
    document.getElementById("Shop2Pizza").click();

    document.getElementById("checkOut").click();
    await flush();

    expect(db.addDoc).toHaveBeenCalledTimes(2);

    expect(db.addDoc).toHaveBeenNthCalledWith(
      1,
      [{}, "orders"],
      expect.objectContaining({
        userId: "customer-1",
        vendorId: "vendor-1",
        vendorName: "Shop1",
        status: "pending",
        total: 50
      })
    );

    expect(db.addDoc).toHaveBeenNthCalledWith(
      2,
      [{}, "orders"],
      expect.objectContaining({
        userId: "customer-1",
        vendorId: "vendor-2",
        vendorName: "Shop2",
        status: "pending",
        total: 80
      })
    );
  });

  test("groups same-vendor items into one order with summed total", async () => {
    mockBrowseQueries(db, [
      sampleItems[0],
      {
        id: "5",
        name: "Fries",
        vendorName: "Shop1",
        vendorId: "vendor-1",
        price: 20,
        description: "Crispy",
        category: "Sides",
        available: true,
        dietary: [],
        allergens: []
      }
    ], [
      { id: "vendor-1", role: "vendor", status: "approved", shopName: "Shop1" }
    ]);

    db.addDoc.mockResolvedValue({});
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.getElementById("Shop1Burger").click();
    document.getElementById("Shop1Fries").click();

    document.getElementById("checkOut").click();
    await flush();

    expect(db.addDoc).toHaveBeenCalledTimes(1);
    expect(db.addDoc).toHaveBeenCalledWith(
      [{}, "orders"],
      expect.objectContaining({
        userId: "customer-1",
        vendorId: "vendor-1",
        vendorName: "Shop1",
        status: "pending",
        total: 70,
        menuItems: expect.any(Array)
      })
    );
  });

  test("handles addDoc failure during checkout", async () => {
    mockBrowseQueries(db);
    db.addDoc.mockRejectedValue(new Error("Firestore failed"));
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.getElementById("Shop1Burger").click();
    document.getElementById("checkOut").click();
    await flush();

    expect(errorSpy).toHaveBeenCalled();
  });

  test("hides suspended vendor items", async () => {
    mockBrowseQueries(db, sampleItems, [
      { id: "vendor-1", role: "vendor", status: "approved", shopName: "Shop1" },
      { id: "vendor-2", role: "vendor", status: "suspended", shopName: "Shop2" },
      { id: "vendor-3", role: "vendor", status: "approved", shopName: "Shop3" }
    ]);

    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).toContain("Wrap");
    expect(html).not.toContain("Pizza");
  });

  test("filters items by vendor selection", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.getElementById("Vendors").innerHTML = `
      <option value="AllVendors">AllVendors</option>
      <option value="Shop1">Shop1</option>
    `;

    document.getElementById("Vendors").value = "Shop1";

    mockBrowseQueries(db);

    document.getElementById("Vendors").dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).not.toContain("Pizza");
    expect(html).not.toContain("Wrap");
  });
});