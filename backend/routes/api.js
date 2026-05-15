const express = require('express');
const { db } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Dashboard stats
router.get('/dashboard', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  let projectFilter = isAdmin
    ? '' : `AND (p.owner_id = ${userId} OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ${userId}))`;

  const totalProjects = db.prepare(
    `SELECT COUNT(*) as count FROM projects p WHERE 1=1 ${projectFilter}`
  ).get().count;

  const activeProjects = db.prepare(
    `SELECT COUNT(*) as count FROM projects p WHERE status = 'active' ${projectFilter}`
  ).get().count;

  // My tasks
  const myTasks = isAdmin
    ? db.prepare("SELECT COUNT(*) as count FROM tasks").get().count
    : db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assignee_id = ?").get(userId).count;

  const tasksByStatus = isAdmin
    ? db.prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status").all()
    : db.prepare("SELECT status, COUNT(*) as count FROM tasks WHERE assignee_id = ? GROUP BY status").all(userId);

  const overdueTasks = isAdmin
    ? db.prepare(`
        SELECT t.*, p.name as project_name, u.name as assignee_name
        FROM tasks t JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.due_date < date('now') AND t.status != 'done'
        ORDER BY t.due_date ASC LIMIT 10
      `).all()
    : db.prepare(`
        SELECT t.*, p.name as project_name, u.name as assignee_name
        FROM tasks t JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.due_date < date('now') AND t.status != 'done' AND t.assignee_id = ?
        ORDER BY t.due_date ASC LIMIT 10
      `).all(userId);

  const recentTasks = isAdmin
    ? db.prepare(`
        SELECT t.*, p.name as project_name, u.name as assignee_name, u.avatar as assignee_avatar
        FROM tasks t JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.assignee_id = u.id
        ORDER BY t.updated_at DESC LIMIT 5
      `).all()
    : db.prepare(`
        SELECT t.*, p.name as project_name, u.name as assignee_name, u.avatar as assignee_avatar
        FROM tasks t JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.assignee_id = ? OR t.creator_id = ?
        ORDER BY t.updated_at DESC LIMIT 5
      `).all(userId, userId);

  res.json({
    stats: { totalProjects, activeProjects, myTasks, overdueTasks: overdueTasks.length },
    tasksByStatus,
    overdueTasks,
    recentTasks
  });
});

// Get all users (admin only)
router.get('/users', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, avatar, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

// Search users by email (for adding to projects)
router.get('/users/search', authenticate, (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email query required' });

  const users = db.prepare(
    "SELECT id, name, email, avatar FROM users WHERE email LIKE ? LIMIT 5"
  ).all(`%${email}%`);
  res.json({ users });
});

module.exports = router;
