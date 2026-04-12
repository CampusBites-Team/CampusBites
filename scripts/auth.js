import { auth, db, doc, getDoc } from "./database.js";
import { onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";


export function initAuthUI() {
    const CustomerdashboardLink = document.getElementById("CustomerdashboardLink");
    const VendordashboardLink = document.getElementById("VendordashboardLink");
    const AdmindashboardLink = document.getElementById("AdmindashboardLink");
    const loginBtn = document.getElementById("loginLink");
    const logoutBtn = document.getElementById("logoutBtn");

  onAuthStateChanged(auth, async (user) => {
      if (!user) {
    // optional safety redirect for protected pages
    return;
  }
    if (user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      // ✅ User is logged in
        if(data.role === "customer"){
          CustomerdashboardLink?.classList.remove("hidden");
        } else if(data.role === "vendor"){
          VendordashboardLink?.classList.remove("hidden");
        } else if(data.role === "admin"){
          AdmindashboardLink?.classList.remove("hidden");
        }
      logoutBtn?.classList.remove("hidden");
      loginBtn?.classList.add("hidden");

    } }
    else {
      // ❌ User is NOT logged in
      CustomerdashboardLink?.classList.add("hidden");
      VendordashboardLink?.classList.add("hidden");
      AdmindashboardLink?.classList.add("hidden");
      logoutBtn?.classList.add("hidden");
      loginBtn?.classList.remove("hidden");
      console.log("User is not logged in.");
    }
  });
}
export async function logout() {
  try {
    await signOut(auth);

    console.log("User signed out successfully");

    // 🔥 ALWAYS redirect after logout
    window.location.href = "index.html";

  } catch (error) {
    console.error("Error signing out:", error);
  }
}