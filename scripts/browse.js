import {
  auth,
  db,
  getDocs,
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
function showItemDetails(item) {
  const modal = document.getElementById("details-modal");
  if (!modal) return;
  const location = item.location || "Unknown location";

  modal.innerHTML = `
    <section class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <article class="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative shadow-xl">

        <button id="closeDetailsModal"
          class="absolute top-3 right-3 bg-white rounded-full p-1 shadow hover:bg-gray-100">
          ✕
        </button>

        <img
          src="${item.image || item.imageUrl || "assets/default_vendor.jpg"}"
          alt="${item.name || "Menu item"}"
          class="w-full h-52 object-cover rounded-t-2xl"
        >

        <section class="p-8">
          <section class="flex justify-between items-start mb-2">
            <section>
              <p class="text-sm text-indigo-600 font-medium">${item.vendorName || "Vendor"}</p>
              <h2 class="text-2xl font-bold text-gray-900">${item.name || "Unnamed Item"}</h2>
            </section>
          <span>
          <p class="font-bold text-indigo-600">
            R${Number(item.price || 0).toFixed(2)}
          <p>
          <section class="font-bold flex items-center gap-2 mt-1">
            <i data-lucide="map-pin" class="w-4 h-4 text-gray-500"></i>
            <p class="text-sm text-gray-500">${location}</p>
          </section>
          </span>
          </section>

          <p class="text-sm text-gray-600 mb-4">
            ${item.description || "No description available."}
          </p>

          <section class="mb-4">
            <h3 class="font-semibold text-sm mb-2 text-red-600">⚠ Allergens</h3>
            ${
              (item.allergens || []).length
                ? `<section class="flex flex-wrap gap-2">
                    ${(item.allergens || []).map(a => `
                      <span class="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full">
                        ${a}
                      </span>
                    `).join("")}
                  </section>`
                : `<p class="text-sm text-gray-500">No allergens listed.</p>`
            }
          </section>

          <section class="mb-4">
            <h3 class="font-semibold text-sm mb-2 text-green-600">✓ Dietary Information</h3>
            ${
              (item.dietary || []).length
                ? `<section class="flex flex-wrap gap-2">
                    ${(item.dietary || []).map(tag => `
                      <span class="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                        ${tag}
                      </span>
                    `).join("")}
                  </section>`
                : `<p class="text-sm text-gray-500">No dietary information listed.</p>`
            }
          </section>

          <section class="mb-4">
            <h3 class="font-semibold text-sm mb-2">Nutritional Info</h3>

            <section class="grid grid-cols-3 gap-3 text-center">
              <section class="bg-gray-50 rounded-lg p-3">
                <p class="font-bold">${item.calories || 320}</p>
                <p class="text-xs text-gray-500">kcal</p>
              </section>

              <section class="bg-gray-50 rounded-lg p-3">
                <p class="font-bold">${item.protein || "18"}g</p>
                <p class="text-xs text-gray-500">protein</p>
              </section>

              <section class="bg-gray-50 rounded-lg p-3">
                <p class="font-bold">${item.carbs || "18"}g</p>
                <p class="text-xs text-gray-500">carbs</p>
              </section>
            </section>
          </section>

          <button
            id="detailsAddToCart"
            class="w-full bg-indigo-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700"
          >
            <i data-lucide="shopping-cart" class="w-4 h-4"></i>
            Add to Cart - R ${Number(item.price || 0).toFixed(2)}
          </button>
        </section>
      </article>
    </section>
  `;

  modal.classList.remove("hidden");

  document.getElementById("closeDetailsModal")?.addEventListener("click", () => {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  });

  document.getElementById("detailsAddToCart")?.addEventListener("click", () => {
    addToCart(item);
    modal.classList.add("hidden");
    modal.innerHTML = "";
  });

  globalThis.lucide?.createIcons?.();
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

  const visibleItems = items
  .filter(item => approvedVendorIds.has(item.vendorId))
  .map(item => {
    const vendor = vendorMap[item.vendorId];

    return {
      ...item,
      location: vendor?.location || "Unknown location"
    };
  });

  populateVendorFilter(visibleItems);

  const availableItems = visibleItems.filter(item => applyFilter(item));

  const container = document.getElementById("menu");

  if (!container) return;
  container.innerHTML = availableItems.map(item => {
  const itemVendor = vendorMap[item.vendorId];
  const location = itemVendor?.location || "Unknown location";

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
          <p class="text-sm font-semibold text-gray-500">${item.vendorName || "Vendor"}</p>
        </section>

        <span class="font-bold text-indigo-600">
          R${Number(item.price || 0).toFixed(2)}
          <p class="text-sm text-gray-500">${location || "Vendor Location"}</p>
        </span>
      </section>
      <p class="text-sm text-gray-600 mb-3 line-clamp-2">
        ${item.description || "No description available."}
      </p>
      ${(item.allergens || []).length ? `
        <section class="flex flex-wrap gap-1 mb-3">
          ${(item.allergens || []).map(a => `
            <span class="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
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
          data-item-id="${item.id}"
          class="item-details-btn flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
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

     if (btn.classList.contains("item-details-btn")) {
        const itemId = btn.dataset.itemId;
        const selectedItem = availableItems.find(item => item.id === itemId);

        if (selectedItem) {
          showItemDetails(selectedItem);
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

  payfast.payNow();
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

const payfast = {
  payNow: async () => {
    if (!currentUser) {
      console.error("No user logged in");
      return;
    }

    cart = JSON.parse(localStorage.getItem("cart")) || [];

    if (!cart.length) {
      console.error("Cart is empty");
      return;
    }

    const btn = document.getElementById("checkOut");
    if (btn) { btn.disabled = true; btn.textContent = "Redirecting..."; }

    try {
      const res = await fetch("/api/payfast/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.uid,
          cart: cart.map((item) => ({ menuItemId: item.id }))
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Payment init failed (${res.status})`);
      }

      const { action, fields } = await res.json();

      const form = document.createElement("form");
      form.method = "POST";
      form.action = action;
      form.style.display = "none";
      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      cart = [];
      saveCart();
      updateCartCount();

      form.submit();
    } catch (error) {
      console.error("Error starting payment:", error);
      alert("Could not start payment: " + error.message);
      if (btn) { btn.disabled = false; btn.textContent = "Pay Now"; }
    }
  }
};

export const loadBrowseItems = loadMenuItems;
export { loadMenuItems };