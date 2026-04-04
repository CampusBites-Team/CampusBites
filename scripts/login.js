import {
  auth,
  db,
  signInWithEmailAndPassword,
  doc,
  getDoc
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
      window.location.href = "index.html"; // change later to vendor dashboard
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