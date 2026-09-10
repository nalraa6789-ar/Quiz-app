// frontend/js/leaderboard.js

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  renderNavbar('leaderboard');

  await loadCategoryOptions();
  await loadLeaderboard();

  ['filter-category', 'filter-difficulty', 'filter-period'].forEach(id => {
    document.getElementById(id).addEventListener('change', loadLeaderboard);
  });
});

async function loadCategoryOptions() {
  try {
    const data = await api('/categories');
    const select = document.getElementById('filter-category');
    data.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  } catch (_) { /* non-critical */ }
}

async function loadLeaderboard() {
  const card = document.getElementById('leaderboard-card');
  const category = document.getElementById('filter-category').value;
  const difficulty = document.getElementById('filter-difficulty').value;
  const period = document.getElementById('filter-period').value;

  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (difficulty) params.set('difficulty', difficulty);
  if (period) params.set('period', period);

  try {
    const data = await api(`/quiz/leaderboard?${params.toString()}`);
    if (data.leaderboard.length === 0) {
      card.innerHTML = `<div class="empty-state">No quiz attempts match these filters yet.</div>`;
      return;
    }
    card.innerHTML = `
      <table>
        <thead><tr><th>Rank</th><th>User</th><th>Score</th><th>Category</th><th>Date</th></tr></thead>
        <tbody>
          ${data.leaderboard.map((row, i) => `
            <tr>
              <td>${i < 3 ? ['🥇','🥈','🥉'][i] : `#${i + 1}`}</td>
              <td>${escapeHtml(row.username)}</td>
              <td>${Number(row.percentage).toFixed(1)}%</td>
              <td>${escapeHtml(row.category_name)}</td>
              <td class="text-muted">${formatDate(row.completed_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    card.innerHTML = `<p class="text-muted">${escapeHtml(err.message)}</p>`;
  }
}
