import { useEffect, useState } from 'react';
import { getSponsors, getResourceUpdates, getResourceDocuments } from '../api/client';

const TYPE_STYLES = {
  trail:   { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B', label: 'Trail Condition' },
  event:   { bg: '#DBEAFE', color: '#1E40AF', border: '#3B82F6', label: 'Event' },
  general: { bg: '#F3F4F6', color: '#374151', border: '#9CA3AF', label: 'Notice' },
};

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
