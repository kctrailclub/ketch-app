import { useState } from 'react';
import { Link } from 'react-router-dom';
import { submitRegistration } from '../api/client';
import './Login.css';

export default function Register() {
  const [form,    setForm]    = useState({ firstname:'', lastname:'', email:'', phone:'', honeypot:'' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await submitRegistration(form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again or contact membership@kctrailclub.org for help.');
    } finally { setLoading(false); }
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
        <h1>Request an Account</h1>

        {success ? (
          <>
            <p className="login-subtitle" style={{ marginBottom:'1rem' }}>
              Your request has been submitted! An admin will review it and send you an invite email once approved.
            </p>
            <div style={{
              background:'var(--bg-muted, #f3f4f6)', borderRadius:'var(--radius-sm, 8px)',
              padding:'1rem', marginBottom:'1.5rem', textAlign:'left', fontSize:'0.9rem',
              border:'1px solid var(--border, #e5e7eb)',
            }}>
              <strong>Before you can volunteer, please complete the KCTC Volunteer Waiver on the{' '}
              <a href="https://ken-carylranch.org" target="_blank" rel="noopener noreferrer">
                Ken-Caryl Ranch website
              </a>.</strong>{' '}
              Your registration will be reviewed once your waiver is on file.
            </div>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }}>
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <p className="login-subtitle">Submit your info and an admin will review your request.</p>
            <form onSubmit={handleSubmit} style={{ textAlign:'left' }}>
              {error && <div className="alert alert-error">{error}</div>}

              {/* Honeypot — hidden from real users, bots fill it in */}
              <div style={{ display:'none' }} aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  value={form.honeypot}
                  onChange={e => set('honeypot', e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem' }}>
                <div className="form-group">
                  <label htmlFor="firstname">First Name</label>
                  <input id="firstname" value={form.firstname} onChange={e => set('firstname', e.target.value)} required autoComplete="given-name" />
                </div>
                <div className="form-group">
                  <label htmlFor="lastname">Last Name</label>
                  <input id="lastname" value={form.lastname} onChange={e => set('lastname', e.target.value)} required autoComplete="family-name" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} required autoComplete="email" />
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  Phone
                  <span style={{ fontWeight:400, color:'var(--text-muted)', fontSize:'0.85rem', marginLeft:'0.4rem' }}>(optional)</span>
                </label>
                <input id="phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width:'100%', marginTop:'0.5rem' }} disabled={loading}>
                {loading ? 'Submitting…' : 'Request Account'}
              </button>
            </form>
            <Link to="/login" className="login-forgot">Already have an account? Sign in</Link>
          </>
        )}
      </div>
    </div>
  );
}
