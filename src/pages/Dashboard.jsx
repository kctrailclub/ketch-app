import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHours, getPendingHours } from '../api/client';
import { useAuth } from '../context/AuthContext';

const currentYear = new Date().getFullYear();

function IOSInstallBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const dismissed = localStorage.getItem('ios_install_dismissed');
    if (isIOS && !isStandalone && !dismissed) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div className="alert alert-info" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <div style={{ flex: 1 }}>
        <strong>Install this app on your iPhone</strong>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem' }}>
          Tap the <strong>Share</strong> button <span style={{ fontSize: '1.1rem' }}>&#x2191;</span> in Safari, then tap <strong>"Add to Home Screen"</strong> to get push notifications and quick access.
        </p>
      </div>
      <button
        onClick={() => { setShow(false); localStorage.setItem('ios_install_dismissed', '1'); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.25rem', color: 'inherit' }}
        aria-label="Dismiss"
      >&times;</button>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [myHours,      setMyHours]      = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const hoursRes = await getHours({ year: currentYear, member_id: user?.user_id });
        setMyHours(hoursRes.data);

        if (user?.is_admin) {
          const pendingRes = await getPendingHours();
          setPendingCount(pendingRes.data.length);
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
        <IOSInstallBanner />
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
