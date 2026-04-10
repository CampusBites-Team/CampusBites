import { 
  filterAvailableItems,
  toggleItemAvailability,
  formatPrice
} from "../scripts/utils.js";

describe("Menu Utility Functions", () => {

  test("filters only available items", () => {
    const items = [
      { name: "Burger", available: true },
      { name: "Pizza", available: false },
      { name: "Salad", available: true }
    ];

    const result = filterAvailableItems(items);

    expect(result.length).toBe(2);
    expect(result.every(item => item.available)).toBe(true);
  });

  test("toggles item availability", () => {
    const item = { name: "Burger", available: true };

    const updated = toggleItemAvailability(item);

    expect(updated.available).toBe(false);
  });

  test("formats price correctly", () => {
    expect(formatPrice(50)).toBe("R50.00");
    expect(formatPrice(14.5)).toBe("R14.50");
  });

});