// backend/controllers/questionController.js
// Full CRUD for questions, used by the Admin question-management screens.

const { pool } = require('../config/database');

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const VALID_ANSWERS = ['A', 'B', 'C', 'D'];

// GET /api/questions?category=&difficulty=&search=&page=&limit=
async function getQuestions(req, res) {
  try {
    const { category, difficulty, search, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('q.category_id = ?');
      params.push(category);
    }
    if (difficulty) {
      conditions.push('q.difficulty = ?');
      params.push(difficulty);
    }
    if (search) {
      conditions.push('q.question LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [rows] = await pool.query(
      `SELECT q.*, c.name AS category_name
       FROM questions q
       JOIN categories c ON c.id = q.category_id
       ${whereClause}
       ORDER BY q.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM questions q ${whereClause}`,
      params
    );

    return res.json({ success: true, questions: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('getQuestions error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching questions.' });
  }
}

// GET /api/questions/:id
async function getQuestionById(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT q.*, c.name AS category_name FROM questions q
       JOIN categories c ON c.id = q.category_id WHERE q.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }
    return res.json({ success: true, question: rows[0] });
  } catch (err) {
    console.error('getQuestionById error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching question.' });
  }
}

function validateQuestionBody(body) {
  const { categoryId, question, optionA, optionB, optionC, optionD, correctAnswer, difficulty } = body;
  if (!categoryId || !question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
    return 'All question fields (category, question text, 4 options, correct answer) are required.';
  }
  if (!VALID_ANSWERS.includes(correctAnswer)) {
    return 'Correct answer must be one of A, B, C, D.';
  }
  if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
    return 'Difficulty must be easy, medium, or hard.';
  }
  return null;
}

// POST /api/questions  (admin only)
async function createQuestion(req, res) {
  try {
    const error = validateQuestionBody(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const { categoryId, question, optionA, optionB, optionC, optionD, correctAnswer, explanation, difficulty } = req.body;

    const [result] = await pool.query(
      `INSERT INTO questions
        (category_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [categoryId, question, optionA, optionB, optionC, optionD, correctAnswer, explanation || null, difficulty || 'medium']
    );

    return res.status(201).json({ success: true, message: 'Question created.', questionId: result.insertId });
  } catch (err) {
    console.error('createQuestion error:', err);
    return res.status(500).json({ success: false, message: 'Server error creating question.' });
  }
}

// PUT /api/questions/:id  (admin only)
async function updateQuestion(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM questions WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }
    const existing = rows[0];

    if (req.body.correctAnswer && !VALID_ANSWERS.includes(req.body.correctAnswer)) {
      return res.status(400).json({ success: false, message: 'Correct answer must be one of A, B, C, D.' });
    }
    if (req.body.difficulty && !VALID_DIFFICULTIES.includes(req.body.difficulty)) {
      return res.status(400).json({ success: false, message: 'Difficulty must be easy, medium, or hard.' });
    }

    const merged = {
      category_id: req.body.categoryId ?? existing.category_id,
      question: req.body.question ?? existing.question,
      option_a: req.body.optionA ?? existing.option_a,
      option_b: req.body.optionB ?? existing.option_b,
      option_c: req.body.optionC ?? existing.option_c,
      option_d: req.body.optionD ?? existing.option_d,
      correct_answer: req.body.correctAnswer ?? existing.correct_answer,
      explanation: req.body.explanation ?? existing.explanation,
      difficulty: req.body.difficulty ?? existing.difficulty,
    };

    await pool.query(
      `UPDATE questions SET category_id=?, question=?, option_a=?, option_b=?, option_c=?, option_d=?,
       correct_answer=?, explanation=?, difficulty=? WHERE id=?`,
      [merged.category_id, merged.question, merged.option_a, merged.option_b, merged.option_c,
       merged.option_d, merged.correct_answer, merged.explanation, merged.difficulty, id]
    );

    return res.json({ success: true, message: 'Question updated.' });
  } catch (err) {
    console.error('updateQuestion error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating question.' });
  }
}

// DELETE /api/questions/:id  (admin only)
async function deleteQuestion(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM questions WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }
    return res.json({ success: true, message: 'Question deleted.' });
  } catch (err) {
    console.error('deleteQuestion error:', err);
    return res.status(500).json({ success: false, message: 'Server error deleting question.' });
  }
}

module.exports = { getQuestions, getQuestionById, createQuestion, updateQuestion, deleteQuestion };
