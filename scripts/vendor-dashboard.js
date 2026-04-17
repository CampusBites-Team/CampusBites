import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged
} from "./database.js";

// ---------------- AUTH GUARD ----------------
export function initVendorDashboard(locationObj = window.location, alertFn = alert) {
  onAuthStateChanged(auth, async (user) => {

    // ❌ Not logged in
    if (!user) {
      locationObj.href = "login.html";
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      locationObj.href = "login.html";
      return;
    }

    const userData = userSnap.data();

    // ❌ Not a vendor
    if (userData.role !== "vendor") {
      locationObj.href = "index.html";
      return;
    }

    // ❌ Pending vendor
    if (userData.status === "pending") {
      locationObj.href = "pending-approval.html";
      return;
    }

    // ❌ Suspended vendor
    if (userData.status === "suspended") {
      alertFn("Your account is suspended");
      locationObj.href = "login.html";
      return;
    }

    // ✅ Approved vendor
    console.log("Access granted to vendor dashboard");
  });
}

// ---------------- UTILS ----------------
export const calculateRevenue = (orders) => {
  return orders.reduce((sum, o) => sum + (o.total || 0), 0);
};
