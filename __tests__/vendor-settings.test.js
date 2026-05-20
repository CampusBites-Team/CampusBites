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

jest.mock("../scripts/account-deletion.js", () => ({
  requestAccountDeletion: jest.fn()
}));

const {
  requestAccountDeletion
} = require("../scripts/account-deletion.js");

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

      <button id="deleteAccountBtn" type="button">Delete Account</button>

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

        <section id="customCategorySection" class="hidden">
          <input id="customCategory" />
        </section>

        <input id="location" />
        <p id="savedVendorDetails"></p>
        <button type="submit">Save Details</button>
      </form>

      <form id="operatingHoursForm">
        <input type="checkbox" id="closedWeekends" />
        <section id="weekendHoursContainer"></section>

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
        weekendClosingTime: "14:00",
        closedWeekends: false
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
    expect(document.getElementById("closedWeekends").checked).toBe(false);
    expect(document.getElementById("weekendHoursContainer").classList.contains("hidden")).toBe(false);

    expect(document.getElementById("storeLogoPreview").src).toContain("store-logo-url");
    expect(document.getElementById("storeLogoPreview").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("storeLogoFallback").classList.contains("hidden")).toBe(true);

    expect(document.getElementById("savedVendorDetails").textContent)
      .toBe("BobThePlug • Matrix Ground Floor • Fast Food • 0712345678");

    expect(document.getElementById("savedOperatingHours").textContent)
      .toBe("Weekdays: 08:00 - 17:00 | Weekends: 09:00 - 14:00");
  });

  test("loads closed weekend state", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        weekdayOpeningTime: "08:00",
        weekdayClosingTime: "17:00",
        weekendOpeningTime: "",
        weekendClosingTime: "",
        closedWeekends: true
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById("closedWeekends").checked).toBe(true);
    expect(document.getElementById("weekendHoursContainer").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("savedOperatingHours").textContent)
      .toBe("Weekdays: 08:00 - 17:00 | Weekends: Closed");
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

    expect(global.alert).toHaveBeenCalledWith("Vendor details updated successfully.");
  });

  test("accepts vendor phone number with spaces and saves cleaned number", async () => {
    doc.mockReturnValue({});
    updateDoc.mockResolvedValue();

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor",
        status: "approved",
        shopName: "Shop",
        location: "Matrix"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings({ href: "" });

    await Promise.resolve();
    await Promise.resolve();

    document.getElementById("shopName").value = "New Shop";
    document.getElementById("location").value = "Matrix";
    document.getElementById("storeSlogan").value = "Fresh";
    document.getElementById("storePhone").value = "074 389 2816";
    document.getElementById("storeCategory").value = "Fast Food";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      shopName: "New Shop",
      location: "Matrix",
      storeSlogan: "Fresh",
      storePhone: "0743892816",
      storeCategory: "Fast Food"
    });
  });

  test("rejects invalid vendor phone number", async () => {
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

    document.getElementById("shopName").value = "Shop";
    document.getElementById("location").value = "Matrix";
    document.getElementById("storePhone").value = "07123";
    document.getElementById("storeCategory").value = "Fast Food";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();

    expect(global.alert).toHaveBeenCalledWith("Phone number must be exactly 10 digits.");
    expect(updateDoc).not.toHaveBeenCalled();
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

  expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
    shopName: "Logo Shop",
    location: "Matrix",
    storeSlogan: "Fresh daily",
    storePhone: "0711111111",
    storeCategory: "Fast Food"
  });
});

test("calls requestAccountDeletion when vendor clicks delete account", async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      email: "vendor@test.com"
    })
  });

  requestAccountDeletion.mockResolvedValue();

  onAuthStateChanged.mockImplementation((authArg, callback) => {
    callback({ uid: "vendor-123" });
  });

  initVendorSettings({ href: "" });

  await Promise.resolve();
  await Promise.resolve();

  document.getElementById("deleteAccountBtn").click();

  await Promise.resolve();

  expect(requestAccountDeletion).toHaveBeenCalledWith(
    "vendor-123",
    "vendor@test.com"
  );
});
});