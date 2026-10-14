import { useState } from 'react';
import { Markdown } from '../lib/markdown.jsx';

// Textarea with a Write / Preview switch. Supports Markdown and fenced code blocks.
export default function MdField({ id, label, value, onChange, rows = 5, placeholder, hint }) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="field">
      <div className="field-row">
        <label htmlFor={id}>{label}</label>
        <div className="seg" role="group" aria-label={`${label} mode`}>
          <button type="button" className={!preview ? 'on' : ''} onClick={() => setPreview(false)}>Write</button>
          <button type="button" className={preview ? 'on' : ''} onClick={() => setPreview(true)}>Preview</button>
        </div>
      </div>
      {preview
        ? <div className="preview"><Markdown text={value} /></div>
        : <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} spellCheck="false" />}
      {hint && <small className="dim">{hint}</small>}
    </div>
  );
}
