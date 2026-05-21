import {
  auth,
  db,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  onAuthStateChanged,
  collection,
  query,
  where,
  serverTimestamp
} from "./database.js";
import { showToast } from "./toast.js";

import {
  formatTimestamp,
} from "./orders.js";

// ---------------- AUTH GUARD ----------------
export function initVendorDashboard(locationObj = window.location, alertFn = alert) {
  onAuthStateChanged(auth, async (user) => {
    /* istanbul ignore next */
    if (!user) {
      locationObj.href = "login.html";
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      locationObj.href = "login.html";
      return;
    }

    const userData = userSnap.data();
    /* istanbul ignore next */
    if (userData.role !== "vendor") {
      locationObj.href = "index.html";
      return;
    }

    if (userData.status === "pending") {
      locationObj.href = "pending-approval.html";
      return;
    }

    if (userData.status === "suspended") {
      alertFn("Your account is suspended");
      locationObj.href = "login.html";
      return;
    }

    updateDashboardTitle(userData);

    const orders = await fetchVendorOrders(user.uid);
    renderOrders(orders);
    attachOrderStatusListeners();
    //listenToVendorOrders(user.uid, renderOrdersByStatus);
  });
}

// ---------------- DASHBOARD TITLE ----------------
export function updateDashboardTitle(userData) {
  const dashboardTitle = document.getElementById("dashboardTitle");
  const dashboardSubtitle = document.getElementById("dashboardSubtitle");

  const shopName = userData.shopName || "Vendor";

  if (dashboardTitle) {
    dashboardTitle.textContent = `${shopName}'s Dashboard`;
  }

  if (dashboardSubtitle) {
    dashboardSubtitle.textContent = "Welcome to your dashboard!";
  }
}
// ---------------- UTILS ----------------
export const calculateRevenue = (orders) => {
  return orders.reduce((sum, order) => sum + (order.total || 0), 0);
};

export function normaliseStatus(status) {
  return String(status || "Pending").trim().toLowerCase();
}

export function formatStatus(status) {
  const normalisedStatus = normaliseStatus(status);

  if (normalisedStatus === "pending") return "Pending";
  if (normalisedStatus === "preparing") return "Preparing";
  if (normalisedStatus === "ready") return "Ready";
  if (normalisedStatus === "collected") return "Collected";

  return "Pending";
}

export function getNextStatus(status) {
  const currentStatus = formatStatus(status);

  if (currentStatus === "Pending") return "Preparing";
  if (currentStatus === "Preparing") return "Ready";
  if (currentStatus === "Ready") return "Collected";

  return null;
}

export async function fetchVendorOrders(vendorId) {
  const ordersRef = collection(db, "orders");
  const vendorOrdersQuery = query(ordersRef, where("vendorId", "==", vendorId));
  const snapshot = await getDocs(vendorOrdersQuery);

  const orders = snapshot.docs.map((orderDoc) => ({
    id: orderDoc.id,
    ...orderDoc.data()
  }));

  orders.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });

  return orders;
}


export function isOrderFromToday(order) {
  if (!order.createdAt?.toDate) return false;

  const orderDate = order.createdAt.toDate();
  const today = new Date();

  return (
    orderDate.getFullYear() === today.getFullYear() &&
    orderDate.getMonth() === today.getMonth() &&
    orderDate.getDate() === today.getDate()
  );
}

export function renderQuickStats(orders) {
  const pendingCount = document.getElementById("pending-count");
  const preparingCount = document.getElementById("preparing-count");
  const readyCount = document.getElementById("ready-count");
  const collectedCount = document.getElementById("collected-count");

  if (!pendingCount || !preparingCount || !readyCount || !collectedCount) {
    return;
  }

const todaysOrders = orders.filter((order) => {
  if (!order.createdAt) {
    return true;
  }

  return isOrderFromToday(order);
});

  pendingCount.textContent = todaysOrders.filter(
    (order) => formatStatus(order.status) === "Pending"
  ).length;

  preparingCount.textContent = todaysOrders.filter(
    (order) => formatStatus(order.status) === "Preparing"
  ).length;

  readyCount.textContent = todaysOrders.filter(
    (order) => formatStatus(order.status) === "Ready"
  ).length;

  collectedCount.textContent = todaysOrders.filter(
    (order) => formatStatus(order.status) === "Collected"
  ).length;
}

export function getPaymentMeta(order) {
  const paymentMethod = order.paymentMethod === "cash" ? "cash" : "card";
  const paymentStatus = order.paymentStatus || (paymentMethod === "cash" ? "unpaid" : "paid");

  return {
    paymentMethod,
    paymentStatus,
    isUnpaidCash: paymentMethod === "cash" && paymentStatus === "unpaid"
  };
}

export function getStatusButtons(order) {
  const currentStatus = formatStatus(order.status);
  const nextStatus = getNextStatus(currentStatus);
  const { isUnpaidCash } = getPaymentMeta(order);

  if (!nextStatus) {
    return `
      <p class="text-sm text-gray-500">
        This order has been collected and can no longer be updated.
      </p>
    `;
  }

  if (nextStatus === "Collected" && isUnpaidCash) {
    return `
      <p class="text-sm text-yellow-700">
        Mark this cash order as paid before marking it collected.
      </p>
    `;
  }

  return `
    <button
      type="button"
      class="px-3 py-1 rounded-lg border bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
      data-order-id="${order.id}"
      data-status="${nextStatus}"
    >
      ${nextStatus}
    </button>
  `;
}

export function renderOrders(orders) {
  const ordersList = document.getElementById("orders-list");

  renderQuickStats(orders);

  if (!ordersList) return;

  const currentOrders = orders.filter((order) => {
    return formatStatus(order.status) !== "Collected";
  });

  if (!currentOrders.length) {
    ordersList.innerHTML = `<p class="text-gray-500">No current orders available.</p>`;
    return;
  }

  ordersList.innerHTML = currentOrders.map((order, index) => {
    const { paymentMethod, paymentStatus, isUnpaidCash } = getPaymentMeta(order);

    const paymentBadge = paymentMethod === "cash"
      ? `<span class="payment-badge inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
          isUnpaidCash ? "bg-yellow-100 text-yellow-700" : "bg-emerald-100 text-emerald-700"
        }">${isUnpaidCash ? "Cash • Unpaid" : "Cash • Paid"}</span>`
      : `<span class="payment-badge inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Card</span>`;

    const cashBanner = isUnpaidCash
      ? `
        <section class="cash-banner mb-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs p-2 rounded-lg">
          Awaiting cash payment — R${Number(order.total || 0).toFixed(2)}
        </section>
      `
      : "";

    const markPaidButton = isUnpaidCash
      ? `
        <button
          type="button"
          class="mark-paid-btn px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          data-mark-paid-id="${order.id}"
        >
          Mark as Paid
        </button>
      `
      : "";

    return `
      <article
        class="border border-gray-200 rounded-xl p-4"
        data-order-id="${order.id}"
        data-payment-method="${paymentMethod}"
        data-payment-status="${paymentStatus}"
      >
        <header class="mb-3 flex justify-between items-start gap-2">
          <section>
            <h3 class="text-lg font-semibold text-gray-900">Order ${index + 1}</h3>
            <p class="text-sm text-gray-600">Status: ${formatStatus(order.status)}</p>
          </section>
          ${paymentBadge}
        </header>

        <section class="mb-3">
          <p class="text-sm text-gray-700">Total: R${order.total || 0}</p>
        </section>

        ${cashBanner}

        <section class="flex flex-wrap gap-2">
          ${getStatusButtons(order)}
          ${markPaidButton}
        </section>
      </article>
    `;
  }).join("");
}


export async function markCashOrderAsPaid(order) {
  await updateDoc(doc(db, "orders", order.id), {
    paymentStatus: "paid",
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await addDoc(collection(db, "wallet_ledger"), {
    type: "credit",
    source: "cash",
    vendorId: order.vendorId,
    vendorName: order.vendorName || "",
    orderId: order.id,
    amount: Number(order.total || 0),
    status: "settled",
    createdAt: serverTimestamp()
  });
}

function refreshCardAfterMarkPaid(article, order) {
  article.dataset.paymentStatus = "paid";

  const badge = article.querySelector(".payment-badge");
  if (badge) {
    badge.className = "payment-badge inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700";
    badge.textContent = "Cash • Paid";
  }

  article.querySelector(".cash-banner")?.remove();
  article.querySelector(".mark-paid-btn")?.remove();

  const buttonSection = article.querySelector("section.flex.flex-wrap.gap-2");
  if (buttonSection) {
    buttonSection.innerHTML = getStatusButtons({
      id: order.id,
      status: order.status,
      paymentMethod: "cash",
      paymentStatus: "paid"
    });
  }
}

export function attachOrderStatusListeners() {
  const ordersList = document.getElementById("orders-list");

  if (!ordersList || ordersList.dataset.listenerAttached === "true") {
    return;
  }

  ordersList.dataset.listenerAttached = "true";

  ordersList.addEventListener("click", async (event) => {
    const markPaidBtn = event.target.closest(".mark-paid-btn");

    if (markPaidBtn) {
      const orderId = markPaidBtn.dataset.markPaidId;
      if (!orderId) return;

      markPaidBtn.disabled = true;
      markPaidBtn.textContent = "Marking as paid...";

      try {
        const snap = await getDoc(doc(db, "orders", orderId));
        if (!snap.exists()) {
          showToast("Order no longer exists.", "error");
          return;
        }

        const orderData = snap.data();
        await markCashOrderAsPaid({ id: orderId, ...orderData });

        const article = markPaidBtn.closest("article");
        if (article) {
          refreshCardAfterMarkPaid(article, { id: orderId, ...orderData });
        }
      } catch (err) {
        console.error("Failed to mark order as paid:", err);
        showToast("Failed to mark order as paid.", "error");
        markPaidBtn.disabled = false;
        markPaidBtn.textContent = "Mark as Paid";
      }

      return;
    }

    const button = event.target.closest("button");
    if (!button) return;

    const orderId = button.dataset.orderId;
    const newStatus = button.dataset.status;

    if (!orderId || !newStatus) return;

    await updateOrderStatus(orderId, newStatus);

    const updatedOrderElement = button.closest("article");
    if (!updatedOrderElement) return;

    if (newStatus === "Collected") {
      updatedOrderElement.remove();

      const collectedCount = document.getElementById("collected-count");
      if (collectedCount) {
        collectedCount.textContent = String(Number(collectedCount.textContent || 0) + 1);
      }

      const readyCount = document.getElementById("ready-count");
      if (readyCount) {
        readyCount.textContent = String(Math.max(Number(readyCount.textContent || 0) - 1, 0));
      }

      if (!ordersList.querySelector("article")) {
        ordersList.innerHTML = `<p class="text-gray-500">No current orders available.</p>`;
      }

      return;
    }

    const statusText = updatedOrderElement.querySelector("p.text-sm.text-gray-600");

    if (statusText) {
      statusText.textContent = `Status: ${newStatus}`;
    }

    const buttonSection = updatedOrderElement.querySelector("section.flex.flex-wrap.gap-2");

    if (buttonSection) {
      buttonSection.innerHTML = getStatusButtons({
        id: orderId,
        status: newStatus,
        paymentMethod: updatedOrderElement.dataset.paymentMethod || "card",
        paymentStatus: updatedOrderElement.dataset.paymentStatus || "paid"
      });
    }
  });
}
export async function updateOrderStatus(orderId, newStatus) {
  const orderRef = doc(db, "orders", orderId);

  await updateDoc(orderRef, {
    status: newStatus,
    updatedAt: serverTimestamp()
  });
}
