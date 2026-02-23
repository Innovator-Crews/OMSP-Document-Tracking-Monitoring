/* ==============================================
 * login.js
 * PURPOSE: Login page controller. Handles the
 * login form submission, credential validation,
 * error display, and redirect on success.
 *
 * CONTAINS:
 *  - handleLogin(event) → Form submit handler
 *  - fillDemo(email, pw) → Auto-fill demo creds
 *  - redirectToDashboard() → Post-login redirect
 *
 * USED BY: index.html
 * DEPENDS ON: auth.js (login), toast.js (showToast), seed.js (initializeApp)
 * ============================================== */

// Initialize app on page load (seeds default data if first visit)
document.addEventListener('DOMContentLoaded', function () {
  initializeApp();

  // If already logged in, redirect to dashboard
  var session = getSession();
  if (session) {
    redirectToDashboard();
  }
});

/**
 * Handle login form submission.
 * Validates email + password against localStorage users.
 * On success: redirects to dashboard.
 * On failure: shows error message.
 *
 * @param {Event} event - Form submit event
 */
function handleLogin(event) {
  event.preventDefault();

  var email = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  var errorEl = document.getElementById('loginError');
  var btn = document.getElementById('loginBtn');

  // Clear previous errors
  errorEl.style.display = 'none';

  if (!email || !password) {
    errorEl.textContent = 'Please enter both email and password.';
    errorEl.style.display = 'block';
    return;
  }

  // Disable button briefly to prevent double-submit
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  // Simulate brief delay for UX
  setTimeout(function () {
    var user = login(email, password);

    if (user) {
      showToast('Welcome, ' + user.full_name + '!', 'success');
      setTimeout(redirectToDashboard, 500);
    } else {
      errorEl.textContent = 'Invalid email or password. Please try again.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Sign In';

      // Shake animation
      var card = document.querySelector('.login-card');
      card.style.animation = 'shake 0.4s';
      setTimeout(function () { card.style.animation = ''; }, 400);
    }
  }, 300);
}

/**
 * Fill demo credentials into the login form.
 * Called by the demo account quick-login buttons.
 *
 * @param {string} email    - Demo email
 * @param {string} password - Demo password
 */
function fillDemo(email, password) {
  document.getElementById('email').value = email;
  document.getElementById('password').value = password;
}

/**
 * Redirect to the main dashboard after successful login
 */
function redirectToDashboard() {
  window.location.href = 'dashboard.html';
}
