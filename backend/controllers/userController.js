// backend/controllers/userController.js
// Handles the logged-in user's own profile: view, edit, stats.

const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

// GET /api/users/profile
async function getProfile(req, res) {
  try {
    const userId = req.user.id;

    const [userRows] = await pool.query(
      `SELECT id, full_name, username, email, profile_image, role, created_at
       FROM users WHERE id = ?`,
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = userRows[0];

    const [statsRows] = await pool.query(
      `SELECT
         COUNT(*) AS total_quizzes,
         COALESCE(AVG(percentage), 0) AS average_score,
         COALESCE(MAX(percentage), 0) AS highest_score
       FROM quiz_results WHERE user_id = ?`,
      [userId]
    );
    const stats = statsRows[0];

    return res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        profileImage: user.profile_image,
        role: user.role,
        createdAt: user.created_at,
      },
      stats: {
        totalQuizzes: Number(stats.total_quizzes),
        averageScore: Number(stats.average_score).toFixed(2),
        highestScore: Number(stats.highest_score).toFixed(2),
      },
    });
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
}

// PUT /api/users/profile
// Allows editing full name, username, profile picture (URL/path), and password.
// Email is intentionally NOT editable here (would require verification).
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { fullName, username, profileImage, currentPassword, newPassword } = req.body;

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = rows[0];

    // If changing the username, make sure it's not taken by someone else.
    if (username && username !== user.username) {
      const [dupe] = await pool.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, userId]
      );
      if (dupe.length > 0) {
        return res.status(409).json({ success: false, message: 'That username is already taken.' });
      }
    }

    let hashedPassword = user.password;
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password.' });
      }
      const matches = await bcrypt.compare(currentPassword, user.password);
      if (!matches) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }
      hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    await pool.query(
      `UPDATE users SET full_name = ?, username = ?, profile_image = ?, password = ? WHERE id = ?`,
      [
        fullName || user.full_name,
        username || user.username,
        profileImage !== undefined ? profileImage : user.profile_image,
        hashedPassword,
        userId,
      ]
    );

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
}

module.exports = { getProfile, updateProfile };
