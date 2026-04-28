import {
  auth,
  db,
  doc,
  getDoc,
  updateDoc,
  onAuthStateChanged
} from "./database.js";

function formatVendorDetails(shopName, location) {
  if (!shopName && !location) {
    return "No vendor details set yet.";
  }

  const displayShopName = shopName || "Shop name not set";
  const displayLocation = location || "Location not set";

  return `${displayShopName} • ${displayLocation}`;
}

function formatOperatingHours(openingTime, closingTime) {
  if (!openingTime || !closingTime) {
    return "No operating hours set yet.";
  }

  return `${openingTime} - ${closingTime}`;
}

function fillVendorDetails(userData) {
  document.getElementById("shopName").value = userData.shopName || "";
  document.getElementById("location").value = userData.location || "";

  document.getElementById("savedVendorDetails").textContent =
    formatVendorDetails(userData.shopName, userData.location);
}

function fillOperatingHours(userData) {
  document.getElementById("openingTime").value = userData.openingTime || "";
  document.getElementById("closingTime").value = userData.closingTime || "";

  document.getElementById("savedOperatingHours").textContent =
    formatOperatingHours(userData.openingTime, userData.closingTime);
}

function attachVendorDetailsForm(vendorId, userData) {
  const vendorDetailsForm = document.getElementById("vendorDetailsForm");

  if (!vendorDetailsForm || vendorDetailsForm.dataset.listenerAttached === "true") {
    return;
  }

  vendorDetailsForm.dataset.listenerAttached = "true";

  vendorDetailsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const shopName = document.getElementById("shopName").value.trim();
    const location = document.getElementById("location").value.trim();

    if (!shopName) {
      alert("Please enter your shop name.");
      return;
    }

    if (!location) {
      alert("Please enter your shop location.");
      return;
    }

    const userRef = doc(db, "users", vendorId);

    await updateDoc(userRef, {
      shopName,
      location
    });

    userData.shopName = shopName;
    userData.location = location;

    fillVendorDetails(userData);
    alert("Vendor details updated successfully.");
  });
}

function attachOperatingHoursForm(vendorId, userData) {
  const operatingHoursForm = document.getElementById("operatingHoursForm");

  if (!operatingHoursForm || operatingHoursForm.dataset.listenerAttached === "true") {
    return;
  }

  operatingHoursForm.dataset.listenerAttached = "true";

  operatingHoursForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const openingTime = document.getElementById("openingTime").value;
    const closingTime = document.getElementById("closingTime").value;

    if (!openingTime || !closingTime) {
      alert("Please enter both opening and closing times.");
      return;
    }

    if (openingTime >= closingTime) {
      alert("Closing time must be after opening time.");
      return;
    }

    const userRef = doc(db, "users", vendorId);

    await updateDoc(userRef, {
      openingTime,
      closingTime
    });

    userData.openingTime = openingTime;
    userData.closingTime = closingTime;

    fillOperatingHours(userData);
    alert("Operating hours updated successfully.");
  });
}

export function initVendorSettings(locationObj = window.location) {
  onAuthStateChanged(auth, async (user) => {
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

    if (userData.role !== "vendor") {
      locationObj.href = "index.html";
      return;
    }

    if (userData.status === "pending") {
      locationObj.href = "pending-approval.html";
      return;
    }

    if (userData.status === "suspended") {
      alert("Your account is suspended");
      locationObj.href = "login.html";
      return;
    }

    fillVendorDetails(userData);
    fillOperatingHours(userData);

    attachVendorDetailsForm(user.uid, userData);
    attachOperatingHoursForm(user.uid, userData);
  });
}

if (typeof window !== "undefined") {
  if (document.readyState !== "loading") {
    initVendorSettings();
  } else {
    document.addEventListener("DOMContentLoaded", initVendorSettings);
  }
}