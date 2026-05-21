import {
  auth,
  db,
  storage,
  doc,
  getDoc,
  updateDoc,
  ref,
  uploadBytes,
  getDownloadURL
} from "./database.js";
import { showToast } from "./toast.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

let selectedProfileImage = null;

function cleanPhoneNumber(phone) {
  return phone.replace(/\s/g, "");
}

function isValidPhoneNumber(phone) {
  const cleanedPhone = cleanPhoneNumber(phone);
  return /^\d{10}$/.test(cleanedPhone);
}

function isValidProfileImage(file) {
  if (!file) return false;

  const allowedTypes = ["image/png", "image/jpeg"];
  return allowedTypes.includes(file.type);
}

function showProfileImage(imageURL) {
  const profileImage = document.getElementById("profileImage");
  const profileImageFallback = document.getElementById("profileImageFallback");

  if (!imageURL) return;

  profileImage.src = imageURL;
  profileImage.classList.remove("hidden");
  profileImageFallback.classList.add("hidden");
}

function fillProfileFields(data) {
  document.getElementById("fullName").value = data.fullName || "";
  document.getElementById("email").value = data.email || "";
  document.getElementById("phone").value = data.phone || "";
  document.getElementById("role").value = data.role || "";

  document.getElementById("profileName").textContent = data.fullName || "Customer Name";
  document.getElementById("profileEmail").textContent = data.email || "customer@email.com";

  showProfileImage(data.image);
}

async function uploadProfileImage(file, uid) {
  const storageRef = ref(storage, `customer-profile-images/${uid}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export function initCustomerProfile() {
  const profileForm = document.getElementById("profileForm");
  const profileImageInput = document.getElementById("profileImageInput");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");

  let currentUser = null;
  let currentUserData = null;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    currentUser = user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      showToast("Profile not found.", "error");
      window.location.href = "login.html";
      return;
    }

    currentUserData = userSnap.data();

    if (currentUserData.role !== "customer") {
      showToast("Only customers can access this profile page.", "warning");
      window.location.href = "index.html";
      return;
    }

    fillProfileFields(currentUserData);
  });

  profileImageInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!isValidProfileImage(file)) {
      showToast("Profile picture must be a PNG or JPEG image.", "error");
      profileImageInput.value = "";
      selectedProfileImage = null;
      return;
    }

    selectedProfileImage = file;

    const reader = new FileReader();

    reader.onload = () => {
      showProfileImage(reader.result);
    };

    reader.readAsDataURL(file);
  });

  profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser || !currentUserData) {
      showToast("Profile could not be loaded.", "error");
      return;
    }

    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const cleanedPhone = cleanPhoneNumber(phone);

    if (!isValidPhoneNumber(phone)) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      let imageURL = currentUserData.image || null;

      if (selectedProfileImage) {
        imageURL = await uploadProfileImage(selectedProfileImage, currentUser.uid);
      }

      const userRef = doc(db, "users", currentUser.uid);

      await updateDoc(userRef, {
        fullName,
        phone: cleanedPhone,
        image: imageURL
      });

      currentUserData = {
        ...currentUserData,
        fullName,
        phone: cleanedPhone,
        image: imageURL
      };

      fillProfileFields(currentUserData);
      showToast("Profile updated successfully.", "success");

    } catch (error) {
      console.error(error);
      showToast("Could not update profile.", "error");
    }
  });

  deleteAccountBtn?.addEventListener("click", async () => {
    if (!currentUser || !currentUserData) {
      alert("Profile could not be loaded.");
      return;
    }

    await requestAccountDeletion(currentUser.uid, currentUserData.email);
  });
}

if (typeof window !== "undefined") {
  if (document.readyState !== "loading") {
    initCustomerProfile();
  } else {
    document.addEventListener("DOMContentLoaded", initCustomerProfile);
  }
}