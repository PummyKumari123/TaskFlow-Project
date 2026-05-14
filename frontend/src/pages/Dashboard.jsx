import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { FolderKanban, CheckSquare, AlertTriangle, Zap, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusColors = { todo: '#9090b0', in_progress: '#3b82f6', review: '#f59e0b', done: '#22c55e' };
const statusLabels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const priorityColors = { low: '#22c55e', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    dashboardAPI.get().then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, borderTopColor: 'var(--accent)', borderColor: 'var(--border)' }} />
    </div>
  );

  const statCards = [
    { label: 'Total Projects', value: data?.stats.totalProjects, icon: FolderKanban, color: 'var(--accent)' },
    { label: 'Active Projects', value: data?.stats.activeProjects, icon: TrendingUp, color: 'var(--green)' },
    { label: 'My Tasks', value: data?.stats.myTasks, icon: CheckSquare, color: 'var(--blue)' },
    { label: 'Overdue', value: data?.stats.overdueTasks, icon: AlertTriangle, color: 'var(--red)' },
  ];

  const byStatus = {};
  (data?.tasksByStatus || []).forEach(s => byStatus[s.status] = s.count);
  const totalByStatus = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ color: 'var(--text2)', marginTop: 4 }}>
            Welcome back, <strong style={{ color: 'var(--text)' }}>{user?.name}</strong>
          </p>
        </div>
        <Link to="/projects" className="btn btn-primary">
          <FolderKanban size={16} /> View Projects
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne' }}>{value ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 28 }}>
        {/* Task Status Breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 16 }}>Tasks by Status</h3>
          {totalByStatus === 0 ? (
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>No tasks yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(statusLabels).map(([status, label]) => {
                const count = byStatus[status] || 0;
                const pct = totalByStatus ? Math.round((count / totalByStatus) * 100) : 0;
                return (
                  <div key={status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: statusColors[status], borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overdue Tasks */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="var(--red)" /> Overdue Tasks
          </h3>
          {data?.overdueTasks?.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="var(--green)" /> All tasks on track!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data?.overdueTasks?.slice(0, 5).map(task => (
                <div key={task.id} style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)'
                }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{task.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)' }}>
                    <Clock size={12} />
                    {task.due_date && format(parseISO(task.due_date), 'MMM d')}
                    <span>·</span>
                    <span>{task.project_name}</span>
                    {task.priority !== 'low' && (
                      <span style={{ color: priorityColors[task.priority], fontWeight: 600 }}>{task.priority}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16 }}>Recent Tasks</h3>
          <Link to="/projects" style={{ fontSize: 13, color: 'var(--accent2)', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {data?.recentTasks?.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>No tasks yet. Create a project to get started!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data?.recentTasks?.map(task => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 8, transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[task.status], flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{task.project_name}</div>
                </div>
                <span className={`badge badge-${task.status}`} style={{ fontSize: 11 }}>
                  {statusLabels[task.status]}
                </span>
                {task.assignee_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>
                      {task.assignee_avatar ? <img src={task.assignee_avatar} alt="" /> : task.assignee_name[0]}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
