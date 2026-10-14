import { useState } from 'react';
import { Download } from 'lucide-react';
import { api, setToken } from '../api.js';
import { useSettings } from '../settings.js';
import { Field, Modal, PageHeader, useToast } from '../components/Ui.jsx';
import { LAB_CATEGORIES, downloadFile } from '../lib/util.js';

export default function SettingsPage() {
  const { settings, setSettings } = useSettings();
  const toast = useToast();
  const [f, setF] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [wipe, setWipe] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const toggleCat = (c) => setF({ ...f, preferred_categories: f.preferred_categories.includes(c) ? f.preferred_categories.filter((x) => x !== c) : [...f.preferred_categories, c] });

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (f.notifications && !settings.notifications && 'Notification' in window && Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { toast('Notification permission was not granted, so notifications stay off.', 'error'); f.notifications = false; }
      }
      const s = await api.put('/api/settings', {
        display_name: f.display_name, theme: f.theme, language: f.language, daily_goal_minutes: Number(f.daily_goal_minutes), weekly_goal_minutes: Number(f.weekly_goal_minutes),
        focus_min: Number(f.focus_min), short_break_min: Number(f.short_break_min), long_break_min: Number(f.long_break_min), sound: f.sound, notifications: f.notifications, preferred_categories: f.preferred_categories,
      });
      setSettings(s); setF(s); toast('Settings saved');
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const exportAll = async () => { try { downloadFile('cyberlab-export.json', JSON.stringify(await api.get('/api/export'), null, 2), 'application/json'); } catch (e) { toast(e.message, 'error'); } };
  const clearAll = async () => {
    try { await api.del('/api/data', { confirm: confirmText }); toast('All your data was cleared'); setWipe(false); setConfirmText(''); const s = await api.get('/api/settings'); setSettings(s); setF(s); try { localStorage.removeItem('cyberlab_timer'); } catch { /* ignore */ } }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Settings" sub="Single-user workspace. No personal information beyond your display name is collected." />
      <form className="card form" onSubmit={save}>
        <h2>Profile and appearance</h2>
        <Field label="Display name" htmlFor="st-name"><input id="st-name" value={f.display_name} onChange={set('display_name')} maxLength={40} required /></Field>
        <div className="grid-form">
          <Field label="Theme" htmlFor="st-theme"><select id="st-theme" value={f.theme} onChange={set('theme')}><option value="cybercore">Cybercore (default)</option><option value="soft">Low-contrast dark</option></select></Field>
          <Field label="Learning explanations" htmlFor="st-lang" hint="Commands, networking and cloud content."><select id="st-lang" value={f.language} onChange={set('language')}><option value="both">English + Romanized Hindi</option><option value="en">English only</option><option value="hi">Romanized Hindi only</option></select></Field>
        </div>
        <fieldset className="fieldset"><legend>Preferred learning categories</legend>
          <div className="chips">{LAB_CATEGORIES.filter((c) => c !== 'Other').map((c) => <label key={c} className="check inline"><input type="checkbox" checked={f.preferred_categories.includes(c)} onChange={() => toggleCat(c)} /><span>{c}</span></label>)}</div>
          <small className="dim">The first one you pick becomes the default category for new labs.</small></fieldset>

        <h2>Goals and timer</h2>
        <div className="grid-form">
          <Field label="Daily study goal (minutes)" htmlFor="st-goal"><input id="st-goal" type="number" min="5" max="720" value={f.daily_goal_minutes} onChange={set('daily_goal_minutes')} /></Field>
          <Field label="Weekly study goal (minutes)" htmlFor="st-wgoal"><input id="st-wgoal" type="number" min="5" max="5040" value={f.weekly_goal_minutes} onChange={set('weekly_goal_minutes')} /></Field>
        </div>
        <div className="grid-form">
          <Field label="Focus (min)" htmlFor="st-f"><input id="st-f" type="number" min="1" max="180" value={f.focus_min} onChange={set('focus_min')} /></Field>
          <Field label="Short break (min)" htmlFor="st-s"><input id="st-s" type="number" min="1" max="60" value={f.short_break_min} onChange={set('short_break_min')} /></Field>
          <Field label="Long break (min)" htmlFor="st-l"><input id="st-l" type="number" min="1" max="120" value={f.long_break_min} onChange={set('long_break_min')} /></Field>
        </div>
        <label className="check"><input type="checkbox" checked={f.sound} onChange={set('sound')} /><span>Play a sound when a timer ends</span></label>
        <label className="check"><input type="checkbox" checked={f.notifications} onChange={set('notifications')} /><span>Show a browser notification when a timer ends (the browser will ask for permission)</span></label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save settings'}</button>
      </form>

      <section className="card">
        <h2>Your data</h2>
        <p className="dim">Everything is stored in your PostgreSQL database. Export a backup regularly, especially on a free-tier database that may expire.</p>
        <div className="row-gap wrap">
          <button className="btn" onClick={exportAll}><Download size={16} aria-hidden="true" /> Export everything (JSON)</button>
          <button className="btn" onClick={() => { setToken(''); window.location.reload(); }}>Sign out</button>
          <button className="btn btn-danger" onClick={() => setWipe(true)}>Clear all my data</button>
        </div>
      </section>

      <section className="card">
        <h2>About this release</h2>
        <p>Included: dashboard, Linux commands, networking, cloud workspace with diagrams, lab journal, notes, study timer, quizzes and flashcards, roadmap, portfolio, resource library, practice safely, settings.</p>
        <p className="dim">Limitations: single user; evidence/screenshot uploads are not supported (describe evidence in text); the offline service worker is not included, so the app needs a connection; the app is password protected only if the server has APP_PASSWORD set.</p>
      </section>

      {wipe && (
        <Modal title="Clear all data?" onClose={() => setWipe(false)}
          footer={<><button className="btn" onClick={() => setWipe(false)}>Cancel</button><button className="btn btn-danger" disabled={confirmText !== 'DELETE'} onClick={clearAll}>Delete everything</button></>}>
          <p>This permanently deletes your labs, notes, study sessions, quiz history, roadmap progress, resources, portfolio settings and preferences. Reference content stays. This cannot be undone.</p>
          <Field label="Type DELETE to confirm" htmlFor="wipe"><input id="wipe" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" /></Field>
        </Modal>)}
    </>
  );
}
