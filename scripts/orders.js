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
  addDoc,
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

export function getDateKey(timestamp) {
  if (!timestamp?.toDate) return "unknown-date";

  const date = timestamp.toDate();

  return date.toISOString().slice(0, 10);
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

export function formatDailyOrderNumber(number) {
  return String(number).padStart(3, "0");
}

export function addDailyOrderNumbers(orders) {
  const counters = {};

  return orders.map((order) => {
    const dateKey = getDateKey(order.createdAt);

    counters[dateKey] = (counters[dateKey] || 0) + 1;

    return {
      ...order,
      dailyOrderNumber: formatDailyOrderNumber(counters[dateKey])
    };
  });
}

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

  const markPaidButton = isUnpaidCash
    ? `
      <button
        type="button"
        data-mark-paid-id="${order.id}"
        class="mark-paid-btn mt-2 w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700"
      >
        Mark as Paid
      </button>
    `
    : "";

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

      ${cashBanner}
      ${markPaidButton}
    </article>
  `;
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
  const numberedOrders = addDailyOrderNumbers(enrichedOrders);

  const pendingOrders = numberedOrders.filter((order) => formatStatus(order.status) === "Pending");
  const preparingOrders = numberedOrders.filter((order) => formatStatus(order.status) === "Preparing");
  const readyOrders = numberedOrders.filter((order) => formatStatus(order.status) === "Ready");
  const collectedOrders = numberedOrders.filter((order) => formatStatus(order.status) === "Collected");

  pendingContainer.innerHTML = pendingOrders.length
    ? pendingOrders.map((order) => buildOrderHTML(order)).join("")
    : `<p class="text-gray-500">No pending orders.</p>`;

  preparingContainer.innerHTML = preparingOrders.length
    ? preparingOrders.map((order) => buildOrderHTML(order)).join("")
    : `<p class="text-gray-500">No preparing orders.</p>`;

  readyContainer.innerHTML = readyOrders.length
    ? readyOrders.map((order) => buildOrderHTML(order)).join("")
    : `<p class="text-gray-500">No ready orders.</p>`;

  collectedContainer.innerHTML = collectedOrders.length
    ? collectedOrders.map((order) => buildOrderHTML(order)).join("")
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
      event.dataTransfer.setData("paymentMethod", orderCard.dataset.paymentMethod || "card");
      event.dataTransfer.setData("paymentStatus", orderCard.dataset.paymentStatus || "paid");
    });

    column.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    column.addEventListener("drop", async (event) => {
      event.preventDefault();

      const orderId = event.dataTransfer.getData("orderId");
      const orderStatus = event.dataTransfer.getData("orderStatus");
      const paymentMethod = event.dataTransfer.getData("paymentMethod");
      const paymentStatus = event.dataTransfer.getData("paymentStatus");
      const nextStatus = getNextDropStatus(orderStatus, column.id);

      if (!orderId || !nextStatus) return;

      if (
        nextStatus === "Collected" &&
        paymentMethod === "cash" &&
        paymentStatus === "unpaid"
      ) {
        alert("Mark this cash order as paid before marking it collected.");
        return;
      }

      await updateOrderStatus(orderId, nextStatus);
    });
  });
}

if (typeof document !== "undefined" && !document.body?.dataset.markPaidListenerAttached) {
  document.body?.addEventListener("click", async (event) => {
    const btn = event.target.closest(".mark-paid-btn");
    if (!btn) return;

    const orderId = btn.dataset.markPaidId;
    if (!orderId) return;

    btn.disabled = true;
    btn.textContent = "Marking as paid...";

    try {
      const snap = await getDoc(doc(db, "orders", orderId));
      if (!snap.exists()) {
        alert("Order no longer exists.");
        return;
      }
      await markCashOrderAsPaid({ id: orderId, ...snap.data() });
    } catch (err) {
      console.error("Failed to mark order as paid:", err);
      alert("Failed to mark order as paid.");
      btn.disabled = false;
      btn.textContent = "Mark as Paid";
    }
  });

  if (document.body) {
    document.body.dataset.markPaidListenerAttached = "true";
  }
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
      return aTime - bTime;
    });

    callback(orders);
  });
}