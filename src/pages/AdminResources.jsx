import { useEffect, useState } from 'react';
import {
  getSponsors, createSponsor, updateSponsor, deleteSponsor,
  getResourceUpdates, createResourceUpdate, editResourceUpdate, deleteResourceUpdate,
  getResourceDocuments, createResourceDocument, updateResourceDocument, deleteResourceDocument,
  getStravaSegments, addStravaSegment, updateStravaSegment, deleteStravaSegment, refreshStravaSegment,
  getStravaConnection,
} from '../api/client';

const TABS = [
  { id: 'updates',   label: 'Updates' },
  { id: 'documents', label: 'Documents' },
  { id: 'sponsors',  label: 'Sponsors' },
  { id: 'segments',  label: 'Segments' },
];

const TYPE_OPTIONS = [
  { value: 'trail',   label: 'Trail Condition' },
  { value: 'event',   label: 'Event' },
  { value: 'general', label: 'General' },
];

// ── Reusable Modal ──────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Updates Tab ─────────────────────────────────────────────
function UpdatesTab() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'add' | update obj
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const load = () => {
    setLoading(true);
    getResourceUpdates(true, true).then(r => setItems(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => {
    setForm({ title: '', body: '', update_type: 'general', link_url: '', expires_at: '' });
    setError('');
    setModal('add');
  };

  const openEdit = (u) => {
    setForm({
      title: u.title,
      body: u.body,
      update_type: u.update_type,
      link_url: u.link_url || '',
      expires_at: u.expires_at || '',
      is_active: u.is_active,
    });
    setError('');
    setModal(u);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const data = {
        title: form.title,
        body: form.body,
        update_type: form.update_type,
        link_url: form.link_url || null,
        expires_at: form.expires_at || null,
      };
      if (modal === 'add') {
        await createResourceUpdate(data);
      } else {
        data.is_active = form.is_active;
        await editResourceUpdate(modal.update_id, data);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete "${u.title}"?`)) return;
    try {
      await deleteResourceUpdate(u.update_id);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (loading) return <span className="spinner" />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Update</button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state"><p>No updates yet</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Expires</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(u => (
                <tr key={u.update_id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <td><strong>{u.title}</strong></td>
                  <td>{TYPE_OPTIONS.find(t => t.value === u.update_type)?.label || u.update_type}</td>
                  <td>{u.expires_at || '—'}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Update' : 'Edit Update'} onClose={() => setModal(null)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={form.update_type} onChange={e => set('update_type', e.target.value)}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Body</label>
            <textarea rows={4} value={form.body} onChange={e => set('body', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Link URL (optional)</label>
            <input value={form.link_url} onChange={e => set('link_url', e.target.value)} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>Expires (optional)</label>
            <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} />
          </div>
          {modal !== 'add' && (
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={e => set('is_active', e.target.checked ? 1 : 0)}
                  style={{ width: 'auto', marginRight: '0.5rem' }}
                />
                Active
              </label>
            </div>
          )}
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title || !form.body}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Documents Tab ───────────────────────────────────────────
function DocumentsTab() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const load = () => {
    setLoading(true);
    getResourceDocuments(true).then(r => setItems(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => {
    setForm({ category: '', title: '', description: '', url: '' });
    setError('');
    setModal('add');
  };

  const openEdit = (d) => {
    setForm({
      category: d.category,
      title: d.title,
      description: d.description || '',
      url: d.url,
      is_active: d.is_active,
    });
    setError('');
    setModal(d);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const data = {
        category: form.category,
        title: form.title,
        description: form.description || null,
        url: form.url,
      };
      if (modal === 'add') {
        await createResourceDocument(data);
      } else {
        data.is_active = form.is_active;
        await updateResourceDocument(modal.document_id, data);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete "${d.title}"?`)) return;
    try {
      await deleteResourceDocument(d.document_id);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Unique categories for the datalist
  const existingCategories = [...new Set(items.map(d => d.category))].sort();

  if (loading) return <span className="spinner" />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Document</button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state"><p>No documents yet</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Title</th>
                <th>URL</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(d => (
                <tr key={d.document_id} style={{ opacity: d.is_active ? 1 : 0.5 }}>
                  <td>{d.category}</td>
                  <td><strong>{d.title}</strong></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer">{d.url}</a>
                  </td>
                  <td>
                    <span className={`badge ${d.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(d)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Document' : 'Edit Document'} onClose={() => setModal(null)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Category</label>
            <input
              list="cat-list"
              value={form.category}
              onChange={e => set('category', e.target.value)}
              placeholder="e.g. Trail Maps, Bike Destinations"
              required
            />
            <datalist id="cat-list">
              {existingCategories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label>Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="form-group">
            <label>URL</label>
            <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." required />
          </div>
          {modal !== 'add' && (
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={e => set('is_active', e.target.checked ? 1 : 0)}
                  style={{ width: 'auto', marginRight: '0.5rem' }}
                />
                Active
              </label>
            </div>
          )}
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title || !form.url || !form.category}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Sponsors Tab ────────────────────────────────────────────
function SponsorsTab() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const load = () => {
    setLoading(true);
    getSponsors(true).then(r => setItems(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => {
    setForm({ name: '', logo_url: '', website_url: '', sort_order: 0 });
    setError('');
    setModal('add');
  };

  const openEdit = (s) => {
    setForm({
      name: s.name,
      logo_url: s.logo_url,
      website_url: s.website_url,
      sort_order: s.sort_order,
      is_active: s.is_active,
    });
    setError('');
    setModal(s);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const data = {
        name: form.name,
        logo_url: form.logo_url,
        website_url: form.website_url,
        sort_order: parseInt(form.sort_order) || 0,
      };
      if (modal === 'add') {
        await createSponsor(data);
      } else {
        data.is_active = form.is_active;
        await updateSponsor(modal.sponsor_id, data);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete sponsor "${s.name}"?`)) return;
    try {
      await deleteSponsor(s.sponsor_id);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (loading) return <span className="spinner" />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Sponsor</button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state"><p>No sponsors yet</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Logo</th>
                <th>Name</th>
                <th>Website</th>
                <th>Order</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(s => (
                <tr key={s.sponsor_id} style={{ opacity: s.is_active ? 1 : 0.5 }}>
                  <td>
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      style={{ maxHeight: 32, maxWidth: 80, objectFit: 'contain' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </td>
                  <td><strong>{s.name}</strong></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={s.website_url} target="_blank" rel="noopener noreferrer">{s.website_url}</a>
                  </td>
                  <td>{s.sort_order}</td>
                  <td>
                    <span className={`badge ${s.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Sponsor' : 'Edit Sponsor'} onClose={() => setModal(null)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Logo URL</label>
            <input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://..." required />
            {form.logo_url && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--stone)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <img
                  src={form.logo_url}
                  alt="Preview"
                  style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain' }}
                  onError={e => { e.target.alt = 'Could not load image'; e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Website URL</label>
            <input value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://..." required />
          </div>
          <div className="form-group">
            <label>Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
          </div>
          {modal !== 'add' && (
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={e => set('is_active', e.target.checked ? 1 : 0)}
                  style={{ width: 'auto', marginRight: '0.5rem' }}
                />
                Active
              </label>
            </div>
          )}
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.logo_url || !form.website_url}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Segments Tab ───────────────────────────────────────────
function SegmentsTab() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // null | 'add' | segment obj
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [connected, setConnected] = useState(null); // null = loading, true/false

  const load = () => {
    setLoading(true);
    Promise.all([
      getStravaSegments(true).then(r => setItems(r.data)),
      getStravaConnection().then(r => setConnected(r.data.connected)).catch(() => setConnected(false)),
    ]).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => {
    setForm({ strava_segment_id: '', sort_order: 0 });
    setError('');
    setModal('add');
  };

  const openEdit = (s) => {
    setForm({ name: s.name, sort_order: s.sort_order, is_active: s.is_active });
    setError('');
    setModal(s);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (modal === 'add') {
        const segId = parseInt(form.strava_segment_id);
        if (!segId || segId <= 0) {
          setError('Enter a valid Strava Segment ID');
          setSaving(false);
          return;
        }
        await addStravaSegment({ strava_segment_id: segId, sort_order: parseInt(form.sort_order) || 0 });
      } else {
        await updateStravaSegment(modal.segment_id, {
          name: form.name,
          sort_order: parseInt(form.sort_order) || 0,
          is_active: form.is_active,
        });
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete segment "${s.name}"? All associated member efforts will also be removed.`)) return;
    try {
      await deleteStravaSegment(s.segment_id);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleRefresh = async (s) => {
    try {
      await refreshStravaSegment(s.segment_id);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to refresh');
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const formatDistance = (meters) => {
    if (!meters) return '—';
    return `${(meters / 1609.34).toFixed(2)} mi`;
  };

  if (loading) return <span className="spinner" />;

  return (
    <>
      {connected === false && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          You need to connect your Strava account on the <a href="/resources" style={{ fontWeight: 600 }}>Resources page</a> before you can add segments.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Add trail segments by their Strava Segment ID. Find IDs on <a href="https://www.strava.com/segments/explore" target="_blank" rel="noopener noreferrer" style={{ color: '#FC4C02' }}>Strava Segment Explorer</a>.
        </p>
        <button className="btn btn-primary btn-sm" onClick={openAdd} disabled={!connected}>+ Add Segment</button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state"><p>No featured segments yet</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Distance</th>
                <th>Grade</th>
                <th>Order</th>
                <th>Status</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(s => (
                <tr key={s.segment_id} style={{ opacity: s.is_active ? 1 : 0.5 }}>
                  <td>
                    <div>
                      <strong>{s.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {s.strava_segment_id}</div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
                      padding: '0.15rem 0.5rem', borderRadius: 999,
                      background: s.activity_type === 'Run' ? '#DBEAFE' : '#F3F4F6',
                      color: s.activity_type === 'Run' ? '#1E40AF' : '#374151',
                    }}>
                      {s.activity_type}
                    </span>
                  </td>
                  <td>{formatDistance(s.distance)}</td>
                  <td>{s.average_grade != null ? `${s.average_grade}%` : '—'}</td>
                  <td>{s.sort_order}</td>
                  <td>
                    <span className={`badge ${s.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleRefresh(s)} title="Re-fetch from Strava">Refresh</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Segment' : 'Edit Segment'} onClose={() => setModal(null)}>
          {error && <div className="alert alert-error">{error}</div>}
          {modal === 'add' ? (
            <>
              <div className="form-group">
                <label>Strava Segment ID</label>
                <input
                  type="number"
                  value={form.strava_segment_id}
                  onChange={e => set('strava_segment_id', e.target.value)}
                  placeholder="e.g. 12345678"
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Find this in the Strava segment URL: strava.com/segments/<strong>[ID]</strong>
                </small>
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={!!form.is_active}
                    onChange={e => set('is_active', e.target.checked ? 1 : 0)}
                    style={{ width: 'auto', marginRight: '0.5rem' }}
                  />
                  Active
                </label>
              </div>
            </>
          )}
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || (modal === 'add' && !form.strava_segment_id)}
            >
              {saving ? (modal === 'add' ? 'Fetching from Strava...' : 'Saving...') : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Main Admin Resources Page ───────────────────────────────
export default function AdminResources() {
  const [tab, setTab] = useState('updates');

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Manage Resources</h1>
            <p>Manage updates, documents, and sponsors visible to members</p>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          borderBottom: '2px solid var(--border)',
          marginBottom: '1.5rem',
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '0.6rem 1.25rem',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--forest)' : '2px solid transparent',
                marginBottom: '-2px',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? 'var(--forest)' : 'var(--text-muted)',
                transition: 'color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="card">
          {tab === 'updates'   && <UpdatesTab />}
          {tab === 'documents' && <DocumentsTab />}
          {tab === 'sponsors'  && <SponsorsTab />}
          {tab === 'segments'  && <SegmentsTab />}
        </div>
      </div>
    </div>
  );
}
