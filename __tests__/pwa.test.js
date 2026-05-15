/**
 * @jest-environment jsdom
 */

describe("pwa.js", () => {
  let registerMock;

  beforeEach(() => {
    jest.resetModules();

    registerMock = jest.fn().mockResolvedValue({});

    Object.defineProperty(global.navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: registerMock
      }
    });

    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();

    delete global.navigator.serviceWorker;
  });

  test("registers service worker on window load", async () => {
    await import("../scripts/pwa.js");

    window.dispatchEvent(new Event("load"));

    await Promise.resolve();

    expect(registerMock).toHaveBeenCalledWith("./service-worker.js");
    expect(console.log).toHaveBeenCalledWith("Service worker registered");
  });

  test("handles service worker registration failure", async () => {
    registerMock.mockRejectedValueOnce(new Error("failed"));

    await import("../scripts/pwa.js");

    window.dispatchEvent(new Event("load"));

    await Promise.resolve();
    await Promise.resolve();

    expect(console.error).toHaveBeenCalledWith(
      "Service worker registration failed:",
      expect.any(Error)
    );
  });
});