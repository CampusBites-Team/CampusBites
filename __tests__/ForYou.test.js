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

    collection.mockImplementation((db, name) => name);
    where.mockReturnValue("whereUserId");
    query.mockReturnValue("ordersQuery");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("loads recommendations and trending items for logged in user", async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
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
          },
          {
            id: "item2",
            data: () => ({
              name: "Pizza",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 40,
              available: true,
              dietary: [],
              category: "Pizza",
              image: "pizza.jpg"
            })
          },
          {
            id: "item3",
            data: () => ({
              name: "Wrap",
              vendorId: "vendor1",
              vendorName: "Jimmy's",
              price: 35,
              available: true,
              dietary: ["Vegetarian"],
              category: "Healthy",
              image: "wrap.jpg"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: []
      });

    await loadForYou();

    const recommendationsHtml =
      document.getElementById("recommendations-grid").innerHTML;

    const trendingHtml =
      document.getElementById("trending-grid").innerHTML;

    expect(recommendationsHtml).toContain("Burger");
    expect(recommendationsHtml).toContain("Add to Cart");
    expect(trendingHtml).toContain("Pizza");
    expect(global.lucide.createIcons).toHaveBeenCalled();
  });

  test("adds recommended item to localStorage cart and updates cart count", async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
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
              image: "burger.jpg"
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: []
      });

    await loadForYou();

    document.querySelector(".add-to-cart-btn").click();

    const cart = JSON.parse(localStorage.getItem("cart"));

    expect(cart).toHaveLength(1);
    expect(cart[0].name).toBe("Burger");
    expect(document.getElementById("cartCount").textContent).toBe("1");
    expect(global.alert).toHaveBeenCalledWith("Item added to cart.");
  });

  test("shows fallback message when no recommendations are available", async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
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
      .toContain("No recommendations available yet.");

    expect(document.getElementById("trending-grid").innerHTML)
      .toContain("No trending items available.");
  });

  test("calls auth listener when page loads", async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
    });

    await loadForYou();

    expect(onAuthStateChanged).toHaveBeenCalled();
  });

  test("shows error message when loading recommendations fails", async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "user1" });
    });

    getDocs.mockRejectedValue(new Error("Firestore error"));

    await loadForYou();

    expect(document.getElementById("recommendations-grid").innerHTML)
      .toContain("Failed to load recommendations.");

    expect(document.getElementById("trending-grid").innerHTML)
      .toContain("Failed to load trending items.");
  });
  test("recommends items based on previous order dietary and category matches", async () => {
  onAuthStateChanged.mockImplementation((auth, callback) => {
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
                name: "Old Vegan Burger"
              }
            ]
          })
        }
      ]
    });

  await loadForYou();

  const html = document.getElementById("recommendations-grid").innerHTML;

  expect(html).toContain("New Vegan Wrap");
  expect(html).toContain("Plain Water");
});
});