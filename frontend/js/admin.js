// frontend/js/admin.js
// Powers every page under /admin: dashboard stats, question CRUD,
// category CRUD, and user management. Each function checks which
// page-specific elements exist before running, so this one file can be
// shared across all admin pages.

let categoriesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  requireAdmin();
  renderNavbar('admin');

  if (document.getElementById('stats-grid')) await loadDashboardStats();
  if (document.getElementById('questions-table')) await initQuestionsPage();
  if (document.getElementById('categories-admin-grid')) await initCategoriesPage();
  if (document.getElementById('users-table')) await initUsersPage();
});

/* ============================== DASHBOARD ============================== */

async function loadDashboardStats() {
  try {
    const data = await api('/admin/dashboard');
    const s = data.stats;
    document.getElementById('stats-grid').innerHTML = `
      <div class="card stat-card"><div class="stat-value">${s.totalUsers}</div><div class="stat-label">Total Users</div></div>
      <div class="card stat-card"><div class="stat-value">${s.totalQuizzes}</div><div class="stat-label">Total Quizzes</div></div>
      <div class="card stat-card"><div class="stat-value">${s.totalQuestions}</div><div class="stat-label">Total Questions</div></div>
      <div class="card stat-card"><div class="stat-value">${s.totalCategories}</div><div class="stat-label">Categories</div></div>
    `;
    const recentCard = document.getElementById('recent-card');
    if (data.recentAttempts.length === 0) {
      recentCard.innerHTML = `<div class="empty-state">No quiz attempts yet.</div>`;
    } else {
      recentCard.innerHTML = `
        <table>
          <thead><tr><th>User</th><th>Category</th><th>Score</th><th>Date</th></tr></thead>
          <tbody>
            ${data.recentAttempts.map(a => `
              <tr>
                <td>${escapeHtml(a.username)}</td>
                <td>${escapeHtml(a.category_name)}</td>
                <td>${Number(a.percentage).toFixed(1)}%</td>
                <td class="text-muted">${formatDate(a.completed_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ============================== QUESTIONS ============================== */

async function initQuestionsPage() {
  await loadCategoriesCache();
  populateCategoryFilters();
  await loadQuestions();

  document.getElementById('search-input').addEventListener('input', debounce(loadQuestions, 350));
  document.getElementById('filter-category').addEventListener('change', loadQuestions);
  document.getElementById('filter-difficulty').addEventListener('change', loadQuestions);
  document.getElementById('question-form').addEventListener('submit', saveQuestion);
}

function populateCategoryFilters() {
  const selects = document.querySelectorAll('#filter-category, #q-category');
  selects.forEach(select => {
    const isFilter = select.id === 'filter-category';
    select.innerHTML = (isFilter ? '<option value="">All Categories</option>' : '') +
      categoriesCache.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  });
}

async function loadCategoriesCache() {
  const data = await api('/categories');
  categoriesCache = data.categories;
}

async function loadQuestions() {
  const tbody = document.querySelector('#questions-table tbody');
  const search = document.getElementById('search-input').value;
  const category = document.getElementById('filter-category').value;
  const difficulty = document.getElementById('filter-difficulty').value;

  const params = new URLSearchParams({ limit: 100 });
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (difficulty) params.set('difficulty', difficulty);

  try {
    const data = await api(`/questions?${params.toString()}`);
    if (data.questions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="padding:20px;">No questions found.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.questions.map(q => `
      <tr>
        <td style="max-width:320px;">${escapeHtml(q.question)}</td>
        <td>${escapeHtml(q.category_name)}</td>
        <td><span class="badge badge-${q.difficulty}">${q.difficulty}</span></td>
        <td>${q.correct_answer}</td>
        <td class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick='editQuestion(${JSON.stringify(q)})'>Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteQuestion(${q.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="padding:20px;">${escapeHtml(err.message)}</td></tr>`;
  }
}

function openQuestionModal() {
  document.getElementById('question-form').reset();
  document.getElementById('q-id').value = '';
  document.getElementById('question-modal-title').textContent = 'Add Question';
  document.getElementById('question-form-error').style.display = 'none';
  document.getElementById('question-modal').classList.add('open');
}
function closeQuestionModal() {
  document.getElementById('question-modal').classList.remove('open');
}
function editQuestion(q) {
  document.getElementById('q-id').value = q.id;
  document.getElementById('q-category').value = q.category_id;
  document.getElementById('q-text').value = q.question;
  document.getElementById('q-a').value = q.option_a;
  document.getElementById('q-b').value = q.option_b;
  document.getElementById('q-c').value = q.option_c;
  document.getElementById('q-d').value = q.option_d;
  document.getElementById('q-correct').value = q.correct_answer;
  document.getElementById('q-difficulty').value = q.difficulty;
  document.getElementById('q-explanation').value = q.explanation || '';
  document.getElementById('question-modal-title').textContent = 'Edit Question';
  document.getElementById('question-form-error').style.display = 'none';
  document.getElementById('question-modal').classList.add('open');
}

async function saveQuestion(e) {
  e.preventDefault();
  const id = document.getElementById('q-id').value;
  const body = {
    categoryId: document.getElementById('q-category').value,
    question: document.getElementById('q-text').value.trim(),
    optionA: document.getElementById('q-a').value.trim(),
    optionB: document.getElementById('q-b').value.trim(),
    optionC: document.getElementById('q-c').value.trim(),
    optionD: document.getElementById('q-d').value.trim(),
    correctAnswer: document.getElementById('q-correct').value,
    difficulty: document.getElementById('q-difficulty').value,
    explanation: document.getElementById('q-explanation').value.trim(),
  };

  const btn = document.getElementById('question-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    if (id) {
      await api(`/questions/${id}`, { method: 'PUT', body });
    } else {
      await api('/questions', { method: 'POST', body });
    }
    toast('Question saved.', 'success');
    closeQuestionModal();
    await loadQuestions();
  } catch (err) {
    const box = document.getElementById('question-form-error');
    box.textContent = err.message;
    box.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Question';
  }
}

async function deleteQuestion(id) {
  if (!confirm('Delete this question? This cannot be undone.')) return;
  try {
    await api(`/questions/${id}`, { method: 'DELETE' });
    toast('Question deleted.', 'success');
    await loadQuestions();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ============================== CATEGORIES ============================== */

async function initCategoriesPage() {
  await loadCategoriesAdmin();
  document.getElementById('category-form').addEventListener('submit', saveCategory);
}

async function loadCategoriesAdmin() {
  const grid = document.getElementById('categories-admin-grid');
  try {
    const data = await api('/categories');
    categoriesCache = data.categories;
    if (data.categories.length === 0) {
      grid.innerHTML = `<div class="empty-state">No categories yet.</div>`;
      return;
    }
    grid.innerHTML = data.categories.map(c => `
      <div class="card">
        <h3 style="margin-top:0;">${escapeHtml(c.name)}</h3>
        <p class="text-muted" style="font-size:.85rem;">${escapeHtml(c.description || 'No description')}</p>
        <span class="badge badge-easy">${c.question_count} question${c.question_count === 1 ? '' : 's'}</span>
        <div class="flex gap-8 mt-16">
          <button class="btn btn-outline btn-sm" onclick='editCategory(${JSON.stringify(c)})'>Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCategory(${c.id})">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<p class="text-muted">${escapeHtml(err.message)}</p>`;
  }
}

function openCategoryModal() {
  document.getElementById('category-form').reset();
  document.getElementById('c-id').value = '';
  document.getElementById('category-modal-title').textContent = 'Add Category';
  document.getElementById('category-form-error').style.display = 'none';
  document.getElementById('category-modal').classList.add('open');
}
function closeCategoryModal() {
  document.getElementById('category-modal').classList.remove('open');
}
function editCategory(c) {
  document.getElementById('c-id').value = c.id;
  document.getElementById('c-name').value = c.name;
  document.getElementById('c-description').value = c.description || '';
  document.getElementById('category-modal-title').textContent = 'Edit Category';
  document.getElementById('category-form-error').style.display = 'none';
  document.getElementById('category-modal').classList.add('open');
}

async function saveCategory(e) {
  e.preventDefault();
  const id = document.getElementById('c-id').value;
  const body = {
    name: document.getElementById('c-name').value.trim(),
    description: document.getElementById('c-description').value.trim(),
  };

  const btn = document.getElementById('category-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    if (id) {
      await api(`/categories/${id}`, { method: 'PUT', body });
    } else {
      await api('/categories', { method: 'POST', body });
    }
    toast('Category saved.', 'success');
    closeCategoryModal();
    await loadCategoriesAdmin();
  } catch (err) {
    const box = document.getElementById('category-form-error');
    box.textContent = err.message;
    box.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Category';
  }
}

async function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  try {
    await api(`/categories/${id}`, { method: 'DELETE' });
    toast('Category deleted.', 'success');
    await loadCategoriesAdmin();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ============================== USERS ============================== */

async function initUsersPage() {
  await loadUsers();
  document.getElementById('search-input').addEventListener('input', debounce(loadUsers, 350));
}

async function loadUsers() {
  const tbody = document.querySelector('#users-table tbody');
  const search = document.getElementById('search-input').value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);

  try {
    const data = await api(`/admin/users?${params.toString()}`);
    const currentUser = getUser();
    if (data.users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px;">No users found.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.users.map(u => `
      <tr>
        <td>${escapeHtml(u.full_name)}</td>
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>
          <select onchange="changeUserRole(${u.id}, this.value)" ${u.id === currentUser.id ? 'disabled' : ''}>
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </td>
        <td><span class="badge ${u.is_active ? 'badge-easy' : 'badge-hard'}">${u.is_active ? 'Active' : 'Disabled'}</span></td>
        <td class="text-muted">${formatDate(u.created_at)}</td>
        <td class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="toggleUserActive(${u.id}, ${!u.is_active})" ${u.id === currentUser.id ? 'disabled' : ''}>
            ${u.is_active ? 'Disable' : 'Enable'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})" ${u.id === currentUser.id ? 'disabled' : ''}>Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px;">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function changeUserRole(id, role) {
  try {
    await api(`/admin/users/${id}`, { method: 'PUT', body: { role } });
    toast('User role updated.', 'success');
  } catch (err) {
    toast(err.message, 'error');
    await loadUsers();
  }
}

async function toggleUserActive(id, isActive) {
  try {
    await api(`/admin/users/${id}`, { method: 'PUT', body: { isActive } });
    toast(isActive ? 'User enabled.' : 'User disabled.', 'success');
    await loadUsers();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('Permanently delete this user and all of their quiz history?')) return;
  try {
    await api(`/admin/users/${id}`, { method: 'DELETE' });
    toast('User deleted.', 'success');
    await loadUsers();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ============================== UTIL ============================== */

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
