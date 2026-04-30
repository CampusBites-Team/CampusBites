import {
  db,
  getDocs,
  doc,
  deleteDoc,
  collection,
  auth,
  updateDoc,
  onAuthStateChanged,
  query,
  where
} from "./database.js";

let currentUser = null;
let ordersCache = [];
let orderIds = [];

// ----------------------
// Auth
// ----------------------
onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;

  if (!currentUser) {
    const tbody = document.getElementById("order-table-body");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="px-6 py-4 text-center text-gray-500">
            Please log in to view your orders.
          </td>
        </tr>
      `;
    }
    return;
  }

  await loadOrders();
});

// ----------------------
// Load current user's orders
// ----------------------
async function loadOrders() {
  if (!currentUser) return;

  try {
    const q = query(
      collection(db, "orders"),
      where("userId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(q);

    ordersCache = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    renderOrders(ordersCache);
  } catch (error) {
    console.error("Failed to load orders:", error);

    const tbody = document.getElementById("order-table-body");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="px-6 py-4 text-center text-red-500">
            Failed to load orders.
          </td>
        </tr>
      `;
    }
  }
}

// ----------------------
// Render orders table
// ----------------------
function renderOrders(orders) {
  const tbody = document.getElementById("order-table-body");
  if (!tbody) return;

  if (!orders.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="px-6 py-4 text-center text-gray-500">
          No orders found.
        </td>
      </tr>
    `;
    return;
  }

  let html = "";

  orders.forEach((order, index) => {
    const itemsHtml = (order.menuItems || [])
      .map(
        (item) => `
          <div class="flex flex-col items-center text-sm">
            <img
              src="${item.image || "assets/default.jpg"}"
              alt="${item.name || "Menu item"}"
              class="w-12 h-12 object-cover rounded-lg mb-2"
            >
            <span>${item.name || "Unnamed item"}</span>
          </div>
        `
      )
      .join("");

    html += `
      <tr>
        <td class="px-6 py-4">
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 max-w-[400px] md:max-w-[600px] place-items-center">
            ${itemsHtml}
          </div>
        </td>
        <td class="px-6 py-4">
          <button
            type="button"
            data-index="${-(index + 1)}"
            class="bg-indigo-600 text-white py-3 px-3 rounded-lg hover:bg-indigo-700"
          >
            Cancel Order
          </button>
        </td>
        <td class="px-6 py-4">
          <button
            type="button"
            data-index="${index}"
            class="bg-indigo-600 text-white py-3 px-3 rounded-lg hover:bg-indigo-700"
          >
            Details
          </button>
        </td>

        <td class="px-6 py-4">
          <span>${order.status || "pending"}</span>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// ----------------------
// Order details modal
// ----------------------
function updateDetails(order) {
  const container = document.getElementById("itemList");
  const countLabel = document.getElementById("numItemsOrder");

  if (!container || !countLabel) return;

  const items = order.menuItems || [];
  let html = "";

  items.forEach((item) => {
    html += `
      <article class="bg-white p-4 rounded-xl shadow-sm">
        <img
          src="${item.image || "assets/default.jpg"}"
          alt="${item.name || "Menu item"}"
          class="w-full h-48 object-cover rounded-lg mb-4"
        >

        <section class="flex justify-between items-start mb-2">
          <section>
            <h3 class="text-lg font-semibold">${item.name || "Unnamed item"}</h3>
            <p class="text-sm text-gray-500">${item.vendorName || "Vendor"}</p>
          </section>
          <span class="font-bold text-indigo-600">R${item.price ?? 0}</span>
        </section>

        <p class="text-sm text-gray-600 mb-3 line-clamp-2">
          ${item.description || ""}
        </p>

        ${
          item.dietary?.length
            ? `
          <section class="flex flex-wrap gap-1 mb-2">
            ${item.dietary
              .map(
                (tag) => `
              <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                ${tag}
              </span>
            `
              )
              .join("")}
          </section>
        `
            : ""
        }

        ${
          item.allergens?.length
            ? `
          <section class="flex flex-wrap gap-1 mb-3">
            <span class="text-xs text-orange-500 font-medium mr-1">⚠ Contains:</span>
            ${item.allergens
              .map(
                (allergen) => `
              <span class="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
                ${allergen}
              </span>
            `
              )
              .join("")}
          </section>
        `
            : '<section class="mb-3"></section>'
        }
      </article>
    `;
  });

  container.innerHTML = html;
  countLabel.textContent = `${items.length} item${items.length === 1 ? "" : "s"} in order`;

  globalThis.lucide?.createIcons?.();
}

async function updateOrderStatus(order, status) {
  try{
    await updateDoc(doc(db, "orders", order.id), {
      status: status
    });
    order.status = status;
    renderOrders(ordersCache);
  } catch(error){
    console.error(error);
    alert("Failed to cancel order");
    
  }
  
}

// ----------------------
// Table click handler
// ----------------------
document.getElementById("order-table-body")?.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-index]");
  if (!button) return;

  const index = Number(button.dataset.index);
  if(index >= 0){
    const order = ordersCache[index];
    if (!order) return;

    const modalTitle = document.getElementById("modal-title");
    const modal = document.getElementById("item-details-modal");

    if (modalTitle) modalTitle.textContent = "Items in Order";
    modal?.classList.remove("hidden");

    updateDetails(order);
  } else {
    const order = ordersCache[-(index + 1)];
    if (!order) return;
    //alert(order.status)
    if(order.status == "Pending" || order.status == "pending"){
      updateOrderStatus(order, "cancelled");
      
      
      
      
      
    } else if(order.status == "cancelled" || order.status == "Cancelled") {
      alert("Order is already cancelled");
    } else {
      alert("Order cannot be cancelled, it is already in progress.");
    }
    
    
    
  }
  
});