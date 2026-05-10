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

const { initRegisterUI } = require("../scripts/register.js");

const {
  createUserWithEmailAndPassword,
  setDoc,
  getDoc,
  signInWithPopup,
  uploadBytes,
  getDownloadURL
} = require("../scripts/database.js");

const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

const setupDom = () => {
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
    <input id="bank-name" value="" />
    <input id="account-holder" value="" />
    <input id="account-number" value="" />
    <input id="branch-code" value="" />
    <select id="account-type">
      <option value="">Select</option>
      <option value="cheque">Cheque</option>
      <option value="savings">Savings</option>
    </select>

    <section id="shop-name-container" class="hidden"></section>
    <section id="shop-location-container" class="hidden"></section>
    <section id="shop-logo-container" class="hidden"></section>
    <section id="bank-name-container" class="hidden"></section>
    <section id="account-holder-container" class="hidden"></section>
    <section id="account-number-container" class="hidden"></section>
    <section id="branch-code-container" class="hidden"></section>
    <section id="account-type-container" class="hidden"></section>

    <button id="googleRegister" type="button"></button>
    <button id="facebookRegister" type="button"></button>
    <button id="twitterRegister" type="button"></button>
    <button id="microsoftRegister" type="button"></button>
    <button id="appleRegister" type="button"></button>
  `;
};

const attachValidLogo = () => {
  const logoInput = document.getElementById("logoInput");
  const file = new File(["fake"], "logo.png", { type: "image/png" });
  Object.defineProperty(logoInput, "files", {
    value: [file],
    configurable: true
  });
  logoInput.dispatchEvent(new Event("change", { bubbles: true }));
  return file;
};

const submit = () => {
  document.getElementById("registerForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );
};

describe("register coverage gaps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    global.FileReader = class {
      readAsDataURL() {
        this.result = "data:image/png;base64,fake";
        if (this.onload) this.onload({ target: { result: this.result } });
      }
    };

    setupDom();
    initRegisterUI();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("vendor bank field validations", () => {
    const fillBaseVendorFields = () => {
      document.getElementById("registerRole").value = "vendor";
      document.getElementById("shop-name").value = "Bites";
      document.getElementById("shop-location").value = "Block A";
      attachValidLogo();
    };

    test("rejects when bank name is missing", async () => {
      fillBaseVendorFields();
      submit();
      await flush();

      expect(alert).toHaveBeenCalledWith("Bank required");
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test("rejects when account holder name is missing", async () => {
      fillBaseVendorFields();
      document.getElementById("bank-name").value = "FNB";
      submit();
      await flush();

      expect(alert).toHaveBeenCalledWith("Account holder name required");
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test("rejects when account number is too short", async () => {
      fillBaseVendorFields();
      document.getElementById("bank-name").value = "FNB";
      document.getElementById("account-holder").value = "Jane Doe";
      document.getElementById("account-number").value = "12345";
      submit();
      await flush();

      expect(alert).toHaveBeenCalledWith("Account number must be 6 to 12 digits.");
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test("rejects when account number contains non-digits", async () => {
      fillBaseVendorFields();
      document.getElementById("bank-name").value = "FNB";
      document.getElementById("account-holder").value = "Jane Doe";
      document.getElementById("account-number").value = "12abc678";
      submit();
      await flush();

      expect(alert).toHaveBeenCalledWith("Account number must be 6 to 12 digits.");
    });

    test("rejects when branch code is not exactly 6 digits", async () => {
      fillBaseVendorFields();
      document.getElementById("bank-name").value = "FNB";
      document.getElementById("account-holder").value = "Jane Doe";
      document.getElementById("account-number").value = "12345678";
      document.getElementById("branch-code").value = "12345";
      submit();
      await flush();

      expect(alert).toHaveBeenCalledWith("Branch code must be exactly 6 digits.");
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test("rejects when account type is missing", async () => {
      fillBaseVendorFields();
      document.getElementById("bank-name").value = "FNB";
      document.getElementById("account-holder").value = "Jane Doe";
      document.getElementById("account-number").value = "12345678";
      document.getElementById("branch-code").value = "250655";
      // account-type left as ""
      submit();
      await flush();

      expect(alert).toHaveBeenCalledWith("Account type required");
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test("vendor save persists bankDetails on the user document", async () => {
      createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: "v9" } });
      uploadBytes.mockResolvedValue({});
      getDownloadURL.mockResolvedValue("https://example.com/logo.png");

      fillBaseVendorFields();
      document.getElementById("bank-name").value = "FNB";
      document.getElementById("account-holder").value = "Jane Doe";
      document.getElementById("account-number").value = "12345678";
      document.getElementById("branch-code").value = "250655";
      document.getElementById("account-type").value = "cheque";

      submit();
      await flush();

      expect(setDoc).toHaveBeenCalledWith(
        "docRef",
        expect.objectContaining({
          bankDetails: {
            bankName: "FNB",
            accountHolder: "Jane Doe",
            accountNumber: "12345678",
            branchCode: "250655",
            accountType: "cheque"
          }
        })
      );
    });
  });

  describe("role switch resets bank fields", () => {
    test("switching from vendor to customer clears bank inputs and removes required", () => {
      const roleSelect = document.getElementById("registerRole");

      roleSelect.value = "vendor";
      roleSelect.dispatchEvent(new Event("change", { bubbles: true }));

      const bankName = document.getElementById("bank-name");
      const accountHolder = document.getElementById("account-holder");
      const accountNumber = document.getElementById("account-number");
      const branchCode = document.getElementById("branch-code");
      const accountType = document.getElementById("account-type");

      bankName.value = "FNB";
      accountHolder.value = "Jane";
      accountNumber.value = "12345678";
      branchCode.value = "250655";
      accountType.value = "cheque";

      expect(bankName.required).toBe(true);

      roleSelect.value = "customer";
      roleSelect.dispatchEvent(new Event("change", { bubbles: true }));

      expect(document.getElementById("bank-name-container").classList.contains("hidden")).toBe(true);

      [bankName, accountHolder, accountNumber, branchCode, accountType].forEach((input) => {
        expect(input.required).toBe(false);
        expect(input.value).toBe("");
      });
    });
  });

  describe("social login flow", () => {
    test("social login error from popup is alerted", async () => {
      signInWithPopup.mockRejectedValue(new Error("popup closed"));

      document.getElementById("googleRegister").click();
      await flush();

      expect(alert).toHaveBeenCalledWith("popup closed");
    });

    test("existing pending vendor is handled by handleSocialLogin", async () => {
      signInWithPopup.mockResolvedValue({ user: { uid: "v-pending" } });
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ role: "vendor", status: "pending" })
      });

      document.getElementById("facebookRegister").click();
      await flush();

      expect(signInWithPopup).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
      // No alert: pending vendor silently navigates to pending-approval
      expect(alert).not.toHaveBeenCalled();
    });

    test("existing approved customer flows through redirectUser without alert", async () => {
      signInWithPopup.mockResolvedValue({ user: { uid: "c1" } });
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ role: "customer", status: "approved" })
      });

      document.getElementById("twitterRegister").click();
      await flush();

      expect(signInWithPopup).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
      expect(alert).not.toHaveBeenCalled();
    });

    test("existing approved vendor flows through redirectUser without alert", async () => {
      signInWithPopup.mockResolvedValue({ user: { uid: "v-ok" } });
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ role: "vendor", status: "approved" })
      });

      document.getElementById("microsoftRegister").click();
      await flush();

      expect(signInWithPopup).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
      expect(alert).not.toHaveBeenCalled();
    });

    test("existing admin flows through redirectUser without alert", async () => {
      signInWithPopup.mockResolvedValue({ user: { uid: "admin1" } });
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ role: "admin" })
      });

      document.getElementById("appleRegister").click();
      await flush();

      expect(signInWithPopup).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
      expect(alert).not.toHaveBeenCalled();
    });
  });

  describe("vendor registration completes redirect path", () => {
    test("successful vendor save reaches the pending-approval branch without throwing", async () => {
      createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: "v-redir" } });
      uploadBytes.mockResolvedValue({});
      getDownloadURL.mockResolvedValue("https://example.com/logo.png");

      document.getElementById("registerRole").value = "vendor";
      document.getElementById("shop-name").value = "Bites";
      document.getElementById("shop-location").value = "Block A";
      attachValidLogo();
      document.getElementById("bank-name").value = "FNB";
      document.getElementById("account-holder").value = "Jane Doe";
      document.getElementById("account-number").value = "12345678";
      document.getElementById("branch-code").value = "250655";
      document.getElementById("account-type").value = "savings";

      submit();
      await flush();

      expect(setDoc).toHaveBeenCalled();
      // No error alert: the vendor branch ran the href assignment cleanly
      expect(alert).not.toHaveBeenCalledWith(expect.stringMatching(/error|fail/i));
    });
  });
});
