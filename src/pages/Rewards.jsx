import { useEffect, useState } from 'react';
import { getRewardSettings, updateRewardSettings, sendRewardEmails, saveRewardTag, autoAssignTags } from '../api/client';

export default function Rewards() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [sending,    setSending]    = useState(null); // 'reward' | 'nudge' | null
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');
  const [form,       setForm]       = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tagInputs, setTagInputs] = useState({});  // { household_id: value }
  const [savingTag, setSavingTag] = useState(null); // household_id being saved
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [autoAssignForm, setAutoAssignForm] = useState({ start_tag: '', end_tag: '' });
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const load = async (yr) => {
    const loadYear = yr ?? selectedYear;
    setLoading(true);
    try {
      const res = await getRewardSettings(loadYear);
      setData(res.data);
      // Initialize tag inputs from existing data
      const tags = {};
      (res.data.qualified || []).forEach(hh => {
        if (hh.tag) tags[hh.household_id] = hh.tag.tag_number;
      });
      setTagInputs(prev => ({ ...tags, ...prev }));
      setForm({
        reward_threshold:     res.data.threshold,
        reward_email_subject: res.data.reward_email_subject,
        reward_email_body:    res.data.reward_email_body,
        nudge_email_subject:  res.data.nudge_email_subject,
        nudge_email_body:     res.data.nudge_email_body,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(selectedYear); }, [selectedYear]);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await updateRewardSettings(form);
      await load();
      setSettingsOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save settings.');
    } finally { setSaving(false); }
  };

  const handleSend = async (emailType, householdIds) => {
    setSending(emailType); setResult(null); setError('');
    try {
      const res = await sendRewardEmails(emailType, householdIds, selectedYear);
      setResult(res.data);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send emails.');
    } finally { setSending(null); }
  };

  const handleSaveTag = async (householdId) => {
    const tagNum = parseInt(tagInputs[householdId]);
    if (!tagNum || tagNum <= 0) return;
    setSavingTag(householdId);
    try {
      await saveRewardTag(householdId, data.year + 1, tagNum);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save tag.');
    } finally { setSavingTag(null); }
  };

  const handleAutoAssign = async () => {
    const start = parseInt(autoAssignForm.start_tag);
    const end = parseInt(autoAssignForm.end_tag);
    if (!start || !end || start > end || start < 1) {
      setError('Please enter a valid tag range (start ≤ end, both positive).');
      return;
    }
    if (!window.confirm(`This will assign tags #${start}–#${end} to eligible households. Existing tags for this year will be overwritten. Continue?`)) return;
    setAutoAssigning(true); setError('');
    try {
      const res = await autoAssignTags(start, end, selectedYear);
      setAutoAssignResult(res.data);
      setAutoAssignOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Auto-assign failed.');
    } finally { setAutoAssigning(false); }
  };

  if (loading) return <div className="loading-page"><span className="spinner" /></div>;
  if (!data)   return <div className="page"><div className="container"><div className="alert alert-error">Failed to load rewards data. Check that the API is running and the settings table exists.</div></div></div>;

  const { threshold, qualified, close, year, tag_info } = data;
  const tagYear = year + 1;  // hours earned in {year} → tag valid for {year+1}

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Volunteer Rewards</h1>
            <p>{year} hours → {tagYear} tags</p>
          </div>
          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
            <select
              value={selectedYear}
              onChange={e => { setSelectedYear(parseInt(e.target.value)); setTagInputs({}); }}
              style={{ minWidth:90 }}
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={() => { setAutoAssignOpen(true); setAutoAssignResult(null); }}>
              Auto-Assign Tags
            </button>
            <button className="btn btn-secondary" onClick={() => setSettingsOpen(o => !o)}>
              ⚙ Settings
            </button>
          </div>
        </div>

        {/* Result banner */}
        {result && (
          <div className={`alert ${result.errors?.length ? 'alert-info' : 'alert-success'}`} style={{ marginBottom:'1.5rem' }}>
            ✓ {result.detail}
            {result.errors?.length > 0 && (
              <ul style={{ marginTop:'0.5rem', paddingLeft:'1.25rem' }}>
                {result.errors.map((e, i) => <li key={i} style={{ fontSize:'0.85rem' }}>{e}</li>)}
              </ul>
            )}
            <button className="btn btn-ghost btn-sm" style={{ marginLeft:'1rem' }} onClick={() => setResult(null)}>Dismiss</button>
          </div>
        )}
        {error && <div className="alert alert-error" style={{ marginBottom:'1.5rem' }}>{error}</div>}

        {/* Auto-assign result */}
        {autoAssignResult && (
          <div className="alert alert-success" style={{ marginBottom:'1.5rem' }}>
            ✓ {autoAssignResult.detail}
            <span style={{ marginLeft:'1rem', fontSize:'0.85rem' }}>
              {autoAssignResult.tags_remaining > 0 && `${autoAssignResult.tags_remaining} tags remaining for manual assignment. `}
              {autoAssignResult.unassigned_households > 0 && `${autoAssignResult.unassigned_households} eligible household(s) did not receive a tag (not enough tags).`}
            </span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft:'1rem' }} onClick={() => setAutoAssignResult(null)}>Dismiss</button>
          </div>
        )}

        {/* Tag inventory */}
        {tag_info && (
          <div style={{ background:'var(--fern)', borderRadius:'var(--radius)', padding:'0.75rem 1rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'1.5rem', fontSize:'0.88rem' }}>
            <span><strong>Tag Range:</strong> #{tag_info.start}–#{tag_info.end}</span>
            <span><strong>Total:</strong> {tag_info.total}</span>
            <span><strong>Assigned:</strong> {tag_info.assigned}</span>
            <span style={{ color: tag_info.remaining > 0 ? 'var(--forest)' : 'var(--color-danger)', fontWeight:600 }}>
              <strong>Remaining:</strong> {tag_info.remaining}
            </span>
          </div>
        )}

        {/* Settings panel */}
        {settingsOpen && form && (
          <div className="card" style={{ marginBottom:'1.5rem', borderLeft:'3px solid var(--forest)' }}>
            <div className="card-header">
              <h3>Email Settings</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSettingsOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label>Hour Threshold</label>
                <input
                  type="number" min="1" style={{ maxWidth:120 }}
                  value={form.reward_threshold}
                  onChange={e => setF('reward_threshold', parseInt(e.target.value))}
                />
                <span style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginTop:'0.25rem' }}>
                  Households must reach this many hours to qualify for a reward
                </span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginTop:'0.5rem' }}>
                <div>
                  <p style={{ fontWeight:600, fontSize:'0.9rem', color:'var(--forest)', marginBottom:'0.75rem' }}>
                    🎉 Reward Email (≥ {form.reward_threshold} hours)
                  </p>
                  <div className="form-group">
                    <label>Subject</label>
                    <input value={form.reward_email_subject} onChange={e => setF('reward_email_subject', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Message</label>
                    <textarea rows={6} value={form.reward_email_body} onChange={e => setF('reward_email_body', e.target.value)} required />
                  </div>
                </div>
                <div>
                  <p style={{ fontWeight:600, fontSize:'0.9rem', color:'var(--earth)', marginBottom:'0.75rem' }}>
                    ⏳ Nudge Email ({Math.round(form.reward_threshold / 2)}–{form.reward_threshold - 1} hours)
                  </p>
                  <div className="form-group">
                    <label>Subject</label>
                    <input value={form.nudge_email_subject} onChange={e => setF('nudge_email_subject', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Message</label>
                    <textarea rows={6} value={form.nudge_email_body} onChange={e => setF('nudge_email_body', e.target.value)} required />
                  </div>
                </div>
              </div>

              <div style={{ background:'var(--fern)', borderRadius:'var(--radius-sm)', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:'var(--text-secondary)' }}>
                <strong>Available placeholders:</strong>{' '}
                <code>{'{{firstname}}'}</code> <code>{'{{lastname}}'}</code>{' '}
                <code>{'{{hours}}'}</code> <code>{'{{remaining}}'}</code>{' '}
                <code>{'{{threshold}}'}</code> <code>{'{{household}}'}</code>
              </div>

              <div style={{ display:'flex', gap:'0.75rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setSettingsOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Qualified households */}
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <div className="card-header">
            <div>
              <h3>🎉 Reward Eligible — {qualified.length} household{qualified.length !== 1 ? 's' : ''}</h3>
              <p style={{ fontSize:'0.85rem', marginTop:'0.2rem' }}>
                Reached {threshold}+ hours in {year} — earning {tagYear} tags
              </p>
            </div>
            {qualified.length > 0 && (() => {
              const unsent = qualified.filter(h => !h.last_sent);
              const sent   = qualified.filter(h =>  h.last_sent);
              return (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {unsent.length > 0 && (
                    <button
                      className="btn btn-primary"
                      disabled={sending === 'reward'}
                      onClick={() => handleSend('reward', unsent.map(h => h.household_id))}
                    >
                      {sending === 'reward' ? 'Sending…' : `Send All (${unsent.length})`}
                    </button>
                  )}
                  {sent.length > 0 && (
                    <button
                      className="btn btn-secondary"
                      disabled={sending === 'reward'}
                      onClick={() => handleSend('reward', sent.map(h => h.household_id))}
                    >
                      {sending === 'reward' ? 'Sending…' : `Resend All (${sent.length})`}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {qualified.length === 0 ? (
            <div className="empty-state"><p>No households have reached {threshold} hours yet in {year}.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Household</th><th>Contact</th><th>Email</th><th>Hours</th><th>Tag #</th><th></th></tr>
                </thead>
                <tbody>
                  {qualified.map(hh => (
                    <tr key={hh.household_id}>
                      <td><strong>{hh.household_name}</strong></td>
                      <td>{hh.primary_name}</td>
                      <td>{hh.primary_email}</td>
                      <td><span className="badge badge-approved">{hh.hours.toFixed(1)}h</span></td>
                      <td>
                        <div style={{ display:'flex', gap:'0.4rem', alignItems:'center' }}>
                          <input
                            type="number"
                            min="1"
                            placeholder="#"
                            value={tagInputs[hh.household_id] || ''}
                            onChange={e => setTagInputs(prev => ({ ...prev, [hh.household_id]: e.target.value }))}
                            style={{ width:70 }}
                          />
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={savingTag === hh.household_id || !tagInputs[hh.household_id]}
                            onClick={() => handleSaveTag(hh.household_id)}
                          >
                            {savingTag === hh.household_id ? '…' : hh.tag ? 'Update' : 'Save'}
                          </button>
                        </div>
                        {hh.tag && (
                          <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.2rem' }}>
                            {hh.tag.assigned_by_name ? `By ${hh.tag.assigned_by_name}` : 'Assigned'} on{' '}
                            {new Date(hh.tag.assigned_at + (hh.tag.assigned_at.endsWith?.('Z') ? '' : 'Z')).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={sending === 'reward'}
                          onClick={() => handleSend('reward', [hh.household_id])}
                        >
                          {hh.last_sent ? 'Resend' : 'Send'}
                        </button>
                        {hh.last_sent && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Sent{hh.last_sent.sent_by_name ? ` by ${hh.last_sent.sent_by_name}` : ''} on{' '}
                            {new Date(hh.last_sent.sent_at + (hh.last_sent.sent_at.endsWith?.('Z') ? '' : 'Z')).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Close households */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>⏳ Almost There — {close.length} household{close.length !== 1 ? 's' : ''}</h3>
              <p style={{ fontSize:'0.85rem', marginTop:'0.2rem' }}>
                Between {Math.round(threshold / 2)} and {threshold - 1} hours in {year}
              </p>
            </div>
            {close.length > 0 && (() => {
              const unsent = close.filter(h => !h.last_sent);
              const sent   = close.filter(h =>  h.last_sent);
              return (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {unsent.length > 0 && (
                    <button
                      className="btn btn-secondary"
                      disabled={sending === 'nudge'}
                      onClick={() => handleSend('nudge', unsent.map(h => h.household_id))}
                    >
                      {sending === 'nudge' ? 'Sending…' : `Send All (${unsent.length})`}
                    </button>
                  )}
                  {sent.length > 0 && (
                    <button
                      className="btn btn-secondary"
                      disabled={sending === 'nudge'}
                      onClick={() => handleSend('nudge', sent.map(h => h.household_id))}
                    >
                      {sending === 'nudge' ? 'Sending…' : `Resend All (${sent.length})`}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {close.length === 0 ? (
            <div className="empty-state"><p>No households in the {Math.round(threshold / 2)}–{threshold - 1} hour range for {year}.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Household</th><th>Contact</th><th>Email</th><th>Hours</th><th>Remaining</th><th></th></tr>
                </thead>
                <tbody>
                  {close.map(hh => (
                    <tr key={hh.household_id}>
                      <td><strong>{hh.household_name}</strong></td>
                      <td>{hh.primary_name}</td>
                      <td>{hh.primary_email}</td>
                      <td>{hh.hours.toFixed(1)}h</td>
                      <td>
                        <span className="badge badge-pending">{hh.remaining.toFixed(1)}h to go</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={sending === 'nudge'}
                          onClick={() => handleSend('nudge', [hh.household_id])}
                        >
                          {hh.last_sent ? 'Resend' : 'Send'}
                        </button>
                        {hh.last_sent && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Sent{hh.last_sent.sent_by_name ? ` by ${hh.last_sent.sent_by_name}` : ''} on{' '}
                            {new Date(hh.last_sent.sent_at + (hh.last_sent.sent_at.endsWith?.('Z') ? '' : 'Z')).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Auto-Assign Tags Modal */}
        {autoAssignOpen && (
          <div className="modal-overlay" onClick={() => setAutoAssignOpen(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:480 }}>
              <div className="modal-header">
                <h3>Auto-Assign Tags</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setAutoAssignOpen(false)}>✕</button>
              </div>

              <p style={{ color:'var(--text-secondary)', marginBottom:'1rem', fontSize:'0.9rem' }}>
                Enter the tag number range for <strong>{tagYear}</strong> tags. Tags will be assigned in order based on the date each household
                reached the {threshold}-hour threshold in {year} (earliest first).
              </p>

              {qualified.length === 0 && (
                <div className="alert alert-info" style={{ marginBottom:'1rem' }}>
                  No households have reached the threshold yet. There's nothing to assign.
                </div>
              )}

              <div style={{ display:'flex', gap:'1rem', marginBottom:'1rem' }}>
                <div className="form-group" style={{ flex:1 }}>
                  <label>Start Tag #</label>
                  <input
                    type="number"
                    min="1"
                    value={autoAssignForm.start_tag}
                    onChange={e => setAutoAssignForm(f => ({ ...f, start_tag: e.target.value }))}
                    placeholder="e.g. 101"
                  />
                </div>
                <div className="form-group" style={{ flex:1 }}>
                  <label>End Tag #</label>
                  <input
                    type="number"
                    min="1"
                    value={autoAssignForm.end_tag}
                    onChange={e => setAutoAssignForm(f => ({ ...f, end_tag: e.target.value }))}
                    placeholder="e.g. 250"
                  />
                </div>
              </div>

              {autoAssignForm.start_tag && autoAssignForm.end_tag && parseInt(autoAssignForm.end_tag) >= parseInt(autoAssignForm.start_tag) && (
                <div style={{ background:'var(--fern)', borderRadius:'var(--radius-sm)', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'0.85rem' }}>
                  <strong>{parseInt(autoAssignForm.end_tag) - parseInt(autoAssignForm.start_tag) + 1}</strong> tags available
                  {' · '}
                  <strong>{qualified.length}</strong> eligible household{qualified.length !== 1 ? 's' : ''}
                  {qualified.length > (parseInt(autoAssignForm.end_tag) - parseInt(autoAssignForm.start_tag) + 1) && (
                    <span style={{ color:'var(--color-danger)', marginLeft:'0.5rem' }}>
                      ({qualified.length - (parseInt(autoAssignForm.end_tag) - parseInt(autoAssignForm.start_tag) + 1)} won't get a tag)
                    </span>
                  )}
                </div>
              )}

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setAutoAssignOpen(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleAutoAssign}
                  disabled={autoAssigning || qualified.length === 0}
                >
                  {autoAssigning ? 'Assigning…' : 'Assign Tags'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
