export function redirectUser(role) {
  if (role === "customer") return "customer-dashboard.html";
  if (role === "vendor") return "vendor-dashboard.html";
  if (role === "admin") return "admin-dashboard.html";
  return null;
}
