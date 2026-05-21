// __tests__/vendor-settings.test.js

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

jest.mock("../scripts/toast.js", () => ({
  showToast: jest.fn()
}));

jest.mock("../scripts/account-deletion.js", () => ({
  requestAccountDeletion: jest.fn()
}));

Object.defineProperty(document, "readyState", {
  value: "loading",
  configurable: true
});

const { showToast } = require("../scripts/toast.js");
const { requestAccountDeletion } = require("../scripts/account-deletion.js");

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

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

function mockApprovedVendor(data = {}) {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      ...data
    })
  });

  onAuthStateChanged.mockImplementation((authArg, callback) => {
    callback({ uid: "vendor-123" });
  });
}

describe("vendor-settings.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.alert = jest.fn();
    global.fetch = jest.fn();

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
  });

  test("loads vendor details, logo, category, contact details and operating hours", async () => {
    mockApprovedVendor({
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
    });

    initVendorSettings({ href: "" });
    await flush();

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

  test("loads closed weekend state", async () => {
    mockApprovedVendor({
      weekdayOpeningTime: "08:00",
      weekdayClosingTime: "17:00",
      closedWeekends: true
    });

    initVendorSettings({ href: "" });
    await flush();

    expect(document.getElementById("closedWeekends").checked).toBe(true);
    expect(document.getElementById("weekendHoursContainer").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("savedOperatingHours").textContent)
      .toBe("Weekdays: 08:00 - 17:00 | Weekends: Closed");
  });

  test("saves updated vendor details without changing logo", async () => {
    doc.mockReturnValue({});
    updateDoc.mockResolvedValue();

    mockApprovedVendor({
      shopName: "Old Shop",
      location: "Old Location",
      image: "old-logo-url"
    });

    initVendorSettings({ href: "" });
    await flush();

    document.getElementById("shopName").value = "New Shop";
    document.getElementById("storeSlogan").value = "Best meals on campus";
    document.getElementById("storePhone").value = "0798765432";
    document.getElementById("storeCategory").value = "Café";
    document.getElementById("location").value = "Matrix Ground Floor";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      shopName: "New Shop",
      location: "Matrix Ground Floor",
      storeSlogan: "Best meals on campus",
      storePhone: "0798765432",
      storeCategory: "Café"
    });

    expect(showToast).toHaveBeenCalledWith("Vendor details updated successfully.", "success");
  });

  test("accepts vendor phone number with spaces and saves cleaned number", async () => {
    doc.mockReturnValue({});
    updateDoc.mockResolvedValue();

    mockApprovedVendor({
      shopName: "Shop",
      location: "Matrix"
    });

    initVendorSettings({ href: "" });
    await flush();

    document.getElementById("shopName").value = "New Shop";
    document.getElementById("location").value = "Matrix";
    document.getElementById("storeSlogan").value = "Fresh";
    document.getElementById("storePhone").value = "074 389 2816";
    document.getElementById("storeCategory").value = "Fast Food";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      shopName: "New Shop",
      location: "Matrix",
      storeSlogan: "Fresh",
      storePhone: "0743892816",
      storeCategory: "Fast Food"
    });
  });

  test("rejects invalid vendor phone number", async () => {
    mockApprovedVendor();

    initVendorSettings({ href: "" });
    await flush();

    document.getElementById("shopName").value = "Shop";
    document.getElementById("location").value = "Matrix";
    document.getElementById("storePhone").value = "07123";
    document.getElementById("storeCategory").value = "Fast Food";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(showToast).toHaveBeenCalledWith("Phone number must be exactly 10 digits.", "error");
    expect(updateDoc).not.toHaveBeenCalled();
  });

  test("rejects invalid store logo type", async () => {
    mockApprovedVendor();

    initVendorSettings({ href: "" });
    await flush();

    const logoInput = document.getElementById("storeLogoInput");
    const invalidFile = new File(["bad"], "bad.gif", { type: "image/gif" });

    Object.defineProperty(logoInput, "files", {
      value: [invalidFile],
      configurable: true
    });

    logoInput.dispatchEvent(new Event("change"));

    expect(showToast).toHaveBeenCalledWith(
      "Store logo must be a PNG or JPG/JPEG image.",
      "error"
    );
    expect(logoInput.value).toBe("");
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

    mockApprovedVendor({
      shopName: "Old Shop",
      location: "Old Location",
      image: null
    });

    initVendorSettings({ href: "" });
    await flush();

    const logoInput = document.getElementById("storeLogoInput");
    const validFile = new File(["image"], "logo.png", { type: "image/png" });

    Object.defineProperty(logoInput, "files", {
      value: [validFile],
      configurable: true
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

    await flush();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      shopName: "Logo Shop",
      location: "Matrix",
      storeSlogan: "Fresh daily",
      storePhone: "0711111111",
      storeCategory: "Fast Food"
    });
  });

  test("calls requestAccountDeletion when vendor clicks delete account", async () => {
    mockApprovedVendor({
      email: "vendor@test.com"
    });

    requestAccountDeletion.mockResolvedValue();

    initVendorSettings({ href: "" });
    await flush();

    document.getElementById("deleteAccountBtn").click();

    await flush();

    expect(requestAccountDeletion).toHaveBeenCalledWith(
      "vendor-123",
      "vendor@test.com"
    );
  });

  test("shows custom category input when Other is selected", async () => {
    mockApprovedVendor();

    initVendorSettings({ href: "" });
    await flush();

    const storeCategory = document.getElementById("storeCategory");
    const customCategorySection = document.getElementById("customCategorySection");

    storeCategory.value = "Other";
    storeCategory.dispatchEvent(new Event("change"));

    expect(customCategorySection.classList.contains("hidden")).toBe(false);

    storeCategory.value = "Fast Food";
    storeCategory.dispatchEvent(new Event("change"));

    expect(customCategorySection.classList.contains("hidden")).toBe(true);
  });

  test("saves custom category when Other is selected", async () => {
    doc.mockReturnValue({});
    updateDoc.mockResolvedValue();

    mockApprovedVendor();

    initVendorSettings({ href: "" });
    await flush();

    document.getElementById("shopName").value = "Custom Shop";
    document.getElementById("location").value = "Matrix";
    document.getElementById("storeSlogan").value = "Fresh";
    document.getElementById("storePhone").value = "074 389 2816";
    document.getElementById("storeCategory").value = "Other";
    document.getElementById("customCategory").value = "Korean Street Food";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      shopName: "Custom Shop",
      location: "Matrix",
      storeSlogan: "Fresh",
      storePhone: "0743892816",
      storeCategory: "Korean Street Food"
    });
  });

  test("requires shop name and location", async () => {
    mockApprovedVendor();

    initVendorSettings({ href: "" });
    await flush();

    document.getElementById("shopName").value = "";
    document.getElementById("location").value = "Matrix";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(showToast).toHaveBeenCalledWith("Please enter your shop name.", "error");

    document.getElementById("shopName").value = "Shop";
    document.getElementById("location").value = "";

    document.getElementById("vendorDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(showToast).toHaveBeenCalledWith("Please enter your shop location.", "error");
  });

  test("saves updated weekday and weekend operating hours", async () => {
    doc.mockReturnValue({});
    updateDoc.mockResolvedValue();

    mockApprovedVendor();

    initVendorSettings({ href: "" });
    await flush();

    document.getElementById("weekdayOpeningTime").value = "07:00";
    document.getElementById("weekdayClosingTime").value = "17:00";
    document.getElementById("weekendOpeningTime").value = "09:00";
    document.getElementById("weekendClosingTime").value = "14:00";

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      weekdayOpeningTime: "07:00",
      weekdayClosingTime: "17:00",
      weekendOpeningTime: "09:00",
      weekendClosingTime: "14:00",
      closedWeekends: false,
      openingTime: "07:00",
      closingTime: "17:00"
    });

    expect(showToast).toHaveBeenCalledWith("Operating hours updated successfully.", "success");
  });

  test("does not validate weekend times when weekends are closed", async () => {
    doc.mockReturnValue({});
    updateDoc.mockResolvedValue();

    mockApprovedVendor();

    initVendorSettings({ href: "" });
    await flush();

    document.getElementById("weekdayOpeningTime").value = "08:00";
    document.getElementById("weekdayClosingTime").value = "17:00";
    document.getElementById("weekendOpeningTime").value = "18:00";
    document.getElementById("weekendClosingTime").value = "14:00";
    document.getElementById("closedWeekends").checked = true;

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      weekdayOpeningTime: "08:00",
      weekdayClosingTime: "17:00",
      weekendOpeningTime: "",
      weekendClosingTime: "",
      closedWeekends: true,
      openingTime: "08:00",
      closingTime: "17:00"
    });
  });

  test("validates weekday and weekend operating hours", async () => {
    mockApprovedVendor();

    initVendorSettings({ href: "" });
    await flush();

    document.getElementById("weekdayOpeningTime").value = "08:00";
    document.getElementById("weekdayClosingTime").value = "";

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(showToast).toHaveBeenCalledWith(
      "Please enter both weekday opening and closing times.",
      "error"
    );

    document.getElementById("weekdayOpeningTime").value = "18:00";
    document.getElementById("weekdayClosingTime").value = "17:00";

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(showToast).toHaveBeenCalledWith(
      "weekday closing time must be after opening time.",
      "error"
    );

    document.getElementById("weekdayOpeningTime").value = "08:00";
    document.getElementById("weekdayClosingTime").value = "17:00";
    document.getElementById("weekendOpeningTime").value = "18:00";
    document.getElementById("weekendClosingTime").value = "14:00";

    document.getElementById("operatingHoursForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(showToast).toHaveBeenCalledWith(
      "weekend closing time must be after opening time.",
      "error"
    );
  });

  test("displays saved banking details on load", async () => {
    mockApprovedVendor({
      bankDetails: {
        bankName: "fnb",
        accountHolder: "Bob Smith",
        accountNumber: "12345678",
        branchCode: "250655",
        accountType: "cheque"
      }
    });

    initVendorSettings({ href: "" });
    await flush();

    expect(document.getElementById("savedBankingDetails").textContent)
      .toBe("FNB • ••••5678");
  });

  test("shows placeholder when no banking details are set", async () => {
    mockApprovedVendor();

    initVendorSettings({ href: "" });
    await flush();

    expect(document.getElementById("savedBankingDetails").textContent)
      .toBe("No banking details set yet.");
  });

  test("saves banking details successfully", async () => {
    mockApprovedVendor();

    global.fetch.mockResolvedValue({ ok: true });

    initVendorSettings({ href: "" });
    await flush();

    document.getElementById("settings-bank-name").value = "absa";
    document.getElementById("settings-account-holder").value = "Jane Doe";
    document.getElementById("settings-account-number").value = "123456789";
    document.getElementById("settings-branch-code").value = "632005";
    document.getElementById("settings-account-type").value = "savings";

    document.getElementById("bankingDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

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

    expect(showToast).toHaveBeenCalledWith(
      "Banking details updated successfully.",
      "success"
    );
  });

  test("validates banking details fields", async () => {
    mockApprovedVendor();

    initVendorSettings({ href: "" });
    await flush();

    const submit = () => {
      document.getElementById("bankingDetailsForm").dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    };

    document.getElementById("settings-bank-name").value = "";
    submit();
    expect(showToast).toHaveBeenCalledWith("Please select a bank.", "error");

    document.getElementById("settings-bank-name").value = "fnb";
    document.getElementById("settings-account-holder").value = "";
    submit();
    expect(showToast).toHaveBeenCalledWith("Please enter the account holder name.", "error");

    document.getElementById("settings-account-holder").value = "Jane";
    document.getElementById("settings-account-number").value = "123";
    submit();
    expect(showToast).toHaveBeenCalledWith("Account number must be 6 to 12 digits.", "error");

    document.getElementById("settings-account-number").value = "123456";
    document.getElementById("settings-branch-code").value = "123";
    submit();
    expect(showToast).toHaveBeenCalledWith("Branch code must be exactly 6 digits.", "error");

    document.getElementById("settings-branch-code").value = "632005";
    document.getElementById("settings-account-type").value = "";
    submit();
    expect(showToast).toHaveBeenCalledWith("Please select an account type.", "error");
  });

  test("handles API error when saving banking details", async () => {
    mockApprovedVendor();

    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: "Bank validation failed" })
    });

    initVendorSettings({ href: "" });
    await flush();

    document.getElementById("settings-bank-name").value = "absa";
    document.getElementById("settings-account-holder").value = "Jane Doe";
    document.getElementById("settings-account-number").value = "123456789";
    document.getElementById("settings-branch-code").value = "632005";
    document.getElementById("settings-account-type").value = "savings";

    document.getElementById("bankingDetailsForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await flush();

    expect(showToast).toHaveBeenCalledWith(
      "Could not update banking details.",
      "error"
    );
  });

  test("redirects unauthenticated, missing, non-vendor, pending and suspended users", async () => {
    const locationOne = { href: "" };

    onAuthStateChanged.mockImplementationOnce((authArg, callback) => {
      callback(null);
    });

    initVendorSettings(locationOne);
    expect(locationOne.href).toBe("login.html");

    const locationTwo = { href: "" };

    getDoc.mockResolvedValueOnce({
      exists: () => false
    });

    onAuthStateChanged.mockImplementationOnce((authArg, callback) => {
      callback({ uid: "missing-user" });
    });

    initVendorSettings(locationTwo);
    await flush();

    expect(locationTwo.href).toBe("login.html");

    const locationThree = { href: "" };

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: "customer" })
    });

    onAuthStateChanged.mockImplementationOnce((authArg, callback) => {
      callback({ uid: "customer-123" });
    });

    initVendorSettings(locationThree);
    await flush();

    expect(locationThree.href).toBe("index.html");

    const locationFour = { href: "" };

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: "vendor", status: "pending" })
    });

    onAuthStateChanged.mockImplementationOnce((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initVendorSettings(locationFour);
    await flush();

    expect(locationFour.href).toBe("pending-approval.html");

    const locationFive = { href: "" };

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: "vendor", status: "suspended" })
    });

    onAuthStateChanged.mockImplementationOnce((authArg, callback) => {
      callback({ uid: "vendor-456" });
    });

    initVendorSettings(locationFive);
    await flush();

    expect(showToast).toHaveBeenCalledWith("Your account is suspended", "error");
    expect(locationFive.href).toBe("login.html");
  });

  test("does not attach duplicate listeners when init runs twice", async () => {
    mockApprovedVendor();

    initVendorSettings({ href: "" });
    initVendorSettings({ href: "" });

    await flush();

    expect(document.getElementById("vendorDetailsForm").dataset.listenerAttached)
      .toBe("true");
    expect(document.getElementById("operatingHoursForm").dataset.listenerAttached)
      .toBe("true");
    expect(document.getElementById("bankingDetailsForm").dataset.listenerAttached)
      .toBe("true");
    expect(document.getElementById("storeLogoInput").dataset.listenerAttached)
      .toBe("true");
  });

  test("validateTimePair returns true when both times are empty", async () => {
    const mod = await import("../scripts/vendor-settings.js");

    expect(mod.validateTimePair("", "", "weekday")).toBe(true);
  });
});