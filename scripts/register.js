import {
  auth,
  db,
  createUserWithEmailAndPassword,
  doc,
  setDoc
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

  try {
    // 1. create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    const user = userCredential.user;

    // 2. store user data in Firestore
    await setDoc(doc(db, "users", user.uid), {
      fullName: fullName,
      email: email,
      role: role
    });

    console.log("User registered and saved:", user.uid);

    // 3. redirect based on role (basic for now)
    if (role === "customer") {
      window.location.href = "index.html";
    } else if (role === "vendor") {
      window.location.href = "index.html"; // change later to vendor dashboard
    }

  } catch (error) {
    console.error("Error registering user:", error.message);
    alert(error.message);
  }
});