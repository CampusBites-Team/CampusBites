/**
 * @jest-environment jsdom
 */
global.lucide = { createIcons: jest.fn() };

jest.mock('../scripts/database.js', () => ({
  db: {},
  auth: {
    onAuthStateChanged: jest.fn()
  },

  addDoc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),

  collection: jest.fn(() => "collectionRef"),
  where: jest.fn(() => "whereClause"),
  query: jest.fn(() => "queryRef"),
  doc: jest.fn(() => "docRef"),

  serverTimestamp: jest.fn(() => "timestamp"),

  storage: {},
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn()
}));

describe("menu.js", () => {
  let auth, getDocs, getDoc, addDoc, updateDoc, deleteDoc;

 beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();

  document.body.innerHTML = `
    <table>
      <tbody id="menu-table-body"></tbody>
    </table>

    <form id="item-form"></form>
    <input id="edit-item-id" />
    <input id="item-name" />
    <input id="item-description" />
    <input id="item-price" />
    <input id="item-category" />
    <input id="item-image" type="file" />

    <div id="item-edit-modal" class="hidden"></div>
    <h2 id="modal-title"></h2>

    <button id="add-item-btn"></button>

    <input type="checkbox" class="item-allergen" value="nuts" />
    <input type="checkbox" class="item-dietary" value="vegan" />
  `;

  document.getElementById("item-form").reset = jest.fn();

  ({ auth, getDocs, getDoc, addDoc, updateDoc, deleteDoc } =
    require('../scripts/database.js'));

  auth.onAuthStateChanged.mockImplementation(cb => cb({ uid: "user123" }));

  getDoc.mockResolvedValue({
    data: () => ({ shopName: "Test Shop" })
  });
});
  const loadModule = async () => {
  await import('../scripts/menuManagement.js');
  await new Promise(r => setTimeout(r, 50));
};
  // tests...
   test("initialises and loads menu items", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    await loadModule();
    expect(getDocs).toHaveBeenCalled();
  });

  test("renders menu items in table", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "1",
          data: () => ({
            name: "Burger",
            category: "Fast Food",
            price: 50,
            available: true,
            image: "img.jpg"
          })
        }
      ]
    });

    await loadModule();
    await new Promise(r => setTimeout(r, 100));
    const tbody = document.getElementById("menu-table-body");
    expect(tbody.innerHTML).toContain("Burger");
    expect(tbody.innerHTML).toContain("Fast Food");
    expect(tbody.innerHTML).toContain("R50");
  });

  test("deleteItem deletes and refreshes", async () => {
    global.confirm = jest.fn(() => true);

    getDocs.mockResolvedValue({
      docs: [
        {
          id: "1",
          data: () => ({ name: "Burger" })
        }
      ]
    });

    await loadModule();
    await window.views.deleteItem("123");

    expect(deleteDoc).toHaveBeenCalled();
  });

  test("toggleAvailability updates item", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "1",
          data: () => ({ name: "Burger" })
        }
      ]
    });

    await loadModule();
    await window.views.toggleAvailability("123", true);

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      available: false
    });
  });

  test("openEditItem populates form", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "1",
          data: () => ({
            name: "Burger",
            description: "Nice",
            price: 50,
            category: "Fast Food",
            allergens: [],
            dietary: []
          })
        }
      ]
    });

    await loadModule();
    await window.views.openEditItem("1");

    expect(document.getElementById("item-name").value).toBe("Burger");
    expect(document.getElementById("modal-title").textContent)
      .toBe("Edit Menu Item");
  });

  test("saveItem adds new item", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    await loadModule();

    document.getElementById("item-name").value = "Burger";
    document.getElementById("item-description").value = "Nice";
    document.getElementById("item-price").value = "50";
    document.getElementById("item-category").value = "Fast Food";

    const event = { preventDefault: jest.fn() };

    await window.vendorActions.saveItem(event);

    expect(addDoc).toHaveBeenCalled();
  });

  test("saveItem updates existing item", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    await loadModule();

    document.getElementById("edit-item-id").value = "123";
    document.getElementById("item-name").value = "Burger";
    document.getElementById("item-description").value = "Nice";
    document.getElementById("item-price").value = "50";
    document.getElementById("item-category").value = "Fast Food";

    const event = { preventDefault: jest.fn() };

    await window.vendorActions.saveItem(event);

    expect(updateDoc).toHaveBeenCalled();
  });

  test("Add button opens modal in add mode", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    await loadModule();
    await new Promise(r => setTimeout(r, 100));

    document.getElementById("add-item-btn").click();

    expect(document.getElementById("modal-title").textContent)
      .toBe("Add Menu Item");

    expect(document.getElementById("item-edit-modal")
      .classList.contains("hidden")).toBe(false);
  });
 test("redirects if no user", async () => {
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

  auth.onAuthStateChanged.mockImplementation(cb => cb(null));

  await loadModule();

  expect(logSpy).toHaveBeenCalledWith("No user is signed in.");

  logSpy.mockRestore();
}); 
});