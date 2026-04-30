import {
  auth,
  db,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onAuthStateChanged
} from "./database.js";

let allVendorOrders = [];
let analyticsChart;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists()) {
    window.location.href = "login.html";
    return;
  }

  const userData = userSnap.data();

  if (userData.role !== "vendor") {
    window.location.href = "index.html";
    return;
  }

  allVendorOrders = await fetchVendorOrders(user.uid);
  updateAnalytics(allVendorOrders);
});

async function fetchVendorOrders(vendorId) {
  const ordersQuery = query(
    collection(db, "orders"),
    where("vendorId", "==", vendorId)
  );

  const snapshot = await getDocs(ordersQuery);

  return snapshot.docs.map((orderDoc) => ({
    id: orderDoc.id,
    ...orderDoc.data()
  }));
}

function updateAnalytics(orders) {
  const totalOrders = orders.length;

  const collectedOrders = orders.filter((order) => {
    return order.status === "Collected";
  });

  const totalRevenue = collectedOrders.reduce((sum, order) => {
    return sum + Number(order.total || 0);
  }, 0);

  document.getElementById("totalOrders").textContent = totalOrders;
  document.getElementById("collectedOrders").textContent = collectedOrders.length;
  document.getElementById("totalRevenue").textContent = `R${totalRevenue.toFixed(2)}`;

  updateAnalyticsChart(orders);

  document.getElementById("analyticsMessage").textContent =
    `Showing ${totalOrders} orders, with ${collectedOrders.length} collected orders and R${totalRevenue.toFixed(2)} revenue.`;
}

function updateAnalyticsChart(orders) {
  const chartElement = document.getElementById("analyticsChart");

  if (!chartElement) return;

  const revenueByDate = {};

  orders.forEach((order) => {
    if (order.status !== "Collected") return;

    const orderDate = order.createdAt?.toDate?.();

    if (!orderDate) return;

    const dateKey = orderDate.toLocaleDateString("en-CA");

    revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + Number(order.total || 0);
  });

  const labels = Object.keys(revenueByDate).sort();
  const revenueData = labels.map((date) => revenueByDate[date]);

  if (analyticsChart) {
    analyticsChart.destroy();
  }

  analyticsChart = new Chart(chartElement, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Revenue Over Time",
        data: revenueData,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function filterOrdersByDate(orders, startDate, endDate) {
  if (!startDate || !endDate) {
    return orders;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return orders.filter((order) => {

    console.log(order.status, order.total, order.createdAt?.toDate?.());

    const orderDate = order.createdAt?.toDate?.();

    if (!orderDate) {
      return false;
    }

    return orderDate >= start && orderDate <= end;
  });
}

document.getElementById("filterBtn")?.addEventListener("click", () => {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  const filteredOrders = filterOrdersByDate(allVendorOrders, startDate, endDate);
  updateAnalytics(filteredOrders);
});

lucide.createIcons();