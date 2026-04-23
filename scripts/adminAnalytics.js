import {
  db,
  auth,
  getDocs,
  getDoc,
  addDoc,
  collection,
  doc,
  query,
  where,
  Timestamp,
  onAuthStateChanged
} from "./database.js";
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

let salesChartInstance = null;
let peakChartInstance = null;
let itemsChartInstance = null;

const renderCharts = (orders, vendors) => {
  const salesCanvas = document.getElementById("salesChart");
  const peakCanvas = document.getElementById("peakChart");
  const itemsCanvas = document.getElementById("itemsChart");

  if (!salesCanvas || !peakCanvas || !itemsCanvas || typeof Chart === "undefined") {
    return;
  }

  const vendorRevenue = {};
  orders.forEach((order) => {
    vendorRevenue[order.vendorId] =
      (vendorRevenue[order.vendorId] || 0) + (Number(order.total) || 0);
  });

  const salesLabels = Object.keys(vendorRevenue).map((vendorId) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor?.shopName || vendor?.fullName || "Unknown";
  });
  const salesData = Object.values(vendorRevenue);

  const hourCounts = {};
  orders.forEach((order) => {
    const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const hour = createdAt.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakLabels = Object.keys(hourCounts).sort((a, b) => Number(a) - Number(b));
  const peakData = peakLabels.map((hour) => hourCounts[hour]);

  const itemCounts = {};
  orders.forEach((order) => {
    (order.menuItems || []).forEach((item) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + (Number(item.quantity) || 1);
    });
  });

  const sortedItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const itemLabels = sortedItems.map(([name]) => name);
  const itemData = sortedItems.map(([, qty]) => qty);

  if (salesChartInstance) salesChartInstance.destroy();
  if (peakChartInstance) peakChartInstance.destroy();
  if (itemsChartInstance) itemsChartInstance.destroy();

  salesChartInstance = new Chart(salesCanvas, {
    type: "bar",
    data: {
      labels: salesLabels,
      datasets: [{ label: "Revenue", data: salesData }]
    }
  });

  peakChartInstance = new Chart(peakCanvas, {
    type: "line",
    data: {
      labels: peakLabels,
      datasets: [{ label: "Orders", data: peakData }]
    }
  });

  itemsChartInstance = new Chart(itemsCanvas, {
    type: "doughnut",
    data: {
      labels: itemLabels,
      datasets: [{ data: itemData }]
    }
  });
};

async function ensureAdmin() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("You must be logged in.");
    window.location.href = "index.html";
    return null;
  }

  const currentUserSnap = await getDoc(doc(db, "users", currentUser.uid));
  if (!currentUserSnap.exists()) {
    alert("User profile not found.");
    return null;
  }

  const currentUserData = currentUserSnap.data();
  if (currentUserData.role !== "admin") {
    alert("Access denied.");
    window.location.href = "index.html";
    return null;
  }

  return currentUserData;
}

export async function populateVendorFilter() {
  const vendorSelect = document.getElementById("report-vendor");
  if (!vendorSelect) return;

  const vendorSnapshot = await getDocs(
    query(collection(db, "users"), where("role", "==", "vendor"))
  );

  const vendors = vendorSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((vendor) => vendor.status === "approved");

  vendorSelect.innerHTML = `
    <option value="">All Vendors</option>
    ${vendors
      .map(
        (vendor) => `
      <option value="${vendor.id}">
        ${vendor.shopName || vendor.fullName || "Vendor"}
      </option>
    `
      )
      .join("")}
  `;
}

export const analytics = {
  generateSampleData: async () => {
    try {
      const admin = await ensureAdmin();
      if (!admin) return;

      const ordersSnapshot = await getDocs(collection(db, "orders"));
      if (!ordersSnapshot.empty) {
        alert("Orders already exist. Sample data was not generated.");
        return;
      }

      const usersSnapshot = await getDocs(
        query(collection(db, "users"), where("role", "==", "vendor"))
      );

      const vendors = usersSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((vendor) => vendor.status === "approved");

      const itemsSnapshot = await getDocs(collection(db, "menu_items"));
      const items = itemsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      if (!vendors.length || !items.length) {
        alert("Need approved vendors and menu items before generating sample data.");
        return;
      }

      const sampleOrders = [];

      for (let i = 0; i < 50; i++) {
        const vendor = vendors[Math.floor(Math.random() * vendors.length)];
        const vendorItems = items.filter((item) => item.vendorId === vendor.id);
        if (!vendorItems.length) continue;

        const menuItems = [];
        const numItems = Math.floor(Math.random() * 3) + 1;

        for (let j = 0; j < numItems; j++) {
          const item = vendorItems[Math.floor(Math.random() * vendorItems.length)];
          menuItems.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            vendorId: item.vendorId,
            vendorName: item.vendorName || vendor.shopName || vendor.fullName || "Vendor",
            image: item.image || "",
            description: item.description || "",
            allergens: item.allergens || [],
            dietary: item.dietary || [],
            category: item.category || ""
          });
        }

        const total = menuItems.reduce(
          (sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)),
          0
        );

        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        date.setHours(8 + Math.floor(Math.random() * 12));
        date.setMinutes(Math.floor(Math.random() * 60));
        date.setSeconds(0);
        date.setMilliseconds(0);

        sampleOrders.push({
          userId: `sampleUser${Math.floor(Math.random() * 10)}`,
          vendorId: vendor.id,
          vendorName: vendor.shopName || vendor.fullName || "Vendor",
          menuItems,
          total,
          status: "Collected",
          paymentMethod: "Card",
          createdAt: Timestamp.fromDate(date)
        });
      }

      await Promise.all(
        sampleOrders.map((order) => addDoc(collection(db, "orders"), order))
      );

      alert("Sample analytics data generated successfully.");
      await analytics.updateCustomView();
    } catch (error) {
      console.error("Error generating sample data:", error);
      alert("Failed to generate sample data.");
    }
  },

  updateCustomView: async () => {
    try {
      const admin = await ensureAdmin();
      if (!admin) return;

      const range = parseInt(document.getElementById("report-range")?.value || "7", 10);
      const vendorId = document.getElementById("report-vendor")?.value || "";
      const metric = document.getElementById("report-metric")?.value || "revenue";

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - range);

      const ordersSnapshot = await getDocs(collection(db, "orders"));
      const vendorsSnapshot = await getDocs(
        query(collection(db, "users"), where("role", "==", "vendor"))
      );

      const vendors = vendorsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      let orders = ordersSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      orders = orders.filter((o) => {
        const createdAt = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        return createdAt >= cutoff;
      });

      if (vendorId) {
        orders = orders.filter((o) => o.vendorId === vendorId);
      }

      const byDate = {};

      orders.forEach((o) => {
        const createdAt = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        const date = createdAt.toLocaleDateString("en-ZA");

        if (!byDate[date]) {
          byDate[date] = {
            orders: 0,
            revenue: 0,
            items: 0,
            vendor: o.vendorId
          };
        }

        byDate[date].orders += 1;
        byDate[date].revenue += Number(o.total) || 0;
        byDate[date].items += (o.menuItems || []).reduce(
          (sum, item) => sum + (Number(item.quantity) || 1),
          0
        );
      });

      const metricHeader = document.querySelector("#custom-report-view thead tr th:last-child");
      if (metricHeader) {
        metricHeader.textContent =
          metric === "revenue"
            ? "Selected Metric (Revenue)"
            : metric === "orders"
            ? "Selected Metric (Orders)"
            : "Selected Metric (Items)";
      }

      const tbody = document.getElementById("custom-report-body");
      if (!tbody) return;

      tbody.innerHTML = Object.entries(byDate)
        .map(([date, data]) => {
          const vendor = vendors.find((v) => v.id === data.vendor);

          let metricValue = "";
          if (metric === "revenue") {
            metricValue = `R${Number(data.revenue).toFixed(2)}`;
          } else if (metric === "orders") {
            metricValue = `${data.orders}`;
          } else {
            metricValue = `${data.items}`;
          }

          return `
            <tr>
              <td class="px-4 py-2">${date}</td>
              <td class="px-4 py-2">${vendor?.shopName || vendor?.fullName || "Unknown"}</td>
              <td class="px-4 py-2 text-right">${data.orders}</td>
              <td class="px-4 py-2 text-right">R${Number(data.revenue).toFixed(2)}</td>
              <td class="px-4 py-2 text-right">${metricValue}</td>
            </tr>
          `;
        })
        .join("");

      renderCharts(orders, vendors);
    } catch (error) {
      console.error("Error updating custom analytics view:", error);
      alert("Failed to load report data.");
    }
  },

  exportCSV: async () => {
    try {
      const admin = await ensureAdmin();
      if (!admin) return;

      const ordersSnapshot = await getDocs(collection(db, "orders"));
      const vendorsSnapshot = await getDocs(
        query(collection(db, "users"), where("role", "==", "vendor"))
      );

      const orders = ordersSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      const vendors = vendorsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      const data = orders.map((o) => {
        const vendor = vendors.find((v) => v.id === o.vendorId);
        const createdAt = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);

        return {
          OrderID: o.id,
          Date: createdAt.toLocaleDateString("en-ZA"),
          Vendor: vendor?.shopName || vendor?.fullName || o.vendorName || "Unknown",
          Customer: o.customerName || o.userId || "Anonymous",
          Items: (o.menuItems || [])
            .map((i) => `${i.quantity || 1}x ${i.name}`)
            .join("; "),
          Total: o.total,
          Status: o.status,
          PaymentMethod: o.paymentMethod || "N/A"
        };
      });

      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campusbites_report_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();

      alert("CSV exported successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV.");
    }
  },

  exportPDF: async () => {
    try {
      const admin = await ensureAdmin();
      if (!admin) return;

      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("jsPDF library is not loaded.");
        return;
      }

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();

      const ordersSnapshot = await getDocs(collection(db, "orders"));
      const vendorsSnapshot = await getDocs(
        query(collection(db, "users"), where("role", "==", "vendor"))
      );

      const orders = ordersSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      const vendors = vendorsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      pdf.setFontSize(20);
      pdf.text("CampusBites Analytics Report", 20, 20);

      pdf.setFontSize(12);
      pdf.text(`Generated: ${new Date().toLocaleDateString("en-ZA")}`, 20, 30);

      let y = 50;

      pdf.setFontSize(14);
      pdf.text("Summary", 20, y);
      y += 10;

      pdf.setFontSize(10);
      pdf.text(`Total Orders: ${orders.length}`, 20, y);
      y += 6;
      pdf.text(
        `Total Revenue: R${orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0).toFixed(2)}`,
        20,
        y
      );
      y += 6;
      pdf.text(`Active Vendors: ${vendors.length}`, 20, y);
      y += 20;

      pdf.setFontSize(14);
      pdf.text("Recent Orders", 20, y);
      y += 10;

      pdf.setFontSize(8);
      orders.slice(0, 10).forEach((o) => {
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }

        const vendor = vendors.find((v) => v.id === o.vendorId);
        pdf.text(
          `#${o.id.slice(-6)} - ${vendor?.shopName || vendor?.fullName || "Unknown"} - R${Number(o.total || 0).toFixed(2)} - ${o.status}`,
          20,
          y
        );
        y += 5;
      });

      pdf.save(`campusbites_report_${new Date().toISOString().split("T")[0]}.pdf`);
      alert("PDF exported successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF.");
    }
  }
};

export function initAnalyticsPage() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    await populateVendorFilter();
    await analytics.updateCustomView();
  });
}