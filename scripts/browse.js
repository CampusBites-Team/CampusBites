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
let cart = [];
let buttons = [];
let restrictions = [false, false, false, false];
let vendor = "AllVendors";
let category = "AllCategories";
let done = false;

function addToCart(item){
    cart.push(item);
}
//filter function to check if an item fits all applied filters
function applyFilter(item){
  if(!item.available){
    return false;
  }
  if (restrictions[0] && !(item.dietary || []).includes("Vegan")) return false;
  if (restrictions[1] && !(item.dietary || []).includes("Vegetarian")) return false;
  if (restrictions[3] && !(item.dietary || []).includes("Halal")) return false;
  if (restrictions[2] && (item.allergens || []).includes("Gluten")) return false;
 
  if(category != "AllCategories" && item.category != category){
    return false;
  }
  if(vendor != "AllVendors" && item.vendorName != vendor){
    return false;
  }
  return true;
}


//function to update the cart display with all items currently in the cart
function updateCart(){
  
  const container = document.getElementById("cartList");
  let html = ``;
  for(let i = 0; i < cart.length; i++){
    html += `<article class="bg-white p-4 rounded-xl shadow-sm">

      <img src="${cart[i].image || 'assets/default.jpg'}"
           class="w-full h-48 object-cover rounded-lg mb-4">

      <section class="flex justify-between items-start mb-2">
        <section>
          <h3 class="text-lg font-semibold">${cart[i].name}</h3>
          <p class="text-sm text-gray-500">${cart[i].vendorName || 'Vendor'}</p>
        </section>
        <span class="font-bold text-indigo-600">R${cart[i].price}</span>
      </section>

      <p class="text-sm text-gray-600 mb-3 line-clamp-2">
        ${cart[i].description}
      </p>

      <!-- Dietary tags -->
      ${cart[i].dietary?.length ? `
        <section class="flex flex-wrap gap-1 mb-2">
          ${cart[i].dietary.map(tag => `
            <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">${tag}</span>
          `).join('')}
        </section>
      ` : ''}

      <!-- Allergens -->
      ${cart[i].allergens?.length ? `
        <section class="flex flex-wrap gap-1 mb-3">
          <span class="text-xs text-orange-500 font-medium mr-1">⚠ Contains:</span>
          ${cart[i].allergens.map(a => `
            <span class="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">${a}</span>
          `).join('')}
        </section>
      ` : '<section class="mb-3"></section>'}

      <section class="flex gap-2">
        <button id = "${i}" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700">
          <i data-lucide="minus" class="w-4 h-4"></i> Remove
        </button>
      </section>

    </article>`;
  }
  container.innerHTML = html;
  if(cart.length == 1){
    document.getElementById("numItemsCart").textContent = `${cart.length} item in cart`;
  } else {
    document.getElementById("numItemsCart").textContent = `${cart.length} items in cart`;
  }
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
    <option value="AllVendors">AllVendors</option>
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

  const approvedVendorIds = new Set(
    usersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.role === "vendor" && user.status === "approved")
      .map(vendor => vendor.id)
  );

  const container = document.getElementById("menu");
  const visibleItems = items.filter(item => approvedVendorIds.has(item.vendorId));
  populateVendorFilter(visibleItems);


  const availableItems = items.filter(item => {
    if (!approvedVendorIds.has(item.vendorId)) {
      return false;
    }
    return applyFilter(item);
  });

  container.innerHTML = availableItems.map(item => `
    <article class="bg-white p-4 rounded-xl shadow-sm">
      <img src="${item.image || 'assets/default.jpg'}"
           class="w-full h-48 object-cover rounded-lg mb-4">

      <section class="flex justify-between items-start mb-2">
        <section>
          <h3 class="text-lg font-semibold">${item.name}</h3>
          <p class="text-sm text-gray-500">${item.vendorName || 'Vendor'}</p>
        </section>
        <span class="font-bold text-indigo-600">R${item.price}</span>
      </section>

      <p class="text-sm text-gray-600 mb-3 line-clamp-2">
        ${item.description}
      </p>

      ${item.dietary?.length ? `
        <section class="flex flex-wrap gap-1 mb-2">
          ${item.dietary.map(tag => `
            <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">${tag}</span>
          `).join('')}
        </section>
      ` : ''}

      ${item.allergens?.length ? `
        <section class="flex flex-wrap gap-1 mb-3">
          <span class="text-xs text-orange-500 font-medium mr-1">⚠ Contains:</span>
          ${item.allergens.map(a => `
            <span class="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">${a}</span>
          `).join('')}
        </section>
      ` : '<section class="mb-3"></section>'}

      <section class="flex gap-2">
        <button class="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">
          Details
        </button>
        <button id="${item.vendorName + item.name}" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700">
          <i data-lucide="plus" class="w-4 h-4"></i> Add
        </button>
      </section>
    </article>
  `).join('');

  if (availableItems.length === 1) {
    document.getElementById("numItems").textContent = `${availableItems.length} item found`;
  } else {
    document.getElementById("numItems").textContent = `${availableItems.length} items found`;
  }

  if (!done) {
    menuList.addEventListener("click", (e) => {
      if (e.target.closest("button")) {
        const btn = e.target.closest("button");
        const id = btn.id;

        for (let i = 0; i < availableItems.length; i++) {
          if (id === availableItems[i].vendorName + availableItems[i].name) {
            addToCart(availableItems[i]);
          }
        }
      }
    });

    document.getElementById("cartList").addEventListener("click", (e) => {
      if (e.target.closest("button")) {
        const btn = e.target.closest("button");
        const id = btn.id;
        for (let i = 0; i < cart.length; i++) {
          cart.splice(cart.findIndex(i => i.id === id), 1);
        }
      }
      updateCart();
    });

    done = true;
  }

  lucide.createIcons();
};

document.addEventListener("DOMContentLoaded", () =>{loadMenuItems();});


//Event listeners for the buttons relating to browsing the items
vegan?.addEventListener("click", () =>{
    restrictions[0] = vegan.checked;
    loadMenuItems();
});
halal?.addEventListener("click", () =>{
    restrictions[3] = halal.checked;
    loadMenuItems();
});
gluten?.addEventListener("click", () =>{
    restrictions[2] = gluten.checked;
    loadMenuItems();
});
vegetarian?.addEventListener("click", () =>{
    restrictions[1] = vegetarian.checked;
    loadMenuItems();
});
document.getElementById("Vendors")?.addEventListener("change", () =>{
    vendor = document.getElementById("Vendors").value;
    loadMenuItems();
});
document.getElementById("Categories")?.addEventListener("change", () =>{
    category = document.getElementById("Categories").value;
    loadMenuItems();
});
document.getElementById("cart")?.addEventListener("click", () => {
    document.getElementById('modal-title').textContent = 'Items in Cart';
    document.getElementById('item-edit-modal').classList.remove('hidden');
    updateCart();
}); 
document.getElementById("checkOut").addEventListener("click", () => {
  
  if(loggedIn && currentUser){
    if(cart.length == 0){
      document.getElementById('cartWarning').classList.remove('hidden');
      return;
    }
    vendorActions.saveOrder();
    
    
    
  } else {
    alert("You must be logged in to proceed to checkout")
  }
}); 


onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    //alert("logged in")
    loggedIn = true;
  } else {
    //alert("not logged in")
    loggedIn = false;
    
  }
});

const vendorActions = {
  saveOrder: async () => {
    if (!currentUser) {
      console.error("No user logged in");
      return;
    }

    if (!cart.length) {
      console.error("Cart is empty");
      return;
    }

    try {
      // Group cart items by vendorId
      const groupedByVendor = cart.reduce((acc, item) => {
        const vendorId = item.vendorId;
        if (!vendorId) return acc;

        if (!acc[vendorId]) {
          acc[vendorId] = [];
        }

        acc[vendorId].push(item);
        return acc;
      }, {});

      // Create one order per vendor
      const orderPromises = Object.entries(groupedByVendor).map(
        async ([vendorId, items]) => {
          const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

          const orderData = {
            userId: currentUser.uid,
            vendorId,
            vendorName: items[0]?.vendorName || "",
            menuItems: items,
            status: "pending",
            total
          };

          return addDoc(collection(db, "orders"), orderData);
        }
      );

      await Promise.all(orderPromises);

      cart = [];
      window.location.href = "checkOut.html";
    } catch (error) {
      console.error("Error saving orders:", error);
    }
  }
};

export const loadBrowseItems = loadMenuItems;
export { loadMenuItems };
