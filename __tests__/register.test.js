const { buildUserObject } = require("../scripts/register.js");

test("builds vendor object correctly", () => {
  const result = buildUserObject({
    fullName: "John",
    email: "john@test.com",
    role: "vendor",
    shopName: "Food Spot",
    location: "Campus",
    image: "logo.png"
  });

  expect(result.status).toBe("pending");
  expect(result.shopName).toBe("Food Spot");
});