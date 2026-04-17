import {
  auth,
  db,
  storage,
  createUserWithEmailAndPassword,
  doc,
  setDoc,
  getDoc,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL
} from "./database.js";

let selectedLogoFile = null;

export function initRegisterUI() {
  const form = document.getElementById("registerForm");

  const roleSelect = document.getElementById("registerRole");
  const shopContainer = document.getElementById("shop-name-container");
  const locationContainer = document.getElementById("shop-location-container");
  const logoContainer = document.getElementById("shop-logo-container");

  const shopNameInput = document.getElementById("shop-name");
  const locationInput = document.getElementById("shop-location");
  const logoInput = document.getElementById("logoInput");

  const googleBtn = document.getElementById("googleRegister");
  const facebookBtn = document.getElementById("facebookRegister");
  const twitterBtn = document.getElementById("twitterRegister");
  const microsoftBtn = document.getElementById("microsoftRegister");
  const appleBtn = document.getElementById("appleRegister");

  // ---------------- FORM SUBMIT ----------------
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullName = document.getElementById("registerName")?.value || "";
      const email = document.getElementById("registerEmail")?.value || "";
      const password = document.getElementById("registerPassword")?.value || "";
      const role = document.getElementById("registerRole")?.value || "";
      const shopName = document.getElementById("shop-name")?.value || "";
      const location = document.getElementById("shop-location")?.value || "";

      try {
        if (role === "vendor") {
          if (!shopName.trim()) return alert("Shop name required");
          if (!location.trim()) return alert("Shop location required");
          if (!selectedLogoFile) return alert("Shop logo required");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        let logoURL = null;

        if (role === "vendor" && selectedLogoFile) {
          logoURL = await uploadLogo(selectedLogoFile, user.uid);
        }

        await setDoc(doc(db, "users", user.uid), {
          fullName,
          email,
          role,
          shopName: role === "vendor" ? shopName : null,
          location: role === "vendor" ? location : null,
          image: logoURL,
          status: role === "vendor" ? "pending" : "approved",
          createdAt: serverTimestamp()
        });

        if (role === "customer") {
          window.location.assign("customer-dashboard.html");
        } else {
          window.location.href = "pending-approval.html";
        }

      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    });
  }

  // ---------------- ROLE TOGGLE (THIS IS WHAT YOUR TESTS USE) ----------------
  if (roleSelect) {
    roleSelect.addEventListener("change", () => {
      if (roleSelect.value === "vendor") {
        shopContainer?.classList.remove("hidden");
        locationContainer?.classList.remove("hidden");
        logoContainer?.classList.remove("hidden");

        shopNameInput.required = true;
        locationInput.required = true;
        logoInput.required = true;
      } else {
        shopContainer?.classList.add("hidden");
        locationContainer?.classList.add("hidden");
        logoContainer?.classList.add("hidden");

        shopNameInput.required = false;
        locationInput.required = false;
        logoInput.required = false;

        shopNameInput.value = "";
        locationInput.value = "";
        logoInput.value = "";
        selectedLogoFile = null;
      }
    });
  }

  // ---------------- LOGO PREVIEW ----------------
  if (logoInput) {
    logoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      selectedLogoFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        let preview = document.getElementById("logoPreview");

        if (!preview) {
          preview = document.createElement("img");
          preview.id = "logoPreview";
          preview.className = "w-16 h-16 mt-2 rounded object-cover";
          logoContainer?.appendChild(preview);
        }

        preview.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  // ---------------- SOCIAL BUTTONS ----------------
  function safeClick(btn, provider) {
    if (!btn) return;

    btn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        await handleSocialLogin(result.user);
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    });
  }

  safeClick(googleBtn, new GoogleAuthProvider());
  safeClick(facebookBtn, new FacebookAuthProvider());
  safeClick(twitterBtn, new TwitterAuthProvider());
  safeClick(microsoftBtn, new OAuthProvider("microsoft.com"));
  safeClick(appleBtn, new OAuthProvider("apple.com"));
}

// ---------------- SOCIAL LOGIN ----------------
async function handleSocialLogin(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    sessionStorage.setItem("newUserUID", user.uid);
    window.location.href = "select-role.html";
    return;
  }

  const userData = userSnap.data();

  if (userData.role === "vendor") {
    if (userData.status === "pending") {
      window.location.href = "pending-approval.html";
      return;
    }

    if (userData.status === "suspended") {
      alert("Your account is suspended");
      return;
    }
  }

  redirectUser(userData.role);
}

function redirectUser(role) {
  if (role === "customer") {
    window.location.assign("customer-dashboard.html");
  } else if (role === "vendor") {
    window.location.href = "pending-approval.html";
  } else if (role === "admin") {
    window.location.assign("admin-dashboard.html");
  }
}

// ---------------- LOGO UPLOAD ----------------
const uploadLogo = async (file, uid) => {
  if (!file) return null;

  const storageRef = ref(storage, `vendor-logos/${uid}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

export const buildUserObject = ({
  fullName,
  email,
  role,
  shopName,
  location,
  image
}) => {
  return {
    fullName,
    email,
    role,
    shopName: role === "vendor" ? shopName : null,
    location: role === "vendor" ? location : null,
    image: image || null,
    status: role === "vendor" ? "pending" : "approved"
  };
};

// auto-init ONLY in browser (safe for Jest)
if (typeof window !== "undefined") {
  if (document.readyState !== "loading") {
    initRegisterUI();
  } else {
    document.addEventListener("DOMContentLoaded", initRegisterUI);
  }
}