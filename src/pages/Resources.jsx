import { useEffect, useState, useCallback } from 'react';
import {
  getSponsors, getResourceUpdates, getResourceDocuments,
  getStravaConnection, getStravaAuthUrl, stravaCallback, disconnectStrava,
  syncStravaEfforts, getTrailsChallenge, getTrailsChallengeLeaderboard,
  getSegmentLeaderboard, getMySegmentEfforts,
} from '../api/client';

const TYPE_STYLES = {
  trail:   { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B', label: 'Trail Condition' },
  event:   { bg: '#DBEAFE', color: '#1E40AF', border: '#3B82F6', label: 'Event' },
  general: { bg: '#F3F4F6', color: '#374151', border: '#9CA3AF', label: 'Notice' },
};

// ── Strava Trails Challenge Section ──────────────────────────
function StravaSection() {
  const [connection, setConnection] = useState(null);
  const [challenge, setChallenge]   = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [syncMsg, setSyncMsg]       = useState('');
  const [connecting, setConnecting] = useState(false);
  const [callbackError, setCallbackError] = useState('');
  const [expandedTrail, setExpandedTrail] = useState(null);
  const [expandedSeg, setExpandedSeg]     = useState(null);
  const [segLeaderboard, setSegLeaderboard] = useState([]);
  const [segEfforts, setSegEfforts]         = useState([]);
  const [segLoading, setSegLoading]         = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
      // Strava not configured — hide section
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
      loadData();
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
      await loadData();
    } catch (err) {
      setSyncMsg(err.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const toggleTrail = (trailId) => {
    setExpandedTrail(expandedTrail === trailId ? null : trailId);
    setExpandedSeg(null);
  };

  const loadSegmentDetail = async (segmentId) => {
    if (expandedSeg === segmentId) {
      setExpandedSeg(null);
      return;
    }
    setExpandedSeg(segmentId);
    setSegLoading(true);
    try {
      const [lbRes, efRes] = await Promise.all([
        getSegmentLeaderboard(segmentId),
        connection?.connected ? getMySegmentEfforts(segmentId) : Promise.resolve({ data: [] }),
      ]);
      setSegLeaderboard(lbRes.data);
      setSegEfforts(efRes.data);
    } catch {
      setSegLeaderboard([]);
      setSegEfforts([]);
    } finally {
      setSegLoading(false);
    }
  };

  if (loading) return null;

  const trails = challenge?.trails || [];
  const totalTrails = challenge?.total_trails || 0;
  const completedTrails = challenge?.completed_trails || 0;

  return (
    <>
      <h2 style={{ color: 'var(--forest)', marginBottom: '1rem', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Trails Challenge {challenge?.year || ''}
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
              Connect your Strava account to track your progress on local trails
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

      {/* Overall progress */}
      {connection?.connected && totalTrails > 0 && (
        <div className="card" style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Your Progress</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--forest)' }}>
            {completedTrails} / {totalTrails}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>trails completed</div>
          <div style={{
            height: 8, background: 'var(--stone)', borderRadius: 4, marginTop: '0.75rem',
            overflow: 'hidden', maxWidth: 300, margin: '0.75rem auto 0',
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${totalTrails > 0 ? (completedTrails / totalTrails) * 100 : 0}%`,
              background: completedTrails === totalTrails ? '#16A34A' : '#FC4C02',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Trail cards */}
      {trails.length === 0 ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="empty-state">
            <p>No trails have been set up for this year's challenge yet</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {trails.map(trail => (
            <div key={trail.trail_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Trail header */}
              <div
                onClick={() => toggleTrail(trail.trail_id)}
                style={{
                  padding: '1rem 1.25rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.12s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--fern)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>
                      {trail.is_completed ? '\u2705' : '\u26F0\uFE0F'}
                    </span>
                    <strong style={{ fontSize: '1rem' }}>{trail.name}</strong>
                    {trail.is_completed && (
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                        borderRadius: 999, background: '#DCFCE7', color: '#16A34A',
                      }}>
                        COMPLETE
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {trail.distance_miles && <span>{trail.distance_miles} mi</span>}
                    {trail.elevation_feet && <span>{trail.elevation_feet.toLocaleString()} ft elev</span>}
                    <span>{trail.segments_completed}/{trail.segments_total} segments</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Mini progress */}
                  {trail.segments_total > 0 && (
                    <div style={{
                      width: 60, height: 6, background: 'var(--stone)', borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${(trail.segments_completed / trail.segments_total) * 100}%`,
                        background: trail.is_completed ? '#16A34A' : '#FC4C02',
                      }} />
                    </div>
                  )}
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                    style={{ transform: expandedTrail === trail.trail_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Expanded segments */}
              {expandedTrail === trail.trail_id && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {trail.segments.map(seg => (
                    <div key={seg.segment_id}>
                      <div
                        onClick={() => loadSegmentDetail(seg.segment_id)}
                        style={{
                          padding: '0.75rem 1.25rem 0.75rem 2.5rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          cursor: 'pointer', transition: 'background 0.12s',
                          borderBottom: '1px solid var(--border)',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'var(--fern)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.9rem' }}>
                            {seg.has_effort ? '\u2705' : '\u2B1C'}
                          </span>
                          <span style={{ fontSize: '0.9rem', fontWeight: seg.has_effort ? 500 : 400 }}>
                            {seg.name}
                          </span>
                          {seg.activity_type && (
                            <span style={{
                              fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase',
                              padding: '0.1rem 0.4rem', borderRadius: 999,
                              background: seg.activity_type === 'Run' ? '#DBEAFE' : '#F3F4F6',
                              color: seg.activity_type === 'Run' ? '#1E40AF' : '#374151',
                            }}>
                              {seg.activity_type}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {seg.best_time_formatted && (
                            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--forest)' }}>
                              {seg.best_time_formatted}
                            </span>
                          )}
                          <a
                            href={`https://www.strava.com/segments/${seg.strava_segment_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize: '0.75rem', color: '#FC4C02', fontWeight: 500 }}
                          >
                            Strava
                          </a>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                            style={{ transform: expandedSeg === seg.segment_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>

                      {/* Segment leaderboard + efforts */}
                      {expandedSeg === seg.segment_id && (
                        <div style={{ padding: '0.75rem 1.25rem 0.75rem 3.5rem', background: 'var(--fern)', borderBottom: '1px solid var(--border)' }}>
                          {segLoading ? (
                            <div style={{ textAlign: 'center', padding: '0.5rem' }}><span className="spinner" /></div>
                          ) : (
                            <>
                              <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--forest)' }}>Segment Leaderboard</h4>
                              {segLeaderboard.length === 0 ? (
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No efforts yet</p>
                              ) : (
                                <div className="table-wrapper" style={{ marginBottom: segEfforts.length > 0 ? '1rem' : 0 }}>
                                  <table style={{ fontSize: '0.82rem' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ width: 36 }}>#</th>
                                        <th>Name</th>
                                        <th>Time</th>
                                        <th>Date</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {segLeaderboard.map(entry => (
                                        <tr key={entry.user_id} style={{
                                          fontWeight: entry.is_current_user ? 600 : 400,
                                          background: entry.is_current_user ? 'rgba(252,76,2,0.06)' : 'transparent',
                                        }}>
                                          <td>{entry.rank === 1 ? '\uD83E\uDD47' : entry.rank === 2 ? '\uD83E\uDD48' : entry.rank === 3 ? '\uD83E\uDD49' : entry.rank}</td>
                                          <td>{entry.name}{entry.is_current_user ? ' (you)' : ''}</td>
                                          <td style={{ fontFamily: 'monospace' }}>{entry.elapsed_time_formatted}</td>
                                          <td>{entry.start_date ? new Date(entry.start_date).toLocaleDateString() : ''}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {connection?.connected && segEfforts.length > 0 && (
                                <>
                                  <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--forest)' }}>Your Efforts</h4>
                                  <div className="table-wrapper">
                                    <table style={{ fontSize: '0.82rem' }}>
                                      <thead>
                                        <tr><th>Time</th><th>Moving</th><th>Date</th><th></th></tr>
                                      </thead>
                                      <tbody>
                                        {segEfforts.map(e => (
                                          <tr key={e.effort_id}>
                                            <td style={{ fontFamily: 'monospace' }}>{e.elapsed_time_formatted}</td>
                                            <td style={{ fontFamily: 'monospace' }}>{e.moving_time_formatted}</td>
                                            <td>{e.start_date ? new Date(e.start_date).toLocaleDateString() : ''}</td>
                                            <td>
                                              {e.is_pr && (
                                                <span style={{
                                                  fontSize: '0.65rem', fontWeight: 700, color: '#FC4C02',
                                                  padding: '0.1rem 0.35rem', borderRadius: 999, background: '#FFF3ED',
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
            </div>
          ))}
        </div>
      )}

      {/* Trails Challenge Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div
            onClick={() => setShowLeaderboard(s => !s)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <h3 style={{ fontSize: '1rem', color: 'var(--forest)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>\uD83C\uDFC6</span> Trails Challenge Leaderboard
            </h3>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
              style={{ transform: showLeaderboard ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {showLeaderboard && (
            <div className="table-wrapper" style={{ marginTop: '1rem' }}>
              <table style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Name</th>
                    <th>Trails</th>
                    <th>Total Time</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map(entry => (
                    <tr key={entry.user_id} style={{
                      fontWeight: entry.is_current_user ? 600 : 400,
                      background: entry.is_current_user ? 'var(--fern)' : 'transparent',
                    }}>
                      <td>{entry.rank === 1 ? '\uD83E\uDD47' : entry.rank === 2 ? '\uD83E\uDD48' : entry.rank === 3 ? '\uD83E\uDD49' : entry.rank}</td>
                      <td>{entry.name}{entry.is_current_user ? ' (you)' : ''}</td>
                      <td>{entry.trails_completed}/{entry.total_trails}</td>
                      <td style={{ fontFamily: 'monospace' }}>{entry.total_best_time_formatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
