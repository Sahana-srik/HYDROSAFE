import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import {
  AlertOctagon, Siren, ClipboardCheck, FileCheck2,
  Activity, ArrowRight, ShieldAlert, Clock, UserCheck, RefreshCw,
  TrendingUp, Users, History, AlertTriangle, CheckCircle2, Shield
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const ROLE_BADGE_COLORS = {
  worker: '#0284c7',
  safetyOfficer: '#d97706',
  inspector: '#7c3aed',
  ert: '#dc2626',
  complianceAdmin: '#059669',
  superAdmin: '#db2777'
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
      setError(err.response?.data?.message || 'Failed to connect to backend analytics engine');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Module cards navigation configuration
  const modules = [
    {
      title: 'Incident Reporting',
      desc: 'Report leaks, pressure spikes, equipment anomalies & near-miss events.',
      icon: AlertOctagon,
      color: '#0d9488',
      route: '/incidents',
      roles: ['worker', 'safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin'],
      count: stats?.incidents?.active ? `${stats.incidents.active} Active` : `${stats?.incidents?.total || 0} Total`
    },
    {
      title: 'Emergency Response',
      desc: 'Live ERT dispatch, emergency checklist, evacuation levels & override audit logs.',
      icon: Siren,
      color: '#ef4444',
      route: '/emergency',
      roles: ['worker', 'safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin'],
      count: stats?.emergency?.active ? `${stats.emergency.active} Active` : `${stats?.emergency?.total || 0} Workflows`
    },
    {
      title: 'Inspection Management',
      desc: 'Schedule & log inspections for electrolyzers, compressors & storage tanks.',
      icon: ClipboardCheck,
      color: '#f59e0b',
      route: '/inspections',
      roles: ['safetyOfficer', 'inspector', 'complianceAdmin', 'superAdmin'],
      count: stats?.inspections?.upcoming ? `${stats.inspections.upcoming} Scheduled` : `${stats?.inspections?.total || 0} Total`
    },
    {
      title: 'Compliance Vault',
      desc: 'ISO 22734 / NFPA 2 safety certificates, permits, SDS & version tracking.',
      icon: FileCheck2,
      color: '#10b981',
      route: '/compliance',
      roles: ['safetyOfficer', 'inspector', 'complianceAdmin', 'superAdmin'],
      count: stats?.compliance?.expiring30 ? `⚠️ ${stats.compliance.expiring30} Expiring` : `${stats?.compliance?.total || 0} Documents`
    },
    {
      title: 'System Audit Logs',
      desc: 'Immutable security event records with state diff snapshots.',
      icon: History,
      color: '#7c3aed',
      route: '/audit-logs',
      roles: ['safetyOfficer', 'complianceAdmin', 'superAdmin'],
      count: stats?.system?.recentAuditCount ? `${stats.system.recentAuditCount} (24h)` : 'Immutable Logs'
    },
    {
      title: 'User Administration',
      desc: 'Manage personnel accounts, RBAC permission roles & access controls.',
      icon: Users,
      color: '#db2777',
      route: '/admin/users',
      roles: ['safetyOfficer', 'complianceAdmin', 'superAdmin'],
      count: stats?.users?.totalUsers ? `${stats.users.totalUsers} Accounts` : 'User Mgmt'
    }
  ];

  // Recharts Data Formatters
  const severityChartData = stats?.incidents?.bySeverity ? [
    { name: 'Low', count: stats.incidents.bySeverity.low, fill: '#10b981' },
    { name: 'Medium', count: stats.incidents.bySeverity.medium, fill: '#f59e0b' },
    { name: 'High', count: stats.incidents.bySeverity.high, fill: '#f87171' },
    { name: 'Critical', count: stats.incidents.bySeverity.critical, fill: '#ef4444' }
  ] : [];

  const complianceChartData = stats?.compliance ? [
    { name: '<30 Days', count: stats.compliance.expiring30, fill: '#ef4444' },
    { name: '30-60 Days', count: stats.compliance.expiring60 - stats.compliance.expiring30, fill: '#f59e0b' },
    { name: '60-90 Days', count: stats.compliance.expiring90 - stats.compliance.expiring60, fill: '#eab308' },
    { name: 'Expired', count: stats.compliance.expired, fill: '#b91c1c' }
  ] : [];

  const inspectionPieData = stats?.inspections?.byResult ? [
    { name: 'Pass', value: stats.inspections.byResult.pass, color: '#10b981' },
    { name: 'Fail', value: stats.inspections.byResult.fail, color: '#ef4444' },
    { name: 'Pending', value: stats.inspections.byResult.pending, color: '#f59e0b' },
    { name: 'N/A', value: stats.inspections.byResult.NA, color: '#94a3b8' }
  ].filter(d => d.value > 0) : [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '1.75rem 2rem',
        borderRadius: 'var(--radius-xl)',
        background: '#FFFFFF',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Hydrogen Operations & Safety Command Center
            </span>
            <span style={{
              background: `${ROLE_BADGE_COLORS[user?.role] || '#0d9488'}18`,
              color: ROLE_BADGE_COLORS[user?.role] || '#0d9488',
              border: `1px solid ${ROLE_BADGE_COLORS[user?.role] || '#0d9488'}35`,
              borderRadius: '9999px', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 700
            }}>
              {user?.role?.toUpperCase()}
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-main)', fontWeight: 700 }}>
            Welcome back, {user?.name}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            Department: <strong style={{ color: 'var(--text-main)' }}>{user?.department || 'Operations'}</strong> | Employee ID: <strong style={{ color: 'var(--text-main)' }}>{user?.employeeId || 'N/A'}</strong>
          </p>
        </div>

        {/* Dashboard Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData} disabled={loading} title="Refresh Analytics">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Real Data Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE INCIDENTS</span>
              <AlertOctagon size={18} color="#0d9488" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>{stats.incidents.active}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {stats.incidents.total} total reported incidents
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE EMERGENCIES</span>
              <Siren size={18} color="#ef4444" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stats.emergency.active > 0 ? '#ef4444' : 'var(--text-main)' }}>
              {stats.emergency.active}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {stats.emergency.pendingStepsCount} pending response steps
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>UPCOMING INSPECTIONS</span>
              <ClipboardCheck size={18} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>{stats.inspections.upcoming}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {stats.inspections.failed > 0 ? `⚠️ ${stats.inspections.failed} failed inspections` : `${stats.inspections.completed} completed`}
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>EXPIRING COMPLIANCE</span>
              <FileCheck2 size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stats.compliance.expiring30 > 0 ? '#b91c1c' : '#047857' }}>
              {stats.compliance.expiring30}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Expiring within 30 days ({stats.compliance.total} total)
            </p>
          </div>
        </div>
      )}

      {/* Visual Recharts Charts Section */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
          {/* Incidents by Severity Bar Chart */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={16} color="var(--primary)" /> Incidents Severity Breakdown
            </h4>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #D9E3EC', borderRadius: '8px', color: '#17324D', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Compliance Expiry Bar Chart */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="#10b981" /> Compliance Expiry Timeline
            </h4>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complianceChartData}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #D9E3EC', borderRadius: '8px', color: '#17324D', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {complianceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inspection Results Pie Chart */}
          {inspectionPieData.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} color="#f59e0b" /> Inspection Outcome Distribution
              </h4>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={inspectionPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                      {inspectionPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #D9E3EC', borderRadius: '8px', color: '#17324D', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#475569' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Modules Navigation Grid */}
      <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity size={18} color="var(--primary)" />
        <span>Core Plant Safety Modules</span>
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {modules.map((m) => {
          const Icon = m.icon;
          const isAccessible = user && m.roles.includes(user.role);

          return (
            <div
              key={m.title}
              className={`glass-panel ${isAccessible ? 'glass-panel-hover' : ''}`}
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                opacity: isAccessible ? 1 : 0.65,
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '10px',
                  background: `${m.color}14`, border: `1px solid ${m.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={22} color={m.color} />
                </div>

                {m.count && isAccessible && (
                  <span style={{
                    fontSize: '0.72rem', color: m.color, background: `${m.color}12`,
                    border: `1px solid ${m.color}25`, borderRadius: '9999px', padding: '0.2rem 0.6rem', fontWeight: 600
                  }}>
                    {m.count}
                  </span>
                )}
              </div>

              <h4 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>{m.title}</h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', flex: 1, marginBottom: '1.25rem' }}>
                {m.desc}
              </p>

              {isAccessible ? (
                <button
                  onClick={() => navigate(m.route)}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <span>Access Module</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  disabled
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', cursor: 'not-allowed', opacity: 0.5 }}
                >
                  <span>Requires Authorization</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
