import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Nav.css';

const BrandLogo = () => (
  <img src="/kctc-logo.png" alt="Ken-Caryl Trail Club" style={{ height: 36, width: 'auto' }} />
);

export default function Nav() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      { to: '/admin/resources',   label: 'Resources' },
    ] : [
      { to: '/household', label: 'Household' },
      { to: '/resources', label: 'Resources' },
    ]),
  ];

  return (
    <nav className="nav">
      <div className="nav-inner container">
        <Link to="/dashboard" className="nav-brand">
          <BrandLogo />
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
          {/* User dropdown */}
          <div className="nav-dropdown" ref={dropdownRef}>
            <button
              className="nav-dropdown-trigger"
              onClick={() => setDropdownOpen(o => !o)}
            >
              <span className="nav-user">
                {user?.firstname} {user?.lastname}
                {user?.is_admin && <span className="badge badge-admin" style={{marginLeft:'0.5rem',fontSize:'0.7rem'}}>Admin</span>}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 5l3 3 3-3"/>
              </svg>
            </button>
            {dropdownOpen && (
              <div className="nav-dropdown-menu">
                <Link
                  to="/change-password"
                  className="nav-dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  Change Password
                </Link>
                <div className="nav-dropdown-divider" />
                <button
                  className="nav-dropdown-item"
                  onClick={() => { setDropdownOpen(false); handleSignOut(); }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

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
          <div className="nav-mobile-divider" />
          <Link
            to="/change-password"
            className="nav-mobile-link"
            onClick={() => setMenuOpen(false)}
          >
            Change Password
          </Link>
          <button className="nav-mobile-link" onClick={() => { setMenuOpen(false); handleSignOut(); }} style={{textAlign:'left',background:'none',border:'none',cursor:'pointer'}}>
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
