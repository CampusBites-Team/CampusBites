import {
  auth,
  db,
  onAuthStateChanged,
  getDocs,
  getDoc,
  collection,
  query,
  where,
  doc
} from "./database.js";

import {
  formatTimestamp
} from "./orders.js";

let orders = [];
let sortBy = "Newest";
let customerSearch = "";

// ---------------- AUTH ----------------
onAuthStateChanged(auth, async (user) => {

  /* c8 ignore next */
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userSnap = await getDoc(
    doc(db, "users", user.uid)
  );
  /* c8 ignore next */
  if (!userSnap.exists()) {
    window.location.href = "login.html";
    return;
  }

  const userData = userSnap.data();
  /* c8 ignore next */
  if (userData.role !== "vendor") {
    window.location.href = "index.html";
    return;
  }

  await loadOrderHistory(user.uid);
});
async function enrichOrdersWithCustomerNames(orders) {

  return Promise.all(

    orders.map(async (order) => {

      try {

        if (!order.userId) {
          return {
            ...order,
            customerName: "Unknown Customer"
          };
        }

        const customerSnap = await getDoc(
          doc(db, "users", order.userId)
        );

        if (!customerSnap.exists()) {
          return {
            ...order,
            customerName: "Unknown Customer"
          };
        }

        const customerData = customerSnap.data();

        return {
          ...order,
          customerName:
            customerData.fullName ||
            customerData.name ||
            "Unknown Customer"
        };

      } catch (error) {

        console.error(
          "Failed to fetch customer:",
          error
        );

        return {
          ...order,
          customerName: "Unknown Customer"
        };
      }

    })
  );
}

// ---------------- LOAD ORDERS ----------------
async function loadOrderHistory(vendorId) {

  const snapshot = await getDocs(
    query(
      collection(db, "orders"),
      where("vendorId", "==", vendorId),
      where("status", "==", "Collected")
    )
  );

    const rawOrders = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
    }));

    orders = await enrichOrdersWithCustomerNames(rawOrders);

  renderOrders();
}

// ---------------- SORTING ----------------
function sortOrders(data) {

  const sorted = [...data];

  if (sortBy === "Newest") {
    sorted.sort((a, b) =>
      (b.createdAt?.seconds || 0) -
      (a.createdAt?.seconds || 0)
    );
  }

  if (sortBy === "Oldest") {
    sorted.sort((a, b) =>
      (a.createdAt?.seconds || 0) -
      (b.createdAt?.seconds || 0)
    );
  }

  if (sortBy === "PriceHighToLow") {
    sorted.sort((a, b) =>
      Number(b.total || 0) -
      Number(a.total || 0)
    );
  }

  if (sortBy === "PriceLowToHigh") {
    sorted.sort((a, b) =>
      Number(a.total || 0) -
      Number(b.total || 0)
    );
  }

  return sorted;
}

// ---------------- FILTERING ----------------
function applyFilters(data) {

  const selectedDate =
    document.getElementById("orderDate")?.value;

  let filtered = [...data];

  // ---------------- DATE FILTER ----------------
  if (selectedDate) {

    filtered = filtered.filter(order => {

      const orderDate =
        order.createdAt?.toDate
          ? order.createdAt.toDate()
          : new Date(order.createdAt);

      const filterDate =
        new Date(selectedDate + "T00:00:00");

      return (
        orderDate.toDateString() ===
        filterDate.toDateString()
      );
    });
  }

  // ---------------- CUSTOMER SEARCH ----------------
  if (customerSearch.trim()) {

    filtered = filtered.filter(order => {

      const customer =
        (order.customerName || "")
          .toLowerCase();

      return customer.includes(
        customerSearch.toLowerCase()
      );
    });
  }

  return filtered;
}

// ---------------- RENDER ----------------
function renderOrders() {

  const container =
    document.getElementById("orderList");

  if (!container) return;

  const filtered =
    applyFilters(sortOrders(orders));

  if (!filtered.length) {

    container.innerHTML = `
      <section class="col-span-full bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
        <p class="text-gray-500 text-lg">
          No collected orders found.
        </p>
      </section>
    `;

    return;
  }

  container.innerHTML = filtered.map(order => `

    <article class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">

      <section class="flex justify-between items-start mb-3">

        <section>
          <h3 class="text-lg font-bold text-gray-900">
            ${order.customerName || "Customer"}
          </h3>

          <p class="text-sm text-gray-500">
            ${formatTimestamp(order.createdAt)}
          </p>
        </section>

        <span class="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
          Collected
        </span>

      </section>

      <section class="space-y-1 mb-4">
        ${(order.menuItems || []).map(item => `
          <p class="text-sm text-gray-700">
            ${item.name} × ${item.quantity || 1}
          </p>
        `).join("")}
      </section>

      <section class="flex justify-between items-center">

        <p class="font-bold text-indigo-600">
          R${Number(order.total || 0).toFixed(2)}
        </p>

        <button
          class="details-order-btn bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          data-order-id="${order.id}"
        >
          Details
        </button>

      </section>

    </article>

  `).join("");

  lucide.createIcons();
}

// ---------------- FILTER EVENTS ----------------
document.getElementById("SortBy")
  ?.addEventListener("change", (e) => {

    sortBy = e.target.value;

    renderOrders();
  });

document.getElementById("orderDate")
  ?.addEventListener("change", () => {

    renderOrders();
  });

// ---------------- MODAL ----------------
function initOrderHistoryListeners() {

  document.getElementById("SortBy")
    ?.addEventListener("change", (e) => {

      sortBy = e.target.value;

      renderOrders();
    });

  document.getElementById("orderDate")
    ?.addEventListener("change", () => {

      renderOrders();
    });

  document.getElementById("customerSearch")
    ?.addEventListener("input", (e) => {

      customerSearch = e.target.value;

      renderOrders();
    });

  document.getElementById("closeOrderModal")
    ?.addEventListener("click", () => {

      document.getElementById("order-details-modal")
        ?.classList.add("hidden");
    });

  document.body.addEventListener("click", (e) => {

    const btn =
      e.target.closest(".details-order-btn");

    if (!btn) return;

    const order =
      orders.find(o => o.id === btn.dataset.orderId);

    if (!order) return;

    document.getElementById("order-details-modal")
      ?.classList.remove("hidden");

    renderOrderItems(order);
  });
}
// ---------------- ORDER ITEMS ----------------
function renderOrderItems(order) {

  const itemList =
    document.getElementById("itemList");

  const count =
    document.getElementById("numItemsOrder");

  if (!itemList || !count) return;

  const items = order.menuItems || [];

  count.textContent =
    `${items.length} item${items.length === 1 ? "" : "s"} in order`;

  itemList.innerHTML = items.map(item => `

    <article class="bg-gray-50 rounded-xl p-4">

      <img
        src="${item.image || "assets/default.jpg"}"
        alt="${item.name}"
        class="w-full h-40 object-cover rounded-lg mb-3"
      >

      <h3 class="font-semibold text-gray-900">
        ${item.name}
      </h3>

      <p class="text-sm text-gray-600 mt-1">
        ${item.description || ""}
      </p>

      <p class="mt-3 font-bold text-indigo-600">
        R${item.price || 0}
      </p>

    </article>

  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  initOrderHistoryListeners();
});