import {
  auth,
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "./database.js"; 


// bringeing the update menu section
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".tab-btn");
  const tabContent = document.getElementById("tabContent");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");

      // show container
      tabContent.classList.remove("hidden");

      // hide all panels
      panels.forEach(p => p.classList.add("hidden"));

      // show selected panel
      document.getElementById(tab + "Tab").classList.remove("hidden");

      // scroll into view (optional but nice)
      tabContent.scrollIntoView({ behavior: "smooth" });
    });
  });
});


//identify vendor
let currentVendorId = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentVendorId = user.uid;

 // loadMenuItems();
 // loadOrders();
})
 ;
