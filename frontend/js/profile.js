// frontend/js/profile.js

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  renderNavbar('profile');
  await loadProfile();

  document.getElementById('profile-form').addEventListener('submit', handleSave);
});

async function loadProfile() {
  try {
    const data = await api('/users/profile');
    const { user, stats } = data;

    document.getElementById('profile-summary').innerHTML = `
      <div class="flex gap-16" style="align-items:center;">
        <div class="avatar-sm" style="width:60px;height:60px;font-size:1.3rem;">
          ${user.profileImage ? `<img src="${user.profileImage}" alt="">` : user.fullName.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
        </div>
        <div>
          <h2 style="margin:0;">${escapeHtml(user.fullName)}</h2>
          <p class="text-muted" style="margin:2px 0;">@${escapeHtml(user.username)} · ${escapeHtml(user.email)}</p>
          <p class="text-muted" style="font-size:.8rem;margin:0;">Joined ${formatDate(user.createdAt)}</p>
        </div>
      </div>
      <div class="grid grid-3 mt-24">
        <div class="stat-card"><div class="stat-value">${stats.totalQuizzes}</div><div class="stat-label">Quizzes Completed</div></div>
        <div class="stat-card"><div class="stat-value">${stats.averageScore}%</div><div class="stat-label">Average Score</div></div>
        <div class="stat-card"><div class="stat-value">${stats.highestScore}%</div><div class="stat-label">Highest Score</div></div>
      </div>
    `;

    document.getElementById('fullName').value = user.fullName;
    document.getElementById('username').value = user.username;
    document.getElementById('email').value = user.email;
    document.getElementById('profileImage').value = user.profileImage || '';
  } catch (err) {
    document.getElementById('profile-summary').innerHTML = `<p class="text-muted">${escapeHtml(err.message)}</p>`;
  }
}

async function handleSave(e) {
  e.preventDefault();
  const errorBox = document.getElementById('form-error');
  const successBox = document.getElementById('form-success');
  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  const body = {
    fullName: document.getElementById('fullName').value.trim(),
    username: document.getElementById('username').value.trim(),
    profileImage: document.getElementById('profileImage').value.trim(),
  };
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  if (newPassword) {
    body.currentPassword = currentPassword;
    body.newPassword = newPassword;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    await api('/users/profile', { method: 'PUT', body });

    // Keep the locally stored user in sync (navbar, greeting, etc).
    const user = getUser();
    user.fullName = body.fullName;
    user.username = body.username;
    user.profileImage = body.profileImage;
    const remember = !!localStorage.getItem('quiz_token');
    saveSession(getToken(), user, remember);

    successBox.textContent = 'Profile updated successfully.';
    successBox.style.display = 'block';
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    renderNavbar('profile');
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}
