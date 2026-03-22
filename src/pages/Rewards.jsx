import { useEffect, useState } from 'react';
import { getRewardSettings, updateRewardSettings, sendRewardEmails, saveRewardTag } from '../api/client';

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

  const load = async () => {
    setLoading(true);
    try {
      const res = await getRewardSettings();
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

  useEffect(() => { load(); }, []);

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
      const res = await sendRewardEmails(emailType, householdIds);
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
      await saveRewardTag(householdId, data.year, tagNum);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save tag.');
    } finally { setSavingTag(null); }
  };

  if (loading) return <div className="loading-page"><span className="spinner" /></div>;
  if (!data)   return <div className="page"><div className="container"><div className="alert alert-error">Failed to load rewards data. Check that the API is running and the settings table exists.</div></div></div>;

  const { threshold, qualified, close, year } = data;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Volunteer Rewards</h1>
            <p>Send reward and nudge emails to households based on {year} hours</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setSettingsOpen(o => !o)}>
            ⚙ Settings
          </button>
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
                Reached {threshold}+ hours in {year}
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
                            {new Date(hh.tag.assigned_at).toLocaleDateString()}
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
                            {new Date(hh.last_sent.sent_at).toLocaleDateString()}
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
                            {new Date(hh.last_sent.sent_at).toLocaleDateString()}
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
      </div>
    </div>
  );
}
