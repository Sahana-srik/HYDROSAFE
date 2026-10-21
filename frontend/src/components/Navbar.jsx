import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, User, Activity } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'worker': return 'badge-worker';
      case 'safetyOfficer': return 'badge-safetyOfficer';
      case 'inspector': return 'badge-inspector';
      case 'ert': return 'badge-ert';
      case 'complianceAdmin': return 'badge-complianceAdmin';
      case 'superAdmin': return 'badge-superAdmin';
      default: return 'badge-worker';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'worker': return 'Plant Worker';
      case 'safetyOfficer': return 'Safety Officer';
      case 'inspector': return 'Inspector';
      case 'ert': return 'ERT Leader';
      case 'complianceAdmin': return 'Compliance Admin';
      case 'superAdmin': return 'Super Admin';
      default: return role;
    }
  };

  return (
    <header style={{
      height: '64px',
      background: '#FFFFFF',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'var(--primary-light)',
          border: '1px solid var(--primary-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary)'
        }}>
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            HYDRO<span style={{ color: 'var(--primary)' }}>SAFE</span>
          </h1>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '-2px' }}>
            H₂ Plant Safety & Compliance
          </p>
        </div>
      </div>

      {/* Center Plant Live Sensor Monitor Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.35rem 0.85rem',
        borderRadius: '9999px',
        background: '#ECFDF5',
        border: '1px solid #A7F3D0',
        fontSize: '0.75rem',
        color: '#047857'
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#10B981',
          display: 'inline-block'
        }}></span>
        <Activity size={14} />
        <span>Plant Status: <strong>Normal (0.00% H₂ Leak)</strong></span>
      </div>

      {/* User Info & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '2px' }}>
                <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                  {getRoleDisplayName(user.role)}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {user.employeeId}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              title="Logout session"
              style={{ padding: '0.4rem 0.75rem' }}
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
