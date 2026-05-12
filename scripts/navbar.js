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
    { label: "Browse", href: "browse.html" },
    { label: "Orders", href: "orders.html" },
    { label: "Profile", href: "customer-profile.html" },
    { label: "For You", href: "recommendations.html" },
    { label: "Dashboard", href: "customer-dashboard.html" }


  ],
  vendor: [
    { label: "Home", href: "index.html" },
    { label: "Browse", href: "browse.html" },
    { label: "Dashboard", href: "vendor-dashboard.html" },
    { label: "Menu", href: "menu-management.html" },
    { label: "Orders", href: "orders.html" },
    { label: "Analytics", href: "vendor-analytics.html" },
    { label: "Store Settings", href: "vendor-settings.html" }
  ],
  admin: [
    { label: "Home", href: "index.html" },
    { label: "Browse", href: "browse.html" },
    { label: "Dashboard", href: "admin-dashboard.html" },
    { label: "Vendors", href: "vendor-management.html" },
    { label: "Menu Management", href: "admin-menuManagement.html" },
    { label: "Analytics", href: "admin-analytics.html" },
    { label: "Pay Outs", href: "admin-payouts.html" }

  ]
};

const AUTH_BUTTON_PAGES = [
  "index.html",
  "browse.html",
  "customer-dashboard.html",
  "vendor-dashboard.html",
  "admin-dashboard.html"
];

function getCurrentPage() {
  const path = window.location.pathname;
  return path.substring(path.lastIndexOf("/") + 1) || "index.html";
}

function shouldShowAuthButtons() {
  return AUTH_BUTTON_PAGES.includes(getCurrentPage());
}

function renderLinks(role) {
  const navLinks = document.getElementById("navLinks");
  if (!navLinks) return;

  const links = NAV_LINKS[role] || NAV_LINKS.guest;

  navLinks.innerHTML = links
    .map(
      (link) => `
        <a href="${link.href}" class="text-gray-700 hover:text-indigo-600">
          ${link.label}
        </a>
      `
    )
    .join("");
}

function renderAuthButtons(user) {
  const loginLink = document.getElementById("loginLink");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!loginLink && !logoutBtn) return;

  const showAuth = shouldShowAuthButtons();

  if (!showAuth) {
    loginLink?.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
    return;
  }

  if (user) {
    loginLink?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");
  } else {
    loginLink?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");
  }
}

async function getUserRole(user) {
  if (!user) return "guest";

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) return "guest";

    return userSnap.data().role || "guest";
  } catch (error) {
    console.error("Error loading navbar role:", error);
    return "guest";
  }
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

  onAuthStateChanged(auth, async (user) => {
    const role = await getUserRole(user);

    renderLinks(role);
    renderAuthButtons(user);
  });
}

document.addEventListener("DOMContentLoaded", initNavbar);