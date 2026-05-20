import {
  auth,
  db,
  storage,
  doc,
  getDoc,
  updateDoc,
  onAuthStateChanged,
  ref,
  uploadBytes,
  getDownloadURL
} from "./database.js";

import { requestAccountDeletion } from "./account-deletion.js";

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

let selectedStoreLogo = null;

function formatVendorDetails(userData) {
  const details = [];

  if (userData.shopName) details.push(userData.shopName);
  if (userData.location) details.push(userData.location);
  if (userData.storeCategory) details.push(userData.storeCategory);
  if (userData.storePhone) details.push(userData.storePhone);

  if (!details.length) {
    return "No vendor details set yet.";
  }

  return details.join(" • ");
}

function formatOperatingHours(userData) {
  const hasWeekdayHours = userData.weekdayOpeningTime && userData.weekdayClosingTime;
  const hasWeekendHours = userData.weekendOpeningTime && userData.weekendClosingTime;

  if (!hasWeekdayHours && !hasWeekendHours) {
    return "No operating hours set yet.";
  }

  const weekdayHours = hasWeekdayHours
    ? `${userData.weekdayOpeningTime} - ${userData.weekdayClosingTime}`
    : "Not set";

  const weekendHours = hasWeekendHours
    ? `${userData.weekendOpeningTime} - ${userData.weekendClosingTime}`
    : "Not set";

  return `Weekdays: ${weekdayHours} | Weekends: ${weekendHours}`;
}

function showStoreLogo(imageURL) {
  const storeLogoPreview = document.getElementById("storeLogoPreview");
  const storeLogoFallback = document.getElementById("storeLogoFallback");

  if (!imageURL || !storeLogoPreview || !storeLogoFallback) return;

  storeLogoPreview.src = imageURL;
  storeLogoPreview.classList.remove("hidden");
  storeLogoFallback.classList.add("hidden");
}

function fillVendorDetails(userData) {
  document.getElementById("shopName").value = userData.shopName || "";
  document.getElementById("location").value = userData.location || "";

  document.getElementById("storeSlogan").value =
    userData.storeSlogan || userData.slogan || "";

  document.getElementById("storePhone").value =
    userData.storePhone || userData.phone || "";

  document.getElementById("storeCategory").value =
    userData.storeCategory || userData.category || "";

  document.getElementById("savedVendorDetails").textContent =
    formatVendorDetails({
      ...userData,
      storeSlogan: userData.storeSlogan || userData.slogan,
      storePhone: userData.storePhone || userData.phone,
      storeCategory: userData.storeCategory || userData.category
    });

  showStoreLogo(userData.image || userData.logo);
}

function fillOperatingHours(userData) {
  document.getElementById("weekdayOpeningTime").value =
    userData.weekdayOpeningTime || userData.openingTime || "";

  document.getElementById("weekdayClosingTime").value =
    userData.weekdayClosingTime || userData.closingTime || "";

  document.getElementById("weekendOpeningTime").value =
    userData.weekendOpeningTime || "";

  document.getElementById("weekendClosingTime").value =
    userData.weekendClosingTime || "";

  document.getElementById("savedOperatingHours").textContent =
    formatOperatingHours({
      ...userData,
      weekdayOpeningTime: userData.weekdayOpeningTime || userData.openingTime,
      weekdayClosingTime: userData.weekdayClosingTime || userData.closingTime
    });
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

function isValidImage(file) {
  if (!file) return false;

  return ["image/png", "image/jpeg"].includes(file.type);
}

function attachStoreLogoListener() {
  const storeLogoInput = document.getElementById("storeLogoInput");

  if (!storeLogoInput || storeLogoInput.dataset.listenerAttached === "true") {
    return;
  }

  storeLogoInput.dataset.listenerAttached = "true";

  storeLogoInput.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (!isValidImage(file)) {
      alert("Store logo must be a PNG or JPG/JPEG image.");
      storeLogoInput.value = "";
      selectedStoreLogo = null;
      return;
    }

    selectedStoreLogo = file;

    const reader = new FileReader();

    reader.onload = () => {
      showStoreLogo(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

async function uploadStoreLogo(file, vendorId) {
  const storageRef = ref(storage, `vendor_logos/${vendorId}/store-logo`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
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
    const storeSlogan = document.getElementById("storeSlogan").value.trim();
    const storePhone = document.getElementById("storePhone").value.trim();
    const storeCategoryValue = document.getElementById("storeCategory").value;
const customCategory = document.getElementById("customCategory")?.value.trim() || "";

const storeCategory =
  storeCategoryValue === "Other"
    ? customCategory
    : storeCategoryValue;

    if (!shopName) {
      alert("Please enter your shop name.");
      return;
    }

    if (!location) {
      alert("Please enter your shop location.");
      return;
    }

    const userRef = doc(db, "users", vendorId);

    try {
      const vendorUpdate = {
        shopName,
        location,
        storeSlogan,
        storePhone,
        storeCategory
      };

      await updateDoc(userRef, vendorUpdate);

      userData.shopName = shopName;
      userData.location = location;
      userData.storeSlogan = storeSlogan;
      userData.storePhone = storePhone;
      userData.storeCategory = storeCategory;

      if (selectedStoreLogo) {
        const imageURL = await uploadStoreLogo(selectedStoreLogo, vendorId);

        await updateDoc(userRef, {
          image: imageURL
        });

        userData.image = imageURL;
        selectedStoreLogo = null;
      }

      fillVendorDetails(userData);
      alert("Vendor details updated successfully.");
    } catch (error) {
      console.error("Could not update vendor details:", error);
      alert("Could not update vendor details.");
    }
  });
}

function validateTimePair(openingTime, closingTime, label) {
  if (!openingTime && !closingTime) {
    return true;
  }

  if (!openingTime || !closingTime) {
    alert(`Please enter both ${label} opening and closing times.`);
    return false;
  }

  if (openingTime >= closingTime) {
    alert(`${label} closing time must be after opening time.`);
    return false;
  }

  return true;
}

function attachOperatingHoursForm(vendorId, userData) {
  const operatingHoursForm = document.getElementById("operatingHoursForm");

  if (!operatingHoursForm || operatingHoursForm.dataset.listenerAttached === "true") {
    return;
  }

  operatingHoursForm.dataset.listenerAttached = "true";

  operatingHoursForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const weekdayOpeningTime = document.getElementById("weekdayOpeningTime").value;
    const weekdayClosingTime = document.getElementById("weekdayClosingTime").value;
    const weekendOpeningTime = document.getElementById("weekendOpeningTime").value;
    const weekendClosingTime = document.getElementById("weekendClosingTime").value;

    if (!validateTimePair(weekdayOpeningTime, weekdayClosingTime, "weekday")) return;
    if (!validateTimePair(weekendOpeningTime, weekendClosingTime, "weekend")) return;

    try {
      const userRef = doc(db, "users", vendorId);

      await updateDoc(userRef, {
        weekdayOpeningTime,
        weekdayClosingTime,
        weekendOpeningTime,
        weekendClosingTime,

        // Backwards compatibility for old vendor profile code.
        openingTime: weekdayOpeningTime,
        closingTime: weekdayClosingTime
      });

      userData.weekdayOpeningTime = weekdayOpeningTime;
      userData.weekdayClosingTime = weekdayClosingTime;
      userData.weekendOpeningTime = weekendOpeningTime;
      userData.weekendClosingTime = weekendClosingTime;
      userData.openingTime = weekdayOpeningTime;
      userData.closingTime = weekdayClosingTime;

      fillOperatingHours(userData);
      alert("Operating hours updated successfully.");
    } catch (error) {
      console.error("Could not update operating hours:", error);
      alert("Could not update operating hours.");
    }
  });
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


function attachCustomCategoryListener() {
  const storeCategory = document.getElementById("storeCategory");
  const customCategorySection = document.getElementById("customCategorySection");

  if (!storeCategory || !customCategorySection) return;

  storeCategory.addEventListener("change", () => {
    if (storeCategory.value === "Other") {
      customCategorySection.classList.remove("hidden");
    } else {
      customCategorySection.classList.add("hidden");
    }
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
    attachCustomCategoryListener();

    document.getElementById("deleteAccountBtn")?.addEventListener("click", async () => {
  await requestAccountDeletion(user.uid, userData.email);
});

    attachStoreLogoListener();
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
export {
  validateTimePair
};