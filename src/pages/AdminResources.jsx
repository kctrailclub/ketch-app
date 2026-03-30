import { useEffect, useState } from 'react';
import {
  getSponsors, createSponsor, updateSponsor, deleteSponsor,
  getResourceUpdates, createResourceUpdate, editResourceUpdate, deleteResourceUpdate,
  getResourceDocuments, createResourceDocument, updateResourceDocument, deleteResourceDocument,
  getStravaSegments, addStravaSegment, updateStravaSegment, deleteStravaSegment, refreshStravaSegment,
  getStravaConnection, getStravaAuthUrl,
  getStravaTrails, createStravaTrail, updateStravaTrail, deleteStravaTrail,
  addSegmentToTrail, removeSegmentFromTrail,
} from '../api/client';

const TABS = [
  { id: 'updates',   label: 'Updates' },
  { id: 'documents', label: 'Documents' },
  { id: 'sponsors',  label: 'Sponsors' },
  { id: 'strava',    label: 'Strava' },
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

// ── Strava Tab (Trails + Segments) ────────────────────────
const emptySegRow = () => ({ id: Date.now() + Math.random(), segment_id: '' });

function StravaTab() {
  // --- Shared state ---
  const [segments, setSegments]     = useState([]);
  const [trails, setTrails]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [connected, setConnected]   = useState(null);

  // --- Trail state ---
  const [trailModal, setTrailModal] = useState(null);
  const [trailForm, setTrailForm]   = useState({});
  const [trailSaving, setTrailSaving] = useState(false);
  const [trailError, setTrailError]   = useState('');
  const [expanded, setExpanded]       = useState(null);

  // --- Add segments to trail (bulk) ---
  const [mapTrailId, setMapTrailId] = useState(null);
  const [mapRows, setMapRows]       = useState([emptySegRow(), emptySegRow()]);
  const [mapSaving, setMapSaving]   = useState(false);
  const [mapError, setMapError]     = useState('');

  // --- Segment management state ---
  const [segModal, setSegModal]       = useState(null);
  const [segForm, setSegForm]         = useState({});
  const [segSaving, setSegSaving]     = useState(false);
  const [segError, setSegError]       = useState('');
  const [showSegments, setShowSegments] = useState(false);

  const currentYear = new Date().getFullYear();

  const load = () => {
    setLoading(true);
    Promise.all([
      getStravaTrails(currentYear, true).then(r => setTrails(r.data)),
      getStravaSegments(true).then(r => setSegments(r.data)),
      getStravaConnection().then(r => setConnected(r.data.connected)).catch(() => setConnected(false)),
    ]).finally(() => setLoading(false));
  };
  useEffect(load, []);

  // ── Trail CRUD ──
  const openAddTrail = () => {
    setTrailForm({ name: '', distance_miles: '', elevation_feet: '', sort_order: 0, year: currentYear });
    setTrailError('');
    setTrailModal('add');
  };

  const openEditTrail = (t) => {
    setTrailForm({
      name: t.name,
      distance_miles: t.distance_miles || '',
      elevation_feet: t.elevation_feet || '',
      sort_order: t.sort_order,
      is_active: t.is_active,
    });
    setTrailError('');
    setTrailModal(t);
  };

  const handleSaveTrail = async () => {
    setTrailError('');
    if (!trailForm.name?.trim()) { setTrailError('Name is required'); return; }
    setTrailSaving(true);
    try {
      if (trailModal === 'add') {
        await createStravaTrail({
          name: trailForm.name.trim(),
          distance_miles: trailForm.distance_miles ? parseFloat(trailForm.distance_miles) : null,
          elevation_feet: trailForm.elevation_feet ? parseInt(trailForm.elevation_feet) : null,
          year: parseInt(trailForm.year) || currentYear,
          sort_order: parseInt(trailForm.sort_order) || 0,
        });
      } else {
        await updateStravaTrail(trailModal.trail_id, {
          name: trailForm.name.trim(),
          distance_miles: trailForm.distance_miles ? parseFloat(trailForm.distance_miles) : null,
          elevation_feet: trailForm.elevation_feet ? parseInt(trailForm.elevation_feet) : null,
          sort_order: parseInt(trailForm.sort_order) || 0,
          is_active: trailForm.is_active,
        });
      }
      setTrailModal(null);
      load();
    } catch (err) {
      setTrailError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setTrailSaving(false);
    }
  };

  const handleDeleteTrail = async (t) => {
    if (!window.confirm(`Delete trail "${t.name}"? This will also remove all segment mappings.`)) return;
    try {
      await deleteStravaTrail(t.trail_id);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleRemoveSegment = async (trailId, segmentId) => {
    if (!window.confirm('Remove this segment from the trail?')) return;
    try {
      await removeSegmentFromTrail(trailId, segmentId);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove');
    }
  };

  const setTF = (k, v) => setTrailForm(f => ({ ...f, [k]: v }));

  // ── Bulk add segments to trail ──
  const openMapSegments = (trail) => {
    setMapTrailId(trail.trail_id);
    setMapRows([emptySegRow(), emptySegRow()]);
    setMapError('');
  };

  const setMapRow = (id, value) => {
    setMapRows(rs => rs.map(r => r.id === id ? { ...r, segment_id: value } : r));
  };

  const addMapRow = () => setMapRows(rs => [...rs, emptySegRow()]);

  const removeMapRow = (id) => {
    if (mapRows.length <= 1) return;
    setMapRows(rs => rs.filter(r => r.id !== id));
  };

  const handleBulkAddSegments = async () => {
    setMapError('');
    const filled = mapRows.filter(r => r.segment_id);
    if (filled.length === 0) { setMapError('Select at least one segment'); return; }

    // Check for duplicates in the selection
    const ids = filled.map(r => r.segment_id);
    if (new Set(ids).size !== ids.length) { setMapError('A segment is selected more than once'); return; }

    // Find the trail to get its current segment count for auto-ordering
    const trail = trails.find(t => t.trail_id === mapTrailId);
    const startOrder = trail ? trail.segment_count : 0;

    setMapSaving(true);
    try {
      for (let i = 0; i < filled.length; i++) {
        await addSegmentToTrail(mapTrailId, {
          segment_id: parseInt(filled[i].segment_id),
          segment_order: startOrder + i,
        });
      }
      setMapTrailId(null);
      load();
    } catch (err) {
      setMapError(err.response?.data?.detail || 'Failed to add one or more segments');
    } finally {
      setMapSaving(false);
    }
  };

  // Get already-mapped segment IDs for this trail to filter them out
  const trailForMap = trails.find(t => t.trail_id === mapTrailId);
  const mappedSegIds = new Set(trailForMap?.segments?.map(s => String(s.segment_id)) || []);
  const availableSegments = segments.filter(s => s.is_active && !mappedSegIds.has(String(s.segment_id)));

  // ── Segment CRUD ──
  const openAddSegment = () => {
    setSegForm({ strava_segment_id: '' });
    setSegError('');
    setSegModal('add');
  };

  const openEditSegment = (s) => {
    setSegForm({ name: s.name, is_active: s.is_active });
    setSegError('');
    setSegModal(s);
  };

  const handleSaveSegment = async () => {
    setSegError('');
    setSegSaving(true);
    try {
      if (segModal === 'add') {
        const segId = parseInt(segForm.strava_segment_id);
        if (!segId || segId <= 0) { setSegError('Enter a valid Strava Segment ID'); setSegSaving(false); return; }
        await addStravaSegment({ strava_segment_id: segId, sort_order: 0 });
      } else {
        await updateStravaSegment(segModal.segment_id, {
          name: segForm.name,
          is_active: segForm.is_active,
        });
      }
      setSegModal(null);
      load();
    } catch (err) {
      setSegError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSegSaving(false);
    }
  };

  const handleDeleteSegment = async (s) => {
    if (!window.confirm(`Delete segment "${s.name}"? All associated member efforts will also be removed.`)) return;
    try { await deleteStravaSegment(s.segment_id); load(); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to delete'); }
  };

  const handleRefreshSegment = async (s) => {
    try { await refreshStravaSegment(s.segment_id); load(); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to refresh'); }
  };

  const setSF = (k, v) => setSegForm(f => ({ ...f, [k]: v }));

  const formatDistance = (meters) => {
    if (!meters) return '—';
    return `${(meters / 1609.34).toFixed(2)} mi`;
  };

  if (loading) return <span className="spinner" />;

  return (
    <>
      {/* Strava connection banner */}
      {connected === false && (
        <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span>Connect your Strava account to add and manage segments.</span>
          <button
            className="btn btn-primary btn-sm"
            style={{ background: '#FC4C02', borderColor: '#FC4C02' }}
            onClick={async () => {
              try { const res = await getStravaAuthUrl(); window.location.href = res.data.url; }
              catch { alert('Strava integration is not available'); }
            }}
          >
            Connect with Strava
          </button>
        </div>
      )}

      {/* ── Trails Section ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--forest)' }}>Trails</h3>
        <button className="btn btn-primary btn-sm" onClick={openAddTrail}>+ Add Trail</button>
      </div>

      {trails.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: '2rem' }}><p>No trails yet</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {trails.map(t => (
            <div key={t.trail_id} style={{
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              overflow: 'hidden', opacity: t.is_active ? 1 : 0.5,
            }}>
              {/* Trail header */}
              <div style={{
                padding: '0.75rem 1rem', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', background: 'var(--fern)',
              }}>
                <div
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === t.trail_id ? null : t.trail_id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>{t.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({t.segment_count} segment{t.segment_count !== 1 ? 's' : ''})
                    </span>
                    {!t.is_active && (
                      <span className="badge badge-rejected" style={{ fontSize: '0.65rem' }}>Inactive</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                    {t.distance_miles && <span>{t.distance_miles} mi</span>}
                    {t.elevation_feet && <span>{t.elevation_feet.toLocaleString()} ft</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditTrail(t)}>Edit</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openMapSegments(t)}>+ Segments</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTrail(t)}>Delete</button>
                </div>
              </div>

              {/* Segments list (expandable) */}
              {expanded === t.trail_id && (
                <div style={{ padding: '0.5rem 1rem' }}>
                  {t.segments.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                      No segments mapped yet. Click "+ Segments" to add.
                    </p>
                  ) : (
                    <table style={{ fontSize: '0.85rem', width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Segment</th>
                          <th>Type</th>
                          <th style={{ width: 80 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.segments.map(s => (
                          <tr key={s.segment_id}>
                            <td>
                              <div>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Strava ID: {s.strava_segment_id}
                              </div>
                            </td>
                            <td>
                              <span style={{
                                fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                                padding: '0.1rem 0.4rem', borderRadius: 999,
                                background: s.activity_type === 'Run' ? '#DBEAFE' : '#F3F4F6',
                                color: s.activity_type === 'Run' ? '#1E40AF' : '#374151',
                              }}>
                                {s.activity_type}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRemoveSegment(t.trail_id, s.segment_id)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Segments Inventory (collapsible) ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showSegments ? '1rem' : 0, cursor: 'pointer' }}
          onClick={() => setShowSegments(s => !s)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--forest)' }}>Segment Library</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({segments.length} segments)</span>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
              style={{ transform: showSegments ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={e => { e.stopPropagation(); openAddSegment(); }}
            disabled={!connected}
          >
            + Add Segment
          </button>
        </div>

        {showSegments && (
          <>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
              Add trail segments by their Strava Segment ID. Find IDs on{' '}
              <a href="https://www.strava.com/segments/explore" target="_blank" rel="noopener noreferrer" style={{ color: '#FC4C02' }}>
                Strava Segment Explorer
              </a>.
            </p>

            {segments.length === 0 ? (
              <div className="empty-state"><p>No segments yet</p></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Distance</th>
                      <th>Status</th>
                      <th style={{ width: 180 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map(s => (
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
                        <td>
                          <span className={`badge ${s.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditSegment(s)}>Edit</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleRefreshSegment(s)} title="Re-fetch from Strava">Refresh</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSegment(s)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Trail Add/Edit Modal ── */}
      {trailModal && (
        <Modal title={trailModal === 'add' ? 'Add Trail' : 'Edit Trail'} onClose={() => setTrailModal(null)}>
          {trailError && <div className="alert alert-error">{trailError}</div>}
          <div className="form-group">
            <label>Trail Name</label>
            <input value={trailForm.name} onChange={e => setTF('name', e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Distance (miles)</label>
              <input type="number" step="0.01" value={trailForm.distance_miles} onChange={e => setTF('distance_miles', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Elevation (feet)</label>
              <input type="number" value={trailForm.elevation_feet} onChange={e => setTF('elevation_feet', e.target.value)} />
            </div>
          </div>
          {trailModal === 'add' && (
            <div className="form-group">
              <label>Year</label>
              <input type="number" value={trailForm.year} onChange={e => setTF('year', e.target.value)} />
            </div>
          )}
          {trailModal !== 'add' && (
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={!!trailForm.is_active}
                  onChange={e => setTF('is_active', e.target.checked ? 1 : 0)}
                  style={{ width: 'auto', marginRight: '0.5rem' }}
                />
                Active
              </label>
            </div>
          )}
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setTrailModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveTrail} disabled={trailSaving || !trailForm.name?.trim()}>
              {trailSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Bulk Add Segments to Trail Modal ── */}
      {mapTrailId && (
        <Modal title={`Add Segments to ${trailForMap?.name || 'Trail'}`} onClose={() => setMapTrailId(null)}>
          {mapError && <div className="alert alert-error">{mapError}</div>}

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Segments</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {mapRows.map(row => (
                <div key={row.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={row.segment_id}
                    onChange={e => setMapRow(row.id, e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select segment...</option>
                    {availableSegments.map(s => (
                      <option key={s.segment_id} value={s.segment_id}>
                        {s.name} ({s.activity_type})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeMapRow(row.id)}
                    title="Remove row"
                    style={{ padding: '0.25rem', color: 'var(--text-muted)', minWidth: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button type="button" className="btn btn-secondary btn-sm" onClick={addMapRow} style={{ marginBottom: '1rem' }}>
            + Add Row
          </button>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {mapRows.filter(r => r.segment_id).length} segment{mapRows.filter(r => r.segment_id).length !== 1 ? 's' : ''} selected
            — order will be assigned automatically
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setMapTrailId(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleBulkAddSegments}
              disabled={mapSaving || mapRows.every(r => !r.segment_id)}
            >
              {mapSaving ? 'Adding...' : 'Add Segments'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Segment Add/Edit Modal ── */}
      {segModal && (
        <Modal title={segModal === 'add' ? 'Add Segment from Strava' : 'Edit Segment'} onClose={() => setSegModal(null)}>
          {segError && <div className="alert alert-error">{segError}</div>}
          {segModal === 'add' ? (
            <div className="form-group">
              <label>Strava Segment ID</label>
              <input
                type="number"
                value={segForm.strava_segment_id}
                onChange={e => setSF('strava_segment_id', e.target.value)}
                placeholder="e.g. 12345678"
                required
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Find this in the Strava segment URL: strava.com/segments/<strong>[ID]</strong>
              </small>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Name</label>
                <input value={segForm.name} onChange={e => setSF('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={!!segForm.is_active}
                    onChange={e => setSF('is_active', e.target.checked ? 1 : 0)}
                    style={{ width: 'auto', marginRight: '0.5rem' }}
                  />
                  Active
                </label>
              </div>
            </>
          )}
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setSegModal(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSaveSegment}
              disabled={segSaving || (segModal === 'add' && !segForm.strava_segment_id)}
            >
              {segSaving ? (segModal === 'add' ? 'Fetching from Strava...' : 'Saving...') : 'Save'}
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
          {tab === 'strava'    && <StravaTab />}
        </div>
      </div>
    </div>
  );
}
