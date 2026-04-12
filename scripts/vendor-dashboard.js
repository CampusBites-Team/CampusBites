import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged
} from "./database.js";

onAuthStateChanged(auth, async (user) => {

  // ❌ Not logged in
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // ✅ Get user data
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    window.location.href = "login.html";
    return;
  }

  const userData = userSnap.data();

  // ❌ Not a vendor
  if (userData.role !== "vendor") {
    window.location.href = "index.html";
    return;
  }

  // ❌ Pending vendor
  if (userData.status === "pending") {
    window.location.href = "pending-approval.html";
    return;
  }

  // ❌ Suspended vendor
  if (userData.status === "suspended") {
    alert("Your account is suspended");
    window.location.href = "login.html";
    return;
  }

  // ✅ Only approved vendors reach here
  console.log("Access granted to vendor dashboard");

});

export const calculateRevenue = (orders) => {
  return orders.reduce((sum, o) => sum + (o.total || 0), 0);
};