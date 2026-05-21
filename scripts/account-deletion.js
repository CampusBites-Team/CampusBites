import {
  auth,
  db,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  signOut
} from "./database.js";

import {
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";


function getDeletionDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

function askForDeletionPassword() {
  return new Promise((resolve) => {
    const modal = document.createElement("section");

    modal.className =
      "fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4";

    modal.innerHTML = `
      <section class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <header class="mb-4">
          <h2 class="text-xl font-bold text-gray-900">Confirm Account Deletion</h2>
          <p class="text-sm text-gray-600 mt-2">
            Please re-enter your password to continue.
          </p>
        </header>

        <input
          type="password"
          id="deleteAccountModalPassword"
          placeholder="Enter your password"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
        />

        <footer class="flex justify-end gap-3 mt-5">
          <button
            type="button"
            id="cancelDeleteAccount"
            class="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            Cancel
          </button>

          <button
            type="button"
            id="confirmDeleteAccount"
            class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Confirm Delete
          </button>
        </footer>
      </section>
    `;

    document.body.appendChild(modal);

    const passwordInput = document.getElementById("deleteAccountModalPassword");
    const cancelButton = document.getElementById("cancelDeleteAccount");
    const confirmButton = document.getElementById("confirmDeleteAccount");

    passwordInput.focus();

    cancelButton.addEventListener("click", () => {
      modal.remove();
      resolve(null);
    });

    confirmButton.addEventListener("click", () => {
      const password = passwordInput.value;
      modal.remove();
      resolve(password);
    });
  });
}



export async function requestAccountDeletion(userId, email) {
  const confirmed = confirm(
    "Are you sure you want to delete your account? Your account will be deactivated now, but you can reactivate it within 30 days."
  );

  if (!confirmed) return;

const password = await askForDeletionPassword();
  if (!password) {
    alert("Account deletion cancelled.");
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(email, password);

    await reauthenticateWithCredential(auth.currentUser, credential);
  } catch (error) {
    alert("Incorrect password. Account deletion cancelled.");
    return;
  }

  const deletionDate = getDeletionDate();
  const userRef = doc(db, "users", userId);

  try {
    await updateDoc(userRef, {
      accountStatus: "pendingDeletion",
      deletionRequestedAt: serverTimestamp(),
      deletionScheduledFor: Timestamp.fromDate(deletionDate)
    });

    await fetch("/api/send-account-deletion-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        deletionScheduledFor: deletionDate.toDateString()
      })
    }).catch(() => {
      console.warn("Deletion email could not be sent.");
    });

    alert(
      "Your account has been scheduled for deletion. You have 30 days to reactivate it."
    );

    await signOut(auth);
    window.location.href = "login.html";

  } catch (error) {
    console.error(error);
    alert("Could not schedule account deletion. Please try again.");
  }
}

export async function reactivateAccount(userId) {
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    accountStatus: "active",
    deletionRequestedAt: null,
    deletionScheduledFor: null
  });

  alert("Your account has been reactivated.");
}