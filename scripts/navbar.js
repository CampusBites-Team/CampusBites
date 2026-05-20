import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot,
  orderBy
} from "./database.js";

import { formatTimestamp } from "./orders.js";

const styles = {
  "new-order": "border-l-4 border-indigo-600",
  "order-status": "border-l-4 border-green-600",
  "cancelled": "border-l-4 border-red-600"
};
const NAV_LINKS = {
  guest: [
    { label: "Home", href: "index.html" },
    { label: "Vendors", href: "multi-vendors.html" },
    { label: "Browse", href: "browse.html" }

  ],
  customer: [
    { label: "Home", href: "index.html" },
    { label: "Menu", href: "browse.html" },
    { label: "Dashboard", href: "customer-dashboard.html" },
    { label: "Orders", href: "customer-orders.html" }
  ],
  vendor: [
    { label: "Home", href: "index.html" },
    { label: "Browse", href: "browse.html" },
    { label: "Dashboard", href: "vendor-dashboard.html" },
    { label: "Orders", href: "vendor-orders.html" }
  ],
  admin: [
    { label: "Home", href: "index.html" },
    { label: "Dashboard", href: "admin-dashboard.html" },
    { label: "Vendors", href: "vendor-management.html" },
    { label: "Menu Management", href: "admin-menuManagement.html" } 
   ]
};
const PROFILE_LINKS = {
  guest: [
    { label: "Home", href: "index.html" },
    { label: "Browse", href: "browse.html" }

  ],
  customer: [
    { label: "Home", href: "index.html" },
    { label: "Profile", href: "customer-profile.html" },
    { label: "For You", href: "recommendations.html" },
    { label: "Vendors", href: "multi-vendors.html" }
  ],
  vendor: [
    { label: "Home", href: "index.html" },
    { label: "Menu", href: "menu-management.html" },
    { label: "Order History", href: "vendor-orderHistory.html" },
    { label: "Analytics", href: "vendor-analytics.html" },
    { label: "Store Settings", href: "vendor-settings.html" }
  ],
  admin: [
    { label: "Home", href: "index.html" },
    { label: "Browse", href: "browse.html" },
    { label: "Vendors", href: "vendor-management.html" },
    { label: "Analytics", href: "admin-analytics.html" },
    { label: "Pay Outs", href: "admin-payouts.html" }

  ]
};

const AUTH_BUTTON_PAGES = [
  "index.html",
  "browse.html",
  "customer-dashboard.html",
  "vendor-dashboard.html",
  "admin-dashboard.html",
  "admin-payouts.html" ,
  "admin-analytics.html",
  "admin-menuManagement.html",
  "vendor-orders.html",
  "vendor-management.html",
  "vendor-settings.html",
  "customer-profile.html",
  "customer-orders.html",
  "recommendations.html",
  "vendor-analytics.html",
  "vendor-profile.html",
  "vendor-orderHistory.html",
  "menu-management.html",
  "multi-vendors.html"

];

function getCurrentPage() {
  const path = window.location.pathname;
  return path.substring(path.lastIndexOf("/") + 1) || "index.html";
}

function shouldShowAuthButtons() {
  return AUTH_BUTTON_PAGES.includes(getCurrentPage());
}

function renderProfileMenu(role, user, userData) {
  const container = document.getElementById("profileMenuContainer");
  const avatar = document.getElementById("profileAvatar");
  const dropdown = document.getElementById("profileDropdown");

  if (!container || !avatar || !dropdown) return;

  if (!shouldShowAuthButtons()) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");

  avatar.src =
    userData?.image ||
    userData?.logo ||
    user?.photoURL ||
    "assets/default-icon.png";

  if (!user) {
    dropdown.innerHTML = `
      <a href="login.html"
         class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
        Sign in
      </a>
    `;
    return;
  }

  const links = PROFILE_LINKS[role] || [];

  dropdown.innerHTML = `
    ${links.map(link => `
      <a href="${link.href}"
         class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
        ${link.label}
      </a>
    `).join("")}

    <hr class="my-2">

    <button id="dropdownLogoutBtn"
      class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
      Logout
    </button>
  `;

  document.getElementById("dropdownLogoutBtn")?.addEventListener("click", async () => {
    try {
      await auth.signOut();
      window.location.href = "index.html";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      window.location.href = "index.html";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  });
}
export function initNavbar() {
  setupLogout();
  setupProfileDropdown();
  setupNotificationDropdown();

  onAuthStateChanged(auth, async (user) => {
    const { role, userData } = await getUserData(user);

    renderLinks(role);
    renderProfileMenu(role, user, userData);

    if (user) {
      listenToNotifications(user.uid);
    }
  });
}
function setupNotificationDropdown() {
  const button = document.getElementById("notificationBtn");
  const dropdown = document.getElementById("notificationDropdown");

  if (!button || !dropdown) return;

  button.addEventListener("click", () => {
    dropdown.classList.toggle("hidden");

    document
      .getElementById("profileDropdown")
      ?.classList.add("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!button.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

function renderLinks(role) {
  const navLinks = document.getElementById("navLinks");
  if (!navLinks) return;

  const links = NAV_LINKS[role] || NAV_LINKS.guest;

  const currentPage = getCurrentPage();

  navLinks.innerHTML = links
    .map((link) => {
      const isActive = currentPage === link.href;

      return `
        <a
          href="${link.href}"
          class="
            relative px-1 py-2 transition
            ${
              isActive
                ? "text-indigo-600 font-semibold after:w-full"
                : "text-gray-700 hover:text-indigo-600 after:w-0"
            }
            after:absolute
            after:left-0
            after:-bottom-1
            after:h-0.5
            after:bg-indigo-600
            after:transition-all
            after:duration-300
            hover:after:w-full
          "
        >
          ${link.label}
        </a>
      `;
    })
    .join("");
}

function setupProfileDropdown() {
  const button = document.getElementById("profileMenuBtn");
  const dropdown = document.getElementById("profileDropdown");

  if (!button || !dropdown) return;

  button.addEventListener("click", () => {
    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!button.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.classList.add("hidden");
    }
  });
}
async function getUserData(user) {
  if (!user) return { role: "guest", userData: null };

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) return { role: "guest", userData: null };

    const userData = userSnap.data();

    return {
      role: userData.role || "guest",
      userData
    };
  } catch (error) {
    console.error("Error loading navbar role:", error);
    return { role: "guest", userData: null };
  }
}

let currentNotifications = [];
let firstNotificationLoad = true;

function listenToNotifications(userId) {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      /* istanbul ignore next */
      if (
        !firstNotificationLoad &&
        notifications.length > currentNotifications.length
      ) {
        const audio = new Audio("assets/notification.mp3");
        audio.play().catch(() => {});
      }

      firstNotificationLoad = false;
      currentNotifications = notifications;

      renderNotifications(notifications);
    },
    /* istanbul ignore next */
    (error) => {
      console.error("Notification listener error:", error);
    }
  );
}

function renderNotifications(notifications) {
  const dropdown = document.getElementById("notificationDropdown");
  const badge = document.getElementById("notificationBadge");

  if (!dropdown || !badge) return;

  const unread = notifications.filter((n) => !n.read);

  badge.textContent = unread.length;
  badge.classList.toggle("hidden", unread.length === 0);

  const avatar = document.getElementById("profileAvatar");

  if (unread.length > 0) {
    avatar?.classList.add("ring-2", "ring-red-500");
  } else {
    avatar?.classList.remove("ring-2", "ring-red-500");
  }

  if (!notifications.length) {
    dropdown.innerHTML = `
      <p class="p-4 text-sm text-gray-500">
        No notifications yet.
      </p>
    `;
    return;
  }

  dropdown.innerHTML = notifications.map((notification) => {
    const typeStyle = styles[notification.type] || "";

    return `
      <article class="
        p-4 border-b hover:bg-gray-50
        ${notification.read ? "" : "bg-indigo-50"}
        ${typeStyle}
      ">
        <h4 class="font-semibold text-sm">
          ${notification.title}
        </h4>

        <p class="text-sm text-gray-600 mt-1">
          ${notification.message}
        </p>

        <p class="text-xs text-gray-400 mt-2">
          ${formatTimestamp(notification.createdAt)}
        </p>
      </article>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", initNavbar);