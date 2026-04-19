// __tests__/forgot-password.test.js

jest.mock('../scripts/database.js', () => ({
  auth: {},
  sendPasswordResetEmail: jest.fn()
}));

describe('forgot-password.js', () => {
  let sendPasswordResetEmail;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    document.body.innerHTML = `
      <form id="forgotPasswordForm">
        <input type="email" id="resetEmail" value="user@example.com" />
        <button type="submit">Send</button>
      </form>
    `;

    global.alert = jest.fn();
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
    expect(global.alert).toHaveBeenCalledWith(
      'If an account exists for this email, a password reset link has been set.'
    );
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
    expect(global.alert).toHaveBeenCalledWith('User not found');
  });
});