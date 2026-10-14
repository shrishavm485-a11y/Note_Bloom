import { useEffect, useState } from 'react';
import { ExternalLink, Printer } from 'lucide-react';
import { Badge, Loader, Wordmark } from '../components/Ui.jsx';
import { Markdown } from '../lib/markdown.jsx';
import { WRITEUP } from '../lib/portfolio.js';
import { fmtDate } from '../lib/util.js';

// Read-only view shared by the owner's preview and the public page.
export function PortfolioView({ p }) {
  return (
    <div className="portfolio">
      <section className="card">
        <h1>{p.name}</h1>
        <p className="dim">Cybersecurity learning portfolio</p>
        {p.intro && <p>{p.intro}</p>}
        {p.github_url && <p><a href={p.github_url} target="_blank" rel="noopener noreferrer nofollow">GitHub profile <ExternalLink size={14} aria-hidden="true" /><span className="sr"> (opens in a new tab)</span></a></p>}
      </section>
      <section className="card">
        <h2>Skills summary</h2>
        <div className="stat-row">
          <div className="stat"><b>{p.skills.labsCompleted}</b><span>labs completed</span></div>
          <div className="stat"><b>{p.skills.labHours}</b><span>lab hours</span></div>
          <div className="stat"><b>{p.skills.commandsUnderstood}</b><span>Linux commands understood</span></div>
          <div className="stat"><b>{p.skills.networkingTopicsCompleted}</b><span>networking topics</span></div>
        </div>
        {p.skills.categories.length > 0 && <div className="chips">{p.skills.categories.map((c) => <Badge key={c.name} tone="badge-green">{c.name} · {c.count}</Badge>)}</div>}
        {p.skills.tools.length > 0 && <div className="chips">{p.skills.tools.map((t) => <Badge key={t}>{t}</Badge>)}</div>}
        <p className="dim small">Generated from completed learning activity. It is a record of practice, not a certification.</p>
      </section>
      {p.labs.length === 0 ? <section className="card"><p className="dim">No lab write-ups have been selected yet.</p></section> : (
        <div className="grid-2 project-cards">
          {p.labs.map((l) => (
            <article key={l.id} className="card">
              <h2>{l.title}</h2>
              <div className="chips"><Badge>{l.category}</Badge><Badge>{l.difficulty}</Badge><Badge>{fmtDate(l.lab_date)}</Badge>{l.hours > 0 && <Badge>{l.hours} h</Badge>}</div>
              {WRITEUP.map(([k, label]) => l[k] ? <div key={k} className="report-sec"><h3 className="mono sec-label">{label}</h3><Markdown text={l[k]} /></div> : null)}
            </article>))}
        </div>)}
    </div>
  );
}

export default function PublicPortfolio() {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    fetch('/api/public/portfolio').then(async (r) => {
      const j = await r.json().catch(() => ({}));
      setState(r.ok ? { loading: false, data: j, error: '' } : { loading: false, data: null, error: j.error || 'Portfolio unavailable.' });
    }).catch(() => setState({ loading: false, data: null, error: 'Could not load the portfolio.' }));
  }, []);
  useEffect(() => { document.title = state.data ? `${state.data.name} · Portfolio` : 'Portfolio'; }, [state.data]);
  return (
    <div className="public">
      <header className="public-top no-print"><Wordmark small /><button className="btn btn-sm" onClick={() => window.print()}><Printer size={14} aria-hidden="true" /> Print</button></header>
      <main className="public-main">
        {state.loading && <Loader />}
        {state.error && <div className="card"><h1>Portfolio not available</h1><p>{state.error}</p></div>}
        {state.data && <PortfolioView p={state.data} />}
        <p className="dim small center">This page is read-only.</p>
      </main>
    </div>
  );
}
