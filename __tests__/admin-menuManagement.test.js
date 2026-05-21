/**
 * @jest-environment jsdom
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

jest.mock("../scripts/database.js", () => ({
  auth: {
    signOut: jest.fn(() => Promise.resolve())
  },
  db: {},
  onAuthStateChanged: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn((db, collectionName, id) => ({
    collectionName,
    id,
    path: `${collectionName}/${id}`
  })),
  collection: jest.fn((db, collectionName) => collectionName)
}));
jest.mock("../scripts/toast.js", () => ({
  showToast: jest.fn()
}));

describe("admin-menuManagement.js", () => {
  let database;

  beforeEach(async () => {
    jest.resetModules();

    document.body.innerHTML = `
      <a id="loginLink"></a>
      <button id="logoutBtn" class="hidden"></button>

      <table>
        <tbody id="vendor-table-body"></tbody>
      </table>

      <section id="details-modal" class="hidden"></section>
    `;

    global.lucide = {
      createIcons: jest.fn()
    };

    global.alert = jest.fn();
    global.prompt = jest.fn();

    jest.spyOn(console, "error").mockImplementation(() => {});

const { showToast } = require("../scripts/toast.js");
    database = await import("../scripts/database.js");

    database.auth.signOut.mockResolvedValue();

    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "admin123" });
    });

    database.getDoc.mockImplementation(async (ref) => {
      if (ref.collectionName === "users" && ref.id === "admin123") {
        return {
          exists: () => true,
          data: () => ({
            role: "admin",
            fullName: "Admin User"
          })
        };
      }

      if (ref.collectionName === "users" && ref.id === "vendor123") {
        return {
          exists: () => true,
          data: () => ({
            role: "vendor",
            shopName: "Campus Café"
          })
        };
      }

      return {
        exists: () => false,
        data: () => ({})
      };
    });

    database.getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "item123",
          data: () => ({
            vendorId: "vendor123",
            vendorName: "Campus Café",
            name: "Chicken Burger",
            description: "Fresh grilled chicken burger",
            price: 45,
            category: "Main Course",
            image: "burger.jpg",
            status: "pending",
            reviewReason: "",
            available: true,
            allergens: ["Gluten"],
            dietary: ["Halal"],
            calories: 500,
            protein: 25,
            carbs: 40
          })
        }
      ]
    });

    database.updateDoc.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test("loads menu items for an admin user", async () => {
    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    expect(database.getDocs).toHaveBeenCalledTimes(1);
    expect(document.body.innerHTML).toContain("Campus Café");
    expect(document.body.innerHTML).toContain("Chicken Burger");
    expect(document.body.innerHTML).toContain("pending");
  });

  test("approves a menu item", async () => {
    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    const approveBtn = document.querySelector(".approve-btn");
    expect(approveBtn).not.toBeNull();

    approveBtn.click();

    await flush();

    expect(database.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionName: "menu_items",
        id: "item123"
      }),
      {
        status: "approved",
        reviewReason: ""
      }
    );

    expect(showToast).toHaveBeenCalledWith("Menu item approved successfully.");
  });

  test("suspends a menu item with review reason", async () => {
    prompt.mockReturnValue("Image is unclear.");

    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    const suspendBtn = document.querySelector(".suspend-btn");
    expect(suspendBtn).not.toBeNull();

    suspendBtn.click();

    await flush();

    expect(database.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionName: "menu_items",
        id: "item123"
      }),
      {
        status: "suspended",
        reviewReason: "Image is unclear."
      }
    );

    expect(showToast).toHaveBeenCalledWith("Menu item suspended successfully.","success");
  });

  test("does not suspend item without review reason", async () => {
    prompt.mockReturnValue("");

    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    const suspendBtn = document.querySelector(".suspend-btn");
    expect(suspendBtn).not.toBeNull();

    suspendBtn.click();

    await flush();

    expect(database.updateDoc).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("Suspension reason is required.");
  });

  test("opens item details modal when item name is clicked", async () => {
    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    const detailsBtn = document.querySelector(".item-details-btn");
    expect(detailsBtn).not.toBeNull();

    detailsBtn.click();

    const modalHtml = document.getElementById("details-modal").innerHTML;

    expect(modalHtml).toContain("Chicken Burger");
    expect(modalHtml).toContain("Fresh grilled chicken burger");
    expect(modalHtml).toContain("Gluten");
    expect(modalHtml).toContain("Halal");
    expect(modalHtml).toContain("Admin Review");
  });

  test("closes item details modal", async () => {
    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    document.querySelector(".item-details-btn").click();

    const closeBtn = document.getElementById("closeDetailsModal");
    expect(closeBtn).not.toBeNull();

    closeBtn.click();

    const modal = document.getElementById("details-modal");

    expect(modal.classList.contains("hidden")).toBe(true);
    expect(modal.innerHTML).toBe("");
  });

  test("shows empty message when there are no menu items", async () => {
    database.getDocs.mockResolvedValueOnce({
      empty: true,
      docs: []
    });

    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    expect(document.body.innerHTML).toContain("No menu items found.");
  });

  test("shows error message when menu items fail to load", async () => {
    database.getDocs.mockRejectedValueOnce(new Error("Firestore failed"));

    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    expect(document.body.innerHTML).toContain("Failed to load menu items.");
  });

  test("blocks non-admin users", async () => {
    database.getDoc.mockImplementation(async (ref) => {
      if (ref.collectionName === "users" && ref.id === "admin123") {
        return {
          exists: () => true,
          data: () => ({
            role: "vendor"
          })
        };
      }

      return {
        exists: () => false,
        data: () => ({})
      };
    });

    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    expect(showToast).toHaveBeenCalledWith("Access denied. Admins only.");
  });

  test("does not load menu items when user is not logged in", async () => {
    database.onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
    });

    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    expect(database.getDocs).not.toHaveBeenCalled();
  });

  test("does not load menu items when admin document does not exist", async () => {
    database.getDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => ({})
    });

    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    expect(database.getDocs).not.toHaveBeenCalled();
  });

  test("logs out user", async () => {
    await import("../scripts/admin-menuManagement.js");

    await flush();
    await flush();

    document.getElementById("logoutBtn").click();

    await flush();

    expect(database.auth.signOut).toHaveBeenCalled();
  });
test("handles unknown vendor", async () => {
  database.getDoc.mockImplementation(async (ref) => {
    if (ref.collectionName === "users" && ref.id === "admin123") {
      return {
        exists: () => true,
        data: () => ({
          role: "admin",
          fullName: "Admin User"
        })
      };
    }

    if (ref.collectionName === "users" && ref.id === "vendor123") {
      return {
        exists: () => false,
        data: () => ({})
      };
    }

    return {
      exists: () => false,
      data: () => ({})
    };
  });

  await import("../scripts/admin-menuManagement.js");

  await flush();
  await flush();

  expect(document.body.innerHTML).toContain("Unknown Vendor");
});
test("handles approve failure", async () => {
  database.updateDoc.mockRejectedValueOnce(new Error("fail"));

  await import("../scripts/admin-menuManagement.js");

  await flush();
  await flush();

  document.querySelector(".approve-btn").click();

  await flush();

  expect(showToast).toHaveBeenCalledWith("Failed to approve menu item.");
});
test("handles vendor fetch error gracefully", async () => {
  database.getDoc.mockImplementation(async (ref) => {
    if (ref.collectionName === "users" && ref.id === "admin123") {
      return {
        exists: () => true,
        data: () => ({ role: "admin" })
      };
    }

    if (ref.collectionName === "users" && ref.id === "vendor123") {
      throw new Error("Firestore failed");
    }

    return { exists: () => false };
  });

  await import("../scripts/admin-menuManagement.js");

  await flush();
  await flush();

  expect(document.body.innerHTML).toContain("Unknown Vendor");
});
test("handles logout failure", async () => {
  database.auth.signOut.mockRejectedValueOnce(new Error("logout failed"));

  await import("../scripts/admin-menuManagement.js");

  await flush();
  await flush();

  document.getElementById("logoutBtn").click();

  await flush();

  expect(console.error).toHaveBeenCalledWith(
    "Logout failed:",
    expect.any(Error)
  );
});
test("rejects suspend when reason is only spaces", async () => {
  prompt.mockReturnValue("   ");

  await import("../scripts/admin-menuManagement.js");

  await flush();
  await flush();

  document.querySelector(".suspend-btn").click();

  await flush();

  expect(showToast).toHaveBeenCalledWith("Suspension reason is required.");
});
});