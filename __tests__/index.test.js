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

    jest.spyOn(global, "setInterval").mockImplementation(() => 1);
    jest.spyOn(console, "error").mockImplementation(() => {});

    // IMPORTANT: re-import mocks AFTER resetModules
    const dbModule = await import("../scripts/database.js");

    getDocs = dbModule.getDocs;
    collection = dbModule.collection;

    collection.mockReturnValue("usersCollection");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("loads and renders only approved vendors", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "1",
          data: () => ({
            role: "vendor",
            status: "approved",
            shopName: "Jimmy's",
            rating: 4.8,
            category: "Fast Food",
            location: "Campus"
          })
        },
        {
          id: "2",
          data: () => ({
            role: "vendor",
            status: "pending",
            shopName: "Hidden"
          })
        }
      ]
    });

    await import("../scripts/index.js");
    await flushPromises();

    const html =
      document.getElementById("featured-vendors").innerHTML;

    expect(collection).toHaveBeenCalledWith({}, "users");
    expect(getDocs).toHaveBeenCalledWith("usersCollection");

    expect(html).toContain("Jimmy's");
    expect(html).not.toContain("Hidden");
    expect(html).toContain("4.8/5");
  });

  test("shows no vendors message", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    await import("../scripts/index.js");
    await flushPromises();

    expect(
      document.getElementById("featured-vendors").innerHTML
    ).toContain("No approved vendors available yet.");
  });

  test("renders fallback vendor fields", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "1",
          data: () => ({
            role: "vendor",
            status: "approved"
          })
        }
      ]
    });

    await import("../scripts/index.js");
    await flushPromises();

    const html =
      document.getElementById("featured-vendors").innerHTML;

    expect(html).toContain("assets/default_vendor.jpg");
    expect(html).toContain("Unnamed Vendor");
    expect(html).toContain("Campus");
  });

  test("renders star icons", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "1",
          data: () => ({
            role: "vendor",
            status: "approved",
            shopName: "Xpresso",
            rating: 5
          })
        }
      ]
    });

    await import("../scripts/index.js");
    await flushPromises();

    expect(
      document.getElementById("featured-vendors").innerHTML
    ).toContain('data-lucide="star"');
  });

  test("shows error message on firestore failure", async () => {
    getDocs.mockRejectedValue(new Error("fail"));

    await import("../scripts/index.js");
    await flushPromises();

    expect(
      document.getElementById("featured-vendors").innerHTML
    ).toContain("Failed to load featured vendors.");
  });
});