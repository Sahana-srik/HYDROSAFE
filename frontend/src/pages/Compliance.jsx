import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck2, Plus, Download, ExternalLink, AlertTriangle, CheckCircle2,
  Clock, Loader2, RefreshCw, Filter, Upload, Trash2, GitBranch,
  FileText, Shield, FlaskConical, FileKey, FileWarning, FolderOpen, X
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CATEGORY_CONFIG = {
  certificate: { label: 'Certificate', color: '#10b981', bg: 'rgba(16,185,129,0.12)', Icon: Shield },
  license: { label: 'License', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', Icon: FileKey },
  sds: { label: 'SDS', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', Icon: FlaskConical },
  permit: { label: 'Permit', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', Icon: FileText },
  regulation: { label: 'Regulation', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', Icon: FileCheck2 },
  procedure: { label: 'Procedure', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', Icon: FolderOpen },
  other: { label: 'Other', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', Icon: FileWarning }
};

const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return { label: 'No Expiry', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', level: 'none' };
  const now = new Date();
  const exp = new Date(expiryDate);
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: 'Expired', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', level: 'expired', days: diffDays };
  if (diffDays <= 30) return { label: `Exp. in ${diffDays}d`, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', level: 'critical', days: diffDays };
  if (diffDays <= 60) return { label: `Exp. in ${diffDays}d`, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', level: 'warning', days: diffDays };
  if (diffDays <= 90) return { label: `Exp. in ${diffDays}d`, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', level: 'caution', days: diffDays };
  return { label: `${diffDays}d remaining`, color: '#10b981', bg: 'rgba(16,185,129,0.12)', level: 'ok', days: diffDays };
};

// ─── Upload / Edit Modal ────────────────────────────────────────────────────
const DocFormModal = ({ mode = 'create', existingDoc = null, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    title: existingDoc?.title || '',
    category: existingDoc?.category || 'certificate',
    issueDate: existingDoc?.issueDate ? existingDoc.issueDate.split('T')[0] : '',
    expiryDate: existingDoc?.expiryDate ? existingDoc.expiryDate.split('T')[0] : '',
    version: existingDoc?.version || '1.0',
    notes: existingDoc?.notes || ''
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isNewVersion = mode === 'newVersion';
  const title = isNewVersion ? 'Create New Version' : mode === 'edit' ? 'Edit Document' : 'Upload Compliance Document';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.category || !form.expiryDate) {
      setError('Title, Category, and Expiry Date are required');
      return;
    }
    setSubmitting(true);
    setError('');

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
    if (file) formData.append('file', file);

    try {
      let res;
      if (mode === 'create') {
        res = await api.post('/compliance-docs', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else if (mode === 'edit') {
        res = await api.patch(`/compliance-docs/${existingDoc._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else if (isNewVersion) {
        res = await api.post(`/compliance-docs/${existingDoc._id}/new-version`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      onSuccess(res.data, mode);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(2px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      overflowY: 'auto'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '2rem', margin: 'auto', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-modal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: '#ECFDF5', border: '1px solid #A7F3D0',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {isNewVersion ? <GitBranch size={18} color="#047857" /> : <Upload size={18} color="#047857" />}
            </div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: 700 }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {isNewVersion && existingDoc && (
          <div style={{
            background: '#ECFDF5', border: '1px solid #A7F3D0',
            borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem'
          }}>
            <p style={{ fontSize: '0.82rem', color: '#047857' }}>
              Creating new version of: <strong>{existingDoc.title}</strong> (current: v{existingDoc.version})
            </p>
          </div>
        )}

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            color: '#B91C1C', borderRadius: '8px', padding: '0.75rem 1rem',
            fontSize: '0.85rem', marginBottom: '1rem'
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Document Title *</label>
              <input type="text" className="form-input" placeholder="e.g., ISO 22734 Certificate 2025"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORY_CONFIG).map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Version</label>
              <input type="text" className="form-input" placeholder="e.g. 1.0"
                value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Issue Date</label>
              <input type="date" className="form-input"
                value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Expiry Date *</label>
              <input type="date" className="form-input"
                value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} required />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} placeholder="Optional notes..."
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ resize: 'vertical' }} />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">
                Attach File{' '}
                <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                  (PDF, Word, Excel, Image — max 20MB)
                </span>
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                onChange={(e) => setFile(e.target.files[0])}
                style={{
                  width: '100%', padding: '0.6rem 0.875rem',
                  background: '#FFFFFF', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-main)',
                  fontSize: '0.875rem', cursor: 'pointer'
                }}
              />
              {mode !== 'create' && existingDoc?.fileUrl && !file && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                  Current file: {existingDoc.originalFilename || 'attachment'}. Leave empty to keep existing.
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={submitting} style={{ flex: 1 }}>
              {submitting
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                : isNewVersion ? 'Create New Version' : mode === 'edit' ? 'Save Changes' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Expiry Dashboard Tabs ─────────────────────────────────────────────────
const ExpiryTab = ({ label, count, active, onClick, color }) => (
  <button onClick={onClick} style={{
    padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.83rem', fontWeight: 600,
    cursor: 'pointer', border: active ? '1px solid var(--border-color)' : '1px solid transparent',
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    background: active ? '#FFFFFF' : 'transparent',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
    color: active ? 'var(--text-main)' : 'var(--text-muted)',
    transition: 'all 0.2s ease'
  }}>
    {label}
    <span style={{
      background: active ? `rgba(${color}, 0.15)` : '#E2E8F0',
      color: active ? `rgb(${color})` : 'var(--text-muted)',
      borderRadius: '9999px', padding: '0.1rem 0.45rem', fontSize: '0.72rem', fontWeight: 700
    }}>{count}</span>
  </button>
);

// ─── Document Card ─────────────────────────────────────────────────────────
const DocCard = ({ doc, canEdit, onEdit, onDelete, onNewVersion }) => {
  const catCfg = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.other;
  const CatIcon = catCfg.Icon;
  const expiry = getExpiryStatus(doc.expiryDate);
  const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  return (
    <div className="glass-panel glass-panel-hover" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        {/* Category icon */}
        <div style={{
          width: '44px', height: '44px', flexShrink: 0, borderRadius: '10px',
          background: catCfg.bg, border: `1px solid ${catCfg.color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <CatIcon size={20} color={catCfg.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: catCfg.bg, color: catCfg.color,
                  border: `1px solid ${catCfg.color}33`,
                  borderRadius: '9999px', padding: '0.15rem 0.5rem', fontSize: '0.68rem', fontWeight: 700
                }}>
                  {catCfg.label.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                  v{doc.version}
                </span>
                {doc.previousVersionId && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <GitBranch size={10} /> Versioned
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.25rem' }}>
                {doc.title}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Uploaded by {doc.uploadedBy?.name} • {new Date(doc.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Expiry badge */}
            <span style={{
              background: expiry.bg, color: expiry.color,
              border: `1px solid ${expiry.color}33`,
              borderRadius: '9999px', padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 700,
              whiteSpace: 'nowrap', flexShrink: 0
            }}>
              {expiry.level === 'expired' ? '⛔ ' : expiry.level === 'critical' ? '🔴 ' : expiry.level === 'warning' ? '🟡 ' : '✅ '}
              {expiry.label}
            </span>
          </div>

          {/* Dates */}
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {doc.issueDate && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle2 size={11} /> Issued: {new Date(doc.issueDate).toLocaleDateString()}
              </span>
            )}
            <span style={{ fontSize: '0.78rem', color: expiry.color, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={11} /> Expires: {new Date(doc.expiryDate).toLocaleDateString()}
            </span>
          </div>

          {doc.notes && (
            <p style={{
              fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic',
              marginBottom: '0.75rem', padding: '0.35rem 0.6rem',
              background: '#F8FAFC', borderRadius: '6px',
              borderLeft: '3px solid var(--border-color)'
            }}>
              {doc.notes}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {doc.fileUrl && (
              <a
                href={`${apiBase}${doc.fileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <Download size={13} />
                {doc.originalFilename ? 'Download' : 'View'}
              </a>
            )}
            {canEdit && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => onEdit(doc)}>
                  Edit
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#6D28D9', borderColor: '#DDD6FE', background: '#F5F3FF' }}
                  onClick={() => onNewVersion(doc)}
                >
                  <GitBranch size={12} /> New Version
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#B91C1C', borderColor: '#FECACA', background: '#FEF2F2' }}
                  onClick={() => onDelete(doc)}
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Compliance Page ──────────────────────────────────────────────────
const Compliance = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expiryTab, setExpiryTab] = useState('all'); // all | 30 | 60 | 90
  const [expiryData, setExpiryData] = useState(null);
  const [modal, setModal] = useState(null); // { mode, doc? }

  const canEdit = ['complianceAdmin', 'superAdmin'].includes(user?.role);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ isActive: 'true' });
      if (categoryFilter) params.set('category', categoryFilter);
      if (search) params.set('search', search);

      const [docsRes, exp30, exp60, exp90] = await Promise.all([
        api.get(`/compliance-docs?${params.toString()}`),
        api.get('/compliance-docs/expiring?days=30'),
        api.get('/compliance-docs/expiring?days=60'),
        api.get('/compliance-docs/expiring?days=90')
      ]);

      setDocs(docsRes.data);
      setExpiryData({
        30: exp30.data,
        60: exp60.data,
        90: exp90.data
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load compliance documents');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleSuccess = (doc, mode) => {
    if (mode === 'create' || mode === 'newVersion') {
      setDocs((prev) => [doc, ...prev]);
    } else if (mode === 'edit') {
      setDocs((prev) => prev.map((d) => d._id === doc._id ? doc : d));
    }
    // Refresh expiry data in background
    fetchDocs();
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Archive "${doc.title}"? It will be soft-deleted and no longer visible.`)) return;
    try {
      await api.delete(`/compliance-docs/${doc._id}`);
      setDocs((prev) => prev.filter((d) => d._id !== doc._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete document');
    }
  };

  // Determine displayed docs based on expiry tab
  const displayedDocs = (() => {
    if (expiryTab === 'all') return docs;
    const expData = expiryData?.[parseInt(expiryTab)];
    if (!expData) return docs;
    const ids = new Set([
      ...expData.expiringSoon.map(d => d._id),
      ...expData.alreadyExpired.map(d => d._id)
    ]);
    return docs.filter(d => ids.has(d._id));
  })();

  const expiredCount = expiryData?.[30]?.alreadyExpired?.length || 0;
  const exp30Count = expiryData?.[30]?.expiringSoon?.length || 0;
  const exp60Count = (expiryData?.[60]?.expiringSoon?.length || 0) - exp30Count;
  const exp90Count = (expiryData?.[90]?.expiringSoon?.length || 0) - exp30Count - exp60Count;

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: '#ECFDF5', border: '1px solid #A7F3D0',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FileCheck2 size={22} color="#047857" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 700 }}>Compliance Vault</h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
              ISO 22734 / NFPA 2 Certificates, Licenses, SDS & Permits
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchDocs} disabled={loading}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          {canEdit && (
            <button className="btn btn-success btn-sm" onClick={() => setModal({ mode: 'create' })}>
              <Plus size={16} /> Upload Document
            </button>
          )}
        </div>
      </div>

      {/* Expiry Dashboard Tabs */}
      {expiryData && (
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '0.6rem', letterSpacing: '0.05em' }}>
            EXPIRY DASHBOARD
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <ExpiryTab
              label="All Documents"
              count={docs.length}
              active={expiryTab === 'all'}
              onClick={() => setExpiryTab('all')}
              color="14,165,233"
            />
            {expiredCount > 0 && (
              <ExpiryTab
                label="⛔ Expired"
                count={expiredCount}
                active={expiryTab === 'expired'}
                onClick={() => setExpiryTab('30')}
                color="239,68,68"
              />
            )}
            <ExpiryTab
              label="🔴 Within 30 Days"
              count={exp30Count}
              active={expiryTab === '30'}
              onClick={() => setExpiryTab('30')}
              color="239,68,68"
            />
            <ExpiryTab
              label="🟡 Within 60 Days"
              count={exp30Count + exp60Count}
              active={expiryTab === '60'}
              onClick={() => setExpiryTab('60')}
              color="245,158,11"
            />
            <ExpiryTab
              label="🟡 Within 90 Days"
              count={exp30Count + exp60Count + exp90Count}
              active={expiryTab === '90'}
              onClick={() => setExpiryTab('90')}
              color="245,158,11"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '220px', padding: '0.375rem 0.625rem', fontSize: '0.83rem' }}
          />
          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.375rem 0.625rem', fontSize: '0.83rem' }}
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
          {(categoryFilter || search) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setCategoryFilter(''); setSearch(''); }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading compliance documents...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <AlertTriangle size={32} color="#EF4444" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#B91C1C', marginBottom: '1rem' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={fetchDocs}>Retry</button>
        </div>
      ) : displayedDocs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px',
            background: '#ECFDF5', border: '1px solid #A7F3D0',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
          }}>
            <FileCheck2 size={28} color="#047857" />
          </div>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 600 }}>No Documents Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {categoryFilter || search
              ? 'No documents match your current filters.'
              : 'No compliance documents have been uploaded yet.'}
          </p>
          {canEdit && !categoryFilter && !search && (
            <button className="btn btn-success" style={{ marginTop: '1.25rem' }}
              onClick={() => setModal({ mode: 'create' })}>
              <Plus size={16} /> Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayedDocs.map((doc) => (
            <DocCard
              key={doc._id}
              doc={doc}
              canEdit={canEdit}
              onEdit={(d) => setModal({ mode: 'edit', doc: d })}
              onDelete={handleDelete}
              onNewVersion={(d) => setModal({ mode: 'newVersion', doc: d })}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <DocFormModal
          mode={modal.mode}
          existingDoc={modal.doc}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default Compliance;
