import {
  db,
  getDocs,
  collection
} from "./database.js";

lucide.createIcons();

const orderNow = document.getElementById("OrderNowButton");
const learn = document.getElementById("LearnButton");
const browseVendors = document.getElementById("BrowseVendors");
const featuredVendors = document.getElementById("featured-vendors");

const vendorCategories = [
  "Fast Food",
  "Café",
  "Bakery",
  "Pizza",
  "Healthy Meals",
  "Desserts",
  "Beverages",
  "Grill House",
  "African Cuisine",
  "Asian Cuisine",
  "Snacks",
  "Ice Cream",
  "Breakfast",
  "Burgers",
  "Wraps & Sandwiches"
];
function assignCategory(vendorName = "") {
  const safeName = vendorName || "CampusBites Vendor";
  const index = safeName.length % vendorCategories.length;
  return vendorCategories[index];
}
orderNow?.addEventListener("click", () => {
  window.location.href = "browse.html";
});

learn?.addEventListener("click", () => {
  document.getElementById("FeaturesSection")?.scrollIntoView();
});

browseVendors?.addEventListener("click", () => {
  window.location.href = "browse.html";
});

export let vendors = [];
export let currentIndex = 0;

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

export function renderVendors() {
  if (!featuredVendors || vendors.length === 0) {
    featuredVendors.innerHTML = `
      <p class="text-center text-gray-500 col-span-3">
        No approved vendors available yet.
      </p>
    `;
    return;
  }

  const visibleVendors = vendors.slice(currentIndex, currentIndex + 3);

  if (visibleVendors.length < 3) {
    visibleVendors.push(...vendors.slice(0, 3 - visibleVendors.length));
  }

  featuredVendors.innerHTML = visibleVendors.map(vendor => {
    const rating = getVendorRating(vendor);

    return `
    <article 
        class="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:scale-105 transform duration-300 transition cursor-pointer vendor-slide"
        onclick="goToVendor('${vendor.id}')"
    >
      <img 
        src="${vendor.image || vendor.logo || "assets/default_vendor.jpg"}" 
        alt="${vendor.shopName || vendor.fullName || "Vendor"}"
        class="w-full h-52 object-cover object-center"
      >

      <figure class="p-6">
        <h3 class="text-xl font-semibold mb-2">
          ${vendor.shopName || vendor.fullName || "Unnamed Vendor"}
        </h3>

        <p class="text-gray-600 text-sm mb-2">
          ${vendor.category || assignCategory(vendor.shopName || vendor.fullName || vendor.email)} • ${vendor.location || "Campus"}
        </p>

        <p class="flex items-center gap-1 mb-2">
          ${renderStars(rating)}
          <span class="text-sm text-gray-600 ml-1">${rating}/5</span>
        </p>
      </figure>
    </article>
    `;
}).join("");

lucide.createIcons();

}

window.goToVendor = function (vendorId) {
  window.location.href = `vendor-profile.html?vendorId=${vendorId}`;
};

async function loadFeaturedVendors() {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));

    vendors = usersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user =>
        user.role === "vendor" &&
        user.status === "approved"
      );

    vendors = shuffleArray(vendors);
    renderVendors();

    setInterval(() => {
      currentIndex = (currentIndex + 3) % vendors.length;
      renderVendors();
    }, 5000);

  } catch (error) {
    console.error("Error loading featured vendors:", error);

    featuredVendors.innerHTML = `
      <p class="text-center text-red-500 col-span-3">
        Failed to load featured vendors.
      </p>
    `;
  }
}
function renderStars(rating) {
  const rounded = Math.round(rating);
  let stars = "";

  for (let i = 1; i <= 5; i++) {
    stars += `
      <i data-lucide="star"
         class="w-4 h-4 inline ${
           i <= rounded
             ? "fill-yellow-400 text-yellow-400"
             : "text-gray-300"
         }">
      </i>
    `;
  }

  return stars;
}
function getVendorRating(vendor) {
  if (vendor.rating) return Number(vendor.rating).toFixed(1);

  const name = vendor.shopName || vendor.fullName || vendor.email || "vendor";
  const total = name
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return (3.8 + (total % 12) / 10).toFixed(1);
}
document.getElementById("nextVendorBtn")?.addEventListener("click", () => {
  if (!vendors.length) return;

  currentIndex = (currentIndex + 3) % vendors.length;
  renderVendors();
});

document.getElementById("prevVendorBtn")?.addEventListener("click", () => {
  if (!vendors.length) return;

  currentIndex = currentIndex - 3;

  if (currentIndex < 0) {
    currentIndex = Math.max(vendors.length - 3, 0);
  }

  renderVendors();
});

loadFeaturedVendors();