import {
  auth,
  db,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  onAuthStateChanged
} from "./database.js";

const fmt = (n) => `R${(Number(n) || 0).toFixed(2)}`;

let currentRole = null;

async function loadPayouts() {
  const tbody = document.getElementById("payouts-body");
  tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400">Loading...</td></tr>`;

  const ledgerCol = collection(db, "wallet_ledger");
  const snap = await getDocs(ledgerCol);

  let pendingTotal = 0;
  let paidOutTotal = 0;
  let campusReceived = 0;

  // Group vendor "pending_payout" credits by vendorId
  const groups = new Map();

  snap.forEach((d) => {
    const e = d.data() || {};
    const amount = Number(e.amount) || 0;

    if (e.wallet === "campus_bites" || e.vendorId == null) {
      campusReceived += amount;
      return;
    }

    if (e.status === "paid_out") {
      paidOutTotal += amount;
      return;
    }

    if (e.status === "pending_payout") {
      pendingTotal += amount;
      const key = e.vendorId;
      if (!groups.has(key)) {
        groups.set(key, { vendorId: key, vendorName: e.vendorName || "(unknown)", entries: [], total: 0 });
      }
      const g = groups.get(key);
      g.entries.push({ id: d.id, ...e });
      g.total += amount;
    }
  });

  document.getElementById("summary-pending").textContent = fmt(pendingTotal);
  document.getElementById("summary-paid-out").textContent = fmt(paidOutTotal);
  document.getElementById("summary-campus").textContent = fmt(campusReceived);

  if (groups.size === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400">No pending payouts.</td></tr>`;
    return;
  }

  const rows = [...groups.values()]
    .sort((a, b) => b.total - a.total)
    .map((g) => `
      <tr data-vendor-id="${g.vendorId}">
        <td class="px-6 py-4">
          <p class="font-medium text-gray-900">${g.vendorName}</p>
          <p class="text-xs text-gray-500">${g.vendorId}</p>
        </td>
        <td class="px-6 py-4 text-gray-700">${g.entries.length}</td>
        <td class="px-6 py-4 font-semibold text-indigo-600">${fmt(g.total)}</td>
        <td class="px-6 py-4 text-right">
          <button
            class="mark-paid-btn bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-50"
            data-vendor-id="${g.vendorId}"
          >
            Mark as paid
          </button>
        </td>
      </tr>
    `).join("");

  tbody.innerHTML = rows;

  // Stash entry ids per vendor on the buttons for the click handler
  for (const g of groups.values()) {
    const btn = tbody.querySelector(`button[data-vendor-id="${g.vendorId}"]`);
    if (btn) btn.dataset.entryIds = g.entries.map((e) => e.id).join(",");
  }
}

async function markVendorPaid(vendorId, entryIds) {
  if (!confirm(`Mark ${entryIds.length} ledger entries as paid out for vendor ${vendorId}?`)) {
    return false;
  }

  const paidOutAt = new Date().toISOString();
  await Promise.all(entryIds.map((id) =>
    updateDoc(doc(db, "wallet_ledger", id), {
      status: "paid_out",
      paidOutAt
    })
  ));
  return true;
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".mark-paid-btn");
  if (!btn) return;
  if (currentRole !== "admin") {
    alert("You must be signed in as admin to mark payouts.");
    return;
  }

  const vendorId = btn.dataset.vendorId;
  const entryIds = (btn.dataset.entryIds || "").split(",").filter(Boolean);
  if (!entryIds.length) return;

  btn.disabled = true;
  btn.textContent = "Marking...";
  try {
    const did = await markVendorPaid(vendorId, entryIds);
    if (did) await loadPayouts();
    else { btn.disabled = false; btn.textContent = "Mark as paid"; }
  } catch (err) {
    console.error("markVendorPaid failed", err);
    alert("Failed to mark as paid: " + err.message);
    btn.disabled = false;
    btn.textContent = "Mark as paid";
  }
});

onAuthStateChanged(auth, async (user) => {
  const warn = document.getElementById("auth-warning");
  if (!user) {
    warn?.classList.remove("hidden");
    return;
  }
  const userSnap = await getDoc(doc(db, "users", user.uid));
  const role = userSnap.exists() ? (userSnap.data().role || null) : null;
  currentRole = role;
  if (role !== "admin") {
    warn?.classList.remove("hidden");
    document.getElementById("payouts-body").innerHTML =
      `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400">Admins only.</td></tr>`;
    return;
  }
  warn?.classList.add("hidden");
  await loadPayouts();
});

export { loadPayouts };
