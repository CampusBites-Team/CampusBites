import {
  auth,
  db,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  onAuthStateChanged,
  collection,
  query,
  where
} from "./database.js";

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

    fillOperatingHours(userData);
    attachOperatingHoursForm(user.uid, userData, alertFn);

    const orders = await fetchVendorOrders(user.uid);
    renderOrders(orders);
    attachOrderStatusListeners();
  });
}

// ---------------- OPERATING HOURS ----------------
export function formatOperatingHours(openingTime, closingTime) {
  if (!openingTime || !closingTime) {
    return "No operating hours set yet.";
  }

  return `${openingTime} - ${closingTime}`;
}

export function fillOperatingHours(userData) {
  const openingTimeInput = document.getElementById("openingTime");
  const closingTimeInput = document.getElementById("closingTime");
  const savedOperatingHours = document.getElementById("savedOperatingHours");

  if (openingTimeInput) {
    openingTimeInput.value = userData.openingTime || "";
  }

  if (closingTimeInput) {
    closingTimeInput.value = userData.closingTime || "";
  }

  if (savedOperatingHours) {
    savedOperatingHours.textContent = formatOperatingHours(
      userData.openingTime,
      userData.closingTime
    );
  }
}

export function attachOperatingHoursForm(vendorId, userData, alertFn = alert) {
  const operatingHoursForm = document.getElementById("operatingHoursForm");

  if (!operatingHoursForm || operatingHoursForm.dataset.listenerAttached === "true") {
    return;
  }

  operatingHoursForm.dataset.listenerAttached = "true";

  operatingHoursForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const openingTime = document.getElementById("openingTime")?.value || "";
    const closingTime = document.getElementById("closingTime")?.value || "";

    if (!openingTime || !closingTime) {
      alertFn("Please enter both opening and closing times.");
      return;
    }

    if (openingTime >= closingTime) {
      alertFn("Closing time must be after opening time.");
      return;
    }

    const userRef = doc(db, "users", vendorId);

    await updateDoc(userRef, {
      openingTime,
      closingTime
    });

    userData.openingTime = openingTime;
    userData.closingTime = closingTime;

    fillOperatingHours(userData);
    alertFn("Operating hours updated successfully.");
  });
}

// ---------------- UTILS ----------------
export const calculateRevenue = (orders) => {
  return orders.reduce((sum, o) => sum + (o.total || 0), 0);
};

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

export function getStatusButtons(order) {
  const statuses = ["Pending", "Preparing", "Ready", "Collected"];
  const currentStatus = order.status || "Pending";

  return statuses.map((status) => {
    const isCurrent = currentStatus === status;

    return `
      <button
        type="button"
        class="px-3 py-1 rounded-lg border ${
          isCurrent
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        }"
        data-order-id="${order.id}"
        data-status="${status}"
        ${isCurrent ? "disabled" : ""}
      >
        ${status}
      </button>
    `;
  }).join("");
}

export function renderOrders(orders) {
  const ordersList = document.getElementById("orders-list");

  if (!ordersList) return;

  if (!orders.length) {
    ordersList.innerHTML = `<p class="text-gray-500">No orders available yet.</p>`;
    return;
  }

  ordersList.innerHTML = orders.map((order, index) => `
    <article class="border border-gray-200 rounded-xl p-4">
      <header class="mb-3">
        <h3 class="text-lg font-semibold text-gray-900">Order ${index + 1}</h3>
        <p class="text-sm text-gray-600">Status: ${order.status || "Pending"}</p>
      </header>

      <section class="mb-3">
        <p class="text-sm text-gray-700">Total: R${order.total || 0}</p>
      </section>

      <section class="flex flex-wrap gap-2">
        ${getStatusButtons(order)}
      </section>
    </article>
  `).join("");
}

export async function updateOrderStatus(orderId, newStatus) {
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, { status: newStatus });
}

export function attachOrderStatusListeners() {
  const ordersList = document.getElementById("orders-list");

  if (!ordersList || ordersList.dataset.listenerAttached === "true") {
    return;
  }

  ordersList.dataset.listenerAttached = "true";

  ordersList.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const orderId = button.dataset.orderId;
    const newStatus = button.dataset.status;

    if (!orderId || !newStatus) return;

    await updateOrderStatus(orderId, newStatus);

    const updatedOrderElement = button.closest("article");
    if (!updatedOrderElement) return;

    const statusText = updatedOrderElement.querySelector("p.text-sm.text-gray-600");
    if (statusText) {
      statusText.textContent = `Status: ${newStatus}`;
    }

    const buttonSection = updatedOrderElement.querySelector("section.flex.flex-wrap.gap-2");
    if (buttonSection) {
      buttonSection.innerHTML = getStatusButtons({
        id: orderId,
        status: newStatus
      });
    }
  });
}