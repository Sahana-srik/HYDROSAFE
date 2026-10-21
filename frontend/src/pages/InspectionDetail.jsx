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
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [incidentData, setIncidentData] = useState({
    title: '',
    type: 'Equipment Anomaly',
    severity: 'high',
    location: '',
    description: '',
    linkedInspectionId: null,
    linkedChecklistItemIndex: null,
    linkedChecklistItem: ''
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

    if (!checklistState || checklistState.length === 0) {
      setSubmitFeedback('Checklist is empty. Cannot submit inspection.');
      return;
    }

    // Require finding note if item failed
    const failedWithoutNote = checklistState.find(item => item.result === 'fail' && (!item.note || !item.note.trim()));
    if (failedWithoutNote) {
      setSubmitFeedback(`Please provide finding notes for failed item: "${failedWithoutNote.item.slice(0, 45)}..."`);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        checklist: checklistState,
        summaryNotes
      };

      const res = await api.post(`/inspections/${id}/submit`, payload);
      setInspection(res.data.inspection);
      setChecklistState(res.data.inspection.checklist || checklistState);
      setSubmitFeedback(res.data.message || 'Inspection successfully submitted!');
      setTimeout(() => setSubmitFeedback(''), 5000);
    } catch (err) {
      setSubmitFeedback(err.response?.data?.message || 'Failed to submit inspection checklist.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateIncidentForFailedItem = (failedItem, itemIndex) => {
    setSelectedItemIndex(itemIndex);
    setIncidentData({
      title: `Inspection Failure: ${failedItem.item.slice(0, 60)}`,
      type: 'Equipment Anomaly',
      severity: 'high',
      location: `${inspection.equipment} (${inspection.zone})`,
      description: `Failed Inspection Checklist Item:\n"${failedItem.item}"\n\nInspector Finding:\n${failedItem.note || 'Failed inspection parameter.'}`,
      linkedInspectionId: inspection._id,
      linkedChecklistItemIndex: itemIndex,
      linkedChecklistItem: failedItem.item
    });
    setShowIncidentModal(true);
  };

  const handleCreateIncidentSubmit = async (e) => {
    e.preventDefault();
    setCreatingIncident(true);
    setIncidentSuccess('');

    try {
      const res = await api.post('/incidents', incidentData);
      const createdIncident = res.data.incident || res.data;
      const createdId = createdIncident._id || res.data._id;

      // Update local checklist item state with linkedIncidentId
      if (selectedItemIndex !== null && checklistState[selectedItemIndex]) {
        const updated = [...checklistState];
        updated[selectedItemIndex].linkedIncidentId = createdId;
        setChecklistState(updated);
      }

      // Also update inspection.linkedIncidents
      setInspection(prev => ({
        ...prev,
        linkedIncidents: [...(prev?.linkedIncidents || []), createdIncident]
      }));

      setIncidentSuccess(`Incident successfully created and linked to this inspection!`);
      setTimeout(() => {
        setShowIncidentModal(false);
        setIncidentSuccess('');
      }, 1500);
    } catch (err) {
      if (err.response?.status === 409) {
        setIncidentSuccess('Incident already logged for this item.');
        const existingInc = err.response.data.incident;
        const existingId = existingInc?._id || 'linked';
        if (selectedItemIndex !== null && checklistState[selectedItemIndex]) {
          const updated = [...checklistState];
          updated[selectedItemIndex].linkedIncidentId = existingId;
          setChecklistState(updated);
        }
        if (existingInc) {
          setInspection(prev => ({
            ...prev,
            linkedIncidents: [...(prev?.linkedIncidents || []).filter(i => (i._id || i) !== existingId), existingInc]
          }));
        }
        setTimeout(() => {
          setShowIncidentModal(false);
          setIncidentSuccess('');
        }, 1500);
      } else {
        alert(err.response?.data?.message || 'Failed to create incident');
      }
    } finally {
      setCreatingIncident(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled':
        return <span className="badge" style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>Scheduled</span>;
      case 'completed':
        return <span className="badge" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>Completed</span>;
      case 'missed':
        return <span className="badge" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>Missed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getResultBadge = (result) => {
    switch (result) {
      case 'pass':
        return <span className="badge" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontWeight: 700 }}>PASS</span>;
      case 'fail':
        return <span className="badge" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', fontWeight: 800 }}>FAIL</span>;
      case 'pending':
        return <span className="badge" style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>Pending</span>;
      case 'NA':
        return <span className="badge" style={{ background: '#F1F5F9', color: '#64748B' }}>N/A</span>;
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
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <AlertTriangle size={36} color="#B91C1C" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#B91C1C', marginBottom: '0.5rem', fontWeight: 600 }}>{error || 'Inspection Not Found'}</h3>
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
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: submitFeedback.includes('COMPLETED') || submitFeedback.includes('successfully') ? '#ECFDF5' : '#FEF2F2',
          border: submitFeedback.includes('COMPLETED') || submitFeedback.includes('successfully') ? '1px solid #A7F3D0' : '1px solid #FECACA',
          color: submitFeedback.includes('COMPLETED') || submitFeedback.includes('successfully') ? '#047857' : '#B91C1C',
          marginBottom: '1.25rem',
          fontSize: '0.875rem'
        }}>
          {submitFeedback}
        </div>
      )}

      {/* Inspection Overview Header Card */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'capitalize' }}>
            Type: {inspection.type}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
            Zone: {inspection.zone}
          </span>
        </div>

        <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', fontWeight: 700, marginBottom: '0.75rem' }}>
          {inspection.equipment}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={15} color="var(--primary)" />
            <span>{inspection.zone}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <User size={15} color="var(--text-dim)" />
            <span>Assigned Inspector: <strong style={{ color: 'var(--text-main)' }}>{inspection.inspector?.name || 'Unassigned'}</strong> ({inspection.inspector?.email})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={15} color="var(--text-dim)" />
            <span>Scheduled: {new Date(inspection.scheduledDate).toLocaleDateString()}</span>
          </div>
          {inspection.completedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#047857' }}>
              <CheckCircle2 size={15} />
              <span>Completed: {new Date(inspection.completedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {inspection.linkedIncidents && inspection.linkedIncidents.length > 0 && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertOctagon size={14} color="#DC2626" />
              Linked Incidents ({inspection.linkedIncidents.length}):
            </span>
            {inspection.linkedIncidents.map((inc, i) => {
              const incId = typeof inc === 'object' ? inc._id : inc;
              const incTitle = typeof inc === 'object' && inc.title ? inc.title : `Incident #${String(incId).slice(-6)}`;
              return (
                <span
                  key={incId || i}
                  onClick={() => navigate('/incidents')}
                  style={{
                    fontSize: '0.75rem',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#B91C1C',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  title="Click to view in Incidents"
                >
                  {incTitle.length > 40 ? incTitle.slice(0, 37) + '...' : incTitle} ({String(incId).slice(-6)})
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Checklist Execution Section */}
      <form onSubmit={handleSubmitChecklist}>
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    background: isFailed ? '#FEF2F2' : '#F8FAFC',
                    border: isFailed ? '1px solid #FECACA' : '1px solid var(--border-color)',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: isFailed ? '#B91C1C' : 'var(--text-main)', marginBottom: '0.25rem' }}>
                        {idx + 1}. {item.item}
                      </div>
                      {isFailed && (
                        <div style={{ fontSize: '0.75rem', color: '#B91C1C', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
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
                          border: item.result === 'pass' ? '1px solid #A7F3D0' : '1px solid var(--border-color)',
                          background: item.result === 'pass' ? '#ECFDF5' : '#FFFFFF',
                          color: item.result === 'pass' ? '#047857' : 'var(--text-muted)',
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
                          border: item.result === 'fail' ? '1px solid #FECACA' : '1px solid var(--border-color)',
                          background: item.result === 'fail' ? '#FEF2F2' : '#FFFFFF',
                          color: item.result === 'fail' ? '#B91C1C' : 'var(--text-muted)',
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
                          border: item.result === 'NA' ? '1px solid #CBD5E1' : '1px solid var(--border-color)',
                          background: item.result === 'NA' ? '#F1F5F9' : '#FFFFFF',
                          color: item.result === 'NA' ? 'var(--text-main)' : 'var(--text-muted)',
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
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', background: '#FFFFFF' }}
                    />
                  </div>

                  {/* Optional Action for Failed Item: Create Incident */}
                  {isFailed && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed #FECACA', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {item.linkedIncidentId ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                          <CheckCircle2 size={13} color="#059669" />
                          <span>Incident Linked (#{String(item.linkedIncidentId).slice(-6)})</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openCreateIncidentForFailedItem(item, idx)}
                          className="btn btn-danger btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                        >
                          <AlertOctagon size={13} />
                          <span>Create Incident from Failed Item</span>
                        </button>
                      )}
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
                <span>{submitting ? 'Submitting...' : 'Submit & Complete Inspection'}</span>
              </button>
            </div>
          )}
        </div>
      </form>

      {/* CREATE INCIDENT FROM FAILED ITEM MODAL */}
      {showIncidentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertOctagon size={22} color="#EF4444" />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>Log Incident from Inspection Failure</h3>
            </div>

            {incidentSuccess && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontSize: '0.85rem', marginBottom: '1rem' }}>
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
