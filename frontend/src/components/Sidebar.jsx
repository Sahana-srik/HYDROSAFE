import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  AlertOctagon,
  Siren,
  ClipboardCheck,
  FileCheck2,
  History,
  Users
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['worker', 'safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin']
    },
    {
      name: 'Incident Reporting',
      path: '/incidents',
      icon: AlertOctagon,
      roles: ['worker', 'safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin']
    },
    {
      name: 'Emergency Response',
      path: '/emergency',
      icon: Siren,
      roles: ['worker', 'safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin']
    },
    {
      name: 'Inspection Management',
      path: '/inspections',
      icon: ClipboardCheck,
      roles: ['safetyOfficer', 'inspector', 'complianceAdmin', 'superAdmin']
    },
    {
      name: 'Compliance Vault',
      path: '/compliance',
      icon: FileCheck2,
      roles: ['safetyOfficer', 'inspector', 'complianceAdmin', 'superAdmin']
    },
    {
      name: 'System Audit Logs',
      path: '/audit-logs',
      icon: History,
      roles: ['safetyOfficer', 'complianceAdmin', 'superAdmin']
    },
    {
      name: 'User Management',
      path: '/admin/users',
      icon: Users,
      roles: ['safetyOfficer', 'complianceAdmin', 'superAdmin']
    }
  ];


  return (
    <aside style={{
      width: '240px',
      background: 'rgba(15, 23, 42, 0.95)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.25rem 0.75rem',
      gap: '0.5rem',
      minHeight: 'calc(100vh - 64px)'
    }}>
      <div style={{
        padding: '0 0.75rem 0.75rem 0.75rem',
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-dim)'
      }}>
        Navigation Modules
      </div>

      {navItems.map((item) => {
        const Icon = item.icon;
        const isAuthorized = user && item.roles.includes(user.role);

        if (!isAuthorized) return null;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              background: isActive ? 'linear-gradient(90deg, rgba(14, 165, 233, 0.2), rgba(14, 165, 233, 0.05))' : 'transparent',
              borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
              transition: 'var(--transition)'
            })}
          >
            <Icon size={18} color="var(--primary)" />
            <span>{item.name}</span>
          </NavLink>
        );
      })}

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', paddingLeft: '0.75rem', paddingRight: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          HydroSafe v1.0 MERN
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--primary)', marginTop: '2px' }}>
          Single-Plant System Active
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
