import {
  db,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where
} from "./database.js";

function getVendorIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("vendorId");
}

function showVendorImage(imageURL) {
  const vendorImage = document.getElementById("vendorImage");
  const vendorImageFallback = document.getElementById("vendorImageFallback");

  if (!imageURL) return;

  vendorImage.src = imageURL;
  vendorImage.classList.remove("hidden");
  vendorImageFallback.classList.add("hidden");
}

function formatOperatingHours(openingTime, closingTime) {
  if (!openingTime || !closingTime) {
    return "Operating hours not set";
  }

  return `${openingTime} - ${closingTime}`;
}

function isVendorOpen(openingTime, closingTime) {
  if (!openingTime || !closingTime) {
    return false;
  }

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);

  return currentTime >= openingTime && currentTime <= closingTime;
}

function renderVendorDetails(vendorData) {
  const vendorName = document.getElementById("vendorName");
  const vendorLocation = document.getElementById("vendorLocation");
  const vendorHours = document.getElementById("vendorHours");
  const vendorStatus = document.getElementById("vendorStatus");

  vendorName.textContent = vendorData.shopName || "Vendor";
  vendorLocation.textContent = vendorData.location || "Location not available";
  vendorHours.textContent = formatOperatingHours(vendorData.openingTime, vendorData.closingTime);

  const openNow = isVendorOpen(vendorData.openingTime, vendorData.closingTime);

  if (openNow) {
    vendorStatus.textContent = "Open Now";
    vendorStatus.className = "px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700";
  } else {
    vendorStatus.textContent = "Closed Now";
    vendorStatus.className = "px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700";
  }

  showVendorImage(vendorData.image);
}

async function fetchVendorMenuItems(vendorId) {
  const menuQuery = query(
    collection(db, "menu_items"),
    where("vendorId", "==", vendorId)
  );

  const snapshot = await getDocs(menuQuery);

  return snapshot.docs.map((menuDoc) => ({
    id: menuDoc.id,
    ...menuDoc.data()
  }));
}

function renderVendorMenu(items) {
  const vendorMenu = document.getElementById("vendorMenu");

  const availableItems = items.filter((item) => item.available);

  if (!availableItems.length) {
    vendorMenu.innerHTML = `<p class="text-gray-500">No available menu items yet.</p>`;
    return;
  }

  vendorMenu.innerHTML = availableItems.map((item) => `
    <article class="bg-white rounded-2xl shadow-md p-4">
      <img
        src="${item.image || "assets/default.jpg"}"
        alt="${item.name || "Menu item"}"
        class="w-full h-48 object-cover rounded-lg mb-4"
      />

      <header class="mb-2">
        <h3 class="text-lg font-semibold text-gray-900">
          ${item.name || "Menu Item"}
        </h3>
        <p class="text-sm text-gray-500">
          ${item.category || "Category"}
        </p>
      </header>

      <p class="text-sm text-gray-600 mb-3">
        ${item.description || ""}
      </p>

      <footer class="flex justify-between items-center">
        <span class="font-bold text-indigo-600">
          R${item.price || 0}
        </span>

        <a
          href="browse.html"
          class="text-sm text-indigo-600 font-semibold hover:underline"
        >
          Order on Browse
        </a>
      </footer>
    </article>
  `).join("");
}

export async function initVendorProfile() {
  const vendorId = getVendorIdFromURL();

  if (!vendorId) {
    alert("Vendor profile could not be loaded.");
    window.location.href = "browse.html";
    return;
  }

  const vendorRef = doc(db, "users", vendorId);
  const vendorSnap = await getDoc(vendorRef);

  if (!vendorSnap.exists()) {
    alert("Vendor not found.");
    window.location.href = "browse.html";
    return;
  }

  const vendorData = vendorSnap.data();

  if (vendorData.role !== "vendor" || vendorData.status !== "approved") {
    alert("This vendor profile is not available.");
    window.location.href = "browse.html";
    return;
  }

  renderVendorDetails(vendorData);

  const menuItems = await fetchVendorMenuItems(vendorId);
  renderVendorMenu(menuItems);

  globalThis.lucide?.createIcons?.();
}

if (typeof window !== "undefined") {
  if (document.readyState !== "loading") {
    initVendorProfile();
  } else {
    document.addEventListener("DOMContentLoaded", initVendorProfile);
  }
}