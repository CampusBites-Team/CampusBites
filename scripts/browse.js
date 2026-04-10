import {
  db,
  getDocs,
  collection
} from "./database.js";

lucide.createIcons();

const loadMenuItems = async () => {
  const snapshot = await getDocs(collection(db, "menu_items"));

  const items = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const container = document.getElementById("menu-grid");

  // ✅ only show AVAILABLE items
  const availableItems = items.filter(item => item.available);

  container.innerHTML = availableItems.map(item => `
    <article class="bg-white p-4 rounded-xl shadow-sm">
      
      <img src="${item.image || 'assets/default.jpg'}" 
           class="w-full h-48 object-cover rounded-lg mb-4">

      <div class="flex justify-between items-start mb-2">
        <div>
          <h3 class="text-lg font-semibold">${item.name}</h3>
          <p class="text-sm text-gray-500">${item.vendorName || 'Vendor'}</p>
        </div>
        <span class="font-bold text-indigo-600">R${item.price}</span>
      </div>

      <p class="text-sm text-gray-600 mb-3 line-clamp-2">
        ${item.description}
      </p>

      <div class="flex gap-2">
        <button class="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg">
          Details
        </button>

        <button class="flex-1 bg-indigo-600 text-white py-2 rounded-lg flex items-center justify-center gap-2">
          <i data-lucide="plus" class="w-4 h-4"></i> Add
        </button>
      </div>

    </article>
  `).join('');

  lucide.createIcons(); // re-render icons
};

// load on page start
document.addEventListener("DOMContentLoaded", loadMenuItems);