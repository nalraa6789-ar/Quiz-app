// frontend/js/result.js

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  renderNavbar('dashboard');

  const params = new URLSearchParams(window.location.search);
  const resultId = params.get('id');
  if (!resultId) {
    window.location.href = 'dashboard.html';
    return;
  }

  try {
    const data = await api(`/quiz/results/${resultId}`);
    renderSummary(data.result);
    renderReview(data.answers);
  } catch (err) {
    document.getElementById('result-summary').innerHTML = `<p class="text-muted">${escapeHtml(err.message)}</p>`;
  }
});

function messageFor(percentage) {
  if (percentage >= 90) return { text: 'Excellent! 🏆', color: 'var(--success)' };
  if (percentage >= 70) return { text: 'Very Good! 🎉', color: 'var(--success)' };
  if (percentage >= 50) return { text: 'Good 👍', color: 'var(--warning)' };
  return { text: 'Keep Practicing 💪', color: 'var(--danger)' };
}

function renderSummary(r) {
  const msg = messageFor(Number(r.percentage));
  const minutes = Math.floor(r.time_taken / 60);
  const seconds = r.time_taken % 60;

  document.getElementById('result-summary').innerHTML = `
    <h1 style="color:${msg.color};margin-bottom:4px;">${msg.text}</h1>
    <div style="font-size:2.4rem;font-weight:800;margin:10px 0;">${r.score} / ${r.total_questions}</div>
    <div class="text-muted mb-16">${Number(r.percentage).toFixed(1)}% correct</div>

    <div class="grid grid-4 mb-16">
      <div><div class="stat-value" style="font-size:1.3rem;">${r.correct_answers}</div><div class="stat-label">Correct</div></div>
      <div><div class="stat-value" style="font-size:1.3rem;color:var(--danger);">${r.wrong_answers}</div><div class="stat-label">Incorrect</div></div>
      <div><div class="stat-value" style="font-size:1.3rem;">${r.category_name}</div><div class="stat-label">Category</div></div>
      <div><div class="stat-value" style="font-size:1.3rem;">${minutes}m ${seconds}s</div><div class="stat-label">Time Taken</div></div>
    </div>

    <div class="flex gap-12" style="justify-content:center;flex-wrap:wrap;">
      <button class="btn btn-outline" onclick="document.getElementById('review-section').scrollIntoView({behavior:'smooth'})">Review Answers</button>
      <a class="btn btn-primary" href="quiz.html?categoryId=${r.category_id}&categoryName=${encodeURIComponent(r.category_name)}&difficulty=${r.difficulty}&numQuestions=${r.total_questions}">Try Again</a>
      <a class="btn btn-outline" href="dashboard.html">Back to Dashboard</a>
    </div>
  `;
}

function renderReview(answers) {
  const section = document.getElementById('review-section');
  const list = document.getElementById('review-list');
  section.classList.remove('hidden');

  list.innerHTML = answers.map((a, i) => {
    const options = { A: a.option_a, B: a.option_b, C: a.option_c, D: a.option_d };
    return `
      <div class="card mb-16">
        <div class="flex-between mb-8">
          <strong>Question ${i + 1}</strong>
          <span class="badge ${a.is_correct ? 'badge-easy' : 'badge-hard'}">${a.is_correct ? 'Correct' : 'Incorrect'}</span>
        </div>
        <p>${escapeHtml(a.question)}</p>
        ${Object.entries(options).map(([letter, text]) => {
          let cls = '';
          if (letter === a.correct_answer) cls = 'correct';
          else if (letter === a.selected_answer && !a.is_correct) cls = 'incorrect';
          return `<div class="option-btn ${cls}" style="cursor:default;">
                    <span class="option-letter">${letter}</span><span>${escapeHtml(text)}</span>
                  </div>`;
        }).join('')}
        ${a.explanation ? `<p class="text-muted mt-8" style="font-size:.85rem;"><strong>Explanation:</strong> ${escapeHtml(a.explanation)}</p>` : ''}
      </div>
    `;
  }).join('');
}
