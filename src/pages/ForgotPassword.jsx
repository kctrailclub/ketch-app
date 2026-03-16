import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/client';
import './Login.css';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again or contact info@kctrailclub.org for help.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
            <path d="M14 3L4 13h4v2L5 18h5v2H9v5h10v-5h-1v-2h5l-3-3v-2h4L14 3z" fill="currentColor"/>
          </svg>
        </div>
        <h1>Reset Password</h1>

        {sent ? (
          <>
            <p className="login-subtitle" style={{ marginBottom:'1.5rem' }}>
              If that email is registered you'll receive a reset link shortly. Check your inbox.
            </p>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }}>
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <p className="login-subtitle">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} style={{ textAlign:'left' }}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width:'100%', marginTop:'0.5rem' }}
                disabled={loading}
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
            <Link to="/login" className="login-forgot">Back to Sign In</Link>
          </>
        )}
      </div>
    </div>
  );
}
