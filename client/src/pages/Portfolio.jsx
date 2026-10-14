import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ExternalLink, Printer, Wand2 } from 'lucide-react';
import { api } from '../api.js';
import { useSettings } from '../settings.js';
import { useAsync } from '../lib/hooks.js';
import { CopyButton, ErrorBox, Field, Loader, PageHeader, useToast } from '../components/Ui.jsx';
import { Markdown } from '../lib/markdown.jsx';
import { downloadFile } from '../lib/util.js';
import { portfolioMarkdown, suggestIntro } from '../lib/portfolio.js';
import { PortfolioView } from './PublicPortfolio.jsx';

export default function Portfolio() {
  const { settings, setSettings } = useSettings();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get('/api/portfolio/preview'), []);
  const [intro, setIntro] = useState(settings.portfolio_intro);
  const [github, setGithub] = useState(settings.github_url);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { portfolio, published, candidates } = data;
  const md = portfolioMarkdown(portfolio);
  const publicUrl = `${window.location.origin}/p`;

  const saveSettings = async (extra = {}) => {
    setBusy(true);
    try { setSettings(await api.put('/api/settings', { portfolio_intro: intro, github_url: github, ...extra })); toast('Portfolio settings saved'); reload(); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const setVisibility = async (lab, is_public) => {
    try { await api.patch(`/api/labs/${lab.id}/visibility`, { is_public }); reload(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Portfolio" sub="Turn completed labs into write-ups for internship applications. Nothing is public until you publish it."
        actions={<><button className="btn" onClick={() => downloadFile('portfolio.md', md, 'text/markdown')}><Download size={16} aria-hidden="true" /> Markdown file</button><button className="btn" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print</button></>} />

      <section className="card no-print" aria-labelledby="pub-h">
        <h2 id="pub-h">Publishing</h2>
        <p className={published ? 'accent' : 'dim'}>{published ? 'Published: anyone with the link can read the read-only page below.' : 'Not published: only you can see this preview.'}</p>
        <p className="dim small">The public page shows only your display name, intro, GitHub link, skills summary and the completed labs you select, using a fixed set of fields (not commands, mistakes, next steps, notes or settings). Check your write-ups for anything private before publishing. Evidence attachments are not supported.</p>
        <div className="row-gap wrap">
          <button className={`btn ${published ? '' : 'btn-primary'}`} disabled={busy} onClick={() => saveSettings({ portfolio_public: !published })}>{published ? 'Unpublish' : 'Publish portfolio'}</button>
          {published && <><a className="btn" href="/p" target="_blank" rel="noopener noreferrer">Open public page <ExternalLink size={14} aria-hidden="true" /></a><CopyButton text={publicUrl} label="Copy link" /></>}
        </div>
      </section>

      <section className="card no-print">
        <h2>Profile</h2>
        <Field label="GitHub profile link" htmlFor="pf-gh" hint="Must be on github.com. Leave empty to hide."><input id="pf-gh" type="url" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/yourname" /></Field>
        <Field label="Portfolio introduction" htmlFor="pf-intro"><textarea id="pf-intro" rows={5} maxLength={1500} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="A short paragraph about you and what you are learning." /></Field>
        <div className="row-gap wrap">
          <button className="btn btn-primary" disabled={busy} onClick={() => saveSettings()}>Save profile</button>
          <button className="btn" onClick={() => setIntro(suggestIntro(portfolio))}><Wand2 size={16} aria-hidden="true" /> Draft from my activity</button>
          <CopyButton text={intro || suggestIntro(portfolio)} label="Copy introduction" />
        </div>
      </section>

      <section className="card no-print">
        <h2>Choose public labs</h2>
        <p className="dim">Only completed labs can be added. <Link to="/labs">Complete a lab</Link> to see it here.</p>
        {candidates.length === 0 ? <p className="dim">No completed labs yet.</p> : candidates.map((l) => (
          <label key={l.id} className="check"><input type="checkbox" checked={l.is_public} onChange={(e) => setVisibility(l, e.target.checked)} /><span>{l.title} <small className="dim">({l.category})</small></span></label>))}
      </section>

      <h2 className="section-title no-print">Preview</h2>
      <PortfolioView p={portfolio} />

      <section className="card no-print"><h2>Markdown export</h2><div className="row-gap"><CopyButton text={md} label="Copy Markdown" /></div><details><summary>Show Markdown rendering</summary><Markdown text={md} /></details></section>
    </>
  );
}
