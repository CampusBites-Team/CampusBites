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

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const data = userDoc.data();
  listenToVendorOrders(data.shopName, renderOrders);
});

// ── Pure helper: build HTML for a single order ──────────────
export function buildOrderHTML(order) {
  const items = (order.items || [])
    .map(i => `<p>- ${i.name} x${i.quantity ?? 1}</p>`)
    .join("");

  return `
    <div class="bg-white p-4 rounded-xl shadow mb-4">
      <h3 class="font-bold">Order ${order.id}</h3>
      <p class="text-sm text-gray-500">User: ${order.userId}</p>
      <div class="mt-2">${items}</div>
      <p class="mt-2 font-semibold">Status: ${order.status || "new"}</p>
    </div>
  `;
}

// ── Pure helper: map Firestore snapshot docs to plain objects ─
export function mapSnapshotToOrders(snapshot) {
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── DOM function ─────────────────────────────────────────────
export function renderOrders(orders) {
  const container = document.getElementById("newOrders");
  container.innerHTML = orders.map(buildOrderHTML).join("");
}

// ── Firebase listener ────────────────────────────────────────
export function listenToVendorOrders(shopName, callback) {
  const q = query(
    collection(db, "orders"),
    where("shopName", "==", shopName),
    where("status", "==", "new")
  );

  return onSnapshot(q, (snapshot) => {
    callback(mapSnapshotToOrders(snapshot));
  });
}