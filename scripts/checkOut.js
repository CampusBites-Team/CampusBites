import {
  db,
  getDocs,
  doc,
  collection,
  auth,
  updateDoc,
  onAuthStateChanged,
  query,
  where,
  serverTimestamp
} from "./database.js";

let currentUser = null;
let ordersCache = [];

// ----------------------
// Auth
// ----------------------
onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;

  if (!currentUser) {
    const activeOrdersContainer = document.getElementById("active-orders");

    if (activeOrdersContainer) {
      activeOrdersContainer.innerHTML = `
        <p class="text-sm text-gray-500 text-center py-8">
          Please log in to view your orders.
        </p>
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

    const activeOrdersContainer = document.getElementById("active-orders");

    if (activeOrdersContainer) {
      activeOrdersContainer.innerHTML = `
        <p class="text-sm text-red-500 text-center py-8">
          Failed to load orders.
        </p>
      `;
    }
  }
}

// ----------------------
// Helpers
// ----------------------
function formatTimestamp(timestamp) {
  if (!timestamp?.toDate) return "Not available";

  return timestamp.toDate().toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatStatus(status = "Pending") {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

// ----------------------
// Build order card
// ----------------------
function buildOrderCard(order, orderNumber) {
  const status = formatStatus(order.status || "Pending");

  let statusColor = "bg-yellow-100 text-yellow-700";

  if (status === "Preparing" || status === "In progress") {
    statusColor = "bg-blue-100 text-blue-700";
  }

  if (status === "Ready") {
    statusColor = "bg-green-100 text-green-700";
  }

  if (status === "Refund pending") {
    statusColor = "bg-orange-100 text-orange-700";
  }

  if (status === "Refunded") {
    statusColor = "bg-green-100 text-green-700";
  }

  if (status === "Collected" || status === "Cancelled") {
    statusColor = "bg-gray-200 text-gray-700";
  }

  const refundMessage =
    status === "Refund pending"
      ? `
        <section class="mb-4 bg-orange-50 border border-orange-200 text-orange-700 text-sm p-3 rounded-lg">
          Refund processing. Your refund has been initiated and is awaiting confirmation.
        </section>
      `
      : status === "Refunded"
        ? `
          <section class="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg">
            Refund completed.
          </section>
        `
        : "";

  const itemsHtml = (order.menuItems || [])
    .map((item) => `
      <section class="flex items-center gap-3 py-2 border-b border-gray-100">
        <img
          src="${item.image || "assets/default.jpg"}"
          alt="${item.name || "Menu item"}"
          class="w-12 h-12 rounded-lg object-cover"
        >

        <section class="flex-1">
          <p class="font-medium text-sm">
            ${item.name || "Unnamed item"}
          </p>

          <p class="text-xs text-gray-500">
            Qty: ${item.quantity ?? 1}
          </p>
        </section>
      </section>
    `)
    .join("");

  return `
    <article class="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition">
      <header class="flex justify-between items-start mb-4">
        <section>
          <h3 class="text-lg font-bold text-gray-900">
            Order ${orderNumber}
          </h3>

          <p class="text-sm text-gray-500">
            Placed: ${formatTimestamp(order.createdAt)}
          </p>
        </section>

        <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusColor}">
          ${status}
        </span>
      </header>

      <section class="space-y-2 mb-4 max-h-52 overflow-y-auto">
        ${itemsHtml}
      </section>

      ${refundMessage}

      <p class="text-sm text-gray-500">
        Updated: ${formatTimestamp(order.updatedAt)}
      </p>

      <section class="flex gap-2 mt-5">
        ${
          status === "Pending"
            ? `
              <button
                type="button"
                data-order-id="${order.id}"
                class="cancel-order-btn flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
              >
                Cancel
              </button>
            `
            : ""
        }

        <button
          type="button"
          data-order-id="${order.id}"
          class="details-order-btn flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
        >
          Details
        </button>
      </section>
    </article>
  `;
}

// ----------------------
// Render orders by status
// ----------------------
function renderOrders(orders) {
  const activeOrdersContainer = document.getElementById("active-orders");
  const readyOrdersContainer = document.getElementById("ready-orders");
  const refundOrdersContainer = document.getElementById("refund-orders");
  const historyOrdersContainer = document.getElementById("order-history");

  if (
    !activeOrdersContainer ||
    !readyOrdersContainer ||
    !refundOrdersContainer ||
    !historyOrdersContainer
  ) {
    return;
  }

  if (!orders.length) {
    activeOrdersContainer.innerHTML = `
      <p class="text-sm text-gray-500 text-center py-8">
        No orders found.
      </p>
    `;

    readyOrdersContainer.innerHTML = "";
    refundOrdersContainer.innerHTML = "";
    historyOrdersContainer.innerHTML = "";
    return;
  }

  const activeOrders = orders.filter((order) => {
    const status = (order.status || "Pending").toLowerCase();

    return (
      status === "pending" ||
      status === "preparing" ||
      status === "in progress"
    );
  });

  const readyOrders = orders.filter((order) => {
    return (order.status || "").toLowerCase() === "ready";
  });

  const refundOrders = orders.filter((order) => {
    const status = (order.status || "").toLowerCase();

    return (
      status === "refund pending" ||
      status === "refunded"
    );
  });

  const historyOrders = orders.filter((order) => {
    const status = (order.status || "").toLowerCase();

    return (
      status === "collected" ||
      status === "cancelled"
    );
  });

  activeOrdersContainer.innerHTML = activeOrders.length
    ? activeOrders
        .map((order) => buildOrderCard(order, orders.indexOf(order) + 1))
        .join("")
    : `
      <p class="text-sm text-gray-500 text-center py-8">
        No active orders.
      </p>
    `;

  readyOrdersContainer.innerHTML = readyOrders.length
    ? readyOrders
        .map((order) => buildOrderCard(order, orders.indexOf(order) + 1))
        .join("")
    : `
      <p class="text-sm text-gray-500 text-center py-8">
        No ready orders.
      </p>
    `;

  refundOrdersContainer.innerHTML = refundOrders.length
    ? refundOrders
        .map((order) => buildOrderCard(order, orders.indexOf(order) + 1))
        .join("")
    : `
      <p class="text-sm text-gray-500 text-center py-8">
        No refund requests.
      </p>
    `;

  historyOrdersContainer.innerHTML = historyOrders.length
    ? historyOrders
        .map((order) => buildOrderCard(order, orders.indexOf(order) + 1))
        .join("")
    : `
      <p class="text-sm text-gray-500 text-center py-8">
        No order history yet.
      </p>
    `;

  globalThis.lucide?.createIcons?.();
}

// ----------------------
// Order details modal
// ----------------------
function updateDetails(order) {
  const container = document.getElementById("itemList");
  const countLabel = document.getElementById("numItemsOrder");

  if (!container || !countLabel) return;

  const items = order.menuItems || [];

  let html = `
    <section class="bg-gray-50 p-4 rounded-xl mb-4">
      <p class="text-sm text-gray-600">
        Placed: ${formatTimestamp(order.createdAt)}
      </p>

      <p class="text-sm text-gray-600">
        Updated: ${formatTimestamp(order.updatedAt)}
      </p>
    </section>
  `;

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
            <h3 class="text-lg font-semibold">
              ${item.name || "Unnamed item"}
            </h3>

            <p class="text-sm text-gray-500">
              ${item.vendorName || "Vendor"}
            </p>
          </section>

          <span class="font-bold text-indigo-600">
            R${item.price ?? 0}
          </span>
        </section>

        <p class="text-sm text-gray-600 mb-3 line-clamp-2">
          ${item.description || ""}
        </p>

        ${
          item.dietary?.length
            ? `
              <section class="flex flex-wrap gap-1 mb-2">
                ${item.dietary
                  .map((tag) => `
                    <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      ${tag}
                    </span>
                  `)
                  .join("")}
              </section>
            `
            : ""
        }

        ${
          item.allergens?.length
            ? `
              <section class="flex flex-wrap gap-1 mb-3">
                <span class="text-xs text-orange-500 font-medium mr-1">
                  ⚠ Contains:
                </span>

                ${item.allergens
                  .map((allergen) => `
                    <span class="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
                      ${allergen}
                    </span>
                  `)
                  .join("")}
              </section>
            `
            : `<section class="mb-3"></section>`
        }
      </article>
    `;
  });

  container.innerHTML = html;

  countLabel.textContent =
    `${items.length} item${items.length === 1 ? "" : "s"} in order`;

  globalThis.lucide?.createIcons?.();
}

// ----------------------
// Update order status
// ----------------------
async function updateOrderStatus(order, status) {
  try {
    await updateDoc(doc(db, "orders", order.id), {
      status,
      updatedAt: serverTimestamp()
    });

    order.status = status;
    await loadOrders();
  } catch (error) {
    console.error(error);
    alert("Failed to cancel order");
  }
}

// ----------------------
// Refund paid order
// ----------------------
async function refundPaidOrder(order) {
  if (!currentUser) {
    alert("You must be signed in to cancel an order.");
    return;
  }

  try {
    const idToken = await currentUser.getIdToken();

    const res = await fetch("/api/paystack/refund", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ orderId: order.id })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Refund failed (${res.status})`);
    }

    await updateDoc(doc(db, "orders", order.id), {
      status: "refund pending",
      refundStatus: "pending",
      updatedAt: serverTimestamp()
    });

    ordersCache = ordersCache.map((cachedOrder) =>
      cachedOrder.id === order.id
        ? {
            ...cachedOrder,
            status: "refund pending",
            refundStatus: "pending"
          }
        : cachedOrder
    );

    renderOrders(ordersCache);

    alert("Refund initiated. It usually clears within a few minutes.");
  } catch (error) {
    console.error("Refund failed:", error);
    alert("Could not initiate refund: " + error.message);
  }
}

// ----------------------
// Card click handler
// ----------------------
document.body.addEventListener("click", (e) => {
  const detailsBtn = e.target.closest(".details-order-btn");
  const cancelBtn = e.target.closest(".cancel-order-btn");

  if (detailsBtn) {
    const orderId = detailsBtn.dataset.orderId;
    const order = ordersCache.find((order) => order.id === orderId);

    if (!order) return;

    const modalTitle = document.getElementById("modal-title");
    const modal = document.getElementById("item-details-modal");

    if (modalTitle) modalTitle.textContent = "Items in Order";

    modal?.classList.remove("hidden");

    updateDetails(order);
    return;
  }

  if (cancelBtn) {
    const orderId = cancelBtn.dataset.orderId;
    const order = ordersCache.find((order) => order.id === orderId);

    if (!order) return;

    const status = (order.status || "Pending").toLowerCase();

    if (status === "pending") {
      if (order.paymentStatus === "paid" && order.paystackReference) {
        refundPaidOrder(order);
      } else {
        updateOrderStatus(order, "cancelled");
      }
    } else if (status === "cancelled") {
      alert("Order is already cancelled");
    } else if (status === "refunded" || status === "refund pending") {
      alert("Order has already been refunded.");
    } else {
      alert("Order cannot be cancelled, it is already in progress.");
    }
  }
});