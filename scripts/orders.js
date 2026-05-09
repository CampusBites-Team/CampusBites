import {
  db,
  auth,
  getDoc,
  collection,
  doc,
  where,
  query,
  onAuthStateChanged,
  onSnapshot
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

function formatTimestamp(timestamp) {
  if (!timestamp?.toDate) return "Not available";

  return timestamp.toDate().toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function buildOrderHTML(order, index) {
  const items = (order.menuItems || [])
    .map(item => `<p>- ${item.name} x${item.quantity ?? 1}</p>`)
    .join("");

  return `
    <article class="bg-white p-4 rounded-xl shadow mb-4">
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
        Status: ${order.status || "Pending"}
      </p>
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
  const newOrdersContainer = document.getElementById("newOrders");
  const inProgressContainer = document.getElementById("inProgress");
  const completedOrdersContainer = document.getElementById("completedOrders");

  if (!newOrdersContainer || !inProgressContainer || !completedOrdersContainer) return;

  const enrichedOrders = await enrichOrdersWithCustomerNames(orders);

  const pendingOrders = enrichedOrders.filter(order => (order.status || "Pending") === "Pending");
  const inProgressOrders = enrichedOrders.filter(order => {
    const status = order.status || "Pending";
    return status === "Preparing" || status === "Ready";
  });
  const completedOrders = enrichedOrders.filter(order => (order.status || "Pending") === "Collected");

  newOrdersContainer.innerHTML = pendingOrders.length
    ? pendingOrders.map((order, index) => buildOrderHTML(order, index)).join("")
    : `<p class="text-gray-500">No pending orders.</p>`;

  inProgressContainer.innerHTML = inProgressOrders.length
    ? inProgressOrders.map((order, index) => buildOrderHTML(order, index)).join("")
    : `<p class="text-gray-500">No orders in progress.</p>`;

  completedOrdersContainer.innerHTML = completedOrders.length
    ? completedOrders.map((order, index) => buildOrderHTML(order, index)).join("")
    : `<p class="text-gray-500">No collected orders.</p>`;

  lucide.createIcons();
}

function listenToVendorOrders(vendorId, callback) {
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