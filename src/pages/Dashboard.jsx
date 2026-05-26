import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHours, getPendingHours, getStravaConnection, getTrailsChallenge } from '../api/client';
import { useAuth } from '../context/AuthContext';

const currentYear = new Date().getFullYear();

export default function Dashboard() {
  const { user } = useAuth();
  const [myHours,        setMyHours]        = useState([]);
  const [pendingCount,   setPendingCount]   = useState(0);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaChallenge, setStravaChallenge] = useState(null);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const hoursRes = await getHours({ year: currentYear, member_id: user?.user_id });
        setMyHours(hoursRes.data);

        if (user?.is_admin) {
          const pendingRes = await getPendingHours();
          setPendingCount(pendingRes.data.length);
        }

        try {
          const [connRes, challengeRes] = await Promise.all([
            getStravaConnection(),
            getTrailsChallenge(),
          ]);
          setStravaConnected(connRes.data.connected);
          setStravaChallenge(challengeRes.data);
        } catch {
          // Strava not configured — hide silently
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const approvedHours = myHours.filter(h => h.status === 'approved');
  const totalHours = approvedHours.reduce((sum, h) => sum + h.hours * ((h.member_credit_pct ?? 100) / 100), 0);

  if (loading) return <div className="loading-page"><span className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Welcome back, {user?.firstname}</h1>
            <p>Here's your volunteer activity for {currentYear}</p>
          </div>
          <Link to="/hours/submit" className="btn btn-primary">
            + Log Hours
          </Link>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{totalHours.toFixed(1)}</div>
            <div className="stat-label">Approved Hours This Year</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{myHours.length}</div>
            <div className="stat-label">Sessions Logged</div>
          </div>
          {user?.is_admin && (
            <div className="stat-card">
              <div className="stat-value">{pendingCount}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          )}
        </div>

        {/* Trails Challenge progress — connected members only */}
        {stravaConnected && stravaChallenge && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                Trails Challenge
              </h3>
              <Link to="/resources" className="btn btn-ghost btn-sm">View details</Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--forest)' }}>
                {stravaChallenge.completed_trails}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                of {stravaChallenge.total_trails} trails complete
              </span>
              {stravaChallenge.completed_trails === stravaChallenge.total_trails && stravaChallenge.total_trails > 0 && (
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                  borderRadius: 999, background: '#DCFCE7', color: '#16A34A', marginLeft: '0.5rem',
                }}>
                  ALL COMPLETE
                </span>
              )}
            </div>
            <div style={{ height: 8, background: 'var(--stone)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                width: `${stravaChallenge.total_trails > 0 ? (stravaChallenge.completed_trails / stravaChallenge.total_trails) * 100 : 0}%`,
                background: stravaChallenge.completed_trails === stravaChallenge.total_trails ? '#16A34A' : '#FC4C02',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}

        {/* Admin actions */}
        {user?.is_admin && pendingCount > 0 && (
          <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
            <strong>{pendingCount} hour {pendingCount === 1 ? 'submission' : 'submissions'}</strong> waiting for your approval.{' '}
            <Link to="/admin/hours" style={{ fontWeight: 600 }}>Review now →</Link>
          </div>
        )}

        {/* Recent hours */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Hours</h3>
            <Link to="/hours" className="btn btn-ghost btn-sm">View all</Link>
          </div>

          {myHours.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <p>No hours logged for {currentYear} yet.</p>
              <Link to="/hours/submit" className="btn btn-primary" style={{marginTop:'1rem'}}>Log Your First Hours</Link>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myHours.slice(0, 8).map(h => (
                    <tr key={h.hour_id}>
                      <td>{new Date(h.service_date).toLocaleDateString()}</td>
                      <td><strong>{h.project_name}</strong></td>
                      <td>{h.hours}</td>
                      <td><span className={`badge badge-${h.status}`}>{h.status}</span></td>
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
