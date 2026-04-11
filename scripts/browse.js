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

  const availableItems = items.filter(item => item.available);

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
        <button class="flex-1 bg-indigo-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700">
          <i data-lucide="plus" class="w-4 h-4"></i> Add
        </button>
      </section>

    </article>
  `).join('');

  lucide.createIcons();
};

document.addEventListener("DOMContentLoaded", loadMenuItems);
