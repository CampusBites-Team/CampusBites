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

export const calculateVendorStats = (users) => {
  let total = 0;
  let active = 0;
  let pending = 0;

  users.forEach(u => {
    if (u.role === "vendor") {
      total++;
      const status = u.status || "pending";
      if (status === "approved") active++;
      if (status === "pending") pending++;
    }
  });

  return { total, active, pending };
};

// =====================
// LOAD ADMIN DASHBOARD
// =====================
export const loadAdminStats = async () => {
  try {
    const vendorSnapshot = await getDocs(collection(db, "users"));
    const users = vendorSnapshot.docs.map(docSnap => docSnap.data());

    const { total, active, pending } = calculateVendorStats(users);

    if (totalvendors) totalvendors.textContent = total;
    if (activevendors) activevendors.textContent = active;
    if (pendingVendors) pendingVendors.textContent = pending;

    const ordersSnapshot = await getDocs(collection(db, "orders"));

    let revenue = 0;
    ordersSnapshot.forEach(docSnap => {
      const order = docSnap.data();
      revenue += order.total || 0;
    });

    if (totalRevenue) {
      totalRevenue.textContent = `R${revenue.toFixed(2)}`;
    }
  } catch (error) {
    console.error("Error loading admin stats:", error);
  }
};

// =====================
// VENDOR MANAGEMENT
// =====================
export const loadVendors = async () => {
  try {
    const snapshot = await getDocs(collection(db, "users"));

    const vendors = snapshot.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .filter(u => u.role === "vendor");

    const tbody = document.getElementById('vendor-table-body');
    if (!tbody) return;

    tbody.innerHTML = vendors.map(v => `
      <tr>
        <td class="px-6 py-4">
          <section class="flex items-center gap-3">
            <img src="${v.image || 'https://static.photos/nature/640x360/3'}"
                 class="w-10 h-10 rounded object-cover">

            <section>
              <span class="font-medium">${v.fullName || "No Name"}</span>
              <span class="text-xs text-gray-500 block">${v.shopName || "Not specified"}</span>
            </section>
          </section>
        </td>

        <td class="px-6 py-4 text-sm text-gray-500">${v.email || "Not specified"}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${v.location || "Not specified"}</td>

        <td class="px-6 py-4">
          <span class="px-2 py-1 rounded-full text-xs capitalize
            ${v.status === 'approved'
              ? 'bg-green-100 text-green-800'
              : v.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'}">
            ${v.status}
          </span>
        </td>

        <td class="px-6 py-4">
          <section class="flex gap-2">
            ${v.status === 'pending' ? `
              <button onclick="adminActions.approveVendor('${v.id}')"
                class="text-green-600 hover:text-green-800">
                Approve
              </button>

              <button onclick="adminActions.suspendVendor('${v.id}')"
                class="text-red-600 hover:text-red-800">
                Reject
              </button>
            ` : v.status === 'approved' ? `
              <button onclick="adminActions.suspendVendor('${v.id}')"
                class="text-yellow-600 hover:text-yellow-800">
                Suspend
              </button>
            ` : `
              <button onclick="adminActions.approveVendor('${v.id}')"
                class="text-green-600 hover:text-green-800">
                Reactivate
              </button>
            `}
          </section>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error("Error loading vendors:", error);
  }
};

// =====================
// ADMIN ACTIONS
// =====================
export const adminActions = {
  approveVendor: async (vendorId) => {
    try {
      await updateDoc(doc(db, "users", vendorId), {
        status: "approved"
      });

      loadVendors();
    } catch (error) {
      console.error("Error approving vendor:", error);
    }
  },

  suspendVendor: async (vendorId) => {
    try {
      await updateDoc(doc(db, "users", vendorId), {
        status: "suspended"
      });

      loadVendors();
    } catch (error) {
      console.error("Error suspending vendor:", error);
    }
  }
};

// keep global for inline onclick
window.adminActions = adminActions;

// =====================
// INIT
// =====================

export const initAdminDashboard = async () => {
 await loadAdminStats();
  await loadVendors();
};

document.addEventListener("DOMContentLoaded", () => {
  initAdminDashboard();
});