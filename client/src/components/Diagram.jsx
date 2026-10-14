import { useState } from 'react';

// Responsive SVG reference diagram. Click or focus a node to read what it does.
export default function Diagram({ diagram }) {
  const [sel, setSel] = useState(diagram.nodes[0].id);
  const byId = Object.fromEntries(diagram.nodes.map((n) => [n.id, n]));
  const node = byId[sel];
  const center = (n) => ({ cx: n.x + n.w / 2, top: n.y, bottom: n.y + n.h, cy: n.y + n.h / 2 });
  return (
    <figure className="diagram">
      <svg viewBox={`0 0 360 ${diagram.h}`} role="group" aria-label={`${diagram.title} diagram`} preserveAspectRatio="xMidYMin meet">
        <defs>
          <marker id={`ah-${diagram.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" className="dg-arrow" /></marker>
        </defs>
        {diagram.edges.map(([a, b]) => {
          const A = byId[a]; const B = byId[b];
          const ca = center(A); const cb = center(B);
          const down = cb.top >= ca.bottom - 1;
          const x1 = down ? ca.cx : (cb.cx > ca.cx ? A.x + A.w : A.x);
          const y1 = down ? ca.bottom : ca.cy;
          const x2 = down ? cb.cx : (cb.cx > ca.cx ? B.x : B.x + B.w);
          const y2 = down ? cb.top : cb.cy;
          return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} className="dg-edge" markerEnd={`url(#ah-${diagram.id})`} />;
        })}
        {diagram.nodes.map((n) => (
          <g key={n.id} tabIndex={0} role="button" aria-pressed={sel === n.id} aria-label={n.label} className={`dg-node ${sel === n.id ? 'on' : ''}`}
            onClick={() => setSel(n.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(n.id); } }}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="5" />
            <text x={n.x + n.w / 2} y={n.y + n.h / 2} textAnchor="middle" dominantBaseline="central">{n.label}</text>
          </g>
        ))}
      </svg>
      <figcaption>
        <p><b>{node.label}.</b> {node.desc}</p>
        <p className="dim small">{diagram.summary}</p>
        <p className="dim small">Educational reference architecture. It is not a guaranteed production-ready security design.</p>
      </figcaption>
    </figure>
  );
}
