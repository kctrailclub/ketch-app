import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Nav.css';

const TreeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 3L4 13h4v2L5 18h5v2H9v5h10v-5h-1v-2h5l-3-3v-2h4L14 3z" fill="currentColor"/>
  </svg>
);

export default function Nav() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/hours',     label: 'Hours' },
    ...(user?.is_admin ? [
      { to: '/admin/hours',       label: 'Approve Hours' },
      { to: '/admin/bulk-hours',  label: 'Log Crew Hours' },
      { to: '/admin/users',       label: 'Members' },
      { to: '/admin/households',  label: 'Households' },
      { to: '/admin/projects',    label: 'Projects' },
      { to: '/admin/reports',     label: 'Reports' },
      { to: '/admin/rewards',     label: 'Rewards' },
    ] : [
      { to: '/household',        label: 'Household' },
      { to: '/change-password',  label: 'Change Password' },
    ]),
  ];

  return (
    <nav className="nav">
      <div className="nav-inner container">
        <Link to="/dashboard" className="nav-brand">
          <TreeIcon />
          <span>KCTC Volunteer Hours</span>
        </Link>

        {/* Desktop links */}
        <ul className="nav-links">
          {links.map(l => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={`nav-link ${isActive(l.to) ? 'active' : ''}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-right">
          <span className="nav-user">
            {user?.firstname} {user?.lastname}
            {user?.is_admin && <span className="badge badge-admin" style={{marginLeft:'0.5rem',fontSize:'0.7rem'}}>Admin</span>}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
            Sign out
          </button>
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="nav-mobile">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-mobile-link ${isActive(l.to) ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut} style={{margin:'0.5rem 1rem'}}>
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
