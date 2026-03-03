import { useState } from 'react';
import { changePassword } from '../api/client';

export default function ChangePassword() {
  const [form,    setForm]    = useState({ current_password: '', new_password: '', confirm: '' });
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(false);
    if (form.new_password !== form.confirm) {
      return setError('New passwords do not match.');
    }
    if (form.new_password.length < 8) {
      return setError('New password must be at least 8 characters.');
    }
    setLoading(true);
    try {
      await changePassword(form.current_password, form.new_password);
      setSuccess(true);
      setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setError('Current password is incorrect.');
      } else {
        setError(err.response?.data?.detail || 'Failed to change password.');
      }
    } finally { setLoading(false); }
  };

  const passwordField = (id, label, key, show, setShow) => (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={form[key]}
          onChange={e => set(key, e.target.value)}
          required
          style={{ paddingRight: '2.5rem' }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: 'absolute', right: '0.6rem', top: '50%',
            transform: 'translateY(-50%)', background: 'none',
            border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
            padding: '0.25rem', fontSize: '0.8rem', fontWeight: 500,
          }}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="page-header">
          <div className="page-header-text">
            <h1>Change Password</h1>
            <p>Update your account password</p>
          </div>
        </div>

        <div className="card">
          {success && (
            <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
              Password updated successfully.
            </div>
          )}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {passwordField('current', 'Current Password', 'current_password', showCur, setShowCur)}
            {passwordField('new',     'New Password',     'new_password',     showNew, setShowNew)}

            <div className="form-group">
              <label htmlFor="confirm">Confirm New Password</label>
              <input
                id="confirm"
                type={showNew ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
