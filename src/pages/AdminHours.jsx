import { useEffect, useState } from 'react';
import {
  getPendingHours, reviewHours, approveAllHours,
  getHours, updateHours, getProjects,
} from '../api/client';

export default function AdminHours() {
  const [tab, setTab] = useState('pending');

  // ── Pending tab state ──────────────────────────────────────
  const [pending, setPending]     = useState([]);
  const [loadingP, setLoadingP]  = useState(true);
  const [modal, setModal]         = useState(null); // { hour, action }
  const [note, setNote]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);

  // ── Approved tab state ─────────────────────────────────────
  const [approved, setApproved]     = useState([]);
  const [loadingA, setLoadingA]     = useState(false);
  const [search, setSearch]         = useState('');
  const [projects, setProjects]     = useState([]);
  const [editModal, setEditModal]   = useState(null); // hour object
  const [editForm, setEditForm]     = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // ── Loaders ────────────────────────────────────────────────
  const loadPending = async () => {
    setLoadingP(true);
    try { setPending((await getPendingHours()).data); }
    catch (e) { console.error(e); }
    finally { setLoadingP(false); }
  };

  const loadApproved = async () => {
    setLoadingA(true);
    try {
      const [h, p] = await Promise.all([
        getHours({ status_filter: 'approved', year: new Date().getFullYear() }),
        getProjects(),
      ]);
      setApproved(h.data);
      setProjects(p.data);
    } catch (e) { console.error(e); }
    finally { setLoadingA(false); }
  };

  useEffect(() => { loadPending(); }, []);
  useEffect(() => { if (tab === 'approved') loadApproved(); }, [tab]);

  // ── Pending actions ────────────────────────────────────────
  const openModal  = (hour, action) => { setModal({ hour, action }); setNote(''); };
  const closeModal = () => { setModal(null); setNote(''); };

  const handleApproveAll = async () => {
    if (!confirm(`Approve all ${pending.length} pending submission${pending.length !== 1 ? 's' : ''}?`)) return;
    setApprovingAll(true);
    try { await approveAllHours(); setPending([]); }
    catch (e) { alert(e.response?.data?.detail || 'Failed to approve all.'); }
    finally { setApprovingAll(false); }
  };

  const handleReview = async () => {
    setSaving(true);
    try {
      await reviewHours(modal.hour.hour_id, modal.action, note || null);
      setPending(h => h.filter(x => x.hour_id !== modal.hour.hour_id));
      closeModal();
    } catch (e) { alert(e.response?.data?.detail || 'Failed to update.'); }
    finally { setSaving(false); }
  };

  // ── Edit approved hours ────────────────────────────────────
  const openEdit = (hour) => {
    setEditModal(hour);
    setEditForm({
      project_id:   hour.project_id,
      service_date: hour.service_date?.slice?.(0, 10) || hour.service_date,
      hours:        hour.hours,
      notes:        hour.notes || '',
    });
  };
  const closeEdit = () => { setEditModal(null); setEditForm({}); };

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      const data = {};
      if (editForm.project_id !== editModal.project_id)       data.project_id   = editForm.project_id;
      if (editForm.service_date !== (editModal.service_date?.slice?.(0, 10) || editModal.service_date))
                                                                data.service_date = editForm.service_date;
      if (Number(editForm.hours) !== editModal.hours)           data.hours        = Number(editForm.hours);
      if (editForm.notes !== (editModal.notes || ''))           data.notes        = editForm.notes;

      if (Object.keys(data).length === 0) { closeEdit(); return; }

      const res = await updateHours(editModal.hour_id, data);
      setApproved(prev => prev.map(h => h.hour_id === editModal.hour_id
        ? { ...h, ...res.data, project_name: res.data.project_name }
        : h
      ));
      closeEdit();
    } catch (e) { alert(e.response?.data?.detail || 'Failed to save.'); }
    finally { setEditSaving(false); }
  };

  // ── Filtered approved list ─────────────────────────────────
  const filtered = approved.filter(h =>
    h.member_name.toLowerCase().includes(search.toLowerCase()) ||
    h.project_name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="container">
        {/* Tabs */}
        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem' }}>
          <button
            className={`btn ${tab === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('pending')}
          >
            Pending{pending.length > 0 ? ` (${pending.length})` : ''}
          </button>
          <button
            className={`btn ${tab === 'approved' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('approved')}
          >
            Approved
          </button>
        </div>

        {/* ─── PENDING TAB ─────────────────────────────────── */}
        {tab === 'pending' && (
          <>
            <div className="page-header">
              <div className="page-header-text">
                <h1>Pending Hours</h1>
                <p>{pending.length} submission{pending.length !== 1 ? 's' : ''} awaiting review</p>
              </div>
              {pending.length > 0 && (
                <button className="btn btn-primary" onClick={handleApproveAll} disabled={approvingAll}>
                  {approvingAll ? 'Approving…' : `Approve All (${pending.length})`}
                </button>
              )}
            </div>

            <div className="card">
              {loadingP ? (
                <span className="spinner" />
              ) : pending.length === 0 ? (
                <div className="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p>All caught up! No pending submissions.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Project</th>
                        <th>Date</th>
                        <th>Hours</th>
                        <th>Notes</th>
                        <th>Submitted</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map(h => (
                        <tr key={h.hour_id}>
                          <td><strong>{h.member_name}</strong></td>
                          <td>{h.project_name}</td>
                          <td>{new Date(h.service_date).toLocaleDateString()}</td>
                          <td>{h.hours}</td>
                          <td style={{maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {h.notes || '—'}
                          </td>
                          <td>{new Date(h.submitted_on).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display:'flex', gap:'0.5rem' }}>
                              <button className="btn btn-primary btn-sm" onClick={() => openModal(h, 'approved')}>Approve</button>
                              <button className="btn btn-danger btn-sm" onClick={() => openModal(h, 'rejected')}>Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── APPROVED TAB ────────────────────────────────── */}
        {tab === 'approved' && (
          <>
            <div className="page-header">
              <div className="page-header-text">
                <h1>Approved Hours</h1>
                <p>{approved.length} approved record{approved.length !== 1 ? 's' : ''} for {new Date().getFullYear()}</p>
              </div>
              <button className="btn btn-ghost" onClick={loadApproved} disabled={loadingA}>
                {loadingA ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            <div className="card" style={{ marginBottom:'1rem', padding:'1rem' }}>
              <input
                type="text"
                placeholder="Search by member or project name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width:'100%' }}
              />
            </div>

            <div className="card">
              {loadingA ? (
                <span className="spinner" />
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <p>{search ? 'No matching records.' : 'No approved hours for this year.'}</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Project</th>
                        <th>Date</th>
                        <th>Hours</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(h => (
                        <tr key={h.hour_id}>
                          <td><strong>{h.member_name}</strong></td>
                          <td>{h.project_name}</td>
                          <td>{new Date(h.service_date).toLocaleDateString()}</td>
                          <td>{h.hours}</td>
                          <td style={{maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {h.notes || '—'}
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(h)}>Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── REVIEW MODAL (Pending) ──────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.action === 'approved' ? 'Approve' : 'Reject'} Hours</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
            </div>

            <p style={{ marginBottom:'1rem', color:'var(--text-secondary)' }}>
              <strong>{modal.hour.member_name}</strong> — {modal.hour.hours}h on{' '}
              {new Date(modal.hour.service_date).toLocaleDateString()} for{' '}
              <em>{modal.hour.project_name}</em>
            </p>

            {modal.action === 'rejected' && (
              <div className="form-group">
                <label>Reason for rejection <span style={{fontWeight:400,textTransform:'none',color:'var(--text-muted)'}}>(optional)</span></label>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Let the member know why…" />
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button
                className={`btn ${modal.action === 'approved' ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleReview}
                disabled={saving}
              >
                {saving ? 'Saving…' : modal.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT MODAL (Approved) ───────────────────────────── */}
      {editModal && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Hours</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeEdit}>✕</button>
            </div>

            <p style={{ marginBottom:'1rem', color:'var(--text-secondary)' }}>
              <strong>{editModal.member_name}</strong>
            </p>

            <div className="form-group">
              <label>Project</label>
              <select
                value={editForm.project_id}
                onChange={e => setEditForm(f => ({ ...f, project_id: Number(e.target.value) }))}
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
              />
            </div>

            <div className="form-group">
              <label>Hours</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={editForm.hours}
                onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes…"
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeEdit}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
