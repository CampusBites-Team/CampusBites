import {
  db,
  auth,
  onAuthStateChanged,
  getDocs,
  collection,
  query,
  where
} from "./database.js";

lucide.createIcons();

const recommendationsGrid = document.getElementById("recommendations-grid");
const trendingGrid = document.getElementById("trending-grid");

function formatCurrency(amount) {
  return `R${Number(amount || 0).toFixed(2)}`;
}

function getItemName(item) {
  return item.name || item.itemName || "Unnamed Item";
}

function getItemImage(item) {
  return item.image || item.imageUrl || "assets/default_food.jpg";
}

function getVendorName(vendor) {
  return vendor?.shopName || vendor?.fullName || vendor?.name || "Campus Vendor";
}

async function getApprovedVendors() {
  const usersSnapshot = await getDocs(collection(db, "users"));

  return usersSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(user => user.role === "vendor" && user.status === "approved");
}

async function getAvailableMenuItems() {
  const menuSnapshot = await getDocs(collection(db, "menu_items"));

  return menuSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(item => item.available !== false);
}

async function getUserOrders(userId) {
  const ordersQuery = query(
    collection(db, "orders"),
    where("userId", "==", userId)
  );

  const ordersSnapshot = await getDocs(ordersQuery);

  return ordersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

function buildVendorMap(vendors) {
  const map = {};

  vendors.forEach(vendor => {
    map[vendor.id] = vendor;
  });

  return map;
}

function getOrderedItemsFromOrders(orders) {
  const orderedItems = [];

  orders.forEach(order => {
    const items = order.items || order.menuItems || [];

    items.forEach(item => {
      orderedItems.push(item);
    });
  });

  return orderedItems;
}

function getRecommendedItems(orders, allItems) {
  if (!orders.length) {
    return [];
  }

  const userDietary = new Set();
  const userAllergens = new Set();
  const userCategories = new Set();
  const orderedItemIds = new Set();

  orders.forEach(order => {
    const items = order.items || order.menuItems || [];

    items.forEach(orderItem => {
      if (orderItem.id) orderedItemIds.add(orderItem.id);

      const matchedItem = allItems.find(item =>
        item.id === orderItem.id ||
        getItemName(item) === orderItem.name
      );

      const sourceItem = matchedItem || orderItem;

      (sourceItem.dietary || []).forEach(tag => userDietary.add(tag));
      (sourceItem.allergens || []).forEach(tag => userAllergens.add(tag));

      if (sourceItem.category) {
        userCategories.add(sourceItem.category);
      }
    });
  });

  const scoredItems = allItems
    .filter(item => !orderedItemIds.has(item.id))
    .map(item => {
      let score = 0;

      (item.dietary || []).forEach(tag => {
        if (userDietary.has(tag)) score += 3;
      });

      if (item.category && userCategories.has(item.category)) {
        score += 2;
      }

      const hasMatchingAllergen = (item.allergens || []).some(tag =>
        userAllergens.has(tag)
      );

      if (hasMatchingAllergen) {
        score += 1;
      }

      return { item, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredItems.slice(0, 3).map(result => result.item);
}

function getFavouriteItems(orders, allItems) {
  if (!orders.length) {
    return [];
  }

  const itemCounts = {};

  getOrderedItemsFromOrders(orders).forEach(orderItem => {
    const key = orderItem.id || orderItem.name;

    if (!key) return;

    itemCounts[key] = (itemCounts[key] || 0) + 1;
  });

  return allItems
    .map(item => {
      const count = itemCounts[item.id] || itemCounts[getItemName(item)] || 0;
      return { item, count };
    })
    .filter(result => result.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map(result => result.item);
}

function renderRecommendations(items, vendorMap) {
  if (!recommendationsGrid) return;

  if (!items.length) {
    recommendationsGrid.innerHTML = `
      <p class="text-center text-gray-500 col-span-3">
        No recommendations yet. Place an order first so we can recommend items based on your diet and allergens.
      </p>
    `;
    return;
  }

  const reasons = [
    "Best match for your previous orders",
    "Based on your diet and allergens",
    "Similar to what you ordered before"
  ];

  recommendationsGrid.innerHTML = items.map((item, index) => {
    const vendor = vendorMap[item.vendorId];

    return `
      <article class="bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden border-2 ${
        index === 0 ? "border-indigo-500" : "border-transparent"
      }">
        <section class="relative">
          <img src="${getItemImage(item)}" alt="${getItemName(item)}" class="w-full h-48 object-cover">

          <span class="absolute top-2 left-2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium">
            ${index === 0 ? "Best Match" : `${Math.round(85 - index * 5)}% Match`}
          </span>
        </section>

        <section class="p-4">
          <p class="text-xs text-indigo-600 font-medium mb-1">${getVendorName(vendor)}</p>
          <h3 class="font-semibold text-lg mb-1">${getItemName(item)}</h3>
          <p class="text-sm text-gray-500 mb-3">${reasons[index] || "Recommended for you"}</p>

          <section class="flex justify-between items-center">
            <span class="font-bold text-lg">${formatCurrency(item.price)}</span>

            <button 
              data-item-id="${item.id}"
              class="add-to-cart-btn bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
            >
              Add to Cart
            </button>
          </section>
        </section>
      </article>
    `;
  }).join("");
}

function renderFavouriteItems(items, vendorMap) {
  if (!trendingGrid) return;

  if (!items.length) {
    trendingGrid.innerHTML = `
      <p class="text-center text-gray-500 col-span-4">
        No favourite items yet. Your most bought items will appear here after you place orders.
      </p>
    `;
    return;
  }

  trendingGrid.innerHTML = items.map(item => {
    const vendor = vendorMap[item.vendorId];

    return `
      <article 
        class="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition cursor-pointer"
        onclick="openMenuItem('${item.id}')"
      >
        <img src="${getItemImage(item)}" alt="${getItemName(item)}" class="w-full h-32 object-cover rounded-lg mb-3">

        <h4 class="font-medium text-sm mb-1 line-clamp-1">${getItemName(item)}</h4>

        <p class="text-xs text-gray-500 mb-2">${getVendorName(vendor)}</p>

        <span class="font-bold text-sm">${formatCurrency(item.price)}</span>
      </article>
    `;
  }).join("");
}

function attachCartButtons(items) {
  document.querySelectorAll(".add-to-cart-btn").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.itemId;
      const item = items.find(menuItem => menuItem.id === itemId);

      if (!item) return;

      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      cart.push(item);

      localStorage.setItem("cart", JSON.stringify(cart));

      updateCartCount();
      alert("Item added to cart.");
    });
  });
}

window.openMenuItem = function (itemId) {
  window.location.href = `browse.html?itemId=${itemId}`;
};

async function initRecommendations(user) {
  try {
    const [vendors, allItems, orders] = await Promise.all([
      getApprovedVendors(),
      getAvailableMenuItems(),
      getUserOrders(user.uid)
    ]);

    const vendorMap = buildVendorMap(vendors);
    const approvedVendorIds = vendors.map(vendor => vendor.id);

    const visibleItems = allItems.filter(item =>
      approvedVendorIds.includes(item.vendorId)
    );

    const recommendations = getRecommendedItems(orders, visibleItems);
    const favouriteItems = getFavouriteItems(orders, visibleItems);

    renderRecommendations(recommendations, vendorMap);
    renderFavouriteItems(favouriteItems, vendorMap);
    attachCartButtons(visibleItems);

    lucide.createIcons();
  } catch (error) {
    console.error("Error loading recommendations:", error);

    if (recommendationsGrid) {
      recommendationsGrid.innerHTML = `
        <p class="text-center text-red-500 col-span-3">
          Failed to load recommendations.
        </p>
      `;
    }

    if (trendingGrid) {
      trendingGrid.innerHTML = `
        <p class="text-center text-red-500 col-span-4">
          Failed to load favourite items.
        </p>
      `;
    }
  }

  updateCartCount();
}

const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");

function getCartItems() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function updateCartCount() {
  if (!cartCount) return;

  const cart = getCartItems();
  cartCount.textContent = cart.length;
}

cartBtn?.addEventListener("click", () => {
  window.location.href = "browse.html#cart";
});

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  initRecommendations(user);
});