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

import {
  formatTimestamp
} from "./orders.js";

let doneOrders = [];
let sortBy = "Default";
let restrictions = [false, false, false, false];

// ---------------- AUTH GUARD ----------------
export function initVendorDashboard(locationObj = window.location, alertFn = alert) {
  onAuthStateChanged(auth, async (user) => {
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
    doneOrders = orders.filter(order => order.status === "Collected")
    renderOrdersByStatus(doneOrders)
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

export function renderQuickStats(orders) {
  const pendingCount = document.getElementById("pending-count");
  const preparingCount = document.getElementById("preparing-count");
  const readyCount = document.getElementById("ready-count");
  const collectedCount = document.getElementById("collected-count");

  if (!pendingCount || !preparingCount || !readyCount || !collectedCount) return;

  pendingCount.textContent = orders.filter((order) => formatStatus(order.status) === "Pending").length;
  preparingCount.textContent = orders.filter((order) => formatStatus(order.status) === "Preparing").length;
  readyCount.textContent = orders.filter((order) => formatStatus(order.status) === "Ready").length;
  collectedCount.textContent = orders.filter((order) => formatStatus(order.status) === "Collected").length;
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

export async function updateOrderStatus(orderId, newStatus) {
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, { status: newStatus });
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
          alert("Order no longer exists.");
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
        alert("Failed to mark order as paid.");
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

document.getElementById("closeHistoryModal")?.addEventListener("click", () => {
    document.getElementById("order-history-modal")?.classList.add("hidden");
});

document.getElementById("history")?.addEventListener("click", () =>{
    document.getElementById("order-history-modal")?.classList.remove("hidden");
    

});

export function buildOrderHTML(order) {
  const status = formatStatus(order.status);

  const items = (order.menuItems || [])
    .map((item) => `<p>- ${item.name} x${item.quantity ?? 1}</p>`)
    .join("");

  const paymentMethod = order.paymentMethod === "cash" ? "cash" : "card";
  const paymentStatus = order.paymentStatus || (paymentMethod === "cash" ? "unpaid" : "paid");
  const isUnpaidCash = paymentMethod === "cash" && paymentStatus === "unpaid";

  const paymentBadge = paymentMethod === "cash"
    ? `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
        isUnpaidCash ? "bg-yellow-100 text-yellow-700" : "bg-emerald-100 text-emerald-700"
      }">${isUnpaidCash ? "Cash • Unpaid" : "Cash • Paid"}</span>`
    : `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Card</span>`;

  const cashBanner = isUnpaidCash
    ? `
      <section class="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs p-2 rounded-lg">
        Awaiting cash payment — R${Number(order.total || 0).toFixed(2)}
      </section>
    `
    : "";

  const detailsButton = 
     `
      <button
        type="button"
        id="${order.id}"
        class="details-order-btn mt-2 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
      >
        Details
      </button>
    `;

  return `
    <article
      class="bg-white p-4 rounded-xl shadow mb-4 cursor-move"
      draggable="${status !== "Collected"}"
      data-order-id="${order.id}"
      data-order-status="${status}"
      data-payment-method="${paymentMethod}"
      data-payment-status="${paymentStatus}"
    >
      <header>
        <section class="flex justify-between items-start">
          <h3 class="font-bold">Order #${order.dailyOrderNumber || "001"}</h3>
          ${paymentBadge}
        </section>

        <p class="text-sm text-gray-500">
          Customer: ${order.customerName || "Unknown Customer"}
        </p>

        <p class="text-sm text-gray-500">
          Placed: ${formatTimestamp(order.createdAt)}
        </p>

        <p class="text-sm text-gray-500">
          Updated: ${formatTimestamp(order.updatedAt)}
        </p>
      </header>

      <section class="mt-2">
        ${items}
      </section>

      <p class="mt-2 font-semibold">
        Status: ${status}
      </p>
      ${detailsButton}
      
    </article>
  `;
}

async function enrichOrdersWithCustomerNames(orders) {
  return Promise.all(
    orders.map(async (order) => {
      try {
        const customerSnap = await getDoc(doc(db, "users", order.userId));
        const customerData = customerSnap.exists() ? customerSnap.data() : {};

        return {
          ...order,
          customerName: customerData.fullName || "Unknown Customer"
        };
      } catch (error) {
        console.error("Failed to fetch customer name:", error);

        return {
          ...order,
          customerName: "Unknown Customer"
        };
      }
    })
  );
}

async function renderOrdersByStatus(orders) {
  const container = document.getElementById("orderList");
  

  if (!container) return;

  const enrichedOrders = await enrichOrdersWithCustomerNames(orders);
  //const numberedOrders = addDailyOrderNumbers(enrichedOrders);

  container.innerHTML = enrichedOrders.length
    ? enrichedOrders.map((order) => buildOrderHTML(order)).join("")
    : `<p class="text-gray-500">No pending orders.</p>`;
  lucide.createIcons();
}

document.getElementById("toggleFilters")?.addEventListener("click", () => {
  document.getElementById("filterDropdown")?.classList.toggle("hidden");
});

function applyFilter(order) {
  if(document.getElementById("orderDate").value != ""){
    const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const date = new Date(document.getElementById("orderDate").value + "T00:00:00");
    if(orderDate.toDateString() != date.toDateString()) return false;
      

  }
  if(restrictions[0]){
    let passed = false;
    for(let i = 0; i < order.menuItems.length; i++){
      if ((order.menuItems[i].dietary).includes("Vegan")) passed = true;
    }
    if(!passed){
      return false;
    }
  }
  if(restrictions[1]){
    let passed = false;
    for(let i = 0; i < order.menuItems.length; i++){
      if ((order.menuItems[i].dietary).includes("Vegetarian")) passed = true;
    }
    if(!passed){
      return false;
    }
  }
  if(restrictions[2]){
    let passed = false;
    for(let i = 0; i < order.menuItems.length; i++){
      if (!(order.menuItems[i].allergens).includes("Gluten")) passed = true;
    }
    if(!passed){
      return false;
    }
  }
  if(restrictions[3]){
    let passed = false;
    for(let i = 0; i < order.menuItems.length; i++){
      if ((order.menuItems[i].dietary).includes("Halal")) passed = true;
    }
    if(!passed){
      return false;
    }
  }
  

  return true;
}

function sortOrders(orders) {
  const sortedItems = [...orders];

  if (sortBy === "PriceLowToHigh") {
    sortedItems.sort((a, b) => Number(getTotalRevenue(a) || 0) - Number(getTotalRevenue(b) || 0));
  }

  if (sortBy === "PriceHighToLow") {
    sortedItems.sort((a, b) => Number(getTotalRevenue(b) || 0) - Number(getTotalRevenue(a) || 0));
  }

  if (sortBy === "Oldest") {
    sortedItems.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
  }

  if (sortBy === "Newest") {
    sortedItems.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }

  return sortedItems;
}

function getTotalRevenue(order){
  let totalRevenue = 0;
  for(let i = 0; i < order.menuItems.length; i++){
    totalRevenue += order.menuItems[i].price; 
  }
  return totalRevenue;
}

document.getElementById("SortBy")?.addEventListener("change", (e) => {
  sortBy = e.target.value;
  renderOrdersByStatus(sortOrders(doneOrders).filter(applyFilter));
});

document.getElementById("Vegan")?.addEventListener("change", () => {
  restrictions[0] = document.getElementById("Vegan").checked;
  renderOrdersByStatus(sortOrders(doneOrders).filter(applyFilter));
});

document.getElementById("Vegetarian")?.addEventListener("change", () => {
  restrictions[1] = document.getElementById("Vegetarian").checked;
  renderOrdersByStatus(sortOrders(doneOrders).filter(applyFilter));
});

document.getElementById("Gluten-Free")?.addEventListener("change", () => {
  restrictions[2] = document.getElementById("Gluten-Free").checked;
  renderOrdersByStatus(sortOrders(doneOrders).filter(applyFilter));
});

document.getElementById("Halal")?.addEventListener("change", () => {
  restrictions[3] = document.getElementById("Halal").checked;
  renderOrdersByStatus(sortOrders(doneOrders).filter(applyFilter));
});
document.getElementById("orderDate")?.addEventListener("change", () => {
  renderOrdersByStatus(sortOrders(doneOrders).filter(applyFilter));
});

function updateDetails(order) {
  const container = document.getElementById("itemList");
  const countLabel = document.getElementById("numItemsOrder");

  if (!container || !countLabel) return;

  const items = getOrderItems(order);

  let html = ``;

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

function getOrderItems(order) {
  return order.menuItems || order.items || [];
}

document.body.addEventListener("click", (e) => {
  const detailsBtn = e.target.closest(".details-order-btn");

  if (detailsBtn) {
    const orderId = detailsBtn.id;
    const order = doneOrders.find((order) => order.id === orderId);

    if (!order) return;

    const modalTitle = document.getElementById("modal-title");
    const modal = document.getElementById("order-details-modal");

    if (modalTitle) modalTitle.textContent = "Items in Order";

    modal?.classList.remove("hidden");

    updateDetails(order);
    return;
  }

});