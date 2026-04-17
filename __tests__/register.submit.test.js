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
});