import { auth, db, doc, setDoc } from "./database.js";

document.getElementById("customer").onclick = () => saveRole("customer");
document.getElementById("vendor").onclick = () => saveRole("vendor");

async function saveRole(role) {
  const user = auth.currentUser;

  await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    role: role
  });

  if (role === "customer")
    window.location.href = "customer-dashboard.html";
  else
    window.location.href = "vendor-dashboard.html";
}