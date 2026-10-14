import { Link, useNavigate } from 'react-router-dom';
import { Award, Briefcase, CheckCircle2, Circle, Clock, FlaskConical, Flame, Library, Network, PlayCircle, Terminal, Timer } from 'lucide-react';
import { api } from '../api.js';
import { useSettings } from '../settings.js';
import { useAsync } from '../lib/hooks.js';
import { Badge, ErrorBox, Loader, useToast } from '../components/Ui.jsx';
import { fmtDate, fmtMinutes } from '../lib/util.js';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const diffTone = { Beginner: 'badge-green', Intermediate: 'badge-cyan', Advanced: 'badge-amber' };

function Bars({ data, getValue, getLabel, unit }) {
  const max = Math.max(1, ...data.map(getValue));
  return (
    <div className="bars" role="img" aria-label={`Bar chart: ${data.map((d) => `${getLabel(d)} ${getValue(d)} ${unit}`).join(', ')}`}>
      {data.map((d, i) => (
        <div className="bar-col" key={i}>
          <span className="bar-val mono">{getValue(d) || ''}</span>
          <div className="bar-track"><div className="bar-fill" style={{ height: `${(getValue(d) / max) * 100}%` }} /></div>
          <span className="bar-label mono">{getLabel(d)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { settings } = useSettings();
  const toast = useToast();
  const nav = useNavigate();
  const { data, error, loading, reload } = useAsync(() => api.get('/api/dashboard'), []);

  if (loading && !data) return <Loader label="Reading system data" />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { stats, mission, goal, weekly, labsOverTime, categories, recent, today } = data;
  const goalPct = Math.min(100, Math.round((goal.minutesToday / goal.dailyMinutes) * 100));

  const toggleMission = async () => {
    try { await api.post(`/api/missions/${mission.id}/toggle`); toast(mission.done ? 'Mission marked as not done' : 'Mission completed'); reload(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const dateLabel = new Date(`${today}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const earned = recent.achievements.filter((a) => a.earned);

  return (
    <>
      <section className="hero card" aria-labelledby="welcome">
        <div className="hero-main">
          <p className="mono dim">{dateLabel}</p>
          <h1 id="welcome">Welcome back, {settings.display_name}.</h1>
          <div className="stat-row">
            <div className="stat"><Flame size={18} aria-hidden="true" /><b>{stats.streak}</b><span>day streak</span></div>
            <div className="stat"><FlaskConical size={18} aria-hidden="true" /><b>{stats.completedLabs}</b><span>labs completed</span></div>
            <div className="stat"><Timer size={18} aria-hidden="true" /><b>{stats.studySessions}</b><span>study sessions</span></div>
            <div className="stat"><Clock size={18} aria-hidden="true" /><b>{stats.labHours}</b><span>lab hours</span></div>
          </div>
          <div className="progress-line">
            <div className="row-between"><span>Overall progress</span><b className="mono">{stats.overallProgress}%</b></div>
            <div className="meter" role="progressbar" aria-valuenow={stats.overallProgress} aria-valuemin="0" aria-valuemax="100" aria-label="Overall progress"><div style={{ width: `${stats.overallProgress}%` }} /></div>
          </div>
          <Link className="btn btn-primary" to={data.continue.to}><PlayCircle size={18} aria-hidden="true" /> Continue learning<span className="btn-sub">{data.continue.label}</span></Link>
        </div>
        <div className="goal">
          <p className="mono dim">TODAY'S STUDY GOAL</p>
          <div className="ring" style={{ '--p': goalPct }} role="img" aria-label={`${goalPct}% of daily goal`}><span>{goalPct}%</span></div>
          <p>{fmtMinutes(goal.minutesToday)} of {fmtMinutes(goal.dailyMinutes)}</p>
        </div>
      </section>

      {mission && (
        <section className="card mission" aria-labelledby="mission-h">
          <div className="row-between wrap">
            <h2 id="mission-h">Daily mission</h2>
            <div className="chips"><Badge tone={diffTone[mission.difficulty]}>{mission.difficulty}</Badge><Badge><Clock size={12} aria-hidden="true" /> ~{mission.est_minutes} min</Badge><Badge>{mission.category}</Badge></div>
          </div>
          <h3>{mission.title}</h3>
          <p>{mission.description}</p>
          <button className={`btn ${mission.done ? '' : 'btn-primary'}`} onClick={toggleMission} aria-pressed={mission.done}>
            {mission.done ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />} {mission.done ? 'Completed. Undo' : 'Mark as completed'}
          </button>
        </section>
      )}

      <section aria-labelledby="qa-h">
        <h2 id="qa-h" className="section-title">Quick actions</h2>
        <div className="actions-grid">
          <Link className="qa" to="/timer"><Timer size={20} aria-hidden="true" />Start study session</Link>
          <button className="qa" onClick={() => nav('/labs/new')}><FlaskConical size={20} aria-hidden="true" />Create lab entry</button>
          <Link className="qa" to="/commands"><Terminal size={20} aria-hidden="true" />Linux commands</Link>
          <Link className="qa" to="/networking"><Network size={20} aria-hidden="true" />Networking notes</Link>
          <Link className="qa" to="/resources"><Library size={20} aria-hidden="true" />Add resource</Link>
          <Link className="qa" to="/portfolio"><Briefcase size={20} aria-hidden="true" />View portfolio</Link>
        </div>
      </section>

      <section className="grid-2" aria-label="Progress">
        <div className="card">
          <h2>Weekly study activity</h2>
          <p className="dim">Minutes per day, last 7 days</p>
          {stats.studyMinutes === 0
            ? <p className="dim empty-inline">No study sessions yet. Log one to start your chart.</p>
            : <Bars data={weekly} getValue={(d) => d.minutes} getLabel={(d) => DAY[new Date(`${d.date}T00:00:00`).getDay()]} unit="minutes" />}
        </div>
        <div className="card">
          <h2>Completed labs over time</h2>
          <p className="dim">Labs completed per week, last 8 weeks</p>
          {stats.completedLabs === 0
            ? <p className="dim empty-inline">Complete a lab to see progress here.</p>
            : <Bars data={labsOverTime} getValue={(d) => d.count} getLabel={(d) => (d.weeksAgo === 0 ? 'Now' : `-${d.weeksAgo}w`)} unit="labs" />}
        </div>
      </section>

      <section className="card" aria-labelledby="cat-h">
        <h2 id="cat-h">Progress by category</h2>
        <p className="dim">Linux counts commands marked understood. Networking counts completed topics. The other categories count completed labs against a target of 5.</p>
        <div className="cats">
          {categories.map((c) => (
            <div key={c.name} className="cat">
              <div className="row-between"><span>{c.name}</span><b className="mono">{c.percent}%</b></div>
              <div className="meter" role="progressbar" aria-valuenow={c.percent} aria-valuemin="0" aria-valuemax="100" aria-label={`${c.name} progress`}><div style={{ width: `${c.percent}%` }} /></div>
              <small className="dim">{c.detail}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="grid-2" aria-label="Recent activity">
        <div className="card">
          <h2>Recently edited notes</h2>
          {recent.notes.length === 0 ? <p className="dim empty-inline">No notes yet. <Link to="/notes">Write your first note</Link>.</p>
            : <ul className="list">{recent.notes.map((n) => <li key={n.id}><Link to="/notes" state={{ open: n.id }}>{n.title}</Link><small className="dim">{n.category} · {fmtDate(n.updated_at)}</small></li>)}</ul>}
        </div>
        <div className="card">
          <h2>Recently completed labs</h2>
          {recent.labs.length === 0 ? <p className="dim empty-inline">No completed labs yet.</p>
            : <ul className="list">{recent.labs.map((l) => <li key={l.id}><Link to={`/labs/${l.id}`}>{l.title}</Link><small className="dim">{l.category} · {fmtDate(l.completed_at)}</small></li>)}</ul>}
        </div>
        <div className="card">
          <h2>Latest achievements</h2>
          {earned.length === 0 ? <p className="dim empty-inline">Nothing earned yet. Complete a lab, understand commands or build a streak.</p>
            : <ul className="list">{earned.map((a) => <li key={a.id}><span><Award size={14} aria-hidden="true" className="accent" /> {a.title}</span></li>)}</ul>}
          <details className="locked"><summary>Locked achievements ({recent.achievements.length - earned.length})</summary>
            <ul className="list">{recent.achievements.filter((a) => !a.earned).map((a) => <li key={a.id} className="dim">{a.title}</li>)}</ul></details>
        </div>
        <div className="card">
          <h2>Upcoming study goals</h2>
          {recent.upcoming.length === 0 ? <p className="dim empty-inline">No planned labs. <Link to="/labs/new">Plan one</Link>.</p>
            : <ul className="list">{recent.upcoming.map((l) => <li key={l.id}><Link to={`/labs/${l.id}`}>{l.title}</Link><small className="dim">{l.status === 'in-progress' ? 'In progress' : 'Planned'} · {fmtDate(l.lab_date)}</small></li>)}</ul>}
        </div>
      </section>

    </>
  );
}
