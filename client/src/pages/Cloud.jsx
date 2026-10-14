import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import Explain from '../components/Explain.jsx';
import Diagram from '../components/Diagram.jsx';
import { Empty, PageHeader } from '../components/Ui.jsx';
import { CONCEPTS, DIAGRAMS, PROVIDERS, SERVICE_MAP } from '../data/cloud.js';

function shuffled(arr, seed) {
  const a = arr.map((text, idx) => ({ text, idx }));
  let s = [...seed].reduce((x, ch) => x * 31 + ch.charCodeAt(0), 7) >>> 0;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function MiniQuiz({ concept }) {
  const [choice, setChoice] = useState(null);
  const [done, setDone] = useState(false);
  const opts = useMemo(() => shuffled(concept.quiz.options, concept.slug), [concept]);
  return (
    <section className="card quiz" aria-label="Short quiz">
      <h3>Short quiz</h3>
      <p><b>{concept.quiz.q}</b></p>
      <div className="options" role="radiogroup" aria-label={concept.quiz.q}>
        {opts.map((o) => (
          <label key={o.idx} className={`option ${done && o.idx === concept.quiz.answer ? 'right' : ''} ${done && choice === o.idx && o.idx !== concept.quiz.answer ? 'wrong' : ''}`}>
            <input type="radio" name="cq" disabled={done} checked={choice === o.idx} onChange={() => setChoice(o.idx)} /><span>{o.text}</span>
          </label>))}
      </div>
      {!done ? <button className="btn btn-primary" disabled={choice === null} onClick={() => setDone(true)}>Check answer</button>
        : <><div className={`alert ${choice === concept.quiz.answer ? 'alert-ok' : 'alert-warn'}`} role="status"><div><b>{choice === concept.quiz.answer ? 'Correct.' : 'Not quite.'}</b> The right answer is: {concept.quiz.options[concept.quiz.answer]}.</div></div>
          <button className="btn" onClick={() => { setDone(false); setChoice(null); }}>Try again</button></>}
    </section>
  );
}

function ConceptDetail({ concept }) {
  return (
    <article className="stack">
      <Link to="/cloud" className="back"><ArrowLeft size={16} aria-hidden="true" /> All concepts</Link>
      <PageHeader title={concept.title} />
      <div className="card"><h3>Definition</h3><p>{concept.definition}</p></div>
      <div className="card"><h3>Explanation</h3><Explain en={concept.english} hi={concept.hindi} /></div>
      <div className="card"><h3>Real-life example</h3><p>{concept.reallife}</p></div>
      <div className="card"><h3>Technical example</h3><p>{concept.technical}</p></div>
      <div className="card alert-warn"><h3>Common misconfiguration</h3><p>{concept.misconfig}</p></div>
      <div className="card"><h3>Recommended defensive practice</h3><p>{concept.defense}</p></div>
      <MiniQuiz concept={concept} />
    </article>
  );
}

export default function Cloud() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState('concepts');
  const [q, setQ] = useState('');
  const [diagramId, setDiagramId] = useState(DIAGRAMS[0].id);

  if (slug) {
    const c = CONCEPTS.find((x) => x.slug === slug);
    if (!c) return <Empty title="Concept not found"><button className="btn" onClick={() => nav('/cloud')}>Back</button></Empty>;
    return <ConceptDetail concept={c} />;
  }
  const filtered = CONCEPTS.filter((c) => `${c.title} ${c.definition}`.toLowerCase().includes(q.trim().toLowerCase()));
  const diagram = DIAGRAMS.find((d) => d.id === diagramId);
  return (
    <>
      <PageHeader title="Cloud security workspace" sub="Concepts, provider mapping and reference architectures. Learning material only: check each provider's current documentation before relying on details." />
      <div className="tabs" role="tablist" aria-label="Cloud sections">
        {[['concepts', 'Concepts'], ['providers', 'AWS / Azure / GCP'], ['diagrams', 'Diagrams']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'concepts' && (<>
        <div className="toolbar"><div className="search"><Search size={16} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search concepts" aria-label="Search concepts" /></div></div>
        {filtered.length === 0 ? <Empty title="No concepts match">Try another word.</Empty> : <div className="grid-2">{filtered.map((c) => <Link key={c.slug} to={`/cloud/${c.slug}`} className="card card-link"><div><h3>{c.title}</h3><p className="dim">{c.definition}</p></div></Link>)}</div>}
      </>)}
      {tab === 'providers' && (<>
        <div className="grid-2">{PROVIDERS.map((p) => <div key={p.name} className="card"><h3>{p.name}</h3><p>{p.note}</p><a className="btn btn-sm" href={p.url} target="_blank" rel="noopener noreferrer">Official docs<span className="sr"> (opens in a new tab)</span></a></div>)}</div>
        <h2 className="section-title">Equivalent services</h2>
        <p className="dim">Service names and features change. This is a learning map, not a complete comparison.</p>
        <div className="table-wrap"><table><thead><tr><th>Area</th><th>AWS</th><th>Azure</th><th>GCP</th></tr></thead>
          <tbody>{SERVICE_MAP.map((r) => <tr key={r.area}><td>{r.area}</td><td>{r.aws}</td><td>{r.azure}</td><td>{r.gcp}</td></tr>)}</tbody></table></div>
      </>)}
      {tab === 'diagrams' && (<>
        <div className="toolbar"><select value={diagramId} onChange={(e) => setDiagramId(e.target.value)} aria-label="Choose a diagram">{DIAGRAMS.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></div>
        <div className="card"><h2>{diagram.title}</h2><Diagram key={diagram.id} diagram={diagram} /></div>
      </>)}
    </>
  );
}
