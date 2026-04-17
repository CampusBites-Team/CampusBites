/**
 * @jest-environment jsdom
 */

jest.mock('../scripts/database.js', () => ({
  db: {},
  auth: {
    onAuthStateChanged: jest.fn()
  },
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(() => "mockDocRef"),
  where: jest.fn(),
  query: jest.fn(),
  serverTimestamp: jest.fn(() => "timestamp"),
  storage: {},
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn()
}));

import {
  auth,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc
} from '../scripts/database.js';

describe("menu.js", () => {

  let fakeUser;

  beforeEach(() => {
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

    // mock lucide
    global.lucide = { createIcons: jest.fn() };

    fakeUser = { uid: "user123" };

    // mock auth callback
    auth.onAuthStateChanged.mockImplementation(cb => cb(fakeUser));

    // mock user data
    getDoc.mockResolvedValue({
      data: () => ({ shopName: "Test Shop" })
    });

    // prevent jsdom navigation crash
    delete window.location;

    window.location = {
      href: '',
      assign: jest.fn()
    };

    jest.clearAllMocks();
  });

  // helper to load module AFTER mocks
const loadModule = async () => {
  await import('../scripts/menuManagement.js');
  await new Promise(r => setTimeout(r, 10)); // increase delay slightly
};

  test("initialises and loads menu items", async () => {
    getDocs.mockResolvedValue({
      docs: []
    });

    await loadModule();

await Promise.resolve(); // flush microtasks

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

await Promise.resolve(); // flush microtasks

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

await Promise.resolve(); // flush microtasks

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

await Promise.resolve(); // flush microtasks

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
      data: () => ({ name: "Burger" })
    }
  ]
});

    await loadModule();

await Promise.resolve(); // flush microtasks

    await window.views.openEditItem("1");

    expect(document.getElementById("item-name").value).toBe("Burger");
    expect(document.getElementById("modal-title").textContent)
      .toBe("Edit Menu Item");
  });

  test("saveItem adds new item", async () => {
    getDocs.mockResolvedValue({
  docs: [
    {
      id: "1",
      data: () => ({ name: "Burger" })
    }
  ]
});
    await loadModule();

await Promise.resolve(); // flush microtasks

    document.getElementById("item-name").value = "Burger";
    document.getElementById("item-description").value = "Nice";
    document.getElementById("item-price").value = "50";
    document.getElementById("item-category").value = "Fast Food";

    const event = { preventDefault: jest.fn() };

    await window.vendorActions.saveItem(event);

    expect(addDoc).toHaveBeenCalled();
  });

  test("saveItem updates existing item", async () => {
    getDocs.mockResolvedValue({
  docs: [
    {
      id: "1",
      data: () => ({ name: "Burger" })
    }
  ]
});
    await loadModule();

await Promise.resolve(); // flush microtasks

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
    getDocs.mockResolvedValue({
  docs: [
    {
      id: "1",
      data: () => ({ name: "Burger" })
    }
  ]
});
    await loadModule();

await Promise.resolve(); // flush microtasks

    document.getElementById("add-item-btn").click();

    expect(document.getElementById("modal-title").textContent)
      .toBe("Add Menu Item");

    expect(document.getElementById("item-edit-modal")
      .classList.contains("hidden")).toBe(false);
  });

  test("redirects if no user", async () => {
    auth.onAuthStateChanged.mockImplementation(cb => cb(null));

    await loadModule();

await Promise.resolve(); // flush microtasks

    expect(window.location.assign).toHaveBeenCalledWith("index.html");
  });

});