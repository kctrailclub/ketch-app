import { useEffect, useRef, useState } from 'react';
import {
  getSponsors, createSponsor, updateSponsor, deleteSponsor,
  getResourceUpdates, createResourceUpdate, editResourceUpdate, deleteResourceUpdate,
  getResourceDocuments, createResourceDocument, updateResourceDocument, deleteResourceDocument,
  getStravaTrails, createStravaTrail, updateStravaTrail, deleteStravaTrail,
  gpxPreview, gpxImport, uploadTrailGeometry,
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

// ── Strava Tab (Trails + GPX) ─────────────────────────────
function StravaTab() {
  const [trails, setTrails]         = useState([]);
  const [loading, setLoading]       = useState(true);

  // Trail CRUD
  const [trailModal, setTrailModal] = useState(null);   // null | 'add' | trail-object
  const [trailForm, setTrailForm]   = useState({});
  const [trailSaving, setTrailSaving] = useState(false);
  const [trailError, setTrailError]   = useState('');

  // Per-trail GPX upload
  const [geoTrailId, setGeoTrailId]     = useState(null);
  const [geoUploading, setGeoUploading] = useState(false);
  const [geoMsg, setGeoMsg]             = useState('');
  const geoFileRef                      = useRef(null);

  // Bulk GPX import
  const [bulkFile, setBulkFile]         = useState(null);
  const [bulkPreviewing, setBulkPreviewing] = useState(false);
  const [bulkPreview, setBulkPreview]   = useState(null);   // array from /gpx-preview
  const [bulkSel, setBulkSel]           = useState({});     // name -> { selected, sort_order }
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkMsg, setBulkMsg]           = useState('');
  const [bulkError, setBulkError]       = useState('');
  const bulkFileRef                     = useRef(null);

  const load = () => {
    setLoading(true);
    getStravaTrails(true).then(r => setTrails(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  // ── Trail CRUD ──
  const openAddTrail = () => {
    setTrailForm({ name: '', distance_miles: '', elevation_feet: '', sort_order: 0 });
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
    if (!window.confirm(`Delete trail "${t.name}"? All completion records will also be removed.`)) return;
    try { await deleteStravaTrail(t.trail_id); load(); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to delete'); }
  };

  const setTF = (k, v) => setTrailForm(f => ({ ...f, [k]: v }));

  // ── Per-trail GPX upload ──
  const handleGeoUpload = async (trailId, file) => {
    if (!file) return;
    setGeoTrailId(trailId);
    setGeoUploading(true);
    setGeoMsg('');
    try {
      const res = await uploadTrailGeometry(trailId, file);
      setGeoMsg(res.data.detail || 'Geometry uploaded');
      load();
    } catch (err) {
      setGeoMsg(err.response?.data?.detail || 'Upload failed');
    } finally {
      setGeoUploading(false);
      if (geoFileRef.current) geoFileRef.current.value = '';
    }
  };

  // ── Bulk GPX import ──
  const handleBulkPreview = async () => {
    if (!bulkFile) return;
    setBulkError('');
    setBulkMsg('');
    setBulkPreviewing(true);
    try {
      const res = await gpxPreview(bulkFile);
      const items = res.data.trails || [];
      setBulkPreview(items);
      // Default: select all, preserve sort order from array position
      const sel = {};
      items.forEach((t, i) => {
        sel[t.name] = { selected: true, sort_order: i };
      });
      setBulkSel(sel);
    } catch (err) {
      setBulkError(err.response?.data?.detail || 'Failed to parse GPX');
    } finally {
      setBulkPreviewing(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkFile || !bulkPreview) return;
    setBulkError('');
    setBulkImporting(true);
    try {
      const selections = bulkPreview
        .filter(t => bulkSel[t.name]?.selected)
        .map(t => ({
          name: t.name,
          distance_miles: t.distance_miles,
          sort_order: bulkSel[t.name]?.sort_order ?? 0,
        }));
      if (selections.length === 0) { setBulkError('Select at least one trail to import'); setBulkImporting(false); return; }
      const res = await gpxImport(bulkFile, selections);
      setBulkMsg(res.data.detail || 'Import complete');
      setBulkPreview(null);
      setBulkFile(null);
      if (bulkFileRef.current) bulkFileRef.current.value = '';
      load();
    } catch (err) {
      setBulkError(err.response?.data?.detail || 'Import failed');
    } finally {
      setBulkImporting(false);
    }
  };

  if (loading) return <span className="spinner" />;

  return (
    <>
      {/* ── Bulk GPX Import ── */}
      <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--fern)', borderRadius: 'var(--radius-md)' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--forest)' }}>Bulk GPX Import</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Upload the master trails GPX file to seed or update trail geometry in bulk.
        </p>

        {bulkMsg && (
          <div className="alert" style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', marginBottom: '0.75rem' }}>
            {bulkMsg}
          </div>
        )}
        {bulkError && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{bulkError}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <input
            type="file"
            accept=".gpx"
            ref={bulkFileRef}
            onChange={e => { setBulkFile(e.target.files[0] || null); setBulkPreview(null); setBulkMsg(''); setBulkError(''); }}
            style={{ fontSize: '0.85rem' }}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleBulkPreview}
            disabled={!bulkFile || bulkPreviewing}
          >
            {bulkPreviewing ? 'Parsing…' : 'Preview'}
          </button>
        </div>

        {bulkPreview && (
          <>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {bulkPreview.length} tracks found — select trails to import:
            </p>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--white)', marginBottom: '0.75rem' }}>
              <table style={{ fontSize: '0.82rem', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        style={{ width: 'auto' }}
                        checked={bulkPreview.every(t => bulkSel[t.name]?.selected)}
                        onChange={e => {
                          const next = {};
                          bulkPreview.forEach((t, i) => { next[t.name] = { ...bulkSel[t.name], selected: e.target.checked, sort_order: bulkSel[t.name]?.sort_order ?? i }; });
                          setBulkSel(next);
                        }}
                      />
                    </th>
                    <th>Name</th>
                    <th>Distance</th>
                    <th>Points</th>
                    <th style={{ width: 80 }}>Sort #</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.map((t, i) => (
                    <tr key={t.name} style={{ opacity: bulkSel[t.name]?.selected ? 1 : 0.4 }}>
                      <td>
                        <input
                          type="checkbox"
                          style={{ width: 'auto' }}
                          checked={!!bulkSel[t.name]?.selected}
                          onChange={e => setBulkSel(s => ({ ...s, [t.name]: { ...s[t.name], selected: e.target.checked, sort_order: s[t.name]?.sort_order ?? i } }))}
                        />
                      </td>
                      <td>{t.name}</td>
                      <td>{t.distance_miles != null ? `${t.distance_miles} mi` : '—'}</td>
                      <td>{t.point_count.toLocaleString()}</td>
                      <td>
                        <input
                          type="number"
                          value={bulkSel[t.name]?.sort_order ?? i}
                          onChange={e => setBulkSel(s => ({ ...s, [t.name]: { ...s[t.name], sort_order: parseInt(e.target.value) || 0 } }))}
                          style={{ width: 60, padding: '0.15rem 0.3rem', fontSize: '0.82rem' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleBulkImport}
                disabled={bulkImporting}
                style={{ background: '#FC4C02', borderColor: '#FC4C02' }}
              >
                {bulkImporting ? 'Importing…' : `Import ${Object.values(bulkSel).filter(s => s.selected).length} trail(s)`}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setBulkPreview(null); setBulkFile(null); if (bulkFileRef.current) bulkFileRef.current.value = ''; }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Trails Table ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--forest)' }}>
          Trails <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.85rem' }}>({trails.length})</span>
        </h3>
        <button className="btn btn-primary btn-sm" onClick={openAddTrail}>+ Add Trail</button>
      </div>

      {/* Per-trail geo upload message */}
      {geoMsg && (
        <div style={{
          fontSize: '0.85rem', marginBottom: '1rem', padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-sm)', background: 'var(--fern)',
          color: 'var(--text-muted)',
        }}>
          {geoMsg}
        </div>
      )}

      {trails.length === 0 ? (
        <div className="empty-state"><p>No trails yet. Use GPX Import or Add Trail.</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Distance</th>
                <th>Elevation</th>
                <th>Geometry</th>
                <th>Sort</th>
                <th>Status</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trails.map(t => (
                <tr key={t.trail_id} style={{ opacity: t.is_active ? 1 : 0.5 }}>
                  <td><strong>{t.name}</strong></td>
                  <td>{t.distance_miles ? `${t.distance_miles} mi` : '—'}</td>
                  <td>{t.elevation_feet ? `${t.elevation_feet.toLocaleString()} ft` : '—'}</td>
                  <td>
                    {t.has_geometry ? (
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                        borderRadius: 999, background: '#DCFCE7', color: '#16A34A',
                      }}>
                        ✓ Loaded
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                        borderRadius: 999, background: '#FEF3C7', color: '#92400E',
                      }}>
                        No geometry
                      </span>
                    )}
                  </td>
                  <td>{t.sort_order}</td>
                  <td>
                    <span className={`badge ${t.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditTrail(t)}>Edit</button>
                      <label
                        className="btn btn-secondary btn-sm"
                        style={{ cursor: 'pointer', margin: 0 }}
                        title="Upload GPX for this trail"
                      >
                        {geoUploading && geoTrailId === t.trail_id ? 'Uploading…' : 'GPX'}
                        <input
                          type="file"
                          accept=".gpx"
                          ref={geoTrailId === t.trail_id ? geoFileRef : null}
                          style={{ display: 'none' }}
                          onChange={e => handleGeoUpload(t.trail_id, e.target.files[0])}
                        />
                      </label>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTrail(t)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
              <input type="number" step="0.001" value={trailForm.distance_miles} onChange={e => setTF('distance_miles', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Elevation (feet)</label>
              <input type="number" value={trailForm.elevation_feet} onChange={e => setTF('elevation_feet', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Sort Order</label>
            <input type="number" value={trailForm.sort_order} onChange={e => setTF('sort_order', e.target.value)} />
          </div>
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
