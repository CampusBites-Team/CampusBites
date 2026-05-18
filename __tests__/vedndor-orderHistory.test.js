/**
 * @jest-environment jsdom
 */

jest.mock("../scripts/database.js", () => ({
  auth: {},
  db: {},

  onAuthStateChanged: jest.fn(),

  getDocs: jest.fn(),
  getDoc: jest.fn(),

  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  doc: jest.fn()
}));

jest.mock("../scripts/orders.js", () => ({
  formatTimestamp: jest.fn(() => "Today")
}));

import {
  onAuthStateChanged,
  getDocs,
  getDoc
} from "../scripts/database.js";

describe("vendor-orderHistory.js", () => {

  beforeEach(() => {

    jest.clearAllMocks();

    global.lucide = {
      createIcons: jest.fn()
    };

    window.history.pushState({}, "", "/");
  });

  async function setupPage() {

    document.body.innerHTML = `
      <select id="SortBy">
        <option value="Newest">Newest</option>
        <option value="Oldest">Oldest</option>
        <option value="PriceHighToLow">Price High To Low</option>
      </select>

      <input id="orderDate" type="date">

      <input
        id="customerSearch"
        type="text"
      >

      <section id="orderList"></section>

      <section
        id="order-details-modal"
        class="hidden"
      ></section>

      <button id="closeOrderModal"></button>

      <section id="itemList"></section>

      <p id="numItemsOrder"></p>
    `;

    jest.isolateModules(() => {
      require("../scripts/vendor-orderHistory.js");
    });

    document.dispatchEvent(
      new Event("DOMContentLoaded")
    );
  }

  async function triggerAuth(user = { uid: "vendor-1" }) {

    const callback =
      onAuthStateChanged.mock.calls[0][1];

    await callback(user);
  }

  test("renders collected orders only", async () => {

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    getDocs.mockResolvedValue({
      docs: [
        {
          id: "o1",
          data: () => ({
            status: "Collected",
            customerName: "John Doe",
            total: 50,
            createdAt: {
              seconds: 10
            },
            menuItems: [
              {
                name: "Burger",
                quantity: 1
              }
            ]
          })
        }
      ]
    });

    await setupPage();
    await triggerAuth();

    expect(
      document.getElementById("orderList").innerHTML
    ).toContain("Burger");

    expect(
      document.getElementById("orderList").innerHTML
    ).toContain("Collected");
  });

  test("shows empty state when no orders exist", async () => {

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    getDocs.mockResolvedValue({
      docs: []
    });

    await setupPage();
    await triggerAuth();

    expect(
      document.getElementById("orderList").textContent
    ).toContain("No collected orders found");
  });

  test("opens details modal", async () => {

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    getDocs.mockResolvedValue({
      docs: [
        {
          id: "o1",
          data: () => ({
            status: "Collected",
            customerName: "John Doe",
            total: 50,
            createdAt: {
              seconds: 10
            },
            menuItems: [
              {
                name: "Burger",
                price: 50
              }
            ]
          })
        }
      ]
    });

    await setupPage();
    await triggerAuth();

    document
      .querySelector(".details-order-btn")
      .click();

    expect(
      document
        .getElementById("order-details-modal")
        .classList.contains("hidden")
    ).toBe(false);

    expect(
      document.getElementById("itemList").innerHTML
    ).toContain("Burger");
  });

  test("closes details modal", async () => {

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    getDocs.mockResolvedValue({
      docs: []
    });

    await setupPage();
    await triggerAuth();

    const modal =
      document.getElementById("order-details-modal");

    modal.classList.remove("hidden");

    document
      .getElementById("closeOrderModal")
      .click();

    expect(
      modal.classList.contains("hidden")
    ).toBe(true);
  });

  test("sorts orders", async () => {

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "vendor"
      })
    });

    getDocs.mockResolvedValue({
      docs: [
        {
          id: "o1",
          data: () => ({
            status: "Collected",
            total: 20,
            createdAt: {
              seconds: 1
            },
            menuItems: []
          })
        },
        {
          id: "o2",
          data: () => ({
            status: "Collected",
            total: 100,
            createdAt: {
              seconds: 2
            },
            menuItems: []
          })
        }
      ]
    });

    await setupPage();
    await triggerAuth();

    document.getElementById("SortBy").value =
      "PriceHighToLow";

    document
      .getElementById("SortBy")
      .dispatchEvent(new Event("change"));

    expect(
      document.getElementById("orderList").innerHTML
    ).toContain("Collected");
  });
test("sorts orders by oldest", async () => {

  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor"
    })
  });

  getDocs.mockResolvedValue({
    docs: [
      {
        id: "o1",
        data: () => ({
          status: "Collected",
          total: 20,
          createdAt: {
            seconds: 50
          },
          menuItems: []
        })
      },
      {
        id: "o2",
        data: () => ({
          status: "Collected",
          total: 100,
          createdAt: {
            seconds: 1
          },
          menuItems: []
        })
      }
    ]
  });

  await setupPage();
  await triggerAuth();

  document.getElementById("SortBy").value =
    "Oldest";

  document
    .getElementById("SortBy")
    .dispatchEvent(new Event("change"));

  expect(
    document.getElementById("orderList").innerHTML
  ).toContain("Collected");
});
test("sorts orders by lowest price", async () => {

  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor"
    })
  });

  getDocs.mockResolvedValue({
    docs: [
      {
        id: "o1",
        data: () => ({
          status: "Collected",
          total: 500,
          createdAt: {
            seconds: 1
          },
          menuItems: []
        })
      },
      {
        id: "o2",
        data: () => ({
          status: "Collected",
          total: 20,
          createdAt: {
            seconds: 2
          },
          menuItems: []
        })
      }
    ]
  });

  await setupPage();
  await triggerAuth();

  document.getElementById("SortBy").value =
    "PriceLowToHigh";

  document
    .getElementById("SortBy")
    .dispatchEvent(new Event("change"));

  expect(
    document.getElementById("orderList").innerHTML
  ).toContain("Collected");
});
test("filters orders by date", async () => {

getDoc
  .mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      role: "vendor"
    })
  })
  .mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      fullName: "John Doe"
    })
  });

  getDocs.mockResolvedValue({
    docs: [
      {
        id: "o1",
        data: () => ({
          status: "Collected",
          userId: "u1",
          total: 20,
          createdAt: {
            toDate: () => new Date("2025-05-10")
          },
          menuItems: []
        })
      }
    ]
  });

  await setupPage();
  await triggerAuth();

  const input =
    document.getElementById("orderDate");

  input.value = "2025-05-10";

  input.dispatchEvent(
    new Event("change")
  );

  expect(
    document.getElementById("orderList").innerHTML
  ).toContain("John Doe");
});
test("handles missing customer name", async () => {

  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "vendor"
    })
  });

  getDocs.mockResolvedValue({
    docs: [
      {
        id: "o1",
        data: () => ({
          status: "Collected",
          total: 20,
          createdAt: {
            seconds: 1
          },
          menuItems: []
        })
      }
    ]
  });

  await setupPage();
  await triggerAuth();

  expect(
    document.getElementById("orderList").innerHTML
  ).toContain("Customer");
});
});