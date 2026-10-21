import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

const Inspections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inspections, setInspections] = useState([]);
  const [inspectorsList, setInspectorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Schedule Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    equipment: '',
    zone: 'Zone A - Electrolysis',
    type: 'routine',
    scheduledDate: new Date().toISOString().split('T')[0],
    inspectorId: '',
    summaryNotes: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInspections = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/inspections');
      setInspections(res.data);
    } catch (err) {
      console.error('Failed to fetch inspections', err);
      setError(err.response?.data?.message || 'Failed to load inspections from backend.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForAssignment = async () => {
    try {
      const res = await api.get('/auth/users');
      // Filter inspectors & safety officers
      const inspectors = res.data.filter(u => ['inspector', 'safetyOfficer', 'superAdmin'].includes(u.role));
      setInspectorsList(inspectors);
      if (inspectors.length > 0) {
        setFormData(prev => ({ ...prev, inspectorId: inspectors[0]._id }));
      }
    } catch (err) {
      console.warn('Could not fetch user list for inspector dropdown:', err.message);
    }
  };

  useEffect(() => {
    fetchInspections();
    fetchUsersForAssignment();
  }, []);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.equipment || !formData.zone || !formData.scheduledDate || !formData.inspectorId) {
      setFormError('Please fill in all required fields: Equipment, Zone, Date, Inspector');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        equipment: formData.equipment,
        zone: formData.zone,
        type: formData.type,
        scheduledDate: formData.scheduledDate,
        inspector: formData.inspectorId,
        summaryNotes: formData.summaryNotes
      };

      await api.post('/inspections', payload);
      setFormSuccess('Inspection successfully scheduled and assigned!');
      setFormData({
        equipment: '',
        zone: 'Zone A - Electrolysis',
        type: 'routine',
        scheduledDate: new Date().toISOString().split('T')[0],
        inspectorId: inspectorsList[0]?._id || '',
        summaryNotes: ''
      });
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 1200);
      fetchInspections();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to schedule inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logic
  const filteredInspections = inspections.filter((ins) => {
    const matchesSearch =
      ins.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ins.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ins.inspector?.name && ins.inspector.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || ins.status === statusFilter;
    const matchesType = typeFilter === 'all' || ins.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

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

  const isSchedulePermitted = user && ['safetyOfficer', 'inspector', 'complianceAdmin', 'superAdmin'].includes(user.role);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#B45309'
          }}>
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 700 }}>Inspection Management</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Plant Equipment Safety Checklists & Audit Verification
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={fetchInspections} className="btn btn-secondary btn-sm" title="Refresh List">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {isSchedulePermitted && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              <Plus size={18} />
              <span>Schedule Inspection</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar Filters */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '0.75rem' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search equipment, zone, or inspector name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Status:</span>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Type:</span>
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
            >
              <option value="all">All Types</option>
              <option value="routine">Routine</option>
              <option value="ad-hoc">Ad-hoc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main List */}
      {error && (
        <div className="glass-panel" style={{ padding: '1.25rem', borderColor: '#FECACA', background: '#FEF2F2', color: '#B91C1C', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={fetchInspections} className="btn btn-secondary btn-sm">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--primary)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
          <div>Fetching inspection records...</div>
        </div>
      ) : filteredInspections.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <FileSpreadsheet size={36} color="var(--text-dim)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '0.35rem', fontWeight: 600 }}>
            {inspections.length === 0 ? 'No Inspections Scheduled' : 'No Inspections Match Filter'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.25rem auto' }}>
            {inspections.length === 0
              ? 'Click "Schedule Inspection" above to create an assigned safety checklist.'
              : 'Try clearing your search term or status/type filter dropdowns.'}
          </p>
          {inspections.length === 0 && isSchedulePermitted && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
              <Plus size={16} />
              <span>Schedule First Inspection</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredInspections.map((ins) => (
            <div
              key={ins._id}
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
              onClick={() => navigate(`/inspections/${ins._id}`)}
            >
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  {getStatusBadge(ins.status)}
                  {getResultBadge(ins.overallResult)}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'capitalize' }}>
                    Type: {ins.type}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.35rem' }}>
                  {ins.equipment}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={14} color="var(--primary)" />
                    <span>{ins.zone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={14} color="var(--text-dim)" />
                    <span>Inspector: <strong style={{ color: 'var(--text-main)' }}>{ins.inspector?.name || 'Unassigned'}</strong> ({ins.inspector?.role || 'inspector'})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} color="var(--text-dim)" />
                    <span>Scheduled: {new Date(ins.scheduledDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/inspections/${ins._id}`);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Eye size={15} />
                  <span>{ins.status === 'completed' ? 'View Results' : 'Execute Inspection'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SCHEDULE INSPECTION MODAL FORM */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardCheck size={22} color="#f59e0b" />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 700 }}>Schedule Safety Inspection</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label className="form-label">Equipment / Component Name *</label>
                <input
                  type="text"
                  name="equipment"
                  className="form-input"
                  placeholder="e.g. Electrolyzer Stack Unit #1 / PRV-102"
                  value={formData.equipment}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Plant Zone *</label>
                  <input
                    type="text"
                    name="zone"
                    className="form-input"
                    placeholder="Zone A - Electrolysis"
                    value={formData.zone}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Inspection Type *</label>
                  <select name="type" className="form-select" value={formData.type} onChange={handleFormChange}>
                    <option value="routine">Routine</option>
                    <option value="ad-hoc">Ad-hoc</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Scheduled Date *</label>
                  <input
                    type="date"
                    name="scheduledDate"
                    className="form-input"
                    value={formData.scheduledDate}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Inspector *</label>
                  <select
                    name="inspectorId"
                    className="form-select"
                    value={formData.inspectorId}
                    onChange={handleFormChange}
                    required
                  >
                    {inspectorsList.length === 0 ? (
                      <option value="">No Inspectors Found (Seed DB)</option>
                    ) : (
                      inspectorsList.map(u => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({u.role})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Summary / Pre-inspection Notes</label>
                <textarea
                  name="summaryNotes"
                  className="form-textarea"
                  rows={3}
                  placeholder="Additional instructions or focus areas for inspector..."
                  value={formData.summaryNotes}
                  onChange={handleFormChange}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Scheduling...' : 'Schedule & Assign Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inspections;
