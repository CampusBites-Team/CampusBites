/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  storage: {},
  createUserWithEmailAndPassword: jest.fn(),
  doc: jest.fn(() => "docRef"),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(() => ({ provider: "google" })),
  FacebookAuthProvider: jest.fn(() => ({ provider: "facebook" })),
  TwitterAuthProvider: jest.fn(() => ({ provider: "twitter" })),
  OAuthProvider: jest.fn((name) => ({ provider: name })),
  serverTimestamp: jest.fn(() => "timestamp"),
  ref: jest.fn(() => "storageRef"),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

global.lucide = { createIcons: jest.fn() };
global.alert = jest.fn();

import { initRegisterUI } from "../scripts/register.js";
import {
  createUserWithEmailAndPassword,
  setDoc,
} from "../scripts/database.js";

describe("register submit flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <form id="registerForm"></form>
      <input id="registerName" value="Jane Doe" />
      <input id="registerEmail" value="jane@example.com" />
      <input id="registerPassword" value="secret123" />
      <select id="registerRole">
        <option value="customer">Customer</option>
        <option value="vendor">Vendor</option>
      </select>

      <input id="shop-name" value="" />
      <input id="shop-location" value="" />
      <input id="logoInput" type="file" />

      <div id="shop-name-container" class="hidden"></div>
      <div id="shop-location-container" class="hidden"></div>
      <div id="shop-logo-container" class="hidden"></div>

      <button id="googleRegister"></button>
      <button id="facebookRegister"></button>
      <button id="twitterRegister"></button>
      <button id="microsoftRegister"></button>
      <button id="appleRegister"></button>
    `;

    initRegisterUI();
  });

  test("customer registration creates user and saves approved profile", async () => {
    createUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: "u1" }
    });

    document.getElementById("registerRole").value = "customer";

    document.getElementById("registerForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(createUserWithEmailAndPassword).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalled();
  });

  test("vendor registration requires shop name", async () => {
    document.getElementById("registerRole").value = "vendor";

    document.getElementById("registerForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();

    expect(alert).toHaveBeenCalledWith("Shop name required");
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  test("vendor registration requires shop location", async () => {
    document.getElementById("registerRole").value = "vendor";
    document.getElementById("shop-name").value = "Bites";

    document.getElementById("registerForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();

    expect(alert).toHaveBeenCalledWith("Shop location required");
  });

  test("createUser failure alerts error message", async () => {
    createUserWithEmailAndPassword.mockRejectedValue(new Error("Email already in use"));

    document.getElementById("registerRole").value = "customer";

    document.getElementById("registerForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(alert).toHaveBeenCalledWith("Email already in use");
  });
  test("vendor registration requires shop logo", async () => {
  document.getElementById("registerRole").value = "vendor";
  document.getElementById("shop-name").value = "Bites";
  document.getElementById("shop-location").value = "Block A";

  document.getElementById("registerForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  await Promise.resolve();

  expect(alert).toHaveBeenCalledWith("Shop logo required");
  expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
});

test("invalid vendor logo file type is rejected on change", async () => {
  const logoInput = document.getElementById("logoInput");

  const badFile = new File(["fake"], "logo.gif", { type: "image/gif" });

  Object.defineProperty(logoInput, "files", {
    value: [badFile],
    configurable: true
  });

  logoInput.dispatchEvent(new Event("change", { bubbles: true }));

  expect(alert).toHaveBeenCalledWith("Shop logo must be a PNG or JPEG image.");
});

test("valid vendor logo file type is accepted on change", async () => {
  const logoInput = document.getElementById("logoInput");

  const goodFile = new File(["fake"], "logo.png", { type: "image/png" });

  Object.defineProperty(logoInput, "files", {
    value: [goodFile],
    configurable: true
  });

  logoInput.dispatchEvent(new Event("change", { bubbles: true }));

  expect(alert).not.toHaveBeenCalledWith("Shop logo must be a PNG or JPEG image.");
});

test("vendor registration rejects invalid selected logo on submit", async () => {
  document.getElementById("registerRole").value = "vendor";
  document.getElementById("shop-name").value = "Bites";
  document.getElementById("shop-location").value = "Block A";

  const logoInput = document.getElementById("logoInput");
  const badFile = new File(["fake"], "logo.gif", { type: "image/gif" });

  Object.defineProperty(logoInput, "files", {
    value: [badFile],
    configurable: true
  });

  logoInput.dispatchEvent(new Event("change", { bubbles: true }));

  document.getElementById("registerForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  await Promise.resolve();

  expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
});
});