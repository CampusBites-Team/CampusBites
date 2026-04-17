import { buildOrderHTML, mapSnapshotToOrders, renderOrders, listenToVendorOrders } from "../scripts/orders.js";
import { onSnapshot } from "../__mocks__/database.js";

// ─── buildOrderHTML (pure — no mocks needed) ───────────────

describe("buildOrderHTML", () => {
  test("contains order id", () => {
    const html = buildOrderHTML({ id: "abc", userId: "u1", items: [], status: "new" });
    expect(html).toContain("abc");
  });

  test("contains userId", () => {
    const html = buildOrderHTML({ id: "1", userId: "user99", items: [], status: "new" });
    expect(html).toContain("user99");
  });

  test("renders item name and quantity", () => {
    const html = buildOrderHTML({
      id: "1", userId: "u", status: "new",
      items: [{ name: "Burger", quantity: 2 }]
    });
    expect(html).toContain("Burger");
    expect(html).toContain("x2");
  });

  test("defaults quantity to 1 when missing", () => {
    const html = buildOrderHTML({
      id: "1", userId: "u", status: "new",
      items: [{ name: "Chips" }]  // no quantity
    });
    expect(html).toContain("x1");
  });

  test("defaults status to 'new' when missing", () => {
    const html = buildOrderHTML({ id: "1", userId: "u", items: [] });
    expect(html).toContain("new");
  });

  test("renders multiple items", () => {
    const html = buildOrderHTML({
      id: "1", userId: "u", status: "new",
      items: [{ name: "Pizza", quantity: 1 }, { name: "Coke", quantity: 2 }]
    });
    expect(html).toContain("Pizza");
    expect(html).toContain("Coke");
  });

  test("handles empty items array", () => {
    const html = buildOrderHTML({ id: "1", userId: "u", items: [], status: "new" });
    expect(html).not.toContain("<p>-");
  });
});

// ─── mapSnapshotToOrders (pure — no mocks needed) ──────────

describe("mapSnapshotToOrders", () => {
  test("maps docs to plain objects with id", () => {
    const snapshot = {
      docs: [
        { id: "o1", data: () => ({ status: "new", shopName: "ShopA" }) },
        { id: "o2", data: () => ({ status: "new", shopName: "ShopA" }) },
      ]
    };
    const result = mapSnapshotToOrders(snapshot);
    expect(result).toEqual([
      { id: "o1", status: "new", shopName: "ShopA" },
      { id: "o2", status: "new", shopName: "ShopA" },
    ]);
  });

  test("returns empty array for empty snapshot", () => {
    expect(mapSnapshotToOrders({ docs: [] })).toEqual([]);
  });

  test("spreads all data fields onto the object", () => {
    const snapshot = {
      docs: [{ id: "x", data: () => ({ userId: "u1", items: [], total: 99 }) }]
    };
    const [order] = mapSnapshotToOrders(snapshot);
    expect(order.userId).toBe("u1");
    expect(order.total).toBe(99);
    expect(order.id).toBe("x");
  });
});

// ─── listenToVendorOrders ──────────────────────────────────

describe("listenToVendorOrders", () => {
  test("invokes callback with mapped orders from snapshot", () => {
    const fakeSnapshot = {
      docs: [{ id: "o1", data: () => ({ status: "new", shopName: "TestShop" }) }]
    };
    onSnapshot.mockImplementation((_q, cb) => { cb(fakeSnapshot); return jest.fn(); });

    const callback = jest.fn();
    listenToVendorOrders("TestShop", callback);

    expect(callback).toHaveBeenCalledWith([{ id: "o1", status: "new", shopName: "TestShop" }]);
  });
});

// ─── renderOrders (needs DOM only — no Firebase) ───────────

describe("renderOrders", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="newOrders"></div>`;
  });

  test("renders one card per order", () => {
    renderOrders([
      { id: "1", userId: "u1", status: "new", items: [] },
      { id: "2", userId: "u2", status: "new", items: [] },
    ]);
    expect(document.getElementById("newOrders").children.length).toBe(2);
  });

  test("renders empty container for no orders", () => {
    renderOrders([]);
    expect(document.getElementById("newOrders").innerHTML).toBe("");
  });

  test("rendered HTML contains order data", () => {
    renderOrders([{ id: "order99", userId: "userX", status: "pending", items: [] }]);
    const html = document.getElementById("newOrders").innerHTML;
    expect(html).toContain("order99");
    expect(html).toContain("userX");
  });
});