import {
  auth,
  db,
  signInWithEmailAndPassword,
  doc,
  getDoc,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider
} from "./database.js";

console.log("login.js loaded");

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("login form submitted");

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    // 1. sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log("User logged in:", user.uid);

    // 2. get user document from Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      alert("User profile not found in Firestore.");
      return;
    }

    const userData = userDocSnap.data();
    const role = userData.role;

    console.log("User role:", role);

    // 3. redirect based on role
    if (role === "customer") {
      window.location.href = "index.html";
    } else if (role === "vendor") {
      window.location.href = "vendor-dashboard.html"; // change later to vendor dashboard
    } else if (role === "admin") {
      window.location.href = "index.html"; // change later to admin dashboard
    } else {
      alert("Invalid user role.");
    }

  } catch (error) {
    console.error("Login error:", error.message);
    alert(error.message);
  }
});

const googleBtn = document.getElementById("googleLogin");
const facebookBtn = document.getElementById("facebookLogin");
const twitterBtn = document.getElementById("twitterLogin");
const microsoftBtn = document.getElementById("microsoftLogin");
const appleBtn = document.getElementById("appleLogin");

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
lucide.createIcons();