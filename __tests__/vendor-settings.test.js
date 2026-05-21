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
test("shows custom category input when Other is selected", async () => {
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

  document.getElementById("shopName").value = "Custom Shop";
  document.getElementById("location").value = "Matrix";
  document.getElementById("storeSlogan").value = "Fresh";
  document.getElementById("storePhone").value = "074 389 2816";
  document.getElementById("storeCategory").value = "Other";
  document.getElementById("customCategory").value = "Korean Street Food";

  document.getElementById("vendorDetailsForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  await Promise.resolve();
  await Promise.resolve();

  expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
    shopName: "Custom Shop",
    location: "Matrix",
    storeSlogan: "Fresh",
    storePhone: "0743892816",
    storeCategory: "Korean Street Food"
  });
});

test("shows operating hours as closed when no hours are set but closedWeekends is true", async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      closedWeekends: true
    })
  });

  onAuthStateChanged.mockImplementation((authArg, callback) => {
    callback({ uid: "vendor-123" });
  });

  initVendorSettings({ href: "" });

  await Promise.resolve();
  await Promise.resolve();

  expect(document.getElementById("savedOperatingHours").textContent)
    .toBe("Weekdays: Closed | Weekends: Closed");
});

test("does not validate weekend times when weekends are closed", async () => {
  doc.mockReturnValue({});
  updateDoc.mockResolvedValue();

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

  document.getElementById("weekdayOpeningTime").value = "08:00";
  document.getElementById("weekdayClosingTime").value = "17:00";
  document.getElementById("weekendOpeningTime").value = "18:00";
  document.getElementById("weekendClosingTime").value = "14:00";
  document.getElementById("closedWeekends").checked = true;

  document.getElementById("operatingHoursForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  await Promise.resolve();
  await Promise.resolve();

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

test("stores blank optional vendor fields when submitted", async () => {
  doc.mockReturnValue({});
  updateDoc.mockResolvedValue();

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

  document.getElementById("shopName").value = "Basic Shop";
  document.getElementById("location").value = "Matrix";
  document.getElementById("storeSlogan").value = "";
  document.getElementById("storePhone").value = "0743892816";
  document.getElementById("storeCategory").value = "";

  document.getElementById("vendorDetailsForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  await Promise.resolve();
  await Promise.resolve();

  expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
    shopName: "Basic Shop",
    location: "Matrix",
    storeSlogan: "",
    storePhone: "0743892816",
    storeCategory: ""
  });
});

test("uses old vendor fallback fields when loading settings", async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      slogan: "Old slogan",
      phone: "0711111111",
      category: "Bakery",
      logo: "old-logo-url",
      openingTime: "07:00",
      closingTime: "15:00"
    })
  });

  onAuthStateChanged.mockImplementation((authArg, callback) => {
    callback({ uid: "vendor-123" });
  });

  initVendorSettings({ href: "" });

  await Promise.resolve();
  await Promise.resolve();

  expect(document.getElementById("storeSlogan").value).toBe("Old slogan");
  expect(document.getElementById("storePhone").value).toBe("0711111111");
  expect(document.getElementById("storeCategory").value).toBe("Bakery");
  expect(document.getElementById("weekdayOpeningTime").value).toBe("07:00");
  expect(document.getElementById("weekdayClosingTime").value).toBe("15:00");
  expect(document.getElementById("storeLogoPreview").src).toContain("old-logo-url");
});


test("uses request status when banking API returns non-json error", async () => {
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

  global.fetch.mockResolvedValue({
    ok: false,
    status: 500,
    json: jest.fn().mockRejectedValue(new Error("bad json"))
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
    "Could not update banking details: Request failed (500)"
  );
});

test("does not attach duplicate listeners when init runs twice", async () => {
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
  initVendorSettings({ href: "" });

  await Promise.resolve();
  await Promise.resolve();

  expect(document.getElementById("vendorDetailsForm").dataset.listenerAttached)
    .toBe("true");
  expect(document.getElementById("operatingHoursForm").dataset.listenerAttached)
    .toBe("true");
  expect(document.getElementById("bankingDetailsForm").dataset.listenerAttached)
    .toBe("true");
  expect(document.getElementById("storeLogoInput").dataset.listenerAttached)
    .toBe("true");
});

test("shows no vendor details message when no vendor details are saved", async () => {
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

  expect(document.getElementById("savedVendorDetails").textContent)
    .toBe("No vendor details set yet.");
});

test("shows no operating hours message when no hours and weekends are not marked closed", async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      closedWeekends: false
    })
  });

  onAuthStateChanged.mockImplementation((authArg, callback) => {
    callback({ uid: "vendor-123" });
  });

  initVendorSettings({ href: "" });

  await Promise.resolve();
  await Promise.resolve();

  expect(document.getElementById("savedOperatingHours").textContent)
    .toBe("No operating hours set yet.");
});

test("shows unmasked short bank account number", async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      bankDetails: {
        bankName: "unknown_bank",
        accountHolder: "Bob Smith",
        accountNumber: "1234",
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

  expect(document.getElementById("savedBankingDetails").textContent)
    .toBe("unknown_bank • 1234");
});

test("rejects missing weekend opening time when weekends are open", async () => {
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

  document.getElementById("weekdayOpeningTime").value = "08:00";
  document.getElementById("weekdayClosingTime").value = "17:00";
  document.getElementById("closedWeekends").checked = false;
  document.getElementById("weekendOpeningTime").value = "";
  document.getElementById("weekendClosingTime").value = "14:00";

  document.getElementById("operatingHoursForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  expect(global.alert).toHaveBeenCalledWith(
    "Please enter both weekend opening and closing times."
  );
});

test("rejects missing weekend closing time when weekends are open", async () => {
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

  document.getElementById("weekdayOpeningTime").value = "08:00";
  document.getElementById("weekdayClosingTime").value = "17:00";
  document.getElementById("closedWeekends").checked = false;
  document.getElementById("weekendOpeningTime").value = "09:00";
  document.getElementById("weekendClosingTime").value = "";

  document.getElementById("operatingHoursForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  expect(global.alert).toHaveBeenCalledWith(
    "Please enter both weekend opening and closing times."
  );
});

test("does not save logo when vendor details update fails before logo upload", async () => {
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  doc.mockReturnValue({});
  updateDoc.mockRejectedValueOnce(new Error("Vendor update failed"));

  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      shopName: "Shop",
      location: "Matrix"
    })
  });

  global.FileReader = class {
    readAsDataURL() {
      this.result = "data:image/png;base64,test";
      this.onload();
    }
  };

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

  expect(errorSpy).toHaveBeenCalled();
  expect(uploadBytes).not.toHaveBeenCalled();
  expect(getDownloadURL).not.toHaveBeenCalled();

  errorSpy.mockRestore();
});
test("uploads store logo after vendor details update succeeds", async () => {
  doc.mockReturnValue({});
  ref.mockReturnValue("storage-ref");
  uploadBytes.mockResolvedValue();
  getDownloadURL.mockResolvedValue("uploaded-logo-url");
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

  const logoInput = document.getElementById("storeLogoInput");
  const validFile = new File(["image"], "logo.jpg", { type: "image/jpeg" });

  Object.defineProperty(logoInput, "files", {
    value: [validFile]
  });

  logoInput.dispatchEvent(new Event("change"));

  await Promise.resolve();
  await Promise.resolve();

  document.getElementById("shopName").value = "Logo Shop";
  document.getElementById("location").value = "Matrix";
  document.getElementById("storeSlogan").value = "Fresh";
  document.getElementById("storePhone").value = "0743892816";
  document.getElementById("storeCategory").value = "Fast Food";

  document.getElementById("vendorDetailsForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  await Promise.resolve();
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
    image: "uploaded-logo-url"
  });
});

test("clears selected logo after successful logo upload", async () => {
  doc.mockReturnValue({});
  ref.mockReturnValue("storage-ref");
  uploadBytes.mockResolvedValue();
  getDownloadURL.mockResolvedValue("uploaded-logo-url");
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

  const logoInput = document.getElementById("storeLogoInput");
  const validFile = new File(["image"], "logo.png", { type: "image/png" });

  Object.defineProperty(logoInput, "files", {
    value: [validFile]
  });

  logoInput.dispatchEvent(new Event("change"));

  await Promise.resolve();
  await Promise.resolve();

  document.getElementById("shopName").value = "Logo Shop";
  document.getElementById("location").value = "Matrix";
  document.getElementById("storeSlogan").value = "Fresh";
  document.getElementById("storePhone").value = "0743892816";
  document.getElementById("storeCategory").value = "Fast Food";

  document.getElementById("vendorDetailsForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  updateDoc.mockClear();

  document.getElementById("vendorDetailsForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  await Promise.resolve();
  await Promise.resolve();

  expect(updateDoc).toHaveBeenCalledTimes(1);
  expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
    shopName: "Logo Shop",
    location: "Matrix",
    storeSlogan: "Fresh",
    storePhone: "0743892816",
    storeCategory: "Fast Food"
  });
});

test("hides custom category section when category changes away from Other", async () => {
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

  const storeCategory = document.getElementById("storeCategory");
  const customCategorySection = document.getElementById("customCategorySection");

  storeCategory.value = "Other";
  storeCategory.dispatchEvent(new Event("change"));
  expect(customCategorySection.classList.contains("hidden")).toBe(false);

  storeCategory.value = "Café";
  storeCategory.dispatchEvent(new Event("change"));
  expect(customCategorySection.classList.contains("hidden")).toBe(true);
});

test("uses fallback request failed message when banking response has no error", async () => {
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

  global.fetch.mockResolvedValue({
    ok: false,
    status: 400,
    json: jest.fn().mockResolvedValue({})
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
    "Could not update banking details: Request failed (400)"
  );
});

test("does not crash when closed weekend controls are missing", async () => {
  document.getElementById("closedWeekends").remove();
  document.getElementById("weekendHoursContainer").remove();

  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      closedWeekends: true,
      weekdayOpeningTime: "08:00",
      weekdayClosingTime: "17:00"
    })
  });

  onAuthStateChanged.mockImplementation((authArg, callback) => {
    callback({ uid: "vendor-123" });
  });

  expect(() => initVendorSettings({ href: "" })).not.toThrow();

  await Promise.resolve();
  await Promise.resolve();

  expect(document.getElementById("savedOperatingHours").textContent)
    .toBe("Weekdays: 08:00 - 17:00 | Weekends: Closed");
});
test("keeps weekend hours visible when closedWeekends is false", async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      closedWeekends: false,
      weekdayOpeningTime: "08:00",
      weekdayClosingTime: "17:00"
    })
  });

  onAuthStateChanged.mockImplementation((authArg, callback) => {
    callback({ uid: "vendor-123" });
  });

  initVendorSettings({ href: "" });

  await Promise.resolve();
  await Promise.resolve();

  expect(document.getElementById("closedWeekends").checked).toBe(false);
  expect(document.getElementById("weekendHoursContainer").classList.contains("hidden")).toBe(false);
});

test("shows closed weekday and weekend text when no hours but weekends are closed", async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      closedWeekends: true
    })
  });

  onAuthStateChanged.mockImplementation((authArg, callback) => {
    callback({ uid: "vendor-123" });
  });

  initVendorSettings({ href: "" });

  await Promise.resolve();
  await Promise.resolve();

  expect(document.getElementById("savedOperatingHours").textContent)
    .toBe("Weekdays: Closed | Weekends: Closed");
});
test("uses custom category as blank when Other is selected without custom text", async () => {
  doc.mockReturnValue({});
  updateDoc.mockResolvedValue();

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

  document.getElementById("shopName").value = "Other Shop";
  document.getElementById("location").value = "Matrix";
  document.getElementById("storeSlogan").value = "";
  document.getElementById("storePhone").value = "0743892816";
  document.getElementById("storeCategory").value = "Other";
  document.getElementById("customCategory").value = "";

  document.getElementById("vendorDetailsForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  await Promise.resolve();
  await Promise.resolve();

  expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
    shopName: "Other Shop",
    location: "Matrix",
    storeSlogan: "",
    storePhone: "0743892816",
    storeCategory: ""
  });
});

test("stores weekend times when weekends are open", async () => {
  doc.mockReturnValue({});
  updateDoc.mockResolvedValue();

  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      closedWeekends: false
    })
  });

  onAuthStateChanged.mockImplementation((authArg, callback) => {
    callback({ uid: "vendor-123" });
  });

  initVendorSettings({ href: "" });

  await Promise.resolve();
  await Promise.resolve();

  document.getElementById("weekdayOpeningTime").value = "08:00";
  document.getElementById("weekdayClosingTime").value = "17:00";
  document.getElementById("closedWeekends").checked = false;
  document.getElementById("weekendOpeningTime").value = "10:00";
  document.getElementById("weekendClosingTime").value = "13:00";

  document.getElementById("operatingHoursForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  await Promise.resolve();
  await Promise.resolve();

  expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
    weekdayOpeningTime: "08:00",
    weekdayClosingTime: "17:00",
    weekendOpeningTime: "10:00",
    weekendClosingTime: "13:00",
    closedWeekends: false,
    openingTime: "08:00",
    closingTime: "17:00"
  });
});

test("shows unknown bank name when bank is not in labels", async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved",
      bankDetails: {
        bankName: "mystery_bank",
        accountHolder: "Jane Doe",
        accountNumber: "123456789",
        branchCode: "632005",
        accountType: "savings"
      }
    })
  });

  onAuthStateChanged.mockImplementation((authArg, callback) => {
    callback({ uid: "vendor-123" });
  });

  initVendorSettings({ href: "" });

  await Promise.resolve();
  await Promise.resolve();

  expect(document.getElementById("savedBankingDetails").textContent)
    .toBe("mystery_bank • •••••6789");
});
test("rejects invalid store logo and clears selected logo", async () => {
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
  const invalidFile = new File(["bad"], "bad.gif", { type: "image/gif" });

  Object.defineProperty(logoInput, "files", {
    value: [invalidFile],
    configurable: true
  });

  logoInput.dispatchEvent(new Event("change"));

  expect(global.alert).toHaveBeenCalledWith(
    "Store logo must be a PNG or JPG/JPEG image."
  );
  expect(logoInput.value).toBe("");
});

test("directly covers validateTimePair success and invalid order branches", async () => {
  const mod = await import("../scripts/vendor-settings.js");

  expect(mod.validateTimePair("", "", "weekday")).toBe(true);
  expect(mod.validateTimePair("18:00", "17:00", "weekday")).toBe(false);

  expect(global.alert).toHaveBeenCalledWith(
    "weekday closing time must be after opening time."
  );
});

test("handles operating hours update failure branch", async () => {
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  doc.mockReturnValue({});
  updateDoc.mockRejectedValueOnce(new Error("Hours failed"));

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

  document.getElementById("weekdayOpeningTime").value = "08:00";
  document.getElementById("weekdayClosingTime").value = "17:00";
  document.getElementById("closedWeekends").checked = true;

  document.getElementById("operatingHoursForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  await Promise.resolve();
  await Promise.resolve();

  expect(errorSpy).toHaveBeenCalled();
  expect(global.alert).toHaveBeenCalledWith("Could not update operating hours.");

  errorSpy.mockRestore();
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

  await Promise.resolve();
  await Promise.resolve();

  expect(locationTwo.href).toBe("login.html");

  const locationThree = { href: "" };

  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      role: "customer"
    })
  });

  onAuthStateChanged.mockImplementationOnce((authArg, callback) => {
    callback({ uid: "customer-123" });
  });

  initVendorSettings(locationThree);

  await Promise.resolve();
  await Promise.resolve();

  expect(locationThree.href).toBe("index.html");

  const locationFour = { href: "" };

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

  initVendorSettings(locationFour);

  await Promise.resolve();
  await Promise.resolve();

  expect(locationFour.href).toBe("pending-approval.html");

  const locationFive = { href: "" };

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

  initVendorSettings(locationFive);

  await Promise.resolve();
  await Promise.resolve();

  expect(global.alert).toHaveBeenCalledWith("Your account is suspended");
  expect(locationFive.href).toBe("login.html");
});
test("covers shop name and location validation branches", async () => {
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

  global.alert.mockClear();

  document.getElementById("shopName").value = "Test Shop";
  document.getElementById("location").value = "";

  document.getElementById("vendorDetailsForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  expect(global.alert).toHaveBeenCalledWith("Please enter your shop location.");
});

test("covers successful banking details save branch", async () => {
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

  global.fetch.mockResolvedValue({
    ok: true
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

  expect(document.getElementById("savedBankingDetails").textContent)
    .toBe("ABSA • •••••6789");

  expect(global.alert).toHaveBeenCalledWith(
    "Banking details updated successfully."
  );
});

test("covers weekend checkbox add and remove hidden branches", async () => {
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

  const checkbox = document.getElementById("closedWeekends");
  const container = document.getElementById("weekendHoursContainer");

  checkbox.checked = true;
  checkbox.dispatchEvent(new Event("change"));

  expect(container.classList.contains("hidden")).toBe(true);

  checkbox.checked = false;
  checkbox.dispatchEvent(new Event("change"));

  expect(container.classList.contains("hidden")).toBe(false);
});

test("covers immediate init when document is already loaded", async () => {
  jest.resetModules();

  Object.defineProperty(document, "readyState", {
    value: "complete",
    configurable: true
  });

  const database = require("../scripts/database.js");

  database.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor",
      status: "approved"
    })
  });

  database.onAuthStateChanged.mockImplementation((authArg, callback) => {
    callback({ uid: "vendor-123" });
  });

  require("../scripts/vendor-settings.js");

  await Promise.resolve();
  await Promise.resolve();

  expect(database.onAuthStateChanged).toHaveBeenCalled();
});
});