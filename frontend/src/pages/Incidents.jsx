import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  AlertOctagon,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
  FileText
} from 'lucide-react';

const Incidents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'Hydrogen Leak',
    severity: 'medium',
    location: '',
    description: '',
    evidenceUrl: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/incidents');
      setIncidents(res.data);
    } catch (err) {
      console.error('Failed to fetch incidents', err);
      setError(err.response?.data?.message || 'Failed to load incident reports from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.title || !formData.location || !formData.description) {
      setFormError('Please fill in all required fields (Title, Location, Description)');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        type: formData.type,
        severity: formData.severity,
        location: formData.location,
        description: formData.description,
        evidenceUrls: formData.evidenceUrl ? [formData.evidenceUrl] : []
      };

      const res = await api.post('/incidents', payload);
      setFormSuccess('Incident report successfully logged to MongoDB!');
      setFormData({
        title: '',
        type: 'Hydrogen Leak',
        severity: 'medium',
        location: '',
        description: '',
        evidenceUrl: ''
      });
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 1200);
      fetchIncidents();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit incident report');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Incidents
  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.reportedBy?.name && inc.reportedBy.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity = severityFilter === 'all' || inc.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || inc.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertOctagon size={24} color="#06b6d4" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: '#ffffff' }}>Incident Reporting Module</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              {user?.role === 'worker' ? 'Your Reported Plant Safety Incidents' : 'Plant Safety Incident Management Hub'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={fetchIncidents} className="btn btn-secondary btn-sm" title="Refresh List">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={18} />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '0.75rem' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by title, location, type or reporter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Severity:</span>
            <select
              className="form-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
            >
              <option value="all">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Status:</span>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
            >
              <option value="all">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="underInvestigation">Under Investigation</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Incident List View */}
      {error && (
        <div className="glass-panel" style={{ padding: '1.25rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={fetchIncidents} className="btn btn-secondary btn-sm">Try Again</button>
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--primary)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
          <div>Fetching real incident logs from MongoDB...</div>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <FileText size={36} color="var(--text-dim)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.35rem' }}>
            {incidents.length === 0 ? 'No Incident Reports Logged Yet' : 'No Incidents Match Your Filters'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.25rem auto' }}>
            {incidents.length === 0
              ? 'Click "Report Incident" above to log a new safety issue or hydrogen anomaly.'
              : 'Try clearing your search term or severity/status filter dropdowns.'}
          </p>
          {incidents.length === 0 && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
              <Plus size={16} />
              <span>Report First Incident</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredIncidents.map((inc) => (
            <div
              key={inc._id}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                cursor: 'pointer'
              }}
              onClick={() => navigate(`/incidents/${inc._id}`)}
            >
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  {getSeverityBadge(inc.severity)}
                  {getStatusBadge(inc.status)}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.05)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                    {inc.type}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff', fontWeight: 600, marginBottom: '0.35rem' }}>
                  {inc.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={14} color="var(--primary)" />
                    <span>{inc.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={14} color="var(--text-dim)" />
                    <span>Reporter: <strong>{inc.reportedBy?.name || 'Unknown'}</strong> ({inc.reportedBy?.role || 'worker'})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={14} color="var(--text-dim)" />
                    <span>{new Date(inc.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/incidents/${inc._id}`);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Eye size={15} />
                  <span>View Details & Timeline</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE INCIDENT MODAL FORM */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertOctagon size={22} color="#06b6d4" />
                <h3 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Report Safety Incident</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Incident Title *</label>
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  placeholder="e.g. H2 Pressure Surge in Storage Line B"
                  value={formData.title}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Incident Type *</label>
                  <select name="type" className="form-select" value={formData.type} onChange={handleFormChange}>
                    <option value="Hydrogen Leak">Hydrogen Leak</option>
                    <option value="Pressure Spike">Pressure Spike</option>
                    <option value="Equipment Anomaly">Equipment Anomaly</option>
                    <option value="Thermal Overheating">Thermal Overheating</option>
                    <option value="Safety Valve Failure">Safety Valve Failure</option>
                    <option value="Near Miss">Near Miss</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Severity Level *</label>
                  <select name="severity" className="form-select" value={formData.severity} onChange={handleFormChange}>
                    <option value="low">Low (Minor anomaly)</option>
                    <option value="medium">Medium (Requires inspection)</option>
                    <option value="high">High (Immediate intervention)</option>
                    <option value="critical">Critical (Emergency risk)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Plant Location *</label>
                <input
                  type="text"
                  name="location"
                  className="form-input"
                  placeholder="e.g. Electrolyzer Bay 2 - Valve CV-409"
                  value={formData.location}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Detailed Description *</label>
                <textarea
                  name="description"
                  className="form-textarea"
                  rows={4}
                  placeholder="Describe observations, sensor gauge readings, or equipment behaviour..."
                  value={formData.description}
                  onChange={handleFormChange}
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Evidence / Image URL (Optional)</label>
                <input
                  type="url"
                  name="evidenceUrl"
                  className="form-input"
                  placeholder="https://example.com/photo-log.jpg"
                  value={formData.evidenceUrl}
                  onChange={handleFormChange}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting to MongoDB...' : 'Submit Incident Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidents;
