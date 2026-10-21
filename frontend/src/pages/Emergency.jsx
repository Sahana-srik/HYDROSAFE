import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Siren, Plus, ChevronRight, AlertTriangle, CheckCircle2,
  Clock, XCircle, Loader2, RefreshCw, Filter, ShieldAlert
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const TEMPLATE_LABELS = {
  gas_leak: 'Gas Leak',
  fire: 'Fire',
  pressure_spike: 'Pressure Spike',
  chemical_spill: 'Chemical Spill',
  explosion: 'Explosion',
  evacuation: 'Evacuation',
  general: 'General Emergency'
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#B91C1C', bg: '#FEF2F2', icon: AlertTriangle },
  completed: { label: 'Completed', color: '#047857', bg: '#ECFDF5', icon: CheckCircle2 },
  overridden: { label: 'Overridden', color: '#B45309', bg: '#FFFBEB', icon: ShieldAlert },
  cancelled: { label: 'Cancelled', color: '#475569', bg: '#F1F5F9', icon: XCircle }
};

const CreateWorkflowModal = ({ incidents, onClose, onCreated }) => {
  const [form, setForm] = useState({ incidentId: '', templateType: 'gas_leak', title: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.incidentId) { setError('Please select an incident'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/emergency-workflows', form);
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create workflow');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(2px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-modal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: '#FEF2F2', border: '1px solid #FECACA',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Siren size={20} color="#EF4444" />
          </div>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 700 }}>Create Emergency Workflow</h3>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            color: '#B91C1C', borderRadius: '8px', padding: '0.75rem 1rem',
            fontSize: '0.85rem', marginBottom: '1rem'
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Linked Incident *</label>
            <select
              className="form-select"
              value={form.incidentId}
              onChange={(e) => setForm({ ...form, incidentId: e.target.value })}
              required
            >
              <option value="">Select an incident...</option>
              {incidents.map((inc) => (
                <option key={inc._id} value={inc._id}>
                  [{inc.severity?.toUpperCase()}] {inc.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Response Template *</label>
            <select
              className="form-select"
              value={form.templateType}
              onChange={(e) => setForm({ ...form, templateType: e.target.value })}
            >
              {Object.entries(TEMPLATE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Workflow Title (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Gas Leak Response — Zone B"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WorkflowCard = ({ workflow }) => {
  const cfg = STATUS_CONFIG[workflow.overallStatus] || STATUS_CONFIG.active;
  const StatusIcon = cfg.icon;
  const totalSteps = workflow.steps?.length || 0;
  const completedSteps = workflow.steps?.filter(s => ['completed', 'overridden'].includes(s.status)).length || 0;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <Link to={`/emergency/${workflow._id}`} style={{ textDecoration: 'none' }}>
      <div className="glass-panel glass-panel-hover" style={{ padding: '1.25rem', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33`,
                borderRadius: '9999px', padding: '0.2rem 0.6rem',
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
              }}>
                <StatusIcon size={11} />
                {cfg.label.toUpperCase()}
              </span>
              <span style={{
                background: 'var(--primary-light)', color: 'var(--primary)',
                border: '1px solid var(--primary-border)',
                borderRadius: '9999px', padding: '0.2rem 0.6rem',
                fontSize: '0.72rem', fontWeight: 600
              }}>
                {TEMPLATE_LABELS[workflow.templateType] || workflow.templateType}
              </span>
            </div>

            <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.35rem', fontWeight: 600 }}>
              {workflow.title || `${TEMPLATE_LABELS[workflow.templateType]} Response`}
            </h3>

            {workflow.incidentId && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                📋 Incident: {workflow.incidentId.title}
              </p>
            )}

            {/* Progress bar */}
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Steps: {completedSteps}/{totalSteps}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{progress}%</span>
              </div>
              <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '2px' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  width: `${progress}%`,
                  background: workflow.overallStatus === 'completed' ? '#10b981' :
                    workflow.overallStatus === 'cancelled' ? '#6b7280' : '#ef4444',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
            <ChevronRight size={18} color="var(--text-dim)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {new Date(workflow.createdAt).toLocaleDateString()}
            </span>
            {workflow.triggeredBy && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                By: {workflow.triggeredBy.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

const Emergency = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const canCreateWorkflow = ['safetyOfficer', 'superAdmin'].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('templateType', typeFilter);

      const [wfRes, incRes] = await Promise.all([
        api.get(`/emergency-workflows?${params.toString()}`),
        canCreateWorkflow ? api.get('/incidents') : Promise.resolve({ data: [] })
      ]);
      setWorkflows(wfRes.data);
      setIncidents(incRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load emergency workflows');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, canCreateWorkflow]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreated = (wf) => {
    setWorkflows((prev) => [wf, ...prev]);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: '#FEF2F2', border: '1px solid #FECACA',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Siren size={22} color="#EF4444" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 700 }}>Emergency Response</h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
              Step-based emergency workflow engine
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          {canCreateWorkflow && (
            <button className="btn btn-danger btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={16} />
              Create Workflow
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.375rem 0.625rem', fontSize: '0.83rem' }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="overridden">Overridden</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.375rem 0.625rem', fontSize: '0.83rem' }}
          >
            <option value="">All Types</option>
            {Object.entries(TEMPLATE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {(statusFilter || typeFilter) && (
            <button className="btn btn-secondary btn-sm"
              onClick={() => { setStatusFilter(''); setTypeFilter(''); }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading emergency workflows...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <AlertTriangle size={32} color="#EF4444" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#B91C1C', marginBottom: '1rem' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>Retry</button>
        </div>
      ) : workflows.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px',
            background: '#FEF2F2', border: '1px solid #FECACA',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
          }}>
            <Siren size={28} color="#EF4444" />
          </div>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 600 }}>No Emergency Workflows</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {statusFilter || typeFilter
              ? 'No workflows match the current filters.'
              : 'No emergency response workflows have been created yet.'}
          </p>
          {canCreateWorkflow && !statusFilter && !typeFilter && (
            <button className="btn btn-danger" style={{ marginTop: '1.25rem' }} onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Create First Workflow
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {workflows.map((wf) => <WorkflowCard key={wf._id} workflow={wf} />)}
        </div>
      )}

      {showCreate && (
        <CreateWorkflowModal
          incidents={incidents}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Emergency;
