import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSettings } from '../settings.js';
import { ArrowLeft, Copy, Download, FlaskConical, Pencil, Plus, Printer, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { api, qs, todayLocal } from '../api.js';
import { useAsync, useDebounced } from '../lib/hooks.js';
import { Markdown } from '../lib/markdown.jsx';
import MdField from '../components/MdField.jsx';
import { Badge, ConfirmDialog, Empty, ErrorBox, Field, Loader, Modal, PageHeader, useToast } from '../components/Ui.jsx';
import { DIFFICULTIES, LAB_CATEGORIES, LAB_SECTIONS, STATUSES, STATUS_LABEL, downloadFile, fmtDate, fmtMinutes, labToMarkdown, slug } from '../lib/util.js';
import { BLANK_LAB, LAB_TEMPLATES } from '../data/labTemplates.js';

const statusTone = { planned: '', 'in-progress': 'badge-cyan', completed: 'badge-green' };
const diffTone = { Beginner: 'badge-green', Intermediate: 'badge-cyan', Advanced: 'badge-amber' };

const SAFETY_ITEMS = [
  'I own the target system or have explicit written authorization to test it.',
  'The target is an intentionally vulnerable lab or training environment.',
  'I understand the scope and the techniques that are allowed.',
  'No real user data will be accessed or exposed.',
  'Destructive actions are prohibited unless explicitly authorized.',
  'I will document my findings responsibly.',
];

// ---------------- list ----------------
export function LabList() {
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('date');
  const [page, setPage] = useState(1);
  const [del, setDel] = useState(null);
  const dq = useDebounced(q, 250);
  useEffect(() => { setPage(1); }, [dq, category, difficulty, status, sort]);
  const { data, error, loading, reload } = useAsync(() => api.get(`/api/labs${qs({ q: dq, category, difficulty, status, sort, page, limit: 20 })}`), [dq, category, difficulty, status, sort, page]);

  const duplicate = async (lab) => {
    try {
      const { id, created_at, updated_at, completed_at, ...rest } = lab; // eslint-disable-line no-unused-vars
      const copy = await api.post('/api/labs', { ...rest, title: `${lab.title} (copy)`, status: 'planned', lab_date: todayLocal(), observations: '', learned: '', mistakes: '', is_public: false, time_spent_min: 0 });
      toast('Lab duplicated'); nav(`/labs/${copy.id}/edit`);
    } catch (e) { toast(e.message, 'error'); }
  };
  const remove = async () => {
    try { await api.del(`/api/labs/${del.id}`); toast('Lab deleted'); setDel(null); reload(); } catch (e) { toast(e.message, 'error'); setDel(null); }
  };
  const exportAll = async () => {
    try { const all = await api.get('/api/labs?limit=200'); downloadFile('cyberlab-labs.json', JSON.stringify(all.items, null, 2), 'application/json'); }
    catch (e) { toast(e.message, 'error'); }
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <>
      <PageHeader title="Lab journal" sub="Document every practice lab: what you did, what you saw and what you learned."
        actions={<><button className="btn" onClick={exportAll}><Download size={16} aria-hidden="true" /> Export JSON</button><Link className="btn btn-primary" to="/labs/new"><Plus size={16} aria-hidden="true" /> New lab</Link></>} />
      <div className="toolbar" role="search">
        <div className="search"><Search size={16} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, objective, tags, commands" aria-label="Search labs" /></div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category"><option value="">All categories</option>{LAB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Filter by difficulty"><option value="">Any difficulty</option>{DIFFICULTIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">Any status</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort labs"><option value="date">Sort: date</option><option value="updated">Sort: recently edited</option><option value="difficulty">Sort: difficulty</option><option value="status">Sort: status</option></select>
      </div>
      {loading && !data && <Loader />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (data.items.length === 0
        ? <Empty title="No labs found" icon={FlaskConical}>{q || category || difficulty || status ? 'Clear the filters to see all labs.' : 'Create your first lab entry from a template.'}<div><Link className="btn btn-primary" to="/labs/new">New lab</Link></div></Empty>
        : <>
          <p className="dim" aria-live="polite">{data.total} lab{data.total === 1 ? '' : 's'}</p>
          <div className="stack">
            {data.items.map((l) => (
              <article key={l.id} className="card lab-card">
                <div className="lab-main">
                  <h3><Link to={`/labs/${l.id}`}>{l.title}</Link></h3>
                  <div className="chips"><Badge tone={statusTone[l.status]}>{STATUS_LABEL[l.status]}</Badge><Badge tone={diffTone[l.difficulty]}>{l.difficulty}</Badge><Badge>{l.category}</Badge><Badge>{fmtMinutes(l.time_spent_min)}</Badge>{l.is_public && <Badge tone="badge-cyan">Portfolio</Badge>}</div>
                  <p className="dim">{fmtDate(l.lab_date)}{l.tags ? ` · ${l.tags}` : ''}</p>
                </div>
                <div className="lab-actions">
                  <Link className="btn btn-ghost btn-icon" to={`/labs/${l.id}/edit`} aria-label={`Edit ${l.title}`}><Pencil size={16} /></Link>
                  <button className="btn btn-ghost btn-icon" onClick={() => duplicate(l)} aria-label={`Duplicate ${l.title}`}><Copy size={16} /></button>
                  <button className="btn btn-ghost btn-icon" onClick={() => setDel(l)} aria-label={`Delete ${l.title}`}><Trash2 size={16} /></button>
                </div>
              </article>))}
          </div>
          {pages > 1 && <div className="pager"><button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="mono dim">Page {page} of {pages}</span><button className="btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>}
        </>)}
      {del && <ConfirmDialog title="Delete this lab?" message={`"${del.title}" will be permanently deleted. Notes linked to it will be kept but unlinked.`} onConfirm={remove} onClose={() => setDel(null)} />}
    </>
  );
}

// ---------------- detail ----------------
export function LabDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data: lab, error, loading, reload } = useAsync(() => api.get(`/api/labs/${id}`), [id]);
  const [del, setDel] = useState(false);
  if (loading && !lab) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const remove = async () => { try { await api.del(`/api/labs/${lab.id}`); toast('Lab deleted'); nav('/labs'); } catch (e) { toast(e.message, 'error'); setDel(false); } };
  return (
    <article className="report">
      <Link to="/labs" className="back no-print"><ArrowLeft size={16} aria-hidden="true" /> All labs</Link>
      <PageHeader title={lab.title} actions={<div className="no-print row-gap">
        <Link className="btn" to={`/labs/${lab.id}/edit`}><Pencil size={16} aria-hidden="true" /> Edit</Link>
        <button className="btn" onClick={() => downloadFile(`${slug(lab.title)}.md`, labToMarkdown(lab), 'text/markdown')}><Download size={16} aria-hidden="true" /> Markdown</button>
        <button className="btn" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print</button>
        <button className="btn btn-danger" onClick={() => setDel(true)}><Trash2 size={16} aria-hidden="true" /> Delete</button></div>} />
      <div className="chips"><Badge tone={statusTone[lab.status]}>{STATUS_LABEL[lab.status]}</Badge><Badge tone={diffTone[lab.difficulty]}>{lab.difficulty}</Badge><Badge>{lab.category}</Badge><Badge>{fmtDate(lab.lab_date)}</Badge><Badge>{fmtMinutes(lab.time_spent_min)}</Badge>{lab.tags && <Badge>{lab.tags}</Badge>}</div>
      {LAB_SECTIONS.map(([key, label]) => lab[key] ? <section key={key} className="card report-sec"><h2>{label}</h2><Markdown text={lab[key]} /></section> : null)}
      {del && <ConfirmDialog title="Delete this lab?" message="This cannot be undone." onConfirm={remove} onClose={() => setDel(false)} />}
    </article>
  );
}

// ---------------- form ----------------
export function LabForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const editing = Boolean(id);
  const { settings } = useSettings();
  const [sp] = useSearchParams();
  const existing = useAsync(() => (editing ? api.get(`/api/labs/${id}`) : Promise.resolve(null)), [id]);
  const initialTpl = !editing ? LAB_TEMPLATES.find((t) => t.id === sp.get('template')) : null;
  const [form, setForm] = useState(() => ({ ...BLANK_LAB, category: settings.preferred_categories[0] || BLANK_LAB.category, ...(initialTpl || {}), lab_date: todayLocal() }));
  const [checks, setChecks] = useState(Array(SAFETY_ITEMS.length).fill(false));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState('');
  const [tplOpen, setTplOpen] = useState(!editing && !initialTpl);

  useEffect(() => {
    if (existing.data) {
      setForm({ ...BLANK_LAB, ...existing.data });
      setChecks(Array(SAFETY_ITEMS.length).fill(Boolean(existing.data.authorized_confirmed)));
    }
  }, [existing.data]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const input = (k) => ({ id: `lab-${k}`, value: form[k] ?? '', onChange: (e) => set(k)(e.target.value) });
  const allChecked = checks.every(Boolean);
  const exempt = form.category === 'Other';
  const needsSafety = form.status !== 'planned' && !exempt;

  const applyTemplate = (t) => { setForm((f) => ({ ...BLANK_LAB, ...t, lab_date: f.lab_date, id: undefined })); setTplOpen(false); };

  const submit = async (e) => {
    e.preventDefault();
    setErrors('');
    if (needsSafety && !allChecked) { setErrors('Confirm every item of the Practice Safely checklist before setting the status to In progress or Completed.'); return; }
    setBusy(true);
    const body = { ...form, authorized_confirmed: allChecked || exempt };
    delete body.id; delete body.created_at; delete body.updated_at; delete body.completed_at;
    try {
      const saved = editing ? await api.put(`/api/labs/${id}`, body) : await api.post('/api/labs', body);
      toast(editing ? 'Lab saved' : 'Lab created');
      nav(`/labs/${saved.id}`);
    } catch (err) { setErrors(err.message); } finally { setBusy(false); }
  };

  if (editing && existing.loading && !existing.data) return <Loader />;
  if (existing.error) return <ErrorBox error={existing.error} onRetry={existing.reload} />;

  return (
    <>
      <Link to={editing ? `/labs/${id}` : '/labs'} className="back"><ArrowLeft size={16} aria-hidden="true" /> Back</Link>
      <PageHeader title={editing ? 'Edit lab' : 'New lab'} actions={!editing && <button className="btn" onClick={() => setTplOpen(true)}>Choose template</button>} />
      <form onSubmit={submit} className="form stack" noValidate>
        <div className="card">
          <Field label="Lab title" htmlFor="lab-title"><input {...input('title')} maxLength={200} required placeholder="e.g. Inspect my network interfaces" /></Field>
          <div className="grid-form">
            <Field label="Date" htmlFor="lab-lab_date"><input type="date" {...input('lab_date')} /></Field>
            <Field label="Category" htmlFor="lab-category"><select {...input('category')}>{LAB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Difficulty" htmlFor="lab-difficulty"><select {...input('difficulty')}>{DIFFICULTIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Status" htmlFor="lab-status"><select {...input('status')}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
            <Field label="Time spent (minutes)" htmlFor="lab-time_spent_min"><input type="number" min="0" inputMode="numeric" {...input('time_spent_min')} /></Field>
            <Field label="Tags (comma separated)" htmlFor="lab-tags"><input {...input('tags')} placeholder="linux, networking" /></Field>
          </div>
        </div>

        <div className={`card safety ${needsSafety && !allChecked ? 'safety-warn' : ''}`}>
          <h2><ShieldCheck size={18} aria-hidden="true" /> Practice Safely checklist</h2>
          <p className="dim">{exempt ? 'Not required for the "Other" category (reflections and written notes).' : 'Required before a lab can be In progress or Completed. Permission to test one system never means permission to test another.'}</p>
          {SAFETY_ITEMS.map((t, i) => (
            <label key={i} className="check"><input type="checkbox" checked={checks[i]} onChange={(e) => setChecks(checks.map((c, j) => (j === i ? e.target.checked : c)))} /><span>{t}</span></label>))}
        </div>

        <div className="card">
          <MdField id="lab-objective" label="Learning objective" value={form.objective} onChange={set('objective')} rows={3} />
          <Field label="Authorized target or practice environment" htmlFor="lab-target_env"><input {...input('target_env')} placeholder="My own VM, OverTheWire, Juice Shop on localhost..." /></Field>
          <Field label="Tools used" htmlFor="lab-tools"><input {...input('tools')} placeholder="ip, dig, curl" /></Field>
          <MdField id="lab-commands" label="Commands executed" value={form.commands} onChange={set('commands')} rows={5} hint="Use a fenced block for highlighted code: three backticks, then bash." />
          <MdField id="lab-procedure" label="Step-by-step procedure" value={form.procedure} onChange={set('procedure')} rows={6} />
          <MdField id="lab-expected" label="Expected results" value={form.expected} onChange={set('expected')} rows={3} />
          <MdField id="lab-observations" label="Actual observations" value={form.observations} onChange={set('observations')} rows={5} />
          <MdField id="lab-learned" label="What I learned" value={form.learned} onChange={set('learned')} rows={4} />
          <MdField id="lab-mistakes" label="Mistakes and troubleshooting" value={form.mistakes} onChange={set('mistakes')} rows={4} />
          <MdField id="lab-security_lessons" label="Security lessons" value={form.security_lessons} onChange={set('security_lessons')} rows={4} />
          <MdField id="lab-recommendations" label="Defensive recommendations" value={form.recommendations} onChange={set('recommendations')} rows={3} hint="How would you prevent or detect what you found?" />
          <MdField id="lab-next_steps" label="Next steps" value={form.next_steps} onChange={set('next_steps')} rows={3} />
          <label className="check"><input type="checkbox" checked={form.is_public} onChange={(e) => set('is_public')(e.target.checked)} /><span>Include in my portfolio (only applies when the status is Completed; nothing is public until you publish the portfolio).</span></label>
          <p className="dim small">Screenshot and evidence attachments are not supported in this release. Note them in the observations text instead.</p>
        </div>

        {errors && <div className="alert alert-error" role="alert">{errors}</div>}
        <div className="form-actions"><button type="button" className="btn" onClick={() => nav(-1)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Create lab'}</button></div>
      </form>

      {tplOpen && (
        <Modal title="Start from a template" onClose={() => setTplOpen(false)} footer={<button className="btn" onClick={() => setTplOpen(false)}>Start blank</button>}>
          <div className="stack tight">
            {LAB_TEMPLATES.map((t) => (
              <button key={t.id} className="card card-link tpl" onClick={() => applyTemplate(t)}>
                <div><h3>{t.name}</h3><p className="dim">{t.category} · {t.difficulty}</p></div>
              </button>))}
          </div>
        </Modal>)}
    </>
  );
}
