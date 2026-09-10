// frontend/js/dashboard.js

let selectedCategory = null;

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  renderNavbar('dashboard');

  const user = getUser();
  document.getElementById('welcome-msg').textContent = `Welcome, ${user.fullName.split(' ')[0]}! 👋`;

  await Promise.all([loadStats(), loadCategories(), loadHistory()]);
});

async function loadStats() {
  try {
    const data = await api('/users/profile');
    document.getElementById('stat-total').textContent = data.stats.totalQuizzes;
    document.getElementById('stat-avg').textContent = `${data.stats.averageScore}%`;
    document.getElementById('stat-best').textContent = `${data.stats.highestScore}%`;
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function loadCategories() {
  const grid = document.getElementById('categories-grid');
  try {
    const data = await api('/categories');
    if (data.categories.length === 0) {
      grid.innerHTML = `<p class="text-muted">No categories yet. Check back soon.</p>`;
      return;
    }
    const icons = { HTML: '🌐', CSS: '🎨', JavaScript: '⚡', 'C Programming': '💻', Database: '🗄️', 'General Knowledge': '🧩' };
    grid.innerHTML = data.categories.map(c => `
      <div class="card card-hover" onclick="openStartModal(${c.id}, '${escapeHtml(c.name)}')">
        <div style="font-size:1.6rem;">${icons[c.name] || '📚'}</div>
        <h3 class="mt-8" style="margin-bottom:4px;">${escapeHtml(c.name)}</h3>
        <p class="text-muted" style="font-size:.85rem;margin:0 0 8px;">${escapeHtml(c.description || '')}</p>
        <span class="badge badge-easy">${c.question_count} question${c.question_count === 1 ? '' : 's'}</span>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<p class="text-muted">Could not load categories: ${escapeHtml(err.message)}</p>`;
  }
}

async function loadHistory() {
  const card = document.getElementById('history-card');
  try {
    const data = await api('/quiz/results');
    const results = data.results.slice(0, 5);
    if (results.length === 0) {
      card.innerHTML = `<div class="empty-state">No quizzes taken yet — pick a category above to get started!</div>`;
      return;
    }
    card.innerHTML = `
      <table>
        <thead><tr><th>Category</th><th>Score</th><th>Date</th><th></th></tr></thead>
        <tbody>
          ${results.map(r => `
            <tr>
              <td>${escapeHtml(r.category_name)}</td>
              <td>${r.correct_answers}/${r.total_questions} (${Number(r.percentage).toFixed(0)}%)</td>
              <td class="text-muted">${formatDate(r.completed_at)}</td>
              <td><a href="result.html?id=${r.id}">Review →</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    card.innerHTML = `<p class="text-muted">Could not load history.</p>`;
  }
}

function openStartModal(categoryId, categoryName) {
  selectedCategory = { id: categoryId, name: categoryName };
  document.getElementById('modal-category-name').textContent = `Start Quiz: ${categoryName}`;
  document.getElementById('start-modal').classList.add('open');
}
function closeStartModal() {
  document.getElementById('start-modal').classList.remove('open');
}
function beginQuiz() {
  const difficulty = document.getElementById('modal-difficulty').value;
  const numQuestions = document.getElementById('modal-num-questions').value;
  const params = new URLSearchParams({
    categoryId: selectedCategory.id,
    categoryName: selectedCategory.name,
    difficulty,
    numQuestions,
  });
  window.location.href = `quiz.html?${params.toString()}`;
}
