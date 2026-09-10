// backend/middleware/auth.js
// Verifies the JWT sent by the client and attaches the decoded user info
// (id, username, role) to req.user for downstream route handlers.
// This is what "protects" a route from unauthenticated access.

const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // We never trust a role sent from the frontend — this comes only from
    // the signed token, which the server itself issued at login time.
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
  }
}

module.exports = authenticate;
