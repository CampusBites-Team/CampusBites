import {
  db,
  getDocs,
  collection,
  updateDoc,
  doc
} from './database.js';

// Navigation buttons
const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
const manageVendorsBtn = document.getElementById('manageVendorsBtn');

if (viewAnalyticsBtn) {
  viewAnalyticsBtn.addEventListener('click', () => {
    window.location.href = 'admin-analytics.html';
  });
}

if (manageVendorsBtn) {
  manageVendorsBtn.addEventListener('click', () => {
    window.location.href = 'vendor-management.html';
  });
}

// Stats elements
const totalvendors = document.getElementById('admin-total-vendors');
const activevendors = document.getElementById('admin-active-today');
const pendingVendors = document.getElementById('admin-pending');
const totalRevenue = document.getElementById('admin-total-revenue');

// =====================
// STATS LOGIC
// =====================
export const calculateVendorStats = (users) => {
  let total = 0;
  let active = 0;
  let pending = 0;

  users.forEach(u => {
    if (u.role !== "vendor") return;

    total++;

    const status = u.status || "pending";

    if (status === "approved") active++;
    else if (status === "pending") pending++;
  });

  return { total, active, pending };
};

// =====================
// LOAD ADMIN DASHBOARD
// =====================
const loadAdminStats = async () => {
  try {
    const vendorSnapshot = await getDocs(collection(db, "users"));

    const users = vendorSnapshot.docs
      ? vendorSnapshot.docs.map(d => d.data())
      : [];

    const stats = calculateVendorStats(users);

    if (totalvendors) totalvendors.textContent = stats.total;
    if (activevendors) activevendors.textContent = stats.active;
    if (pendingVendors) pendingVendors.textContent = stats.pending;

    const ordersSnapshot = await getDocs(collection(db, "orders"));

    let revenue = 0;

    ordersSnapshot.docs.forEach(d => {
      const order = d.data();
      revenue += order.total || 0;
    });

    if (totalRevenue) {
      totalRevenue.textContent = `R${revenue.toFixed(2)}`;
    }

  } catch (err) {
    console.error(err);
  }
};

// =====================
// VENDOR TABLE
// =====================
const loadVendors = async () => {
  try {
    const snapshot = await getDocs(collection(db, "users"));

    const vendors = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(v => v.role === "vendor");

    const tbody = document.getElementById('vendor-table-body');
    if (!tbody) return;

    tbody.innerHTML = vendors.map(v => `
      <tr>
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <img src="${v.image || ''}" class="w-10 h-10 rounded">
            <div>
              <div>${v.fullName || "No Name"}</div>
              <div class="text-xs">${v.shopName || ""}</div>
            </div>
          </div>
        </td>

        <td>${v.email || ""}</td>
        <td>${v.location || ""}</td>

        <td>
          <span>${v.status || "pending"}</span>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
  }
};

// =====================
export const initAdminDashboard = () => {
  loadAdminStats();
  loadVendors();
};

if (typeof window !== "undefined" && !window.__JEST__) {
  document.addEventListener("DOMContentLoaded", initAdminDashboard);
}