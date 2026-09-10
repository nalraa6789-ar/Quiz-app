// backend/middleware/admin.js
// Must run AFTER the `authenticate` middleware (so req.user already exists).
// Blocks any request whose token role is not 'admin'.

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
}

module.exports = requireAdmin;
