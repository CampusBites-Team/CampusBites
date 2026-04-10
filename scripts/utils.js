export function redirectUser(role) {
  if (role === "customer") return "customer-dashboard.html";
  if (role === "vendor") return "vendor-dashboard.html";
  if (role === "admin") return "admin-dashboard.html";
  return null;
}
// Filter items that are available
export function filterAvailableItems(items) {
  return items.filter(item => item.available === true);
}

// Toggle availability status of an item
export function toggleItemAvailability(item) {
  return {
    ...item,
    available: !item.available
  };
}

// Format price with Rand currency symbol
export function formatPrice(price) {
  return `R${parseFloat(price).toFixed(2)}`;
}
