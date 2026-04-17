import {
  db,
  getDocs,
  collection
} from "./database.js";

lucide.createIcons();

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
  lucide.createIcons();
}

const loadMenuItems = async () => {
  const snapshot = await getDocs(collection(db, "menu_items"));
  const snapshot2 = await getDocs(collection(db, "users"));
  /*const vendors = snapshot2.doc.map(doc =>({
    id: doc.id,
    ...doc.data()
  }));*/
  const items = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  //console.log(items[2].vendorName)
  /*document.getElementById("Vendors").innerHTML = vendors.map(item =>`<option value = "${item.shopName}" selected="selected">${item.shopName}</option>`);*/
  const container = document.getElementById("menu");
  const availableItems = items.filter(applyFilter);
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

      <!-- Dietary tags -->
      ${item.dietary?.length ? `
        <section class="flex flex-wrap gap-1 mb-2">
          ${item.dietary.map(tag => `
            <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">${tag}</span>
          `).join('')}
        </section>
      ` : ''}

      <!-- Allergens -->
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
        <button id = "${item.vendorName + item.name}" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700">
          <i data-lucide="plus" class="w-4 h-4"></i> Add
        </button>
      </section>

    </article>
  `).join('');

  lucide.createIcons();
  if(availableItems.length == 1){
    document.getElementById("numItems").textContent = `${availableItems.length} item found`;
  } else {
    document.getElementById("numItems").textContent = `${availableItems.length} items found`;
  }
  if(!done){
    menuList.addEventListener("click", (e) => {
    if (e.target.closest("button")) {
        const btn = e.target.closest("button");
        const id = btn.id;

        
            for (let i = 0; i < availableItems.length; i++) {
                if (id === availableItems[i].vendorName + availableItems[i].name) {
                    addToCart(availableItems[i]);
                }
            }
        
        /*for(let i = 0; i < cart.length; i++){
            if(id == i){
                cart.splice(i, 1);
                i--;
                updateCart();
            }
        }*/
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
  
};

document.addEventListener("DOMContentLoaded", () =>{
  loadMenuItems();
  
  });

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
export const loadBrowseItems = loadMenuItems;
export { loadMenuItems };