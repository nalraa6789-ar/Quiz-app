// backend/controllers/quizController.js
// Core quiz gameplay: starting a quiz (random questions), submitting answers
// (server-side scoring), fetching past results, and the leaderboard.

const { pool } = require('../config/database');

// POST /api/quiz/start
// Body: { categoryId, difficulty ('easy'|'medium'|'hard'|'mixed'), numQuestions }
// Returns a random set of questions WITHOUT the correct_answer/explanation
// fields, so the client can't read the answers out of the network response.
async function startQuiz(req, res) {
  try {
    const { categoryId, difficulty, numQuestions } = req.body;

    if (!categoryId || !numQuestions) {
      return res.status(400).json({ success: false, message: 'categoryId and numQuestions are required.' });
    }
    const count = Math.max(1, Math.min(50, Number(numQuestions)));

    const conditions = ['category_id = ?'];
    const params = [categoryId];
    if (difficulty && difficulty !== 'mixed') {
      conditions.push('difficulty = ?');
      params.push(difficulty);
    }

    // RAND() gives us a random, non-repeating selection straight from SQL.
    const [rows] = await pool.query(
      `SELECT id, category_id, question, option_a, option_b, option_c, option_d, difficulty
       FROM questions WHERE ${conditions.join(' AND ')}
       ORDER BY RAND() LIMIT ?`,
      [...params, count]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No questions available for that category/difficulty.' });
    }

    return res.json({
      success: true,
      quiz: {
        categoryId,
        difficulty: difficulty || 'mixed',
        totalQuestions: rows.length,
        questions: rows.map(q => ({
          id: q.id,
          question: q.question,
          optionA: q.option_a,
          optionB: q.option_b,
          optionC: q.option_c,
          optionD: q.option_d,
          difficulty: q.difficulty,
        })),
      },
    });
  } catch (err) {
    console.error('startQuiz error:', err);
    return res.status(500).json({ success: false, message: 'Server error starting quiz.' });
  }
}

// POST /api/quiz/submit
// Body: { categoryId, difficulty, timeTaken, answers: [{ questionId, selectedAnswer }] }
// Scoring happens entirely on the server so a user can't fake their score.
async function submitQuiz(req, res) {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { categoryId, difficulty, timeTaken, answers } = req.body;

    if (!categoryId || !Array.isArray(answers) || answers.length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'categoryId and a non-empty answers array are required.' });
    }

    const questionIds = answers.map(a => a.questionId);
    const [questionRows] = await conn.query(
      `SELECT id, correct_answer, explanation FROM questions WHERE id IN (?)`,
      [questionIds]
    );
    const correctMap = new Map(questionRows.map(q => [q.id, q]));

    let correctCount = 0;
    const gradedAnswers = answers.map(a => {
      const correctInfo = correctMap.get(a.questionId);
      const correctAnswer = correctInfo ? correctInfo.correct_answer : null;
      const selected = a.selectedAnswer || 'NONE';
      const isCorrect = correctAnswer !== null && selected === correctAnswer;
      if (isCorrect) correctCount += 1;
      return { questionId: a.questionId, selected, correctAnswer, isCorrect };
    });

    const total = answers.length;
    const wrong = total - correctCount;
    const percentage = Number(((correctCount / total) * 100).toFixed(2));
    const score = correctCount; // 1 point per correct answer; adjust here for weighted scoring

    await conn.beginTransaction();

    const [resultInsert] = await conn.query(
      `INSERT INTO quiz_results
        (user_id, category_id, difficulty, total_questions, correct_answers, wrong_answers, score, percentage, time_taken)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, categoryId, difficulty || 'mixed', total, correctCount, wrong, score, percentage, timeTaken || 0]
    );
    const quizResultId = resultInsert.insertId;

    const answerValues = gradedAnswers.map(a => [
      userId, quizResultId, a.questionId, a.selected, a.correctAnswer, a.isCorrect ? 1 : 0,
    ]);
    await conn.query(
      `INSERT INTO quiz_answers (user_id, quiz_result_id, question_id, selected_answer, correct_answer, is_correct)
       VALUES ?`,
      [answerValues]
    );

    await conn.commit();
    conn.release();

    let message;
    if (percentage >= 90) message = 'Excellent';
    else if (percentage >= 70) message = 'Very Good';
    else if (percentage >= 50) message = 'Good';
    else message = 'Keep Practicing';

    return res.json({
      success: true,
      result: {
        id: quizResultId,
        totalQuestions: total,
        correctAnswers: correctCount,
        wrongAnswers: wrong,
        score,
        percentage,
        timeTaken: timeTaken || 0,
        message,
      },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('submitQuiz error:', err);
    return res.status(500).json({ success: false, message: 'Server error submitting quiz.' });
  }
}

// GET /api/quiz/results  (current user's own history)
async function getMyResults(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, c.name AS category_name
       FROM quiz_results r
       JOIN categories c ON c.id = r.category_id
       WHERE r.user_id = ?
       ORDER BY r.completed_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, results: rows });
  } catch (err) {
    console.error('getMyResults error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching results.' });
  }
}

// GET /api/quiz/results/:id  (detailed review for one attempt — owner only)
async function getResultDetail(req, res) {
  try {
    const { id } = req.params;

    const [resultRows] = await pool.query(
      `SELECT r.*, c.name AS category_name FROM quiz_results r
       JOIN categories c ON c.id = r.category_id WHERE r.id = ?`,
      [id]
    );
    if (resultRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Result not found.' });
    }
    const result = resultRows[0];

    // Only the owner (or an admin) can view the detailed review.
    if (result.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You do not have access to this result.' });
    }

    const [answerRows] = await pool.query(
      `SELECT a.selected_answer, a.correct_answer, a.is_correct,
              q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.explanation
       FROM quiz_answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.quiz_result_id = ?`,
      [id]
    );

    return res.json({ success: true, result, answers: answerRows });
  } catch (err) {
    console.error('getResultDetail error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching result detail.' });
  }
}

// GET /api/quiz/leaderboard?category=&difficulty=&period=(week|month|all)
async function getLeaderboard(req, res) {
  try {
    const { category, difficulty, period } = req.query;
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('r.category_id = ?');
      params.push(category);
    }
    if (difficulty && difficulty !== 'mixed') {
      conditions.push('r.difficulty = ?');
      params.push(difficulty);
    }
    if (period === 'week') {
      conditions.push('r.completed_at >= (NOW() - INTERVAL 7 DAY)');
    } else if (period === 'month') {
      conditions.push('r.completed_at >= (NOW() - INTERVAL 30 DAY)');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT u.username, r.percentage, r.score, c.name AS category_name, r.completed_at
       FROM quiz_results r
       JOIN users u ON u.id = r.user_id
       JOIN categories c ON c.id = r.category_id
       ${whereClause}
       ORDER BY r.percentage DESC, r.time_taken ASC
       LIMIT 50`,
      params
    );

    return res.json({ success: true, leaderboard: rows });
  } catch (err) {
    console.error('getLeaderboard error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching leaderboard.' });
  }
}

module.exports = { startQuiz, submitQuiz, getMyResults, getResultDetail, getLeaderboard };
