/**
 * @jest-environment jsdom
 */

jest.mock("../scripts/database.js", () => ({
  db: {},
  getDocs: jest.fn(),
  collection: jest.fn()
}));

describe("index.js", () => {
  let getDocs;
  let collection;

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  async function loadIndex() {
    await import("../scripts/index.js");
    await flushPromises();
  }

  beforeEach(async () => {
    jest.resetModules();

    document.body.innerHTML = `
      <button id="OrderNowButton"></button>
      <button id="LearnButton"></button>
      <div id="BrowseVendors"></div>
      <div id="FeaturesSection"></div>
      <div id="featured-vendors"></div>
    `;

    global.lucide = {
      createIcons: jest.fn()
    };

    global.alert = jest.fn();

    jest.spyOn(console, "error").mockImplementation(() => {});

    jest.spyOn(global, "setInterval").mockImplementation((callback) => {
      callback();
      return 1;
    });

    const dbModule = await import("../scripts/database.js");

    getDocs = dbModule.getDocs;
    collection = dbModule.collection;

    getDocs.mockReset();
    collection.mockReset();

    collection.mockReturnValue("usersCollection");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("loads and renders only approved vendors", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "vendor1",
          data: () => ({
            role: "vendor",
            status: "approved",
            shopName: "Jimmy's",
            location: "Matrix Ground Floor",
            image: "jim.jpg",
            category: "Fast Food",
            rating: 4.8
          })
        },
        {
          id: "vendor2",
          data: () => ({
            role: "vendor",
            status: "pending",
            shopName: "Pending Vendor"
          })
        },
        {
          id: "customer1",
          data: () => ({
            role: "customer",
            status: "approved",
            fullName: "Customer User"
          })
        }
      ]
    });

    await loadIndex();

    const html = document.getElementById("featured-vendors").innerHTML;

    expect(collection).toHaveBeenCalledWith({}, "users");
    expect(getDocs).toHaveBeenCalledWith("usersCollection");

    expect(html).toContain("Jimmy's");
    expect(html).toContain("Matrix Ground Floor");
    expect(html).toContain("Fast Food");
    expect(html).toContain("4.8/5");

    expect(html).not.toContain("Pending Vendor");
    expect(html).not.toContain("Customer User");
  });

  test("shows fallback message when there are no approved vendors", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "vendor1",
          data: () => ({
            role: "vendor",
            status: "pending",
            shopName: "Not Approved"
          })
        }
      ]
    });

    await loadIndex();

    expect(document.getElementById("featured-vendors").innerHTML)
      .toContain("No approved vendors available yet.");
  });

  test("uses fallback image, name, category, location, and generated rating", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "vendor1",
          data: () => ({
            role: "vendor",
            status: "approved",
            email: "vendor@test.com"
          })
        }
      ]
    });

    await loadIndex();

    const html = document.getElementById("featured-vendors").innerHTML;

    expect(html).toContain("assets/default_vendor.jpg");
    expect(html).toContain("Unnamed Vendor");
    expect(html).toContain("Campus");
    expect(html).toContain("/5");
    expect(html).toContain('data-lucide="star"');
  });

  test("uses vendor logo when image is missing", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "vendor1",
          data: () => ({
            role: "vendor",
            status: "approved",
            shopName: "Logo Vendor",
            logo: "logo.png",
            rating: 4
          })
        }
      ]
    });

    await loadIndex();

    const html = document.getElementById("featured-vendors").innerHTML;

    expect(html).toContain("logo.png");
    expect(html).toContain("Logo Vendor");
  });

  test("uses fullName fallback when shopName is missing", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "vendor1",
          data: () => ({
            role: "vendor",
            status: "approved",
            fullName: "Vendor Full Name",
            rating: 5
          })
        }
      ]
    });

    await loadIndex();

    const html = document.getElementById("featured-vendors").innerHTML;

    expect(html).toContain("Vendor Full Name");
    expect(html).toContain("5.0/5");
  });

  test("renders vendor profile redirect on vendor cards", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "vendor123",
          data: () => ({
            role: "vendor",
            status: "approved",
            shopName: "Clickable Vendor",
            rating: 4.5
          })
        }
      ]
    });

    await loadIndex();

    const html = document.getElementById("featured-vendors").innerHTML;

    expect(html).toContain("goToVendor('vendor123')");
    expect(typeof window.goToVendor).toBe("function");

    window.goToVendor("vendor123");

    expect(console.error).toHaveBeenCalled();
  });

  test("renders lucide star icons and initializes lucide", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "vendor1",
          data: () => ({
            role: "vendor",
            status: "approved",
            shopName: "Xpresso",
            rating: 5
          })
        }
      ]
    });

    await loadIndex();

    const html = document.getElementById("featured-vendors").innerHTML;

    expect(html).toContain('data-lucide="star"');
    expect(html).toContain("5.0/5");
    expect(global.lucide.createIcons).toHaveBeenCalled();
  });

  test("shows error message when Firestore fails", async () => {
    getDocs.mockRejectedValue(new Error("Firestore error"));

    await loadIndex();

    expect(document.getElementById("featured-vendors").innerHTML)
      .toContain("Failed to load featured vendors.");

    expect(console.error).toHaveBeenCalled();
  });

  test("learn button scrolls to features section", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    const scrollMock = jest.fn();
    document.getElementById("FeaturesSection").scrollIntoView = scrollMock;

    await loadIndex();

    document.getElementById("LearnButton").click();

    expect(scrollMock).toHaveBeenCalled();
  });

  test("homepage navigation buttons execute without crashing", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    await loadIndex();

    document.getElementById("OrderNowButton").click();
    document.getElementById("BrowseVendors").click();

    expect(console.error).toHaveBeenCalled();
  });
});