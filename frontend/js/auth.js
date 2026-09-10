// frontend/js/auth.js
// Handles the Register and Login page forms.

document.addEventListener('DOMContentLoaded', () => {
  redirectIfLoggedIn();

  const registerForm = document.getElementById('register-form');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
});

function showFormError(msg) {
  const box = document.getElementById('form-error');
  if (!box) return;
  box.textContent = msg;
  box.style.display = 'block';
}
function hideFormError() {
  const box = document.getElementById('form-error');
  if (box) box.style.display = 'none';
}

async function handleRegister(e) {
  e.preventDefault();
  hideFormError();

  const fullName = document.getElementById('fullName').value.trim();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!fullName || !username || !email || !password || !confirmPassword) {
    return showFormError('Please fill in all fields.');
  }
  if (password !== confirmPassword) {
    return showFormError('Password and Confirm Password do not match.');
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating account...';

  try {
    const data = await api('/auth/register', {
      method: 'POST',
      auth: false,
      body: { fullName, username, email, password, confirmPassword },
    });
    saveSession(data.token, data.user, true);
    toast('Account created! Welcome.', 'success');
    window.location.href = 'dashboard.html';
  } catch (err) {
    showFormError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  hideFormError();

  const identifier = document.getElementById('identifier').value.trim();
  const password = document.getElementById('password').value;
  const remember = document.getElementById('remember')?.checked;

  if (!identifier || !password) {
    return showFormError('Please enter your email/username and password.');
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Logging in...';

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      auth: false,
      body: { identifier, password },
    });
    saveSession(data.token, data.user, !!remember);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showFormError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}
