import {
  auth,
  db,
  doc,
  getDoc,
  updateDoc,
  onAuthStateChanged
} from "./database.js";

const BANK_LABELS = {
  absa: "ABSA",
  capitec: "Capitec",
  discovery: "Discovery Bank",
  fnb: "FNB",
  investec: "Investec",
  nedbank: "Nedbank",
  standard_bank: "Standard Bank",
  tymebank: "TymeBank",
  african_bank: "African Bank",
  bidvest: "Bidvest Bank"
};

function formatVendorDetails(shopName, location) {
  if (!shopName && !location) {
    return "No vendor details set yet.";
  }

  const displayShopName = shopName || "Shop name not set";
  const displayLocation = location || "Location not set";

  return `${displayShopName} • ${displayLocation}`;
}

function formatOperatingHours(openingTime, closingTime) {
  if (!openingTime || !closingTime) {
    return "No operating hours set yet.";
  }

  return `${openingTime} - ${closingTime}`;
}

function fillVendorDetails(userData) {
  document.getElementById("shopName").value = userData.shopName || "";
  document.getElementById("location").value = userData.location || "";

  document.getElementById("savedVendorDetails").textContent =
    formatVendorDetails(userData.shopName, userData.location);
}

function fillOperatingHours(userData) {
  document.getElementById("openingTime").value = userData.openingTime || "";
  document.getElementById("closingTime").value = userData.closingTime || "";

  document.getElementById("savedOperatingHours").textContent =
    formatOperatingHours(userData.openingTime, userData.closingTime);
}

function formatBankingDetails(bankDetails) {
  if (!bankDetails || !bankDetails.bankName) return "No banking details set yet.";
  const bankLabel = BANK_LABELS[bankDetails.bankName] || bankDetails.bankName;
  const num = bankDetails.accountNumber || "";
  const masked = num.length > 4
    ? `${"•".repeat(num.length - 4)}${num.slice(-4)}`
    : num;
  return `${bankLabel} • ${masked}`;
}

function fillBankingDetails(userData) {
  const b = userData.bankDetails || {};
  document.getElementById("settings-bank-name").value = b.bankName || "";
  document.getElementById("settings-account-holder").value = b.accountHolder || "";
  document.getElementById("settings-account-number").value = b.accountNumber || "";
  document.getElementById("settings-branch-code").value = b.branchCode || "";
  document.getElementById("settings-account-type").value = b.accountType || "";
  document.getElementById("savedBankingDetails").textContent =
    formatBankingDetails(userData.bankDetails);
}

function attachBankingDetailsForm(vendorId, userData) {
  const form = document.getElementById("bankingDetailsForm");
  if (!form || form.dataset.listenerAttached === "true") return;
  form.dataset.listenerAttached = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const bankName = document.getElementById("settings-bank-name").value;
    const accountHolder = document.getElementById("settings-account-holder").value.trim();
    const accountNumber = document.getElementById("settings-account-number").value.trim();
    const branchCode = document.getElementById("settings-branch-code").value.trim();
    const accountType = document.getElementById("settings-account-type").value;

    if (!bankName) return alert("Please select a bank.");
    if (!accountHolder) return alert("Please enter the account holder name.");
    if (!/^\d{6,12}$/.test(accountNumber)) return alert("Account number must be 6 to 12 digits.");
    if (!/^\d{6}$/.test(branchCode)) return alert("Branch code must be exactly 6 digits.");
    if (!accountType) return alert("Please select an account type.");

    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/paystack/update-bank-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          bankDetails: { bankName, accountHolder, accountNumber, branchCode, accountType }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }

      userData.bankDetails = { bankName, accountHolder, accountNumber, branchCode, accountType };
      fillBankingDetails(userData);
      alert("Banking details updated successfully.");
    } catch (err) {
      alert("Could not update banking details: " + err.message);
    }
  });
}

function attachVendorDetailsForm(vendorId, userData) {
  const vendorDetailsForm = document.getElementById("vendorDetailsForm");

  if (!vendorDetailsForm || vendorDetailsForm.dataset.listenerAttached === "true") {
    return;
  }

  vendorDetailsForm.dataset.listenerAttached = "true";

  vendorDetailsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const shopName = document.getElementById("shopName").value.trim();
    const location = document.getElementById("location").value.trim();

    if (!shopName) {
      alert("Please enter your shop name.");
      return;
    }

    if (!location) {
      alert("Please enter your shop location.");
      return;
    }

    const userRef = doc(db, "users", vendorId);

    await updateDoc(userRef, {
      shopName,
      location
    });

    userData.shopName = shopName;
    userData.location = location;

    fillVendorDetails(userData);
    alert("Vendor details updated successfully.");
  });
}

function attachOperatingHoursForm(vendorId, userData) {
  const operatingHoursForm = document.getElementById("operatingHoursForm");

  if (!operatingHoursForm || operatingHoursForm.dataset.listenerAttached === "true") {
    return;
  }

  operatingHoursForm.dataset.listenerAttached = "true";

  operatingHoursForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const openingTime = document.getElementById("openingTime").value;
    const closingTime = document.getElementById("closingTime").value;

    if (!openingTime || !closingTime) {
      alert("Please enter both opening and closing times.");
      return;
    }

    if (openingTime >= closingTime) {
      alert("Closing time must be after opening time.");
      return;
    }

    const userRef = doc(db, "users", vendorId);

    await updateDoc(userRef, {
      openingTime,
      closingTime
    });

    userData.openingTime = openingTime;
    userData.closingTime = closingTime;

    fillOperatingHours(userData);
    alert("Operating hours updated successfully.");
  });
}

export function initVendorSettings(locationObj = window.location) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      locationObj.href = "login.html";
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      locationObj.href = "login.html";
      return;
    }

    const userData = userSnap.data();

    if (userData.role !== "vendor") {
      locationObj.href = "index.html";
      return;
    }

    if (userData.status === "pending") {
      locationObj.href = "pending-approval.html";
      return;
    }

    if (userData.status === "suspended") {
      alert("Your account is suspended");
      locationObj.href = "login.html";
      return;
    }

    fillVendorDetails(userData);
    fillOperatingHours(userData);
    fillBankingDetails(userData);

    attachVendorDetailsForm(user.uid, userData);
    attachOperatingHoursForm(user.uid, userData);
    attachBankingDetailsForm(user.uid, userData);
  });
}

if (typeof window !== "undefined") {
  if (document.readyState !== "loading") {
    initVendorSettings();
  } else {
    document.addEventListener("DOMContentLoaded", initVendorSettings);
  }
}