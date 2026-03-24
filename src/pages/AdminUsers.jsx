import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, resendInvite, getHouseholds, getRegistrations, approveRegistration, rejectRegistration, getHours, bulkCreateHouseholds } from '../api/client';

export default function AdminUsers() {
  const [users,         setUsers]         = useState([]);
  const [households,    setHouseholds]    = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modal,   setModal]   = useState(null); // 'create' | user object
  const [form,    setForm]    = useState({});
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState('');
  const [bulkHHLoading, setBulkHHLoading] = useState(false);
  const [bulkHHResult, setBulkHHResult] = useState(null);
  const [approveModal, setApproveModal] = useState(null); // registration object
  const [approveHH, setApproveHH] = useState({ option:'new', household_id:'' });
  const [hoursModal, setHoursModal] = useState(null); // user object
  const [hoursData, setHoursData]   = useState([]);
  const [hoursYear, setHoursYear]   = useState(new Date().getFullYear());
  const [hoursLoading, setHoursLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, hRes, rRes] = await Promise.all([getUsers(), getHouseholds(), getRegistrations()]);
      setUsers(uRes.data);
      setHouseholds(hRes.data);
      setRegistrations(rRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ firstname:'', lastname:'', email:'', phone:'', is_admin:false, youth:false, household_option:'new', household_id:'' });
    setModal('create');
    setError('');
  };

  const openEdit = (u) => {
    setForm({ firstname:u.firstname, lastname:u.lastname, email:u.email, phone:u.phone, is_admin:u.is_admin, is_active:u.is_active, youth:u.youth, household_id:u.household_id || '', new_password:'', showPass:false });
    setModal(u);
    setError('');
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        firstname: form.firstname,
        lastname: form.lastname,
        email: form.email,
        phone: form.phone,
        is_admin: form.is_admin,
        youth: form.youth,
      };
      if (form.household_option === 'existing' && form.household_id) {
        payload.household_id = parseInt(form.household_id);
      } else if (form.household_option === 'new') {
        payload.create_household = true;
      }
      // 'none' → no household_id, no create_household
      await createUser(payload);
      await load();
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user.');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.new_password) delete payload.new_password;
      if (payload.household_id === '') payload.household_id = null;
      await updateUser(modal.user_id, payload);
      await load();
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user.');
    } finally { setSaving(false); }
  };

  const handleResend = async (u) => {
    try {
      await resendInvite(u.user_id);
      alert(`Invite resent to ${u.email}`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resend invite.');
    }
  };

  const openApproveModal = (reg) => {
    setApproveModal(reg);
    setApproveHH({ option:'new', household_id:'' });
  };

  const handleApproveReg = async () => {
    const reg = approveModal;
    const body = {};
    if (approveHH.option === 'existing' && approveHH.household_id) {
      body.household_id = parseInt(approveHH.household_id);
    } else if (approveHH.option === 'new') {
      body.create_household = true;
    }
    try {
      await approveRegistration(reg.request_id, body);
      setApproveModal(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve registration.');
    }
  };

  const handleRejectReg = async (id) => {
    if (!window.confirm('Reject this registration request?')) return;
    try {
      await rejectRegistration(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject registration.');
    }
  };

  const openHours = async (u) => {
    const yr = new Date().getFullYear();
    setHoursModal(u);
    setHoursYear(yr);
    setHoursLoading(true);
    try {
      const res = await getHours({ member_id: u.user_id, year: yr });
      setHoursData(res.data);
    } catch (err) { console.error(err); setHoursData([]); }
    finally { setHoursLoading(false); }
  };

  const loadHoursForYear = async (userId, year) => {
    setHoursYear(year);
    setHoursLoading(true);
    try {
      const params = { member_id: userId };
      if (year !== 'all') params.year = year;
      const res = await getHours(params);
      setHoursData(res.data);
    } catch (err) { console.error(err); setHoursData([]); }
    finally { setHoursLoading(false); }
  };

  const orphanCount = users.filter(u => !u.household_id).length;

  const handleBulkHouseholds = async () => {
    if (!window.confirm(`Create households for ${orphanCount} member(s) without one? Members with the same last name will be grouped together.`)) return;
    setBulkHHLoading(true);
    setBulkHHResult(null);
    try {
      const res = await bulkCreateHouseholds();
      setBulkHHResult(res.data.detail);
      await load();
    } catch (err) {
      setBulkHHResult(err.response?.data?.detail || 'Failed to create households.');
    } finally { setBulkHHLoading(false); }
  };

  const filtered = users.filter(u =>
    `${u.firstname} ${u.lastname} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Members</h1>
            <p>{search ? `${filtered.length} of ${users.length}` : users.length} total members</p>
          </div>
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
            <input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width:220 }}
            />
            <button className="btn btn-primary" onClick={openCreate}>+ Add Member</button>
          </div>
        </div>

        {/* Pending Registration Requests */}
        {registrations.length > 0 && (
          <div className="card" style={{ marginBottom:'1.5rem' }}>
            <div className="card-header">
              <h3>Pending Registration Requests ({registrations.length})</h3>
            </div>
            <div style={{ padding:'0.75rem 1.25rem', background:'var(--bg-muted)', borderBottom:'1px solid var(--border)', fontSize:'0.85rem', color:'var(--text-secondary)' }}>
              <strong>Reminder:</strong> Please verify the applicant has completed the KCTC Volunteer Waiver on the Ken-Caryl Ranch website before approving.
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map(r => (
                    <tr key={r.request_id}>
                      <td><strong>{r.firstname} {r.lastname}</strong></td>
                      <td>{r.email}</td>
                      <td>{r.phone || <em style={{color:'var(--text-muted)'}}>—</em>}</td>
                      <td>{new Date(r.created).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display:'flex', gap:'0.4rem' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => openApproveModal(r)}>Approve</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleRejectReg(r.request_id)}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Approve Registration Modal */}
        {approveModal && (
          <div className="modal-overlay" onClick={() => setApproveModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:500 }}>
              <div className="modal-header">
                <h3>Approve {approveModal.firstname} {approveModal.lastname}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setApproveModal(null)}>✕</button>
              </div>
              <p style={{ fontSize:'0.9rem', color:'var(--text-secondary)', marginBottom:'1rem' }}>
                Assign this member to a household before approving.
              </p>
              <div className="form-group">
                <label>Household</label>
                <div style={{ display:'flex', gap:'0.75rem', marginBottom:'0.5rem' }}>
                  {[['new','Create new'],['existing','Existing'],['none','Assign later']].map(([val, label]) => (
                    <label key={val} style={{ display:'flex', alignItems:'center', gap:'0.3rem', cursor:'pointer', fontSize:'0.9rem', fontWeight:400, textTransform:'none' }}>
                      <input type="radio" name="approve_hh" checked={approveHH.option === val} onChange={() => setApproveHH(prev => ({ ...prev, option: val }))} style={{ width:'auto' }} />
                      {label}
                    </label>
                  ))}
                </div>
                {approveHH.option === 'existing' && (
                  <select value={approveHH.household_id || ''} onChange={e => setApproveHH(prev => ({ ...prev, household_id: e.target.value }))} required>
                    <option value="">Select a household…</option>
                    {households.map(h => (
                      <option key={h.household_id} value={h.household_id}>{h.name} ({h.household_code})</option>
                    ))}
                  </select>
                )}
                {approveHH.option === 'new' && (
                  <span style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
                    A new household "{approveModal.lastname}" will be created.
                  </span>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setApproveModal(null)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  disabled={approveHH.option === 'existing' && !approveHH.household_id}
                  onClick={handleApproveReg}
                >
                  Approve & Create Account
                </button>
              </div>
            </div>
          </div>
        )}

        {orphanCount > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem' }}>
            <button
              className="btn btn-secondary"
              onClick={handleBulkHouseholds}
              disabled={bulkHHLoading}
            >
              {bulkHHLoading ? 'Creating…' : `Assign Households (${orphanCount} members)`}
            </button>
            {bulkHHResult && (
              <span style={{ fontSize:'0.85rem' }}>
                {bulkHHResult}
                <button className="btn btn-ghost btn-sm" style={{ marginLeft:'0.5rem' }} onClick={() => setBulkHHResult(null)}>✕</button>
              </span>
            )}
          </div>
        )}

        <div className="card">
          {loading ? <span className="spinner" /> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Household</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(u => (
                    <tr key={u.user_id}>
                      <td><strong>{u.firstname} {u.lastname}</strong></td>
                      <td>{u.email.includes('placeholder.invalid') ? <em style={{color:'var(--text-muted)'}}>no email</em> : u.email}</td>
                      <td>{u.household_name || <em style={{color:'var(--text-muted)'}}>—</em>}</td>
                      <td>
                        {!u.is_active ? <span className="badge badge-rejected">Inactive</span>
                          : u.invite_pending ? <span className="badge badge-pending">Invite Pending</span>
                          : <span className="badge badge-approved">Active</span>}
                      </td>
                      <td>{u.is_admin ? <span className="badge badge-admin">Admin</span> : 'Member'}</td>
                      <td>{u.last_login ? new Date(u.last_login).toLocaleDateString() : <em style={{color:'var(--text-muted)'}}>Never</em>}</td>
                      <td>
                        <div style={{ display:'flex', gap:'0.4rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openHours(u)}>Hours</button>
                          {u.invite_pending && (
                            <button className="btn btn-ghost btn-sm" onClick={() => handleResend(u)}>Resend</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 1.25rem', borderTop:'1px solid var(--border)' }}>
              <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display:'flex', gap:'0.4rem' }}>
                <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(1)}>First</button>
                <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <span style={{ fontSize:'0.85rem', padding:'0.25rem 0.5rem' }}>Page {page} of {totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>Last</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Hours Modal */}
      {hoursModal && (
        <div className="modal-overlay" onClick={() => setHoursModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:700 }}>
            <div className="modal-header">
              <h3>{hoursModal.firstname} {hoursModal.lastname} — Hours</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setHoursModal(null)}>✕</button>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1rem' }}>
              <select
                value={hoursYear}
                onChange={e => loadHoursForYear(hoursModal.user_id, e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{ width:'auto' }}
              >
                <option value="all">All Years</option>
                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {!hoursLoading && (
                <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
                  {hoursData.length} entr{hoursData.length === 1 ? 'y' : 'ies'}
                  {' · '}
                  <strong>
                    {hoursData.filter(h => h.status === 'approved').reduce((sum, h) => sum + h.hours * ((h.member_credit_pct ?? 100) / 100), 0).toFixed(1)}h
                  </strong> approved
                </span>
              )}
            </div>

            {hoursLoading ? <span className="spinner" /> : hoursData.length === 0 ? (
              <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'2rem 0' }}>No hours found.</p>
            ) : (
              <div className="table-wrapper" style={{ maxHeight:400, overflowY:'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Credit Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hoursData.map(h => (
                      <tr key={h.hour_id}>
                        <td>{new Date(h.service_date).toLocaleDateString()}</td>
                        <td>{h.project_name}</td>
                        <td>
                          {(h.member_credit_pct ?? 100) < 100 ? (
                            <>
                              {(h.hours * (h.member_credit_pct / 100)).toFixed(1)}
                              <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                                {h.hours} × {h.member_credit_pct}%
                              </div>
                            </>
                          ) : h.hours}
                        </td>
                        <td>
                          <span className={`badge badge-${h.status === 'approved' ? 'approved' : h.status === 'rejected' ? 'rejected' : 'pending'}`}>
                            {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                          </span>
                        </td>
                        <td>{h.credit_year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-footer" style={{ marginTop:'1rem' }}>
              <button className="btn btn-ghost" onClick={() => setHoursModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'create' ? 'Add Member' : `Edit ${modal.firstname} ${modal.lastname}`}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>

            <form onSubmit={modal === 'create' ? handleCreate : handleUpdate}>
              {error && <div className="alert alert-error">{error}</div>}

              {modal === 'create' && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem' }}>
                    <div className="form-group">
                      <label>First Name</label>
                      <input value={form.firstname} onChange={e => set('firstname', e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input value={form.lastname} onChange={e => set('lastname', e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Household</label>
                    <div style={{ display:'flex', gap:'0.75rem', marginBottom:'0.5rem' }}>
                      {[['new','Create new'],['existing','Existing'],['none','Assign later']].map(([val, label]) => (
                        <label key={val} style={{ display:'flex', alignItems:'center', gap:'0.3rem', cursor:'pointer', fontSize:'0.9rem', fontWeight:400, textTransform:'none' }}>
                          <input type="radio" name="hh_option" checked={form.household_option === val} onChange={() => set('household_option', val)} style={{ width:'auto' }} />
                          {label}
                        </label>
                      ))}
                    </div>
                    {form.household_option === 'existing' && (
                      <select value={form.household_id || ''} onChange={e => set('household_id', e.target.value)} required>
                        <option value="">Select a household…</option>
                        {households.map(h => (
                          <option key={h.household_id} value={h.household_id}>{h.name} ({h.household_code})</option>
                        ))}
                      </select>
                    )}
                    {form.household_option === 'new' && (
                      <span style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
                        A new household will be created using the member's last name.
                      </span>
                    )}
                  </div>
                </>
              )}

              {modal !== 'create' && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem' }}>
                    <div className="form-group">
                      <label>First Name</label>
                      <input value={form.firstname || ''} onChange={e => set('firstname', e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input value={form.lastname || ''} onChange={e => set('lastname', e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} required />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Phone</label>
                <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
              </div>

              {modal !== 'create' && (
                <div className="form-group">
                  <label>Household</label>
                  <select
                    value={form.household_id || ''}
                    onChange={e => set('household_id', e.target.value ? parseInt(e.target.value) : '')}
                  >
                    <option value="">— No household —</option>
                    {households.map(h => (
                      <option key={h.household_id} value={h.household_id}>
                        {h.name} ({h.household_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modal !== 'create' && (
                <div className="form-group">
                  <label>
                    New Password
                    <span style={{ fontWeight:400, textTransform:'none', fontSize:'0.82rem', color:'var(--text-muted)', marginLeft:'0.4rem' }}>(leave blank to keep current)</span>
                  </label>
                  <div style={{ position:'relative' }}>
                    <input
                      type={form.showPass ? 'text' : 'password'}
                      value={form.new_password || ''}
                      onChange={e => set('new_password', e.target.value)}
                      placeholder="Enter new password…"
                      minLength={8}
                      autoComplete="new-password"
                      style={{ paddingRight:'2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => set('showPass', !form.showPass)}
                      style={{
                        position:'absolute', right:'0.6rem', top:'50%',
                        transform:'translateY(-50%)', background:'none',
                        border:'none', cursor:'pointer', color:'var(--text-muted)',
                        padding:'0.25rem', fontSize:'0.8rem', fontWeight:500,
                      }}
                    >
                      {form.showPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display:'flex', gap:'1.5rem', margin:'0.5rem 0 1rem' }}>
                <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', textTransform:'none', fontSize:'0.9rem', fontWeight:400 }}>
                  <input type="checkbox" checked={!!form.is_admin} onChange={e => set('is_admin', e.target.checked)} style={{ width:'auto' }} />
                  Admin
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', textTransform:'none', fontSize:'0.9rem', fontWeight:400 }}>
                  <input type="checkbox" checked={!!form.youth} onChange={e => set('youth', e.target.checked)} style={{ width:'auto' }} />
                  Youth member
                </label>
                {modal !== 'create' && (
                  <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', textTransform:'none', fontSize:'0.9rem', fontWeight:400 }}>
                    <input type="checkbox" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width:'auto' }} />
                    Active
                  </label>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : modal === 'create' ? 'Create & Send Invite' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
