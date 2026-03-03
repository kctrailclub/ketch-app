import React, { useEffect, useState, useMemo } from 'react';
import { getHours, getUsers, getHouseholds, queryReports } from '../api/client';

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

export default function Reports() {
  const [tab,          setTab]          = useState('projects');
  const [allHours,     setAllHours]     = useState([]);
  const [users,        setUsers]        = useState([]);
  const [households,   setHouseholds]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [trendYear,    setTrendYear]    = useState(currentYear);
  const [memberYear,   setMemberYear]   = useState(currentYear);
  const [expandedHH,   setExpandedHH]   = useState(new Set());
  const [expandedProj, setExpandedProj] = useState(new Set());
  const [expandedTrend, setExpandedTrend] = useState(new Set());

  // Ask a Question tab state
  const [nlQuestion,  setNlQuestion]  = useState('');
  const [nlResult,    setNlResult]    = useState(null);
  const [nlLoading,   setNlLoading]   = useState(false);
  const [nlError,     setNlError]     = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [hRes, uRes, hhRes] = await Promise.all([
          getHours({ status_filter: 'approved' }),
          getUsers(),
          getHouseholds(),
        ]);
        setAllHours(hRes.data);
        setUsers(uRes.data);
        setHouseholds(hhRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // ── Projects YTD (always current year) ───────────────────────
  const projectData = useMemo(() => {
    const map = {};
    allHours.filter(h => new Date(h.service_date).getFullYear() === currentYear)
      .forEach(h => {
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
  }, [allHours]);

  const projectTotal = projectData.reduce((s, p) => s + p.hours, 0);

  // ── Trends ────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const map = {};
    allHours.filter(h => new Date(h.service_date).getFullYear() === trendYear)
      .forEach(h => {
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
  }, [allHours, trendYear]);

  // ── Members & Households ──────────────────────────────────────
  const memberData = useMemo(() => {
    const filtered = allHours.filter(h => new Date(h.service_date).getFullYear() === memberYear);
    const memberMap = {};
    filtered.forEach(h => { memberMap[h.member_id] = (memberMap[h.member_id] || 0) + h.hours; });

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

    const householdRows = Object.entries(hhMap)
      .map(([id, d]) => ({
        household_id: parseInt(id),
        name: d.name,
        hours: parseFloat(d.hours.toFixed(2)),
        member_count: d.members.length,
        members: d.members.sort((a, b) => b.hours - a.hours),
      }))
      .sort((a, b) => b.hours - a.hours);

    return { individuals, householdRows };
  }, [allHours, users, households, memberYear]);

  const toggleSet = (setter, id) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleHH = (id) => toggleSet(setExpandedHH, id);

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
    { id:'members',  label:'Members & Households' },
    { id:'query',    label:'Ask a Question'        },
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
                        <tr><th>#</th><th>Household</th><th>Members</th><th>Total Hours</th><th></th></tr>
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
      </div>
    </div>
  );
}
