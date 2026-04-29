import {
  auth,
  db,
  getDocs,
  addDoc,
  collection,
  onAuthStateChanged
} from "./database.js";

lucide.createIcons();

let loggedIn = false;
let currentUser = null;

const vegan = document.getElementById("Vegan");
const vegetarian = document.getElementById("Vegetarian");
const halal = document.getElementById("Halal");
const gluten = document.getElementById("Gluten-Free");
const menuList = document.getElementById("menu");
let priceSlider = document.getElementById("PriceSlider");
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let restrictions = [false, false, false, false];
let vendor = "AllVendors";
let category = "AllCategories";
let done = false;
let maxPrice2 = Number.MAX_SAFE_INTEGER;
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
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartCount() {
  const cartCount = document.getElementById("cartCount");

  if (cartCount) {
    cartCount.textContent = cart.length;
  }
}

function addToCart(item) {
  cart.push(item);
  saveCart();
  updateCart();
  updateCartCount();
}

function applyFilter(item) {
  if (!item.available) return false;
  if(item.price > maxPrice2)return false;
  if (restrictions[0] && !(item.dietary || []).includes("Vegan")) return false;
  if (restrictions[1] && !(item.dietary || []).includes("Vegetarian")) return false;
  if (restrictions[3] && !(item.dietary || []).includes("Halal")) return false;
  if (restrictions[2] && (item.allergens || []).includes("Gluten")) return false;

  if (category !== "AllCategories" && item.category !== category) return false;
  if (vendor !== "AllVendors" && item.vendorName !== vendor) return false;

  return true;
}

function updateCart() {
  const container = document.getElementById("cartList");
  const numItemsCart = document.getElementById("numItemsCart");
  const cartWarning = document.getElementById("cartWarning");

  if (!container) return;

  cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cartWarning) {
    cartWarning.classList.add("hidden");
  }

  if (!cart.length) {
    container.innerHTML = `
      <p class="text-center text-gray-500 col-span-3">
        Your cart is empty.
      </p>
    `;

    if (numItemsCart) {
      numItemsCart.textContent = "0 items in cart";
    }

    updateCartCount();
    return;
  }

  container.innerHTML = cart.map((item, index) => `
    <article class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">

      <img 
        src="${item.image || item.imageUrl || "assets/default_vendor.jpg"}"
        alt="${item.name || "Menu item"}"
        class="w-full h-48 object-cover rounded-lg mb-4"
      >

      <section class="flex justify-between items-start mb-2">
        <section>
          <h3 class="text-lg font-semibold">${item.name || "Unnamed Item"}</h3>
          <p class="text-sm text-gray-500">${item.vendorName || "Vendor"}</p>
        </section>

        <span class="font-bold text-indigo-600">
          R${Number(item.price || 0).toFixed(2)}
        </span>
      </section>

      <p class="text-sm text-gray-600 mb-3 line-clamp-2">
        ${item.description || "No description available."}
      </p>

      ${(item.dietary || []).length ? `
        <section class="flex flex-wrap gap-1 mb-2">
          ${(item.dietary || []).map(tag => `
            <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              ${tag}
            </span>
          `).join("")}
        </section>
      ` : ""}

      ${(item.allergens || []).length ? `
        <section class="flex flex-wrap gap-1 mb-3">
          <span class="text-xs text-orange-500 font-medium mr-1">⚠ Contains:</span>
          ${(item.allergens || []).map(a => `
            <span class="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
              ${a}
            </span>
          `).join("")}
        </section>
      ` : "<section class='mb-3'></section>"}

      <section class="flex gap-2">
        <button 
          data-cart-index="${index}" 
          class="remove-cart-btn flex-1 bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700"
        >
          <i data-lucide="minus" class="w-4 h-4"></i>
          Remove
        </button>
      </section>

    </article>
  `).join("");

  if (numItemsCart) {
    numItemsCart.textContent =
      cart.length === 1 ? "1 item in cart" : `${cart.length} items in cart`;
  }

  updateCartCount();
  globalThis.lucide?.createIcons?.();
}

function populateVendorFilter(items) {
  const vendorSelect = document.getElementById("Vendors");
  if (!vendorSelect) return;

  const currentValue = vendorSelect.value || "AllVendors";

  const vendorNames = [...new Set(
    items
      .map(item => item.vendorName)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  )];

  vendorSelect.innerHTML = `
    <option value="AllVendors">All Vendors</option>
    ${vendorNames.map(name => `<option value="${name}">${name}</option>`).join("")}
  `;

  if (vendorNames.includes(currentValue) || currentValue === "AllVendors") {
    vendorSelect.value = currentValue;
  } else {
    vendorSelect.value = "AllVendors";
    vendor = "AllVendors";
  }
}

const loadMenuItems = async () => {
  const [menuSnapshot, usersSnapshot] = await Promise.all([
    getDocs(collection(db, "menu_items")),
    getDocs(collection(db, "users"))
  ]);

  const items = menuSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const approvedVendors = usersSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(user => user.role === "vendor" && user.status === "approved");

  const approvedVendorIds = new Set(approvedVendors.map(vendor => vendor.id));
  const vendorMap = {};
    approvedVendors.forEach(vendor => {
      vendorMap[vendor.id] = vendor;
    });

  const visibleItems = items.filter(item => approvedVendorIds.has(item.vendorId));

  populateVendorFilter(visibleItems);

  const availableItems = visibleItems.filter(item => applyFilter(item));

  const container = document.getElementById("menu");

  if (!container) return;
  container.innerHTML = availableItems.map(item => {
  const itemVendor = vendorMap[item.vendorId];

  const rating = getVendorRating(itemVendor || {
    shopName: item.vendorName,
    fullName: item.vendorName,
    email: item.vendorName
  });

  return `
    <article class="bg-white p-4 rounded-xl shadow-sm">
      <img 
        src="${item.image || item.imageUrl || "assets/default.jpg"}"
        alt="${item.name || "Menu item"}"
        class="w-full h-48 object-cover rounded-lg mb-4"
      >

      <section class="flex justify-between items-start mb-2">
        <section>
          <h3 class="text-lg font-semibold">${item.name || "Unnamed Item"}</h3>
          <p class="text-sm text-gray-500">${item.vendorName || "Vendor"}</p>
        </section>

        <span class="font-bold text-indigo-600">
          R${Number(item.price || 0).toFixed(2)}
        </span>
      </section>
      <p class="text-sm text-gray-600 mb-3 line-clamp-2">
        ${item.description || "No description available."}
      </p>

      ${(item.dietary || []).length ? `
        <section class="flex flex-wrap gap-1 mb-2">
          ${(item.dietary || []).map(tag => `
            <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              ${tag}
            </span>
          `).join("")}
        </section>
      ` : ""}

      ${(item.allergens || []).length ? `
        <section class="flex flex-wrap gap-1 mb-3">
          <span class="text-xs text-orange-500 font-medium mr-1">⚠ Contains:</span>
          ${(item.allergens || []).map(a => `
            <span class="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
              ${a}
            </span>
          `).join("")}
        </section>
      ` : "<section class='mb-3'></section>"}
      <p class="flex items-center gap-1 mb-2">
        ${renderStars(rating)}
        <span class="text-sm text-gray-600 ml-1">${rating}/5</span>
      </p>
      <section class="flex gap-2">
        <button
          data-vendor-id="${item.vendorId}"
          class="vendor-details-btn flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
        >
          Details
        </button>

        <button
          data-item-id="${item.id}"
          class="add-cart-btn flex-1 bg-indigo-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700"
        >
          <i data-lucide="plus" class="w-4 h-4"></i>
          Add
        </button>
      </section>
    </article>
  `;
}).join("");

 

  const numItems = document.getElementById("numItems");

  if (numItems) {
    numItems.textContent =
      availableItems.length === 1
        ? "1 item found"
        : `${availableItems.length} items found`;
  }

  if (!done) {
    let maxPrice = 0;
  for(let i = 0; i < items.length; i++){
    if(items[i].price > maxPrice){
      maxPrice = items[i].price;
    }
  }
  document.getElementById("PriceFilter").innerHTML = `
  <label id = "PriceLabel" class="text-sm font-medium text-gray-700 mb-2 block">
    Max Price: R${maxPrice}
  </label>
  <input id = "PriceSlider" type="range" min="0" max="${maxPrice}" value="${maxPrice}" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">`;
  priceSlider = document.getElementById("PriceSlider");
  priceSlider.addEventListener("click", () => {
  document.getElementById("PriceLabel").textContent = `Max Price: ${priceSlider.value}`;
  maxPrice2 = priceSlider.value;
  loadMenuItems();
  });
    menuList?.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      if (btn.classList.contains("vendor-details-btn")) {
        const vendorId = btn.dataset.vendorId;

        if (vendorId) {
          window.location.href = `vendor-profile.html?vendorId=${vendorId}`;
        }

        return;
      }

      if (btn.classList.contains("add-cart-btn")) {
        const itemId = btn.dataset.itemId;
        const selectedItem = availableItems.find(item => item.id === itemId);

        if (selectedItem) {
          addToCart(selectedItem);
        }
      }
    });

    document.getElementById("cartList")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".remove-cart-btn");
      if (!btn) return;

      const index = Number(btn.dataset.cartIndex);

      if (!Number.isNaN(index)) {
        cart.splice(index, 1);
        saveCart();
        updateCart();
      }
    });

    done = true;
  }

  updateCartCount();
  lucide.createIcons();
};

document.addEventListener("DOMContentLoaded", () => {
  loadMenuItems();
  updateCartCount();

  if (window.location.hash === "#cart") {
    document.getElementById("item-edit-modal")?.classList.remove("hidden");
    updateCart();
  }
});

vegan?.addEventListener("click", () => {
  restrictions[0] = vegan.checked;
  loadMenuItems();
});

halal?.addEventListener("click", () => {
  restrictions[3] = halal.checked;
  loadMenuItems();
});

gluten?.addEventListener("click", () => {
  restrictions[2] = gluten.checked;
  loadMenuItems();
});

vegetarian?.addEventListener("click", () => {
  restrictions[1] = vegetarian.checked;
  loadMenuItems();
});

document.getElementById("Vendors")?.addEventListener("change", () => {
  vendor = document.getElementById("Vendors").value;
  loadMenuItems();
});

document.getElementById("Categories")?.addEventListener("change", () => {
  category = document.getElementById("Categories").value;
  loadMenuItems();
});

document.getElementById("cart")?.addEventListener("click", () => {
  cart = JSON.parse(localStorage.getItem("cart")) || [];

  document.getElementById("item-edit-modal")?.classList.remove("hidden");
  updateCart();
});

document.getElementById("closeCartModal")?.addEventListener("click", () => {
  document.getElementById("item-edit-modal")?.classList.add("hidden");
});

document.getElementById("checkOut")?.addEventListener("click", () => {
  const cartWarning = document.getElementById("cartWarning");

  if (!loggedIn || !currentUser) {
    alert("You must be logged in to proceed to checkout");
    return;
  }

  cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    cartWarning?.classList.remove("hidden");
    return;
  }

  vendorActions.saveOrder();
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loggedIn = true;
  } else {
    currentUser = null;
    loggedIn = false;
  }
});

const vendorActions = {
  saveOrder: async () => {
    if (!currentUser) {
      console.error("No user logged in");
      return;
    }

    cart = JSON.parse(localStorage.getItem("cart")) || [];

    if (!cart.length) {
      console.error("Cart is empty");
      return;
    }

    try {
      const groupedByVendor = cart.reduce((acc, item) => {
        const vendorId = item.vendorId;

        if (!vendorId) return acc;

        if (!acc[vendorId]) {
          acc[vendorId] = [];
        }

        acc[vendorId].push(item);
        return acc;
      }, {});

      const orderPromises = Object.entries(groupedByVendor).map(
        async ([vendorId, items]) => {
          const total = items.reduce(
            (sum, item) => sum + (Number(item.price) || 0),
            0
          );

          const orderData = {
            userId: currentUser.uid,
            vendorId,
            vendorName: items[0]?.vendorName || "",
            menuItems: items,
            status: "Pending",
            total
          };

          return addDoc(collection(db, "orders"), orderData);
        }
      );

      await Promise.all(orderPromises);

      cart = [];
      saveCart();
      updateCartCount();

      window.location.href = "checkOut.html";
    } catch (error) {
      console.error("Error saving orders:", error);
    }
  }
};

export const loadBrowseItems = loadMenuItems;
export { loadMenuItems };