import { useEffect, useState } from 'react';
import { getPendingHours, reviewHours, approveAllHours } from '../api/client';

export default function AdminHours() {
  const [hours,   setHours]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // { hour, action }
  const [note,    setNote]    = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPendingHours();
      setHours(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const [approvingAll, setApprovingAll] = useState(false);

  const openModal = (hour, action) => { setModal({ hour, action }); setNote(''); };
  const closeModal = () => { setModal(null); setNote(''); };

  const handleApproveAll = async () => {
    if (!confirm(`Approve all ${hours.length} pending submission${hours.length !== 1 ? 's' : ''}?`)) return;
    setApprovingAll(true);
    try {
      await approveAllHours();
      setHours([]);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve all.');
    } finally {
      setApprovingAll(false);
    }
  };

  const handleReview = async () => {
    setSaving(true);
    try {
      await reviewHours(modal.hour.hour_id, modal.action, note || null);
      setHours(h => h.filter(x => x.hour_id !== modal.hour.hour_id));
      closeModal();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Pending Hours</h1>
            <p>{hours.length} submission{hours.length !== 1 ? 's' : ''} awaiting review</p>
          </div>
          {hours.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleApproveAll}
              disabled={approvingAll}
            >
              {approvingAll ? 'Approving…' : `Approve All (${hours.length})`}
            </button>
          )}
        </div>

        <div className="card">
          {loading ? (
            <span className="spinner" />
          ) : hours.length === 0 ? (
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
                  {hours.map(h => (
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
                          <button className="btn btn-primary btn-sm" onClick={() => openModal(h, 'approved')}>
                            Approve
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => openModal(h, 'rejected')}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review modal */}
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
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Let the member know why…"
                />
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
    </div>
  );
}
