import {
  db,
  auth,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  collection,
  deleteDoc,
  doc,
  where,
  query,
  serverTimestamp,
  storage,
  ref,
  uploadBytes,
  getDownloadURL
} from "./database.js";

lucide.createIcons();
let currentUser = null;
let userData = null; 

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    // Move the logic inside the listener
    const userSnap = await getDoc(doc(db, "users", user.uid));
    userData = userSnap.data();

    console.log("User data loaded:");
    views.initMenuManagement(); // load menu management after user data is available
  } else {
    // Optional: Redirect to login if no user is found
    console.log("No user is signed in.");
    window.location.href = "login.html"; // redirect to login page
  }
});


const views = {

initMenuManagement: async () => {
    const snapshot = await getDocs(query(collection(db, "menu_items"), where("vendorId", "==", currentUser.uid)));

    const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const tbody = document.getElementById('menu-table-body');

    tbody.innerHTML = items.map(item => `
        <tr>
        <td class="px-6 py-4">
        <section class="flex items-center gap-3">
            <img src="${item.image}" class="w-10 h-10 rounded object-cover">
            <span>${item.name}</span>
            </section>
        </td> 
            <td class="px-6 py-4">${item.category}</td>
            <td class="px-6 py-4">R${item.price}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs ${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${item.available ? 'Available' : 'Sold Out'}
                </span>
            </td>
            <td class="px-6 py-4">
                <button onclick="views.openEditItem('${item.id}')">
                    Edit
                </button>
                <button onclick="views.toggleAvailability('${item.id}', ${item.available} )"
                    class="text-sm text-indigo-600 hover:text-indigo-800">
                    ${item.available ? 'Mark Sold Out' : 'Restock'}
                </button>
                <button onclick="views.deleteItem('${item.id}')"
                    class="text-red-600">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
},  
openEditItem: async (id) => {
    const snap = await getDocs(query(collection(db, "menu_items"), where("vendorId", "==", currentUser.uid)));

    const itemDoc = snap.docs.find(d => d.id === id);
    const item = itemDoc.data();

    document.getElementById('edit-item-id').value = id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-description').value = item.description;
    document.getElementById('item-price').value = item.price;
    document.getElementById('item-category').value = item.category;

    // checkboxes reset
    document.querySelectorAll('.item-allergen').forEach(cb => {
      cb.checked = item.allergens?.includes(cb.value);
    });

    document.querySelectorAll('.item-dietary').forEach(cb => {
      cb.checked = item.dietary?.includes(cb.value);
    });

    document.getElementById('modal-title').textContent = "Edit Menu Item";
    document.getElementById('item-edit-modal').classList.remove('hidden');
  },

  deleteItem: async (id) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    await deleteDoc(doc(db, "menu_items", id));

    views.initMenuManagement();
  },
    toggleAvailability: async (id, currentStatus) => {
    await updateDoc(doc(db, "menu_items", id), {
        available: !currentStatus
    });

    views.initMenuManagement(); // refresh table
}
};

const vendorActions = {

saveItem: async (event) => {
    event.preventDefault();
    if (!currentUser) {
      console.error("No user logged in");
      return;
    }
    const id = document.getElementById('edit-item-id').value;
    const file = document.getElementById('item-image').files[0];

    const name = document.getElementById('item-name').value;
    const description = document.getElementById('item-description').value;
    const price = parseFloat(document.getElementById('item-price').value);
    const category = document.getElementById('item-category').value;

    const allergens = [...document.querySelectorAll('.item-allergen:checked')]
        .map(cb => cb.value);

    const dietary = [...document.querySelectorAll('.item-dietary:checked')]
        .map(cb => cb.value);

    let imageUrl = "";

    // upload image if exists
    if (file) {
        const storageRef = ref(storage, `menu_items/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
    }

    const itemData = {
        vendorId: currentUser.uid,
        vendorName: userData.shopName,
        name,
        description,
        price,
        category,
        allergens,
        dietary,
        available: true,
        createdAt: serverTimestamp()
    };
    if (imageUrl) {
     itemData.image = imageUrl;
    }

    try {
        if (id) {
            await updateDoc(doc(db, "menu_items", id), itemData);
        } else {
            await addDoc(collection(db, "menu_items"), itemData);
        }

        document.getElementById('item-edit-modal').classList.add('hidden');
        views.initMenuManagement();

    } catch (error) {
        console.error("Error saving item:", error);
    }
}

};
document.getElementById("add-item-btn")
.addEventListener("click", () => {
    document.getElementById('item-form').reset();
    document.getElementById('edit-item-id').value = '';
    document.getElementById('modal-title').textContent = 'Add Menu Item';
    document.getElementById('item-edit-modal').classList.remove('hidden');
});

// IMPORTANT: make functions global for HTML onclick
window.views = views;
window.vendorActions = vendorActions;

