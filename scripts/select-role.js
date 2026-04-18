import { auth, db, doc, setDoc } from "./database.js";

let navigate = (page) => window.location.assign(page);
export function setNavigate(fn) { navigate = fn; }

document.getElementById("customer").onclick = () => saveRole("customer");
document.getElementById("vendor").onclick = () => saveRole("vendor");

export async function saveRole(role) {
  const user = auth.currentUser;
  await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    role: role
  });
  navigate(role === "customer" ? 'customer-dashboard.html' : 'vendor-dashboard.html');
}