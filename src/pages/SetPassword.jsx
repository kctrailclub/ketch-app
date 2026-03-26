import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setPassword } from '../api/client';
import './Login.css';

export default function SetPassword() {
  const [password, setPass]     = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const token                   = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await setPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again or contact membership@kctrailclub.org for help.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <p style={{color:'var(--text-muted)'}}>Invalid or missing token. Please use the link from your email.</p>
      </div>
    </div>
  );

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">
          <img src="/kctc-logo.svg" alt="Ken-Caryl Trail Club" style={{ height: 60 }} />
        </div>
        <h1>Set Your Password</h1>
        <p className="login-subtitle">Choose a password to access your account</p>

        {success ? (
          <div className="alert alert-success">
            Password set! Redirecting to login…
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPass(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Set Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
