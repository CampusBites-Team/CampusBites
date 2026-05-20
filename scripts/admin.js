import {
  auth,
  db,
  getDocs,
  collection,
  updateDoc,
  doc
} from './database.js';

// Navigation buttons
const viewAnalyticsBtn = document.getElementById("viewAnalyticsBtn");
const manageVendorsBtn = document.getElementById("manageVendorsBtn");

if (viewAnalyticsBtn) {
  viewAnalyticsBtn.addEventListener("click", () => {
    window.location.href = "admin-analytics.html";
  });
}

if (manageVendorsBtn) {
  manageVendorsBtn.addEventListener("click", () => {
    window.location.href = "vendor-management.html";
  });
}

// Stats elements
const totalvendors = document.getElementById("admin-total-vendors");
const activevendors = document.getElementById("admin-active-today");
const pendingVendors = document.getElementById("admin-pending");
const totalRevenue = document.getElementById("admin-total-revenue");

// Chart instances
let salesChartInstance = null;
let peakChartInstance = null;
let itemsChartInstance = null;

export const calculateVendorStats = (users) => {
  let total = 0;
  let active = 0;
  let pending = 0;

  users.forEach((u) => {
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
    const users = vendorSnapshot.docs.map((docSnap) => docSnap.data());

    const { total, active, pending } = calculateVendorStats(users);

    if (totalvendors) totalvendors.textContent = total;
    if (activevendors) activevendors.textContent = active;
    if (pendingVendors) pendingVendors.textContent = pending;

    const ordersSnapshot = await getDocs(collection(db, "orders"));

    let revenue = 0;
    ordersSnapshot.forEach((docSnap) => {
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
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((u) => u.role === "vendor");

    const tbody = document.getElementById("vendor-table-body");
    if (!tbody) return;

    tbody.innerHTML = vendors
      .map(
        (v) => `
      <tr>
        <td class="px-6 py-4">
          <section class="flex items-center gap-3">
            <img src="${v.image || "https://static.photos/nature/640x360/3"}"
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
          <span class="px-3 py-1 rounded-full text-sm font-semibold capitalize
            ${
              v.status === "approved"
                ? "bg-green-100 text-green-700 border border-green-200"
                : v.status === "pending"
                ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }">
            ${v.status}
          </span>
        </td>

        <td class="px-6 py-4">
          <section class="flex flex-wrap items-center gap-3">
  ${
    v.status === "pending"
      ? `
    <button onclick="adminActions.approveVendor('${v.id}')"
      class="admin-action-btn admin-approve-btn">
      <i data-lucide="check" class="w-4 h-4"></i>
      Approve
    </button>

    <button onclick="adminActions.suspendVendor('${v.id}')"
      class="admin-action-btn admin-reject-btn">
      <i data-lucide="x" class="w-4 h-4"></i>
      Reject
    </button>
  `
      : v.status === "approved"
      ? `
    <button onclick="adminActions.suspendVendor('${v.id}')"
      class="admin-action-btn admin-suspend-btn">
      <i data-lucide="pause-circle" class="w-4 h-4"></i>
      Suspend
    </button>
  `
      : `
    <button onclick="adminActions.approveVendor('${v.id}')"
      class="admin-action-btn admin-approve-btn">
      <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
      Reactivate
    </button>
  `
  }
</section>
        </td>
      </tr>
    `
      )
      .join("");
      globalThis.lucide?.createIcons?.();
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
      const caller = auth.currentUser;
      if (!caller) {
        alert("You must be signed in as admin to approve vendors.");
        return;
      }
      const idToken = await caller.getIdToken();

      const res = await fetch("/api/paystack/create-subaccount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ vendorId })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Subaccount creation failed (${res.status})`);
      }

      await updateDoc(doc(db, "users", vendorId), {
        status: "approved"
      });

      loadVendors();
    } catch (error) {
      console.error("Error approving vendor:", error);
      alert("Could not approve vendor: " + error.message);
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

// =====================
// ADMIN ANALYTICS
// =====================



//======================
//Payment gateway health check
//======================
export async function checkPaystackHealth() {
  const card = document.getElementById("paystack-health");
  if (!card) return;
  const label = card.querySelector("span:last-child");
  if (!label) return;
  try {
    const r = await fetch("/api/paystack/health");
    const data = await r.json();
    const ok = data.status === "operational";
    card.className = `flex justify-between items-center p-3 rounded-lg ${
      ok ? "bg-green-50" : "bg-red-50"
    }`;
    label.className = `text-sm font-medium ${ok ? "text-green-600" : "text-red-600"}`;
    label.textContent = ok ? `Operational (${data.latencyMs}ms)` : "Down";
  } catch {
    label.textContent = "Unreachable";
  }
}

if (document.getElementById("paystack-health")) {
  checkPaystackHealth();
  setInterval(checkPaystackHealth, 60_000); // re-check every minute
}





// keep globals for inline usage if needed
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