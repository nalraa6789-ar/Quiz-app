const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const {
  getQuestions, getQuestionById, createQuestion, updateQuestion, deleteQuestion,
} = require('../controllers/questionController');

// Listing/reading questions (with answers stripped where relevant) is admin-only
// here, since exposing the full question bank (with correct answers) to any
// logged-in user would let them cheat. Gameplay uses /api/quiz/start instead,
// which never sends the correct answer to the client.
router.get('/', authenticate, requireAdmin, getQuestions);
router.get('/:id', authenticate, requireAdmin, getQuestionById);
router.post('/', authenticate, requireAdmin, createQuestion);
router.put('/:id', authenticate, requireAdmin, updateQuestion);
router.delete('/:id', authenticate, requireAdmin, deleteQuestion);

module.exports = router;
