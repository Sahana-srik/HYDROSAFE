import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  AlertOctagon,
  ArrowLeft,
  Clock,
  MapPin,
  User,
  Shield,
  Siren,
  CheckCircle,
  AlertTriangle,
  FileText,
  Activity,
  Send,
  ExternalLink
} from 'lucide-react';

const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status update form state
  const [newStatus, setNewStatus] = useState('acknowledged');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState('');

  // Escalation state
  const [escalating, setEscalating] = useState(false);
  const [escalateFeedback, setEscalateFeedback] = useState('');

  const fetchIncidentDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/incidents/${id}`);
      setIncident(res.data);
      setNewStatus(res.data.status);
    } catch (err) {
      console.error('Failed to load incident detail', err);
      setError(err.response?.data?.message || 'Failed to load incident details from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentDetail();
  }, [id]);

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setStatusFeedback('');
    setUpdatingStatus(true);

    try {
      const res = await api.patch(`/incidents/${id}/status`, {
        status: newStatus,
        note: statusNote
      });
      setIncident(res.data);
      setStatusFeedback(`Status successfully updated to '${newStatus}'!`);
      setStatusNote('');
      setTimeout(() => setStatusFeedback(''), 3000);
    } catch (err) {
      setStatusFeedback(err.response?.data?.message || 'Failed to update incident status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleEscalate = async () => {
    if (!window.confirm('Are you sure you want to trigger emergency escalation for this incident?')) {
      return;
    }

    setEscalating(true);
    setEscalateFeedback('');

    try {
      const res = await api.post(`/incidents/${id}/escalate`, {
        reason: 'High-severity safety risk identified by Safety Officer'
      });
      setIncident(res.data.incident || res.data);
      setEscalateFeedback('Incident successfully escalated to Emergency Response!');
      setTimeout(() => setEscalateFeedback(''), 3000);
    } catch (err) {
      setEscalateFeedback(err.response?.data?.message || 'Failed to escalate incident.');
    } finally {
      setEscalating(false);
    }
  };

  const isSafetyOfficerOrAdmin = user && ['safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin'].includes(user.role);

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'low':
        return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Low</span>;
      case 'medium':
        return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>Medium</span>;
      case 'high':
        return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>High</span>;
      case 'critical':
        return <span className="badge" style={{ background: 'rgba(220, 38, 38, 0.3)', color: '#fca5a5', border: '1px solid #ef4444', fontWeight: 800 }}>Critical</span>;
      default:
        return <span className="badge">{severity}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'reported':
        return <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' }}>Reported</span>;
      case 'acknowledged':
        return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>Acknowledged</span>;
      case 'underInvestigation':
        return <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)' }}>Under Investigation</span>;
      case 'resolved':
        return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Resolved</span>;
      case 'closed':
        return <span className="badge" style={{ background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', border: '1px solid rgba(107, 114, 128, 0.3)' }}>Closed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 0', textAlign: 'center', color: 'var(--primary)' }}>
        Loading incident details from backend...
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <AlertTriangle size={36} color="#f87171" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '0.5rem' }}>{error || 'Incident Not Found'}</h3>
          <button onClick={() => navigate('/incidents')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            <ArrowLeft size={16} />
            <span>Back to Incidents List</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Bar Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={() => navigate('/incidents')} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Incidents</span>
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {incident.linkedWorkflowId && (
            <Link
              to={`/emergency/${incident.linkedWorkflowId._id || incident.linkedWorkflowId}`}
              className="btn btn-secondary btn-sm"
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' }}
            >
              <Siren size={16} />
              <span>View Emergency Workflow</span>
            </Link>
          )}

          {/* Escalation Action Button for Safety Officers */}
          {isSafetyOfficerOrAdmin && (
            <button
              onClick={handleEscalate}
              disabled={escalating}
              className="btn btn-danger btn-sm"
              title="Trigger emergency escalation for high severity incident"
            >
              <Siren size={16} />
              <span>{escalating ? 'Escalating...' : 'Escalate to Emergency Response'}</span>
            </button>
          )}
        </div>
      </div>


      {escalateFeedback && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Siren size={16} />
          <span>{escalateFeedback}</span>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Details & Timeline */}
        <div>
          {/* Incident Overview Card */}
          <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {getSeverityBadge(incident.severity)}
              {getStatusBadge(incident.status)}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.05)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                Type: {incident.type}
              </span>
            </div>

            <h1 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '0.5rem' }}>{incident.title}</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={15} color="var(--primary)" />
                <span>{incident.location}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={15} color="var(--text-dim)" />
                <span>Reported: {new Date(incident.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Incident Description
              </h4>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-main)', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                {incident.description}
              </p>
            </div>

            {/* Evidence Section */}
            {incident.evidenceUrls && incident.evidenceUrls.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.25rem', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Logged Evidence Files
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {incident.evidenceUrls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <ExternalLink size={12} />
                      <span>Evidence Link #{idx + 1}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Visual Timeline Card */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--primary)" />
              <span>Status Audit Timeline</span>
            </h3>

            <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border-color)' }}>
              {incident.timeline && incident.timeline.map((item, idx) => (
                <div key={idx} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  {/* Timeline Dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-1.95rem',
                    top: '0.2rem',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: idx === incident.timeline.length - 1 ? 'var(--primary)' : 'var(--bg-secondary)',
                    border: `2px solid ${idx === incident.timeline.length - 1 ? '#38bdf8' : 'var(--text-muted)'}`,
                    boxShadow: idx === incident.timeline.length - 1 ? '0 0 10px var(--primary)' : 'none'
                  }}></div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    {getStatusBadge(item.status)}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 500, marginTop: '0.25rem' }}>
                    {item.note || `Status set to ${item.status}`}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Updated by: <strong>{item.changedBy?.name || 'System User'}</strong> ({item.changedBy?.role || 'worker'})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Reporter Info & Status Controls */}
        <div>
          {/* Reporter Profile Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
              Reported Personnel Info
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(14, 165, 233, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                fontWeight: 700
              }}>
                {incident.reportedBy?.name ? incident.reportedBy.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
                  {incident.reportedBy?.name || 'Unknown Reporter'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {incident.reportedBy?.email}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'grid', gap: '0.35rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <div>Role: <strong style={{ color: '#ffffff' }}>{incident.reportedBy?.role}</strong></div>
              <div>Employee ID: <strong style={{ color: '#ffffff' }}>{incident.reportedBy?.employeeId}</strong></div>
              <div>Department: <strong style={{ color: '#ffffff' }}>{incident.reportedBy?.department}</strong></div>
            </div>
          </div>

          {/* Status Update Control Panel for Safety Officers / Admins */}
          {isSafetyOfficerOrAdmin ? (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={16} color="var(--primary)" />
                <span>Safety Officer Controls</span>
              </h4>

              {statusFeedback && (
                <div style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  {statusFeedback}
                </div>
              )}

              <form onSubmit={handleStatusSubmit}>
                <div className="form-group">
                  <label className="form-label">Transition Status</label>
                  <select
                    className="form-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="reported">Reported</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="underInvestigation">Under Investigation</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Audit Log Note</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Enter status update notes or field inspection finding..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updatingStatus}
                  style={{ width: '100%' }}
                >
                  <Send size={15} />
                  <span>{updatingStatus ? 'Updating Status...' : 'Update Status & Append Timeline'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              <Shield size={20} color="var(--text-dim)" style={{ marginBottom: '0.35rem' }} />
              <div>Status transitions are restricted to Safety Officers, Inspectors, and Admins.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
