import {
  auth,
  db,
  createUserWithEmailAndPassword,
  doc,
  setDoc,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider
} from "./database.js";

// get the form
const form = document.getElementById("registerForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault(); // stop page reload

  // get values from inputs
  const fullName = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const role = document.getElementById("registerRole").value;
  const shopName = document.getElementById("shop-name").value;

  try {
    // 1. create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    const user = userCredential.user;

    // 2. store user data in Firestore
    await setDoc(doc(db, "users", user.uid), {
      fullName: fullName,
      email: email,
      role: role,
      shopName: role === "vendor" ? shopName : null
    });

    console.log("User registered and saved:", user.uid);

    // 3. redirect based on role (basic for now)
    if (role === "customer") {
      window.location.href = "customer-dashboard.html";
    } else if (role === "vendor") {
      window.location.href = "vendor-dashboard.html"; // change later to vendor dashboard
    }

  } catch (error) {
    console.error("Error registering user:", error.message);
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

  const role = userSnap.data().role;
  redirectUser(role);
}

function redirectUser(role) {
  if (role === "customer") {
    window.location.href = "customer-dashboard.html";
  } else if (role === "vendor") {
    window.location.href = "vendor-dashboard.html";
  } else if (role === "admin") {
    window.location.href = "admin-dashboard.html";
  }
}
const roleSelect = document.getElementById("role");
const shopContainer = document.getElementById("shop-name-container");

roleSelect.addEventListener("change", () => {
  if (roleSelect.value === "vendor") {
    shopContainer.classList.remove("hidden");
  } else {
    shopContainer.classList.add("hidden");
  }
});