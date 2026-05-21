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
const { auth } = require("../scripts/database.js");
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

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    document.body.innerHTML = "";

    global.confirm = jest.fn(() => true);
    global.prompt = jest.fn(() => "DELETE");
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

    database.updateDoc.mockResolvedValue();
    database.signOut.mockResolvedValue();
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
  });

 test("does not delete account when DELETE confirmation is typed incorrectly", async () => {
  global.prompt.mockReturnValue("delete");

  const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

  await Promise.resolve();
  await Promise.resolve();

  const cancelButton = document.getElementById("cancelDeleteAccount");

  if (cancelButton) {
    cancelButton.click();
  }

  await deletionPromise;

  expect(database.updateDoc).not.toHaveBeenCalled();
  expect(database.signOut).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

  test("shows password modal when deletion is confirmed", async () => {
    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    await flushPromises();

    expect(document.getElementById("deleteAccountModalPassword")).not.toBeNull();
    expect(document.getElementById("cancelDeleteAccount")).not.toBeNull();
    expect(document.getElementById("confirmDeleteAccount")).not.toBeNull();

    document.getElementById("cancelDeleteAccount").click();

    await deletionPromise;

    expect(database.updateDoc).not.toHaveBeenCalled();
  });

  test("cancels deletion when password modal is cancelled", async () => {
    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    await flushPromises();

    document.getElementById("cancelDeleteAccount").click();

    await deletionPromise;

    expect(document.getElementById("deleteAccountModalPassword")).toBeNull();
    expect(database.updateDoc).not.toHaveBeenCalled();
    expect(database.signOut).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("cancels deletion when password is empty", async () => {
    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    await flushPromises();

    document.getElementById("deleteAccountModalPassword").value = "";
    document.getElementById("confirmDeleteAccount").click();

    await deletionPromise;

    expect(global.alert).toHaveBeenCalledWith("Account deletion cancelled.");
    expect(database.updateDoc).not.toHaveBeenCalled();
    expect(database.signOut).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("marks account as pending deletion after valid password confirmation", async () => {
    const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

    await flushPromises();

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

    expect(global.fetch).toHaveBeenCalled();
    expect(database.signOut).toHaveBeenCalled();
  });

  test("does not delete account when password is incorrect", async () => {
  database.updateDoc.mockRejectedValueOnce(
    new Error("Incorrect password")
  );

  const deletionPromise = requestAccountDeletion(
    "user-1",
    "test@email.com"
  );

  await flushPromises();

  document.getElementById("deleteAccountModalPassword").value =
    "wrong-password";

  document.getElementById("confirmDeleteAccount").click();

  await deletionPromise;

  expect(global.alert).toHaveBeenCalled();
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
  test("continues deletion when deletion email request fails", async () => {
  global.fetch.mockRejectedValueOnce(new Error("Email failed"));

  const deletionPromise = requestAccountDeletion("user-1", "test@email.com");

  await flushPromises();

  document.getElementById("deleteAccountModalPassword").value = "password123";
  document.getElementById("confirmDeleteAccount").click();

  await deletionPromise;

  expect(database.updateDoc).toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalled();
  expect(console.warn).toHaveBeenCalledWith("Deletion email could not be sent.");
  expect(database.signOut).toHaveBeenCalled();
});
});