import { Fragment } from 'react';
import { CopyButton } from '../components/Ui.jsx';

// Small, safe Markdown renderer. It builds React elements (no innerHTML), so user text cannot inject HTML.

const TOKEN = /(#.*$)|("[^"]*"|'[^']*')|(\$\{[^}]+\}|\$[A-Za-z_][\w]*|\$\()|(\s--?[A-Za-z][\w-]*)|(\b\d+(?:\.\d+){0,3}\b)/gm;

function highlightLine(line, key) {
  const out = [];
  let last = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line)) !== null) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const cls = m[1] ? 'tok-c' : m[2] ? 'tok-s' : m[3] ? 'tok-v' : m[4] ? 'tok-f' : 'tok-n';
    out.push(<span key={`${key}-${m.index}`} className={cls}>{m[0]}</span>);
    last = m.index + m[0].length;
    if (m[0].length === 0) TOKEN.lastIndex++;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function CodeBlock({ code, lang = '', label, warn }) {
  const plain = lang === 'text' || lang === 'output';
  return (
    <div className="code">
      <div className="code-head">
        <span className="mono dim">{label || lang || 'code'}</span>
        <CopyButton text={code} confirmMessage={warn} />
      </div>
      <pre tabIndex={0}><code>
        {code.split('\n').map((line, i) => (
          <Fragment key={i}>{plain ? line : highlightLine(line, i)}{'\n'}</Fragment>
        ))}
      </code></pre>
    </div>
  );
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
function inline(text, keyBase) {
  const out = [];
  let last = 0;
  let m;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${m.index}`;
    if (m[1]) out.push(<code key={k} className="inline-code">{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{m[2].slice(2, -2)}</strong>);
    else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(m[3]);
      out.push(<a key={k} href={mm[2]} target="_blank" rel="noopener noreferrer nofollow">{mm[1]}</a>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function parse(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  const special = (l) => /^(```|#{1,4}\s|\s*[-*]\s+|\s*\d+\.\s+|>\s?)/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      i++;
      blocks.push({ t: 'code', lang, body: body.join('\n') });
    } else if (/^#{1,4}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      blocks.push({ t: 'h', level, text: line.replace(/^#+\s+/, '') }); i++;
    } else if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''));
      blocks.push({ t: 'ul', items });
    } else if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ''));
      blocks.push({ t: 'ol', items });
    } else if (/^>\s?/.test(line)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ t: 'quote', text: q.join(' ') });
    } else if (line.trim() === '') {
      i++;
    } else {
      const p = [];
      while (i < lines.length && lines[i].trim() !== '' && !special(lines[i])) p.push(lines[i++]);
      if (p.length === 0) { p.push(lines[i++]); }
      blocks.push({ t: 'p', text: p.join(' ') });
    }
  }
  return blocks;
}

export function Markdown({ text }) {
  if (!text || !text.trim()) return <p className="dim">Nothing written yet.</p>;
  return (
    <div className="md">
      {parse(text).map((b, i) => {
        if (b.t === 'code') return <CodeBlock key={i} code={b.body} lang={b.lang} />;
        if (b.t === 'h') { const H = `h${Math.min(b.level + 2, 6)}`; return <H key={i}>{inline(b.text, i)}</H>; }
        if (b.t === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</ul>;
        if (b.t === 'ol') return <ol key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</ol>;
        if (b.t === 'quote') return <blockquote key={i}>{inline(b.text, i)}</blockquote>;
        return <p key={i}>{inline(b.text, i)}</p>;
      })}
    </div>
  );
}
