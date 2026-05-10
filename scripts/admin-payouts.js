import {
  auth,
  db,
  doc,
  getDoc,
  getDocs,
  collection,
  onAuthStateChanged
} from "./database.js";

const fmt = (n) => `R${(Number(n) || 0).toFixed(2)}`;

let currentRole = null;

async function loadPayouts() {
  const tbody = document.getElementById("payouts-body");
  tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400">Loading...</td></tr>`;

  const ledgerCol = collection(db, "wallet_ledger");
  const snap = await getDocs(ledgerCol);

  let settledTotal = 0;
  let refundedTotal = 0;
  let campusReceived = 0;

  const groups = new Map();

  snap.forEach((d) => {
    const e = d.data() || {};
    const amount = Number(e.amount) || 0;

    if (e.wallet === "campus_bites" || e.vendorId == null) {
      if (e.status === "received") campusReceived += amount;
      return;
    }

    if (e.status === "refunded") {
      refundedTotal += amount;
      return;
    }

    if (e.status === "settled") {
      settledTotal += amount;
      const key = e.vendorId;
      if (!groups.has(key)) {
        groups.set(key, { vendorId: key, vendorName: e.vendorName || "(unknown)", entries: [], total: 0 });
      }
      const g = groups.get(key);
      g.entries.push({ id: d.id, ...e });
      g.total += amount;
    }
  });

  document.getElementById("summary-settled").textContent = fmt(settledTotal);
  document.getElementById("summary-refunded").textContent = fmt(refundedTotal);
  document.getElementById("summary-campus").textContent = fmt(campusReceived);

  if (groups.size === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400">No settled payouts yet.</td></tr>`;
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
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Settled
          </span>
        </td>
      </tr>
    `).join("");

  tbody.innerHTML = rows;
}

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
