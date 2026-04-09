


// bringeing the update menu section
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".tab-btn");
  const tabContent = document.getElementById("tabContent");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");

      // show container
      tabContent.classList.remove("hidden");

      // hide all panels
      panels.forEach(p => p.classList.add("hidden"));

      // show selected panel
      document.getElementById(tab + "Tab").classList.remove("hidden");

      // scroll into view (optional but nice)
      tabContent.scrollIntoView({ behavior: "smooth" });
    });
  });
});


  const allergenBtn = document.getElementById("allergenBtn");
  const allergenmenu = document.getElementById("allergenMenu");
  const allergentext = document.getElementById("allergenText");
  const allergencheckboxes = allergenmenu.querySelectorAll(".allergen-option");

  // toggle dropdown
  allergenBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    allergenmenu.classList.toggle("hidden");
  });

 

  // update selected text
  allergencheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      const selected = Array.from(allergencheckboxes)
        .filter(c => c.checked)
        .map(c => c.value);

      allergentext.textContent = selected.length
        ? selected.join(", ")
        : "Select allergens";
    });
  });

    const dietbtn = document.getElementById("specialdietBtn");
  const dietmenu = document.getElementById("specialdiet");
  const diettext = document.getElementById("specialdietText");
  const dietcheckboxes = dietmenu.querySelectorAll(".specialdiet-option");

  // toggle dropdown
  dietbtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dietmenu.classList.toggle("hidden");
  });

 

  // update selected text
  dietcheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      const selected = Array.from(dietcheckboxes)
        .filter(c => c.checked)
        .map(c => c.value);

      diettext.textContent = selected.length
        ? selected.join(", ")
        : "Select dietary preferences";
    });
  });



 ;
