import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Trash2, Volume2 } from 'lucide-react';
import { api } from '../api.js';
import { useSettings } from '../settings.js';
import { useAsync } from '../lib/hooks.js';
import { ErrorBox, Field, Loader, PageHeader, useToast } from '../components/Ui.jsx';
import { fmtDate, fmtMinutes } from '../lib/util.js';

const KEY = 'cyberlab_timer';
const MODES = { focus: 'Focus', short: 'Short break', long: 'Long break' };
const loadState = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const saveState = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };
const mmss = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

function Calendar({ summary, month, onMonth }) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysIn = new Date(y, m, 0).getDate();
  const byDay = Object.fromEntries(summary.days.map((d) => [d.d, d.m]));
  const active = new Set(summary.activeDays);
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  const shift = (n) => { const d = new Date(y, m - 1 + n, 1); onMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };
  const level = (min) => (min >= summary.dailyGoal ? 3 : min >= summary.dailyGoal / 2 ? 2 : min > 0 ? 1 : 0);
  return (
    <div className="card">
      <div className="row-between"><h2>{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <div className="row-gap"><button className="btn btn-ghost btn-icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button><button className="btn btn-ghost btn-icon" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button></div></div>
      <div className="cal" role="grid" aria-label="Study calendar">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="cal-h mono" role="columnheader">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = `${month}-${String(d).padStart(2, '0')}`;
          const min = byDay[key] || 0;
          return <div key={i} role="gridcell" className={`cal-d lv${level(min)} ${key === summary.today ? 'today' : ''} ${active.has(key) ? 'act' : ''}`} title={`${key}: ${min} min`} aria-label={`${key}: ${min} minutes studied`}>{d}</div>;
        })}
      </div>
      <p className="dim small">Shading shows minutes studied versus your daily goal. A dot marks any learning activity (labs, missions, sessions).</p>
    </div>
  );
}

export default function Timer() {
  const { settings, setSettings } = useSettings();
  const toast = useToast();
  const [month, setMonth] = useState(null);
  const summary = useAsync(() => api.get(`/api/sessions/summary${month ? `?month=${month}` : ''}`), [month]);
  const labs = useAsync(() => api.get('/api/labs?limit=200&sort=updated'), []);

  const dur = useCallback((mode) => (mode === 'focus' ? settings.focus_min : mode === 'short' ? settings.short_break_min : settings.long_break_min) * 60000, [settings]);
  const [t, setT] = useState(() => loadState() || { mode: 'focus', status: 'idle', endAt: null, remaining: null, cycle: 0, subject: '', labId: '', plannedMin: null });
  const [now, setNow] = useState(Date.now());
  const audio = useRef(null);
  const finishing = useRef(false);
  const [manual, setManual] = useState({ minutes: 25, subject: '' });
  const [durs, setDurs] = useState({ focus_min: settings.focus_min, short_break_min: settings.short_break_min, long_break_min: settings.long_break_min });

  useEffect(() => { saveState(t); }, [t]);
  const remaining = t.status === 'running' ? t.endAt - now : (t.remaining ?? dur(t.mode));

  // Elapsed time is derived from a timestamp, so throttled background tabs stay accurate.
  useEffect(() => {
    if (t.status !== 'running') return undefined;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [t.status]);

  useEffect(() => { document.title = t.status === 'running' ? `${mmss(remaining)} · ${MODES[t.mode]} · CyberLab` : 'CyberLab Journal'; return () => { document.title = 'CyberLab Journal'; }; }, [remaining, t.status, t.mode]);

  const beep = useCallback(() => {
    if (!settings.sound) return;
    try {
      const ctx = audio.current || new (window.AudioContext || window.webkitAudioContext)();
      audio.current = ctx;
      [0, 0.25, 0.5].forEach((d) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.15); });
    } catch { /* sound unavailable */ }
  }, [settings.sound]);

  const finish = useCallback(async (state) => {
    if (finishing.current) return;
    finishing.current = true;
    const wasFocus = state.mode === 'focus';
    const cycle = wasFocus ? state.cycle + 1 : state.cycle;
    const nextMode = wasFocus ? (cycle % 4 === 0 ? 'long' : 'short') : 'focus';
    setT({ ...state, mode: nextMode, status: 'idle', endAt: null, remaining: null, cycle });
    beep();
    if (settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(wasFocus ? 'Focus session complete' : 'Break over', { body: wasFocus ? 'Time for a break.' : 'Ready for the next focus session?' }); } catch { /* ignore */ }
    }
    if (wasFocus) {
      try { await api.post('/api/sessions', { minutes: state.plannedMin || settings.focus_min, subject: state.subject, lab_id: state.labId || null }); toast('Focus session saved'); summary.reload(); }
      catch (e) { toast(`Session could not be saved: ${e.message}`, 'error'); }
    }
    finishing.current = false;
  }, [beep, settings, summary, toast]);

  useEffect(() => { if (t.status === 'running' && now >= t.endAt) finish(t); }, [now, t, finish]);

  const start = () => {
    try { if (!audio.current && (window.AudioContext || window.webkitAudioContext)) audio.current = new (window.AudioContext || window.webkitAudioContext)(); audio.current?.resume?.(); } catch { /* ignore */ }
    const rem = t.remaining ?? dur(t.mode);
    setNow(Date.now());
    setT({ ...t, status: 'running', endAt: Date.now() + rem, remaining: null, plannedMin: t.plannedMin && t.status === 'paused' ? t.plannedMin : Math.round(dur(t.mode) / 60000) });
  };
  const pause = () => setT({ ...t, status: 'paused', remaining: Math.max(0, t.endAt - Date.now()), endAt: null });
  const reset = () => setT({ ...t, status: 'idle', endAt: null, remaining: null, plannedMin: null });
  const pickMode = (mode) => setT({ ...t, mode, status: 'idle', endAt: null, remaining: null, plannedMin: null });

  const saveDurations = async (e) => {
    e.preventDefault();
    try { const s = await api.put('/api/settings', { focus_min: Number(durs.focus_min), short_break_min: Number(durs.short_break_min), long_break_min: Number(durs.long_break_min) }); setSettings(s); if (t.status === 'idle') setT({ ...t, remaining: null }); toast('Timer durations saved'); }
    catch (err) { toast(err.message, 'error'); }
  };
  const togglePref = async (key) => {
    const next = !settings[key];
    if (key === 'notifications' && next) {
      if (!('Notification' in window)) { toast('This browser does not support notifications.', 'error'); return; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { toast('Notification permission was not granted.', 'error'); return; }
    }
    try { setSettings(await api.put('/api/settings', { [key]: next })); } catch (e) { toast(e.message, 'error'); }
  };
  const logManual = async (e) => {
    e.preventDefault();
    try { await api.post('/api/sessions', { minutes: Number(manual.minutes), subject: manual.subject }); toast('Session logged'); summary.reload(); } catch (err) { toast(err.message, 'error'); }
  };
  const delSession = async (id) => { try { await api.del(`/api/sessions/${id}`); summary.reload(); } catch (e) { toast(e.message, 'error'); } };

  const S = summary.data;
  const pct = Math.round((1 - remaining / dur(t.mode)) * 100);
  return (
    <>
      <PageHeader title="Study timer" sub="Pomodoro focus sessions are saved to your account when they finish." />
      <section className="card timer" aria-label="Timer">
        <div className="seg timer-modes" role="group" aria-label="Timer mode">
          {Object.entries(MODES).map(([k, l]) => <button key={k} className={t.mode === k ? 'on' : ''} disabled={t.status === 'running'} onClick={() => pickMode(k)}>{l}</button>)}
        </div>
        <div className="timer-face mono" role="timer" aria-live="off" aria-label={`${MODES[t.mode]} ${mmss(remaining)} remaining`}>{mmss(remaining)}</div>
        <div className="meter" role="progressbar" aria-valuenow={Math.max(0, Math.min(100, pct))} aria-valuemin="0" aria-valuemax="100" aria-label="Session progress"><div style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
        <div className="timer-controls">
          {t.status === 'running' ? <button className="btn btn-primary" onClick={pause}><Pause size={18} aria-hidden="true" /> Pause</button>
            : <button className="btn btn-primary" onClick={start}><Play size={18} aria-hidden="true" /> {t.status === 'paused' ? 'Resume' : 'Start'}</button>}
          <button className="btn" onClick={reset}><RotateCcw size={18} aria-hidden="true" /> Reset</button>
        </div>
        <p className="dim small">Completed focus sessions this round: {t.cycle}. Every 4th focus session is followed by a long break.</p>
        <div className="grid-form two">
          <Field label="Subject" htmlFor="t-sub"><input id="t-sub" value={t.subject} maxLength={100} onChange={(e) => setT({ ...t, subject: e.target.value })} placeholder="What are you studying?" /></Field>
          <Field label="Linked lab (optional)" htmlFor="t-lab"><select id="t-lab" value={t.labId} onChange={(e) => setT({ ...t, labId: e.target.value })}><option value="">None</option>{(labs.data?.items || []).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select></Field>
        </div>
        <div className="row-gap wrap">
          <label className="check"><input type="checkbox" checked={settings.sound} onChange={() => togglePref('sound')} /><span><Volume2 size={14} aria-hidden="true" /> Sound when a session ends</span></label>
          <label className="check"><input type="checkbox" checked={settings.notifications} onChange={() => togglePref('notifications')} /><span><Bell size={14} aria-hidden="true" /> Browser notification</span></label>
        </div>
      </section>

      {summary.error && <ErrorBox error={summary.error} onRetry={summary.reload} />}
      {summary.loading && !S && <Loader />}
      {S && (<>
        <section className="grid-2" aria-label="Totals">
          <div className="card"><p className="mono dim">TODAY</p><h2>{fmtMinutes(S.todayMinutes)} <small className="dim">of {fmtMinutes(S.dailyGoal)}</small></h2><div className="meter"><div style={{ width: `${Math.min(100, (S.todayMinutes / S.dailyGoal) * 100)}%` }} /></div></div>
          <div className="card"><p className="mono dim">LAST 7 DAYS</p><h2>{fmtMinutes(S.weekMinutes)} <small className="dim">of {fmtMinutes(S.weeklyGoal)}</small></h2><div className="meter"><div style={{ width: `${Math.min(100, (S.weekMinutes / S.weeklyGoal) * 100)}%` }} /></div><p className="dim small">Current streak: {S.streak} day{S.streak === 1 ? '' : 's'}</p></div>
        </section>
        <Calendar summary={S} month={month || S.month} onMonth={setMonth} />
        <section className="grid-2">
          <div className="card"><h2>Session history</h2>
            {S.recent.length === 0 ? <p className="dim">No sessions yet. Finish a focus session to see it here.</p> : <ul className="list">{S.recent.map((s) => (
              <li key={s.id}><div className="row-between"><span>{fmtMinutes(s.minutes)} {s.subject && `· ${s.subject}`}</span><button className="btn btn-ghost btn-icon" onClick={() => delSession(s.id)} aria-label="Delete session"><Trash2 size={16} /></button></div><small className="dim">{fmtDate(s.session_date)}{s.lab_title ? ` · Lab: ${s.lab_title}` : ''}</small></li>))}</ul>}
          </div>
          <div className="card">
            <h2>Timer settings</h2>
            <form onSubmit={saveDurations}>
              <div className="grid-form">
                <Field label="Focus (min)" htmlFor="d-f"><input id="d-f" type="number" min="1" max="180" value={durs.focus_min} onChange={(e) => setDurs({ ...durs, focus_min: e.target.value })} /></Field>
                <Field label="Short break" htmlFor="d-s"><input id="d-s" type="number" min="1" max="60" value={durs.short_break_min} onChange={(e) => setDurs({ ...durs, short_break_min: e.target.value })} /></Field>
                <Field label="Long break" htmlFor="d-l"><input id="d-l" type="number" min="1" max="120" value={durs.long_break_min} onChange={(e) => setDurs({ ...durs, long_break_min: e.target.value })} /></Field>
              </div>
              <button className="btn">Save durations</button>
            </form>
            <h3 className="section-title">Log time manually</h3>
            <form onSubmit={logManual} className="goal-form">
              <input type="number" min="1" max="720" value={manual.minutes} onChange={(e) => setManual({ ...manual, minutes: e.target.value })} aria-label="Minutes" required />
              <input value={manual.subject} maxLength={100} onChange={(e) => setManual({ ...manual, subject: e.target.value })} placeholder="Subject" aria-label="Subject" />
              <button className="btn">Log</button>
            </form>
          </div>
        </section>
      </>)}
    </>
  );
}
