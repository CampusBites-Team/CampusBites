// __tests__/toast.test.js
/**
 * @jest-environment jsdom
 */

import { showToast } from "../scripts/toast.js";

describe("toast.js", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.useFakeTimers();

    global.requestAnimationFrame = (callback) => callback();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("creates toast container when it does not exist", () => {
    showToast("Hello world");

    const container = document.getElementById("toast-container");

    expect(container).not.toBeNull();
    expect(container.tagName.toLowerCase()).toBe("section");
    expect(container.className).toContain("fixed");
  });

  test("adds info toast by default", () => {
    showToast("Info message");

    const toast = document.querySelector("#toast-container section");

    expect(toast.textContent).toBe("Info message");
    expect(toast.className).toContain("bg-indigo-600");
  });

  test("adds success toast", () => {
    showToast("Saved successfully", "success");

    const toast = document.querySelector("#toast-container section");

    expect(toast.textContent).toBe("Saved successfully");
    expect(toast.className).toContain("bg-green-600");
  });

  test("adds error toast", () => {
    showToast("Something went wrong", "error");

    const toast = document.querySelector("#toast-container section");

    expect(toast.className).toContain("bg-red-600");
  });

  test("adds warning toast", () => {
    showToast("Check this", "warning");

    const toast = document.querySelector("#toast-container section");

    expect(toast.className).toContain("bg-yellow-500");
  });

  test("falls back to info style for unknown type", () => {
    showToast("Unknown type", "random");

    const toast = document.querySelector("#toast-container section");

    expect(toast.className).toContain("bg-indigo-600");
  });

  test("removes hidden animation classes after animation frame", () => {
    showToast("Animated");

    const toast = document.querySelector("#toast-container section");

    expect(toast.classList.contains("opacity-0")).toBe(false);
    expect(toast.classList.contains("translate-x-4")).toBe(false);
  });

  test("removes toast after timeout", () => {
    showToast("Temporary");

    const toast = document.querySelector("#toast-container section");

    jest.advanceTimersByTime(3000);

    expect(toast.classList.contains("opacity-0")).toBe(true);
    expect(toast.classList.contains("translate-x-4")).toBe(true);

    jest.advanceTimersByTime(300);

    expect(document.querySelector("#toast-container section")).toBeNull();
  });

  test("uses existing toast container if present", () => {
    const existingContainer = document.createElement("section");
    existingContainer.id = "toast-container";
    document.body.appendChild(existingContainer);

    showToast("Existing container");

    expect(document.querySelectorAll("#toast-container").length).toBe(1);
    expect(existingContainer.textContent).toContain("Existing container");
  });
});