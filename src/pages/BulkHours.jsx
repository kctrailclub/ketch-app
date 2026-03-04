import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, getUsers, submitHours } from '../api/client';

const emptyRow = () => ({ id: Date.now() + Math.random(), member_id: '', hours: '', notes: '' });

export default function BulkHours() {
  const navigate   = useNavigate();
  const [projects, setProjects] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [project,  setProject]  = useState('');
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [rows,     setRows]     = useState([emptyRow(), emptyRow()]);
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(null);

  useEffect(() => {
    Promise.all([getProjects(true), getUsers()]).then(([pRes, uRes]) => {
      setProjects(pRes.data);
      setUsers(uRes.data.filter(u => u.is_active && !u.email.includes('placeholder.invalid')));
    }).catch(console.error);
  }, []);

  const setRow = (id, key, value) => {
    setRows(rs => rs.map(r => r.id === id ? { ...r, [key]: value } : r));
  };

  const addRow = () => setRows(rs => [...rs, emptyRow()]);

  const removeRow = (id) => {
    if (rows.length === 1) return;
    setRows(rs => rs.filter(r => r.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    const filled = rows.filter(r => r.member_id && r.hours);
    if (!project)         return setError('Please select a project.');
    if (filled.length === 0) return setError('Please add at least one member with hours.');
    if (filled.some(r => parseFloat(r.hours) <= 0)) return setError('Hours must be greater than zero.');

    // Check for duplicate members
    const memberIds = filled.map(r => r.member_id);
    if (new Set(memberIds).size !== memberIds.length) return setError('A member appears more than once. Each member should only be listed once.');

    setSaving(true);
    try {
      await Promise.all(filled.map(r =>
        submitHours({
          member_id:    parseInt(r.member_id),
          project_id:   parseInt(project),
          service_date: date,
          hours:        parseFloat(r.hours),
          notes:        r.notes || null,
        })
      ));
      setSuccess(filled.length);
      setRows([emptyRow(), emptyRow()]);
      setProject('');
    } catch (err) {
      setError(err.response?.data?.detail || 'One or more submissions failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const projectName = projects.find(p => p.project_id === parseInt(project))?.name;
  const totalHours  = rows.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="page-header">
          <div className="page-header-text">
            <h1>Log Crew Hours</h1>
          </div>
        </div>

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
            ✓ Successfully logged hours for <strong>{success} member{success !== 1 ? 's' : ''}</strong>. Hours are auto-approved.
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: '1rem' }} onClick={() => setSuccess(null)}>
              Log more
            </button>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            {/* Project + Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Project</label>
                <select value={project} onChange={e => setProject(e.target.value)} required>
                  <option value="">Select a project…</option>
                  {projects.map(p => (
                    <option key={p.project_id} value={p.project_id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Service Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Member rows */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 1fr 36px',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                padding: '0 0.25rem',
              }}>
                <label style={{ margin: 0 }}>Member</label>
                <label style={{ margin: 0 }}>Hours</label>
                <label style={{ margin: 0 }}>Notes (optional)</label>
                <span />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rows.map((row, idx) => (
                  <div key={row.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 1fr 36px',
                    gap: '0.5rem',
                    alignItems: 'center',
                  }}>
                    <select
                      value={row.member_id}
                      onChange={e => setRow(row.id, 'member_id', e.target.value)}
                    >
                      <option value="">Select member…</option>
                      {users.map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.lastname}, {u.firstname}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      placeholder="0.0"
                      value={row.hours}
                      onChange={e => setRow(row.id, 'hours', e.target.value)}
                    />

                    <input
                      type="text"
                      placeholder="Optional note…"
                      value={row.notes}
                      onChange={e => setRow(row.id, 'notes', e.target.value)}
                    />

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeRow(row.id)}
                      title="Remove row"
                      style={{ padding: '0.4rem', color: 'var(--text-muted)' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add row + summary */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
                + Add Member
              </button>
              {totalHours > 0 && (
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  {rows.filter(r => r.member_id && r.hours).length} members · {totalHours.toFixed(2)} total hours
                  {projectName && ` · ${projectName}`}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Submitting…' : 'Submit All Hours'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
