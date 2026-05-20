import {
  db,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where
} from "./database.js";

function getVendorIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("vendorId");
}

function showVendorImage(imageURL) {
  const vendorImage = document.getElementById("vendorImage");
  const vendorImageFallback = document.getElementById("vendorImageFallback");

  if (!imageURL || !vendorImage || !vendorImageFallback) return;

  vendorImage.src = imageURL;
  vendorImage.classList.remove("hidden");
  vendorImageFallback.classList.add("hidden");
}

function getTodayOperatingHours(vendorData) {
  const today = new Date().getDay();
  const isWeekend = today === 0 || today === 6;

  const openingTime = isWeekend
    ? vendorData.weekendOpeningTime || vendorData.openingTime
    : vendorData.weekdayOpeningTime || vendorData.openingTime;

  const closingTime = isWeekend
    ? vendorData.weekendClosingTime || vendorData.closingTime
    : vendorData.weekdayClosingTime || vendorData.closingTime;

  return {
    openingTime,
    closingTime,
    label: isWeekend ? "Weekend hours" : "Weekday hours"
  };
}

function formatOperatingHours(vendorData) {
  const weekdayOpening = vendorData.weekdayOpeningTime || vendorData.openingTime;
  const weekdayClosing = vendorData.weekdayClosingTime || vendorData.closingTime;
  const weekendOpening = vendorData.weekendOpeningTime;
  const weekendClosing = vendorData.weekendClosingTime;

  const weekdayHours = weekdayOpening && weekdayClosing
    ? `Weekdays: ${weekdayOpening} - ${weekdayClosing}`
    : "Weekdays: Closed";

  const weekendHours = weekendOpening && weekendClosing
    ? `Weekends: ${weekendOpening} - ${weekendClosing}`
    : "Weekends: Closed";

  return `${weekdayHours} | ${weekendHours}`;
}

function isVendorOpen(vendorData) {
  const { openingTime, closingTime } = getTodayOperatingHours(vendorData);

  if (!openingTime || !closingTime) {
    return false;
  }

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);

  return currentTime >= openingTime && currentTime <= closingTime;
}

function showTextElement(elementId, value) {
  const element = document.getElementById(elementId);

  if (!element || !value) return;

  element.textContent = value;
  element.classList.remove("hidden");
}

function renderVendorDetails(vendorData) {
  const vendorName = document.getElementById("vendorName");
  const vendorLocation = document.getElementById("vendorLocation");
  const vendorHours = document.getElementById("vendorHours");
  const vendorStatus = document.getElementById("vendorStatus");

  vendorName.textContent = vendorData.shopName || "Vendor";
  if (vendorName) vendorName.textContent = vendorData.shopName || "Vendor";

  if (vendorLocation) {
    vendorLocation.textContent = vendorData.location || "Location not available";
  }

  if (vendorHours) {
    vendorHours.textContent = formatOperatingHours(vendorData);
  }

  vendorLocation.innerHTML = `
    <i data-lucide="map-pin" class="w-4 h-4 text-indigo-600"></i>
    <span>${vendorData.location || "Location not available"}</span>
  `;

  vendorHours.innerHTML = `
    <i data-lucide="clock" class="w-4 h-4 text-indigo-600"></i>
    <span>${formatOperatingHours(vendorData)}</span>
  `;

  showTextElement("vendorSlogan", vendorData.storeSlogan);
  showTextElement("vendorCategory", vendorData.storeCategory);

  if (vendorData.storePhone) {
    document.getElementById("vendorPhone").innerHTML = `
      <i data-lucide="phone" class="w-4 h-4 text-indigo-600"></i>
      <span>${vendorData.storePhone}</span>
    `;
    document.getElementById("vendorPhone").classList.remove("hidden");
  }

  const openNow = isVendorOpen(vendorData);

  if (vendorStatus) {
    if (openNow) {
      vendorStatus.textContent = "Open Now";
      vendorStatus.className =
        "px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700";
    } else {
      vendorStatus.textContent = "Closed Now";
      vendorStatus.className =
        "px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700";
    }
  }

  showVendorImage(vendorData.image || vendorData.logo);
}

async function fetchVendorMenuItems(vendorId) {
  const menuQuery = query(
    collection(db, "menu_items"),
    where("vendorId", "==", vendorId)
  );

  const snapshot = await getDocs(menuQuery);

  return snapshot.docs.map((menuDoc) => ({
    id: menuDoc.id,
    ...menuDoc.data()
  }));
}

function renderVendorMenu(items) {
  const vendorMenu = document.getElementById("vendorMenu");

  if (!vendorMenu) return;

  const availableItems = items.filter(
    (item) => item.available && item.status === "approved"
  );

  if (!availableItems.length) {
    vendorMenu.innerHTML = `<p class="text-gray-500">No available menu items yet.</p>`;
    return;
  }

  vendorMenu.innerHTML = availableItems.map((item) => `
    <article class="bg-white rounded-2xl shadow-md p-4">
      <img
        src="${item.image || item.imageUrl || "assets/default.jpg"}"
        alt="${item.name || "Menu item"}"
        class="w-full h-48 object-cover rounded-lg mb-4"
      />

      <header class="mb-2">
        <h3 class="text-lg font-semibold text-gray-900">
          ${item.name || "Menu Item"}
        </h3>
        <p class="text-sm text-gray-500">
          ${item.category || "Category"}
        </p>
      </header>

      <p class="text-sm text-gray-600 mb-3">
        ${item.description || ""}
      </p>

      <footer class="flex justify-between items-center">
        <span class="font-bold text-indigo-600">
          R${item.price || 0}
        </span>

        <a
          href="browse.html"
          class="text-sm text-indigo-600 font-semibold hover:underline"
        >
          Order on Browse
        </a>
      </footer>
    </article>
  `).join("");
}

async function fetchVendorReviews(vendorId) {
  const reviewsQuery = query(
    collection(db, "reviews"),
    where("vendorId", "==", vendorId)
  );

  const snapshot = await getDocs(reviewsQuery);

  return snapshot.docs.map((reviewDoc) => ({
    id: reviewDoc.id,
    ...reviewDoc.data()
  }));
}

function getReviewsContainer() {
  let reviewsContainer = document.getElementById("vendorReviews");

  if (reviewsContainer) return reviewsContainer;

  const vendorMenu = document.getElementById("vendorMenu");

  const reviewsSection = document.createElement("section");
  reviewsSection.className = "mt-10";
  reviewsSection.innerHTML = `
    <h2 class="text-2xl font-bold text-gray-900 mb-4">Reviews</h2>
    <section id="vendorReviews" class="space-y-4"></section>
  `;

  if (vendorMenu?.parentElement) {
    vendorMenu.parentElement.appendChild(reviewsSection);
  } else {
    document.body.appendChild(reviewsSection);
  }

  return document.getElementById("vendorReviews");
}

function renderStars(rating = 0) {
  const numericRating = Number(rating || 0);

  return "★".repeat(numericRating) + "☆".repeat(5 - numericRating);
}

function shuffleReviews(reviews) {
  return [...reviews].sort(() => Math.random() - 0.5);
}

function renderVendorReviews(reviews) {
  const reviewsContainer = getReviewsContainer();

  if (!reviewsContainer) return;

  if (!reviews.length) {
    reviewsContainer.innerHTML = `
      <p class="text-gray-500">No reviews yet.</p>
    `;
    return;
  }

  const shuffledReviews = shuffleReviews(reviews);
  let currentIndex = 0;
  const reviewsPerPage = 3;

  function renderReviewPage() {
    const visibleReviews = shuffledReviews.slice(
      currentIndex,
      currentIndex + reviewsPerPage
    );

    reviewsContainer.innerHTML = `
      <section class="flex justify-between items-center mb-4">

        <section class="relative flex items-center gap-4">
          <button
            id="prevReviewsBtn"
            class="shrink-0 bg-gray-200 w-10 h-10 rounded-full hover:bg-gray-300 flex items-center justify-center"
            ${currentIndex === 0 ? "disabled" : ""}
          >
            ←
          </button>
              <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                ${visibleReviews.map((review) => `
                  <article class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 min-h-[220px] flex flex-col">
                    <section class="flex items-start gap-4 mb-3">
                      <img
                        src="${review.customerImage || "assets/default-icon.jpg"}"
                        alt="${review.customerName || "Customer"}"
                        class="w-12 h-12 rounded-full object-cover"
                      />

                      <section class="flex-1">
                        <h3 class="font-semibold text-gray-900">
                          ${review.customerName || "Customer"}
                        </h3>

                        <p class="text-sm text-yellow-500">
                          ${renderStars(review.rating)}
                        </p>
                      </section>

                      ${
                        review.orderNumber
                          ? `<span class="text-xs text-gray-400">Order ${review.orderNumber}</span>`
                          : ""
                      }
                    </section>

                    <p class="text-sm text-gray-700 flex-1">
                      ${review.comment || "No comment provided."}
                    </p>

                    ${
                      review.items?.length
                        ? `
                          <p class="text-xs text-gray-400 mt-4 line-clamp-2">
                            Items: ${review.items.map((item) => item.name || item).join(", ")}
                          </p>
                        `
                        : ""
                    }
                  </article>
                `).join("")}
              </section>
          <button
            id="nextReviewsBtn"
            class="shrink-0 bg-gray-200 text-white w-10 h-10 rounded-full hover:bg-gray-300 flex items-center justify-center"
            ${currentIndex + reviewsPerPage >= shuffledReviews.length ? "disabled" : ""}
          >
             →
          </button>
        </section>
      </section>


    `;

    document.getElementById("prevReviewsBtn")?.addEventListener("click", () => {
      currentIndex = Math.max(0, currentIndex - reviewsPerPage);
      renderReviewPage();
    });

    document.getElementById("nextReviewsBtn")?.addEventListener("click", () => {
      currentIndex = Math.min(
        shuffledReviews.length - reviewsPerPage,
        currentIndex + reviewsPerPage
      );
      renderReviewPage();
    });
  }

  renderReviewPage();
}

export async function initVendorProfile() {
  const vendorId = getVendorIdFromURL();

  if (!vendorId) {
    alert("Vendor profile could not be loaded.");
    window.location.href = "browse.html";
    return;
  }

  const vendorRef = doc(db, "users", vendorId);
  const vendorSnap = await getDoc(vendorRef);

  if (!vendorSnap.exists()) {
    alert("Vendor not found.");
    window.location.href = "browse.html";
    return;
  }

  const vendorData = vendorSnap.data();

  if (vendorData.role !== "vendor" || vendorData.status !== "approved") {
    alert("This vendor profile is not available.");
    window.location.href = "browse.html";
    return;
  }

  renderVendorDetails(vendorData);

  const [menuItems, reviews] = await Promise.all([
    fetchVendorMenuItems(vendorId),
    fetchVendorReviews(vendorId)
  ]);

  renderVendorMenu(menuItems);
  renderVendorReviews(reviews);

  globalThis.lucide?.createIcons?.();
}

if (typeof window !== "undefined") {
  if (document.readyState !== "loading") {
    initVendorProfile();
  } else {
    document.addEventListener("DOMContentLoaded", initVendorProfile);
  }
}