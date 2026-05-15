const express = require('express');
const cors = require('cors');
const { initDb } = require('./models/db');

const app = express();

app.use(cors({ 
  origin: [
    'http://localhost:5173',
    'https://taskflow-frontend-lu8v.onrender.com'
  ], 
  credentials: true 
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/projects/:projectId/tasks', require('./routes/tasks'));
app.use('/api', require('./routes/api'));

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'TaskFlow API' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

// Init DB first, then start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 TaskFlow API running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health\n`);
  });
}).catch(err => {
  console.error('Failed to init database:', err);
  process.exit(1);
});
