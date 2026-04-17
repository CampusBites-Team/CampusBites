/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  sessionStorage.clear();
});

jest.mock('../scripts/database.js', () => ({
  auth: {},
  db: {},
  signInWithEmailAndPassword: jest.fn(),
  doc: jest.fn(() => "userDocRef"),
  getDoc: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(() => ({ provider: "google" })),
  FacebookAuthProvider: jest.fn(() => ({ provider: "facebook" })),
  TwitterAuthProvider: jest.fn(() => ({ provider: "twitter" })),
  OAuthProvider: jest.fn((name) => ({ provider: name })),
}));

import {
  initLoginForm,
  initSocialLogins,
  initLoginPage,
} from '../scripts/login.js';

import {
  signInWithEmailAndPassword,
  getDoc,
  signInWithPopup,
} from '../scripts/database.js';

global.alert = jest.fn();
global.lucide = { createIcons: jest.fn() };

describe("login form flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <form id="loginForm"></form>
      <input id="loginEmail" value="user@example.com" />
      <input id="loginPassword" value="secret123" />

      <button id="googleLogin"></button>
      <button id="facebookLogin"></button>
      <button id="twitterLogin"></button>
      <button id="microsoftLogin"></button>
      <button id="appleLogin"></button>
    `;
  });

  test("initLoginForm does nothing if form is missing", () => {
    document.body.innerHTML = `<div>No form</div>`;
    expect(() => initLoginForm()).not.toThrow();
  });

  test("successful email login processes customer user", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "u1" }
    });

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "customer" })
    });

    initLoginForm();

    document.getElementById("loginForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "user@example.com",
      "secret123"
    );
    expect(getDoc).toHaveBeenCalled();
  });

  test("alerts when user profile is missing after email login", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "u1" }
    });

    getDoc.mockResolvedValue({
      exists: () => false
    });

    initLoginForm();

    document.getElementById("loginForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(alert).toHaveBeenCalledWith("User profile not found.");
  });

  test("alerts on login failure", async () => {
    signInWithEmailAndPassword.mockRejectedValue(new Error("Invalid credentials"));

    initLoginForm();

    document.getElementById("loginForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(alert).toHaveBeenCalledWith("Invalid credentials");
  });
});

describe("social login flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <button id="googleLogin"></button>
      <button id="facebookLogin"></button>
      <button id="twitterLogin"></button>
      <button id="microsoftLogin"></button>
      <button id="appleLogin"></button>
    `;
  });

  test("google social login processes existing admin", async () => {
    signInWithPopup.mockResolvedValue({
      user: { uid: "social1" }
    });

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "admin" })
    });

    initSocialLogins();
    document.getElementById("googleLogin").click();

    await Promise.resolve();
    await Promise.resolve();

    expect(signInWithPopup).toHaveBeenCalled();
    expect(getDoc).toHaveBeenCalled();
  });

  test("new social user goes to select-role page", async () => {
    signInWithPopup.mockResolvedValue({
      user: { uid: "new-social-user" }
    });

    getDoc.mockResolvedValue({
      exists: () => false
    });

    initSocialLogins();
    document.getElementById("googleLogin").click();

    await Promise.resolve();
    await Promise.resolve();

    expect(sessionStorage.getItem("newUserUID")).toBe("new-social-user");
  });

  test("social login failure alerts with provider-specific message", async () => {
    signInWithPopup.mockRejectedValue(new Error("Popup blocked"));

    initSocialLogins();
    document.getElementById("facebookLogin").click();

    await Promise.resolve();

    expect(alert).toHaveBeenCalledWith("facebookLogin sign-in failed: Popup blocked");
  });

  test("initLoginPage initializes everything and creates icons", () => {
    document.body.innerHTML = `
      <form id="loginForm"></form>
      <input id="loginEmail" value="" />
      <input id="loginPassword" value="" />
      <button id="googleLogin"></button>
      <button id="facebookLogin"></button>
      <button id="twitterLogin"></button>
      <button id="microsoftLogin"></button>
      <button id="appleLogin"></button>
    `;

    initLoginPage();
    expect(global.lucide.createIcons).toHaveBeenCalled();
  });
});