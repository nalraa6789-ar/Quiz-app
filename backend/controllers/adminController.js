// backend/controllers/adminController.js
// Admin dashboard stats + user management. All routes using this controller
// are protected by both `authenticate` and `requireAdmin` middleware.

const { pool } = require('../config/database');

// GET /api/admin/dashboard
async function getDashboardStats(req, res) {
  try {
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
    const [[{ totalQuizzes }]] = await pool.query('SELECT COUNT(*) AS totalQuizzes FROM quiz_results');
    const [[{ totalQuestions }]] = await pool.query('SELECT COUNT(*) AS totalQuestions FROM questions');
    const [[{ totalCategories }]] = await pool.query('SELECT COUNT(*) AS totalCategories FROM categories');
    const [[{ avgScore }]] = await pool.query('SELECT COALESCE(AVG(percentage), 0) AS avgScore FROM quiz_results');

    const [recentAttempts] = await pool.query(
      `SELECT r.id, u.username, c.name AS category_name, r.percentage, r.completed_at
       FROM quiz_results r
       JOIN users u ON u.id = r.user_id
       JOIN categories c ON c.id = r.category_id
       ORDER BY r.completed_at DESC LIMIT 10`
    );

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalQuizzes,
        totalQuestions,
        totalCategories,
        averageScore: Number(avgScore).toFixed(2),
      },
      recentAttempts,
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching dashboard stats.' });
  }
}

// GET /api/admin/users?search=
async function getAllUsers(req, res) {
  try {
    const { search } = req.query;
    let query = `SELECT id, full_name, username, email, role, is_active, created_at FROM users`;
    const params = [];
    if (search) {
      query += ` WHERE full_name LIKE ? OR username LIKE ? OR email LIKE ?`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY created_at DESC';

    // Passwords are never selected here, so they can never leak to the admin UI.
    const [rows] = await pool.query(query, params);
    return res.json({ success: true, users: rows });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching users.' });
  }
}

// GET /api/admin/users/:id
async function getUserById(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, username, email, role, is_active, profile_image, created_at FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('getUserById error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching user.' });
  }
}

// PUT /api/admin/users/:id
// Admin can change role and active status (enable/disable account).
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;

    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be "user" or "admin".' });
    }

    // Prevent an admin from locking themselves out by disabling their own account.
    if (Number(id) === req.user.id && isActive === false) {
      return res.status(400).json({ success: false, message: 'You cannot disable your own account.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await pool.query(
      'UPDATE users SET role = ?, is_active = ? WHERE id = ?',
      [role || rows[0].role, isActive !== undefined ? (isActive ? 1 : 0) : rows[0].is_active, id]
    );

    return res.json({ success: true, message: 'User updated.' });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating user.' });
  }
}

// DELETE /api/admin/users/:id
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ success: false, message: 'Server error deleting user.' });
  }
}

module.exports = { getDashboardStats, getAllUsers, getUserById, updateUser, deleteUser };
