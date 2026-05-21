import {
  auth,
  sendPasswordResetEmail
} from "./database.js";
import { showToast } from "./toast.js";

const form = document.getElementById("forgotPasswordForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("resetEmail").value;

  try {
    await sendPasswordResetEmail(auth, email);
    showToast("If an account exists for this email, a password reset link has been set.", "success");
    window.location.href = "login.html";
  } catch (error) {
    console.error("Password reset error:", error);
    showToast("Could not send password reset email.", "error");
  }
});