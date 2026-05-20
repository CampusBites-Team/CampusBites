import {
  db,
  auth,
  getDoc,
  collection,
  doc,
  where,
  query,
  onAuthStateChanged,
  onSnapshot,
  updateDoc,
  serverTimestamp
} from "./database.js";

lucide.createIcons();

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    console.error("Vendor profile not found");
    return;
  }

  listenToVendorOrders(user.uid, renderOrdersByStatus);
});

export function formatTimestamp(timestamp) {
  if (!timestamp?.toDate) return "Not available";

  return timestamp.toDate().toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short"
  });
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

export function getNextDropStatus(currentStatus, targetColumnId) {
  const status = formatStatus(currentStatus);

  if (status === "Pending" && targetColumnId === "preparingOrders") {
    return "Preparing";
  }

  if (status === "Preparing" && targetColumnId === "readyOrders") {
    return "Ready";
  }

  if (status === "Ready" && targetColumnId === "completedOrders") {
    return "Collected";
  }

  return null;
}

export function buildOrderHTML(order, index) {
  const status = formatStatus(order.status);

  const items = (order.menuItems || [])
    .map((item) => `<p>- ${item.name} x${item.quantity ?? 1}</p>`)
    .join("");

  return `
    <article
      class="bg-white p-4 rounded-xl shadow mb-4 cursor-move"
      draggable="${status !== "Collected"}"
      data-order-id="${order.id}"
      data-order-status="${status}"
    >
      <header>
        <h3 class="font-bold">Order ${index + 1}</h3>

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
    </article>
  `;
}

export async function enrichOrdersWithCustomerNames(orders) {
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

export async function renderOrdersByStatus(orders) {
  const pendingContainer = document.getElementById("newOrders");
  const preparingContainer = document.getElementById("preparingOrders");
  const readyContainer = document.getElementById("readyOrders");
  const collectedContainer = document.getElementById("completedOrders");

  if (!pendingContainer || !preparingContainer || !readyContainer || !collectedContainer) return;

  const enrichedOrders = await enrichOrdersWithCustomerNames(orders);

  const pendingOrders = enrichedOrders.filter((order) => formatStatus(order.status) === "Pending");
  const preparingOrders = enrichedOrders.filter((order) => formatStatus(order.status) === "Preparing");
  const readyOrders = enrichedOrders.filter((order) => formatStatus(order.status) === "Ready");
  const collectedOrders = enrichedOrders.filter((order) => formatStatus(order.status) === "Collected");

  pendingContainer.innerHTML = pendingOrders.length
    ? pendingOrders.map((order, index) => buildOrderHTML(order, index)).join("")
    : `<p class="text-gray-500">No pending orders.</p>`;

  preparingContainer.innerHTML = preparingOrders.length
    ? preparingOrders.map((order, index) => buildOrderHTML(order, index)).join("")
    : `<p class="text-gray-500">No preparing orders.</p>`;

  readyContainer.innerHTML = readyOrders.length
    ? readyOrders.map((order, index) => buildOrderHTML(order, index)).join("")
    : `<p class="text-gray-500">No ready orders.</p>`;

  collectedContainer.innerHTML = collectedOrders.length
    ? collectedOrders.map((order, index) => buildOrderHTML(order, index)).join("")
    : `<p class="text-gray-500">No collected orders.</p>`;

  attachDragAndDropListeners();
  lucide.createIcons();
}

export async function updateOrderStatus(orderId, status) {
  await updateDoc(doc(db, "orders", orderId), {
    status,
    updatedAt: serverTimestamp()
  });
}

export function attachDragAndDropListeners() {
  const columns = [
    document.getElementById("newOrders"),
    document.getElementById("preparingOrders"),
    document.getElementById("readyOrders"),
    document.getElementById("completedOrders")
  ].filter(Boolean);

  columns.forEach((column) => {
    if (column.dataset.dragListenerAttached === "true") return;

    column.dataset.dragListenerAttached = "true";

    column.addEventListener("dragstart", (event) => {
      const orderCard = event.target.closest("article[data-order-id]");
      if (!orderCard || orderCard.getAttribute("draggable") === "false") return;

      event.dataTransfer.setData("orderId", orderCard.dataset.orderId);
      event.dataTransfer.setData("orderStatus", orderCard.dataset.orderStatus);
    });

    column.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    column.addEventListener("drop", async (event) => {
      event.preventDefault();

      const orderId = event.dataTransfer.getData("orderId");
      const orderStatus = event.dataTransfer.getData("orderStatus");
      const nextStatus = getNextDropStatus(orderStatus, column.id);

      if (!orderId || !nextStatus) return;

      await updateOrderStatus(orderId, nextStatus);
    });
  });
}

export function listenToVendorOrders(vendorId, callback) {
  const q = query(
    collection(db, "orders"),
    where("vendorId", "==", vendorId)
  );

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    orders.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    callback(orders);
  });
}