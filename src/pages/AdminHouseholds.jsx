import { useEffect, useState } from 'react';
import { getHouseholds, createHousehold, updateHousehold, approveJoin, rejectJoin, removeMember, getUsers } from '../api/client';

export default function AdminHouseholds() {
  const [households, setHouseholds] = useState([]);
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [form,       setForm]       = useState({ name:'', address:'' });
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [selected,   setSelected]   = useState(null); // household detail view
  const [search,     setSearch]     = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [hRes, uRes] = await Promise.all([getHouseholds(), getUsers()]);
      setHouseholds(hRes.data);
      setUsers(uRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const pendingRequests = users.filter(u => u.household_request_id);
  const filtered = households.filter(h =>
    `${h.name} ${h.household_code} ${h.address || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({ name:'', address:'' });
    setModal('create');
    setError('');
  };

  const openEdit = (h) => {
    setForm({ name: h.name, address: h.address, primary_user_id: h.primary_user_id || null });
    setModal(h);
    setError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await createHousehold(form);
      await load();
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create household.');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await updateHousehold(modal.household_id, form);
      await load();
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update.');
    } finally { setSaving(false); }
  };

  const handleApprove = async (u) => {
    try {
      await approveJoin(u.household_request_id, u.user_id);
      await load();
    } catch (err) { alert(err.response?.data?.detail || 'Failed.'); }
  };

  const handleReject = async (u) => {
    try {
      await rejectJoin(u.household_request_id, u.user_id);
      await load();
    } catch (err) { alert(err.response?.data?.detail || 'Failed.'); }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Households</h1>
            <p>{households.length} households</p>
          </div>
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
            <input
              type="search"
              placeholder="Search households…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width:220 }}
            />
            <button className="btn btn-primary" onClick={openCreate}>+ New Household</button>
          </div>
        </div>

        {/* Pending join requests */}
        {pendingRequests.length > 0 && (
          <div className="card" style={{ marginBottom:'1.5rem', borderLeft:'3px solid var(--earth)' }}>
            <div className="card-header">
              <h3>Pending Join Requests</h3>
              <span className="badge badge-pending">{pendingRequests.length}</span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Member</th><th>Requesting to join</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {pendingRequests.map(u => {
                    const hh = households.find(h => h.household_id === u.household_request_id);
                    return (
                      <tr key={u.user_id}>
                        <td><strong>{u.firstname} {u.lastname}</strong></td>
                        <td>{hh ? `${hh.name} (${hh.household_code})` : `Household #${u.household_request_id}`}</td>
                        <td>
                          <div style={{ display:'flex', gap:'0.5rem' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleApprove(u)}>Approve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleReject(u)}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Households list */}
        <div className="card">
          {loading ? <span className="spinner" /> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Code</th><th>Name</th><th>Address</th><th>Primary Contact</th><th>Members</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(h => {
                    const primary = h.primary_user_id ? users.find(u => u.user_id === h.primary_user_id) : null;
                    return (
                      <tr key={h.household_id}>
                        <td><code style={{fontSize:'0.82rem',background:'var(--fern)',padding:'0.15rem 0.4rem',borderRadius:4}}>{h.household_code}</code></td>
                        <td><strong>{h.name}</strong></td>
                        <td>{h.address || '—'}</td>
                        <td>{primary ? `${primary.firstname} ${primary.lastname}` : '—'}</td>
                        <td>{h.member_count}</td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(h)}>Edit</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'create' ? 'New Household' : `Edit ${modal.name}`}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={modal === 'create' ? handleCreate : handleUpdate}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label>Household Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Smith Family" />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
              </div>

              {/* Members section — edit mode only */}
              {modal !== 'create' && (() => {
                const members = users.filter(u => u.household_id === modal.household_id);
                return members.length > 0 ? (
                  <div style={{ marginBottom:'1rem' }}>
                    <label style={{ display:'block', marginBottom:'0.5rem' }}>Members</label>
                    <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', overflow:'hidden' }}>
                      {members.map((m, i) => {
                        const isPrimary = form.primary_user_id === m.user_id;
                        return (
                          <div key={m.user_id} style={{
                            display:'flex', alignItems:'center', justifyContent:'space-between',
                            padding:'0.6rem 0.85rem',
                            borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
                            background: i % 2 === 0 ? 'var(--white)' : 'var(--fern)',
                          }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                              <span style={{ fontWeight:500, fontSize:'0.9rem' }}>{m.firstname} {m.lastname}</span>
                              {isPrimary && (
                                <span title="Primary Contact" style={{
                                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                                  width:20, height:20, borderRadius:'50%',
                                  background:'var(--primary)', color:'#fff',
                                  fontSize:'0.7rem', fontWeight:700,
                                }}>P</span>
                              )}
                              {m.is_admin && <span className="badge badge-admin" style={{ fontSize:'0.7rem' }}>Admin</span>}
                            </div>
                            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                              {!isPrimary && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize:'0.75rem' }}
                                  onClick={() => set('primary_user_id', m.user_id)}
                                >
                                  Set as Primary
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={async () => {
                                  if (!confirm(`Remove ${m.firstname} ${m.lastname} from this household? They will become unassigned.`)) return;
                                  try {
                                    await removeMember(modal.household_id, m.user_id);
                                    await load();
                                    const updated = households.find(h => h.household_id === modal.household_id);
                                    if (updated) {
                                      setForm(f => ({ ...f, primary_user_id: updated.primary_user_id || null }));
                                      setModal(updated);
                                    }
                                  } catch (err) {
                                    alert(err.response?.data?.detail || 'Failed to remove member.');
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.4rem' }}>
                      Click "Set as Primary" to designate the household contact for reward emails.
                    </p>
                  </div>
                ) : null;
              })()}

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : modal === 'create' ? 'Create Household' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
