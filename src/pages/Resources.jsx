import { useEffect, useState, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  getSponsors, getResourceUpdates, getResourceDocuments,
  getStravaConnection, getStravaAuthUrl, stravaCallback, disconnectStrava,
  syncTrailsChallenge, getTrailsChallenge, getTrailsChallengeLeaderboard,
} from '../api/client';

const TYPE_STYLES = {
  trail:   { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B', label: 'Trail Condition' },
  event:   { bg: '#DBEAFE', color: '#1E40AF', border: '#3B82F6', label: 'Event' },
  general: { bg: '#F3F4F6', color: '#374151', border: '#9CA3AF', label: 'Notice' },
};

// ── Leaderboard sub-component ─────────────────────────────────
function LeaderboardPanel({ leaderboard, totalTrails }) {
  const [open, setOpen] = useState(true);

  if (leaderboard.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <h3 style={{ fontSize: '1rem', color: 'var(--forest)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {'🏆'} Trails Challenge Leaderboard
        </h3>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {open && (
        <div className="table-wrapper" style={{ marginTop: '1rem' }}>
          <table style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Name</th>
                <th>Trails</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map(entry => (
                <tr key={entry.user_id} style={{
                  fontWeight: entry.is_current_user ? 600 : 400,
                  background: entry.is_current_user ? 'var(--fern)' : 'transparent',
                }}>
                  <td>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </td>
                  <td>{entry.name}{entry.is_current_user ? ' (you)' : ''}</td>
                  <td>{entry.trails_completed}/{totalTrails}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {entry.last_synced_display || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Strava Trails Challenge Section ──────────────────────────
function StravaSection() {
  const { user }                          = useContext(AuthContext);
  const [connection, setConnection]       = useState(null);
  const [challenge, setChallenge]         = useState(null);
  const [leaderboard, setLeaderboard]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [syncing, setSyncing]             = useState(false);
  const [syncMsg, setSyncMsg]             = useState('');
  const [syncIsError, setSyncIsError]     = useState(false);
  const [connecting, setConnecting]       = useState(false);
  const [callbackError, setCallbackError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [connRes, challengeRes, lbRes] = await Promise.all([
        getStravaConnection(),
        getTrailsChallenge(),
        getTrailsChallengeLeaderboard(),
      ]);
      setConnection(connRes.data);
      setChallenge(challengeRes.data);
      setLeaderboard(lbRes.data);
    } catch {
      // Strava not configured — hide section gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('strava_callback') === '1' && params.get('code')) {
      const code = params.get('code');
      window.history.replaceState({}, '', window.location.pathname);
      setConnecting(true);
      stravaCallback(code)
        .then(() => loadData())
        .catch(err => setCallbackError(err.response?.data?.detail || 'Failed to connect Strava'))
        .finally(() => setConnecting(false));
    } else {
      loadData();
    }
  }, [loadData]);

  // Feature gate: only visible to testers
  if (!user?.is_tester) return null;
  if (loading) return null;

  const handleConnect = async () => {
    try {
      const res = await getStravaAuthUrl();
      window.location.href = res.data.url;
    } catch {
      alert('Strava integration is not available');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Strava account? Your trail completions will be removed.')) return;
    try {
      await disconnectStrava();
      setConnection({ connected: false });
      setSyncMsg('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to disconnect');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    setSyncIsError(false);
    try {
      const res = await syncTrailsChallenge();
      await loadData();
      setSyncMsg(res.data.detail || 'Sync complete');
      setSyncIsError(false);
      setTimeout(() => setSyncMsg(''), 8000);
    } catch (err) {
      setSyncMsg(err.response?.data?.detail || 'Sync failed. Please try again.');
      setSyncIsError(true);
    } finally {
      setSyncing(false);
    }
  };

  const trails          = challenge?.trails || [];
  const totalTrails     = challenge?.total_trails || 0;
  const completedTrails = challenge?.completed_trails || 0;
  const isConnected     = connection?.connected;
  const lastSynced      = challenge?.last_synced;

  // Flat alphabetical list
  const sortedTrails = [...trails].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <h2 style={{ color: 'var(--forest)', marginBottom: '1rem', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Trails Challenge
      </h2>

      {callbackError && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{callbackError}</div>
      )}

      {connecting && (
        <div className="card" style={{ marginBottom: '1rem', textAlign: 'center', padding: '2rem' }}>
          <span className="spinner" /> Connecting to Strava...
        </div>
      )}

      {/* Not connected: CTA only, no trail list or leaderboard */}
      {!isConnected && !connecting && (
        <div className="card" style={{ marginBottom: '2rem', padding: '2rem', textAlign: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.75rem' }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--forest)', marginBottom: '0.5rem' }}>
            Track your trail completions
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 1.25rem' }}>
            Connect your Strava account to track which Ken-Caryl trails you&rsquo;ve completed and see how you stack up on the leaderboard.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleConnect}
            style={{ background: '#FC4C02', borderColor: '#FC4C02' }}
          >
            Connect with Strava
          </button>
        </div>
      )}

      {/* Connected view */}
      {isConnected && (
        <>
          {/* Connection bar */}
          <div className="card" style={{
            marginBottom: '1rem', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.25rem 0.75rem', borderRadius: 999,
                background: '#FFF3ED', color: '#FC4C02', fontSize: '0.8rem', fontWeight: 600,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Connected
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                as {connection.athlete_name}
              </span>
              {lastSynced && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  &middot; last synced {new Date(lastSynced).toLocaleDateString()}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSync}
                disabled={syncing}
                style={{ background: '#FC4C02', borderColor: '#FC4C02' }}
              >
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>Disconnect</button>
            </div>
          </div>

          {/* Sync message */}
          {syncMsg && (
            <div style={{
              fontSize: '0.85rem', marginBottom: '1rem', padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: syncIsError ? '#FEF2F2' : 'var(--fern)',
              color: syncIsError ? '#991B1B' : 'var(--text-muted)',
              border: syncIsError ? '1px solid #FECACA' : 'none',
            }}>
              {syncMsg}
            </div>
          )}

          {/* Progress summary */}
          {totalTrails > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--forest)' }}>
                    {completedTrails}
                  </span>
                  <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                    of {totalTrails} trails complete
                  </span>
                </div>
                {completedTrails === totalTrails && totalTrails > 0 && (
                  <span style={{
                    fontSize: '0.8rem', fontWeight: 700, padding: '0.3rem 0.75rem',
                    borderRadius: 999, background: '#DCFCE7', color: '#16A34A',
                  }}>
                    {'🏆'} ALL COMPLETE
                  </span>
                )}
              </div>
              <div style={{ height: 8, background: 'var(--stone)', borderRadius: 4, marginTop: '0.75rem', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${totalTrails > 0 ? (completedTrails / totalTrails) * 100 : 0}%`,
                  background: completedTrails === totalTrails ? '#16A34A' : '#FC4C02',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}

          {/* Flat alphabetical trail list */}
          {sortedTrails.length === 0 ? (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="empty-state"><p>No trails have been set up yet</p></div>
            </div>
          ) : (
            <div className="card" style={{ marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
              {sortedTrails.map((trail, idx) => (
                <div
                  key={trail.trail_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.7rem 1.25rem',
                    borderBottom: idx < sortedTrails.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* Completion indicator */}
                  {trail.is_completed ? (
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="12" fill="#16A34A" />
                      <polyline points="5 13 9 17 19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}

                  {/* Trail name + distance/elevation */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: trail.is_completed ? 600 : 400,
                      color: trail.is_completed ? 'var(--forest)' : 'var(--text)',
                    }}>
                      {trail.name}
                    </span>
                    {(trail.distance_miles || trail.elevation_feet) && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                        {trail.distance_miles && `${trail.distance_miles} mi`}
                        {trail.distance_miles && trail.elevation_feet && ' · '}
                        {trail.elevation_feet && `${trail.elevation_feet.toLocaleString()} ft`}
                      </span>
                    )}
                  </div>

                  {/* Last synced date (right-aligned) */}
                  {trail.last_synced && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(trail.last_synced).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Leaderboard (open by default) */}
          <LeaderboardPanel leaderboard={leaderboard} totalTrails={totalTrails} />
        </>
      )}
    </>
  );
}

export default function Resources() {
  const [sponsors, setSponsors]   = useState([]);
  const [updates, setUpdates]     = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      getSponsors().then(r => setSponsors(r.data)),
      getResourceUpdates().then(r => setUpdates(r.data)),
      getResourceDocuments().then(r => setDocuments(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  // Group documents by category
  const docsByCategory = documents.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {});
  const categories = Object.keys(docsByCategory).sort();

  if (loading) return <div className="page"><div className="container"><span className="spinner" /></div></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Resources</h1>
            <p>Trail info, updates, and community resources</p>
          </div>
        </div>

        {/* ── Sponsor Ribbon ─────────────────────────────────── */}
        {sponsors.length > 0 && (
          <div style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.5rem',
            marginBottom: '2rem',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              Our Sponsors
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '2rem',
            }}>
              {sponsors.map(s => (
                <a
                  key={s.sponsor_id}
                  href={s.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'opacity 0.15s, transform 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <img
                    src={s.logo_url}
                    alt={s.name}
                    style={{ maxHeight: 48, maxWidth: 140, objectFit: 'contain' }}
                    onError={e => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'inline';
                    }}
                  />
                  <span style={{ display: 'none', fontSize: '0.9rem', fontWeight: 500, color: 'var(--forest)' }}>
                    {s.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Current Updates ────────────────────────────────── */}
        <h2 style={{ color: 'var(--forest)', marginBottom: '1rem', fontSize: '1.3rem' }}>Current Updates</h2>
        {updates.length === 0 ? (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="empty-state"><p>No current updates</p></div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}>
            {updates.map(u => {
              const ts = TYPE_STYLES[u.update_type] || TYPE_STYLES.general;
              return (
                <div
                  key={u.update_id}
                  className="card"
                  style={{ borderLeft: `4px solid ${ts.border}`, padding: '1.25rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '0.2rem 0.6rem', borderRadius: 999,
                      fontSize: '0.72rem', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      background: ts.bg, color: ts.color,
                    }}>
                      {ts.label}
                    </span>
                    {u.expires_at && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Expires {u.expires_at}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', textTransform: 'none' }}>{u.title}</h3>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{u.body}</p>
                  {u.link_url && (
                    <a
                      href={u.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 500,
                        color: 'var(--forest-mid)',
                      }}
                    >
                      Learn more &rarr;
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Trails Challenge (Strava) ──────────────────────── */}
        <StravaSection />

        {/* ── Document Library ───────────────────────────────── */}
        <h2 style={{ color: 'var(--forest)', marginBottom: '1rem', fontSize: '1.3rem' }}>Document Library</h2>
        {categories.length === 0 ? (
          <div className="card">
            <div className="empty-state"><p>No documents available</p></div>
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat} className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--forest)', marginBottom: '0.75rem', textTransform: 'none' }}>{cat}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {docsByCategory[cat].map(doc => (
                  <a
                    key={doc.document_id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)',
                      transition: 'background 0.12s', textDecoration: 'none',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--fern)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--forest-mid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                    <div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--forest-mid)' }}>{doc.title}</span>
                      {doc.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{doc.description}</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
