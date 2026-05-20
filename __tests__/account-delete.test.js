/**
 * @jest-environment jsdom
 */

jest.mock("../scripts/database.js", () => ({
  auth: {
    currentUser: { uid: "user-1" }
  },
  db: {},
  doc: jest.fn((...args) => args),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-server-timestamp"),
  Timestamp: {
    fromDate: jest.fn((date) => ({
      toDate: () => date
    }))
  },
  signOut: jest.fn()
}));

jest.mock("https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js", () => ({
  EmailAuthProvider: {
    credential: jest.fn((email, password) => ({
      email,
      password
    }))
  },
  reauthenticateWithCredential: jest.fn()
}), { virtual: true });

describe("account-deletion.js", () => {
  let database;
  let authModule;
  let requestAccountDeletion;
  let reactivateAccount;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    document.body.innerHTML = "";

    global.confirm = jest.fn();
    global.alert = jest.fn();

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true
      })
    );

    database = require("../scripts/database.js");
    authModule = require("https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js");

    ({ requestAccountDeletion, reactivateAccount } = await import("../scripts/account-deletion.js"));
  });

  test("does not delete account when first confirmation is cancelled", async () => {
    global.confirm.mockReturnValue(false);

    await requestAccountDeletion("user-1", "test@email.com");

    expect(database.updateDoc).not.toHaveBeenCalled();
    expect(database.signOut).not.toHaveBeenCalled();
  });

  test("marks account as pending deletion after password confirmation", async () => {
    global.confirm.mockReturnValue(true);
    authModule.reauthenticateWithCredential.mockResolvedValue({});

    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    const passwordInput = document.getElementById("deleteAccountModalPassword");
    passwordInput.value = "password123";

    document.getElementById("confirmDeleteAccount").click();

    await deletionPromise;

    expect(authModule.EmailAuthProvider.credential).toHaveBeenCalledWith(
      "test@email.com",
      "password123"
    );

    expect(authModule.reauthenticateWithCredential).toHaveBeenCalled();

    expect(database.updateDoc).toHaveBeenCalledWith(
      [{}, "users", "user-1"],
      expect.objectContaining({
        accountStatus: "pendingDeletion",
        deletionRequestedAt: "mock-server-timestamp",
        deletionScheduledFor: expect.any(Object)
      })
    );

    expect(global.fetch).toHaveBeenCalled();
    expect(database.signOut).toHaveBeenCalled();
  });

  test("cancels deletion when password modal is cancelled", async () => {
    global.confirm.mockReturnValue(true);

    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    document.getElementById("cancelDeleteAccount").click();

    await deletionPromise;

    expect(database.updateDoc).not.toHaveBeenCalled();
    expect(database.signOut).not.toHaveBeenCalled();
  });

  test("does not delete account when password is incorrect", async () => {
    global.confirm.mockReturnValue(true);
    authModule.reauthenticateWithCredential.mockRejectedValue(new Error("Wrong password"));

    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    const passwordInput = document.getElementById("deleteAccountModalPassword");
    passwordInput.value = "wrong-password";

    document.getElementById("confirmDeleteAccount").click();

    await deletionPromise;

    expect(global.alert).toHaveBeenCalledWith("Incorrect password. Account deletion cancelled.");
    expect(database.updateDoc).not.toHaveBeenCalled();
    expect(database.signOut).not.toHaveBeenCalled();
  });

  test("reactivates a pending deletion account", async () => {
    await reactivateAccount("user-1");

    expect(database.updateDoc).toHaveBeenCalledWith(
      [{}, "users", "user-1"],
      {
        accountStatus: "active",
        deletionRequestedAt: null,
        deletionScheduledFor: null
      }
    );

    expect(global.alert).toHaveBeenCalledWith("Your account has been reactivated.");
  });
});