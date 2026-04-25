import { auth, db, doc, getDoc } from "./database.js";
import { onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";


export function initAuthUI() {
    const CustomerdashboardLink = document.getElementById("CustomerdashboardLink");
    const VendordashboardLink = document.getElementById("VendordashboardLink");
    const AdmindashboardLink = document.getElementById("AdmindashboardLink");
    const CheckOutLink = document.getElementById("CheckOutLink");
    const CustomerProfileLink = document.getElementById("CustomerProfileLink");
    const loginBtn = document.getElementById("loginLink");
    const logoutBtn = document.getElementById("logoutBtn");

  onAuthStateChanged(auth, async (user) => {
      if (!user) {
        CustomerdashboardLink?.classList.add("hidden");
        VendordashboardLink?.classList.add("hidden");
        AdmindashboardLink?.classList.add("hidden");
        CheckOutLink?.classList.add("hidden");
        CustomerProfileLink?.classList.add("hidden");
        logoutBtn?.classList.add("hidden");
        loginBtn?.classList.remove("hidden");
        console.log("User is not logged in.");
        return;
      }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();

        if(data.role === "customer"){
          CustomerdashboardLink?.classList.remove("hidden");
          CheckOutLink?.classList.remove("hidden");
          CustomerProfileLink?.classList.remove("hidden");
        } else if(data.role === "vendor"){
          VendordashboardLink?.classList.remove("hidden");
        } else if(data.role === "admin"){
          AdmindashboardLink?.classList.remove("hidden");
        }

      logoutBtn?.classList.remove("hidden");
      loginBtn?.classList.add("hidden");
    }
  });
}

export async function logout() {
  try {
    await signOut(auth);

    console.log("User signed out successfully");

    window.location.href = "index.html";

  } catch (error) {
    console.error("Error signing out:", error);
  }
}