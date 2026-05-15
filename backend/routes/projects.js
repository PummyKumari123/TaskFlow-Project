const express = require('express');
const { db } = require('../models/db');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router();

// Get all projects for current user
router.get('/', authenticate, (req, res) => {
  let projects;
  if (req.user.role === 'admin') {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.owner_id = ? OR p.id IN (
        SELECT project_id FROM project_members WHERE user_id = ?
      )
      ORDER BY p.created_at DESC
    `).all(req.user.id, req.user.id);
  }
  res.json({ projects });
});

// Create project
router.post('/', authenticate, (req, res) => {
  const { name, description, due_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const result = db.prepare(
    'INSERT INTO projects (name, description, owner_id, due_date) VALUES (?, ?, ?, ?)'
  ).run(name, description || null, req.user.id, due_date || null);

  // Add creator as admin member
  db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(result.lastInsertRowid, req.user.id, 'admin');

  const project = db.prepare(`
    SELECT p.*, u.name as owner_name FROM projects p
    LEFT JOIN users u ON p.owner_id = u.id WHERE p.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ project });
});

// Get single project
router.get('/:id', authenticate, requireProjectAccess, (req, res) => {
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name FROM projects p
    LEFT JOIN users u ON p.owner_id = u.id WHERE p.id = ?
  `).get(req.params.id);

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar, u.role as global_role, pm.role as project_role
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
  `).all(req.params.id);

  res.json({ project, members });
});

// Update project
router.put('/:id', authenticate, requireProjectAccess, (req, res) => {
  const { name, description, status, due_date } = req.body;
  const isOwner = req.project.owner_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isProjectAdmin = req.projectMember?.role === 'admin';

  if (!isOwner && !isAdmin && !isProjectAdmin) {
    return res.status(403).json({ error: 'Only project admins can update projects' });
  }

  db.prepare(`
    UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description),
    status = COALESCE(?, status), due_date = COALESCE(?, due_date) WHERE id = ?
  `).run(name, description, status, due_date, req.params.id);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json({ project: updated });
});

// Delete project
router.delete('/:id', authenticate, requireProjectAccess, (req, res) => {
  if (req.project.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the project owner can delete projects' });
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Project deleted' });
});

// Add member
router.post('/:id/members', authenticate, requireProjectAccess, (req, res) => {
  const { email, role } = req.body;
  const isOwner = req.project.owner_id === req.user.id;
  const isProjectAdmin = req.projectMember?.role === 'admin';

  if (!isOwner && !isProjectAdmin && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only project admins can add members' });
  }

  const user = db.prepare('SELECT id, name, email, avatar FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found with this email' });

  const existing = db.prepare(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.id, user.id);

  if (existing) return res.status(409).json({ error: 'User is already a member' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(
    req.params.id, user.id, role || 'member'
  );

  res.status(201).json({ message: 'Member added', user });
});

// Remove member
router.delete('/:id/members/:userId', authenticate, requireProjectAccess, (req, res) => {
  const isOwner = req.project.owner_id === req.user.id;
  const isProjectAdmin = req.projectMember?.role === 'admin';

  if (!isOwner && !isProjectAdmin && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only project admins can remove members' });
  }

  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(
    req.params.id, req.params.userId
  );
  res.json({ message: 'Member removed' });
});

module.exports = router;
