jest.mock("../scripts/toast.js", () => ({
  showToast: jest.fn()
}));

// __tests__/forgot-password.test.js

jest.mock('../scripts/database.js', () => ({
  auth: {},
  sendPasswordResetEmail: jest.fn()
}));

describe('forgot-password.js', () => {
  let sendPasswordResetEmail;
  let showToast;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    showToast = require("../scripts/toast.js").showToast;

    document.body.innerHTML = `
      <form id="forgotPasswordForm">
        <input type="email" id="resetEmail" value="user@example.com" />
        <button type="submit">Send</button>
      </form>
    `;

    global.console.error = jest.fn();
  });

  test('successful password reset flow', async () => {
    ({ sendPasswordResetEmail } = await import('../scripts/database.js'));
    sendPasswordResetEmail.mockResolvedValue();

    await import('../scripts/forgot-password.js');

    const form = document.getElementById('forgotPasswordForm');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(sendPasswordResetEmail).toHaveBeenCalledWith({}, 'user@example.com');
    expect(showToast).toHaveBeenCalledWith('If an account exists for this email, a password reset link has been set.', "success");
  });

  test('handles password reset error', async () => {
    ({ sendPasswordResetEmail } = await import('../scripts/database.js'));
    sendPasswordResetEmail.mockRejectedValue(new Error('User not found'));

    await import('../scripts/forgot-password.js');

    const form = document.getElementById('forgotPasswordForm');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(sendPasswordResetEmail).toHaveBeenCalledWith({}, 'user@example.com');
    expect(global.console.error).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Could not send password reset email.', "error");
  });
});