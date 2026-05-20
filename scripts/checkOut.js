import {
  db,
  getDocs,
  getDoc,
  addDoc,
  doc,
  collection,
  auth,
  updateDoc,
  onAuthStateChanged,
  query,
  where,
  serverTimestamp
} from "./database.js";
import { showToast } from "./toast.js";

let currentUser = null;
let currentUserData = null;
let ordersCache = [];
let reviewsCache = [];

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

  await loadCurrentUserData();
  await loadOrders();
});

// ----------------------
// Load current user profile
// ----------------------
async function loadCurrentUserData() {
  try {
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));

    currentUserData = userSnap.exists()
      ? userSnap.data()
      : {};
  } catch (error) {
    console.error("Failed to load user profile:", error);
    currentUserData = {};
  }
}

// ----------------------
// Load current user's reviews
// ----------------------
async function loadCustomerReviews() {
  if (!currentUser) return [];

  const reviewsQuery = query(
    collection(db, "reviews"),
    where("customerId", "==", currentUser.uid)
  );

  const snapshot = await getDocs(reviewsQuery);

  return snapshot.docs.map((reviewDoc) => ({
    id: reviewDoc.id,
    ...reviewDoc.data()
  }));
}

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

    const [ordersSnapshot, reviews] = await Promise.all([
      getDocs(q),
      loadCustomerReviews()
    ]);

    reviewsCache = reviews;

    ordersCache = ordersSnapshot.docs.map((d) => {
      const order = {
        id: d.id,
        ...d.data()
      };

      const hasReview = reviewsCache.some((review) => review.orderId === order.id);

      return {
        ...order,
        reviewed: order.reviewed || hasReview
      };
    });

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

function getOrderItems(order) {
  return order.menuItems || order.items || [];
}

function getVendorId(order) {
  return (
    order.vendorId ||
    getOrderItems(order)[0]?.vendorId ||
    ""
  );
}

function getVendorName(order) {
  return (
    order.vendorName ||
    getOrderItems(order)[0]?.vendorName ||
    "Vendor"
  );
}

function getOrderNumber(order, orderNumber) {
  return order.orderNumber || orderNumber || order.id;
}

function canReviewOrder(order) {
  return (
    (order.status || "").toLowerCase() === "collected" &&
    !order.reviewed
  );
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

  const paymentMethod = order.paymentMethod === "cash" ? "cash" : "card";
  const isUnpaidCash = paymentMethod === "cash" && order.paymentStatus === "unpaid";

  const paymentBadge = paymentMethod === "cash"
    ? `<span class="px-3 py-1 rounded-full text-xs font-semibold ${
        isUnpaidCash ? "bg-yellow-100 text-yellow-700" : "bg-emerald-100 text-emerald-700"
      }">${isUnpaidCash ? "Cash • Unpaid" : "Cash • Paid"}</span>`
    : `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Card</span>`;

  const cashNotice = isUnpaidCash
    ? `
      <section class="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded-lg">
        Pay R${Number(order.total || 0).toFixed(2)} in cash to the vendor at or before collection.
      </section>
    `
    : "";

  const itemsHtml = getOrderItems(order)
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

  const reviewButton = canReviewOrder(order)
    ? `
      <button
        type="button"
        data-order-id="${order.id}"
        data-order-number="${getOrderNumber(order, orderNumber)}"
        class="review-order-btn flex-1 bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600"
      >
        Review
      </button>
    `
    : (order.reviewed && status === "Collected")
      ? `
        <button
          type="button"
          disabled
          class="flex-1 bg-gray-200 text-gray-600 py-2 rounded-lg cursor-not-allowed"
        >
          Review submitted
        </button>
      `
      : "";

  return `
    <article class="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition">
      <header class="flex justify-between items-start mb-4">
        <section>
          <h3 class="text-lg font-bold text-gray-900">
            Order ${getOrderNumber(order, orderNumber)}
          </h3>

          <p class="text-sm text-gray-500">
            Placed: ${formatTimestamp(order.createdAt)}
          </p>
        </section>

        <section class="flex flex-col items-end gap-1">
          <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusColor}">
            ${status}
          </span>
          ${paymentBadge}
        </section>
      </header>

      <section class="space-y-2 mb-4 max-h-52 overflow-y-auto">
        ${itemsHtml}
      </section>

      ${cashNotice}

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

        ${reviewButton}

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

  const items = getOrderItems(order);

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
// Review modal
// ----------------------
function showReviewModal(order, orderNumber) {
  const existingModal = document.getElementById("review-modal");
  if (existingModal) existingModal.remove();

  const items = getOrderItems(order);
  const vendorName = getVendorName(order);

  const modal = document.createElement("section");
  modal.id = "review-modal";
  modal.innerHTML = `
    <section class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <article class="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          id="closeReviewModal"
          class="absolute top-3 right-3 bg-gray-100 rounded-full px-3 py-1 hover:bg-gray-200"
        >
          ✕
        </button>

        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          Review Order ${getOrderNumber(order, orderNumber)}
        </h2>

        <p class="text-sm text-gray-500 mb-4">
          Vendor: ${vendorName}
        </p>

        <section class="bg-gray-50 rounded-xl p-4 mb-4">
          <h3 class="font-semibold text-sm mb-2">Items</h3>

          ${
            items.length
              ? items.map((item) => `
                  <p class="text-sm text-gray-600">
                    ${item.name || "Unnamed item"} × ${item.quantity ?? 1}
                  </p>
                `).join("")
              : `<p class="text-sm text-gray-500">No items found.</p>`
          }
        </section>

        <label class="block text-sm font-medium text-gray-700 mb-1">
          Rating
        </label>

        <select
          id="reviewRating"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
        >
          <option value="">Select rating</option>
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Good</option>
          <option value="3">3 - Okay</option>
          <option value="2">2 - Poor</option>
          <option value="1">1 - Bad</option>
        </select>

        <label class="block text-sm font-medium text-gray-700 mb-1">
          Review
        </label>

        <textarea
          id="reviewComment"
          rows="4"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
          placeholder="Write your review..."
        ></textarea>

        <button
          id="submitReviewBtn"
          type="button"
          class="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700"
        >
          Submit Review
        </button>
      </article>
    </section>
  `;

  document.body.appendChild(modal);

  document.getElementById("closeReviewModal")?.addEventListener("click", () => {
    modal.remove();
  });

  document.getElementById("submitReviewBtn")?.addEventListener("click", () => {
    submitReview(order, orderNumber);
  });
}

async function submitReview(order, orderNumber) {
  const ratingInput = document.getElementById("reviewRating");
  const commentInput = document.getElementById("reviewComment");

  const rating = Number(ratingInput?.value || 0);
  const comment = commentInput?.value.trim() || "";

  if (!rating) {
    showToast("Please select a rating.", "warning");
    return;
  }

  if (!comment) {
    showToast("Please write a review.", "warning");
    return;
  }

  if (!currentUser) {
    showToast("You must be signed in to submit a review.", "warning");
    return;
  }

  if (order.reviewed) {
    showToast("You have already reviewed this order.", "warning");
    return;
  }

  try {
    await addDoc(collection(db, "reviews"), {
      customerId: currentUser.uid,
      customerName:
        currentUserData?.fullName ||
        currentUserData?.name ||
        currentUser.displayName ||
        "Customer",
      customerImage:
        currentUserData?.image ||
        currentUserData?.photoURL ||
        currentUser.photoURL ||
        "assets/default-icon.jpg",
      vendorId: getVendorId(order),
      vendorName: getVendorName(order),
      orderId: order.id,
      orderNumber: getOrderNumber(order, orderNumber),
      items: getOrderItems(order).map((item) => ({
        name: item.name || "Unnamed item",
        quantity: item.quantity ?? 1
      })),
      rating,
      comment,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "orders", order.id), {
      reviewed: true,
      updatedAt: serverTimestamp()
    });

    ordersCache = ordersCache.map((cachedOrder) =>
      cachedOrder.id === order.id
        ? { ...cachedOrder, reviewed: true }
        : cachedOrder
    );

    document.getElementById("review-modal")?.remove();

    renderOrders(ordersCache);

    showToast("Review submitted successfully.", "success");
  } catch (error) {
    console.error("Failed to submit review:", error);
    showToast("Failed to submit review.", "error");
  }
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
    showToast("Failed to cancel order.", "error");
  }
}

// ----------------------
// Refund paid order
// ----------------------
async function refundPaidOrder(order) {
  if (!currentUser) {
    showToast("You must be signed in to cancel an order.", "warning");
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

    showToast("Refund initiated. It usually clears within a few minutes.", "success");
  } catch (error) {
    console.error("Refund failed:", error);
    showToast("Could not initiate refund: " + error.message, "error");
  }
}

// ----------------------
// Card click handler
// ----------------------
document.body.addEventListener("click", (e) => {
  const detailsBtn = e.target.closest(".details-order-btn");
  const cancelBtn = e.target.closest(".cancel-order-btn");
  const reviewBtn = e.target.closest(".review-order-btn");

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

  if (reviewBtn) {
    const orderId = reviewBtn.dataset.orderId;
    const orderNumber = reviewBtn.dataset.orderNumber;
    const order = ordersCache.find((order) => order.id === orderId);

    if (!order) return;

    showReviewModal(order, orderNumber);
    return;
  }

  if (cancelBtn) {
    const orderId = cancelBtn.dataset.orderId;
    const order = ordersCache.find((order) => order.id === orderId);

    if (!order) return;

    const status = (order.status || "Pending").toLowerCase();

    if (status === "pending") {
      if (order.paymentMethod === "cash" && order.paymentStatus !== "paid") {
        updateOrderStatus(order, "cancelled");
      } else if (order.paymentStatus === "paid" && order.paystackReference) {
        refundPaidOrder(order);
      } else {
        updateOrderStatus(order, "cancelled");
      }
    } else if (status === "cancelled") {
      showToast("Order is already cancelled", "warning");
    } else if (status === "refunded" || status === "refund pending") {
      showToast("Order has already been refunded.", "warning");
    } else {
      showToast("Order cannot be cancelled, it is already in progress.", "warning");
    }
  }
});