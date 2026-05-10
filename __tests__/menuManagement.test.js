/**
 * @jest-environment jsdom
 */

global.lucide = { createIcons: jest.fn() };

jest.mock("../scripts/database.js", () => ({
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
  ref: jest.fn(() => "storageRef"),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn()
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("menuManagement.js", () => {
  let auth;
  let getDocs;
  let getDoc;
  let addDoc;
  let updateDoc;
  let deleteDoc;
  let uploadBytes;
  let getDownloadURL;

  const loadModule = async () => {
    await import("../scripts/menuManagement.js");
    await flush();
  };

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
      <input id="item-calories" />
      <input id="item-protein" />
      <input id="item-carbs" />
      <input id="item-image" type="file" />

      <section id="item-edit-modal" class="hidden"></section>
      <h2 id="modal-title"></h2>

      <button id="add-item-btn"></button>

      <input type="checkbox" class="item-allergen" value="nuts" />
      <input type="checkbox" class="item-dietary" value="vegan" />
    `;

    document.getElementById("item-form").reset = jest.fn();

    ({
      auth,
      getDocs,
      getDoc,
      addDoc,
      updateDoc,
      deleteDoc,
      uploadBytes,
      getDownloadURL
    } = require("../scripts/database.js"));

    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback({ uid: "user123" });
    });

    getDoc.mockResolvedValue({
      data: () => ({
        shopName: "Test Shop",
        role: "vendor",
        status: "approved"
      })
    });

    getDocs.mockResolvedValue({ docs: [] });

    global.alert = jest.fn();
    global.confirm = jest.fn(() => true);
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("initialises and loads menu items", async () => {
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
            image: "img.jpg",
            status: "approved",
            reviewReason: ""
          })
        }
      ]
    });

    await loadModule();

    const tbody = document.getElementById("menu-table-body");

    expect(tbody.innerHTML).toContain("Burger");
    expect(tbody.innerHTML).toContain("Fast Food");
    expect(tbody.innerHTML).toContain("R50");
    expect(tbody.innerHTML).toContain("approved");
  });

  test("shows suspended item status and admin review reason", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "item123",
          data: () => ({
            name: "Burger",
            image: "burger.jpg",
            category: "Main Course",
            price: 45,
            available: true,
            status: "suspended",
            reviewReason: "Image is unclear"
          })
        }
      ]
    });

    await loadModule();

    const html = document.getElementById("menu-table-body").innerHTML;

    expect(html).toContain("suspended");
    expect(html).toContain("Admin review: Image is unclear");
  });

  test("deleteItem deletes and refreshes", async () => {
    await loadModule();

    await window.views.deleteItem("123");

    expect(deleteDoc).toHaveBeenCalledWith("docRef");
  });

  test("deleteItem does nothing when confirm is cancelled", async () => {
    global.confirm = jest.fn(() => false);

    await loadModule();

    await window.views.deleteItem("123");

    expect(deleteDoc).not.toHaveBeenCalled();
  });

  test("toggleAvailability updates item", async () => {
    await loadModule();

    await window.views.toggleAvailability("123", true);

    expect(updateDoc).toHaveBeenCalledWith("docRef", {
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
            allergens: ["nuts"],
            dietary: ["vegan"],
            calories: 500,
            protein: 20,
            carbs: 45
          })
        }
      ]
    });

    await loadModule();

    await window.views.openEditItem("1");

    expect(document.getElementById("item-name").value).toBe("Burger");
    expect(document.getElementById("item-description").value).toBe("Nice");
    expect(document.getElementById("item-price").value).toBe("50");
    expect(document.getElementById("item-category").value).toBe("Fast Food");
    expect(document.getElementById("item-calories").value).toBe("500");
    expect(document.getElementById("item-protein").value).toBe("20");
    expect(document.getElementById("item-carbs").value).toBe("45");
    expect(document.querySelector(".item-allergen").checked).toBe(true);
    expect(document.querySelector(".item-dietary").checked).toBe(true);
    expect(document.getElementById("modal-title").textContent).toBe("Edit Menu Item");
  });

  test("openEditItem returns if item is not found", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    await loadModule();

    await window.views.openEditItem("missing");

    expect(document.getElementById("item-edit-modal").classList.contains("hidden")).toBe(true);
  });

  test("saveItem adds new item with pending status and empty review reason", async () => {
    await loadModule();

    document.getElementById("edit-item-id").value = "";
    document.getElementById("item-name").value = "Burger";
    document.getElementById("item-description").value = "Tasty burger";
    document.getElementById("item-price").value = "45";
    document.getElementById("item-category").value = "Main Course";

    await window.vendorActions.saveItem({
      preventDefault: jest.fn()
    });

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        vendorId: "user123",
        vendorName: "Test Shop",
        name: "Burger",
        description: "Tasty burger",
        price: 45,
        category: "Main Course",
        available: true,
        status: "pending",
        reviewReason: "",
        createdAt: "timestamp"
      })
    );
  });

  test("saveItem updates existing item and sends it back to pending", async () => {
    await loadModule();

    document.getElementById("edit-item-id").value = "item123";
    document.getElementById("item-name").value = "Updated Burger";
    document.getElementById("item-description").value = "Updated description";
    document.getElementById("item-price").value = "55";
    document.getElementById("item-category").value = "Main Course";

    await window.vendorActions.saveItem({
      preventDefault: jest.fn()
    });

    expect(updateDoc).toHaveBeenCalledWith(
      "docRef",
      expect.objectContaining({
        vendorId: "user123",
        vendorName: "Test Shop",
        name: "Updated Burger",
        description: "Updated description",
        price: 55,
        category: "Main Course",
        available: true,
        status: "pending",
        reviewReason: "",
        createdAt: "timestamp"
      })
    );
  });

  test("saveItem rejects negative price", async () => {
    await loadModule();

    document.getElementById("item-name").value = "Burger";
    document.getElementById("item-description").value = "Nice";
    document.getElementById("item-price").value = "-10";
    document.getElementById("item-category").value = "Fast Food";

    await window.vendorActions.saveItem({
      preventDefault: jest.fn()
    });

    expect(alert).toHaveBeenCalledWith("Price must be a positive amount greater than 0.");
    expect(addDoc).not.toHaveBeenCalled();
  });

  test("saveItem rejects zero price", async () => {
    await loadModule();

    document.getElementById("item-name").value = "Burger";
    document.getElementById("item-description").value = "Nice";
    document.getElementById("item-price").value = "0";
    document.getElementById("item-category").value = "Fast Food";

    await window.vendorActions.saveItem({
      preventDefault: jest.fn()
    });

    expect(alert).toHaveBeenCalledWith("Price must be a positive amount greater than 0.");
    expect(addDoc).not.toHaveBeenCalled();
  });

  test("saveItem rejects invalid image type", async () => {
    await loadModule();

    document.getElementById("item-name").value = "Burger";
    document.getElementById("item-description").value = "Nice";
    document.getElementById("item-price").value = "50";
    document.getElementById("item-category").value = "Fast Food";

    const badFile = new File(["fake"], "menu.gif", { type: "image/gif" });

    Object.defineProperty(document.getElementById("item-image"), "files", {
      value: [badFile],
      configurable: true
    });

    await window.vendorActions.saveItem({
      preventDefault: jest.fn()
    });

    expect(alert).toHaveBeenCalledWith("Only PNG and JPEG images are allowed.");
    expect(addDoc).not.toHaveBeenCalled();
  });

  test("saveItem rejects oversized image", async () => {
    await loadModule();

    document.getElementById("item-name").value = "Burger";
    document.getElementById("item-description").value = "Nice";
    document.getElementById("item-price").value = "50";
    document.getElementById("item-category").value = "Fast Food";

    const bigFile = new File(["fake"], "menu.png", { type: "image/png" });

    Object.defineProperty(bigFile, "size", {
      value: 6 * 1024 * 1024,
      configurable: true
    });

    Object.defineProperty(document.getElementById("item-image"), "files", {
      value: [bigFile],
      configurable: true
    });

    await window.vendorActions.saveItem({
      preventDefault: jest.fn()
    });

    expect(alert).toHaveBeenCalledWith("Image must be smaller than 5MB.");
    expect(addDoc).not.toHaveBeenCalled();
  });

  test("saveItem uploads valid png image", async () => {
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue("https://example.com/item.png");

    await loadModule();

    document.getElementById("item-name").value = "Burger";
    document.getElementById("item-description").value = "Nice";
    document.getElementById("item-price").value = "50";
    document.getElementById("item-category").value = "Fast Food";

    const goodFile = new File(["fake"], "menu.png", { type: "image/png" });

    Object.defineProperty(document.getElementById("item-image"), "files", {
      value: [goodFile],
      configurable: true
    });

    await window.vendorActions.saveItem({
      preventDefault: jest.fn()
    });

    expect(uploadBytes).toHaveBeenCalled();
    expect(getDownloadURL).toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        image: "https://example.com/item.png"
      })
    );
  });

  test("saveItem logs error when saving fails", async () => {
    addDoc.mockRejectedValueOnce(new Error("save failed"));

    await loadModule();

    document.getElementById("item-name").value = "Burger";
    document.getElementById("item-description").value = "Nice";
    document.getElementById("item-price").value = "50";
    document.getElementById("item-category").value = "Fast Food";

    await window.vendorActions.saveItem({
      preventDefault: jest.fn()
    });

    expect(console.error).toHaveBeenCalledWith(
      "Error saving item:",
      expect.any(Error)
    );
  });

  test("saveItem returns when no current user exists", async () => {
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback(null);
    });

    await loadModule();

    await window.vendorActions.saveItem({
      preventDefault: jest.fn()
    });

    expect(console.error).toHaveBeenCalledWith("No user logged in");
    expect(addDoc).not.toHaveBeenCalled();
  });

  test("Add button opens modal in add mode", async () => {
    await loadModule();

    document.getElementById("add-item-btn").click();

    expect(document.getElementById("modal-title").textContent).toBe("Add Menu Item");
    expect(document.getElementById("edit-item-id").value).toBe("");
    expect(document.getElementById("item-edit-modal").classList.contains("hidden")).toBe(false);
  });

  test("logs message if no user", async () => {
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback(null);
    });

    await loadModule();

    expect(console.log).toHaveBeenCalledWith("No user is signed in.");
  });
});