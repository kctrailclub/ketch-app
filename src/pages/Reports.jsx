import React, { useEffect, useState, useRef, useMemo } from 'react';
import { getHours, getUsers, getHouseholds, queryReports, getAuditLogs, getRewardTags, getWaiverSettings, updateWaiverSettings, sendWaiverReminders } from '../api/client';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - i);

const BAR_COLORS = [
  '#2D4A2D','#3D6B3D','#5A8F5A','#4A7C9E','#C17A3A',
  '#6B4F3A','#8B6914','#8FAF8F','#7A8E7A','#4A5E4A',
];

// ── CSV export helper ─────────────────────────────────────────
function exportCSV(filename, columns, rows) {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const body   = rows.map(r =>
    columns.map(c => {
      const v = c.value(r);
      return typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  ).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── CSS horizontal bar chart ──────────────────────────────────
function BarChart({ data, valueKey = 'hours', labelKey = 'name', maxBars = 30 }) {
  const displayed = data.slice(0, maxBars);
  const max = Math.max(...displayed.map(d => d[valueKey]), 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
      {displayed.map((d, i) => (
        <div key={d[labelKey]} style={{ display:'grid', gridTemplateColumns:'200px 1fr 60px', alignItems:'center', gap:'0.75rem' }}>
          <span style={{ fontSize:'0.82rem', color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textAlign:'right' }} title={d[labelKey]}>
            {d[labelKey]}
          </span>
          <div style={{ background:'var(--fern)', borderRadius:4, overflow:'hidden', height:22 }}>
            <div style={{
              height:'100%', width:`${(d[valueKey] / max) * 100}%`,
              background: BAR_COLORS[i % BAR_COLORS.length],
              borderRadius:4, minWidth: d[valueKey] > 0 ? 4 : 0,
              transition:'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize:'0.82rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>
            {Number(d[valueKey]).toFixed(1)}h
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Export button ─────────────────────────────────────────────
function ExportButton({ onClick }) {
  return (
    <button className="btn btn-secondary btn-sm" onClick={onClick} style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
      Export CSV
    </button>
  );
}

// ── Waiver Status Tab ─────────────────────────────────────────
function WaiverTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ waiver_cutoff_date:'', waiver_reminder_subject:'', waiver_reminder_body:'' });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all'); // all | current | expired | missing

  const load = async () => {
    setLoading(true);
    try {
      const res = await getWaiverSettings();
      setData(res.data);
      setSettingsForm({
        waiver_cutoff_date: res.data.waiver_cutoff_date || '',
        waiver_reminder_subject: res.data.waiver_reminder_subject || '',
        waiver_reminder_body: res.data.waiver_reminder_body || '',
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSaveSettings = async () => {
    if (!settingsForm.waiver_cutoff_date) { alert('Please set a cutoff date.'); return; }
    setSettingsSaving(true);
    try {
      await updateWaiverSettings(settingsForm);
      await load();
      setShowSettings(false);
    } catch (err) { alert(err.response?.data?.detail || 'Failed to save settings.'); }
    finally { setSettingsSaving(false); }
  };

  const handleSendReminders = async (userIds) => {
    if (!data?.waiver_reminder_subject || !data?.waiver_reminder_body) {
      alert('Please configure the waiver reminder email template in Settings first.');
      return;
    }
    if (!window.confirm(`Send waiver reminder to ${userIds.length} member${userIds.length !== 1 ? 's' : ''}?`)) return;
    setSending(true);
    try {
      const res = await sendWaiverReminders(userIds);
      alert(res.data.detail + (res.data.errors?.length ? `\nErrors: ${res.data.errors.join(', ')}` : ''));
    } catch (err) { alert(err.response?.data?.detail || 'Failed to send reminders.'); }
    finally { setSending(false); }
  };

  if (loading) return <span className="spinner" />;
  if (!data) return <p>Failed to load waiver data.</p>;

  const allMembers = [...(data.current || []), ...(data.expired || []), ...(data.missing || [])];
  const filtered = filter === 'all' ? allMembers
    : filter === 'current' ? data.current
    : filter === 'expired' ? data.expired
    : data.missing;

  const expiredAndMissing = [...(data.expired || []), ...(data.missing || [])];

  const statusBadge = (status) => {
    if (status === 'current') return <span className="badge badge-approved">Current</span>;
    if (status === 'expired') return <span className="badge badge-pending">Expired</span>;
    return <span className="badge badge-rejected">Missing</span>;
  };

  return (
    <>
      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        <div className="card" style={{ textAlign:'center', padding:'1rem' }}>
          <div style={{ fontSize:'1.8rem', fontWeight:700, color:'var(--forest)' }}>{data.total}</div>
          <div style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>Total Active</div>
        </div>
        <div className="card" style={{ textAlign:'center', padding:'1rem', cursor:'pointer' }} onClick={() => setFilter('current')}>
          <div style={{ fontSize:'1.8rem', fontWeight:700, color:'var(--forest)' }}>{data.current?.length || 0}</div>
          <div style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>Current</div>
        </div>
        <div className="card" style={{ textAlign:'center', padding:'1rem', cursor:'pointer' }} onClick={() => setFilter('expired')}>
          <div style={{ fontSize:'1.8rem', fontWeight:700, color:'var(--earth)' }}>{data.expired?.length || 0}</div>
          <div style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>Expired</div>
        </div>
        <div className="card" style={{ textAlign:'center', padding:'1rem', cursor:'pointer' }} onClick={() => setFilter('missing')}>
          <div style={{ fontSize:'1.8rem', fontWeight:700, color:'var(--danger)' }}>{data.missing?.length || 0}</div>
          <div style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>Missing</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width:'auto' }}>
            <option value="all">All Members</option>
            <option value="current">Current</option>
            <option value="expired">Expired</option>
            <option value="missing">Missing</option>
          </select>
          {data.waiver_cutoff_date && (
            <span style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
              Cutoff: {new Date(data.waiver_cutoff_date + 'T00:00:00').toLocaleDateString()}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          {expiredAndMissing.length > 0 && (
            <button className="btn btn-primary btn-sm" disabled={sending}
              onClick={() => handleSendReminders(expiredAndMissing.map(u => u.user_id))}>
              {sending ? 'Sending…' : `Send Reminders (${expiredAndMissing.length})`}
            </button>
          )}
          <ExportButton onClick={() => exportCSV('waiver-status', [
            { label:'Name', value: r => `${r.firstname} ${r.lastname}` },
            { label:'Email', value: r => r.email },
            { label:'Household', value: r => r.household_name || '' },
            { label:'Waiver Date', value: r => r.waiver || '' },
            { label:'Status', value: r => r.status },
          ], filtered)} />
          <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(!showSettings)}>
            ⚙ Settings
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="card" style={{ marginBottom:'1.5rem', padding:'1.25rem' }}>
          <h4 style={{ marginBottom:'1rem' }}>Waiver Settings</h4>
          <div className="form-group">
            <label>Cutoff Date <span style={{ fontWeight:400, fontSize:'0.82rem', color:'var(--text-muted)' }}>(waivers before this date are considered expired)</span></label>
            <input type="date" value={settingsForm.waiver_cutoff_date}
              onChange={e => setSettingsForm(f => ({ ...f, waiver_cutoff_date: e.target.value }))}
              style={{ maxWidth:220 }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div>
              <div className="form-group">
                <label>Reminder Email Subject</label>
                <input value={settingsForm.waiver_reminder_subject}
                  onChange={e => setSettingsForm(f => ({ ...f, waiver_reminder_subject: e.target.value }))}
                  placeholder="e.g. Volunteer Waiver Reminder" />
              </div>
              <div className="form-group">
                <label>Reminder Email Body</label>
                <textarea rows={5} value={settingsForm.waiver_reminder_body}
                  onChange={e => setSettingsForm(f => ({ ...f, waiver_reminder_body: e.target.value }))}
                  placeholder="Use {{firstname}}, {{lastname}}, {{email}} as placeholders" />
              </div>
            </div>
            <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', paddingTop:'1.5rem' }}>
              <strong>Template placeholders:</strong>
              <ul style={{ paddingLeft:'1.2rem', marginTop:'0.5rem' }}>
                <li><code>{'{{firstname}}'}</code> — Member first name</li>
                <li><code>{'{{lastname}}'}</code> — Member last name</li>
                <li><code>{'{{email}}'}</code> — Member email</li>
              </ul>
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={settingsSaving} onClick={handleSaveSettings}>
              {settingsSaving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Household</th>
                <th>Waiver Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.user_id}>
                  <td><strong>{u.firstname} {u.lastname}</strong></td>
                  <td>{u.email.includes('placeholder.invalid') ? <em style={{color:'var(--text-muted)'}}>no email</em> : u.email}</td>
                  <td>{u.household_name || <em style={{color:'var(--text-muted)'}}>—</em>}</td>
                  <td>{u.waiver ? new Date(u.waiver + 'T00:00:00').toLocaleDateString() : '—'}</td>
                  <td>{statusBadge(u.status)}</td>
                  <td>
                    {u.status !== 'current' && !u.email.includes('placeholder.invalid') && (
                      <button className="btn btn-secondary btn-sm" disabled={sending}
                        onClick={() => handleSendReminders([u.user_id])}>
                        Send Reminder
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>No members in this category.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function Reports() {
  const [tab,          setTab]          = useState('projects');
  const [hoursCache,   setHoursCache]   = useState({});    // { year: hours[] }
  const [users,        setUsers]        = useState([]);
  const [households,   setHouseholds]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingYear,  setLoadingYear]  = useState(null);  // year currently being fetched
  const [trendYear,    setTrendYear]    = useState(currentYear);
  const [memberYear,   setMemberYear]   = useState(currentYear);
  const [expandedHH,   setExpandedHH]   = useState(new Set());
  const [expandedProj, setExpandedProj] = useState(new Set());
  const [expandedTrend, setExpandedTrend] = useState(new Set());
  const [youthYear,    setYouthYear]    = useState(currentYear);
  const [expandedYouth, setExpandedYouth] = useState(new Set());
  const [tagsCache,    setTagsCache]    = useState({});  // { year: [{household_id, tag_number, ...}] }

  // Ask a Question tab state
  const [nlQuestion,  setNlQuestion]  = useState('');
  const [nlResult,    setNlResult]    = useState(null);
  const [nlLoading,   setNlLoading]   = useState(false);
  const [nlError,     setNlError]     = useState('');

  // Activity Log tab state
  const [auditLogs,    setAuditLogs]    = useState([]);
  const [auditPage,    setAuditPage]    = useState(1);
  const [auditPages,   setAuditPages]   = useState(1);
  const [auditTotal,   setAuditTotal]   = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({ action: '', entity_type: '', user_id: '', date_from: '', date_to: '' });

  // Track which years have been fetched (ref avoids stale closures)
  const fetchedYears = useRef(new Set());

  const fetchYear = async (year) => {
    if (fetchedYears.current.has(year)) return;
    fetchedYears.current.add(year);
    setLoadingYear(year);
    try {
      const res = await getHours({ status_filter: 'approved', year });
      setHoursCache(prev => ({ ...prev, [year]: res.data }));
    } catch (e) {
      fetchedYears.current.delete(year); // allow retry on error
      console.error(e);
    } finally {
      setLoadingYear(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [hRes, uRes, hhRes] = await Promise.all([
          getHours({ status_filter: 'approved', year: currentYear }),
          getUsers(),
          getHouseholds(),
        ]);
        setHoursCache({ [currentYear]: hRes.data });
        fetchedYears.current.add(currentYear);
        setUsers(uRes.data);
        setHouseholds(hhRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Fetch year data on demand when user changes year selectors
  useEffect(() => { fetchYear(trendYear); }, [trendYear]);
  useEffect(() => { fetchYear(youthYear); }, [youthYear]);
  useEffect(() => { fetchYear(memberYear); }, [memberYear]);

  // Fetch reward tags for memberYear+1 (hours in 2025 earn a 2026 tag)
  const tagYear = memberYear + 1;
  useEffect(() => {
    if (tagsCache[tagYear]) return;
    getRewardTags(tagYear).then(res => {
      setTagsCache(prev => ({ ...prev, [tagYear]: res.data }));
    }).catch(() => {});
  }, [tagYear]);

  // ── Helper: apply member credit % ───────────────────────────
  const credited = (h) => h.hours * ((h.member_credit_pct ?? 100) / 100);

  // ── Projects YTD (always current year) ───────────────────────
  const projectData = useMemo(() => {
    const hours = hoursCache[currentYear] || [];
    const map = {};
    hours.forEach(h => {
        if (!map[h.project_name]) map[h.project_name] = { hours: 0, members: {} };
        map[h.project_name].hours += h.hours;
        const mName = h.member_name || `Member #${h.member_id}`;
        map[h.project_name].members[mName] = (map[h.project_name].members[mName] || 0) + h.hours;
      });
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        hours: parseFloat(d.hours.toFixed(2)),
        members: Object.entries(d.members)
          .map(([mName, mHours]) => ({ name: mName, hours: parseFloat(mHours.toFixed(2)) }))
          .sort((a, b) => b.hours - a.hours),
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [hoursCache]);

  const projectTotal = projectData.reduce((s, p) => s + p.hours, 0);

  // ── Trends ────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const hours = hoursCache[trendYear] || [];
    const map = {};
    hours.forEach(h => {
        if (!map[h.project_name]) map[h.project_name] = { hours: 0, members: {} };
        map[h.project_name].hours += h.hours;
        const mName = h.member_name || `Member #${h.member_id}`;
        map[h.project_name].members[mName] = (map[h.project_name].members[mName] || 0) + h.hours;
      });
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        hours: parseFloat(d.hours.toFixed(2)),
        members: Object.entries(d.members)
          .map(([mName, mHours]) => ({ name: mName, hours: parseFloat(mHours.toFixed(2)) }))
          .sort((a, b) => b.hours - a.hours),
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [hoursCache, trendYear]);

  // ── Youth Projects ───────────────────────────────────────────
  const youthUserIds = useMemo(() => {
    const ids = new Set();
    users.forEach(u => { if (u.youth) ids.add(u.user_id); });
    return ids;
  }, [users]);

  const youthData = useMemo(() => {
    const hours = (hoursCache[youthYear] || []).filter(h => youthUserIds.has(h.member_id));
    const map = {};
    hours.forEach(h => {
      if (!map[h.project_name]) map[h.project_name] = { hours: 0, members: {} };
      map[h.project_name].hours += h.hours;
      const mName = h.member_name || `Member #${h.member_id}`;
      map[h.project_name].members[mName] = (map[h.project_name].members[mName] || 0) + h.hours;
    });
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        hours: parseFloat(d.hours.toFixed(2)),
        members: Object.entries(d.members)
          .map(([mName, mHours]) => ({ name: mName, hours: parseFloat(mHours.toFixed(2)) }))
          .sort((a, b) => b.hours - a.hours),
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [hoursCache, youthYear, youthUserIds]);

  // ── Members & Households ──────────────────────────────────────
  const memberData = useMemo(() => {
    const filtered = hoursCache[memberYear] || [];
    const memberMap = {};
    filtered.forEach(h => { memberMap[h.member_id] = (memberMap[h.member_id] || 0) + credited(h); });

    const individuals = Object.entries(memberMap).map(([id, hours]) => {
      const u  = users.find(u => u.user_id === parseInt(id));
      const hh = u ? households.find(h => h.household_id === u.household_id) : null;
      return {
        user_id:        parseInt(id),
        name:           u ? `${u.firstname} ${u.lastname}` : `Member #${id}`,
        household_name: hh?.name || '—',
        household_id:   u?.household_id || null,
        hours:          parseFloat(hours.toFixed(2)),
      };
    }).sort((a, b) => b.hours - a.hours);

    const hhMap = {};
    individuals.forEach(ind => {
      if (!ind.household_id) return;
      if (!hhMap[ind.household_id]) hhMap[ind.household_id] = { name: ind.household_name, hours: 0, members: [] };
      hhMap[ind.household_id].hours += ind.hours;
      hhMap[ind.household_id].members.push(ind);
    });

    // Build tag lookup — hours in memberYear earn a memberYear+1 tag
    const yearTags = tagsCache[memberYear + 1] || [];
    const tagLookup = {};
    yearTags.forEach(t => { tagLookup[t.household_id] = t.tag_number; });

    const householdRows = Object.entries(hhMap)
      .map(([id, d]) => ({
        household_id: parseInt(id),
        name: d.name,
        hours: parseFloat(d.hours.toFixed(2)),
        member_count: d.members.length,
        members: d.members.sort((a, b) => b.hours - a.hours),
        tag_number: tagLookup[parseInt(id)] || null,
      }))
      .sort((a, b) => b.hours - a.hours);

    return { individuals, householdRows };
  }, [hoursCache, users, households, memberYear, tagsCache]);

  const toggleSet = (setter, id) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleHH = (id) => toggleSet(setExpandedHH, id);

  const fetchAuditLogs = async (page, filters) => {
    setAuditLoading(true);
    try {
      const params = { page, per_page: 50 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await getAuditLogs(params);
      setAuditLogs(res.data.data);
      setAuditPage(res.data.page);
      setAuditPages(res.data.pages);
      setAuditTotal(res.data.total);
    } catch (err) { console.error(err); }
    finally { setAuditLoading(false); }
  };

  useEffect(() => {
    if (tab === 'activity') fetchAuditLogs(1, auditFilters);
  }, [tab, auditFilters]);

  const handleNlQuery = async () => {
    if (!nlQuestion.trim()) return;
    setNlLoading(true);
    setNlError('');
    setNlResult(null);
    try {
      const res = await queryReports(nlQuestion.trim());
      setNlResult(res.data);
    } catch (err) {
      setNlError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setNlLoading(false);
    }
  };

  if (loading) return <div className="loading-page"><span className="spinner" /></div>;

  const tabs = [
    { id:'projects', label:'Projects YTD'        },
    { id:'trends',   label:'Project Trends'       },
    { id:'youth',    label:'Youth Projects'        },
    { id:'members',  label:'Members & Households' },
    { id:'query',    label:'Ask a Question'        },
    { id:'waiver',   label:'Waiver Status'         },
    { id:'activity', label:'Activity Log'          },
  ];

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Reports</h1>
            <p>Volunteer hours analytics</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'0.25rem', marginBottom:'1.5rem', borderBottom:'1px solid var(--border)' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="btn btn-ghost" style={{
              borderRadius:'var(--radius-sm) var(--radius-sm) 0 0',
              borderBottom: tab === t.id ? '2px solid var(--forest)' : '2px solid transparent',
              color: tab === t.id ? 'var(--forest)' : 'var(--text-muted)',
              fontWeight: tab === t.id ? 600 : 400,
              paddingBottom:'0.75rem',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Projects YTD ─────────────────────────────────────── */}
        {tab === 'projects' && (
          <>
            <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
              <div className="stat-card">
                <div className="stat-value">{projectTotal.toFixed(1)}</div>
                <div className="stat-label">Total Hours {currentYear}</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{projectData.length}</div>
                <div className="stat-label">Active Projects</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom:'1.5rem' }}>
              <div className="card-header"><h3>Hours by Project — {currentYear}</h3></div>
              {projectData.length === 0
                ? <div className="empty-state"><p>No approved hours for {currentYear} yet.</p></div>
                : <BarChart data={projectData} />}
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Project Breakdown</h3>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>click row to expand</span>
                  <ExportButton onClick={() => exportCSV(
                  `projects-ytd-${currentYear}.csv`,
                  [
                    { label:'Rank',    value: (_, i) => i + 1 },
                    { label:'Project', value: r => r.name },
                    { label:'Hours',   value: r => r.hours },
                    { label:'Pct',     value: r => ((r.hours/projectTotal)*100).toFixed(1) + '%' },
                  ],
                  projectData.map((r, i) => ({ ...r, _i: i }))
                )} />
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>#</th><th>Project</th><th>Hours</th><th>% of Total</th><th></th></tr></thead>
                  <tbody>
                    {projectData.map((p, i) => (
                      <React.Fragment key={p.name}>
                        <tr
                          onClick={() => toggleSet(setExpandedProj, p.name)}
                          style={{ cursor:'pointer' }}
                        >
                          <td style={{ color:'var(--text-muted)', width:40 }}>{i + 1}</td>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.hours.toFixed(1)}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                              <div style={{ height:6, borderRadius:3, background:'var(--forest-light)', width:`${Math.round((p.hours/projectTotal)*100)}%`, minWidth:4, maxWidth:120 }} />
                              <span>{((p.hours/projectTotal)*100).toFixed(1)}%</span>
                            </div>
                          </td>
                          <td style={{ width:32, textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>
                            {expandedProj.has(p.name) ? '▲' : '▼'}
                          </td>
                        </tr>
                        {expandedProj.has(p.name) && p.members.map(m => (
                          <tr key={m.name} style={{ background:'var(--fern)' }}>
                            <td />
                            <td style={{ paddingLeft:'2rem', fontSize:'0.88rem', color:'var(--text-secondary)' }}>
                              ↳ {m.name}
                            </td>
                            <td style={{ fontSize:'0.88rem', color:'var(--text-secondary)' }}>{m.hours.toFixed(1)}</td>
                            <td />
                            <td />
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Trends ───────────────────────────────────────────── */}
        {tab === 'trends' && (
          <>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1.5rem' }}>
              <select value={trendYear} onChange={e => setTrendYear(Number(e.target.value))} style={{ width:'auto' }}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {loadingYear === trendYear ? (
              <div className="card"><span className="spinner" /></div>
            ) : (<>
            <div className="card" style={{ marginBottom:'1.5rem' }}>
              <div className="card-header">
                <h3>Project Hours — {trendYear}</h3>
                <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
                  {trendData.reduce((s, p) => s + p.hours, 0).toFixed(1)} total hours
                </span>
              </div>
              {trendData.length === 0
                ? <div className="empty-state"><p>No approved hours for {trendYear}.</p></div>
                : <BarChart data={trendData} />}
            </div>

            <div className="card">
              <div className="card-header">
                <h3>All Projects — {trendYear}</h3>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>click row to expand</span>
                  <ExportButton onClick={() => exportCSV(
                    `project-trends-${trendYear}.csv`,
                    [
                      { label:'Project', value: r => r.name },
                      { label:'Hours',   value: r => r.hours },
                    ],
                    trendData
                  )} />
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Project</th><th>Hours</th><th></th></tr></thead>
                  <tbody>
                    {trendData.map(p => (
                      <React.Fragment key={p.name}>
                        <tr
                          onClick={() => toggleSet(setExpandedTrend, p.name)}
                          style={{ cursor:'pointer' }}
                        >
                          <td><strong>{p.name}</strong></td>
                          <td>{p.hours.toFixed(1)}</td>
                          <td style={{ width:32, textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>
                            {expandedTrend.has(p.name) ? '▲' : '▼'}
                          </td>
                        </tr>
                        {expandedTrend.has(p.name) && p.members.map(m => (
                          <tr key={m.name} style={{ background:'var(--fern)' }}>
                            <td style={{ paddingLeft:'2rem', fontSize:'0.88rem', color:'var(--text-secondary)' }}>
                              ↳ {m.name}
                            </td>
                            <td style={{ fontSize:'0.88rem', color:'var(--text-secondary)' }}>{m.hours.toFixed(1)}</td>
                            <td />
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>)}
          </>
        )}

        {/* ── Youth Projects ──────────────────────────────────── */}
        {tab === 'youth' && (
          <>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1.5rem' }}>
              <select value={youthYear} onChange={e => setYouthYear(Number(e.target.value))} style={{ width:'auto' }}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {loadingYear === youthYear ? (
              <div className="card"><span className="spinner" /></div>
            ) : (<>
            <div className="card" style={{ marginBottom:'1.5rem' }}>
              <div className="card-header">
                <h3>Youth Project Hours — {youthYear}</h3>
                <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
                  {youthData.reduce((s, p) => s + p.hours, 0).toFixed(1)} total hours · {youthUserIds.size} youth member{youthUserIds.size !== 1 ? 's' : ''}
                </span>
              </div>
              {youthData.length === 0
                ? <div className="empty-state"><p>No approved hours from youth members for {youthYear}.</p></div>
                : <BarChart data={youthData} />}
            </div>

            <div className="card">
              <div className="card-header">
                <h3>All Youth Projects — {youthYear}</h3>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>click row to expand</span>
                  <ExportButton onClick={() => exportCSV(
                    `youth-projects-${youthYear}.csv`,
                    [
                      { label:'Project', value: r => r.name },
                      { label:'Hours',   value: r => r.hours },
                    ],
                    youthData
                  )} />
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Project</th><th>Hours</th><th></th></tr></thead>
                  <tbody>
                    {youthData.map(p => (
                      <React.Fragment key={p.name}>
                        <tr
                          onClick={() => toggleSet(setExpandedYouth, p.name)}
                          style={{ cursor:'pointer' }}
                        >
                          <td><strong>{p.name}</strong></td>
                          <td>{p.hours.toFixed(1)}</td>
                          <td style={{ width:32, textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>
                            {expandedYouth.has(p.name) ? '▲' : '▼'}
                          </td>
                        </tr>
                        {expandedYouth.has(p.name) && p.members.map(m => (
                          <tr key={m.name} style={{ background:'var(--fern)' }}>
                            <td style={{ paddingLeft:'2rem', fontSize:'0.88rem', color:'var(--text-secondary)' }}>
                              ↳ {m.name}
                            </td>
                            <td style={{ fontSize:'0.88rem', color:'var(--text-secondary)' }}>{m.hours.toFixed(1)}</td>
                            <td />
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>)}
          </>
        )}

        {/* ── Members & Households ─────────────────────────────── */}
        {tab === 'members' && (
          <>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1.5rem' }}>
              <select value={memberYear} onChange={e => setMemberYear(Number(e.target.value))} style={{ width:'auto' }}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {loadingYear === memberYear ? (
              <div className="card"><span className="spinner" /></div>
            ) : (<>
            {/* Households with drill-down */}
            <div className="card" style={{ marginBottom:'1.5rem' }}>
              <div className="card-header">
                <h3>Hours by Household — {memberYear}</h3>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
                    {memberData.householdRows.length} households · click to expand
                  </span>
                  <ExportButton onClick={() => exportCSV(
                    `households-${memberYear}.csv`,
                    [
                      { label:'Rank',            value: (r, i) => i + 1 },
                      { label:'Household',       value: r => r.name },
                      { label:'Active Members',  value: r => r.member_count },
                      { label:'Total Hours',     value: r => r.hours },
                      { label:`${memberYear + 1} Tag #`, value: r => r.tag_number || '' },
                    ],
                    memberData.householdRows
                  )} />
                </div>
              </div>
              {memberData.householdRows.length === 0
                ? <div className="empty-state"><p>No household data for {memberYear}.</p></div>
                : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr><th>#</th><th>Household</th><th>Members</th><th>Total Hours</th><th>{memberYear + 1} Tag #</th><th></th></tr>
                      </thead>
                      <tbody>
                        {memberData.householdRows.map((hh, i) => (
                          <>
                            <tr
                              key={hh.household_id}
                              onClick={() => toggleHH(hh.household_id)}
                              style={{ cursor:'pointer' }}
                            >
                              <td style={{ color:'var(--text-muted)', width:40 }}>{i + 1}</td>
                              <td><strong>{hh.name}</strong></td>
                              <td>{hh.member_count}</td>
                              <td><strong>{hh.hours.toFixed(1)}</strong></td>
                              <td>{hh.tag_number || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                              <td style={{ width:32, textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>
                                {expandedHH.has(hh.household_id) ? '▲' : '▼'}
                              </td>
                            </tr>
                            {expandedHH.has(hh.household_id) && hh.members.map(m => (
                              <tr key={m.user_id} style={{ background:'var(--fern)' }}>
                                <td />
                                <td style={{ paddingLeft:'2rem', fontSize:'0.88rem', color:'var(--text-secondary)' }}>
                                  ↳ {m.name}
                                </td>
                                <td />
                                <td style={{ fontSize:'0.88rem', color:'var(--text-secondary)' }}>{m.hours.toFixed(1)}</td>
                                <td />
                                <td />
                              </tr>
                            ))}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>

            {/* Individual members */}
            <div className="card">
              <div className="card-header">
                <h3>Hours by Member — {memberYear}</h3>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
                    {memberData.individuals.length} members with hours
                  </span>
                  <ExportButton onClick={() => exportCSV(
                    `members-${memberYear}.csv`,
                    [
                      { label:'Rank',      value: (r, i) => i + 1 },
                      { label:'Member',    value: r => r.name },
                      { label:'Household', value: r => r.household_name },
                      { label:'Hours',     value: r => r.hours },
                    ],
                    memberData.individuals
                  )} />
                </div>
              </div>
              {memberData.individuals.length === 0
                ? <div className="empty-state"><p>No member data for {memberYear}.</p></div>
                : (
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>#</th><th>Member</th><th>Household</th><th>Hours</th></tr></thead>
                      <tbody>
                        {memberData.individuals.map((m, i) => (
                          <tr key={m.user_id}>
                            <td style={{ color:'var(--text-muted)', width:40 }}>{i + 1}</td>
                            <td><strong>{m.name}</strong></td>
                            <td>{m.household_name}</td>
                            <td><strong>{m.hours.toFixed(1)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          </>)}
          </>
        )}

        {/* ── Ask a Question ────────────────────────────────── */}
        {tab === 'query' && (
          <>
            <div className="card" style={{ marginBottom:'1.5rem' }}>
              <div className="card-header">
                <h3>Ask a Question</h3>
              </div>
              <p style={{ fontSize:'0.9rem', color:'var(--text-muted)', marginBottom:'1rem' }}>
                Ask a question in plain English about volunteer hours, members, projects, or households.
                The system will translate your question into a database query and return the results.
              </p>
              <div style={{ display:'flex', gap:'0.75rem', alignItems:'flex-start' }}>
                <input
                  type="text"
                  value={nlQuestion}
                  onChange={e => setNlQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !nlLoading) handleNlQuery(); }}
                  placeholder='e.g. "Who has the most approved hours this year?"'
                  style={{ flex:1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleNlQuery}
                  disabled={nlLoading || !nlQuestion.trim()}
                >
                  {nlLoading ? 'Thinking...' : 'Ask'}
                </button>
              </div>

              {nlError && (
                <div className="alert alert-error" style={{ marginTop:'1rem' }}>{nlError}</div>
              )}
            </div>

            {nlResult && (
              <>
                {/* Generated SQL for transparency */}
                <div className="card" style={{ marginBottom:'1rem' }}>
                  <div className="card-header"><h3>Generated SQL</h3></div>
                  <pre style={{
                    background:'var(--fern)', padding:'1rem', borderRadius:'var(--radius-sm)',
                    fontSize:'0.82rem', overflowX:'auto', color:'var(--text-secondary)',
                    fontFamily:'monospace', whiteSpace:'pre-wrap', margin:0,
                  }}>
                    {nlResult.sql}
                  </pre>
                </div>

                {/* Results table */}
                <div className="card">
                  <div className="card-header">
                    <h3>Results</h3>
                    <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
                      {nlResult.row_count} row{nlResult.row_count !== 1 ? 's' : ''} returned
                    </span>
                  </div>
                  {nlResult.rows.length === 0 ? (
                    <div className="empty-state"><p>No results found.</p></div>
                  ) : (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            {nlResult.columns.map(col => (
                              <th key={col}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {nlResult.rows.map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) => (
                                <td key={j}>{cell !== null ? String(cell) : '\u2014'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
        {/* ── Waiver Status ───────────────────────────────────── */}
        {tab === 'waiver' && <WaiverTab />}
        {/* ── Activity Log ────────────────────────────────────── */}
        {tab === 'activity' && (
          <>
            {/* Filters */}
            <div className="card" style={{ marginBottom:'1.5rem' }}>
              <div className="card-header"><h3>Filters</h3></div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'0.75rem' }}>
                <div>
                  <label style={{ fontSize:'0.82rem', color:'var(--text-muted)', display:'block', marginBottom:'0.25rem' }}>Action</label>
                  <select value={auditFilters.action} onChange={e => setAuditFilters(f => ({ ...f, action: e.target.value }))}>
                    <option value="">All</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                    <option value="approve_all">Approve All</option>
                    <option value="login">Login</option>
                    <option value="set_password">Set Password</option>
                    <option value="change_password">Change Password</option>
                    <option value="resend_invite">Resend Invite</option>
                    <option value="join_request">Join Request</option>
                    <option value="remove_member">Remove Member</option>
                    <option value="send_emails">Send Emails</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:'0.82rem', color:'var(--text-muted)', display:'block', marginBottom:'0.25rem' }}>Entity Type</label>
                  <select value={auditFilters.entity_type} onChange={e => setAuditFilters(f => ({ ...f, entity_type: e.target.value }))}>
                    <option value="">All</option>
                    <option value="hour">Hours</option>
                    <option value="user">Users</option>
                    <option value="household">Households</option>
                    <option value="project">Projects</option>
                    <option value="registration">Registrations</option>
                    <option value="settings">Settings</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:'0.82rem', color:'var(--text-muted)', display:'block', marginBottom:'0.25rem' }}>User</label>
                  <select value={auditFilters.user_id} onChange={e => setAuditFilters(f => ({ ...f, user_id: e.target.value }))}>
                    <option value="">All</option>
                    {users.map(u => <option key={u.user_id} value={u.user_id}>{u.firstname} {u.lastname}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:'0.82rem', color:'var(--text-muted)', display:'block', marginBottom:'0.25rem' }}>From</label>
                  <input type="date" value={auditFilters.date_from} onChange={e => setAuditFilters(f => ({ ...f, date_from: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize:'0.82rem', color:'var(--text-muted)', display:'block', marginBottom:'0.25rem' }}>To</label>
                  <input type="date" value={auditFilters.date_to} onChange={e => setAuditFilters(f => ({ ...f, date_to: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="card">
              <div className="card-header">
                <h3>Activity Log</h3>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
                    {auditTotal} entries · Page {auditPage} of {auditPages}
                  </span>
                  <ExportButton onClick={() => exportCSV(
                    'activity-log.csv',
                    [
                      { label:'Date',        value: r => new Date(r.created).toLocaleString() },
                      { label:'User',        value: r => r.user_name },
                      { label:'Action',      value: r => r.action },
                      { label:'Type',        value: r => r.entity_type },
                      { label:'Description', value: r => r.summary },
                    ],
                    auditLogs
                  )} />
                </div>
              </div>
              {auditLoading ? (
                <div className="loading-page"><span className="spinner" /></div>
              ) : auditLogs.length === 0 ? (
                <div className="empty-state"><p>No activity logged yet.</p></div>
              ) : (
                <>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr><th>Date</th><th>User</th><th>Action</th><th>Type</th><th>Description</th></tr>
                      </thead>
                      <tbody>
                        {auditLogs.map(log => (
                          <tr key={log.audit_log_id}>
                            <td style={{ whiteSpace:'nowrap', fontSize:'0.85rem' }}>
                              {new Date(log.created).toLocaleDateString()}{' '}
                              <span style={{ color:'var(--text-muted)' }}>{new Date(log.created).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                            </td>
                            <td>{log.user_name}</td>
                            <td>
                              <span style={{
                                display:'inline-block', padding:'0.15rem 0.5rem', borderRadius:'999px',
                                fontSize:'0.75rem', fontWeight:600, textTransform:'capitalize',
                                ...(['create','approve','approve_all'].includes(log.action) ? { background:'#d4edda', color:'#155724' } :
                                  ['reject','delete','remove_member'].includes(log.action) ? { background:'#f8d7da', color:'#721c24' } :
                                  ['login','set_password','change_password'].includes(log.action) ? { background:'#cce5ff', color:'#004085' } :
                                  { background:'#e2e3e5', color:'#383d41' }),
                              }}>
                                {log.action.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td style={{ textTransform:'capitalize' }}>{log.entity_type}</td>
                            <td style={{ fontSize:'0.88rem', color:'var(--text-secondary)' }}>{log.summary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {auditPages > 1 && (
                    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'1rem', padding:'1rem' }}>
                      <button className="btn btn-secondary btn-sm" disabled={auditPage <= 1} onClick={() => fetchAuditLogs(auditPage - 1, auditFilters)}>
                        Previous
                      </button>
                      <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
                        Page {auditPage} of {auditPages}
                      </span>
                      <button className="btn btn-secondary btn-sm" disabled={auditPage >= auditPages} onClick={() => fetchAuditLogs(auditPage + 1, auditFilters)}>
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
