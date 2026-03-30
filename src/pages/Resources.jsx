import { useEffect, useState, useCallback } from 'react';
import {
  getSponsors, getResourceUpdates, getResourceDocuments,
  getStravaConnection, getStravaAuthUrl, stravaCallback, disconnectStrava,
  getStravaSegments, syncStravaEfforts, getSegmentLeaderboard, getMySegmentEfforts,
} from '../api/client';

const TYPE_STYLES = {
  trail:   { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B', label: 'Trail Condition' },
  event:   { bg: '#DBEAFE', color: '#1E40AF', border: '#3B82F6', label: 'Event' },
  general: { bg: '#F3F4F6', color: '#374151', border: '#9CA3AF', label: 'Notice' },
};

// ── Strava Segments Section ──────────────────────────────────
function StravaSection() {
  const [connection, setConnection] = useState(null);
  const [segments, setSegments]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [syncMsg, setSyncMsg]       = useState('');
  const [expanded, setExpanded]     = useState(null); // segment_id
  const [leaderboard, setLeaderboard] = useState([]);
  const [myEfforts, setMyEfforts]   = useState([]);
  const [lbLoading, setLbLoading]   = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [callbackError, setCallbackError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [connRes, segRes] = await Promise.all([
        getStravaConnection(),
        getStravaSegments(),
      ]);
      setConnection(connRes.data);
      setSegments(segRes.data);
    } catch {
      // Strava not configured or other error — just hide the section
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('strava_callback') === '1' && params.get('code')) {
      const code = params.get('code');
      // Clean up URL
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

  const handleConnect = async () => {
    try {
      const res = await getStravaAuthUrl();
      window.location.href = res.data.url;
    } catch {
      alert('Strava integration is not available');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Strava account? Your synced efforts will be removed.')) return;
    try {
      await disconnectStrava();
      setConnection({ connected: false });
      setSyncMsg('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to disconnect');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await syncStravaEfforts();
      setSyncMsg(res.data.detail);
      // Refresh leaderboard if one is open
      if (expanded) {
        loadLeaderboard(expanded);
      }
    } catch (err) {
      setSyncMsg(err.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const loadLeaderboard = async (segmentId) => {
    setLbLoading(true);
    try {
      const [lbRes, efRes] = await Promise.all([
        getSegmentLeaderboard(segmentId),
        connection?.connected ? getMySegmentEfforts(segmentId) : Promise.resolve({ data: [] }),
      ]);
      setLeaderboard(lbRes.data);
      setMyEfforts(efRes.data);
    } catch {
      setLeaderboard([]);
      setMyEfforts([]);
    } finally {
      setLbLoading(false);
    }
  };

  const toggleSegment = (segmentId) => {
    if (expanded === segmentId) {
      setExpanded(null);
    } else {
      setExpanded(segmentId);
      loadLeaderboard(segmentId);
    }
  };

  const formatDistance = (meters) => {
    if (!meters) return '';
    const miles = meters / 1609.34;
    return `${miles.toFixed(2)} mi`;
  };

  if (loading) return null; // Don't show anything while loading

  return (
    <>
      <h2 style={{ color: 'var(--forest)', marginBottom: '1rem', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Trail Segments
      </h2>

      {callbackError && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{callbackError}</div>
      )}

      {connecting && (
        <div className="card" style={{ marginBottom: '1rem', textAlign: 'center', padding: '2rem' }}>
          <span className="spinner" /> Connecting to Strava...
        </div>
      )}

      {/* Connection status */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        {connection?.connected ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.25rem 0.75rem', borderRadius: 999,
                background: '#FFF3ED', color: '#FC4C02', fontSize: '0.8rem', fontWeight: 600,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                Connected
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                as {connection.athlete_name}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSync}
                disabled={syncing}
                style={{ background: '#FC4C02', borderColor: '#FC4C02' }}
              >
                {syncing ? 'Syncing...' : 'Sync Activities'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>Disconnect</button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Connect your Strava account to see your times on local trail segments
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleConnect}
              style={{ background: '#FC4C02', borderColor: '#FC4C02', whiteSpace: 'nowrap' }}
            >
              Connect with Strava
            </button>
          </div>
        )}
      </div>

      {syncMsg && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', padding: '0.5rem 0.75rem', background: 'var(--fern)', borderRadius: 'var(--radius-sm)' }}>
          {syncMsg}
        </div>
      )}

      {/* Segment cards */}
      {segments.length === 0 ? (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="empty-state">
            <p>No trail segments have been added yet</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {segments.map(seg => (
            <div key={seg.segment_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Segment header — clickable */}
              <div
                onClick={() => toggleSegment(seg.segment_id)}
                style={{
                  padding: '1rem 1.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 0.12s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--fern)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '1rem' }}>{seg.name}</strong>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                      padding: '0.15rem 0.5rem', borderRadius: 999,
                      background: seg.activity_type === 'Run' ? '#DBEAFE' : '#F3F4F6',
                      color: seg.activity_type === 'Run' ? '#1E40AF' : '#374151',
                    }}>
                      {seg.activity_type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {seg.distance && <span>{formatDistance(seg.distance)}</span>}
                    {seg.average_grade != null && <span>{seg.average_grade}% grade</span>}
                    {seg.elevation_high != null && seg.elevation_low != null && (
                      <span>{Math.round(seg.elevation_high - seg.elevation_low)}m elev gain</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <a
                    href={`https://www.strava.com/segments/${seg.strava_segment_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: '0.78rem', color: '#FC4C02', fontWeight: 500 }}
                  >
                    View on Strava
                  </a>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                    style={{ transform: expanded === seg.segment_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Expanded leaderboard */}
              {expanded === seg.segment_id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
                  {lbLoading ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}><span className="spinner" /></div>
                  ) : (
                    <>
                      {/* Leaderboard */}
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--forest)' }}>Leaderboard</h4>
                      {leaderboard.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No efforts recorded yet. Connect Strava and sync to see times.</p>
                      ) : (
                        <div className="table-wrapper" style={{ marginBottom: '1.25rem' }}>
                          <table style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                <th style={{ width: 40 }}>#</th>
                                <th>Name</th>
                                <th>Time</th>
                                <th>Date</th>
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
                                  <td style={{ fontFamily: 'monospace' }}>{entry.elapsed_time_formatted}</td>
                                  <td>{entry.start_date ? new Date(entry.start_date).toLocaleDateString() : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* My efforts */}
                      {connection?.connected && myEfforts.length > 0 && (
                        <>
                          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--forest)' }}>Your Efforts</h4>
                          <div className="table-wrapper">
                            <table style={{ fontSize: '0.85rem' }}>
                              <thead>
                                <tr>
                                  <th>Time</th>
                                  <th>Moving Time</th>
                                  <th>Date</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {myEfforts.map(e => (
                                  <tr key={e.effort_id}>
                                    <td style={{ fontFamily: 'monospace' }}>{e.elapsed_time_formatted}</td>
                                    <td style={{ fontFamily: 'monospace' }}>{e.moving_time_formatted}</td>
                                    <td>{e.start_date ? new Date(e.start_date).toLocaleDateString() : ''}</td>
                                    <td>
                                      {e.is_pr && (
                                        <span style={{
                                          fontSize: '0.7rem', fontWeight: 700, color: '#FC4C02',
                                          padding: '0.1rem 0.4rem', borderRadius: 999, background: '#FFF3ED',
                                        }}>PR</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
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
                    style={{
                      maxHeight: 48,
                      maxWidth: 140,
                      objectFit: 'contain',
                    }}
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
            <div className="empty-state">
              <p>No current updates</p>
            </div>
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
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 999,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      background: ts.bg,
                      color: ts.color,
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        marginTop: '0.75rem',
                        fontSize: '0.85rem',
                        fontWeight: 500,
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

        {/* ── Trail Segments (Strava) ────────────────────────── */}
        <StravaSection />

        {/* ── Document Library ───────────────────────────────── */}
        <h2 style={{ color: 'var(--forest)', marginBottom: '1rem', fontSize: '1.3rem' }}>Document Library</h2>
        {categories.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <p>No documents available</p>
            </div>
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'background 0.12s',
                      textDecoration: 'none',
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
