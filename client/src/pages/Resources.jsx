import { useState } from 'react';
import { CheckCircle2, ExternalLink, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { api, qs } from '../api.js';
import { useAsync, useDebounced } from '../lib/hooks.js';
import { Badge, ConfirmDialog, Empty, ErrorBox, Field, Loader, Modal, PageHeader, useToast } from '../components/Ui.jsx';
import { DIFFICULTIES } from '../lib/util.js';

const CATS = ['Linux', 'Networking', 'Python', 'Web Security', 'Cloud', 'Security Fundamentals', 'Career', 'Other'];
const TYPES = ['article', 'course', 'video', 'documentation', 'practice lab'];
const BLANK = { title: '', url: 'https://', category: 'Linux', difficulty: 'Beginner', type: 'article', notes: '', completed: false, favorite: false };

function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }

function ResourceForm({ item, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(item || BLANK);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { if (item) await api.put(`/api/resources/${item.id}`, f); else await api.post('/api/resources', f); toast('Resource saved'); onSaved(); onClose(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Modal title={item ? 'Edit resource' : 'Add resource'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="res-form" disabled={busy}>{busy ? 'Saving...' : 'Save resource'}</button></>}>
      <form id="res-form" onSubmit={submit}>
        <Field label="Title" htmlFor="r-title"><input id="r-title" value={f.title} onChange={set('title')} maxLength={200} required /></Field>
        <Field label="Official URL" htmlFor="r-url"><input id="r-url" type="url" value={f.url} onChange={set('url')} maxLength={500} required /></Field>
        <div className="grid-form">
          <Field label="Category" htmlFor="r-cat"><select id="r-cat" value={f.category} onChange={set('category')}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Difficulty" htmlFor="r-diff"><select id="r-diff" value={f.difficulty} onChange={set('difficulty')}>{DIFFICULTIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Type" htmlFor="r-type"><select id="r-type" value={f.type} onChange={set('type')}>{TYPES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <Field label="Personal notes" htmlFor="r-notes"><textarea id="r-notes" rows={3} value={f.notes} onChange={set('notes')} maxLength={4000} /></Field>
        {err && <div className="alert alert-error" role="alert">{err}</div>}
      </form>
    </Modal>
  );
}

export default function Resources() {
  const toast = useToast();
  const [q, setQ] = useState(''); const [category, setCategory] = useState(''); const [difficulty, setDifficulty] = useState(''); const [type, setType] = useState(''); const [filter, setFilter] = useState('');
  const dq = useDebounced(q, 250);
  const { data, error, loading, reload, setData } = useAsync(() => api.get(`/api/resources${qs({ q: dq, category, difficulty, type, filter })}`), [dq, category, difficulty, type, filter]);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);

  const patch = async (item, body) => {
    try { const u = await api.patch(`/api/resources/${item.id}`, body); setData({ items: data.items.map((x) => (x.id === item.id ? u : x)) }); } catch (e) { toast(e.message, 'error'); }
  };
  const remove = async () => { try { await api.del(`/api/resources/${del.id}`); toast('Resource deleted'); setDel(null); reload(); } catch (e) { toast(e.message, 'error'); setDel(null); } };

  return (
    <>
      <PageHeader title="Resource library" sub="Your own list of free learning material. Links are saved, not checked: availability and content are not verified automatically."
        actions={<button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={16} aria-hidden="true" /> Add resource</button>} />
      <div className="toolbar" role="search">
        <div className="search"><Search size={16} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, notes, link" aria-label="Search resources" /></div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category"><option value="">All categories</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty"><option value="">Any difficulty</option>{DIFFICULTIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type"><option value="">Any type</option>{TYPES.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Status"><option value="">All</option><option value="favorite">Favorites</option><option value="completed">Completed</option><option value="todo">Not completed</option></select>
      </div>
      {loading && !data && <Loader />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? <Empty title="No resources yet">{q || category || difficulty || type || filter ? 'Clear the filters to see everything.' : 'Add free courses, docs, videos and practice labs you want to work through.'}</Empty> : (
        <div className="stack">{data.items.map((r) => (
          <article key={r.id} className={`card ${r.completed ? 'is-done' : ''}`}>
            <div className="row-between">
              <h3 className="grow"><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title} <ExternalLink size={14} aria-hidden="true" /><span className="sr">(external link, opens in a new tab)</span></a></h3>
              <div className="row-gap">
                <button className={`btn btn-ghost btn-icon ${r.favorite ? 'on' : ''}`} aria-pressed={r.favorite} aria-label={r.favorite ? `Unfavorite ${r.title}` : `Favorite ${r.title}`} onClick={() => patch(r, { favorite: !r.favorite })}><Star size={18} fill={r.favorite ? 'currentColor' : 'none'} /></button>
                <button className={`btn btn-ghost btn-icon ${r.completed ? 'on' : ''}`} aria-pressed={r.completed} aria-label={r.completed ? `Mark ${r.title} not completed` : `Mark ${r.title} completed`} onClick={() => patch(r, { completed: !r.completed })}><CheckCircle2 size={18} /></button>
                <button className="btn btn-ghost btn-icon" aria-label={`Edit ${r.title}`} onClick={() => setEdit(r)}><Pencil size={16} /></button>
                <button className="btn btn-ghost btn-icon" aria-label={`Delete ${r.title}`} onClick={() => setDel(r)}><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="chips"><Badge>{r.type}</Badge><Badge>{r.category}</Badge><Badge>{r.difficulty}</Badge><Badge tone="badge-cyan">External: {hostOf(r.url)}</Badge></div>
            {r.notes && <p className="dim">{r.notes}</p>}
          </article>))}</div>))}
      {edit && <ResourceForm item={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={reload} />}
      {del && <ConfirmDialog title="Delete this resource?" message={`"${del.title}" will be removed from your library.`} onConfirm={remove} onClose={() => setDel(null)} />}
    </>
  );
}
