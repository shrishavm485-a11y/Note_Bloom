import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronDown, Search, Star, Terminal } from 'lucide-react';
import { api, qs } from '../api.js';
import { useAsync, useDebounced } from '../lib/hooks.js';
import { CodeBlock } from '../lib/markdown.jsx';
import Explain from '../components/Explain.jsx';
import { Empty, ErrorBox, Loader, PageHeader, RiskBadge, useToast } from '../components/Ui.jsx';

const CATEGORIES = ['File and directory management', 'File permissions', 'Users and groups', 'Processes and services', 'System monitoring', 'Networking', 'Package management', 'Text processing', 'Logs and troubleshooting', 'Shell scripting'];

const WARN = {
  Destructive: 'Destructive command: this can permanently delete data. Double-check the path and only run it on files you own, ideally in a practice folder or VM.',
  Caution: 'Use caution: this command can overwrite files, change permissions or settings, or needs administrator (sudo) rights. Understand it before running it, and only on systems you own or administer.',
};

function CommandCard({ cmd, onState }) {
  const [open, setOpen] = useState(false);
  const warn = WARN[cmd.risk];
  const confirmCopy = cmd.risk === 'Destructive' ? 'This is a DESTRUCTIVE command. Copy it only if you understand exactly what it will delete. Continue?' : undefined;
  return (
    <article className={`card cmd ${cmd.understood ? 'is-done' : ''}`}>
      <div className="cmd-head">
        <button className="cmd-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={`cmd-${cmd.id}`}>
          <Terminal size={16} aria-hidden="true" />
          <span className="mono cmd-name">{cmd.name}</span>
          <RiskBadge risk={cmd.risk} />
          <ChevronDown size={18} aria-hidden="true" className={`chev ${open ? 'open' : ''}`} />
        </button>
        <div className="cmd-actions">
          <button className={`btn btn-ghost btn-icon ${cmd.favorite ? 'on' : ''}`} onClick={() => onState(cmd, { favorite: !cmd.favorite })} aria-pressed={cmd.favorite} aria-label={cmd.favorite ? `Remove ${cmd.name} from favorites` : `Add ${cmd.name} to favorites`}><Star size={18} fill={cmd.favorite ? 'currentColor' : 'none'} /></button>
          <button className={`btn btn-ghost btn-icon ${cmd.understood ? 'on' : ''}`} onClick={() => onState(cmd, { understood: !cmd.understood })} aria-pressed={cmd.understood} aria-label={cmd.understood ? `Unmark ${cmd.name} as understood` : `Mark ${cmd.name} as understood`}><CheckCircle2 size={18} /></button>
        </div>
      </div>
      <p className="dim cmd-cat">{cmd.category}</p>
      <p>{cmd.description}</p>
      {open && (
        <div id={`cmd-${cmd.id}`} className="cmd-body">
          {warn && <div className={`alert ${cmd.risk === 'Destructive' ? 'alert-error' : 'alert-warn'}`} role="note"><AlertTriangle size={18} aria-hidden="true" /><div>{warn}</div></div>}
          <Explain en={cmd.description} hi={cmd.hindi} />
          <h4>Syntax</h4>
          <CodeBlock code={cmd.syntax} lang="bash" label="syntax" warn={confirmCopy} />
          <h4>Practical example</h4>
          <CodeBlock code={cmd.example} lang="bash" label="example" warn={confirmCopy} />
          <h4>Expected sample output</h4>
          <CodeBlock code={cmd.sample_output} lang="output" label="output" />
          <h4>Important flags</h4>
          <ul className="flags mono">{cmd.flags.split('\n').map((f, i) => <li key={i}>{f}</li>)}</ul>
          <h4>Common mistakes</h4>
          <p>{cmd.mistakes}</p>
          <p className="dim small">This page is a learning reference. Nothing here is executed on the server.</p>
        </div>
      )}
    </article>
  );
}

export default function Commands() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [category, setCategory] = useState('');
  const [risk, setRisk] = useState('');
  const [filter, setFilter] = useState('');
  const dq = useDebounced(q, 250);
  const { data, error, loading, reload, setData } = useAsync(() => api.get(`/api/commands${qs({ q: dq, category, risk, filter })}`), [dq, category, risk, filter]);
  useEffect(() => { if (params.get('q')) setParams({}, { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onState = async (cmd, patch) => {
    try {
      const s = await api.patch(`/api/commands/${cmd.id}/state`, patch);
      setData({ ...data, items: data.items.map((c) => (c.id === cmd.id ? { ...c, favorite: s.favorite, understood: s.understood } : c)) });
    } catch (e) { toast(e.message, 'error'); reload(); }
  };

  return (
    <>
      <PageHeader title="Linux command reference" sub="Learn what a command does before you run it. Everything here is a reference; nothing is executed for you." />
      <div className="toolbar" role="search">
        <div className="search"><Search size={16} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search commands, e.g. permissions" aria-label="Search commands" /></div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Filter by risk level"><option value="">Any risk</option><option>Safe</option><option>Caution</option><option>Destructive</option></select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status"><option value="">All</option><option value="favorite">Favorites</option><option value="understood">Understood</option><option value="todo">Not yet understood</option></select>
      </div>
      {loading && !data && <Loader />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (data.items.length === 0
        ? <Empty title="No commands match">Try a different search or clear the filters.</Empty>
        : <><p className="dim" aria-live="polite">{data.total} command{data.total === 1 ? '' : 's'}</p><div className="stack">{data.items.map((c) => <CommandCard key={c.id} cmd={c} onState={onState} />)}</div></>)}
    </>
  );
}
