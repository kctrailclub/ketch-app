import { useEffect, useState } from 'react';
import { getHousehold, getHouseholds, requestToJoin } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function HouseholdPage() {
  const { user }  = useAuth();
  const [household,   setHousehold]   = useState(null);
  const [households,  setHouseholds]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [joining,     setJoining]     = useState(false);
  const [joinHH,      setJoinHH]      = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (user?.household_id) {
          const res = await getHousehold(user.household_id);
          setHousehold(res.data);
        } else {
          const res = await getHouseholds();
          setHouseholds(res.data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const handleJoinRequest = async (e) => {
    e.preventDefault();
    if (!joinHH) return setError('Please select a household.');
    setJoining(true); setError('');
    try {
      await requestToJoin(parseInt(joinHH));
      setJoinSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send request.');
    } finally { setJoining(false); }
  };

  if (loading) return <div className="loading-page"><span className="spinner" /></div>;

  // ── No household — show join request form ─────────────────────
  if (!user?.household_id) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="page-header">
            <div className="page-header-text">
              <h1>Household</h1>
              <p>You are not currently assigned to a household</p>
            </div>
          </div>

          <div className="card">
            {joinSuccess ? (
              <div className="alert alert-success">
                Your request has been sent! An admin will approve it shortly.
              </div>
            ) : (
              <>
                <p style={{ marginBottom:'1.25rem' }}>
                  Request to join an existing household below. An admin will review and approve your request.
                </p>
                <form onSubmit={handleJoinRequest}>
                  {error && <div className="alert alert-error">{error}</div>}
                  <div className="form-group">
                    <label>Select Household</label>
                    <select value={joinHH} onChange={e => setJoinHH(e.target.value)} required>
                      <option value="">Choose a household…</option>
                      {households.map(h => (
                        <option key={h.household_id} value={h.household_id}>
                          {h.name} ({h.household_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={joining}>
                    {joining ? 'Sending…' : 'Request to Join'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Has household — show details and members ──────────────────
  const members = household?.members || [];

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="page-header">
          <div className="page-header-text">
            <h1>My Household</h1>
            <p>{household?.name}</p>
          </div>
        </div>

        {/* Household info */}
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <div className="card-header"><h3>Household Details</h3></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div>
              <div style={{ fontSize:'0.78rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', marginBottom:'0.25rem' }}>Name</div>
              <div style={{ fontWeight:500 }}>{household?.name}</div>
            </div>
            <div>
              <div style={{ fontSize:'0.78rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', marginBottom:'0.25rem' }}>Household Code</div>
              <code style={{ fontSize:'0.88rem', background:'var(--fern)', padding:'0.2rem 0.5rem', borderRadius:4 }}>{household?.household_code}</code>
            </div>
            {household?.address && (
              <div style={{ gridColumn:'1 / -1' }}>
                <div style={{ fontSize:'0.78rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', marginBottom:'0.25rem' }}>Address</div>
                <div>{household.address}</div>
              </div>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="card">
          <div className="card-header">
            <h3>Members</h3>
            <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
          </div>
          {members.length === 0 ? (
            <div className="empty-state"><p>No members found.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.user_id}>
                      <td>
                        <strong>{m.firstname} {m.lastname}</strong>
                        {m.user_id === user.user_id && (
                          <span style={{ marginLeft:'0.5rem', fontSize:'0.75rem', color:'var(--text-muted)' }}>(you)</span>
                        )}
                      </td>
                      <td>{m.email?.includes('placeholder.invalid') ? '—' : m.email}</td>
                      <td>{m.phone || '—'}</td>
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
