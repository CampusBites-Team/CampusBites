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

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <section id="profileImageFallback" class=""></section>
      <img id="profileImage" class="hidden" />
      <h2 id="profileName"></h2>
      <p id="profileEmail"></p>
      <p id="profileAbout"></p>

      <form id="profileForm">
        <input id="fullName" />
        <input id="email" />
        <input id="phone" />
        <input id="about" />
        <input id="role" />
        <input id="profileImageInput" type="file" />
        <button type="submit">Save Changes</button>
      </form>
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
        about: "I like burgers",
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
    expect(document.getElementById("about").value).toBe("I like burgers");
    expect(document.getElementById("role").value).toBe("customer");

    expect(document.getElementById("profileName").textContent).toBe("Ant");
    expect(document.getElementById("profileEmail").textContent).toBe("ant@gmail.com");
    expect(document.getElementById("profileAbout").textContent).toBe("I like burgers");
    expect(document.getElementById("profileImage").src).toContain("profile-image-url");
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

    expect(global.alert).toHaveBeenCalledWith("Profile not found.");
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

    expect(global.alert).toHaveBeenCalledWith("Only customers can access this profile page.");
  });

  test("updates customer profile without changing image", async () => {
    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Ant",
        email: "ant@gmail.com",
        phone: "",
        about: "",
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
    document.getElementById("about").value = "Updated bio";

    document.getElementById("profileForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      fullName: "Ant Updated",
      phone: "0798765432",
      about: "Updated bio",
      image: "old-image-url"
    });

    expect(global.alert).toHaveBeenCalledWith("Profile updated successfully.");
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

    expect(global.alert).toHaveBeenCalledWith("Profile picture must be a PNG or JPEG image.");
  });

  test("uploads valid image and saves new image URL", async () => {
    doc.mockReturnValue({});
    ref.mockReturnValue("storage-ref");
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue("new-image-url");

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "Ant",
        email: "ant@gmail.com",
        phone: "",
        about: "",
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
      phone: "",
      about: "",
      image: "new-image-url"
    });
  });
});