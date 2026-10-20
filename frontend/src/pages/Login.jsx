import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn, Database, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [seedMessage, setSeedMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const { login, seedDemoAccounts } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSeedMessage('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeed = async () => {
    setLocalError('');
    setSeedMessage('');
    setIsSeeding(true);
    try {
      const res = await seedDemoAccounts();
      setSeedMessage(res.message || 'Demo accounts created successfully! Click any quick-login role below.');
    } catch (err) {
      setLocalError(err.message || 'Failed to seed demo accounts. Ensure backend & MongoDB are connected.');
    } finally {
      setIsSeeding(false);
    }
  };

  const quickRoles = [
    { label: 'Plant Worker', email: 'worker@hydro.com', role: 'worker', badge: 'badge-worker' },
    { label: 'Safety Officer', email: 'safety@hydro.com', role: 'safetyOfficer', badge: 'badge-safetyOfficer' },
    { label: 'Inspector', email: 'inspector@hydro.com', role: 'inspector', badge: 'badge-inspector' },
    { label: 'ERT Leader', email: 'ert@hydro.com', role: 'ert', badge: 'badge-ert' },
    { label: 'Compliance Officer', email: 'compliance@hydro.com', role: 'complianceAdmin', badge: 'badge-complianceAdmin' },
    { label: 'System Admin', email: 'admin@hydro.com', role: 'superAdmin', badge: 'badge-superAdmin' }
  ];

  const fillQuickRole = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('password123');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0b0f19 80%)',
      padding: '1.5rem'
    }}>
      <div className="glasspanel" style={{
        width: '100%',
        maxWidth: '460px',
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '2.25rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)',
            marginBottom: '0.75rem'
          }}>
            <ShieldCheck size={28} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#ffffff', fontWeight: 700 }}>HydroSafe Portal</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Hydrogen Plant Safety & Compliance System
          </p>
        </div>

        {/* Feedback Alert */}
        {localError && (
          <div style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{localError}</span>
          </div>
        )}

        {seedMessage && (
          <div style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle size={16} />
            <span>{seedMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                placeholder="user@hydro.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            <LogIn size={18} />
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In to HydroSafe'}</span>
          </button>
        </form>

        {/* Quick Viva Viva Testing Roles */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Viva Quick Login (6 Roles)
            </span>
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
              title="Initialize demo MongoDB accounts"
            >
              <Database size={12} />
              <span>{isSeeding ? 'Seeding...' : 'Seed DB Users'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {quickRoles.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => fillQuickRole(r.email)}
                style={{
                  padding: '0.4rem 0.5rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'var(--transition)'
                }}
              >
                <span className={`badge ${r.badge}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                  {r.role}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Register footer */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Need new personnel access?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Register Personnel
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
