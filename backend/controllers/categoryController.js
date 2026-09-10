// backend/controllers/categoryController.js

const { pool } = require('../config/database');

// GET /api/categories  (public: anyone logged in can see the list)
async function getCategories(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.description, c.created_at,
              COUNT(q.id) AS question_count
       FROM categories c
       LEFT JOIN questions q ON q.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name ASC`
    );
    return res.json({ success: true, categories: rows });
  } catch (err) {
    console.error('getCategories error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching categories.' });
  }
}

// POST /api/categories  (admin only)
async function createCategory(req, res) {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const [existing] = await pool.query('SELECT id FROM categories WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'A category with that name already exists.' });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name.trim(), description || null]
    );

    return res.status(201).json({ success: true, message: 'Category created.', categoryId: result.insertId });
  } catch (err) {
    console.error('createCategory error:', err);
    return res.status(500).json({ success: false, message: 'Server error creating category.' });
  }
}

// PUT /api/categories/:id  (admin only)
async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    await pool.query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name || rows[0].name, description !== undefined ? description : rows[0].description, id]
    );

    return res.json({ success: true, message: 'Category updated.' });
  } catch (err) {
    console.error('updateCategory error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating category.' });
  }
}

// DELETE /api/categories/:id  (admin only)
// Prevented if the category still has questions, so quiz history/results
// don't end up pointing at nothing.
async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    const [[{ cnt }]] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM questions WHERE category_id = ?',
      [id]
    );
    if (cnt > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this category: it still has ${cnt} question(s). Delete or move those questions first.`,
      });
    }

    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    return res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    console.error('deleteCategory error:', err);
    return res.status(500).json({ success: false, message: 'Server error deleting category.' });
  }
}

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
