/**
 * @jest-environment jsdom
 */

const { initRegisterUI } = require("../scripts/register.js");

global.lucide = {
  createIcons: jest.fn()
};

describe("role select UI logic", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="registerRole">
        <option value="customer">Customer</option>
        <option value="vendor">Vendor</option>
      </select>

      <div id="shop-name-container" class="hidden"></div>
      <div id="shop-location-container" class="hidden"></div>
      <div id="shop-logo-container" class="hidden"></div>

      <input id="shop-name" />
      <input id="shop-location" />
      <input id="logoInput" />
    `;

    initRegisterUI();
  });

  test("shows vendor fields when vendor selected", () => {
    const roleSelect = document.getElementById("registerRole");

    roleSelect.value = "vendor";
    roleSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(
      document
        .getElementById("shop-name-container")
        .classList.contains("hidden")
    ).toBe(false);
  });

  test("hides vendor fields for customer", () => {
    const roleSelect = document.getElementById("registerRole");

    roleSelect.value = "customer";
    roleSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(
      document
        .getElementById("shop-name-container")
        .classList.contains("hidden")
    ).toBe(true);
  });
  test("shows all vendor fields when vendor selected", () => {
  const roleSelect = document.getElementById("registerRole");

  roleSelect.value = "vendor";
  roleSelect.dispatchEvent(new Event("change", { bubbles: true }));

  expect(document.getElementById("shop-name-container").classList.contains("hidden")).toBe(false);
  expect(document.getElementById("shop-location-container").classList.contains("hidden")).toBe(false);
  expect(document.getElementById("shop-logo-container").classList.contains("hidden")).toBe(false);
});

test("switching back to customer hides all vendor fields", () => {
  const roleSelect = document.getElementById("registerRole");

  roleSelect.value = "vendor";
  roleSelect.dispatchEvent(new Event("change", { bubbles: true }));

  roleSelect.value = "customer";
  roleSelect.dispatchEvent(new Event("change", { bubbles: true }));

  expect(document.getElementById("shop-name-container").classList.contains("hidden")).toBe(true);
  expect(document.getElementById("shop-location-container").classList.contains("hidden")).toBe(true);
  expect(document.getElementById("shop-logo-container").classList.contains("hidden")).toBe(true);
});
test("vendor selection makes all vendor inputs required", () => {
  const roleSelect = document.getElementById("registerRole");

  roleSelect.value = "vendor";
  roleSelect.dispatchEvent(new Event("change", { bubbles: true }));

  expect(document.getElementById("shop-name").required).toBe(true);
  expect(document.getElementById("shop-location").required).toBe(true);
  expect(document.getElementById("logoInput").required).toBe(true);
});

test("switching back to customer clears vendor fields and removes required", () => {
  const roleSelect = document.getElementById("registerRole");
  const shopName = document.getElementById("shop-name");
  const location = document.getElementById("shop-location");
  const logo = document.getElementById("logoInput");

  roleSelect.value = "vendor";
  roleSelect.dispatchEvent(new Event("change", { bubbles: true }));

  shopName.value = "My Shop";
  location.value = "Block C";

  roleSelect.value = "customer";
  roleSelect.dispatchEvent(new Event("change", { bubbles: true }));

  expect(shopName.required).toBe(false);
  expect(location.required).toBe(false);
  expect(logo.required).toBe(false);

  expect(shopName.value).toBe("");
  expect(location.value).toBe("");
});
});