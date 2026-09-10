const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  startQuiz, submitQuiz, getMyResults, getResultDetail, getLeaderboard,
} = require('../controllers/quizController');

router.post('/start', authenticate, startQuiz);
router.post('/submit', authenticate, submitQuiz);
router.get('/results', authenticate, getMyResults);
router.get('/results/:id', authenticate, getResultDetail);
router.get('/leaderboard', authenticate, getLeaderboard);

module.exports = router;
