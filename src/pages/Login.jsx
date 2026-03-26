import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, getMe } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { signIn }  = useAuth();
  const navigate    = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      localStorage.setItem('access_token', res.data.access_token);
      const meRes = await getMe();
      signIn(res.data.access_token, res.data.refresh_token, meRes.data);
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setError('Incorrect email or password. Please try again.');
      } else if (status === 403) {
        setError('Your account is inactive. Please contact membership@kctrailclub.org for help.');
      } else {
        setError('Unable to sign in. Please check your connection and try again.');
      }
      localStorage.removeItem('access_token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">
          <img src="/kctc-logo.svg" alt="Ken-Caryl Trail Club" />
        </div>
        <h1>KCTC Volunteer Hours</h1>
        <p className="login-subtitle">Sign in to track your trail work</p>

        <form onSubmit={handleSubmit}>
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

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position:'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingRight:'2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{
                  position:'absolute', right:'0.6rem', top:'50%',
                  transform:'translateY(-50%)', background:'none',
                  border:'none', cursor:'pointer', color:'var(--text-muted)',
                  padding:'0.25rem', fontSize:'0.8rem', fontWeight:500,
                }}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <Link to="/forgot-password" className="login-forgot">
          Forgot your password?
        </Link>
        <Link to="/register" className="login-forgot" style={{ marginTop:'0.5rem' }}>
          Don't have an account? Request one
        </Link>
      </div>
    </div>
  );
}
