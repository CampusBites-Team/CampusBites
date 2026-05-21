/**
 * @jest-environment jsdom
 */

jest.mock("../scripts/database.js", () => ({
  db: {},
  auth: {},
  onAuthStateChanged: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn()
}));
jest.mock("../scripts/toast.js", () => ({
  showToast: jest.fn()
}));

describe("ForYou.js", () => {
  let onAuthStateChanged;
  let getDocs;
  let collection;
  let query;
  let showToast;
  let where;

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  async function loadForYou() {
    await import("../scripts/ForYou.js");
    await flushPromises();
  }
  beforeEach(async () => {
    jest.resetModules();

    document.body.innerHTML = `
      <button id="cartBtn"></button>
      <span id="cartCount">0</span>
      <section id="recommendations-grid"></section>
      <section id="trending-grid"></section>
    `;

    global.lucide = {
      createIcons: jest.fn()
    };


    jest.spyOn(console, "error").mockImplementation(() => {});

    localStorage.clear();

    const dbModule = await import("../scripts/database.js");
    showToast = (await import("../scripts/toast.js")).showToast;

    onAuthStateChanged = dbModule.onAuthStateChanged;
    getDocs = dbModule.getDocs;
    collection = dbModule.collection;
    query = dbModule.query;
    where = dbModule.where;

    onAuthStateChanged.mockReset();
    getDocs.mockReset();
    collection.mockReset();
    query.mockReset();
    where.mockReset();

    collection.mockImplementation((_db, name) => name);
    where.mockReturnValue("whereUserId");
    query.mockReturnValue("ordersQuery");
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test("shows empty recommendation and favourite messages when user has no previous orders", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor1",
            data: () => ({
              role: "vendor",
              status: "approved",
              shopName: "Jimmy's"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "item1",
            data: () => ({
              name: "Burger",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 25,
              available: true,
              dietary: ["Halal"],
              category: "Fast Food",
              image: "burger.jpg"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: []
      });

    await loadForYou();

    expect(document.getElementById("recommendations-grid").innerHTML)
      .toContain("No recommendations yet.");

    expect(document.getElementById("trending-grid").innerHTML)
      .toContain("No favourite items yet.");
  });

  test("loads recommendations and favourite items for logged in user with previous orders", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor1",
            data: () => ({
              role: "vendor",
              status: "approved",
              shopName: "Jimmy's"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "oldItem",
            data: () => ({
              name: "Old Burger",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 25,
              available: true,
              dietary: ["Halal"],
              allergens: ["Nuts"],
              category: "Fast Food",
              image: "old.jpg"
            })
          },
          {
            id: "item2",
            data: () => ({
              name: "Halal Pizza",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 40,
              available: true,
              dietary: ["Halal"],
              allergens: ["Nuts"],
              category: "Fast Food",
              image: "pizza.jpg"
            })
          },
          {
            id: "item3",
            data: () => ({
              name: "Plain Water",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 10,
              available: true,
              dietary: [],
              allergens: [],
              category: "Beverages",
              image: "water.jpg"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "order1",
            data: () => ({
              userId: "user1",
              menuItems: [
                {
                  id: "oldItem",
                  name: "Old Burger",
                  dietary: ["Halal"],
                  allergens: ["Nuts"],
                  category: "Fast Food"
                }
              ]
            })
          }
        ]
      });

    await loadForYou();

    expect(document.getElementById("recommendations-grid").innerHTML)
      .toContain("Halal Pizza");

    expect(document.getElementById("recommendations-grid").innerHTML)
      .toContain("Add to Cart");

    expect(document.getElementById("trending-grid").innerHTML)
      .toContain("Old Burger");

    expect(global.lucide.createIcons).toHaveBeenCalled();
  });

  test("adds recommended item to localStorage cart and updates cart count", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor1",
            data: () => ({
              role: "vendor",
              status: "approved",
              shopName: "Jimmy's"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "oldItem",
            data: () => ({
              name: "Old Burger",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 25,
              available: true,
              dietary: ["Halal"],
              category: "Fast Food",
              image: "old.jpg"
            })
          },
          {
            id: "item1",
            data: () => ({
              name: "Burger",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 25,
              available: true,
              dietary: ["Halal"],
              category: "Fast Food",
              image: "burger.jpg"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "order1",
            data: () => ({
              userId: "user1",
              menuItems: [
                {
                  id: "oldItem",
                  name: "Old Burger",
                  dietary: ["Halal"],
                  category: "Fast Food"
                }
              ]
            })
          }
        ]
      });

    await loadForYou();

    document.querySelector(".add-to-cart-btn").click();

    const cart = JSON.parse(localStorage.getItem("cart"));

    expect(cart).toHaveLength(1);
    expect(cart[0].name).toBe("Burger");
    expect(document.getElementById("cartCount").textContent).toBe("1");
    expect(showToast).toHaveBeenCalledWith("Item added to cart.", "success");
  });

  test("shows fallback message when no menu items and no orders are available", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor1",
            data: () => ({
              role: "vendor",
              status: "approved",
              shopName: "Jimmy's"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: []
      })
      .mockResolvedValueOnce({
        docs: []
      });

    await loadForYou();

    expect(document.getElementById("recommendations-grid").innerHTML)
      .toContain("No recommendations yet.");

    expect(document.getElementById("trending-grid").innerHTML)
      .toContain("No favourite items yet.");
  });

  test("shows error message when loading recommendations fails", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs.mockRejectedValue(new Error("Firestore error"));

    await loadForYou();

    expect(document.getElementById("recommendations-grid").innerHTML)
      .toContain("Failed to load recommendations.");

    expect(document.getElementById("trending-grid").innerHTML)
      .toContain("Failed to load favourite items.");
  });

  test("recommends items based on previous order dietary, allergen and category matches", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor1",
            data: () => ({
              role: "vendor",
              status: "approved",
              shopName: "Jimmy's"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "oldItem",
            data: () => ({
              name: "Old Vegan Burger",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 30,
              available: true,
              dietary: ["Vegan"],
              allergens: ["Soy"],
              category: "Fast Food"
            })
          },
          {
            id: "newItem",
            data: () => ({
              name: "New Vegan Wrap",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 35,
              available: true,
              dietary: ["Vegan"],
              allergens: ["Soy"],
              category: "Fast Food"
            })
          },
          {
            id: "otherItem",
            data: () => ({
              name: "Plain Water",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 10,
              available: true,
              dietary: [],
              allergens: [],
              category: "Beverages"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "order1",
            data: () => ({
              userId: "user1",
              items: [
                {
                  id: "oldItem",
                  name: "Old Vegan Burger",
                  dietary: ["Vegan"],
                  allergens: ["Soy"],
                  category: "Fast Food"
                }
              ]
            })
          }
        ]
      });

    await loadForYou();

    expect(document.getElementById("recommendations-grid").innerHTML)
      .toContain("New Vegan Wrap");

    expect(document.getElementById("recommendations-grid").innerHTML)
      .not.toContain("Plain Water");
  });

  test("calls auth listener when page loads and handles logged out user", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
    });

    await loadForYou();

    expect(onAuthStateChanged).toHaveBeenCalled();
  });

  test("cart button exists after page load", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    await loadForYou();

    expect(document.getElementById("cartBtn")).not.toBeNull();
  });

  test("adds duplicate item as a separate cart entry", async () => {
    localStorage.setItem("cart", JSON.stringify([
      {
        id: "item1",
        name: "Burger",
        vendorId: "vendor1",
        quantity: 1
      }
    ]));

    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor1",
            data: () => ({
              role: "vendor",
              status: "approved",
              shopName: "Jimmy's"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "oldItem",
            data: () => ({
              name: "Old Burger",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 25,
              available: true,
              dietary: ["Halal"],
              category: "Fast Food"
            })
          },
          {
            id: "item1",
            data: () => ({
              name: "Burger",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 25,
              available: true,
              dietary: ["Halal"],
              category: "Fast Food"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "order1",
            data: () => ({
              userId: "user1",
              menuItems: [
                {
                  id: "oldItem",
                  name: "Old Burger",
                  dietary: ["Halal"],
                  category: "Fast Food"
                }
              ]
            })
          }
        ]
      });

    await loadForYou();

    document.querySelector(".add-to-cart-btn").click();

    const cart = JSON.parse(localStorage.getItem("cart"));

    expect(cart).toHaveLength(2);
    expect(cart[0].name).toBe("Burger");
    expect(cart[1].name).toBe("Burger");
    expect(document.getElementById("cartCount").textContent).toBe("2");
  });

  test("filters out unavailable menu items", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor1",
            data: () => ({
              role: "vendor",
              status: "approved",
              shopName: "Jimmy's"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "oldItem",
            data: () => ({
              name: "Old Burger",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 25,
              available: true,
              dietary: ["Halal"],
              category: "Fast Food"
            })
          },
          {
            id: "item-unavailable",
            data: () => ({
              name: "Unavailable Pizza",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 40,
              available: false,
              dietary: ["Halal"],
              category: "Fast Food"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "order1",
            data: () => ({
              userId: "user1",
              menuItems: [
                {
                  id: "oldItem",
                  name: "Old Burger",
                  dietary: ["Halal"],
                  category: "Fast Food"
                }
              ]
            })
          }
        ]
      });

    await loadForYou();

    expect(document.getElementById("recommendations-grid").innerHTML)
      .not.toContain("Unavailable Pizza");
  });

  test("ignores vendors that are not approved", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor1",
            data: () => ({
              role: "vendor",
              status: "pending",
              shopName: "Pending Vendor"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "item1",
            data: () => ({
              name: "Pending Vendor Burger",
              vendorId: "vendor1",
              vendorName: "Pending Vendor",
              price: 25,
              available: true,
              dietary: ["Halal"],
              category: "Fast Food"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: []
      });

    await loadForYou();

    expect(document.getElementById("recommendations-grid").innerHTML)
      .toContain("No recommendations yet.");
  });

  test("renders fallback item name, image, vendor name, and price", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: "vendor1",
            data: () => ({
              role: "vendor",
              status: "approved"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "oldItem",
            data: () => ({
              itemName: "Old Fallback Item",
              vendorId: "vendor1",
              available: true,
              category: "Meals"
            })
          },
          {
            id: "newItem",
            data: () => ({
              vendorId: "vendor1",
              available: true,
              category: "Meals"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "order1",
            data: () => ({
              userId: "user1",
              menuItems: [
                {
                  id: "oldItem",
                  name: "Old Fallback Item",
                  category: "Meals"
                }
              ]
            })
          }
        ]
      });

    await loadForYou();

    const html = document.getElementById("recommendations-grid").innerHTML;

    expect(html).toContain("Unnamed Item");
    expect(html).toContain("assets/default_food.jpg");
    expect(html).toContain("Campus Vendor");
    expect(html).toContain("R0.00");
  });

  test("handles missing recommendation and trending grids safely", async () => {
    document.body.innerHTML = `
      <button id="cartBtn"></button>
      <span id="cartCount">0</span>
    `;

    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs
      .mockResolvedValueOnce({
        docs: []
      })
      .mockResolvedValueOnce({
        docs: []
      })
      .mockResolvedValueOnce({
        docs: []
      });

    await loadForYou();

    expect(global.lucide.createIcons).toHaveBeenCalled();
  });
});