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

// get the form
const form = document.getElementById("registerForm");
const logoInput = document.getElementById("logoInput");
const locationCOntainer = document.getElementById("shop-location-container");
const logoContainer = document.getElementById("shop-logo-container");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const role = document.getElementById("registerRole").value;
  const shopName = document.getElementById("shop-name").value;
  const location = document.getElementById("shop-location").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 🔥 upload logo FIRST
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
      image: logoURL, // ✅ FIXED
      status: role === "vendor" ? "pending" : "approved",
      createdAt: serverTimestamp()
    });

    if (role === "customer") {
      window.location.href = "customer-dashboard.html";
    } else {
      window.location.href = "pending-approval.html";
    }

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});
const googleBtn = document.getElementById("googleRegister");
const facebookBtn = document.getElementById("facebookRegister");
const twitterBtn = document.getElementById("twitterRegister");
const microsoftBtn = document.getElementById("microsoftRegister");
const appleBtn = document.getElementById("appleRegister");

googleBtn.addEventListener("click",async () => {
  const provider = new GoogleAuthProvider();
  try{
    const result = await signInWithPopup(auth, provider);
    console.log("Google sign-in successful:", result.user);
    await handleSocialLogin(result.user);
  } catch (error) {
    console.error("Google sign-in error:", error);
    alert("Google sign-in failed: " + error.message);
  }
});
facebookBtn.addEventListener("click", async () => {
  const provider = new FacebookAuthProvider();
  try{
    const result = await signInWithPopup(auth, provider);
    console.log("Facebook sign-in successful:", result.user);
    await handleSocialLogin(result.user);
  } catch (error) {
    console.error("Facebook sign-in error:", error);
    alert("Facebook sign-in failed: " + error.message);
  }
});
twitterBtn.addEventListener("click", async () => {
  const provider = new TwitterAuthProvider();
  try{
    const result = await signInWithPopup(auth, provider);
    console.log("Twitter sign-in successful:", result.user);
    await handleSocialLogin(result.user);
  } catch (error) {
    console.error("Twitter sign-in error:", error);
    alert("Twitter sign-in failed: " + error.message);
  }
});
microsoftBtn.addEventListener("click", async () => {
  const provider = new OAuthProvider("microsoft.com");
  try{
    const result = await signInWithPopup(auth, provider);
    console.log("Microsoft sign-in successful:", result.user);
    await handleSocialLogin(result.user);
  } catch (error) {
    console.error("Microsoft sign-in error:", error);
    alert("Microsoft sign-in failed: " + error.message);
  }
});
appleBtn.addEventListener("click", async () => {
  const provider = new OAuthProvider("apple.com");
  try{
    const result = await signInWithPopup(auth, provider);
    console.log("Apple sign-in successful:", result.user);
    await handleSocialLogin(result.user);
  } catch (error) {
    console.error("Apple sign-in error:", error);
    alert("Apple sign-in failed: " + error.message);
  }
});
async function handleSocialLogin(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  // first time login
  if (!userSnap.exists()) {
    // store temp uid in session
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
    window.location.href = "customer-dashboard.html";
  } else if (role === "vendor") {
    window.location.href = "pending-approval.html"; // default to pending page, actual redirect will be handled after approval check
  } else if (role === "admin") {
    window.location.href = "admin-dashboard.html";
  }
}
const roleSelect = document.getElementById("registerRole");
const shopContainer = document.getElementById("shop-name-container");

roleSelect.addEventListener("change", () => {
  if (roleSelect.value === "vendor") {
    shopContainer.classList.remove("hidden");
    locationCOntainer.classList.remove("hidden");
    logoContainer.classList.remove("hidden");
  } else {
    shopContainer.classList.add("hidden");
    locationCOntainer.classList.add("hidden");
    logoContainer.classList.add("hidden");
  }
});
let selectedLogoFile = null;

logoInput?.addEventListener("change", (e) => {
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
      logoContainer.appendChild(preview);
    }

    preview.src = reader.result;
  };

  reader.readAsDataURL(file);
});
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