const { calculateRevenue } = require("../scripts/vendor-dashboard.js");

test("calculates revenue", () => {
  const orders = [{ total: 100 }, { total: 50 }];

  expect(calculateRevenue(orders)).toBe(150);
});