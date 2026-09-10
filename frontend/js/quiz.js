// frontend/js/quiz.js
// Handles the live quiz: loading random questions, single-question-at-a-time
// navigation, per-question countdown, progress bar, and final submission.

let quizState = {
  categoryId: null,
  categoryName: '',
  difficulty: 'mixed',
  questions: [],
  currentIndex: 0,
  answers: {},       // { questionId: 'A' | 'B' | 'C' | 'D' }
  startedAt: null,
  timerInterval: null,
  secondsPerQuestion: 30,
  timeLeft: 30,
};

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  renderNavbar('dashboard');

  const params = new URLSearchParams(window.location.search);
  quizState.categoryId = params.get('categoryId');
  quizState.categoryName = params.get('categoryName') || 'Quiz';
  quizState.difficulty = params.get('difficulty') || 'mixed';
  const numQuestions = Number(params.get('numQuestions')) || 10;

  if (!quizState.categoryId) {
    toast('No category selected.', 'error');
    window.location.href = 'dashboard.html';
    return;
  }

  try {
    const data = await api('/quiz/start', {
      method: 'POST',
      body: { categoryId: quizState.categoryId, difficulty: quizState.difficulty, numQuestions },
    });
    quizState.questions = data.quiz.questions;
    quizState.startedAt = Date.now();

    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('quiz-wrap').classList.remove('hidden');
    document.getElementById('category-label').textContent = `${quizState.categoryName} · ${quizState.difficulty}`;

    renderQuestion();
  } catch (err) {
    document.getElementById('loading-state').innerHTML = `<p class="text-muted">${escapeHtml(err.message)}</p>
      <a href="dashboard.html" class="btn btn-outline mt-16">Back to Dashboard</a>`;
  }
});

function renderQuestion() {
  const q = quizState.questions[quizState.currentIndex];
  const total = quizState.questions.length;

  document.getElementById('question-counter').textContent = `Question ${quizState.currentIndex + 1} of ${total}`;
  document.getElementById('question-text').textContent = q.question;
  document.getElementById('progress-fill').style.width = `${((quizState.currentIndex) / total) * 100}%`;

  const options = [
    ['A', q.optionA], ['B', q.optionB], ['C', q.optionC], ['D', q.optionD],
  ];
  const selected = quizState.answers[q.id];

  document.getElementById('options-wrap').innerHTML = options.map(([letter, text]) => `
    <button class="option-btn ${selected === letter ? 'selected' : ''}" onclick="selectAnswer('${letter}')">
      <span class="option-letter">${letter}</span>
      <span>${escapeHtml(text)}</span>
    </button>
  `).join('');

  document.getElementById('prev-btn').disabled = quizState.currentIndex === 0;
  document.getElementById('next-btn').textContent = quizState.currentIndex === total - 1 ? 'Submit Quiz' : 'Next →';

  startTimer();
}

function selectAnswer(letter) {
  const q = quizState.questions[quizState.currentIndex];
  quizState.answers[q.id] = letter;
  renderQuestion();
}

function startTimer() {
  clearInterval(quizState.timerInterval);
  quizState.timeLeft = quizState.secondsPerQuestion;
  updateTimerDisplay();

  quizState.timerInterval = setInterval(() => {
    quizState.timeLeft -= 1;
    updateTimerDisplay();
    if (quizState.timeLeft <= 0) {
      clearInterval(quizState.timerInterval);
      // Auto-advance (or auto-submit on the last question) when time runs out.
      if (quizState.currentIndex === quizState.questions.length - 1) {
        finishQuiz();
      } else {
        quizState.currentIndex += 1;
        renderQuestion();
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timer');
  const m = String(Math.floor(Math.max(0, quizState.timeLeft) / 60)).padStart(2, '0');
  const s = String(Math.max(0, quizState.timeLeft) % 60).padStart(2, '0');
  el.textContent = `${m}:${s}`;
  el.classList.toggle('low', quizState.timeLeft <= 10);
}

function prevQuestion() {
  if (quizState.currentIndex === 0) return;
  quizState.currentIndex -= 1;
  renderQuestion();
}

function nextQuestion() {
  const isLast = quizState.currentIndex === quizState.questions.length - 1;
  if (isLast) {
    finishQuiz();
  } else {
    quizState.currentIndex += 1;
    renderQuestion();
  }
}

async function finishQuiz() {
  clearInterval(quizState.timerInterval);
  const nextBtn = document.getElementById('next-btn');
  nextBtn.disabled = true;
  nextBtn.innerHTML = '<span class="spinner"></span> Submitting...';

  const timeTaken = Math.round((Date.now() - quizState.startedAt) / 1000);
  const answers = quizState.questions.map(q => ({
    questionId: q.id,
    selectedAnswer: quizState.answers[q.id] || null,
  }));

  try {
    const data = await api('/quiz/submit', {
      method: 'POST',
      body: {
        categoryId: quizState.categoryId,
        difficulty: quizState.difficulty,
        timeTaken,
        answers,
      },
    });
    window.location.href = `result.html?id=${data.result.id}`;
  } catch (err) {
    toast(err.message, 'error');
    nextBtn.disabled = false;
    nextBtn.textContent = 'Submit Quiz';
  }
}

window.addEventListener('beforeunload', (e) => {
  if (quizState.questions.length && !document.getElementById('quiz-wrap').classList.contains('hidden')) {
    e.preventDefault();
    e.returnValue = '';
  }
});
