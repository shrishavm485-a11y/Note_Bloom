import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Inbox, X } from 'lucide-react';
import { copyText } from '../lib/util.js';

// ---------- toasts ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l.slice(-3), { id, message, type }]);
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), type === 'error' ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- brand ----------
export function Wordmark({ small }) {
  return (
    <div className={`wordmark ${small ? 'wordmark-sm' : ''}`} aria-label="CyberLab">
      <span className="wm-bracket">[</span><span className="wm-cyber">CYBER</span><span className="wm-lab">LAB</span><span className="wm-cursor" aria-hidden="true">_</span><span className="wm-bracket">]</span>
    </div>
  );
}

export function Loader({ label = 'Loading' }) {
  return (
    <div className="loader" role="status">
      <div className="loader-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <span className="mono dim">{label}...</span>
    </div>
  );
}

export function BootScreen() {
  return (
    <div className="boot"><Wordmark /><Loader label="Initialising workspace" /></div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="alert alert-error" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <div>
        <strong>Something went wrong.</strong>
        <div>{error?.message || 'Unknown error'}</div>
        {onRetry && <button className="btn btn-sm" onClick={onRetry}>Try again</button>}
      </div>
    </div>
  );
}

export function Empty({ title, children, icon: Icon = Inbox }) {
  return (
    <div className="empty">
      <Icon size={28} aria-hidden="true" />
      <h3>{title}</h3>
      {children && <div className="dim">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, actions }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="dim">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

// ---------- badges ----------
export function RiskBadge({ risk }) {
  return <span className={`badge risk-${risk.toLowerCase()}`}>{risk}</span>;
}
export function Badge({ children, tone = '' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

// ---------- copy ----------
export function CopyButton({ text, confirmMessage, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  const onClick = async () => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const ok = await copyText(text);
    if (ok) { setDone(true); setTimeout(() => setDone(false), 1500); } else toast('Copy failed. Select the text and copy it manually.', 'error');
  };
  return (
    <button type="button" className="btn btn-sm btn-ghost" onClick={onClick} aria-label={`${label} to clipboard`}>
      {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {done ? 'Copied' : label}
    </button>
  );
}

// ---------- modal ----------
export function Modal({ title, onClose, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const first = ref.current?.querySelector('input, select, textarea, button:not(.modal-x)');
    (first || ref.current)?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon modal-x" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onClose, busy }) {
  return (
    <Modal title={title} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Working...' : confirmLabel}</button></>}>
      <p>{message}</p>
    </Modal>
  );
}

// ---------- form helpers ----------
export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small className="dim">{hint}</small>}
    </div>
  );
}
