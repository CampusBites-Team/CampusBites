import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged
} from "./database.js";

const NAV_LINKS = {
  guest: [
    { label: "Home", href: "index.html" },
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
  ],
  vendor: [
    { label: "Home", href: "index.html" },
    { label: "Menu", href: "menu-management.html" },
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
  "vendor-profile.html"

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

  onAuthStateChanged(auth, async (user) => {
    const { role, userData } = await getUserData(user);

    renderLinks(role);
    renderProfileMenu(role, user, userData);
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

document.addEventListener("DOMContentLoaded", initNavbar);