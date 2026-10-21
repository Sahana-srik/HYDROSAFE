import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Siren, ArrowLeft, CheckCircle2, Clock, XCircle, AlertTriangle,
  ShieldAlert, Loader2, User, CalendarClock, FileWarning,
  ChevronRight, RefreshCw, Lock
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const TEMPLATE_LABELS = {
  gas_leak: 'Gas Leak', fire: 'Fire', pressure_spike: 'Pressure Spike',
  chemical_spill: 'Chemical Spill', explosion: 'Explosion',
  evacuation: 'Evacuation', general: 'General Emergency'
};

const STEP_STATUS = {
  pending: { label: 'Pending', color: '#475569', bg: '#F1F5F9', Icon: Clock },
  in_progress: { label: 'In Progress', color: '#B45309', bg: '#FFFBEB', Icon: Loader2 },
  completed: { label: 'Completed', color: '#047857', bg: '#ECFDF5', Icon: CheckCircle2 },
  overridden: { label: 'Overridden', color: '#6D28D9', bg: '#F5F3FF', Icon: ShieldAlert },
  skipped: { label: 'Skipped', color: '#64748B', bg: '#F8FAFC', Icon: XCircle }
};

const WORKFLOW_STATUS_CONFIG = {
  active: { label: 'Active', color: '#B91C1C', bg: '#FEF2F2' },
  completed: { label: 'Completed', color: '#047857', bg: '#ECFDF5' },
  overridden: { label: 'Overridden', color: '#6D28D9', bg: '#F5F3FF' },
  cancelled: { label: 'Cancelled', color: '#475569', bg: '#F1F5F9' }
};

// Override Modal
const OverrideModal = ({ step, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 5) { setError('Reason must be at least 5 characters'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(step.order, reason);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Override failed');
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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-modal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <ShieldAlert size={22} color="#7c3aed" />
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: 700 }}>Override Step {step.order}</h3>
        </div>

        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem'
        }}>
          <p style={{ fontSize: '0.82rem', color: '#B45309' }}>
            ⚠️ <strong>Warning:</strong> This override will be permanently recorded in the audit log with your identity and reason.
          </p>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Step: <strong style={{ color: 'var(--text-main)' }}>{step.name}</strong>
        </p>

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            color: '#B91C1C', borderRadius: '8px', padding: '0.75rem', fontSize: '0.83rem', marginBottom: '1rem'
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Override Reason * (mandatory for audit)</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Explain why this step is being overridden..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1, padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 600,
                borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Overriding...</> : 'Confirm Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Complete Step Note Modal
const CompleteModal = ({ step, onClose, onConfirm }) => {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(step.order, note);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete step');
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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '2rem', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-modal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={22} color="#047857" />
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: 700 }}>Complete Step {step.order}</h3>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Step: <strong style={{ color: 'var(--text-main)' }}>{step.name}</strong>
        </p>

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            color: '#B91C1C', borderRadius: '8px', padding: '0.75rem', fontSize: '0.83rem', marginBottom: '1rem'
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Completion Note (optional)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Add any relevant notes about completing this step..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Completing...</> : 'Mark as Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Individual Step Row
const StepRow = ({ step, index, isCurrentStep, canComplete, canOverride, onComplete, onOverride }) => {
  const cfg = STEP_STATUS[step.status] || STEP_STATUS.pending;
  const StepIcon = cfg.Icon;
  const isOverdue = step.dueAt && new Date(step.dueAt) < new Date() && step.status === 'pending';

  return (
    <div style={{
      display: 'flex', gap: '1rem', alignItems: 'flex-start',
      padding: '1rem', borderRadius: '10px',
      background: isCurrentStep ? 'rgba(239,68,68,0.05)' : 'transparent',
      border: isCurrentStep ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent',
      transition: 'all 0.2s ease'
    }}>
      {/* Step number / status circle */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
        background: cfg.bg, border: `2px solid ${cfg.color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <StepIcon size={16} color={cfg.color}
          style={step.status === 'in_progress' ? { animation: 'spin 2s linear infinite' } : {}} />
      </div>

      {/* Step content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            STEP {step.order}
          </span>
          <span style={{
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33`,
            borderRadius: '9999px', padding: '0.15rem 0.5rem', fontSize: '0.68rem', fontWeight: 700
          }}>
            {cfg.label}
          </span>
          {isOverdue && (
            <span style={{
              background: '#FEF2F2', color: '#B91C1C',
              border: '1px solid #FECACA',
              borderRadius: '9999px', padding: '0.15rem 0.5rem', fontSize: '0.68rem', fontWeight: 700
            }}>
              OVERDUE
            </span>
          )}
        </div>

        <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>
          {step.name}
        </p>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          {step.assignedTo && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={12} />
              {step.assignedTo.name || 'Unassigned'}
              {step.assignedTo.role && <span style={{ color: 'var(--text-dim)' }}>({step.assignedTo.role})</span>}
            </span>
          )}
          {step.dueAt && (
            <span style={{ fontSize: '0.78rem', color: isOverdue ? '#B91C1C' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CalendarClock size={12} />
              Due: {new Date(step.dueAt).toLocaleString()}
            </span>
          )}
          {step.completedAt && (
            <span style={{ fontSize: '0.78rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle2 size={12} />
              Completed: {new Date(step.completedAt).toLocaleString()}
              {step.completedBy && ` by ${step.completedBy.name}`}
            </span>
          )}
        </div>

        {step.note && (
          <p style={{
            marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)',
            fontStyle: 'italic', padding: '0.35rem 0.6rem',
            background: '#F8FAFC', borderRadius: '6px',
            borderLeft: '3px solid var(--border-color)'
          }}>
            {step.note}
          </p>
        )}

        {/* Action buttons */}
        {(canComplete || canOverride) && step.status === 'pending' && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {canComplete && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => onComplete(step)}
                disabled={!isCurrentStep}
                title={!isCurrentStep ? 'Complete previous steps first' : 'Mark this step as complete'}
              >
                <CheckCircle2 size={13} />
                {isCurrentStep ? 'Complete Step' : 'Locked'}
                {!isCurrentStep && <Lock size={11} />}
              </button>
            )}
            {canOverride && (
              <button
                className="btn btn-sm"
                style={{
                  background: '#F5F3FF', border: '1px solid #DDD6FE',
                  color: '#6D28D9', fontSize: '0.75rem', padding: '0.375rem 0.75rem'
                }}
                onClick={() => onOverride(step)}
              >
                <ShieldAlert size={13} />
                Override
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const EmergencyDetail = () => {
  const { workflowId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completeStep, setCompleteStep] = useState(null);
  const [overrideStep, setOverrideStep] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const canComplete = ['ert', 'safetyOfficer', 'superAdmin'].includes(user?.role);
  const canOverride = ['safetyOfficer', 'superAdmin'].includes(user?.role);
  const canCancel = ['safetyOfficer', 'superAdmin'].includes(user?.role);

  const fetchWorkflow = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/emergency-workflows/${workflowId}`);
      setWorkflow(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => { fetchWorkflow(); }, [fetchWorkflow]);

  // Determine the current actionable step (first pending step)
  const currentStep = workflow?.steps?.find((s) => s.status === 'pending');

  const handleComplete = async (stepOrder, note) => {
    const res = await api.patch(
      `/emergency-workflows/${workflowId}/steps/${stepOrder}/complete`,
      { note }
    );
    setWorkflow(res.data);
  };

  const handleOverride = async (stepOrder, reason) => {
    const res = await api.patch(
      `/emergency-workflows/${workflowId}/steps/${stepOrder}/override`,
      { reason }
    );
    setWorkflow(res.data);
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this emergency workflow?')) return;
    setCancelling(true);
    try {
      const res = await api.patch(`/emergency-workflows/${workflowId}/cancel`, {
        reason: 'Cancelled by Safety Officer'
      });
      setWorkflow(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel workflow');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading emergency workflow...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link to="/emergency" className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <AlertTriangle size={32} color="#EF4444" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#B91C1C' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!workflow) return null;

  const wfStatusCfg = WORKFLOW_STATUS_CONFIG[workflow.overallStatus] || WORKFLOW_STATUS_CONFIG.active;
  const totalSteps = workflow.steps?.length || 0;
  const completedSteps = workflow.steps?.filter(s => ['completed', 'overridden'].includes(s.status)).length || 0;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link to="/emergency" className="btn btn-secondary btn-sm">
          <ArrowLeft size={15} /> Back to Workflows
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchWorkflow} disabled={loading}>
            <RefreshCw size={14} />
          </button>
          {canCancel && workflow.overallStatus === 'active' && (
            <button className="btn btn-danger btn-sm" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={14} />}
              Cancel Workflow
            </button>
          )}
        </div>
      </div>

      {/* Workflow header card */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '48px', height: '48px', flexShrink: 0, borderRadius: '12px',
            background: '#FEF2F2', border: '1px solid #FECACA',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Siren size={24} color="#EF4444" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{
                background: wfStatusCfg.bg, color: wfStatusCfg.color,
                border: `1px solid ${wfStatusCfg.color}33`,
                borderRadius: '9999px', padding: '0.2rem 0.7rem', fontSize: '0.72rem', fontWeight: 700
              }}>
                {wfStatusCfg.label.toUpperCase()}
              </span>
              <span style={{
                background: 'var(--primary-light)', color: 'var(--primary)',
                border: '1px solid var(--primary-border)',
                borderRadius: '9999px', padding: '0.2rem 0.7rem', fontSize: '0.72rem', fontWeight: 600
              }}>
                {TEMPLATE_LABELS[workflow.templateType] || workflow.templateType}
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 700, marginBottom: '0.5rem' }}>
              {workflow.title}
            </h2>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                🚨 Triggered by: <strong style={{ color: 'var(--text-main)' }}>{workflow.triggeredBy?.name}</strong> ({workflow.triggeredBy?.role})
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                📅 Created: {new Date(workflow.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Linked incident */}
        {workflow.incidentId && (
          <div style={{
            marginTop: '1rem', padding: '0.75rem 1rem',
            background: '#F8FAFC', borderRadius: '8px',
            border: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                LINKED INCIDENT
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>
                {workflow.incidentId.title}
              </span>
              {workflow.incidentId.location && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
                  @ {workflow.incidentId.location}
                </span>
              )}
            </div>
            <Link
              to={`/incidents/${workflow.incidentId._id}`}
              className="btn btn-secondary btn-sm"
            >
              View Incident <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {/* Progress */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Progress: {completedSteps} of {totalSteps} steps completed
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{progress}%</span>
          </div>
          <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px' }}>
            <div style={{
              height: '100%', borderRadius: '3px', transition: 'width 0.6s ease',
              width: `${progress}%`,
              background: workflow.overallStatus === 'completed' ? '#10b981' :
                workflow.overallStatus === 'cancelled' ? '#6b7280' :
                  'linear-gradient(90deg, #ef4444, #f97316)'
            }} />
          </div>
        </div>
      </div>

      {/* Steps timeline */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1.25rem', fontWeight: 600 }}>
          Response Steps
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {workflow.steps?.map((step, idx) => {
            const isCurrentStepForUser = currentStep?.order === step.order;
            return (
              <div key={step._id || idx}>
                <StepRow
                  step={step}
                  index={idx}
                  isCurrentStep={isCurrentStepForUser}
                  canComplete={canComplete && workflow.overallStatus === 'active'}
                  canOverride={canOverride && workflow.overallStatus === 'active'}
                  onComplete={() => setCompleteStep(step)}
                  onOverride={() => setOverrideStep(step)}
                />
                {idx < workflow.steps.length - 1 && (
                  <div style={{
                    width: '2px', height: '16px', marginLeft: '27px',
                    background: 'var(--border-color)'
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Override Log */}
      {workflow.overrideLog?.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} color="#8b5cf6" />
            Override Audit Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {workflow.overrideLog.map((entry, idx) => (
              <div key={idx} style={{
                padding: '0.75rem 1rem',
                background: '#F5F3FF', borderRadius: '8px',
                border: '1px solid #DDD6FE'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.82rem', color: '#6D28D9', fontWeight: 600 }}>
                    Step {entry.stepOrder}: {entry.stepName}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  <strong style={{ color: 'var(--text-main)' }}>Overridden by:</strong>{' '}
                  {entry.overriddenBy?.name} ({entry.overriddenBy?.role})
                </p>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  "{entry.reason}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {completeStep && (
        <CompleteModal
          step={completeStep}
          onClose={() => setCompleteStep(null)}
          onConfirm={handleComplete}
        />
      )}
      {overrideStep && (
        <OverrideModal
          step={overrideStep}
          onClose={() => setOverrideStep(null)}
          onConfirm={handleOverride}
        />
      )}
    </div>
  );
};

export default EmergencyDetail;
