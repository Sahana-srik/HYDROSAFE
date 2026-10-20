import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '70vh',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '16px',
        background: 'rgba(14, 165, 233, 0.15)',
        border: '1px solid rgba(14, 165, 233, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.25rem'
      }}>
        <FileQuestion size={32} color="var(--primary)" />
      </div>
      <h2 style={{ fontSize: '1.65rem', color: '#ffffff', marginBottom: '0.5rem' }}>404 - Page Not Found</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '1.5rem' }}>
        The requested URL path could not be located in the HydroSafe system routes.
      </p>
      <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
        <ArrowLeft size={16} />
        <span>Return to Dashboard</span>
      </button>
    </div>
  );
};

export default NotFound;
