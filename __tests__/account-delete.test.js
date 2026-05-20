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

    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    database = require("../scripts/database.js");
    authModule = require("https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js");

    authModule.reauthenticateWithCredential.mockResolvedValue({});

    ({ requestAccountDeletion, reactivateAccount } = await import("../scripts/account-deletion.js"));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("does not delete account when first confirmation is cancelled", async () => {
    global.confirm.mockReturnValue(false);

    await requestAccountDeletion("user-1", "test@email.com");

    expect(database.updateDoc).not.toHaveBeenCalled();
    expect(database.signOut).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(document.getElementById("deleteAccountModalPassword")).toBeNull();
  });

  test("shows password modal when deletion is confirmed", async () => {
    global.confirm.mockReturnValue(true);

    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    expect(document.getElementById("deleteAccountModalPassword")).not.toBeNull();
    expect(document.getElementById("cancelDeleteAccount")).not.toBeNull();
    expect(document.getElementById("confirmDeleteAccount")).not.toBeNull();

    document.getElementById("cancelDeleteAccount").click();

    await deletionPromise;
  });

  test("cancels deletion when password modal is cancelled", async () => {
    global.confirm.mockReturnValue(true);

    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    document.getElementById("cancelDeleteAccount").click();

    await deletionPromise;

    expect(document.getElementById("deleteAccountModalPassword")).toBeNull();
    expect(database.updateDoc).not.toHaveBeenCalled();
    expect(database.signOut).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("cancels deletion when password is empty", async () => {
    global.confirm.mockReturnValue(true);

    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    document.getElementById("deleteAccountModalPassword").value = "";
    document.getElementById("confirmDeleteAccount").click();

    await deletionPromise;

    expect(global.alert).toHaveBeenCalledWith("Account deletion cancelled.");
    expect(document.getElementById("deleteAccountModalPassword")).toBeNull();
    expect(database.updateDoc).not.toHaveBeenCalled();
    expect(database.signOut).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("marks account as pending deletion after valid password confirmation", async () => {
    global.confirm.mockReturnValue(true);

    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    document.getElementById("deleteAccountModalPassword").value = "password123";
    document.getElementById("confirmDeleteAccount").click();

    await deletionPromise;

    expect(database.updateDoc).toHaveBeenCalledWith(
      [{}, "users", "user-1"],
      expect.objectContaining({
        accountStatus: "pendingDeletion",
        deletionRequestedAt: "mock-server-timestamp",
        deletionScheduledFor: expect.any(Object)
      })
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/send-account-deletion-email",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: expect.stringContaining("test@email.com")
      })
    );

    expect(global.alert).toHaveBeenCalledWith(
      "Your account has been scheduled for deletion. You have 30 days to reactivate it."
    );

    expect(database.signOut).toHaveBeenCalled();
    expect(document.getElementById("deleteAccountModalPassword")).toBeNull();
  });

  test("does not delete account when password is incorrect", async () => {
    global.confirm.mockReturnValue(true);
    authModule.reauthenticateWithCredential.mockRejectedValueOnce(new Error("Wrong password"));

    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    document.getElementById("deleteAccountModalPassword").value = "wrong-password";
    document.getElementById("confirmDeleteAccount").click();

    await deletionPromise;

    expect(global.alert).toHaveBeenCalledWith("Incorrect password. Account deletion cancelled.");
    expect(database.updateDoc).not.toHaveBeenCalled();
    expect(database.signOut).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("still completes account deletion when confirmation email request fails", async () => {
    global.confirm.mockReturnValue(true);
    global.fetch.mockRejectedValueOnce(new Error("Email failed"));

    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    document.getElementById("deleteAccountModalPassword").value = "password123";
    document.getElementById("confirmDeleteAccount").click();

    await deletionPromise;

    expect(database.updateDoc).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith("Deletion email could not be sent.");
    expect(database.signOut).toHaveBeenCalled();
  });

  test("shows error and does not sign out when Firestore update fails", async () => {
    global.confirm.mockReturnValue(true);
    database.updateDoc.mockRejectedValueOnce(new Error("Firestore failed"));

    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    document.getElementById("deleteAccountModalPassword").value = "password123";
    document.getElementById("confirmDeleteAccount").click();

    await deletionPromise;

    expect(console.error).toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledWith(
      "Could not schedule account deletion. Please try again."
    );
    expect(database.signOut).not.toHaveBeenCalled();
  });

  test("stores deletionScheduledFor value in Firestore update", async () => {
  global.confirm.mockReturnValue(true);

  const deletionPromise = requestAccountDeletion(
    "user-1",
    "test@email.com"
  );

  document.getElementById("deleteAccountModalPassword").value =
    "password123";

  document.getElementById("confirmDeleteAccount").click();

  await deletionPromise;

  expect(database.updateDoc).toHaveBeenCalledWith(
    [{}, "users", "user-1"],
    expect.objectContaining({
      deletionScheduledFor: expect.anything()
    })
  );
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

  test("reactivation update failure rejects", async () => {
    database.updateDoc.mockRejectedValueOnce(new Error("Reactivate failed"));

    await expect(reactivateAccount("user-1")).rejects.toThrow("Reactivate failed");
  });
});