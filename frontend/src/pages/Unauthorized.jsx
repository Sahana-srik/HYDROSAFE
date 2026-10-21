import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
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
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.25rem',
        color: '#DC2626'
      }}>
        <ShieldAlert size={32} />
      </div>
      <h2 style={{ fontSize: '1.65rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 700 }}>403 - Access Denied</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '1.5rem' }}>
        Your user role does not have authorization to view or perform operations in this safety module.
      </p>
      <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
        <ArrowLeft size={16} />
        <span>Return to Dashboard</span>
      </button>
    </div>
  );
};

export default Unauthorized;
