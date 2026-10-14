import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Pin, Plus, Search, Star, Trash2 } from 'lucide-react';
import { api, qs } from '../api.js';
import { useAsync, useDebounced } from '../lib/hooks.js';
import MdField from '../components/MdField.jsx';
import { ConfirmDialog, Empty, ErrorBox, Field, Loader, PageHeader, useToast } from '../components/Ui.jsx';
import { NOTE_CATEGORIES, downloadFile, fmtDate, noteToMarkdown, slug } from '../lib/util.js';

function Editor({ note, labs, onChange, onDeleted, onBack }) {
  const toast = useToast();
  const [draft, setDraft] = useState(note);
  const [status, setStatus] = useState('saved'); // saved | dirty | saving | error
  const [del, setDel] = useState(false);
  const first = useRef(true);
  const version = useRef(0);

  const save = useCallback(async (d) => {
    const v = ++version.current;
    setStatus('saving');
    try {
      const saved = await api.put(`/api/notes/${d.id}`, d);
      if (v === version.current) { setStatus('saved'); onChange({ ...saved, lab_title: labs.find((l) => l.id === saved.lab_id)?.title || null }); }
    } catch (e) { if (v === version.current) { setStatus('error'); toast(`Autosave failed: ${e.message}`, 'error'); } }
  }, [labs, onChange, toast]);

  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    setStatus('dirty');
    const t = setTimeout(() => save(draft), 800);
    return () => clearTimeout(t);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  const toggle = async (k) => { const next = { ...draft, [k]: !draft[k] }; setDraft(next); first.current = true; await save(next); };
  const remove = async () => { try { await api.del(`/api/notes/${draft.id}`); toast('Note deleted'); onDeleted(draft.id); } catch (e) { toast(e.message, 'error'); setDel(false); } };
  const label = { saved: 'Saved', dirty: 'Unsaved changes...', saving: 'Saving...', error: 'Not saved. Retrying on next edit' }[status];

  return (
    <div className="card editor">
      <div className="editor-top">
        <button className="btn btn-ghost back-mobile" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Notes</button>
        <span className={`save-state mono save-${status}`} role="status" aria-live="polite">{label}</span>
        <div className="row-gap">
          <button className={`btn btn-ghost btn-icon ${draft.pinned ? 'on' : ''}`} aria-pressed={draft.pinned} aria-label={draft.pinned ? 'Unpin note' : 'Pin note'} onClick={() => toggle('pinned')}><Pin size={18} fill={draft.pinned ? 'currentColor' : 'none'} /></button>
          <button className={`btn btn-ghost btn-icon ${draft.favorite ? 'on' : ''}`} aria-pressed={draft.favorite} aria-label={draft.favorite ? 'Remove favorite' : 'Favorite note'} onClick={() => toggle('favorite')}><Star size={18} fill={draft.favorite ? 'currentColor' : 'none'} /></button>
          <button className="btn btn-ghost btn-icon" aria-label="Export note as Markdown" onClick={() => downloadFile(`${slug(draft.title)}.md`, noteToMarkdown(draft), 'text/markdown')}><Download size={18} /></button>
          <button className="btn btn-ghost btn-icon" aria-label="Delete note" onClick={() => setDel(true)}><Trash2 size={18} /></button>
        </div>
      </div>
      <Field label="Title" htmlFor="n-title"><input id="n-title" value={draft.title} maxLength={200} onChange={(e) => set('title')(e.target.value)} /></Field>
      <div className="grid-form">
        <Field label="Category" htmlFor="n-cat"><select id="n-cat" value={draft.category} onChange={(e) => set('category')(e.target.value)}>{NOTE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Tags (comma separated)" htmlFor="n-tags"><input id="n-tags" value={draft.tags} onChange={(e) => set('tags')(e.target.value)} /></Field>
        <Field label="Linked lab" htmlFor="n-lab"><select id="n-lab" value={draft.lab_id ?? ''} onChange={(e) => set('lab_id')(e.target.value ? Number(e.target.value) : null)}><option value="">None</option>{labs.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select></Field>
      </div>
      <MdField id="n-body" label="Note (Markdown supported)" value={draft.body} onChange={set('body')} rows={14} placeholder={'Write notes here.\n\n```bash\nls -la\n```'} />
      {del && <ConfirmDialog title="Delete this note?" message={`"${draft.title}" will be permanently deleted.`} onConfirm={remove} onClose={() => setDel(false)} />}
    </div>
  );
}

export default function Notes() {
  const toast = useToast();
  const loc = useLocation();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(loc.state?.open || null);
  const dq = useDebounced(q, 250);
  const { data, error, loading, reload, setData } = useAsync(() => api.get(`/api/notes${qs({ q: dq, category, filter })}`), [dq, category, filter]);
  const labsReq = useAsync(() => api.get('/api/labs?limit=200&sort=updated'), []);
  const labs = labsReq.data?.items || [];
  const current = data?.items.find((n) => n.id === selected) || null;

  const create = async () => {
    try {
      const n = await api.post('/api/notes', { title: 'Untitled note', category: category || 'Linux', body: '' });
      setSelected(n.id); reload();
    } catch (e) { toast(e.message, 'error'); }
  };
  const onChange = useCallback((n) => setData((d) => d && ({ ...d, items: d.items.map((x) => (x.id === n.id ? { ...x, ...n } : x)) })), [setData]);
  const exportAll = async (fmt) => {
    try {
      const all = await api.get('/api/notes?limit=200');
      if (fmt === 'json') downloadFile('cyberlab-notes.json', JSON.stringify(all.items, null, 2), 'application/json');
      else downloadFile('cyberlab-notes.md', all.items.map(noteToMarkdown).join('\n---\n\n'), 'text/markdown');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Notes" sub="Your searchable knowledge vault. Changes autosave."
        actions={<><button className="btn" onClick={() => exportAll('md')}><Download size={16} aria-hidden="true" /> Markdown</button><button className="btn" onClick={() => exportAll('json')}><Download size={16} aria-hidden="true" /> JSON</button><button className="btn btn-primary" onClick={create}><Plus size={16} aria-hidden="true" /> New note</button></>} />
      <div className={`notes-layout ${current ? 'has-open' : ''}`}>
        <div className="notes-list">
          <div className="toolbar stacked" role="search">
            <div className="search"><Search size={16} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" aria-label="Search notes" /></div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category"><option value="">All categories</option>{NOTE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show"><option value="">All notes</option><option value="pinned">Pinned</option><option value="favorite">Favorites</option></select>
          </div>
          {loading && !data && <Loader />}
          {error && <ErrorBox error={error} onRetry={reload} />}
          {data && (data.items.length === 0
            ? <Empty title="No notes found">{q || category || filter ? 'Clear the filters to see all notes.' : 'Create a note to capture what you learn in class or in the lab.'}</Empty>
            : <ul className="note-items">{data.items.map((n) => (
              <li key={n.id}><button className={`note-item ${n.id === selected ? 'on' : ''}`} onClick={() => setSelected(n.id)}>
                <span className="note-title">{n.pinned && <Pin size={12} aria-label="Pinned" />} {n.favorite && <Star size={12} aria-label="Favorite" />} {n.title}</span>
                <small className="dim">{n.category} · {fmtDate(n.updated_at)}</small>
                {n.lab_title && <small className="dim">Lab: {n.lab_title}</small>}
              </button></li>))}</ul>)}
        </div>
        <div className="notes-editor">
          {current
            ? <Editor key={current.id} note={current} labs={labs} onChange={onChange} onBack={() => setSelected(null)} onDeleted={(id) => { setSelected(null); setData((d) => ({ ...d, items: d.items.filter((x) => x.id !== id) })); }} />
            : <Empty title="Select a note">Pick a note from the list or create a new one.</Empty>}
        </div>
      </div>
    </>
  );
}
