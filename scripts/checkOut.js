import {
  db,
  getDocs,
  collection,
  updateDoc,
  doc,
  auth,
  onAuthStateChanged, 
  query, 
  where
} from './database.js';

let loggedIn = false;
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    //alert("logged in")
    loggedIn = true;
    await loadOrders();
  } else {
    //alert("not logged in")
    loggedIn = false;
    
  }
});

//document.addEventListener("DOMContentLoaded", () =>{loadOrders();});

const loadOrders = async () => {
  //try {
  const query2 = query(
    collection(db, "orders"), where("userId", "==", currentUser.uid)
  );
    const snapshot = await getDocs(query2);

    const orders = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(v => v.userId === currentUser.uid);

    const tbody = document.getElementById('order-table-body');
    if (!tbody) return;
    let html = ''
    for(let i = 0; i < orders.length; i++){
        html += `
      <tr>
        <td class="px-6 py-4">
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 max-w-[400px] md:max-w-[600px] place-items-center">
            <div>
            <span class = "inline-block">${orders[i].menuItems.map(item => `
            <img src="${item.image}" class="w-full h-10 object-cover rounded-lg mb-4">
            ${item.name}
          `).join('')}</span>
            </div>
          </div>
        </td>

        <td class="px-6 py-4">
          <button id = "${i}" class="flex-1 bg-indigo-600 text-white py-3 px-3 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700">
           Details
        </button>
        </td>
        <td class="px-6 py-4">
          <span>${orders[i].status || "pending"}</span>
        </td>
      </tr>
    `
    }
    tbody.innerHTML = html; //orders.map(v => ).join('');
    tbody.addEventListener("click", (e) => {
    if (e.target.closest("button")) {
        const btn = e.target.closest("button");
        const id = btn.id;

        
            for (let i = 0; i < orders.length; i++) {
                if (id == i) {
                    document.getElementById('modal-title').textContent = 'Items in Order';
                    document.getElementById('item-details-modal').classList.remove('hidden');
                    updatedetails(orders[i])
                }
            }
        

    }
    });
    
  /*} catch (err) {
    console.error(err);
  }*/
};

function updatedetails(order){
  
  const container = document.getElementById("itemList");
  let html = ``;
  for(let i = 0; i < order.menuItems.length; i++){
    html += `<article class="bg-white p-4 rounded-xl shadow-sm">

      <img src="${order.menuItems[i].image || 'assets/default.jpg'}"
           class="w-full h-48 object-cover rounded-lg mb-4">

      <section class="flex justify-between items-start mb-2">
        <section>
          <h3 class="text-lg font-semibold">${order.menuItems[i].name}</h3>
          <p class="text-sm text-gray-500">${order.menuItems[i].vendorName || 'Vendor'}</p>
        </section>
        <span class="font-bold text-indigo-600">R${order.menuItems[i].price}</span>
      </section>

      <p class="text-sm text-gray-600 mb-3 line-clamp-2">
        ${order.menuItems[i].description}
      </p>

      <!-- Dietary tags -->
      ${order.menuItems[i].dietary?.length ? `
        <section class="flex flex-wrap gap-1 mb-2">
          ${order.menuItems[i].dietary.map(tag => `
            <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">${tag}</span>
          `).join('')}
        </section>
      ` : ''}

      <!-- Allergens -->
      ${order.menuItems[i].allergens?.length ? `
        <section class="flex flex-wrap gap-1 mb-3">
          <span class="text-xs text-orange-500 font-medium mr-1">⚠ Contains:</span>
          ${order.menuItems[i].allergens.map(a => `
            <span class="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">${a}</span>
          `).join('')}
        </section>
      ` : '<section class="mb-3"></section>'}

      

    </article>`;
  }
  container.innerHTML = html;
  if(order.menuItems.length == 1){
    document.getElementById("numItemsOrder").textContent = `${order.menuItems.length} item in order`;
  } else {
    document.getElementById("numItemsOrder").textContent = `${order.menuItems.length} items in order`;
  }
  globalThis.lucide?.createIcons?.();
}