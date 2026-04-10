import { auth, db, doc, getDoc } from "./database.js";
import { onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";


export function initAuthUI() {
    const CustomerdashboardLink = document.getElementById("CustomerdashboardLink");
    const VendordashboardLink = document.getElementById("VendordashboardLink");
    const loginBtn = document.getElementById("loginLink");
    const logoutBtn = document.getElementById("logoutBtn");

  onAuthStateChanged(auth, async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      // ✅ User is logged in
        if(data.role === "customer"){
          CustomerdashboardLink?.classList.remove("hidden");
        } else if(data.role === "vendor"){
          VendordashboardLink?.classList.remove("hidden");
        }
      logoutBtn?.classList.remove("hidden");
      loginBtn?.classList.add("hidden");

    } else {
      // ❌ User is NOT logged in
      CustomerdashboardLink?.classList.add("hidden");
      VendordashboardLink?.classList.add("hidden");
      logoutBtn?.classList.add("hidden");
      loginBtn?.classList.remove("hidden");
    }
  });
}
export function logout() {
  signOut(auth)
    .then(() => {
      console.log("User signed out successfully");
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
}