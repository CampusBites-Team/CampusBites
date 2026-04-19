import {
  auth,
  sendPasswordResetEmail
} from "./database.js";

const form = document.getElementById("forgotPasswordForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("resetEmail").value;

  try {
    await sendPasswordResetEmail(auth, email);
    alert("If an account exists for this email, a password reset link has been set.");
    window.location.href = "login.html";
  } catch (error) {
    console.error("Password reset error:", error);
    alert(error.message);
  }
});