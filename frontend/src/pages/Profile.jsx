import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { User, Shield, Save, Check } from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authAPI.updateProfile({ name });
      setUser(res.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div className="avatar" style={{ width: 64, height: 64, fontSize: 24, background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
            {user?.avatar ? <img src={user.avatar} alt={user.name} /> : user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 4 }}>{user?.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {user?.role === 'admin' ? <Shield size={14} color="var(--accent2)" /> : <User size={14} color="var(--text2)" />}
              <span style={{ fontSize: 13, color: 'var(--text2)', textTransform: 'capitalize' }}>{user?.role}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="label">Full Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" value={user?.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div className="form-group">
            <label className="label">Role</label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', background: 'var(--bg3)',
              border: '1px solid var(--border)', borderRadius: 8
            }}>
              {user?.role === 'admin'
                ? <><Shield size={15} color="var(--accent2)" /><span style={{ fontSize: 14, color: 'var(--accent2)', fontWeight: 600 }}>Admin</span></>
                : <><User size={15} color="var(--text2)" /><span style={{ fontSize: 14 }}>Member</span></>
              }
              <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 4 }}>· Set at registration</span>
            </div>
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading || saved}>
            {saved ? <><Check size={15} /> Saved!</> : loading ? <div className="spinner" /> : <><Save size={15} /> Save Changes</>}
          </button>
        </form>
      </div>

      {user?.role === 'admin' && (
        <div className="card" style={{ background: 'var(--accent-glow)', borderColor: 'rgba(108,99,255,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={20} color="var(--accent2)" />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Admin Access</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                You can view all projects, manage all tasks, and access all user data.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
