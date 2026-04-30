jest.mock("../scripts/database.js", () => ({
  auth: {},
  db: {},
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  onAuthStateChanged: jest.fn()
}));

Object.defineProperty(document, "readyState", {
  value: "loading",
  configurable: true
});

const {
  doc,
  getDoc,
  updateDoc,
  onAuthStateChanged
} = require("../scripts/database.js");

const { initVendorSettings } = require("../scripts/vendor-settings.js");

describe("vendor-settings.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <form id="vendorDetailsForm">
        <input id="shopName" />
        <input id="location" />
        <p id="savedVendorDetails"></p>
        <button type="submit">Save Details</button>
      </form>

      <form id="operatingHoursForm">
        <input id="openingTime" />
        <input id="closingTime" />
        <p id="savedOperatingHours"></p>
        <button type="submit">Save Hours</button>
      </form>
    `;

    global.alert = jest.fn();
  });

  test("loads vendor details and operating hours", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "BobThePlug",
        location: "Matrix Ground Floor",
        openingTime: "08:00",
        closingTime: "17:00"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById("shopName").value).toBe("BobThePlug");
    expect(document.getElementById("location").value).toBe("Matrix Ground Floor");
    expect(document.getElementById("openingTime").value).toBe("08:00");
    expect(document.getElementById("closingTime").value).toBe("17:00");

    expect(document.getElementById("savedVendorDetails").textContent)
      .toBe("BobThePlug • Matrix Ground Floor");

    expect(document.getElementById("savedOperatingHours").textContent)
      .toBe("08:00 - 17:00");
  });

  test("saves updated vendor details", async () => {
    doc.mockReturnValue({});
    updateDoc.mockResolvedValue();

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "Old Shop",
        location: "Old Location"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    document.getElementById("shopName").value = "New Shop";
    document.getElementById("location").value = "Matrix Ground Floor";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      shopName: "New Shop",
      location: "Matrix Ground Floor"
    });

    expect(global.alert).toHaveBeenCalledWith("Vendor details updated successfully.");
  });

  test("requires shop name and location", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    document.getElementById("shopName").value = "";
    document.getElementById("location").value = "Matrix";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(global.alert).toHaveBeenCalledWith("Please enter your shop name.");

    document.getElementById("shopName").value = "Shop";
    document.getElementById("location").value = "";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(global.alert).toHaveBeenCalledWith("Please enter your shop location.");
  });

  test("saves updated operating hours", async () => {
    doc.mockReturnValue({});
    updateDoc.mockResolvedValue();

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        openingTime: "08:00",
        closingTime: "16:00"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    document.getElementById("openingTime").value = "07:00";
    document.getElementById("closingTime").value = "17:00";

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      openingTime: "07:00",
      closingTime: "17:00"
    });

    expect(global.alert).toHaveBeenCalledWith("Operating hours updated successfully.");
  });

  test("validates operating hours", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    document.getElementById("openingTime").value = "";
    document.getElementById("closingTime").value = "17:00";

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(global.alert).toHaveBeenCalledWith("Please enter both opening and closing times.");

    document.getElementById("openingTime").value = "18:00";
    document.getElementById("closingTime").value = "17:00";

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(global.alert).toHaveBeenCalledWith("Closing time must be after opening time.");
  });

  test("redirects when user is not logged in", () => {
    const mockLocation = { href: "" };

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback(null);
    });

    initVendorSettings(mockLocation);

    expect(mockLocation.href).toBe("login.html");
  });

  test("redirects when user document does not exist", async () => {
    const mockLocation = { href: "" };

    getDoc.mockResolvedValue({
      exists: () => false
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings(mockLocation);

    await Promise.resolve();
    await Promise.resolve();

    expect(mockLocation.href).toBe("login.html");
  });

  test("redirects non-vendor users", async () => {
    const mockLocation = { href: "" };

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "customer",
        status: "approved"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "customer-123" });
    });

    initVendorSettings(mockLocation);

    await Promise.resolve();
    await Promise.resolve();

    expect(mockLocation.href).toBe("index.html");
  });

  test("redirects pending and suspended vendors", async () => {
    const pendingLocation = { href: "" };

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "pending"
      })
    });

    onAuthStateChanged.mockImplementationOnce((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings(pendingLocation);

    await Promise.resolve();
    await Promise.resolve();

    expect(pendingLocation.href).toBe("pending-approval.html");

    const suspendedLocation = { href: "" };

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "suspended"
      })
    });

    onAuthStateChanged.mockImplementationOnce((authArg, callback) => {
      callback({ uid: "vendor-456" });
    });

    initVendorSettings(suspendedLocation);

    await Promise.resolve();
    await Promise.resolve();

    expect(global.alert).toHaveBeenCalledWith("Your account is suspended");
    expect(suspendedLocation.href).toBe("login.html");
  });
});