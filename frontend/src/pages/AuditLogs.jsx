import React, { useState, useEffect, useCallback } from 'react';
import {
  History, ShieldAlert, FileText, Siren, Shield, User,
  Clock, Loader2, RefreshCw, Filter, ChevronDown, ChevronUp, Code
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const MODULE_CONFIG = {
  EMERGENCY: { label: 'Emergency', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', Icon: Siren },
  COMPLIANCE: { label: 'Compliance', color: '#10b981', bg: 'rgba(16,185,129,0.12)', Icon: FileText },
  INCIDENT: { label: 'Incident', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', Icon: ShieldAlert },
  AUTH: { label: 'Auth', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', Icon: User },
  INSPECTION: { label: 'Inspection', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', Icon: Shield },
  USER_MGMT: { label: 'User Mgmt', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', Icon: User }
};

const AuditLogRow = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  const modCfg = MODULE_CONFIG[log.module] || MODULE_CONFIG.EMERGENCY;
  const ModIcon = modCfg.Icon;
  const userObj = log.performedBy || log.userId;

  const hasStates = Boolean(log.beforeState || log.afterState);

  return (
    <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: modCfg.bg, border: `1px solid ${modCfg.color}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ModIcon size={18} color={modCfg.color} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              <span style={{
                background: modCfg.bg, color: modCfg.color, border: `1px solid ${modCfg.color}33`,
                borderRadius: '9999px', padding: '0.15rem 0.55rem', fontSize: '0.68rem', fontWeight: 700
              }}>
                {modCfg.label.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
                {log.action}
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              {log.details}
            </p>

            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>
                👤 Performed by: <strong style={{ color: '#e2e8f0' }}>{userObj?.name || 'System'}</strong> ({userObj?.role || 'user'})
              </span>
              <span>
                📅 {new Date(log.createdAt).toLocaleString()}
              </span>
              {log.ipAddress && <span>🌐 IP: {log.ipAddress}</span>}
            </div>
          </div>
        </div>

        {hasStates && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          >
            <Code size={12} />
            {expanded ? 'Hide State' : 'View State'}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {expanded && hasStates && (
        <div style={{
          marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'
        }}>
          {log.beforeState && (
            <div>
              <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                BEFORE STATE
              </span>
              <pre style={{
                background: 'rgba(15,23,42,0.9)', padding: '0.75rem', borderRadius: '6px',
                fontSize: '0.72rem', color: '#cbd5e1', overflowX: 'auto', maxHeight: '180px'
              }}>
                {JSON.stringify(log.beforeState, null, 2)}
              </pre>
            </div>
          )}
          {log.afterState && (
            <div>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                AFTER STATE
              </span>
              <pre style={{
                background: 'rgba(15,23,42,0.9)', padding: '0.75rem', borderRadius: '6px',
                fontSize: '0.72rem', color: '#cbd5e1', overflowX: 'auto', maxHeight: '180px'
              }}>
                {JSON.stringify(log.afterState, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.set('module', moduleFilter);
      if (search) params.set('search', search);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, search]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <History size={22} color="#a78bfa" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: '#fff' }}>System Audit Trail</h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
              Immutable security and compliance event records
            </p>
          </div>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={fetchAuditLogs} disabled={loading}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Filter panel */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Search audit details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '240px', padding: '0.375rem 0.625rem', fontSize: '0.83rem' }}
          />
          <select
            className="form-select"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.375rem 0.625rem', fontSize: '0.83rem' }}
          >
            <option value="">All Modules</option>
            {Object.keys(MODULE_CONFIG).map((mod) => (
              <option key={mod} value={mod}>{MODULE_CONFIG[mod].label}</option>
            ))}
          </select>
          {(moduleFilter || search) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setModuleFilter(''); setSearch(''); }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Content */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading system audit logs...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'rgba(239,68,68,0.3)' }}>
          <ShieldAlert size={32} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={fetchAuditLogs}>Retry</button>
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <History size={36} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>No Audit Logs Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No audit log entries match your filter criteria.
          </p>
        </div>
      ) : (
        <div>
          {logs.map((log) => (
            <AuditLogRow key={log._id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
