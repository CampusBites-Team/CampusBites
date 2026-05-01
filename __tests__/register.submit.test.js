/**
 * @jest-environment jsdom
 */

jest.mock("../scripts/database.js", () => ({
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
  getDownloadURL: jest.fn()
}));

global.lucide = { createIcons: jest.fn() };
global.alert = jest.fn();

import { initRegisterUI } from "../scripts/register.js";

import {
  createUserWithEmailAndPassword,
  setDoc,
  getDoc,
  signInWithPopup,
  uploadBytes,
  getDownloadURL
} from "../scripts/database.js";

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("register submit flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(console, "error").mockImplementation(() => {});

    global.FileReader = class {
      readAsDataURL() {
        this.result = "data:image/png;base64,fake";
        if (this.onload) {
          this.onload({ target: { result: this.result } });
        }
      }
    };

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

      <section id="shop-name-container" class="hidden"></section>
      <section id="shop-location-container" class="hidden"></section>
      <section id="shop-logo-container" class="hidden"></section>

      <button id="googleRegister" type="button"></button>
      <button id="facebookRegister" type="button"></button>
      <button id="twitterRegister" type="button"></button>
      <button id="microsoftRegister" type="button"></button>
      <button id="appleRegister" type="button"></button>
    `;

    initRegisterUI();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("customer registration creates user and saves approved profile", async () => {
    createUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: "u1" }
    });

    document.getElementById("registerRole").value = "customer";

    document.getElementById("registerForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(createUserWithEmailAndPassword).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalledWith(
      "docRef",
      expect.objectContaining({
        fullName: "Jane Doe",
        email: "jane@example.com",
        role: "customer",
        shopName: null,
        location: null,
        image: null,
        status: "approved"
      })
    );
  });

  test("vendor registration requires shop name", async () => {
    document.getElementById("registerRole").value = "vendor";

    document.getElementById("registerForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(alert).toHaveBeenCalledWith("Shop name required");
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  test("vendor registration requires shop location", async () => {
    document.getElementById("registerRole").value = "vendor";
    document.getElementById("shop-name").value = "Bites";

    document.getElementById("registerForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(alert).toHaveBeenCalledWith("Shop location required");
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  test("vendor registration requires shop logo", async () => {
    document.getElementById("registerRole").value = "vendor";
    document.getElementById("shop-name").value = "Bites";
    document.getElementById("shop-location").value = "Block A";

    document.getElementById("registerForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(alert).toHaveBeenCalledWith("Shop logo required");
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  test("createUser failure alerts error message", async () => {
    createUserWithEmailAndPassword.mockRejectedValue(
      new Error("Email already in use")
    );

    document.getElementById("registerRole").value = "customer";

    document.getElementById("registerForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(alert).toHaveBeenCalledWith("Email already in use");
  });

  test("invalid vendor logo file type is rejected on change", async () => {
    const logoInput = document.getElementById("logoInput");
    const badFile = new File(["fake"], "logo.gif", { type: "image/gif" });

    Object.defineProperty(logoInput, "files", {
      value: [badFile],
      configurable: true
    });

    logoInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(alert).toHaveBeenCalledWith(
      "Shop logo must be a PNG or JPEG image."
    );
  });

  test("valid vendor logo file type is accepted on change", async () => {
    const logoInput = document.getElementById("logoInput");
    const goodFile = new File(["fake"], "logo.png", { type: "image/png" });

    Object.defineProperty(logoInput, "files", {
      value: [goodFile],
      configurable: true
    });

    logoInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(alert).not.toHaveBeenCalledWith(
      "Shop logo must be a PNG or JPEG image."
    );
    expect(document.getElementById("logoPreview")).not.toBeNull();
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

    await flush();

    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  test("vendor registration uploads logo and saves pending profile", async () => {
    createUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: "vendor-1" }
    });

    uploadBytes.mockResolvedValue({});
    getDownloadURL.mockResolvedValue("https://example.com/logo.png");

    document.getElementById("registerRole").value = "vendor";
    document.getElementById("shop-name").value = "Campus Bites";
    document.getElementById("shop-location").value = "Matrix";

    const logoInput = document.getElementById("logoInput");
    const file = new File(["fake"], "logo.png", { type: "image/png" });

    Object.defineProperty(logoInput, "files", {
      value: [file],
      configurable: true
    });

    logoInput.dispatchEvent(new Event("change", { bubbles: true }));

    document.getElementById("registerForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(uploadBytes).toHaveBeenCalledWith("storageRef", file);
    expect(getDownloadURL).toHaveBeenCalledWith("storageRef");

    expect(setDoc).toHaveBeenCalledWith(
      "docRef",
      expect.objectContaining({
        fullName: "Jane Doe",
        email: "jane@example.com",
        role: "vendor",
        shopName: "Campus Bites",
        location: "Matrix",
        image: "https://example.com/logo.png",
        status: "pending"
      })
    );
  });

  test("social login sends new user to select role page", async () => {
    signInWithPopup.mockResolvedValue({
      user: { uid: "social-1" }
    });

    getDoc.mockResolvedValue({
      exists: () => false
    });

    document.getElementById("googleRegister").click();

    await flush();

    expect(signInWithPopup).toHaveBeenCalled();
    expect(sessionStorage.getItem("newUserUID")).toBe("social-1");
  });

  test("social login alerts suspended vendor", async () => {
    signInWithPopup.mockResolvedValue({
      user: { uid: "vendor-1" }
    });

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "suspended"
      })
    });

    document.getElementById("googleRegister").click();

    await flush();

    expect(alert).toHaveBeenCalledWith("Your account is suspended");
  });
});