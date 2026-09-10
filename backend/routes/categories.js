const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const {
  getCategories, createCategory, updateCategory, deleteCategory,
} = require('../controllers/categoryController');

router.get('/', authenticate, getCategories);
router.post('/', authenticate, requireAdmin, createCategory);
router.put('/:id', authenticate, requireAdmin, updateCategory);
router.delete('/:id', authenticate, requireAdmin, deleteCategory);

module.exports = router;
