import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Search } from 'lucide-react';
import { api } from '../api.js';
import { useAsync } from '../lib/hooks.js';
import { CodeBlock } from '../lib/markdown.jsx';
import Explain from '../components/Explain.jsx';
import { Empty, ErrorBox, Loader, PageHeader, useToast } from '../components/Ui.jsx';
import { OSI_LAYERS, TOPICS } from '../data/networking.js';
import { PORTS } from '../data/ports.js';

function Quiz({ topic, onResult }) {
  const [choice, setChoice] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { setChoice(null); setSubmitted(false); }, [topic.slug]);
  const { q, options, answer, explain } = topic.quiz;
  const correct = submitted && choice === answer;
  return (
    <section className="card quiz" aria-labelledby="quiz-h">
      <h3 id="quiz-h">Knowledge check</h3>
      <p><b>{q}</b></p>
      <div role="radiogroup" aria-label={q} className="options">
        {options.map((o, i) => {
          let cls = 'option';
          if (submitted && i === answer) cls += ' right';
          else if (submitted && i === choice) cls += ' wrong';
          return (
            <label key={i} className={cls}>
              <input type="radio" name="quiz" checked={choice === i} disabled={submitted} onChange={() => setChoice(i)} />
              <span>{o}</span>
            </label>
          );
        })}
      </div>
      {!submitted
        ? <button className="btn btn-primary" disabled={choice === null} onClick={() => { setSubmitted(true); onResult(choice === answer); }}>Check answer</button>
        : <>
          <div className={`alert ${correct ? 'alert-ok' : 'alert-warn'}`} role="status"><div><b>{correct ? 'Correct.' : 'Not quite.'}</b> {explain}</div></div>
          <button className="btn" onClick={() => { setChoice(null); setSubmitted(false); }}>Try again</button>
        </>}
    </section>
  );
}

function TopicDetail({ topic, done, onToggle, onQuiz }) {
  return (
    <article className="stack">
      <Link to="/networking" className="back"><ArrowLeft size={16} aria-hidden="true" /> All topics</Link>
      <PageHeader title={topic.title} actions={
        <button className={`btn ${done ? '' : 'btn-primary'}`} onClick={onToggle} aria-pressed={done}>{done ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />} {done ? 'Completed' : 'Mark as completed'}</button>} />
      <div className="card"><h3>Simple definition</h3><p>{topic.definition}</p></div>
      <div className="card"><h3>Explanation</h3><Explain en={topic.explanation} hi={topic.hindi} /></div>
      <div className="card"><h3>Real-world analogy</h3><p>{topic.analogy}</p></div>
      <div className="card"><h3>Technical example</h3><CodeBlock code={topic.example} lang="text" label="example" /></div>
      {topic.commands.length > 0 && (
        <div className="card"><h3>Related Linux commands</h3>
          <div className="chips">{topic.commands.map((c) => <Link key={c} className="chip mono" to={`/commands?q=${encodeURIComponent(c)}`}>{c}</Link>)}</div>
        </div>)}
      <Quiz topic={topic} onResult={onQuiz} />
    </article>
  );
}

function OsiExplorer() {
  const [sel, setSel] = useState(7);
  const layer = OSI_LAYERS.find((l) => l.n === sel);
  return (
    <div className="osi">
      <div className="osi-stack" role="tablist" aria-label="OSI layers">
        {OSI_LAYERS.map((l) => (
          <button key={l.n} role="tab" aria-selected={sel === l.n} className={`osi-layer ${sel === l.n ? 'on' : ''}`} onClick={() => setSel(l.n)}>
            <span className="mono osi-n">L{l.n}</span><span>{l.name}</span><span className="dim osi-unit">{l.unit}</span>
          </button>
        ))}
      </div>
      <div className="card osi-detail" role="tabpanel">
        <h3>Layer {layer.n}: {layer.name}</h3>
        <dl>
          <dt>Responsibility</dt><dd>{layer.role}</dd>
          <dt>Protocols and standards</dt><dd className="mono">{layer.protocols}</dd>
          <dt>Examples</dt><dd>{layer.examples}</dd>
          <dt>Security considerations</dt><dd>{layer.security}</dd>
          <dt>Data unit</dt><dd>{layer.unit}</dd>
        </dl>
      </div>
    </div>
  );
}

function PortsTable() {
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return !s ? PORTS : PORTS.filter((p) => `${p.port} ${p.proto} ${p.service} ${p.note}`.toLowerCase().includes(s));
  }, [q]);
  return (
    <>
      <p className="alert alert-warn" role="note">These are default or conventional ports. A service can run on any port, and seeing a port open does not prove which service is behind it.</p>
      <div className="toolbar"><div className="search"><Search size={16} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by port or service, e.g. 5432 or SSH" aria-label="Search ports" /></div></div>
      {rows.length === 0 ? <Empty title="No ports match">Try another number or service name.</Empty> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Port</th><th>Protocol</th><th>Service</th><th>Security considerations</th></tr></thead>
          <tbody>{rows.map((p) => <tr key={`${p.port}-${p.service}`}><td className="mono">{p.port}</td><td className="mono">{p.proto}</td><td>{p.service}</td><td>{p.note}</td></tr>)}</tbody>
        </table></div>)}
    </>
  );
}

export default function Networking() {
  const { slug } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('topics');
  const [q, setQ] = useState('');
  const prog = useAsync(() => api.get('/api/topics/progress'), []);
  const doneSet = new Set((prog.data?.items || []).filter((p) => p.completed).map((p) => p.slug));

  const setDone = async (s, completed, score) => {
    try { await api.put(`/api/topics/${s}`, { completed, ...(score != null ? { score } : {}) }); prog.reload(); }
    catch (e) { toast(e.message, 'error'); }
  };

  if (slug) {
    const topic = TOPICS.find((t) => t.slug === slug);
    if (!topic) return <Empty title="Topic not found"><button className="btn" onClick={() => nav('/networking')}>Back to topics</button></Empty>;
    return <TopicDetail topic={topic} done={doneSet.has(slug)} onToggle={() => setDone(slug, !doneSet.has(slug))}
      onQuiz={(ok) => { if (ok) { setDone(slug, true, 100); toast('Correct. Topic marked as completed'); } }} />;
  }

  const filtered = TOPICS.filter((t) => `${t.title} ${t.definition}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <PageHeader title="Networking knowledge base" sub={`${doneSet.size} of ${TOPICS.length} topics completed`} />
      <div className="tabs" role="tablist" aria-label="Networking sections">
        {[['topics', 'Topics'], ['osi', 'OSI model'], ['ports', 'Common ports']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'topics' && (
        <>
          <div className="toolbar"><div className="search"><Search size={16} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topics" aria-label="Search topics" /></div></div>
          {prog.error && <ErrorBox error={prog.error} onRetry={prog.reload} />}
          {prog.loading && !prog.data && <Loader />}
          {filtered.length === 0 ? <Empty title="No topics match">Try a different word.</Empty> : (
            <div className="grid-2">{filtered.map((t) => (
              <Link key={t.slug} to={`/networking/${t.slug}`} className="card card-link">
                {doneSet.has(t.slug) ? <CheckCircle2 size={20} className="accent" aria-label="Completed" /> : <Circle size={20} className="dim" aria-label="Not completed" />}
                <div><h3>{t.title}</h3><p className="dim">{t.definition}</p></div>
              </Link>))}</div>)}
        </>)}
      {tab === 'osi' && <OsiExplorer />}
      {tab === 'ports' && <PortsTable />}
    </>
  );
}
