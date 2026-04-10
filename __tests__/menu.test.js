describe("Menu Item Structure", () => {

  test("menu item contains required fields", () => {
    const item = {
      name: "Burger",
      description: "Nice burger",
      price: 50,
      category: "Main",
      available: true
    };

    expect(item).toHaveProperty("name");
    expect(item).toHaveProperty("price");
    expect(item).toHaveProperty("available");
  });

});