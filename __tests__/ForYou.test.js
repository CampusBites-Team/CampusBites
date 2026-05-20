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

describe("ForYou.js", () => {
  let onAuthStateChanged;
  let getDocs;
  let collection;
  let query;
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

    global.alert = jest.fn();

    jest.spyOn(console, "error").mockImplementation(() => {});

    localStorage.clear();

    const dbModule = await import("../scripts/database.js");

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

    const recommendationsHtml =
      document.getElementById("recommendations-grid").innerHTML;

    const favouriteHtml =
      document.getElementById("trending-grid").innerHTML;

    expect(recommendationsHtml).toContain("Halal Pizza");
    expect(recommendationsHtml).toContain("Add to Cart");
    expect(favouriteHtml).toContain("Old Burger");
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
    expect(global.alert).toHaveBeenCalledWith("Item added to cart.");
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

    const html = document.getElementById("recommendations-grid").innerHTML;

    expect(html).toContain("New Vegan Wrap");
    expect(html).not.toContain("Plain Water");
  });



});