import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  ClipboardCheck,
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertTriangle,
  Send,
  Plus,
  AlertOctagon,
  FileText
} from 'lucide-react';

const InspectionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Execution state
  const [checklistState, setChecklistState] = useState([]);
  const [summaryNotes, setSummaryNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState('');

  // Incident Modal State for Failed Items
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentData, setIncidentData] = useState({
    title: '',
    type: 'Equipment Anomaly',
    severity: 'high',
    location: '',
    description: ''
  });
  const [creatingIncident, setCreatingIncident] = useState(false);
  const [incidentSuccess, setIncidentSuccess] = useState('');

  const fetchInspection = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/inspections/${id}`);
      setInspection(res.data);
      setChecklistState(res.data.checklist || []);
      setSummaryNotes(res.data.summaryNotes || '');
    } catch (err) {
      console.error('Failed to load inspection', err);
      setError(err.response?.data?.message || 'Failed to load inspection details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspection();
  }, [id]);

  const handleResultToggle = (index, newResult) => {
    const updated = [...checklistState];
    updated[index].result = newResult;
    setChecklistState(updated);
  };

  const handleNoteChange = (index, newNote) => {
    const updated = [...checklistState];
    updated[index].note = newNote;
    setChecklistState(updated);
  };

  const calculatePreviewResult = () => {
    if (!checklistState || checklistState.length === 0) return 'pending';
    const hasFail = checklistState.some(item => item.result === 'fail');
    if (hasFail) return 'fail';
    const hasPass = checklistState.some(item => item.result === 'pass');
    if (hasPass) return 'pass';
    return 'NA';
  };

  const handleSubmitChecklist = async (e) => {
    e.preventDefault();
    setSubmitFeedback('');
    setSubmitting(true);

    try {
      const payload = {
        checklist: checklistState,
        summaryNotes
      };

      const res = await api.post(`/inspections/${id}/submit`, payload);
      setInspection(res.data.inspection);
      setSubmitFeedback(res.data.message || 'Inspection successfully submitted!');
      setTimeout(() => setSubmitFeedback(''), 4000);
    } catch (err) {
      setSubmitFeedback(err.response?.data?.message || 'Failed to submit inspection checklist.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateIncidentForFailedItem = (failedItem) => {
    setIncidentData({
      title: `Inspection Failure: ${failedItem.item.slice(0, 60)}`,
      type: 'Equipment Anomaly',
      severity: 'high',
      location: `${inspection.equipment} (${inspection.zone})`,
      description: `Failed Inspection Checklist Item:\n"${failedItem.item}"\n\nInspector Finding:\n${failedItem.note || 'Failed inspection parameter.'}`
    });
    setShowIncidentModal(true);
  };

  const handleCreateIncidentSubmit = async (e) => {
    e.preventDefault();
    setCreatingIncident(true);
    setIncidentSuccess('');

    try {
      const res = await api.post('/incidents', incidentData);
      setIncidentSuccess(`Incident [${res.data._id}] successfully created!`);
      setTimeout(() => {
        setShowIncidentModal(false);
        setIncidentSuccess('');
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create incident');
    } finally {
      setCreatingIncident(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled':
        return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>Scheduled</span>;
      case 'completed':
        return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Completed</span>;
      case 'missed':
        return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Missed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getResultBadge = (result) => {
    switch (result) {
      case 'pass':
        return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981', fontWeight: 700 }}>PASS</span>;
      case 'fail':
        return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444', fontWeight: 800 }}>FAIL</span>;
      case 'pending':
        return <span className="badge" style={{ background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', border: '1px solid rgba(107, 114, 128, 0.3)' }}>Pending</span>;
      case 'NA':
        return <span className="badge" style={{ background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' }}>N/A</span>;
      default:
        return <span className="badge">{result}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 0', textAlign: 'center', color: 'var(--primary)' }}>
        Loading inspection details...
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <AlertTriangle size={36} color="#f87171" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '0.5rem' }}>{error || 'Inspection Not Found'}</h3>
          <button onClick={() => navigate('/inspections')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            <ArrowLeft size={16} />
            <span>Back to Inspections List</span>
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = inspection.status === 'completed';
  const previewOverall = calculatePreviewResult();

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/inspections')} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Inspections</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {getStatusBadge(inspection.status)}
          {getResultBadge(inspection.overallResult)}
        </div>
      </div>

      {submitFeedback && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: submitFeedback.includes('COMPLETED') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', border: submitFeedback.includes('COMPLETED') ? '1px solid #10b981' : '1px solid #ef4444', color: submitFeedback.includes('COMPLETED') ? '#34d399' : '#fca5a5', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {submitFeedback}
        </div>
      )}

      {/* Inspection Overview Header Card */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.05)', padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'capitalize' }}>
            Type: {inspection.type}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
            Zone: {inspection.zone}
          </span>
        </div>

        <h1 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '0.75rem' }}>
          {inspection.equipment}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={15} color="var(--primary)" />
            <span>{inspection.zone}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <User size={15} color="var(--text-dim)" />
            <span>Assigned Inspector: <strong>{inspection.inspector?.name || 'Unassigned'}</strong> ({inspection.inspector?.email})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={15} color="var(--text-dim)" />
            <span>Scheduled: {new Date(inspection.scheduledDate).toLocaleDateString()}</span>
          </div>
          {inspection.completedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#34d399' }}>
              <CheckCircle2 size={15} />
              <span>Completed: {new Date(inspection.completedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Checklist Execution Section */}
      <form onSubmit={handleSubmitChecklist}>
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardCheck size={20} color="#f59e0b" />
              <span>Safety Checklist Items ({checklistState.length})</span>
            </h3>

            {!isCompleted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>Calculated Outcome:</span>
                {getResultBadge(previewOverall)}
              </div>
            )}
          </div>

          {/* Checklist Items List */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {checklistState.map((item, idx) => {
              const isFailed = item.result === 'fail';

              return (
                <div
                  key={idx}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: isFailed ? 'rgba(239, 68, 68, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                    border: isFailed ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: isFailed ? '#fca5a5' : '#ffffff', marginBottom: '0.25rem' }}>
                        {idx + 1}. {item.item}
                      </div>
                      {isFailed && (
                        <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <AlertTriangle size={13} />
                          <span>FAILED PARAMETER IDENTIFIED IN INSPECTION</span>
                        </div>
                      )}
                    </div>

                    {/* Result Controls (Pass / Fail / NA) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        disabled={isCompleted}
                        onClick={() => handleResultToggle(idx, 'pass')}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: item.result === 'pass' ? '1px solid #10b981' : '1px solid var(--border-color)',
                          background: item.result === 'pass' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                          color: item.result === 'pass' ? '#34d399' : 'var(--text-muted)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: isCompleted ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>PASS</span>
                      </button>

                      <button
                        type="button"
                        disabled={isCompleted}
                        onClick={() => handleResultToggle(idx, 'fail')}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: item.result === 'fail' ? '1px solid #ef4444' : '1px solid var(--border-color)',
                          background: item.result === 'fail' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.03)',
                          color: item.result === 'fail' ? '#fca5a5' : 'var(--text-muted)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: isCompleted ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <XCircle size={14} />
                        <span>FAIL</span>
                      </button>

                      <button
                        type="button"
                        disabled={isCompleted}
                        onClick={() => handleResultToggle(idx, 'NA')}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: item.result === 'NA' ? '1px solid var(--text-muted)' : '1px solid var(--border-color)',
                          background: item.result === 'NA' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          color: item.result === 'NA' ? '#ffffff' : 'var(--text-muted)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: isCompleted ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <MinusCircle size={14} />
                        <span>N/A</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes input */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <input
                      type="text"
                      disabled={isCompleted}
                      className="form-input"
                      placeholder="Inspector note or findings for this item..."
                      value={item.note || ''}
                      onChange={(e) => handleNoteChange(idx, e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', background: 'rgba(0, 0, 0, 0.3)' }}
                    />
                  </div>

                  {/* Optional Action for Failed Item: Create Incident */}
                  {isFailed && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => openCreateIncidentForFailedItem(item)}
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      >
                        <AlertOctagon size={13} />
                        <span>Create Incident from Failed Item</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Notes Input */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <label className="form-label">Inspector Summary Notes</label>
            <textarea
              disabled={isCompleted}
              className="form-textarea"
              rows={3}
              placeholder="Overall observations, maintenance recommendations, or follow-up instructions..."
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
            ></textarea>
          </div>

          {!isCompleted && (
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <Send size={16} />
                <span>{submitting ? 'Submitting to MongoDB...' : 'Submit & Complete Inspection'}</span>
              </button>
            </div>
          )}
        </div>
      </form>

      {/* CREATE INCIDENT FROM FAILED ITEM MODAL */}
      {showIncidentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '520px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border-highlight)', borderRadius: 'var(--radius-xl)', padding: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertOctagon size={22} color="#ef4444" />
              <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Log Incident from Inspection Failure</h3>
            </div>

            {incidentSuccess && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {incidentSuccess}
              </div>
            )}

            <form onSubmit={handleCreateIncidentSubmit}>
              <div className="form-group">
                <label className="form-label">Incident Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={incidentData.title}
                  onChange={(e) => setIncidentData({ ...incidentData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={incidentData.location}
                  onChange={(e) => setIncidentData({ ...incidentData, location: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description & Failure Finding</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={incidentData.description}
                  onChange={(e) => setIncidentData({ ...incidentData, description: e.target.value })}
                  required
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowIncidentModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger btn-sm" disabled={creatingIncident}>
                  {creatingIncident ? 'Creating Incident...' : 'Confirm & Log Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionDetail;
