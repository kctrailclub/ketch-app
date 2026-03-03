import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHours, getProjects, submitHours, deleteHours } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Submit Hours ──────────────────────────────────────────────
export function SubmitHours() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({
    project_id: '',
    service_date: new Date().toISOString().slice(0,10),
    hours: '',
    notes: '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProjects(true).then(r => setProjects(r.data)).catch(console.error);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await submitHours({
        member_id:    user.user_id,
        project_id:   parseInt(form.project_id),
        service_date: form.service_date,
        hours:        parseFloat(form.hours),
        notes:        form.notes || null,
      });
      navigate('/hours');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit hours.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="page-header">
          <div className="page-header-text">
            <h1>Log Hours</h1>
            <p>Submit volunteer hours for admin approval</p>
          </div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="project">Project</label>
              <select
                id="project"
                value={form.project_id}
                onChange={e => set('project_id', e.target.value)}
                required
              >
                <option value="">Select a project…</option>
                {projects.map(p => (
                  <option key={p.project_id} value={p.project_id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">Service Date</label>
              <input
                id="date"
                type="date"
                value={form.service_date}
                onChange={e => set('service_date', e.target.value)}
                min={`${new Date().getFullYear()}-01-01`}
                max={`${new Date().getFullYear()}-12-31`}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="hours">Hours</label>
              <input
                id="hours"
                type="number"
                min="0.25"
                step="0.25"
                value={form.hours}
                onChange={e => set('hours', e.target.value)}
                placeholder="e.g. 2.5"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes <span style={{fontWeight:400,textTransform:'none',color:'var(--text-muted)'}}>(optional)</span></label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Describe the work you did…"
              />
            </div>

            <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Hours'}
              </button>
              <Link to="/hours" className="btn btn-ghost">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── My Hours ──────────────────────────────────────────────────
export function MyHours() {
  const [hours,   setHours]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [year,    setYear]    = useState(new Date().getFullYear());

  const load = async () => {
    setLoading(true);
    try {
      const res = await getHours({ year, household_scope: true });
      setHours(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [year]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this hour record?')) return;
    try {
      await deleteHours(id);
      setHours(h => h.filter(x => x.hour_id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not delete.');
    }
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const total = hours.filter(h => h.status === 'approved').reduce((s, h) => s + h.hours, 0);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>My Hours</h1>
            <p>{total.toFixed(1)} approved hours in {year}</p>
          </div>
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width:'auto' }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Link to="/hours/submit" className="btn btn-primary">+ Log Hours</Link>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <span className="spinner" />
          ) : hours.length === 0 ? (
            <div className="empty-state">
              <p>No hours found for {year}.</p>
              <Link to="/hours/submit" className="btn btn-primary" style={{marginTop:'1rem'}}>Log Hours</Link>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Hours</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map(h => (
                    <tr key={h.hour_id}>
                      <td><strong>{h.member_name}</strong></td>
                      <td>{new Date(h.service_date).toLocaleDateString()}</td>
                      <td><strong>{h.project_name}</strong></td>
                      <td>{h.hours}</td>
                      <td style={{maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                        {h.notes || '—'}
                      </td>
                      <td><span className={`badge badge-${h.status}`}>{h.status}</span></td>
                      <td>
                        {h.status === 'pending' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(h.hour_id)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
