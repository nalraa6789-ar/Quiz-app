// backend/server.js
// Entry point: sets up Express, middleware, routes, and starts the server.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const questionRoutes = require('./routes/questions');
const quizRoutes = require('./routes/quiz');
const adminRoutes = require('./routes/admin');

const app = express();

// --- Core middleware ---
const allowedOrigins = (process.env.CLIENT_ORIGIN || '*')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve the frontend as static files, so the whole app can run from one server.
app.use(express.static(require('path').join(__dirname, '..', 'frontend')));

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/admin', adminRoutes);

// --- Health check ---
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running.' }));

// --- 404 handler for unknown API routes ---
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// --- Global error handler (catches anything thrown/passed to next(err)) ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Unexpected server error.' });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  const dbReady = await testConnection();
  if (!dbReady) {
    console.error('❌ Server was not started because MySQL is not reachable.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Quiz app server running at http://localhost:${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} in your browser.`);
  });
}

startServer();
