// frontend/js/common.js
// Shared helpers used across every page: API calls, auth storage, toasts,
// navbar rendering, theme toggle.

const API_BASE = '/api';

// ---------- Token / user storage ----------
function saveSession(token, user, remember) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('quiz_token', token);
  storage.setItem('quiz_user', JSON.stringify(user));
}
function getToken() {
  return localStorage.getItem('quiz_token') || sessionStorage.getItem('quiz_token');
}
function getUser() {
  const raw = localStorage.getItem('quiz_user') || sessionStorage.getItem('quiz_user');
  return raw ? JSON.parse(raw) : null;
}
function clearSession() {
  localStorage.removeItem('quiz_token');
  localStorage.removeItem('quiz_user');
  sessionStorage.removeItem('quiz_token');
  sessionStorage.removeItem('quiz_user');
}
function isLoggedIn() { return !!getToken(); }

// Pages under /admin/ sit one directory deeper, so redirects back to the
// main app need a '../' prefix.
function rootPath() {
  return window.location.pathname.includes('/admin/') ? '../' : '';
}

// Redirect helpers used at the top of protected/guest-only pages.
function requireAuth() {
  if (!isLoggedIn()) window.location.href = `${rootPath()}login.html`;
}
function requireAdmin() {
  requireAuth();
  const user = getUser();
  if (!user || user.role !== 'admin') window.location.href = `${rootPath()}dashboard.html`;
}
function redirectIfLoggedIn() {
  if (isLoggedIn()) window.location.href = `${rootPath()}dashboard.html`;
}

// ---------- API wrapper ----------
async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers['Authorization'] = `Bearer ${getToken()}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error('Could not reach the server. Please check your connection and that the backend is running.');
  }

  let data = {};
  try { data = await response.json(); } catch (_) { /* no JSON body */ }

  if (response.status === 401) {
    clearSession();
    if (!location.pathname.endsWith('login.html')) {
      window.location.href = `${rootPath()}login.html`;
    }
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

// ---------- Toasts ----------
function toast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ---------- Theme ----------
function initTheme() {
  const saved = localStorage.getItem('quiz_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('quiz_theme', next);
}
initTheme();

// ---------- Navbar ----------
function renderNavbar(activePage) {
  const mount = document.getElementById('navbar-mount');
  if (!mount) return;
  const user = getUser();

  // Pages under /admin/ are one directory deeper, so links back to the main
  // app need a '../' prefix while the admin link itself doesn't.
  const inAdminFolder = window.location.pathname.includes('/admin/');
  const root = inAdminFolder ? '../' : '';
  const adminHref = inAdminFolder ? 'dashboard.html' : 'admin/dashboard.html';

  const links = user
    ? [
        [`${root}dashboard.html`, 'Dashboard'],
        [`${root}leaderboard.html`, 'Leaderboard'],
        [`${root}profile.html`, 'Profile'],
        ...(user.role === 'admin' ? [[adminHref, 'Admin']] : []),
      ]
    : [
        [`${root}login.html`, 'Login'],
        [`${root}register.html`, 'Register'],
      ];

  const linksHtml = links.map(([href, label]) => {
    const isActive = activePage === label.toLowerCase();
    return `<a href="${href}" class="${isActive ? 'active' : ''}">${label}</a>`;
  }).join('');

  const initials = user ? user.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '';

  mount.innerHTML = `
    <div class="brand">📝 QuizApp</div>
    <nav>
      ${linksHtml}
      <button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme">🌓</button>
      ${user ? `
        <div class="user-chip">
          <div class="avatar-sm">${user.profileImage ? `<img src="${user.profileImage}" alt="">` : initials}</div>
          <span>${user.fullName.split(' ')[0]}</span>
          <button class="btn btn-outline btn-sm" onclick="logout()">Logout</button>
        </div>
      ` : ''}
    </nav>
  `;
}

async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch (_) { /* ignore */ }
  clearSession();
  window.location.href = `${rootPath()}login.html`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
