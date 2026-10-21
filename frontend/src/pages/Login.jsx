import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  LogIn,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-badge">
            <ShieldCheck size={26} />
          </div>
          <h1 className="login-brand-title">HYDROSAFE</h1>
          <p className="login-brand-subtitle">
            Hydrogen Plant Safety & Compliance System
          </p>
        </div>

        {/* Feedback Alert */}
        {localError && (
          <div className="login-alert-error" role="alert">
            <AlertCircle size={16} />
            <span>{localError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label className="login-field-label" htmlFor="login-email">
              Email Address
            </label>
            <div className="login-input-wrapper">
              <Mail size={16} className="login-input-icon" />
              <input
                id="login-email"
                type="email"
                className="login-text-input"
                placeholder="name@hydro.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-form-group">
            <label className="login-field-label" htmlFor="login-password">
              Password
            </label>
            <div className="login-input-wrapper">
              <Lock size={16} className="login-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-text-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isSubmitting}
          >
            <LogIn size={18} />
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Register Link */}
        <div className="login-footer">
          Need new personnel access?{' '}
          <Link to="/register" className="login-footer-link">
            Register Personnel
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
