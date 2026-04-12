const { calculateVendorStats } = require("../scripts/admin.js");

test("calculates vendor stats correctly", () => {
  const users = [
    { role: "vendor", status: "approved" },
    { role: "vendor", status: "pending" },
    { role: "vendor", status: "approved" }
  ];

  const result = calculateVendorStats(users);

  expect(result.total).toBe(3);
  expect(result.active).toBe(2);
  expect(result.pending).toBe(1);
});