import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHours, getProjects, submitHours, updateHours, deleteHours, getRewardThreshold } from '../api/client';
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
  const { user }    = useAuth();
  const [hours,     setHours]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [threshold, setThreshold] = useState(null);
  const [projects,  setProjects]  = useState([]);
  const [editModal, setEditModal] = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const [saving,    setSaving]    = useState(false);

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
  useEffect(() => {
    getRewardThreshold().then(r => setThreshold(r.data.threshold)).catch(console.error);
    getProjects(true).then(r => setProjects(r.data)).catch(console.error);
  }, []);

  const openEdit = (h) => {
    setEditModal(h);
    setEditForm({
      project_id:   h.project_id,
      service_date: h.service_date,
      hours:        h.hours,
      notes:        h.notes || '',
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateHours(editModal.hour_id, {
        project_id:   parseInt(editForm.project_id),
        service_date: editForm.service_date,
        hours:        parseFloat(editForm.hours),
        notes:        editForm.notes || null,
      });
      setHours(prev => prev.map(h =>
        h.hour_id === editModal.hour_id
          ? { ...h, ...res.data }
          : h
      ));
      setEditModal(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not update.');
    } finally {
      setSaving(false);
    }
  };

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
  const isFamily = hours.some(h => h.member_id !== user?.user_id);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>{isFamily ? 'My Family Hours' : 'My Hours'}</h1>
            <p>{total.toFixed(1)} approved hours in {year}</p>
          </div>
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width:'auto' }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Link to="/hours/submit" className="btn btn-primary">+ Log Hours</Link>
          </div>
        </div>

        {threshold !== null && year === new Date().getFullYear() && (() => {
          const pct = Math.min((total / threshold) * 100, 100);
          const met = total >= threshold;
          return (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <strong>Reward Progress</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {total.toFixed(1)} / {threshold} hours
                </span>
              </div>
              <div style={{
                background: 'var(--bg-muted, #e5e7eb)',
                borderRadius: '0.5rem',
                height: '1rem',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: '0.5rem',
                  background: met ? 'var(--color-success, #22c55e)' : 'var(--color-primary, #3b82f6)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {met
                  ? 'Congratulations! You have met the reward threshold!'
                  : `${(threshold - total).toFixed(1)} more hours needed to reach the reward threshold.`}
              </p>
            </div>
          );
        })()}

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
                        {h.status === 'pending' && h.member_id === user?.user_id && (
                          <div style={{ display:'flex', gap:'0.5rem' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEdit(h)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(h.hour_id)}
                            >
                              Delete
                            </button>
                          </div>
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

      {/* Edit modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Hours</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditModal(null)}>✕</button>
            </div>

            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label>Project</label>
                <select
                  value={editForm.project_id}
                  onChange={e => setEditForm(f => ({ ...f, project_id: e.target.value }))}
                  required
                >
                  {projects.map(p => (
                    <option key={p.project_id} value={p.project_id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Service Date</label>
                <input
                  type="date"
                  value={editForm.service_date}
                  onChange={e => setEditForm(f => ({ ...f, service_date: e.target.value }))}
                  min={`${new Date().getFullYear()}-01-01`}
                  max={`${new Date().getFullYear()}-12-31`}
                  required
                />
              </div>

              <div className="form-group">
                <label>Hours</label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={editForm.hours}
                  onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes <span style={{fontWeight:400,textTransform:'none',color:'var(--text-muted)'}}>(optional)</span></label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Describe the work you did…"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
