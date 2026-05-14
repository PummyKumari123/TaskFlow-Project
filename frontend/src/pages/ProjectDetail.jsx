import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, tasksAPI, dashboardAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Trash2, X, AlertCircle, Users, Calendar,
  MessageSquare, ChevronDown, Search, UserPlus, Settings, ArrowLeft
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const STATUS_COLORS = { todo: '#9090b0', in_progress: '#3b82f6', review: '#f59e0b', done: '#22c55e' };
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const PRIORITY_COLORS = { low: '#22c55e', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };

function TaskModal({ task, projectId, members, onClose, onSave }) {
  const [form, setForm] = useState(task ? {
    title: task.title, description: task.description || '',
    status: task.status, priority: task.priority,
    assignee_id: task.assignee_id || '', due_date: task.due_date || ''
  } : { title: '', description: '', status: 'todo', priority: 'medium', assignee_id: '', due_date: '' });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (task) {
      tasksAPI.getComments(projectId, task.id).then(res => setComments(res.data.comments));
    }
  }, [task, projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const payload = { ...form, assignee_id: form.assignee_id || null };
    try {
      let saved;
      if (task) {
        const res = await tasksAPI.update(projectId, task.id, payload);
        saved = res.data.task;
      } else {
        const res = await tasksAPI.create(projectId, payload);
        saved = res.data.task;
      }
      onSave(saved, !!task);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally { setLoading(false); }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    const res = await tasksAPI.addComment(projectId, task.id, { content: newComment });
    setComments(c => [...c, res.data.comment]);
    setNewComment('');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20 }}>{task ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 6 }}><X size={18} /></button>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16, display: 'flex', gap: 6 }}><AlertCircle size={14} />{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Title *</label>
            <input className="input" placeholder="Task title..." value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" rows={3} placeholder="Details..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Assignee</label>
              <select className="input" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Due Date</label>
              <input className="input" type="date" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
              {loading ? <div className="spinner" /> : (task ? 'Save Changes' : 'Create Task')}
            </button>
          </div>
        </form>

        {task && (
          <div style={{ marginTop: 28, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <h4 style={{ fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={15} /> Comments ({comments.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, maxHeight: 200, overflowY: 'auto' }}>
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                    {c.avatar ? <img src={c.avatar} alt="" /> : c.name?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>
                      <strong style={{ color: 'var(--text)' }}>{c.name}</strong> · {format(parseISO(c.created_at), 'MMM d, HH:mm')}
                    </div>
                    <div style={{ fontSize: 13, background: 'var(--bg3)', padding: '8px 12px', borderRadius: 8 }}>{c.content}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Add a comment..." value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleComment()} />
              <button onClick={handleComment} className="btn btn-primary btn-sm">Post</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await projectsAPI.addMember(projectId, { email, role });
      onAdd();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20 }}>Add Member</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 6 }}><X size={18} /></button>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Email Address</label>
            <input className="input" type="email" placeholder="member@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="label">Project Role</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
              {loading ? <div className="spinner" /> : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(null); // null | 'create' | task object
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [activeTab, setActiveTab] = useState('board');

  const load = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        projectsAPI.get(id),
        tasksAPI.getAll(id)
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setTasks(taskRes.data.tasks);
    } catch { navigate('/projects'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project and all its tasks?')) return;
    await projectsAPI.delete(id);
    navigate('/projects');
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await tasksAPI.delete(id, taskId);
    setTasks(t => t.filter(t => t.id !== taskId));
  };

  const handleTaskSave = (saved, isUpdate) => {
    if (isUpdate) setTasks(t => t.map(t => t.id === saved.id ? saved : t));
    else setTasks(t => [saved, ...t]);
  };

  const handleStatusChange = async (task, newStatus) => {
    await tasksAPI.update(id, task.id, { status: newStatus });
    setTasks(t => t.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  const isProjectAdmin = project?.owner_id === user?.id ||
    user?.role === 'admin' ||
    members.find(m => m.id === user?.id)?.project_role === 'admin';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => navigate('/projects')} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={15} /> Projects
        </button>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="page-title">{project?.name}</h1>
              <span className={`badge badge-${project?.status}`}>{project?.status}</span>
            </div>
            {project?.description && <p style={{ color: 'var(--text2)', marginTop: 4, fontSize: 14 }}>{project.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isProjectAdmin && (
              <>
                <button onClick={() => setShowAddMember(true)} className="btn btn-ghost btn-sm">
                  <UserPlus size={15} /> Add Member
                </button>
                <button onClick={handleDeleteProject} className="btn btn-danger btn-sm">
                  <Trash2 size={15} /> Delete
                </button>
              </>
            )}
            <button onClick={() => setTaskModal('create')} className="btn btn-primary btn-sm">
              <Plus size={15} /> Add Task
            </button>
          </div>
        </div>

        {/* Members strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <div style={{ display: 'flex', marginLeft: 0 }}>
            {members.slice(0, 5).map((m, i) => (
              <div key={m.id} className="avatar" title={m.name}
                style={{ width: 28, height: 28, fontSize: 11, marginLeft: i > 0 ? -8 : 0, border: '2px solid var(--bg)', zIndex: 5 - i }}>
                {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name?.[0]}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
          {project?.due_date && (
            <span style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
              <Calendar size={13} /> Due {format(parseISO(project.due_date), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {['board', 'members'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px', background: 'none', border: 'none',
            color: activeTab === tab ? 'var(--accent2)' : 'var(--text2)',
            borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
            fontFamily: 'Syne', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            textTransform: 'capitalize', marginBottom: -1
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Board view */}
      {activeTab === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
          {STATUSES.map(status => {
            const colTasks = tasks.filter(t => t.status === status);
            return (
              <div key={status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 4px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status] }} />
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13 }}>{STATUS_LABELS[status]}</span>
                  <span style={{
                    background: 'var(--bg3)', color: 'var(--text2)',
                    width: 20, height: 20, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600
                  }}>{colTasks.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colTasks.map(task => {
                    const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
                    return (
                      <div key={task.id}
                        onClick={() => setTaskModal(task)}
                        style={{
                          background: 'var(--bg2)', border: `1px solid ${overdue ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                          borderRadius: 10, padding: '14px', cursor: 'pointer', transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = overdue ? 'rgba(239,68,68,0.3)' : 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <span className={`badge badge-${task.priority}`} style={{ fontSize: 11 }}>{task.priority}</span>
                          {isProjectAdmin && (
                            <button onClick={e => { e.stopPropagation(); handleDeleteTask(task.id); }}
                              style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 2, opacity: 0 }}
                              className="task-delete"
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, lineHeight: 1.4 }}>{task.title}</p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {task.assignee_name ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>
                                {task.assignee_avatar ? <img src={task.assignee_avatar} alt="" /> : task.assignee_name[0]}
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{task.assignee_name.split(' ')[0]}</span>
                            </div>
                          ) : <span style={{ fontSize: 11, color: 'var(--text2)' }}>Unassigned</span>}

                          {task.due_date && (
                            <span style={{ fontSize: 11, color: overdue ? 'var(--red)' : 'var(--text2)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Calendar size={11} /> {format(parseISO(task.due_date), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button onClick={() => setTaskModal('create')}
                    style={{
                      width: '100%', padding: '10px', background: 'transparent',
                      border: '1px dashed var(--border)', borderRadius: 10,
                      color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; }}
                  >
                    <Plus size={14} /> Add task
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Members tab */}
      {activeTab === 'members' && (
        <div style={{ maxWidth: 600 }}>
          {isProjectAdmin && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setShowAddMember(true)} className="btn btn-primary btn-sm">
                <UserPlus size={15} /> Add Member
              </button>
            </div>
          )}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {members.map((m, i) => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none'
              }}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                  {m.avatar ? <img src={m.avatar} alt={m.name} /> : m.name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{m.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge badge-${m.project_role}`}>{m.project_role}</span>
                  {m.global_role === 'admin' && <span className="badge badge-admin" style={{ fontSize: 11 }}>global admin</span>}
                  {isProjectAdmin && m.id !== user?.id && (
                    <button onClick={async () => {
                      if (!confirm(`Remove ${m.name} from project?`)) return;
                      await projectsAPI.removeMember(id, m.id);
                      setMembers(prev => prev.filter(x => x.id !== m.id));
                    }} className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {(taskModal === 'create' || (taskModal && taskModal !== 'create')) && (
        <TaskModal
          task={taskModal !== 'create' ? taskModal : null}
          projectId={id}
          members={members}
          onClose={() => setTaskModal(null)}
          onSave={handleTaskSave}
        />
      )}
      {showAddMember && (
        <AddMemberModal projectId={id} onClose={() => setShowAddMember(false)} onAdd={load} />
      )}
    </div>
  );
}
