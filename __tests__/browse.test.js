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
      <section id="PriceFilter"></section>

      <section id="menu"></section>

      <section id="item-edit-modal" class="hidden"></section>
      <section id="cartList"></section>

      <button id="closeCartModal"></button>
      <button id="checkOut">Check Out</button>
    `;

    localStorage.clear();

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

  test("updates count text", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    expect(document.getElementById("numItems").textContent)
      .toBe("3 items found");
  });

  test("adds item to cart and opens cart modal", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) =>
      cb({ uid: "customer-1" })
    );

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("cart").click();

    expect(
      document.getElementById("item-edit-modal")
        .classList.contains("hidden")
    ).toBe(false);

    expect(document.getElementById("cartList").innerHTML)
      .toContain("Burger");

    expect(document.getElementById("numItemsCart").textContent)
      .toBe("1 item in cart");
  });

  test("removes item from cart", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) =>
      cb({ uid: "customer-1" })
    );

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("cart").click();

    document.querySelector(".remove-cart-btn").click();

    expect(document.getElementById("cartList").innerHTML)
      .not.toContain("Burger");
  });

  test("shows warning when cart empty", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) =>
      cb({ uid: "customer-1" })
    );

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.getElementById("checkOut").click();

    expect(
      document.getElementById("cartWarning")
        .classList.contains("hidden")
    ).toBe(false);
  });

  test("alerts when user not logged in", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.getElementById("checkOut").click();

    expect(alertSpy).toHaveBeenCalledWith(
      "You must be logged in to proceed to checkout"
    );
  });

  test("creates one order per vendor", async () => {
    mockBrowseQueries(db);
    db.addDoc.mockResolvedValue({});
    db.onAuthStateChanged.mockImplementation((_auth, cb) =>
      cb({ uid: "customer-1" })
    );

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.querySelector('[data-item-id="1"]').click();
    document.querySelector('[data-item-id="2"]').click();

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
        status: "Pending",
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
        status: "Pending",
        total: 80
      })
    );
  });

  test("groups same vendor items into one order", async () => {
    mockBrowseQueries(
      db,
      [
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
      ],
      [
        {
          id: "vendor-1",
          role: "vendor",
          status: "approved",
          shopName: "Shop1"
        }
      ]
    );

    db.addDoc.mockResolvedValue({});
    db.onAuthStateChanged.mockImplementation((_auth, cb) =>
      cb({ uid: "customer-1" })
    );

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.querySelector('[data-item-id="1"]').click();
    document.querySelector('[data-item-id="5"]').click();

    document.getElementById("checkOut").click();

    await flush();

    expect(db.addDoc).toHaveBeenCalledTimes(1);

    expect(db.addDoc).toHaveBeenCalledWith(
      [{}, "orders"],
      expect.objectContaining({
        userId: "customer-1",
        vendorId: "vendor-1",
        vendorName: "Shop1",
        status: "Pending",
        total: 70
      })
    );
  });

  test("handles addDoc failure", async () => {
    mockBrowseQueries(db);
    db.addDoc.mockRejectedValue(new Error("Firestore failed"));

    db.onAuthStateChanged.mockImplementation((_auth, cb) =>
      cb({ uid: "customer-1" })
    );

    const mod = await import("../scripts/browse.js");
    await mod.loadBrowseItems();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("checkOut").click();

    await flush();

    expect(errorSpy).toHaveBeenCalled();
  });

  test("filters by vendor", async () => {
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

    document.getElementById("Vendors")
      .dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).not.toContain("Pizza");
    expect(html).not.toContain("Wrap");
  });
  test("renders empty cart message when cart is opened with no items", async () => {
  mockBrowseQueries(db);
  db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

  const mod = await import("../scripts/browse.js");
  await mod.loadBrowseItems();

  document.getElementById("cart").click();

  expect(document.getElementById("cartList").innerHTML)
    .toContain("Your cart is empty.");

  expect(document.getElementById("numItemsCart").textContent)
    .toBe("0 items in cart");
});

test("closes cart modal when close button is clicked", async () => {
  mockBrowseQueries(db);
  db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

  const mod = await import("../scripts/browse.js");
  await mod.loadBrowseItems();

  document.getElementById("cart").click();
  document.getElementById("closeCartModal").click();

  expect(
    document.getElementById("item-edit-modal").classList.contains("hidden")
  ).toBe(true);
});

test("filters vegan items", async () => {
  mockBrowseQueries(db);
  db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

  const mod = await import("../scripts/browse.js");
  await mod.loadBrowseItems();

  document.getElementById("Vegan").checked = true;

  mockBrowseQueries(db);

  document.getElementById("Vegan")
    .dispatchEvent(new Event("click"));

  await flush();

  const html = document.getElementById("menu").innerHTML;

  expect(html).toContain("Burger");
  expect(html).not.toContain("Pizza");
  expect(html).not.toContain("Wrap");
});

test("filters halal items", async () => {
  mockBrowseQueries(db);
  db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

  const mod = await import("../scripts/browse.js");
  await mod.loadBrowseItems();

  document.getElementById("Halal").checked = true;

  mockBrowseQueries(db);

  document.getElementById("Halal")
    .dispatchEvent(new Event("click"));

  await flush();

  const html = document.getElementById("menu").innerHTML;

  expect(html).toContain("Wrap");
  expect(html).not.toContain("Burger");
  expect(html).not.toContain("Pizza");
});

test("filters gluten-free items", async () => {
  mockBrowseQueries(db);
  db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

  const mod = await import("../scripts/browse.js");
  await mod.loadBrowseItems();

  document.getElementById("Gluten-Free").checked = true;

  mockBrowseQueries(db);

  document.getElementById("Gluten-Free")
    .dispatchEvent(new Event("click"));

  await flush();

  const html = document.getElementById("menu").innerHTML;

  expect(html).toContain("Burger");
  expect(html).toContain("Wrap");
  expect(html).not.toContain("Pizza");
});

test("filters by category", async () => {
  mockBrowseQueries(db);
  db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

  const mod = await import("../scripts/browse.js");
  await mod.loadBrowseItems();

  document.getElementById("Categories").value = "Wraps";

  mockBrowseQueries(db);

  document.getElementById("Categories")
    .dispatchEvent(new Event("change"));

  await flush();

  const html = document.getElementById("menu").innerHTML;

  expect(html).toContain("Wrap");
  expect(html).not.toContain("Burger");
  expect(html).not.toContain("Pizza");
});
test("price slider filters items by max price", async () => {
  mockBrowseQueries(db);
  db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));

  const mod = await import("../scripts/browse.js");
  await mod.loadBrowseItems();

  const slider = document.getElementById("PriceSlider");

  expect(slider).not.toBeNull();

  slider.value = "40";

  mockBrowseQueries(db);

  slider.dispatchEvent(new Event("click", { bubbles: true }));

  await flush();

  expect(document.getElementById("PriceLabel").textContent)
    .toContain("Max Price: 40");

  const html = document.getElementById("menu").innerHTML;

  expect(html).not.toContain("Burger");
  expect(html).not.toContain("Pizza");
  expect(html).not.toContain("Wrap");
});

test("remove cart ignores invalid index", async () => {
  mockBrowseQueries(db);
  db.onAuthStateChanged.mockImplementation((_auth, cb) =>
    cb({ uid: "user-1" })
  );

  const mod = await import("../scripts/browse.js");
  await mod.loadBrowseItems();

  document.querySelector(".add-cart-btn").click();
  document.getElementById("cart").click();

  const btn = document.createElement("button");
  btn.className = "remove-cart-btn";
  btn.dataset.cartIndex = "invalid";

  document.getElementById("cartList").appendChild(btn);
  btn.click();

  expect(document.getElementById("cartList").innerHTML).toContain("Burger");
});

});