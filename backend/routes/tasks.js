const express = require('express');
const { db } = require('../models/db');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Get tasks for a project
router.get('/', authenticate, requireProjectAccess, (req, res) => {
  const { status, priority, assignee } = req.query;

  let query = `
    SELECT t.*, 
      u1.name as assignee_name, u1.avatar as assignee_avatar,
      u2.name as creator_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (assignee) { query += ' AND t.assignee_id = ?'; params.push(assignee); }

  query += ' ORDER BY t.created_at DESC';

  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

// Create task
router.post('/', authenticate, requireProjectAccess, (req, res) => {
  const { title, description, priority, assignee_id, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required' });

  // Verify assignee is project member
  if (assignee_id) {
    const isMember = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee is not a project member' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, priority, project_id, assignee_id, creator_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, priority || 'medium', req.params.projectId,
    assignee_id || null, req.user.id, due_date || null);

  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar, u2.name as creator_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// Update task
router.put('/:taskId', authenticate, requireProjectAccess, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.taskId, req.params.projectId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, assignee_id, due_date } = req.body;

  // Members can only update status of their own tasks; admins/project admins can update all
  const isCreator = task.creator_id === req.user.id;
  const isAssignee = task.assignee_id === req.user.id;
  const isProjectAdmin = req.projectMember?.role === 'admin';
  const isGlobalAdmin = req.user.role === 'admin';

  if (!isCreator && !isAssignee && !isProjectAdmin && !isGlobalAdmin) {
    return res.status(403).json({ error: 'Not authorized to update this task' });
  }

  db.prepare(`
    UPDATE tasks SET 
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      assignee_id = CASE WHEN ? IS NOT NULL THEN ? ELSE assignee_id END,
      due_date = COALESCE(?, due_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description, status, priority, assignee_id, assignee_id, due_date, req.params.taskId);

  const updated = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar, u2.name as creator_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    WHERE t.id = ?
  `).get(req.params.taskId);

  res.json({ task: updated });
});

// Delete task
router.delete('/:taskId', authenticate, requireProjectAccess, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.taskId, req.params.projectId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isCreator = task.creator_id === req.user.id;
  const isProjectAdmin = req.projectMember?.role === 'admin';

  if (!isCreator && !isProjectAdmin && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this task' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ message: 'Task deleted' });
});

// Get comments for a task
router.get('/:taskId/comments', authenticate, requireProjectAccess, (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name, u.avatar FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ? ORDER BY c.created_at ASC
  `).all(req.params.taskId);
  res.json({ comments });
});

// Add comment
router.post('/:taskId/comments', authenticate, requireProjectAccess, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content is required' });

  const result = db.prepare(
    'INSERT INTO comments (content, task_id, user_id) VALUES (?, ?, ?)'
  ).run(content, req.params.taskId, req.user.id);

  const comment = db.prepare(`
    SELECT c.*, u.name, u.avatar FROM comments c
    JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ comment });
});

module.exports = router;
