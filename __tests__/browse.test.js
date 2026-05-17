/**
 * @jest-environment jsdom
 */

global.lucide = { createIcons: jest.fn() };

jest.mock("../scripts/database.js", () => ({
  auth: {},
  db: {},
  getDocs: jest.fn(),
  collection: jest.fn((db, collectionName) => collectionName),
  onAuthStateChanged: jest.fn()
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

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
    status: "approved",
    dietary: ["Vegan"],
    allergens: [],
    image: "burger.jpg"
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
    status: "approved",
    dietary: [],
    allergens: ["Gluten"],
    image: "pizza.jpg"
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
    status: "approved",
    dietary: ["Vegetarian"],
    allergens: [],
    image: "salad.jpg"
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
    status: "approved",
    dietary: ["Halal"],
    allergens: [],
    image: "wrap.jpg"
  },
  {
    id: "6",
    name: "Suspended Item",
    vendorName: "Shop1",
    vendorId: "vendor-1",
    price: 25,
    description: "Should not appear",
    category: "Mains",
    available: true,
    status: "suspended",
    dietary: [],
    allergens: [],
    image: "bad.jpg"
  },
  {
    id: "7",
    name: "Pending Item",
    vendorName: "Shop2",
    vendorId: "vendor-2",
    price: 30,
    description: "Should not appear",
    category: "Mains",
    available: true,
    status: "pending",
    dietary: [],
    allergens: [],
    image: "pending.jpg"
  }
];

const approvedVendors = [
  {
    id: "vendor-1",
    role: "vendor",
    status: "approved",
    shopName: "Shop1",
    location: "Matrix",
    rating: 4.1
  },
  {
    id: "vendor-2",
    role: "vendor",
    status: "approved",
    shopName: "Shop2",
    location: "Library Lawns",
    rating: 4.5
  },
  {
    id: "vendor-3",
    role: "vendor",
    status: "approved",
    shopName: "Shop3",
    location: "Great Hall",
    rating: 4.9
  },
  {
    id: "vendor-4",
    role: "vendor",
    status: "suspended",
    shopName: "Shop4",
    location: "Matrix",
    rating: 5
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

const mockBrowseQueries = (
  db,
  items = sampleItems,
  vendors = approvedVendors
) => {
  db.getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === "menu_items") return makeSnapshot(items);
    if (collectionName === "users") return makeSnapshot(vendors);
    return makeSnapshot([]);
  });
};

describe("browse.js", () => {
  let db;
  let alertSpy;
  let errorSpy;

  const bootBrowse = async () => {
    const mod = await import("../scripts/browse.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();
    await flush();

    return mod;
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    document.body.innerHTML = `
      <select id="Vendors">
        <option value="AllVendors">All Vendors</option>
      </select>

      <select id="VendorLocations">
        <option value="AllLocations">All Locations</option>
      </select>

      <select id="Categories">
        <option value="AllCategories">All Categories</option>
        <option value="Mains">Mains</option>
        <option value="Sides">Sides</option>
        <option value="Wraps">Wraps</option>
      </select>

      <select id="SortBy">
        <option value="Default">Default</option>
        <option value="PriceLowToHigh">Price: Low to High</option>
        <option value="PriceHighToLow">Price: High to Low</option>
        <option value="VendorNameAtoZ">Vendor Name: A to Z</option>
        <option value="VendorNameZtoA">Vendor Name: Z to A</option>
        <option value="Rating">Rating</option>
      </select>

      <input id="Vegan" type="checkbox" />
      <input id="Vegetarian" type="checkbox" />
      <input id="Gluten-Free" type="checkbox" />
      <input id="Halal" type="checkbox" />

      <label id="PriceLabel"></label>
      <input id="PriceSlider" type="range" />

      <button id="cart"></button>
      <button id="empty" class="hidden"></button>
      <button id="closeCartModal"></button>
      <button id="checkOut">Pay Now</button>

      <p id="numItems"></p>
      <p id="numItemsCart"></p>
      <span id="cartCount"></span>
      <section id="cartWarning" class="hidden"></section>

      <section id="menu"></section>
      <section id="item-edit-modal" class="hidden"></section>
      <section id="cartList"></section>
      <section id="details-modal" class="hidden"></section>
    `;

    localStorage.clear();
    sessionStorage.clear();

    db = require("../scripts/database.js");

    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    db.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
    });

    mockBrowseQueries(db);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("renders available approved items from approved vendors only", async () => {
    await bootBrowse();

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).toContain("Pizza");
    expect(html).toContain("Wrap");
    expect(html).not.toContain("Salad");
    expect(html).not.toContain("Suspended Item");
    expect(html).not.toContain("Pending Item");
  });

  test("updates count text", async () => {
    await bootBrowse();

    expect(document.getElementById("numItems").textContent).toBe("3 items found");
  });

  test("populates vendor filter", async () => {
    await bootBrowse();

    const html = document.getElementById("Vendors").innerHTML;

    expect(html).toContain("Shop1");
    expect(html).toContain("Shop2");
    expect(html).toContain("Shop3");
    expect(html).not.toContain("Shop4");
  });

  test("populates vendor location filter", async () => {
    await bootBrowse();

    const html = document.getElementById("VendorLocations").innerHTML;

    expect(html).toContain("Matrix");
    expect(html).toContain("Library Lawns");
    expect(html).toContain("Great Hall");
  });

  test("filters by vendor", async () => {
    await bootBrowse();

    document.getElementById("Vendors").value = "Shop1";
    document.getElementById("Vendors").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).not.toContain("Pizza");
    expect(html).not.toContain("Wrap");
  });

  test("filters by vendor location", async () => {
    await bootBrowse();

    document.getElementById("VendorLocations").value = "Great Hall";
    document.getElementById("VendorLocations").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Wrap");
    expect(html).not.toContain("Burger");
    expect(html).not.toContain("Pizza");
  });

  test("filters vegan items", async () => {
    await bootBrowse();

    document.getElementById("Vegan").checked = true;
    document.getElementById("Vegan").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).not.toContain("Pizza");
    expect(html).not.toContain("Wrap");
  });

  test("filters halal items", async () => {
    await bootBrowse();

    document.getElementById("Halal").checked = true;
    document.getElementById("Halal").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Wrap");
    expect(html).not.toContain("Burger");
    expect(html).not.toContain("Pizza");
  });

  test("filters gluten-free items", async () => {
    await bootBrowse();

    document.getElementById("Gluten-Free").checked = true;
    document.getElementById("Gluten-Free").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Burger");
    expect(html).toContain("Wrap");
    expect(html).not.toContain("Pizza");
  });

  test("filters vegetarian items", async () => {
    mockBrowseQueries(db, [
      {
        id: "10",
        name: "Veggie Bowl",
        vendorName: "Shop1",
        vendorId: "vendor-1",
        price: 40,
        description: "Vegetarian bowl",
        category: "Mains",
        available: true,
        status: "approved",
        dietary: ["Vegetarian"],
        allergens: [],
        image: "veg.jpg"
      }
    ]);

    await bootBrowse();

    document.getElementById("Vegetarian").checked = true;
    document.getElementById("Vegetarian").dispatchEvent(new Event("change"));

    expect(document.getElementById("menu").innerHTML).toContain("Veggie Bowl");
  });

  test("filters by category", async () => {
    await bootBrowse();

    document.getElementById("Categories").value = "Wraps";
    document.getElementById("Categories").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Wrap");
    expect(html).not.toContain("Burger");
    expect(html).not.toContain("Pizza");
  });

  test("price slider filters items by max price", async () => {
    await bootBrowse();

    const slider = document.getElementById("PriceSlider");
    slider.value = "49";
    slider.dispatchEvent(new Event("input"));

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("Wrap");
    expect(html).not.toContain("Burger");
    expect(html).not.toContain("Pizza");
    expect(document.getElementById("PriceLabel").textContent).toBe("Max Price: R49");
  });

  test("renders centered empty state when no items match", async () => {
    await bootBrowse();

    document.getElementById("Vendors").value = "Missing Vendor";
    document.getElementById("Vendors").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html).toContain("No menu items found");
    expect(document.getElementById("numItems").textContent).toBe("0 items found");
  });

  test("sorts by price low to high", async () => {
    await bootBrowse();

    document.getElementById("SortBy").value = "PriceLowToHigh";
    document.getElementById("SortBy").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html.indexOf("Wrap")).toBeLessThan(html.indexOf("Burger"));
    expect(html.indexOf("Burger")).toBeLessThan(html.indexOf("Pizza"));
  });

  test("sorts by price high to low", async () => {
    await bootBrowse();

    document.getElementById("SortBy").value = "PriceHighToLow";
    document.getElementById("SortBy").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html.indexOf("Pizza")).toBeLessThan(html.indexOf("Burger"));
    expect(html.indexOf("Burger")).toBeLessThan(html.indexOf("Wrap"));
  });

  test("sorts by vendor name A to Z", async () => {
    await bootBrowse();

    document.getElementById("SortBy").value = "VendorNameAtoZ";
    document.getElementById("SortBy").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html.indexOf("Shop1")).toBeLessThan(html.indexOf("Shop2"));
    expect(html.indexOf("Shop2")).toBeLessThan(html.indexOf("Shop3"));
  });

  test("sorts by vendor name Z to A", async () => {
    await bootBrowse();

    document.getElementById("SortBy").value = "VendorNameZtoA";
    document.getElementById("SortBy").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html.indexOf("Shop3")).toBeLessThan(html.indexOf("Shop2"));
    expect(html.indexOf("Shop2")).toBeLessThan(html.indexOf("Shop1"));
  });

  test("sorts by rating", async () => {
    await bootBrowse();

    document.getElementById("SortBy").value = "Rating";
    document.getElementById("SortBy").dispatchEvent(new Event("change"));

    const html = document.getElementById("menu").innerHTML;

    expect(html.indexOf("Wrap")).toBeLessThan(html.indexOf("Pizza"));
    expect(html.indexOf("Pizza")).toBeLessThan(html.indexOf("Burger"));
  });

  test("adds item to cart and opens cart modal", async () => {
    db.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer-1" });
    });

    await bootBrowse();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("cart").click();

    expect(document.getElementById("item-edit-modal").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("cartList").innerHTML).toContain("Burger");
    expect(document.getElementById("numItemsCart").textContent).toBe("1 item in cart");
  });

  test("limits cart to 10 items from the same vendor", async () => {
    await bootBrowse();

    const item = {
      id: "1",
      name: "Burger",
      vendorName: "Shop1",
      price: 50
    };

    const mod = await import("../scripts/browse.js");

    for (let i = 0; i < 10; i++) {
      mod.addToCart(item);
    }

    mod.addToCart(item);

    expect(alertSpy).toHaveBeenCalledWith("You can order at most 10 items from the same vendor");
  });

  test("removes item from cart", async () => {
    await bootBrowse();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("cart").click();
    document.querySelector(".remove-cart-btn").click();

    expect(document.getElementById("cartList").innerHTML).toContain("Your cart is empty.");
  });

  test("remove cart ignores invalid index", async () => {
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

  test("empties cart using empty button", async () => {
    await bootBrowse();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("cart").click();
    document.getElementById("empty").click();

    expect(JSON.parse(localStorage.getItem("cart") || "[]")).toEqual([]);
    expect(document.getElementById("cartList").innerHTML).toContain("Your cart is empty.");
  });

  test("shows warning when cart empty", async () => {
    db.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer-1" });
    });

    await bootBrowse();

    document.getElementById("checkOut").click();

    expect(document.getElementById("cartWarning").classList.contains("hidden")).toBe(false);
  });

  test("alerts when user not logged in", async () => {
    await bootBrowse();

    document.getElementById("checkOut").click();

    expect(alertSpy).toHaveBeenCalledWith("You must be logged in to proceed to checkout");
  });

  test("posts cart items to Paystack", async () => {
    db.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer-1" });
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        authorization_url: "https://paystack.com/pay/test",
        reference: "ref123"
      })
    });

    await bootBrowse();

    document.querySelector('.add-cart-btn[data-item-id="1"]').click();
    document.querySelector('.add-cart-btn[data-item-id="2"]').click();
    document.getElementById("checkOut").click();

    await flush();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/paystack/create-payment",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "customer-1",
          cart: [{ menuItemId: "1" }, { menuItemId: "2" }]
        })
      })
    );

    expect(JSON.parse(localStorage.getItem("cart") || "[]")).toEqual([]);
  });

  test("handles Paystack failure", async () => {
    db.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer-1" });
    });

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
    await bootBrowse();

    document.querySelector(".item-details-btn").click();

    const modal = document.getElementById("details-modal");

    expect(modal.classList.contains("hidden")).toBe(false);
    expect(modal.innerHTML).toContain("Burger");
  });

  test("renders vendor location in item details modal", async () => {
    await bootBrowse();

    document.querySelector(".item-details-btn").click();

    expect(document.getElementById("details-modal").innerHTML).toContain("Matrix");
  });

  test("closes item details modal when close button is clicked", async () => {
    await bootBrowse();

    document.querySelector(".item-details-btn").click();
    document.getElementById("closeDetailsModal").click();

    expect(document.getElementById("details-modal").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("details-modal").innerHTML).toBe("");
  });

  test("adds item to cart from details modal", async () => {
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
        vendorName: "Shop1",
        vendorId: "vendor-1",
        price: 20,
        description: "Simple",
        category: "Mains",
        available: true,
        status: "approved",
        dietary: [],
        allergens: []
      }
    ]);

    await bootBrowse();

    expect(document.getElementById("menu").innerHTML).toContain("Simple Food");
  });

  test("shows fallback location when vendor has no location", async () => {
    mockBrowseQueries(
      db,
      [
        {
          id: "10",
          name: "Simple Food",
          vendorName: "Shop1",
          vendorId: "vendor-1",
          price: 20,
          description: "Simple",
          category: "Mains",
          available: true,
          status: "approved",
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

    await bootBrowse();

    expect(document.getElementById("menu").innerHTML).toContain("Unknown location");
  });

  test("renders fallback description when item has no description", async () => {
    mockBrowseQueries(db, [
      {
        id: "10",
        name: "Simple Food",
        vendorName: "Shop1",
        vendorId: "vendor-1",
        price: 20,
        category: "Mains",
        available: true,
        status: "approved",
        dietary: [],
        allergens: []
      }
    ]);

    await bootBrowse();

    expect(document.getElementById("menu").innerHTML).toContain("No description available.");
  });

  test("renders unnamed item fallback", async () => {
    mockBrowseQueries(db, [
      {
        id: "10",
        vendorName: "Shop1",
        vendorId: "vendor-1",
        price: 20,
        description: "Simple",
        category: "Mains",
        available: true,
        status: "approved",
        dietary: [],
        allergens: []
      }
    ]);

    await bootBrowse();

    expect(document.getElementById("menu").innerHTML).toContain("Unnamed Item");
  });

  test("renders fallback vendor name", async () => {
    mockBrowseQueries(
      db,
      [
        {
          id: "10",
          name: "Simple Food",
          vendorId: "vendor-1",
          price: 20,
          description: "Simple",
          category: "Mains",
          available: true,
          status: "approved",
          dietary: [],
          allergens: []
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

    expect(document.getElementById("menu").innerHTML).toContain("Vendor");
  });

  test("renders default image fallback", async () => {
    mockBrowseQueries(db, [
      {
        id: "10",
        name: "Simple Food",
        vendorName: "Shop1",
        vendorId: "vendor-1",
        price: 20,
        description: "Simple",
        category: "Mains",
        available: true,
        status: "approved",
        dietary: [],
        allergens: []
      }
    ]);

    await bootBrowse();

    expect(document.getElementById("menu").innerHTML).toContain("assets/default.jpg");
  });

  test("renders empty allergens state in modal", async () => {
    await bootBrowse();

    document.querySelector(".item-details-btn").click();

    expect(document.getElementById("details-modal").innerHTML).toContain("No allergens listed.");
  });

  test("handles empty dietary information in modal", async () => {
    mockBrowseQueries(db, [
      {
        id: "20",
        name: "Plain Food",
        vendorName: "Shop1",
        vendorId: "vendor-1",
        price: 30,
        description: "Plain",
        category: "Mains",
        available: true,
        status: "approved",
        dietary: [],
        allergens: []
      }
    ]);

    await bootBrowse();

    document.querySelector(".item-details-btn").click();

    expect(document.getElementById("details-modal").innerHTML).toContain("No dietary information listed.");
  });

  test("renders modal allergen tags when item has allergens", async () => {
    mockBrowseQueries(db, [sampleItems[1]], [approvedVendors[1]]);

    await bootBrowse();

    document.querySelector(".item-details-btn").click();

    expect(document.getElementById("details-modal").innerHTML).toContain("Gluten");
  });

  test("renders singular item count", async () => {
    mockBrowseQueries(db, [sampleItems[0]], [approvedVendors[0]]);

    await bootBrowse();

    expect(document.getElementById("numItems").textContent).toBe("1 item found");
  });

  test("resets vendor filter when selected vendor no longer exists", async () => {
    document.getElementById("Vendors").innerHTML = `
      <option value="GhostVendor">GhostVendor</option>
    `;
    document.getElementById("Vendors").value = "GhostVendor";

    await bootBrowse();

    expect(document.getElementById("Vendors").value).toBe("AllVendors");
  });

  test("opens cart automatically when url hash is cart", async () => {
    window.location.hash = "#cart";

    await bootBrowse();

    expect(document.getElementById("item-edit-modal").classList.contains("hidden")).toBe(false);
  });

  test("closes cart modal when close button clicked", async () => {
    await bootBrowse();

    document.getElementById("cart").click();
    expect(document.getElementById("item-edit-modal").classList.contains("hidden")).toBe(false);

    document.getElementById("closeCartModal").click();
    expect(document.getElementById("item-edit-modal").classList.contains("hidden")).toBe(true);
  });

  test("shows empty cart button when cart has items at open", async () => {
    db.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer-1" });
    });

    await bootBrowse();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("cart").click();

    expect(document.getElementById("empty").classList.contains("hidden")).toBe(false);
  });

  test("resets location filter when selected location no longer exists", async () => {
    document.getElementById("VendorLocations").innerHTML = `
      <option value="GhostLocation">GhostLocation</option>
    `;
    document.getElementById("VendorLocations").value = "GhostLocation";

    await bootBrowse();

    expect(document.getElementById("VendorLocations").value).toBe("AllLocations");
  });

  test("alerts when Paystack response has no authorization_url", async () => {
    db.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "customer-1" });
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reference: "ref123" })
    });

    await bootBrowse();

    document.querySelector(".add-cart-btn").click();
    document.getElementById("checkOut").click();

    await flush();
    await flush();

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining("Payment provider did not return a redirect URL")
    );
    expect(document.getElementById("checkOut").disabled).toBe(false);
  });

  describe("cash payment flow", () => {
    test("posts cart items to /api/orders/create-cash when cash selected", async () => {
      db.onAuthStateChanged.mockImplementation((auth, callback) => {
        callback({ uid: "customer-1" });
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orderIds: ["o-1", "o-2"] })
      });

      await bootBrowse();

      document.querySelector('.add-cart-btn[data-item-id="1"]').click();
      document.querySelector('.add-cart-btn[data-item-id="2"]').click();

      const paymentRadio = document.createElement("input");
      paymentRadio.type = "radio";
      paymentRadio.name = "paymentMethod";
      paymentRadio.value = "cash";
      paymentRadio.checked = true;
      document.body.appendChild(paymentRadio);

      document.getElementById("checkOut").click();

      await flush();
      await flush();
      await flush();

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/orders/create-cash",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "customer-1",
            cart: [{ menuItemId: "1" }, { menuItemId: "2" }]
          })
        })
      );

      expect(JSON.parse(localStorage.getItem("cart") || "[]")).toEqual([]);
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("Pay the vendor in cash on collection")
      );
      expect(document.getElementById("item-edit-modal").classList.contains("hidden")).toBe(true);
    });

    test("alerts and re-enables button on cash order failure", async () => {
      db.onAuthStateChanged.mockImplementation((auth, callback) => {
        callback({ uid: "customer-1" });
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "vendor offline" })
      });

      await bootBrowse();

      document.querySelector(".add-cart-btn").click();

      const paymentRadio = document.createElement("input");
      paymentRadio.type = "radio";
      paymentRadio.name = "paymentMethod";
      paymentRadio.value = "cash";
      paymentRadio.checked = true;
      document.body.appendChild(paymentRadio);

      document.getElementById("checkOut").click();

      await flush();
      await flush();

      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("vendor offline"));
      expect(document.getElementById("checkOut").disabled).toBe(false);
    });

    test("falls back to generic error message when cash response has no error body", async () => {
      db.onAuthStateChanged.mockImplementation((auth, callback) => {
        callback({ uid: "customer-1" });
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => { throw new Error("not json"); }
      });

      await bootBrowse();

      document.querySelector(".add-cart-btn").click();

      const paymentRadio = document.createElement("input");
      paymentRadio.type = "radio";
      paymentRadio.name = "paymentMethod";
      paymentRadio.value = "cash";
      paymentRadio.checked = true;
      document.body.appendChild(paymentRadio);

      document.getElementById("checkOut").click();

      await flush();
      await flush();

      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("502"));
    });
  });
});