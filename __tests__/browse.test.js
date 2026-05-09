/**
 * @jest-environment jsdom
 */

global.lucide = { createIcons: jest.fn() };

jest.mock("../scripts/database.js", () => ({
  auth: {},
  db: {},
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn((db, collectionName) => collectionName),
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
  },
  {
    id: "6",
    name: "Suspended Vendor Item",
    vendorName: "Shop4",
    vendorId: "vendor-4",
    price: 25,
    description: "Should not show",
    category: "Mains",
    available: true,
    dietary: [],
    allergens: []
  }
];

const approvedVendors = [
  {
    id: "vendor-1",
    role: "vendor",
    status: "approved",
    shopName: "Shop1",
    location: "Matrix"
  },
  {
    id: "vendor-2",
    role: "vendor",
    status: "approved",
    shopName: "Shop2",
    location: "Library Lawns"
  },
  {
    id: "vendor-3",
    role: "vendor",
    status: "approved",
    shopName: "Shop3",
    location: "Great Hall"
  },
  {
    id: "vendor-4",
    role: "vendor",
    status: "suspended",
    shopName: "Shop4",
    location: "Unknown"
  }
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
  db.getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === "menu_items") {
      return makeSnapshot(items);
    }

    if (collectionName === "users") {
      return makeSnapshot(vendors);
    }

    return makeSnapshot([]);
  });
};
const bootBrowse = async () => {
  const mod = await import("../scripts/browse.js");

  document.dispatchEvent(new Event("DOMContentLoaded"));

  await flush();

  return mod;
};

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("browse.js", () => {
  let db;
  let alertSpy;
  let errorSpy;

  beforeEach(() => {
    jest.resetModules();

    document.body.innerHTML = `
      <select id="Vendors">
        <option value="AllVendors">All Vendors</option>
      </select>

      <select id="VendorLocations">
        <option value="AllLocations">All Locations</option>
      </select>

      <select id="SortBy">
        <option value="Default">Default</option>
        <option value="PriceLowToHigh">Price: Low to High</option>
        <option value="PriceHighToLow">Price: High to Low</option>
        <option value="VendorNameAtoZ">Vendor Name: A to Z</option>
        <option value="VendorNameZtoA">Vendor Name: Z to A</option>
        <option value="Rating">Rating</option>
      </select>

      <select id="Categories">
        <option value="AllCategories">All Categories</option>
        <option value="Mains">Mains</option>
        <option value="Sides">Sides</option>
        <option value="Wraps">Wraps</option>
      </select>

      <input id="Vegan" type="checkbox" />
      <input id="Vegetarian" type="checkbox" />
      <input id="Gluten-Free" type="checkbox" />
      <input id="Halal" type="checkbox" />

      <section id="PriceFilter">
        <label id="PriceLabel">Max Price: R200</label>
        <input id="PriceSlider" type="range" min="0" max="200" value="200" />
      </section>

      <button id="cart"></button>
      <p id="numItems"></p>
      <p id="numItemsCart"></p>
      <span id="cartCount"></span>
      <section id="cartWarning" class="hidden"></section>

      <section id="menu"></section>

      <section id="item-edit-modal" class="hidden"></section>
      <section id="cartList"></section>
      <section id="details-modal" class="hidden"></section>

      <button id="closeCartModal"></button>
      <button id="checkOut">Pay Now</button>
    `;

    localStorage.clear();

    db = require("../scripts/database.js");

    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb(null));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("renders available items from approved vendors only", async () => {
    mockBrowseQueries(db);

    await bootBrowse();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).toContain("Pizza");
    expect(html).toContain("Wrap");
    expect(html).not.toContain("Salad");
    expect(html).not.toContain("Suspended Vendor Item");
  });

  test("updates count text", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    expect(document.getElementById("numItems").textContent).toBe("3 items found");
  });

  test("populates vendor filter", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const vendors = document.getElementById("Vendors").innerHTML;

    expect(vendors).toContain("Shop1");
    expect(vendors).toContain("Shop2");
    expect(vendors).toContain("Shop3");
    expect(vendors).not.toContain("Shop4");
  });

  test("populates vendor location filter", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const locations = document.getElementById("VendorLocations").innerHTML;

    expect(locations).toContain("Matrix");
    expect(locations).toContain("Library Lawns");
    expect(locations).toContain("Great Hall");
  });

  test("filters by vendor", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const vendorSelect = document.getElementById("Vendors");
    vendorSelect.value = "Shop1";
    vendorSelect.dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).not.toContain("Pizza");
    expect(html).not.toContain("Wrap");
  });

  test("filters by vendor location", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const locationSelect = document.getElementById("VendorLocations");
    locationSelect.value = "Great Hall";
    locationSelect.dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Wrap");
    expect(html).not.toContain("Burger");
    expect(html).not.toContain("Pizza");
  });

  test("filters vegan items", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const veganInput = document.getElementById("Vegan");
    veganInput.checked = true;
    veganInput.dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).not.toContain("Pizza");
    expect(html).not.toContain("Wrap");
  });

  test("filters halal items", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const halalInput = document.getElementById("Halal");
    halalInput.checked = true;
    halalInput.dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Wrap");
    expect(html).not.toContain("Burger");
    expect(html).not.toContain("Pizza");
  });

  test("filters gluten-free items", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const glutenInput = document.getElementById("Gluten-Free");
    glutenInput.checked = true;
    glutenInput.dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).toContain("Wrap");
    expect(html).not.toContain("Pizza");
  });

  test("filters by category", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const categorySelect = document.getElementById("Categories");
    categorySelect.value = "Wraps";
    categorySelect.dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Wrap");
    expect(html).not.toContain("Burger");
    expect(html).not.toContain("Pizza");
  });

  test("price slider filters items by max price", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const slider = document.getElementById("PriceSlider");

    slider.value = "49";
    slider.dispatchEvent(new Event("input"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Wrap");
    expect(html).not.toContain("Burger");
    expect(html).not.toContain("Pizza");
    expect(document.getElementById("PriceLabel").textContent).toBe("Max Price: R49");
  });

  test("shows empty state when no items match filters", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const slider = document.getElementById("PriceSlider");

    slider.value = "0";
    slider.dispatchEvent(new Event("input"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("No menu items found");
    expect(html).toContain("Try changing your filters");
    expect(document.getElementById("numItems").textContent).toBe("0 items found");
  });

  test("sorts by price low to high", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const sortSelect = document.getElementById("SortBy");
    sortSelect.value = "PriceLowToHigh";
    sortSelect.dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html.indexOf("Wrap")).toBeLessThan(html.indexOf("Burger"));
    expect(html.indexOf("Burger")).toBeLessThan(html.indexOf("Pizza"));
  });

  test("sorts by price high to low", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const sortSelect = document.getElementById("SortBy");
    sortSelect.value = "PriceHighToLow";
    sortSelect.dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html.indexOf("Pizza")).toBeLessThan(html.indexOf("Burger"));
    expect(html.indexOf("Burger")).toBeLessThan(html.indexOf("Wrap"));
  });

  test("sorts by vendor name A to Z", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const sortSelect = document.getElementById("SortBy");
    sortSelect.value = "VendorNameAtoZ";
    sortSelect.dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html.indexOf("Shop1")).toBeLessThan(html.indexOf("Shop2"));
    expect(html.indexOf("Shop2")).toBeLessThan(html.indexOf("Shop3"));
  });

  test("sorts by vendor name Z to A", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    const sortSelect = document.getElementById("SortBy");
    sortSelect.value = "VendorNameZtoA";
    sortSelect.dispatchEvent(new Event("change"));

    await flush();

    const html = document.getElementById("menu").innerHTML;

    expect(html.indexOf("Shop3")).toBeLessThan(html.indexOf("Shop2"));
    expect(html.indexOf("Shop2")).toBeLessThan(html.indexOf("Shop1"));
  });

  test("adds item to cart and opens cart modal", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

   await bootBrowse();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("cart").click();

    expect(document.getElementById("item-edit-modal").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("cartList").innerHTML).toContain("Burger");
    expect(document.getElementById("numItemsCart").textContent).toBe("1 item in cart");
  });

  test("removes item from cart", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

    await bootBrowse();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("cart").click();
    document.querySelector(".remove-cart-btn").click();

    expect(document.getElementById("cartList").innerHTML).not.toContain("Burger");
  });

  test("renders empty cart message when cart is opened with no items", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    document.getElementById("cart").click();

    expect(document.getElementById("cartList").innerHTML).toContain("Your cart is empty.");
    expect(document.getElementById("numItemsCart").textContent).toBe("0 items in cart");
  });

  test("closes cart modal when close button is clicked", async () => {
    mockBrowseQueries(db);

    await bootBrowse();

    document.getElementById("cart").click();
    document.getElementById("closeCartModal").click();

    expect(document.getElementById("item-edit-modal").classList.contains("hidden")).toBe(true);
  });

  test("shows warning when cart empty", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

   await bootBrowse();

    document.getElementById("checkOut").click();

    expect(document.getElementById("cartWarning").classList.contains("hidden")).toBe(false);
  });

  test("alerts when user not logged in", async () => {
    mockBrowseQueries(db);

  await bootBrowse();

    document.getElementById("checkOut").click();

    expect(alertSpy).toHaveBeenCalledWith("You must be logged in to proceed to checkout");
  });

  test("posts cart items to PayFast and submits returned form", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        action: "https://sandbox.payfast.co.za/eng/process",
        fields: {
          merchant_id: "10000100",
          amount: "130.00",
          signature: "abc"
        }
      })
    });

    const submitSpy = jest
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => {});

    await bootBrowse();

    document.querySelector('.add-cart-btn[data-item-id="1"]').click();
    document.querySelector('.add-cart-btn[data-item-id="2"]').click();
    document.getElementById("checkOut").click();

    await flush();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/payfast/create-payment",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "customer-1",
          cart: [{ menuItemId: "1" }, { menuItemId: "2" }]
        })
      })
    );

    expect(document.querySelector('form[action="https://sandbox.payfast.co.za/eng/process"]')).toBeTruthy();
    expect(submitSpy).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("cart") || "[]")).toEqual([]);
  });

  test("handles PayFast failure", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" })
    });

    await bootBrowse();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("checkOut").click();

    await flush();

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("boom"));
    expect(document.getElementById("checkOut").disabled).toBe(false);
  });

  test("opens item details modal when Details button is clicked", async () => {
    mockBrowseQueries(db);

    await bootBrowse();

    document.querySelector(".item-details-btn").click();

    const modal = document.getElementById("details-modal");

    expect(modal.classList.contains("hidden")).toBe(false);
    expect(modal.innerHTML).toContain("Burger");
  });

  test("renders vendor location in item details modal", async () => {
    mockBrowseQueries(db, [sampleItems[0]], [approvedVendors[0]]);

   await bootBrowse();

    document.querySelector(".item-details-btn").click();

    expect(document.getElementById("details-modal").innerHTML).toContain("Matrix");
  });

  test("closes item details modal when close button is clicked", async () => {
    mockBrowseQueries(db);

   await bootBrowse();

    document.querySelector(".item-details-btn").click();
    document.getElementById("closeDetailsModal").click();

    expect(document.getElementById("details-modal").classList.contains("hidden")).toBe(true);
  });

  test("adds item to cart from details modal", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "customer-1" }));

    await bootBrowse();

    document.querySelector(".item-details-btn").click();
    document.getElementById("detailsAddToCart").click();

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    expect(cart).toHaveLength(1);
    expect(cart[0].name).toBe("Burger");
    expect(document.getElementById("details-modal").classList.contains("hidden")).toBe(true);
  });

  test("handles items with no dietary or allergens", async () => {
    mockBrowseQueries(db, [
      {
        id: "10",
        name: "Simple Food",
        vendorId: "vendor-1",
        price: 20,
        available: true
      }
    ]);

    await bootBrowse();

    expect(document.getElementById("menu").innerHTML).toContain("Simple Food");
  });

  test("remove cart ignores invalid index", async () => {
    mockBrowseQueries(db);
    db.onAuthStateChanged.mockImplementation((_auth, cb) => cb({ uid: "user-1" }));

    await bootBrowse();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("cart").click();

    const btn = document.createElement("button");
    btn.className = "remove-cart-btn";
    btn.dataset.cartIndex = "invalid";

    document.getElementById("cartList").appendChild(btn);
    btn.click();

    expect(document.getElementById("cartList").innerHTML).toContain("Burger");
  });
  test("shows fallback location when vendor has no location", async () => {
  mockBrowseQueries(
    db,
    [
      {
        id: "20",
        name: "Mystery Food",
        vendorId: "vendor-1",
        price: 30,
        available: true
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

  await bootBrowse();

  expect(document.getElementById("menu").innerHTML)
    .toContain("Unknown location");
});
test("renders fallback description when item has no description", async () => {
  mockBrowseQueries(
    db,
    [
      {
        id: "21",
        name: "No Description Food",
        vendorId: "vendor-1",
        price: 20,
        available: true
      }
    ]
  );

  await bootBrowse();

  expect(document.getElementById("menu").innerHTML)
    .toContain("No description available.");
});
test("renders unnamed item fallback", async () => {
  mockBrowseQueries(
    db,
    [
      {
        id: "22",
        vendorId: "vendor-1",
        price: 15,
        available: true
      }
    ]
  );

  await bootBrowse();

  expect(document.getElementById("menu").innerHTML)
    .toContain("Unnamed Item");
});
test("renders empty allergens state in modal", async () => {
  mockBrowseQueries(
    db,
    [
      {
        id: "23",
        name: "Simple Meal",
        vendorId: "vendor-1",
        price: 25,
        available: true,
        allergens: [],
        dietary: []
      }
    ]
  );

  await bootBrowse();

  document.querySelector(".item-details-btn").click();

  expect(document.getElementById("details-modal").innerHTML)
    .toContain("No allergens listed.");
});
test("renders fallback vendor name", async () => {
  mockBrowseQueries(
    db,
    [
      {
        id: "30",
        vendorId: "vendor-1",
        price: 10,
        available: true
      }
    ],
    [
      {
        id: "vendor-1",
        role: "vendor",
        status: "approved"
      }
    ]
  );

  await bootBrowse();

  expect(document.getElementById("menu").innerHTML)
    .toContain("Vendor");
});
test("renders default image fallback", async () => {
  mockBrowseQueries(
    db,
    [
      {
        id: "31",
        name: "Image Test",
        vendorId: "vendor-1",
        price: 20,
        available: true
      }
    ]
  );

  await bootBrowse();

  expect(document.getElementById("menu").innerHTML)
    .toContain("assets/default.jpg");
});
test("handles empty dietary information in modal", async () => {
  mockBrowseQueries(
    db,
    [
      {
        id: "32",
        name: "Plain Food",
        vendorId: "vendor-1",
        price: 15,
        available: true,
        allergens: [],
        dietary: []
      }
    ]
  );

  await bootBrowse();

  document.querySelector(".item-details-btn").click();

  expect(document.getElementById("details-modal").innerHTML)
    .toContain("No dietary information listed.");
});
test("renders singular item count", async () => {
  mockBrowseQueries(
    db,
    [
      {
        id: "33",
        name: "Single Item",
        vendorId: "vendor-1",
        price: 10,
        available: true
      }
    ]
  );

  await bootBrowse();

  expect(document.getElementById("numItems").textContent)
    .toBe("1 item found");
});
test("sorts by rating", async () => {
  mockBrowseQueries(db);

  await bootBrowse();

  const sortSelect = document.getElementById("SortBy");
  sortSelect.value = "Rating";
  sortSelect.dispatchEvent(new Event("change"));

  await flush();

  const html = document.getElementById("menu").innerHTML;

  expect(html.indexOf("Wrap")).toBeLessThan(html.indexOf("Pizza"));
  expect(html.indexOf("Pizza")).toBeLessThan(html.indexOf("Burger"));
});
test("resets vendor filter when selected vendor no longer exists", async () => {
  mockBrowseQueries(db);

  await bootBrowse();

  const vendorSelect = document.getElementById("Vendors");
  vendorSelect.value = "Shop1";

  mockBrowseQueries(db, [sampleItems[1]], [approvedVendors[1]]);

  const mod = await import("../scripts/browse.js");
  await mod.loadBrowseItems();

  expect(document.getElementById("Vendors").value).toBe("AllVendors");
});
test("resets location filter when selected location no longer exists", async () => {
  mockBrowseQueries(db);

  await bootBrowse();

  const locationSelect = document.getElementById("VendorLocations");
  locationSelect.value = "Matrix";

  mockBrowseQueries(db, [sampleItems[1]], [approvedVendors[1]]);

  const mod = await import("../scripts/browse.js");
  await mod.loadBrowseItems();

  expect(document.getElementById("VendorLocations").value).toBe("AllLocations");
});
test("renders modal allergen tags when item has allergens", async () => {
  mockBrowseQueries(db, [sampleItems[1]], [approvedVendors[1]]);

  await bootBrowse();

  document.querySelector(".item-details-btn").click();

  expect(document.getElementById("details-modal").innerHTML).toContain("Gluten");
});
test("filters vegetarian items", async () => {
  mockBrowseQueries(
    db,
    [
      {
        id: "40",
        name: "Veggie Bowl",
        vendorName: "Shop1",
        vendorId: "vendor-1",
        price: 35,
        description: "Vegetarian meal",
        category: "Mains",
        available: true,
        dietary: ["Vegetarian"],
        allergens: []
      }
    ],
    [approvedVendors[0]]
  );

  await bootBrowse();

  const vegetarianInput = document.getElementById("Vegetarian");
  vegetarianInput.checked = true;
  vegetarianInput.dispatchEvent(new Event("change"));

  await flush();

  expect(document.getElementById("menu").innerHTML).toContain("Veggie Bowl");
});
test("opens cart automatically when url hash is cart", async () => {
  mockBrowseQueries(db);

  window.location.hash = "#cart";

  await bootBrowse();

  expect(document.getElementById("item-edit-modal").classList.contains("hidden"))
    .toBe(false);
  expect(document.getElementById("cartList").innerHTML)
    .toContain("Your cart is empty.");

  window.location.hash = "";
});
test("payfast logs error when called without logged in user", async () => {
  mockBrowseQueries(db);

  await bootBrowse();

  const checkOutButton = document.getElementById("checkOut");

  checkOutButton.click();

  expect(alertSpy).toHaveBeenCalledWith("You must be logged in to proceed to checkout");
});
});