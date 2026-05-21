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
import { showToast } from "./toast.js";

let allVendorOrders = [];
let analyticsChart;
let peakChart;
let itemsChart;
let currentFilteredOrders = [];

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
  currentFilteredOrders = allVendorOrders;
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

function getOrderDate(order) {
  return order.createdAt?.toDate ? order.createdAt.toDate() : null;
}

function isCollected(order) {
  return order.status === "Collected";
}

function calculateTotalRevenue(orders) {
  return orders
    .filter(isCollected)
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
}

function updateAnalytics(orders) {
  const totalOrders = orders.length;
  const collectedOrders = orders.filter(isCollected);
  const totalRevenue = calculateTotalRevenue(orders);

  document.getElementById("totalOrders").textContent = totalOrders;
  document.getElementById("collectedOrders").textContent = collectedOrders.length;
  document.getElementById("totalRevenue").textContent = `R${totalRevenue.toFixed(2)}`;

  updateAnalyticsChart(orders);
  updateAdditionalCharts(orders);
  updateCustomReport(orders);

  document.getElementById("analyticsMessage").textContent =
    `Showing ${totalOrders} orders, with ${collectedOrders.length} collected orders and R${totalRevenue.toFixed(2)} revenue.`;
}

function updateAdditionalCharts(orders) {
  const peakCanvas = document.getElementById("peakChart");
  const itemsCanvas = document.getElementById("itemsChart");

  if (!peakCanvas || !itemsCanvas) return;

  const hourlyOrders = {};

  orders.forEach((order) => {
    const orderDate = getOrderDate(order);

    if (!orderDate) return;

    const hour = orderDate.getHours();

    hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
  });

  const peakLabels = Object.keys(hourlyOrders).sort((a, b) => a - b);
  const peakData = peakLabels.map((hour) => hourlyOrders[hour]);

  if (peakChart) {
    peakChart.destroy();
  }

  peakChart = new Chart(peakCanvas, {
    type: "line",
    data: {
      labels: peakLabels,
      datasets: [{
        label: "Orders",
        data: peakData,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  const itemCounts = {};

  orders.forEach((order) => {
    (order.menuItems || []).forEach((item) => {
      itemCounts[item.name] =
        (itemCounts[item.name] || 0) + Number(item.quantity || 1);
    });
  });

  const sortedItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const itemLabels = sortedItems.map(([name]) => name);
  const itemData = sortedItems.map(([, qty]) => qty);

  if (itemsChart) {
    itemsChart.destroy();
  }

  itemsChart = new Chart(itemsCanvas, {
    type: "doughnut",
    data: {
      labels: itemLabels,
      datasets: [{
        data: itemData
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function updateAnalyticsChart(orders) {
  const chartElement = document.getElementById("analyticsChart");

  if (!chartElement) return;

  const revenueByDate = {};

  orders.forEach((order) => {
    if (!isCollected(order)) return;

    const orderDate = getOrderDate(order);
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

function updateCustomReport(orders) {
  const reportBody = document.getElementById("customReportBody");
  if (!reportBody) return;

  const reportByDate = {};

  orders.forEach((order) => {
    const orderDate = getOrderDate(order);
    if (!orderDate) return;

    const dateKey = orderDate.toLocaleDateString("en-ZA");

    if (!reportByDate[dateKey]) {
      reportByDate[dateKey] = {
        orders: 0,
        collected: 0,
        revenue: 0
      };
    }

    reportByDate[dateKey].orders += 1;

    if (isCollected(order)) {
      reportByDate[dateKey].collected += 1;
      reportByDate[dateKey].revenue += Number(order.total || 0);
    }
  });

  reportBody.innerHTML = Object.entries(reportByDate)
    .map(([date, data]) => {
      const avgOrderValue = data.collected > 0 ? data.revenue / data.collected : 0;

      return `
        <tr>
          <td class="px-4 py-2">${date}</td>
          <td class="px-4 py-2 text-right">${data.orders}</td>
          <td class="px-4 py-2 text-right">${data.collected}</td>
          <td class="px-4 py-2 text-right">R${data.revenue.toFixed(2)}</td>
          <td class="px-4 py-2 text-right">R${avgOrderValue.toFixed(2)}</td>
        </tr>
      `;
    })
    .join("");
}

function filterOrdersByDate(orders, startDate, endDate) {
  if (!startDate || !endDate) {
    return orders;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return orders.filter((order) => {

    const orderDate = getOrderDate(order);

    if (!orderDate) {
      return false;
    }

    return orderDate >= start && orderDate <= end;
  });
}

async function exportCSV() {
  const data = currentFilteredOrders.map((order) => {
    const orderDate = getOrderDate(order);

    return {
      OrderID: order.id,
      Date: orderDate ? orderDate.toLocaleDateString("en-ZA") : "N/A",
      Customer: order.customerName || order.userId || "Anonymous",
      Items: (order.menuItems || [])
        .map((item) => `${item.quantity || 1}x ${item.name}`)
        .join("; "),
      Total: Number(order.total || 0).toFixed(2),
      Status: order.status || "N/A",
      PaymentMethod: order.paymentMethod || "N/A"
    };
  });

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `vendor_analytics_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();

  window.URL.revokeObjectURL(url);
}

async function exportPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF library is not loaded.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const totalOrders = currentFilteredOrders.length;
  const collectedOrders = currentFilteredOrders.filter(isCollected).length;
  const totalRevenue = calculateTotalRevenue(currentFilteredOrders);

  pdf.setFontSize(20);
  pdf.text("CampusBites Vendor Analytics Report", 20, 20);

  pdf.setFontSize(12);
  pdf.text(`Generated: ${new Date().toLocaleDateString("en-ZA")}`, 20, 30);

  let y = 50;

  pdf.setFontSize(14);
  pdf.text("Summary", 20, y);
  y += 10;

  pdf.setFontSize(10);
  pdf.text(`Total Orders: ${totalOrders}`, 20, y);
  y += 6;
  pdf.text(`Collected Orders: ${collectedOrders}`, 20, y);
  y += 6;
  pdf.text(`Total Revenue: R${totalRevenue.toFixed(2)}`, 20, y);
  y += 20;

  pdf.setFontSize(14);
  pdf.text("Recent Orders", 20, y);
  y += 10;

  pdf.setFontSize(8);

  currentFilteredOrders.slice(0, 10).forEach((order) => {
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }

    pdf.text(
      `#${order.id.slice(-6)} - R${Number(order.total || 0).toFixed(2)} - ${order.status || "N/A"}`,
      20,
      y
    );

    y += 5;
  });

  pdf.save(`vendor_analytics_${new Date().toISOString().split("T")[0]}.pdf`);
}

document.getElementById("filterBtn")?.addEventListener("click", () => {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  currentFilteredOrders = filterOrdersByDate(allVendorOrders, startDate, endDate);
  updateAnalytics(currentFilteredOrders);
});

document.getElementById("exportCsvBtn")?.addEventListener("click", exportCSV);
document.getElementById("exportPdfBtn")?.addEventListener("click", exportPDF);

lucide.createIcons();