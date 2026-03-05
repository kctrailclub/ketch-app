import { useEffect, useState } from 'react';
import { getProjects, createProject, updateProject } from '../api/client';

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState({});
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await getProjects(); setProjects(r.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name:'', notes:'', project_type:'ongoing', end_date:'', youth_credit_pct: 50 });
    setModal('create'); setError('');
  };

  const openEdit = (p) => {
    setForm({ name:p.name, notes:p.notes||'', project_type:p.project_type, end_date:p.end_date||'', youth_credit_pct: p.youth_credit_pct ?? 50 });
    setModal(p); setError('');
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    const data = {
      ...form,
      end_date: form.end_date || null,
      notes: form.notes || null,
    };
    try {
      if (modal === 'create') await createProject(data);
      else await updateProject(modal.project_id, data);
      await load();
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save project.');
    } finally { setSaving(false); }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Projects</h1>
            <p>{projects.length} projects</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ New Project</button>
        </div>

        <div className="card">
          {loading ? <span className="spinner" /> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Name</th><th>Type</th><th>End Date</th><th>Youth Credit</th><th>Notes</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.project_id}>
                      <td><strong>{p.name}</strong></td>
                      <td><span className={`badge badge-${p.project_type === 'ongoing' ? 'ongoing' : 'one-time'}`}>
                        {p.project_type === 'ongoing' ? 'Ongoing' : 'One-time'}
                      </span></td>
                      <td>{p.end_date ? new Date(p.end_date).toLocaleDateString() : '—'}</td>
                      <td>{p.youth_credit_pct}%</td>
                      <td style={{maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                        {p.notes || '—'}
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'create' ? 'New Project' : `Edit ${modal.name}`}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label>Project Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.project_type} onChange={e => set('project_type', e.target.value)}>
                  <option value="ongoing">Ongoing</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>
              {form.project_type === 'one_time' && (
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} required={form.project_type === 'one_time'} />
                </div>
              )}
              <div className="form-group">
                <label>Youth Credit %</label>
                <input type="number" min="0" max="100" step="5"
                  value={form.youth_credit_pct}
                  onChange={e => set('youth_credit_pct', Number(e.target.value))} />
                <span style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginTop:'0.25rem', display:'block' }}>
                  Percentage of hours credited for youth members (default 50%)
                </span>
              </div>
              <div className="form-group">
                <label>Notes <span style={{fontWeight:400,textTransform:'none',color:'var(--text-muted)'}}>(optional)</span></label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
