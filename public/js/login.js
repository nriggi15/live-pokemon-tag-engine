document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginMessage = document.getElementById('loginMessage');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      loginMessage.textContent = 'Please enter email and password.';
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ Successful login
        window.location.href = '/dashboard';
      } else if (response.status === 403 && data.message.includes('banned')) {
        // 🚫 User banned
        loginMessage.textContent = '🚫 Your account has been banned. Please contact support.';
      } else if (response.status === 403 && data.message.includes('verify')) {
        // 📩 Email verification pending
        loginMessage.textContent = '📩 Please verify your email before logging in.';
      } else {
        // ❌ General login errors
        loginMessage.textContent = data.message || 'Login failed. Please try again.';
      }

    } catch (err) {
      console.error('Login request error:', err);
      loginMessage.textContent = 'An error occurred. Please try again later.';
    }
  });
});
