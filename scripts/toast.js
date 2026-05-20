export function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");

  if (!container) {
    container = document.createElement("section");
    container.id = "toast-container";
    container.className =
      "fixed top-5 right-5 z-50 flex flex-col gap-3";
    document.body.appendChild(container);
  }

  const styles = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-yellow-500",
    info: "bg-indigo-600"
  };

  const toast = document.createElement("section");
  toast.className = `
    ${styles[type] || styles.info}
    text-white px-4 py-3 rounded-lg shadow-lg text-sm
    transition-all duration-300 opacity-0 translate-x-4
  `;

  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("opacity-0", "translate-x-4");
  });

  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-x-4");

    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}