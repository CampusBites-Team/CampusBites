import {
  auth, db, signInWithEmailAndPassword, doc, getDoc,
  signInWithPopup, GoogleAuthProvider, FacebookAuthProvider,
  TwitterAuthProvider, OAuthProvider
} from "./database.js";

export function navigateTo(page) {
  window.location.assign(page);
}

export function redirectUser(role) {
  if (role === "customer") navigateTo('customer-dashboard.html');
  else if (role === "vendor") navigateTo('vendor-dashboard.html');
  else if (role === "admin") navigateTo('admin-dashboard.html');
}

const form = document.getElementById("loginForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) { alert("User profile not found."); return; }
    redirectUser(userDocSnap.data().role);
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("googleLogin").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    await handleSocialLogin(result.user);
  } catch (error) { alert("Google sign-in failed: " + error.message); }
});

document.getElementById("facebookLogin").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, new FacebookAuthProvider());
    await handleSocialLogin(result.user);
  } catch (error) { alert("Facebook sign-in failed: " + error.message); }
});

document.getElementById("twitterLogin").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, new TwitterAuthProvider());
    await handleSocialLogin(result.user);
  } catch (error) { alert("Twitter sign-in failed: " + error.message); }
});

document.getElementById("microsoftLogin").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, new OAuthProvider("microsoft.com"));
    await handleSocialLogin(result.user);
  } catch (error) { alert("Microsoft sign-in failed: " + error.message); }
});

document.getElementById("appleLogin").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, new OAuthProvider("apple.com"));
    await handleSocialLogin(result.user);
  } catch (error) { alert("Apple sign-in failed: " + error.message); }
});

async function handleSocialLogin(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    sessionStorage.setItem("newUserUID", user.uid);
    window.location.href = "select-role.html";
    return;
  }
  redirectUser(userSnap.data().role);
}

if (typeof lucide !== 'undefined') lucide.createIcons();