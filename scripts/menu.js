import {
  db,
  auth,
  onAuthStateChanged,
  signOut,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  doc,
  serverTimestamp
} from "./database.js";

// ── State ────────────────────────────────────────────────────────────────────
let currentVendorId = null;
let deleteTargetId  = null;

// ── Auth guard ───────────────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentVendorId = user.uid;
  loadMenuItems();
});

// ── Logout ──
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ── Helpers ─────────────────────────
function showError(msg) {
  const el = document.getElementById("form-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideError() {
  document.getElementById("form-error").classList.add("hidden");
}

function setSaveLoading(loading) {
  const btn     = document.getElementById("save-btn");
  const spinner = document.getElementById("save-spinner");
  const btnText = document.getElementById("save-btn-text");
  btn.disabled         = loading;
  btnText.textContent  = loading ? "Saving…" : "Save Item";
  spinner.classList.toggle("hidden", !loading);
}

function formatPrice(price) {
  return `R ${Number(price).toFixed(2)}`;
}

function getCheckedValues(selector) {
  return [...document.querySelectorAll(selector + ":checked")].map(c => c.value);
}

// ── Load & render menu items ────
export async function loadMenuItems() {
  const loading = document.getElementById("loading-state");
  const empty   = document.getElementById("empty-state");
  const table   = document.getElementById("menu-table-wrapper");
  const tbody   = document.getElementById("menu-table-body");

  loading.classList.remove("hidden");
  empty.classList.add("hidden");
  table.classList.add("hidden");

  try {
    const q        = query(collection(db, "menu_items"), where("vendorId", "==", currentVendorId));
    const snapshot = await getDocs(q);
    const items    = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    loading.classList.add("hidden");

    if (items.length === 0) {
      empty.classList.remove("hidden");
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td class="px-6 py-4">
          <article>
            <span class="font-medium block">${item.name}</span>
            <span class="text-xs text-gray-500">
              ${item.description.slice(0, 60)}${item.description.length > 60 ? "…" : ""}
            </span>
            ${item.allergens?.length
              ? `<span class="text-xs text-orange-500 block mt-0.5">⚠ ${item.allergens.join(", ")}</span>`
              : ""}
          </article>
        </td>

        <td class="px-6 py-4 text-sm text-gray-500">${item.category}</td>

        <td class="px-6 py-4 text-sm font-medium">${formatPrice(item.price)}</td>

        <td class="px-6 py-4">
          <section class="flex flex-wrap gap-1">
            ${(item.dietary || []).map(tag =>
              `<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">${tag}</span>`
            ).join("")}
          </section>
        </td>

        <td class="px-6 py-4">
          <span class="px-2 py-1 rounded-full text-xs font-medium
            ${item.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}">
            ${item.available ? "Available" : "Sold Out"}
          </span>
        </td>

        <td class="px-6 py-4">
          <section class="flex gap-3">
            <button onclick="window.menuActions.toggleAvailability('${item.id}', ${item.available})"
              class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              ${item.available ? "Mark Sold Out" : "Restock"}
            </button>
            <button onclick="window.menuActions.openEditItem('${item.id}')"
              class="text-sm text-gray-600 hover:text-gray-800 font-medium">
              Edit
            </button>
            <button onclick="window.menuActions.confirmDelete('${item.id}')"
              class="text-sm text-red-500 hover:text-red-700 font-medium">
              Delete
            </button>
          </section>
        </td>
      </tr>
    `).join("");

    table.classList.remove("hidden");

  } catch (err) {
    loading.classList.add("hidden");
    console.error("Error loading menu items:", err);
    alert("Failed to load menu items. Please refresh.");
  }
}

// ── Save item (add or edit) ─────────
export async function saveItem(e) {
  e.preventDefault();
  hideError();

  const name        = document.getElementById("item-name").value.trim();
  const description = document.getElementById("item-description").value.trim();
  const price       = parseFloat(document.getElementById("item-price").value);
  const category    = document.getElementById("item-category").value;
  const available   = document.getElementById("item-available").checked;
  const allergens   = getCheckedValues(".item-allergen");
  const dietary     = getCheckedValues(".item-dietary");
  const editId      = document.getElementById("edit-item-id").value;

  if (!name || !description || isNaN(price) || price < 0) {
    showError("Please fill in all required fields with valid values.");
    return;
  }

  setSaveLoading(true);

  const data = {
    name,
    description,
    price,
    category,
    available,
    allergens,
    dietary,
    vendorId:  currentVendorId,
    updatedAt: serverTimestamp()
  };

  try {
    if (editId) {
      // Update existing item
      await updateDoc(doc(db, "menu_items", editId), data);
    } else {
      // Add new item
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "menu_items"), data);
    }

    closeModal();
    await loadMenuItems();

  } catch (err) {
    console.error("Save error:", err);
    showError("Failed to save item. Please try again.");
  } finally {
    setSaveLoading(false);
  }
}

// ── Toggle availability ──────────────────────────────────────────────────────
export async function toggleAvailability(itemId, current) {
  try {
    await updateDoc(doc(db, "menu_items", itemId), { available: !current });
    await loadMenuItems();
  } catch (err) {
    console.error("Toggle error:", err);
    alert("Failed to update availability.");
  }
}

// ── Open edit modal prefilled 
export async function openEditItem(itemId) {
  try {
    const q        = query(collection(db, "menu_items"), where("vendorId", "==", currentVendorId));
    const snapshot = await getDocs(q);
    const item     = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).find(i => i.id === itemId);
    if (!item) return;

    document.getElementById("edit-item-id").value     = item.id;
    document.getElementById("item-name").value        = item.name;
    document.getElementById("item-description").value = item.description;
    document.getElementById("item-price").value       = item.price;
    document.getElementById("item-category").value    = item.category;
    document.getElementById("item-available").checked = item.available;

    document.querySelectorAll(".item-allergen").forEach(cb => {
      cb.checked = (item.allergens || []).includes(cb.value);
    });
    document.querySelectorAll(".item-dietary").forEach(cb => {
      cb.checked = (item.dietary || []).includes(cb.value);
    });

    hideError();
    document.getElementById("modal-title").textContent = "Edit Menu Item";
    document.getElementById("item-edit-modal").classList.remove("hidden");

  } catch (err) {
    console.error("Edit fetch error:", err);
    alert("Failed to load item for editing.");
  }
}

// ── Open add modal (blank) 
export function openAddItemModal() {
  document.getElementById("item-form").reset();
  document.getElementById("edit-item-id").value = "";
  document.getElementById("modal-title").textContent = "Add Menu Item";
  hideError();
  document.getElementById("item-edit-modal").classList.remove("hidden");
}

// ── Close item modal
export function closeModal() {
  document.getElementById("item-edit-modal").classList.add("hidden");
}

// ── Delete flow 
export function confirmDelete(itemId) {
  deleteTargetId = itemId;
  document.getElementById("delete-modal").classList.remove("hidden");
}

export function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById("delete-modal").classList.add("hidden");
}

document.getElementById("confirm-delete-btn")?.addEventListener("click", async () => {
  if (!deleteTargetId) return;
  try {
    await deleteDoc(doc(db, "menu_items", deleteTargetId));
    closeDeleteModal();
    await loadMenuItems();
  } catch (err) {
    console.error("Delete error:", err);
    alert("Failed to delete item.");
  }
});

// ── Wire up form submit
document.getElementById("item-form")?.addEventListener("submit", saveItem);

// ── Expose actions globally for inline onclick handlers 
window.menuActions = {
  openAddItemModal,
  openEditItem,
  toggleAvailability,
  confirmDelete,
  closeModal,
  closeDeleteModal
};


export function formatMenuPrice(price) {
  return `R${Number(price).toFixed(2)}`;
}

export function buildItemData({ vendorId, vendorName, name, description, price, category, allergens, dietary, imageUrl }) {
  const data = {
    vendorId,
    vendorName,
    name,
    description,
    price,
    category,
    allergens,
    dietary,
    available: true,
  };
  if (imageUrl) data.image = imageUrl;
  return data;
}