const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const {
  getDashboardStats, getAllUsers, getUserById, updateUser, deleteUser,
} = require('../controllers/adminController');

router.use(authenticate, requireAdmin); // every route below requires an admin

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
