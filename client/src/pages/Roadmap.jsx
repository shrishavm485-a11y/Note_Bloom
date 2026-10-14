import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useAsync } from '../lib/hooks.js';
import { ErrorBox, Loader, PageHeader, useToast } from '../components/Ui.jsx';
import { ROADMAP } from '../data/roadmap.js';
import { LAB_TEMPLATES } from '../data/labTemplates.js';

export default function Roadmap() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api.get('/api/roadmap'), []);
  const [open, setOpen] = useState(null);
  const [goalText, setGoalText] = useState('');
  const [goalStage, setGoalStage] = useState(1);
  const done = useMemo(() => new Set(data?.done || []), [data]);

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const stageProgress = (s) => { const d = s.checklist.filter((c) => done.has(c.key)).length; return { d, t: s.checklist.length, pct: Math.round((d / s.checklist.length) * 100) }; };
  const total = ROADMAP.reduce((a, s) => a + s.checklist.length, 0);
  const totalDone = ROADMAP.reduce((a, s) => a + stageProgress(s).d, 0);
  const resume = ROADMAP.find((s) => stageProgress(s).pct < 100);

  const toggle = async (key) => {
    const next = !done.has(key);
    setData({ ...data, done: next ? [...data.done, key] : data.done.filter((k) => k !== key) });
    try { await api.put('/api/roadmap/items', { key, done: next }); } catch (e) { toast(e.message, 'error'); reload(); }
  };
  const addGoal = async (e) => {
    e.preventDefault();
    try { const g = await api.post('/api/roadmap/goals', { text: goalText, stage: Number(goalStage) }); setData({ ...data, goals: [...data.goals, g] }); setGoalText(''); }
    catch (err) { toast(err.message, 'error'); }
  };
  const toggleGoal = async (g) => { try { const u = await api.put(`/api/roadmap/goals/${g.id}`, { done: !g.done }); setData({ ...data, goals: data.goals.map((x) => (x.id === g.id ? u : x)) }); } catch (e) { toast(e.message, 'error'); } };
  const delGoal = async (g) => { try { await api.del(`/api/roadmap/goals/${g.id}`); setData({ ...data, goals: data.goals.filter((x) => x.id !== g.id) }); } catch (e) { toast(e.message, 'error'); } };

  return (
    <>
      <PageHeader title="Learning roadmap" sub={`${totalDone} of ${total} checklist items complete. Following a roadmap builds skills; it does not guarantee a job or certification.`}
        actions={resume && <button className="btn btn-primary" onClick={() => { setOpen(resume.n); setTimeout(() => document.getElementById(`stage-${resume.n}`)?.scrollIntoView({ behavior: 'smooth' }), 50); }}><PlayCircle size={18} aria-hidden="true" /> Resume at stage {resume.n}</button>} />
      <div className="stack">
        {ROADMAP.map((s) => {
          const p = stageProgress(s);
          const isOpen = open === s.n;
          return (
            <section key={s.n} id={`stage-${s.n}`} className={`card stage ${p.pct === 100 ? 'is-done' : ''}`}>
              <button className="stage-head" onClick={() => setOpen(isOpen ? null : s.n)} aria-expanded={isOpen}>
                <span className="mono stage-n">Stage {s.n}</span>
                <span className="stage-title"><b>{s.title}</b><small className="dim">{s.time} · {p.d}/{p.t} done</small></span>
                <ChevronDown size={18} aria-hidden="true" className={`chev ${isOpen ? 'open' : ''}`} />
              </button>
              <div className="meter" role="progressbar" aria-valuenow={p.pct} aria-valuemin="0" aria-valuemax="100" aria-label={`Stage ${s.n} progress`}><div style={{ width: `${p.pct}%` }} /></div>
              {isOpen && (
                <div className="stage-body">
                  <h4>Learning objectives</h4><ul>{s.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
                  <h4>Recommended resources</h4>
                  <ul>{s.resources.map((r) => <li key={r.t}>{r.to ? <Link to={r.to}>{r.t}</Link> : <a href={r.url} target="_blank" rel="noopener noreferrer">{r.t} <ExternalLink size={12} aria-hidden="true" /><span className="sr">(opens in a new tab)</span></a>}</li>)}</ul>
                  <h4>Practical exercises</h4><ul>{s.exercises.map((o) => <li key={o}>{o}</li>)}</ul>
                  {s.templates.length > 0 && <><h4>Related lab templates</h4><div className="chips">{s.templates.map((id) => <Link key={id} className="chip" to={`/labs/new?template=${id}`}>{LAB_TEMPLATES.find((t) => t.id === id)?.name || id}</Link>)}</div></>}
                  <h4>Completion checklist</h4>
                  {s.checklist.map((c) => <label key={c.key} className="check"><input type="checkbox" checked={done.has(c.key)} onChange={() => toggle(c.key)} /><span>{c.label}</span></label>)}
                </div>)}
            </section>);
        })}
      </div>

      <section className="card section-gap" aria-labelledby="goals-h">
        <h2 id="goals-h">My personal goals</h2>
        <form className="goal-form" onSubmit={addGoal}>
          <input value={goalText} onChange={(e) => setGoalText(e.target.value)} maxLength={200} placeholder="e.g. Finish Bandit level 15 by Sunday" aria-label="New goal" required />
          <select value={goalStage} onChange={(e) => setGoalStage(e.target.value)} aria-label="Goal stage">{ROADMAP.map((s) => <option key={s.n} value={s.n}>Stage {s.n}</option>)}</select>
          <button className="btn btn-primary"><Plus size={16} aria-hidden="true" /> Add</button>
        </form>
        {data.goals.length === 0 ? <p className="dim">No personal goals yet.</p> : data.goals.map((g) => (
          <div key={g.id} className="row-between goal-row">
            <label className="check"><input type="checkbox" checked={g.done} onChange={() => toggleGoal(g)} /><span className={g.done ? 'struck' : ''}>{g.text} <small className="dim">(stage {g.stage})</small></span></label>
            <button className="btn btn-ghost btn-icon" onClick={() => delGoal(g)} aria-label={`Delete goal ${g.text}`}><Trash2 size={16} /></button>
          </div>))}
      </section>
    </>
  );
}
