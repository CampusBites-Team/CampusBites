import {
  auth, db, signInWithEmailAndPassword, doc, getDoc,
  signInWithPopup, GoogleAuthProvider, FacebookAuthProvider,
  TwitterAuthProvider, OAuthProvider, sendEmailVerification, signOut
} from "./database.js";
import { showToast } from "./toast.js";

// ---------------- NAVIGATION ----------------
export function navigateTo(page, locationObj = window.location) {
  if (!locationObj || typeof locationObj.assign !== "function") {
    throw new Error("Invalid location object");
  }

  locationObj.assign(page);
}

export function redirectUser(role, locationObj = window.location) {
  if (!locationObj || typeof locationObj.assign !== "function") {
    throw new Error("Invalid location object");
  }

  if (role === 'customer') {
    locationObj.assign('customer-dashboard.html');
  } else if (role === 'vendor') {
    locationObj.assign('vendor-dashboard.html');
  } else if (role === 'admin') {
    locationObj.assign('admin-dashboard.html');
  }
}

// ---------------- LOGIN FORM ----------------
export function initLoginForm() {
  const form = document.getElementById("loginForm");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // ✅ SAFE reload check for Jest/tests
      try {
        if (user && typeof user.reload === "function") {
          await user.reload();
        }
      } catch (err) {
        // Ignore reload errors in tests/mock environments
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      const profileExists = userDocSnap.exists();

      if (!profileExists) {
        showToast("User profile not found.", "error");
        return;
      }
      const userData = userDocSnap.data();

if (userData.accountStatus === "pendingDeletion") {
  const reactivate = confirm(
    "This account is scheduled for deletion. Do you want to reactivate it?"
  );

  if (reactivate) {
    const { reactivateAccount } = await import("./account-deletion.js");
    await reactivateAccount(user.uid);
    redirectUser(userData.role);
    return;
  }

  await auth.signOut();
  return;
}

redirectUser(userData.role);


    
     // const userData = userDocSnap.data();

      if (
        userData.requiresEmailVerification === true &&
        !user.emailVerified
      ) {
        await sendEmailVerification(user);
        await signOut(auth);

        showToast(
          "Please verify your email before logging in. A new verification email has been sent.",
          "error"
        );
        return;
      }

      redirectUser(userData.role);

    } catch (error) {
      showToast("Invalid email or password.", "error");
    }
  });
}

// ---------------- SOCIAL LOGINS ----------------
export function initSocialLogins() {
  const setup = (id, provider) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        await handleSocialLogin(result.user);
      } catch (error) {
        showToast(`${id} sign-in failed: ` + error.message, "error");
      }
    });
  };

  setup("googleLogin", new GoogleAuthProvider());
  setup("facebookLogin", new FacebookAuthProvider());
  setup("twitterLogin", new TwitterAuthProvider());
  setup("microsoftLogin", new OAuthProvider("microsoft.com"));
  setup("appleLogin", new OAuthProvider("apple.com"));
}

// ---------------- SOCIAL HANDLER ----------------
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

// ---------------- PASSWORD TOGGLE ----------------
export function initPasswordToggle() {
  const passwordInput = document.getElementById("loginPassword");
  const toggleButton = document.getElementById("toggleLoginPassword");

  if (!passwordInput || !toggleButton) return;

  toggleButton.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";

    passwordInput.type = isHidden ? "text" : "password";

    toggleButton.innerHTML = isHidden
      ? '<i data-lucide="eye-off" class="h-5 w-5"></i>'
      : '<i data-lucide="eye" class="h-5 w-5"></i>';

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  });
}
// ---------------- INIT (SAFE FOR BROWSER ONLY) ----------------
export function initLoginPage() {
  initLoginForm();
  initSocialLogins();
  initPasswordToggle();

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}