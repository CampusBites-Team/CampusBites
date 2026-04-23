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

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

let selectedProfileImage = null;

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
  document.getElementById("about").value = data.about || "";

  document.getElementById("profileName").textContent = data.fullName || "Customer Name";
  document.getElementById("profileEmail").textContent = data.email || "customer@email.com";
  document.getElementById("profileAbout").textContent = data.about || "No bio added yet.";

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
      alert("Profile not found.");
      window.location.href = "login.html";
      return;
    }

    currentUserData = userSnap.data();

    if (currentUserData.role !== "customer") {
      alert("Only customers can access this profile page.");
      window.location.href = "index.html";
      return;
    }

    fillProfileFields(currentUserData);
  });

  profileImageInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!isValidProfileImage(file)) {
      alert("Profile picture must be a PNG or JPEG image.");
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
      alert("Profile could not be loaded.");
      return;
    }

    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const about = document.getElementById("about").value.trim();

    try {
      let imageURL = currentUserData.image || null;

      if (selectedProfileImage) {
        imageURL = await uploadProfileImage(selectedProfileImage, currentUser.uid);
      }

      const userRef = doc(db, "users", currentUser.uid);

      await updateDoc(userRef, {
        fullName,
        phone,
        about,
        image: imageURL
      });

      currentUserData = {
        ...currentUserData,
        fullName,
        phone,
        about,
        image: imageURL
      };

      fillProfileFields(currentUserData);
      alert("Profile updated successfully.");

    } catch (error) {
      console.error(error);
      alert("Could not update profile.");
    }
  });
}

if (typeof window !== "undefined") {
  if (document.readyState !== "loading") {
    initCustomerProfile();
  } else {
    document.addEventListener("DOMContentLoaded", initCustomerProfile);
  }
}