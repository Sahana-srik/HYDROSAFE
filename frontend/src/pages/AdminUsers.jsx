import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Shield, ArrowLeft, RefreshCw, Search, Filter,
  CheckCircle2, XCircle, Edit3, ShieldAlert, Lock, Loader2, X, Phone, Building, Hash, Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ROLE_CONFIG = {
  worker: { label: 'Plant Worker', color: '#0369A1', bg: '#E0F2FE' },
  safetyOfficer: { label: 'Safety Officer', color: '#B45309', bg: '#FEF3C7' },
  inspector: { label: 'Inspector', color: '#6D28D9', bg: '#EDE9FE' },
  ert: { label: 'ERT Member', color: '#B91C1C', bg: '#FEE2E2' },
  complianceAdmin: { label: 'Compliance Admin', color: '#047857', bg: '#ECFDF5' },
  superAdmin: { label: 'Super Admin', color: '#BE185D', bg: '#FCE7F3' }
};

// ─── Add / Edit User Modal ──────────────────────────────────────────────────
const UserFormModal = ({ mode = 'create', userToEdit = null, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: userToEdit?.name || '',
    email: userToEdit?.email || '',
    password: '',
    role: userToEdit?.role || 'worker',
    employeeId: userToEdit?.employeeId || '',
    department: userToEdit?.department || 'Operations',
    phone: userToEdit?.phone || ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      let res;
      if (mode === 'create') {
        if (!form.password) { setError('Password is required for new users'); setSubmitting(false); return; }
        res = await api.post('/auth/users', form);
      } else {
        const payload = { ...form };
        delete payload.password; // Do not send password during edit
        res = await api.patch(`/auth/users/${userToEdit._id}`, payload);
      }
      onSuccess(res.data, mode);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(2px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem', margin: 'auto', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-modal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <UserPlus size={18} color="var(--primary)" />
            </div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700 }}>
              {mode === 'create' ? 'Create New User' : 'Edit User & Role'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            color: '#B91C1C', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem', marginBottom: '1rem'
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input type="text" className="form-input" placeholder="e.g. John Doe"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input type="email" className="form-input" placeholder="john@hydro.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>

            {mode === 'create' && (
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" placeholder="••••••••"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
            )}

            <div className="form-group" style={{ gridColumn: mode === 'edit' ? '1 / -1' : 'auto' }}>
              <label className="form-label">Assigned System Role *</label>
              <select className="form-select" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {Object.entries(ROLE_CONFIG).map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Employee ID</label>
              <input type="text" className="form-input" placeholder="EMP-101"
                value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <input type="text" className="form-input" placeholder="Electrolysis Operations"
                value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : mode === 'create' ? 'Create Account' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Admin Users Component ─────────────────────────────────────────────
const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', user? }
  const [feedback, setFeedback] = useState('');

  const isAdmin = currentUser && ['safetyOfficer', 'complianceAdmin', 'superAdmin'].includes(currentUser.role);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSuccess = (updatedUser, mode) => {
    if (mode === 'create') {
      setUsers((prev) => [updatedUser, ...prev]);
      setFeedback(`User account '${updatedUser.email}' successfully created.`);
    } else {
      setUsers((prev) => prev.map((u) => u._id === updatedUser._id ? updatedUser : u));
      setFeedback(`User account '${updatedUser.email}' successfully updated.`);
    }
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleToggleStatus = async (targetUser) => {
    const actionName = targetUser.isActive ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${actionName} account for ${targetUser.name}?`)) return;

    try {
      const res = await api.patch(`/auth/users/${targetUser._id}/status`, {
        isActive: !targetUser.isActive
      });
      setUsers((prev) => prev.map((u) => u._id === targetUser._id ? res.data : u));
      setFeedback(`Account '${targetUser.email}' set to ${res.data.isActive ? 'ACTIVE' : 'INACTIVE'}.`);
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <Lock size={36} color="#DC2626" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 600 }}>Access Restricted</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            User Administration requires Safety Officer, Compliance Admin, or Super Admin privileges.
          </p>
          <Link to="/dashboard" className="btn btn-secondary" style={{ marginTop: '1.25rem', display: 'inline-flex' }}>
            <ArrowLeft size={16} /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.employeeId?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Users size={22} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 700 }}>User Administration</h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
              Manage plant personnel accounts, RBAC roles & access permissions
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create' })}>
            <UserPlus size={16} /> Add New User
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '8px',
          background: '#ECFDF5', border: '1px solid #A7F3D0',
          color: '#047857', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter panel */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Search name, email, employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '260px', padding: '0.375rem 0.625rem', fontSize: '0.83rem' }}
          />
          <select
            className="form-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.375rem 0.625rem', fontSize: '0.83rem' }}
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
          {(roleFilter || search) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setRoleFilter(''); setSearch(''); }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading user accounts...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <ShieldAlert size={32} color="#EF4444" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#B91C1C', marginBottom: '1rem' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={fetchUsers}>Retry</button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Users size={36} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 600 }}>No Users Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {roleFilter || search ? 'No user accounts match your search filters.' : 'No user accounts registered yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {filteredUsers.map((u) => {
            const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.worker;
            const isSelf = currentUser?._id === u._id;
            const isInactive = u.isActive === false;

            return (
              <div
                key={u._id}
                className="glass-panel"
                style={{
                  padding: '1rem 1.25rem',
                  opacity: isInactive ? 0.6 : 1,
                  background: isInactive ? '#F8FAFC' : '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                      background: roleCfg.bg, border: `1px solid ${roleCfg.color}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: roleCfg.color, fontWeight: 700, fontSize: '1rem'
                    }}>
                      {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600 }}>{u.name}</h4>
                        <span style={{
                          background: roleCfg.bg, color: roleCfg.color, border: `1px solid ${roleCfg.color}33`,
                          borderRadius: '9999px', padding: '0.15rem 0.55rem', fontSize: '0.68rem', fontWeight: 700
                        }}>
                          {roleCfg.label.toUpperCase()}
                        </span>
                        {isSelf && (
                          <span style={{
                            background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD',
                            borderRadius: '9999px', padding: '0.15rem 0.5rem', fontSize: '0.65rem', fontWeight: 700
                          }}>YOU</span>
                        )}
                        {isInactive && (
                          <span style={{
                            background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA',
                            borderRadius: '9999px', padding: '0.15rem 0.5rem', fontSize: '0.65rem', fontWeight: 700
                          }}>INACTIVE</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={12} /> {u.email}</span>
                        {u.employeeId && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Hash size={12} /> {u.employeeId}</span>}
                        {u.department && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Building size={12} /> {u.department}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setModal({ mode: 'edit', user: u })}
                      style={{ fontSize: '0.75rem' }}
                    >
                      <Edit3 size={13} /> Edit / Role
                    </button>
                    {!isSelf && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleToggleStatus(u)}
                        style={{
                          fontSize: '0.75rem',
                          color: isInactive ? '#047857' : '#B91C1C',
                          borderColor: isInactive ? '#A7F3D0' : '#FECACA',
                          background: isInactive ? '#ECFDF5' : '#FEF2F2'
                        }}
                      >
                        {isInactive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {isInactive ? 'Activate' : 'Deactivate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <UserFormModal
          mode={modal.mode}
          userToEdit={modal.user}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default AdminUsers;
