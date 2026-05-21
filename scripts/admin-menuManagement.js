import {
  auth,
  db,
  onAuthStateChanged,
  getDoc,
  getDocs,
  updateDoc,
  doc,
  collection
} from "./database.js";
import { showToast } from "./toast.js";
globalThis.lucide?.createIcons?.();
let loadedMenuItems = [];
const tbody = document.getElementById("vendor-table-body");
const loginLink = document.getElementById("loginLink");
const logoutBtn = document.getElementById("logoutBtn");

function getStatusBadge(status) {
  const classes = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    suspended: "bg-red-100 text-red-800"
  };

  return `
    <span class="px-2 py-1 rounded-full text-xs font-semibold capitalize ${classes[status] || classes.pending}">
      ${status || "pending"}
    </span>
  `;
}

async function getVendorName(vendorId) {
  try {
    const vendorRef = doc(db, "users", vendorId);
    const vendorSnap = await getDoc(vendorRef);

    if (vendorSnap.exists()) {
      const vendor = vendorSnap.data();
      return vendor.shopName || vendor.fullName || "Unknown Vendor";
    }

    return "Unknown Vendor";
  } catch (error) {
    console.error("Error loading vendor:", error);
    return "Unknown Vendor";
  }
}

async function approveMenuItem(itemId) {
  try {
    await updateDoc(doc(db, "menu_items", itemId), {
      status: "approved",
      reviewReason: ""
    });

    showToast("Menu item approved successfully.","success");
    loadMenuItems();
  } catch (error) {
    console.error("Error approving menu item:", error);
    showToast("Failed to approve menu item.", "error");
  }
}

async function suspendMenuItem(itemId) {
  const reason = prompt("Enter the reason for suspending/rejecting this menu item:");

  if (!reason || reason.trim() === "") {
    showToast("Suspension reason is required.", "warning");
    return;
  }

  try {
    await updateDoc(doc(db, "menu_items", itemId), {
      status: "suspended",
      reviewReason: reason.trim()
    });

    showToast("Menu item suspended successfully.", "success");
    loadMenuItems();
  } catch (error) {
    console.error("Error suspending menu item:", error);
    showToast("Failed to suspend menu item.", "error");
  }
}
function showItemDetails(item) {
  const modal = document.getElementById("details-modal");
  if (!modal) return;


  modal.innerHTML = `
    <section class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <article class="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative shadow-xl">

        <button id="closeDetailsModal"
          class="absolute top-3 right-3 bg-white rounded-full p-1 shadow hover:bg-gray-100">
          ✕
        </button>

        <img
          src="${item.image || item.imageUrl || "assets/default_vendor.jpg"}"
          alt="${item.name || "Menu item"}"
          class="w-full h-52 object-cover rounded-t-2xl"
        >

        <section class="p-8">
          <section class="flex justify-between items-start mb-2">
            <section>
              <p class="text-sm text-indigo-600 font-medium">${item.vendorName || "Vendor"}</p>
              <h2 class="text-2xl font-bold text-gray-900">${item.name || "Unnamed Item"}</h2>
            </section>

            <section>
              <p class="font-bold text-indigo-600">
                R${Number(item.price || 0).toFixed(2)}
              </p>
            </section>
          </section>

          <p class="text-sm text-gray-600 mb-4">
            ${item.description || "No description available."}
          </p>

          <section class="mb-4">
            <h3 class="font-semibold text-sm mb-2 text-red-600">⚠ Allergens</h3>
            ${
              (item.allergens || []).length
                ? `<section class="flex flex-wrap gap-2">
                    ${(item.allergens || []).map(a => `
                      <span class="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full">
                        ${a}
                      </span>
                    `).join("")}
                  </section>`
                : `<p class="text-sm text-gray-500">No allergens listed.</p>`
            }
          </section>

          <section class="mb-4">
            <h3 class="font-semibold text-sm mb-2 text-green-600">✓ Dietary Information</h3>
            ${
              (item.dietary || []).length
                ? `<section class="flex flex-wrap gap-2">
                    ${(item.dietary || []).map(tag => `
                      <span class="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                        ${tag}
                      </span>
                    `).join("")}
                  </section>`
                : `<p class="text-sm text-gray-500">No dietary information listed.</p>`
            }
          </section>

          <section class="mb-4">
            <h3 class="font-semibold text-sm mb-2">Nutritional Info</h3>

            <section class="grid grid-cols-3 gap-3 text-center">
              <section class="bg-gray-50 rounded-lg p-3">
                <p class="font-bold">${item.calories || 320}</p>
                <p class="text-xs text-gray-500">kcal</p>
              </section>

              <section class="bg-gray-50 rounded-lg p-3">
                <p class="font-bold">${item.protein || "18"}g</p>
                <p class="text-xs text-gray-500">protein</p>
              </section>

              <section class="bg-gray-50 rounded-lg p-3">
                <p class="font-bold">${item.carbs || "18"}g</p>
                <p class="text-xs text-gray-500">carbs</p>
              </section>
            </section>
          </section>

          <section class="mt-4">
            <h3 class="font-semibold text-sm mb-2">Admin Review</h3>
            <p class="text-sm text-gray-600">
              ${item.reviewReason || "No admin review yet."}
            </p>
          </section>
        </section>
      </article>
    </section>
  `;

  modal.classList.remove("hidden");

  document.getElementById("closeDetailsModal")?.addEventListener("click", () => {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  });
globalThis.lucide?.createIcons?.();
}

async function loadMenuItems() {
  if (!tbody) return;
  loadedMenuItems = [];
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="px-6 py-4 text-center text-gray-500">
        Loading menu items...
      </td>
    </tr>
  `;

  try {
    const snapshot = await getDocs(collection(db, "menu_items"));

    if (snapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-4 text-center text-gray-500">
            No menu items found.
          </td>
        </tr>
      `;
      return;
    }

    const rows = await Promise.all(
      snapshot.docs.map(async (itemDoc) => {
        const item = itemDoc.data();
        const itemId = itemDoc.id;

        const vendorName = await getVendorName(item.vendorId);
        const status = item.status || "pending";
        const reviewReason = item.reviewReason || "No review yet.";
        const fullItem = {
        id: itemId,
        ...item,
        vendorName
        };

        loadedMenuItems.push(fullItem);

        return `
          <tr>
            <td class="px-6 py-4 text-sm text-gray-700">
              ${vendorName}
            </td>

            <td class="px-6 py-4">
              <section class="flex items-center gap-3">
                ${
                  item.image
                    ? `<img src="${item.image}" alt="${item.name}" class="w-12 h-12 rounded-lg object-cover">`
                    : `<section class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <i data-lucide="image" class="w-5 h-5 text-gray-400"></i>
                      </section>`
                }

                <section>
                  <button 
                    class="item-details-btn font-medium text-indigo-600 hover:underline text-left"
                    data-id="${itemId}">
                    ${item.name || "Unnamed Item"}
                    </button>
                  <p class="text-sm text-gray-500">R${item.price || 0}</p>
                </section>
              </section>
            </td>

            <td class="px-6 py-4">
              ${getStatusBadge(status)}
            </td>

            <td class="px-6 py-4">
              <section class="flex gap-2">
                <button 
                  class="approve-btn bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 text-sm"
                  data-id="${itemId}">
                  Approve
                </button>

                <button 
                  class="suspend-btn bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 text-sm"
                  data-id="${itemId}">
                  Suspend
                </button>
              </section>
            </td>

            <td class="px-6 py-4 text-sm text-gray-600">
              ${reviewReason}
            </td>
          </tr>
        `;
      })
    );

    tbody.innerHTML = rows.join("");
    lucide.createIcons();
    document.querySelectorAll(".item-details-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const selectedItem = loadedMenuItems.find(item => item.id === button.dataset.id);

            if (selectedItem) {
            showItemDetails(selectedItem);
            }
        });
    });

    document.querySelectorAll(".approve-btn").forEach((button) => {
      button.addEventListener("click", () => {
        approveMenuItem(button.dataset.id);
      });
    });

    document.querySelectorAll(".suspend-btn").forEach((button) => {
      button.addEventListener("click", () => {
        suspendMenuItem(button.dataset.id);
      });
    });
  } catch (error) {
    console.error("Error loading menu items:", error);

    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-4 text-center text-red-500">
          Failed to load menu items.
        </td>
      </tr>
    `;
  }
}

function logoutUser() {
  auth.signOut()
    .then(() => {
      window.location.assign("login.html");
    })
    .catch((error) => {
      console.error("Logout failed:", error);
    });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", logoutUser);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.assign("login.html");
    return;
  }

  if (loginLink) loginLink.classList.add("hidden");
  if (logoutBtn) logoutBtn.classList.remove("hidden");

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      window.location.assign("login.html");
      return;
    }

    const currentUser = userSnap.data();

    if (currentUser.role !== "admin") {
      showToast("Access denied. Admins only.", "warning");
      window.location.assign("index.html");
      return;
    }

    loadMenuItems();
  } catch (error) {
    console.error("Error checking admin access:", error);
    window.location.assign("login.html");
  }
});