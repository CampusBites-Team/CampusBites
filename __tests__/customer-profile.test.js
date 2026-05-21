jest.mock("../scripts/database.js", () => ({
  auth: {},
  db: {},
  storage: {},
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn()
}));
jest.mock("../scripts/toast.js", () => ({
  showToast: jest.fn()
}));

jest.mock(
  "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js",
  () => ({
    onAuthStateChanged: jest.fn()
  }),
  { virtual: true }
);

const {
  doc,
  getDoc,
  updateDoc,
  ref,
  uploadBytes,
  getDownloadURL
} = require("../scripts/database.js");

const { requestAccountDeletion } = require("../scripts/account-deletion.js");

const {
  onAuthStateChanged
} = require("https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js");

const { initCustomerProfile } = require("../scripts/customer-profile.js");

const originalError = console.error;

describe("customer-profile.js", () => {
  beforeAll(() => {
    console.error = (...args) => {
      if (args[0]?.message?.includes("Not implemented: navigation")) return;
      originalError(...args);
    };
  });

  let showToast;

  afterAll(() => {
      console.error = originalError;
    });

  beforeEach(() => {
    jest.clearAllMocks();
    showToast = require("../scripts/toast.js").showToast;

    document.body.innerHTML = `
      <section id="profileImageFallback" class=""></section>
      <img id="profileImage" class="hidden" />
      <h2 id="profileName"></h2>
      <p id="profileEmail"></p>

      <form id="profileForm">
        <input id="fullName" />
        <input id="email" />
        <input id="phone" />
        <input id="role" />
        <input id="profileImageInput" type="file" />
        <button type="submit">Save Changes</button>
      </form>

      <button id="deleteAccountBtn" type="button">Delete Account</button>
    `;

    global.alert = jest.fn();
  });

  test("loads customer profile details into the page", async () => {
    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Ant",
        email: "ant@gmail.com",
        phone: "0712345678",
        role: "customer",
        image: "profile-image-url"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "customer-123" });
    });

    initCustomerProfile();

    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById("fullName").value).toBe("Ant");
    expect(document.getElementById("email").value).toBe("ant@gmail.com");
    expect(document.getElementById("phone").value).toBe("0712345678");
    expect(document.getElementById("role").value).toBe("customer");
    expect(document.getElementById("profileName").textContent).toBe("Ant");
    expect(document.getElementById("profileEmail").textContent).toBe("ant@gmail.com");
    expect(document.getElementById("profileImage").src).toContain("profile-image-url");
    expect(document.getElementById("profileImage").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("profileImageFallback").classList.contains("hidden")).toBe(true);
  });

  test("loads fallback profile values when optional fields are missing", async () => {
    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "customer"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "customer-123" });
    });

    initCustomerProfile();

    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById("fullName").value).toBe("");
    expect(document.getElementById("email").value).toBe("");
    expect(document.getElementById("phone").value).toBe("");
    expect(document.getElementById("role").value).toBe("customer");
    expect(document.getElementById("profileName").textContent).toBe("Customer Name");
    expect(document.getElementById("profileEmail").textContent).toBe("customer@email.com");
    expect(document.getElementById("profileImage").classList.contains("hidden")).toBe(true);
  });

  test("redirects to login when no user is logged in", () => {
    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback(null);
    });

    initCustomerProfile();

    expect(getDoc).not.toHaveBeenCalled();
  });

  test("redirects when profile document does not exist", async () => {
    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => false
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "missing-user" });
    });

    initCustomerProfile();

    await Promise.resolve();
    await Promise.resolve();

    expect(showToast).toHaveBeenCalledWith("Profile not found.", "error");
  });

  test("redirects non-customer users away from customer profile page", async () => {
    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Vendor",
        email: "vendor@gmail.com",
        role: "vendor"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "vendor-123" });
    });

    initCustomerProfile();

    await Promise.resolve();
    await Promise.resolve();

    expect(showToast).toHaveBeenCalledWith("Only customers can access this profile page.", "warning");
  });

  test("updates customer profile without changing image", async () => {
    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Ant",
        email: "ant@gmail.com",
        phone: "0712345678",
        role: "customer",
        image: "old-image-url"
      })
    });

    updateDoc.mockResolvedValue();

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "customer-123" });
    });

    initCustomerProfile();

    await Promise.resolve();
    await Promise.resolve();

    document.getElementById("fullName").value = "Ant Updated";
    document.getElementById("phone").value = "0798765432";

    document.getElementById("profileForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      fullName: "Ant Updated",
      phone: "0798765432",
      image: "old-image-url"
    });

    expect(showToast).toHaveBeenCalledWith("Profile updated successfully.", "success");
  });

  test("rejects invalid profile image type", async () => {
    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Ant",
        email: "ant@gmail.com",
        role: "customer"
      })
    });

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "customer-123" });
    });

    initCustomerProfile();

    await Promise.resolve();
    await Promise.resolve();

    const imageInput = document.getElementById("profileImageInput");
    const invalidFile = new File(["hello"], "notes.txt", { type: "text/plain" });

    Object.defineProperty(imageInput, "files", {
      value: [invalidFile]
    });

    imageInput.dispatchEvent(new Event("change"));

    expect(showToast).toHaveBeenCalledWith("Profile picture must be a PNG or JPEG image.", "error");
  });

  test("uploads valid PNG image and saves new image URL", async () => {
    doc.mockReturnValue({});
    ref.mockReturnValue("storage-ref");
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue("new-image-url");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Ant",
        email: "ant@gmail.com",
        phone: "0712345678",
        role: "customer",
        image: null
      })
    });

    updateDoc.mockResolvedValue();

    global.FileReader = class {
      readAsDataURL() {
        this.result = "data:image/png;base64,test";
        this.onload();
      }
    };

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "customer-123" });
    });

    initCustomerProfile();

    await Promise.resolve();
    await Promise.resolve();

    const imageInput = document.getElementById("profileImageInput");
    const validFile = new File(["image"], "profile.png", { type: "image/png" });

    Object.defineProperty(imageInput, "files", {
      value: [validFile]
    });

    imageInput.dispatchEvent(new Event("change"));

    document.getElementById("phone").value = "071 234 5678";

    document.getElementById("profileForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(ref).toHaveBeenCalledWith(expect.anything(), "customer-profile-images/customer-123");
    expect(uploadBytes).toHaveBeenCalledWith("storage-ref", validFile);
    expect(getDownloadURL).toHaveBeenCalledWith("storage-ref");

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      fullName: "Ant",
      phone: "0712345678",
      image: "new-image-url"
    });
  });

  test("uploads valid JPEG image and previews it", async () => {
    doc.mockReturnValue({});
    ref.mockReturnValue("storage-ref");
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue("jpeg-image-url");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Ant",
        email: "ant@gmail.com",
        phone: "0712345678",
        role: "customer",
        image: null
      })
    });

    updateDoc.mockResolvedValue();

    global.FileReader = class {
      readAsDataURL() {
        this.result = "data:image/jpeg;base64,test";
        this.onload();
      }
    };

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "customer-123" });
    });

    initCustomerProfile();

    await Promise.resolve();
    await Promise.resolve();

    const imageInput = document.getElementById("profileImageInput");
    const validFile = new File(["image"], "profile.jpg", { type: "image/jpeg" });

    Object.defineProperty(imageInput, "files", {
      value: [validFile]
    });

    imageInput.dispatchEvent(new Event("change"));

    expect(document.getElementById("profileImage").src).toContain("data:image/jpeg");
    expect(document.getElementById("profileImage").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("profileImageFallback").classList.contains("hidden")).toBe(true);
  });

  test("calls requestAccountDeletion when delete account button is clicked", async () => {
    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Ant",
        email: "ant@gmail.com",
        role: "customer"
      })
    });

    requestAccountDeletion.mockResolvedValue();

    onAuthStateChanged.mockImplementation((authArg, callback) => {
      callback({ uid: "customer-123" });
    });

    initCustomerProfile();

    await Promise.resolve();
    await Promise.resolve();

    document.getElementById("deleteAccountBtn").click();

    await Promise.resolve();

    expect(requestAccountDeletion).toHaveBeenCalledWith(
      "customer-123",
      "ant@gmail.com"
    );
  });

  test("alerts when delete account is clicked before profile data is loaded", async () => {
    onAuthStateChanged.mockImplementation(() => {});

    initCustomerProfile();

    document.getElementById("deleteAccountBtn").click();

    await Promise.resolve();

    expect(global.alert).toHaveBeenCalledWith("Profile could not be loaded.");
    expect(requestAccountDeletion).not.toHaveBeenCalled();
  });

  test("does not crash if optional profile form elements are missing", () => {
    document.body.innerHTML = `
      <button id="deleteAccountBtn" type="button">Delete Account</button>
    `;

    onAuthStateChanged.mockImplementation(() => {});

    expect(() => initCustomerProfile()).not.toThrow();
  });
});