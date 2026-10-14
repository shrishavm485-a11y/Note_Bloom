import { useState } from 'react';
import { ExternalLink, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useAsync } from '../lib/hooks.js';
import { ConfirmDialog, Empty, ErrorBox, Field, Loader, Modal, PageHeader, useToast } from '../components/Ui.jsx';

const RULES = [
  'I own the target system or have explicit written authorization to test it.',
  'The target is an intentionally vulnerable lab or training environment.',
  'I understand the scope and the techniques that are allowed.',
  'No real user data will be accessed or exposed.',
  'Destructive actions are prohibited unless explicitly authorized.',
  'Findings will be documented responsibly.',
];

function PlatformForm({ platform, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(platform || { name: '', description: '', level: '', url: 'https://' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (platform) await api.put(`/api/platforms/${platform.id}`, f); else await api.post('/api/platforms', f);
      toast('Platform saved'); onSaved(); onClose();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Modal title={platform ? 'Edit platform' : 'Add platform'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="plat-form" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button></>}>
      <form id="plat-form" onSubmit={submit}>
        <Field label="Name" htmlFor="p-name"><input id="p-name" value={f.name} onChange={set('name')} maxLength={100} required /></Field>
        <Field label="Official website URL" htmlFor="p-url"><input id="p-url" type="url" value={f.url} onChange={set('url')} maxLength={500} required /></Field>
        <Field label="Skill level" htmlFor="p-level"><input id="p-level" value={f.level} onChange={set('level')} maxLength={60} placeholder="Beginner" /></Field>
        <Field label="Description" htmlFor="p-desc"><textarea id="p-desc" rows={3} value={f.description} onChange={set('description')} maxLength={600} /></Field>
        {err && <div className="alert alert-error" role="alert">{err}</div>}
      </form>
    </Modal>
  );
}

export default function Safety() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get('/api/platforms'), []);
  const [edit, setEdit] = useState(null); // null | {} (new) | platform
  const [del, setDel] = useState(null);
  const remove = async () => { try { await api.del(`/api/platforms/${del.id}`); toast('Platform removed'); setDel(null); reload(); } catch (e) { toast(e.message, 'error'); setDel(null); } };
  return (
    <>
      <PageHeader title="Practice safely" sub="Learn offensive and defensive skills legally and ethically." />
      <section className="card safety" aria-labelledby="rules-h">
        <h2 id="rules-h"><ShieldCheck size={18} aria-hidden="true" /> Before every lab, verify</h2>
        <ul className="rules">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
        <p className="alert alert-warn" role="note">Permission to test one system does not imply permission to test another. If you are unsure whether you are authorized, you are not. Stop and ask.</p>
        <p className="dim">CyberLab Journal is for learning and documentation. It does not include tools for unauthorized access, credential theft, malware, stealth or persistence, and it never runs commands on a server.</p>
      </section>

      <div className="row-between wrap section-gap">
        <h2 className="section-title no-margin">Legitimate practice platforms</h2>
        <button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={16} aria-hidden="true" /> Add platform</button>
      </div>
      <p className="dim">This list is editable reference data. Skill levels and descriptions are summaries; check each official site for current content, pricing and rules. Links open in a new tab.</p>
      {loading && !data && <Loader />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? <Empty title="No platforms listed">Add a legitimate practice platform.</Empty> : (
        <div className="grid-2">{data.items.map((p) => (
          <article key={p.id} className="card platform">
            <h3>{p.name}</h3>
            {p.level && <span className="badge">{p.level}</span>}
            <p>{p.description}</p>
            <div className="row-between">
              <a className="btn btn-sm" href={p.url} target="_blank" rel="noopener noreferrer">Visit official site <ExternalLink size={14} aria-hidden="true" /><span className="sr">(opens in a new tab)</span></a>
              <div className="row-gap">
                <button className="btn btn-ghost btn-icon" onClick={() => setEdit(p)} aria-label={`Edit ${p.name}`}><Pencil size={16} /></button>
                <button className="btn btn-ghost btn-icon" onClick={() => setDel(p)} aria-label={`Remove ${p.name}`}><Trash2 size={16} /></button>
              </div>
            </div>
          </article>))}</div>))}
      {edit && <PlatformForm platform={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={reload} />}
      {del && <ConfirmDialog title="Remove this platform?" message={`"${del.name}" will be removed from your list.`} confirmLabel="Remove" onConfirm={remove} onClose={() => setDel(null)} />}
    </>
  );
}
