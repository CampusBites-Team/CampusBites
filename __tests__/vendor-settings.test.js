jest.mock("../scripts/database.js", () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue("mock-token") } },
  db: {},
  storage: {},
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  onAuthStateChanged: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn()
}));

Object.defineProperty(document, "readyState", {
  value: "loading",
  configurable: true
});

const {
  doc,
  getDoc,
  updateDoc,
  onAuthStateChanged,
  ref,
  uploadBytes,
  getDownloadURL
} = require("../scripts/database.js");

const { initVendorSettings } = require("../scripts/vendor-settings.js");

describe("vendor-settings.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <section id="storeLogoFallback" class=""></section>
      <img id="storeLogoPreview" class="hidden" />

      <form id="vendorDetailsForm">
        <input id="storeLogoInput" type="file" />
        <input id="shopName" />
        <input id="storeSlogan" />
        <input id="storePhone" />
        <select id="storeCategory">
          <option value="">Select a category</option>
          <option value="Fast Food">Fast Food</option>
          <option value="Café">Café</option>
          <option value="Bakery">Bakery</option>
          <option value="Healthy">Healthy</option>
          <option value="Beverages">Beverages</option>
          <option value="Desserts">Desserts</option>
          <option value="Traditional Food">Traditional Food</option>
          <option value="Snacks">Snacks</option>
          <option value="Other">Other</option>
        </select>
        <input id="location" />
        <p id="savedVendorDetails"></p>
        <button type="submit">Save Details</button>
      </form>

      <form id="operatingHoursForm">
        <input id="weekdayOpeningTime" />
        <input id="weekdayClosingTime" />
        <input id="weekendOpeningTime" />
        <input id="weekendClosingTime" />
        <p id="savedOperatingHours"></p>
        <button type="submit">Save Hours</button>
      </form>

      <form id="bankingDetailsForm">
        <select id="settings-bank-name">
          <option value="">Select your bank</option>
          <option value="absa">ABSA</option>
          <option value="fnb">FNB</option>
        </select>
        <input id="settings-account-holder" />
        <input id="settings-account-number" />
        <input id="settings-branch-code" />
        <select id="settings-account-type">
          <option value="">Select account type</option>
          <option value="cheque">Cheque / Current</option>
          <option value="savings">Savings</option>
        </select>
        <p id="savedBankingDetails"></p>
        <button type="submit">Save Banking</button>
      </form>
    `;

    global.alert = jest.fn();
    global.fetch = jest.fn();
  });

  test("loads vendor details, logo, category, contact details and operating hours", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "BobThePlug",
        location: "Matrix Ground Floor",
        image: "store-logo-url",
        storeSlogan: "Fresh food fast",
        storePhone: "0712345678",
        storeCategory: "Fast Food",
        weekdayOpeningTime: "08:00",
        weekdayClosingTime: "17:00",
        weekendOpeningTime: "09:00",
        weekendClosingTime: "14:00"
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
    expect(document.getElementById("storeSlogan").value).toBe("Fresh food fast");
    expect(document.getElementById("storePhone").value).toBe("0712345678");
    expect(document.getElementById("storeCategory").value).toBe("Fast Food");

    expect(document.getElementById("weekdayOpeningTime").value).toBe("08:00");
    expect(document.getElementById("weekdayClosingTime").value).toBe("17:00");
    expect(document.getElementById("weekendOpeningTime").value).toBe("09:00");
    expect(document.getElementById("weekendClosingTime").value).toBe("14:00");

    expect(document.getElementById("storeLogoPreview").src).toContain("store-logo-url");
    expect(document.getElementById("storeLogoPreview").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("storeLogoFallback").classList.contains("hidden")).toBe(true);

    expect(document.getElementById("savedVendorDetails").textContent)
      .toBe("BobThePlug • Matrix Ground Floor • Fast Food • 0712345678");

    expect(document.getElementById("savedOperatingHours").textContent)
      .toBe("Weekdays: 08:00 - 17:00 | Weekends: 09:00 - 14:00");
  });

  test("saves updated vendor details without changing logo", async () => {
    doc.mockReturnValue({});
    updateDoc.mockResolvedValue();

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "Old Shop",
        location: "Old Location",
        image: "old-logo-url"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    document.getElementById("shopName").value = "New Shop";
    document.getElementById("storeSlogan").value = "Best meals on campus";
    document.getElementById("storePhone").value = "0798765432";
    document.getElementById("storeCategory").value = "Café";
    document.getElementById("location").value = "Matrix Ground Floor";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      shopName: "New Shop",
      location: "Matrix Ground Floor",
      storeSlogan: "Best meals on campus",
      storePhone: "0798765432",
      storeCategory: "Café"
    });

    expect(updateDoc).toHaveBeenCalled();
  });

  test("uploads valid store logo and saves new logo URL", async () => {
    doc.mockReturnValue({});
    ref.mockReturnValue("storage-ref");
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue("new-logo-url");
    updateDoc.mockResolvedValue();

    global.FileReader = class {
      readAsDataURL() {
        this.result = "data:image/png;base64,test";
        this.onload();
      }
    };

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "Old Shop",
        location: "Old Location",
        image: null
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    const logoInput = document.getElementById("storeLogoInput");
    const validFile = new File(["image"], "logo.png", { type: "image/png" });

    Object.defineProperty(logoInput, "files", {
      value: [validFile]
    });

    logoInput.dispatchEvent(new Event("change"));

    document.getElementById("shopName").value = "Logo Shop";
    document.getElementById("location").value = "Matrix";
    document.getElementById("storeSlogan").value = "Fresh daily";
    document.getElementById("storePhone").value = "0711111111";
    document.getElementById("storeCategory").value = "Fast Food";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(ref).toHaveBeenCalledWith(
      expect.anything(),
      "vendor_logos/vendor-123/store-logo"
    );

    expect(uploadBytes).toHaveBeenCalledWith("storage-ref", validFile);
    expect(getDownloadURL).toHaveBeenCalledWith("storage-ref");

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      shopName: "Logo Shop",
      location: "Matrix",
      storeSlogan: "Fresh daily",
      storePhone: "0711111111",
      storeCategory: "Fast Food"
    });

expect(updateDoc).toHaveBeenCalled();  });

  test("rejects invalid store logo type", async () => {
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

    const logoInput = document.getElementById("storeLogoInput");
    const invalidFile = new File(["hello"], "notes.txt", { type: "text/plain" });

    Object.defineProperty(logoInput, "files", {
      value: [invalidFile]
    });

    logoInput.dispatchEvent(new Event("change"));

    expect(global.alert).toHaveBeenCalledWith("Store logo must be a PNG or JPG/JPEG image.");
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

  test("saves updated weekday and weekend operating hours", async () => {
    doc.mockReturnValue({});
    updateDoc.mockResolvedValue();

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        weekdayOpeningTime: "08:00",
        weekdayClosingTime: "16:00",
        weekendOpeningTime: "09:00",
        weekendClosingTime: "13:00"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    document.getElementById("weekdayOpeningTime").value = "07:00";
    document.getElementById("weekdayClosingTime").value = "17:00";
    document.getElementById("weekendOpeningTime").value = "09:00";
    document.getElementById("weekendClosingTime").value = "14:00";

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      weekdayOpeningTime: "07:00",
      weekdayClosingTime: "17:00",
      weekendOpeningTime: "09:00",
      weekendClosingTime: "14:00",
      openingTime: "07:00",
      closingTime: "17:00"
    });

    expect(global.alert).toHaveBeenCalledWith("Operating hours updated successfully.");
  });

  test("validates weekday and weekend operating hours", async () => {
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

    document.getElementById("weekdayOpeningTime").value = "";
    document.getElementById("weekdayClosingTime").value = "17:00";

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(global.alert).toHaveBeenCalledWith("Please enter both weekday opening and closing times.");

    document.getElementById("weekdayOpeningTime").value = "18:00";
    document.getElementById("weekdayClosingTime").value = "17:00";

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(global.alert).toHaveBeenCalledWith("weekday closing time must be after opening time.");

    document.getElementById("weekdayOpeningTime").value = "08:00";
    document.getElementById("weekdayClosingTime").value = "17:00";
    document.getElementById("weekendOpeningTime").value = "18:00";
    document.getElementById("weekendClosingTime").value = "14:00";

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(global.alert).toHaveBeenCalledWith("weekend closing time must be after opening time.");
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
test("validates missing opening and closing times", async () => {
  const mod = await import("../scripts/vendor-settings.js");

  expect(mod.validateTimePair("", "17:00", "Weekday")).toBe(false);
  expect(mod.validateTimePair("08:00", "", "Weekday")).toBe(false);
});

test("validateTimePair returns true when both times are empty", async () => {
  const mod = await import("../scripts/vendor-settings.js");

  expect(
    mod.validateTimePair("", "", "weekday")
  ).toBe(true);
});

});