jest.mock("../scripts/database.js", () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue("mock-token") } },
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

      <form id="bankingDetailsForm">
        <input id="settings-bank-name" />
        <input id="settings-account-holder" />
        <input id="settings-account-number" />
        <input id="settings-branch-code" />
        <input id="settings-account-type" />
        <p id="savedBankingDetails"></p>
        <button type="submit">Save Banking</button>
      </form>
    `;

    global.alert = jest.fn();
    global.fetch = jest.fn();
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

  test("displays saved banking details on load", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        bankDetails: {
          bankName: "fnb",
          accountHolder: "Bob Smith",
          accountNumber: "12345678",
          branchCode: "250655",
          accountType: "cheque"
        }
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById("settings-bank-name").value).toBe("fnb");
    expect(document.getElementById("settings-account-holder").value).toBe("Bob Smith");
    expect(document.getElementById("settings-account-number").value).toBe("12345678");
    expect(document.getElementById("settings-branch-code").value).toBe("250655");
    expect(document.getElementById("settings-account-type").value).toBe("cheque");
    expect(document.getElementById("savedBankingDetails").textContent).toBe("FNB • ••••5678");
  });

  test("shows placeholder when no banking details are set", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "vendor", status: "approved" })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById("savedBankingDetails").textContent).toBe("No banking details set yet.");
  });

  test("saves banking details successfully", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "vendor", status: "approved" })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    global.fetch.mockResolvedValue({ ok: true });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    document.getElementById("settings-bank-name").value = "absa";
    document.getElementById("settings-account-holder").value = "Jane Doe";
    document.getElementById("settings-account-number").value = "123456789";
    document.getElementById("settings-branch-code").value = "632005";
    document.getElementById("settings-account-type").value = "savings";

    document.getElementById("bankingDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/paystack/update-bank-details",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          bankDetails: {
            bankName: "absa",
            accountHolder: "Jane Doe",
            accountNumber: "123456789",
            branchCode: "632005",
            accountType: "savings"
          }
        })
      })
    );

    expect(global.alert).toHaveBeenCalledWith("Banking details updated successfully.");
  });

  test("validates banking details fields", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "vendor", status: "approved" })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    const submit = () =>
      document.getElementById("bankingDetailsForm").dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );

    document.getElementById("settings-bank-name").value = "";
    submit();
    expect(global.alert).toHaveBeenCalledWith("Please select a bank.");

    document.getElementById("settings-bank-name").value = "fnb";
    document.getElementById("settings-account-holder").value = "";
    submit();
    expect(global.alert).toHaveBeenCalledWith("Please enter the account holder name.");

    document.getElementById("settings-account-holder").value = "Jane";
    document.getElementById("settings-account-number").value = "123";
    submit();
    expect(global.alert).toHaveBeenCalledWith("Account number must be 6 to 12 digits.");

    document.getElementById("settings-account-number").value = "123456";
    document.getElementById("settings-branch-code").value = "123";
    submit();
    expect(global.alert).toHaveBeenCalledWith("Branch code must be exactly 6 digits.");

    document.getElementById("settings-branch-code").value = "632005";
    document.getElementById("settings-account-type").value = "";
    submit();
    expect(global.alert).toHaveBeenCalledWith("Please select an account type.");
  });

  test("handles API error when saving banking details", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "vendor", status: "approved" })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    global.fetch.mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: "Bank validation failed" })
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    document.getElementById("settings-bank-name").value = "absa";
    document.getElementById("settings-account-holder").value = "Jane Doe";
    document.getElementById("settings-account-number").value = "123456789";
    document.getElementById("settings-branch-code").value = "632005";
    document.getElementById("settings-account-type").value = "savings";

    document.getElementById("bankingDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(global.alert).toHaveBeenCalledWith(
      "Could not update banking details: Bank validation failed"
    );
  });
});
