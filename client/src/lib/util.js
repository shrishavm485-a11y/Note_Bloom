export const LAB_CATEGORIES = ['Linux', 'Networking', 'Ethical Hacking', 'Cloud', 'Security Fundamentals', 'Other'];
export const NOTE_CATEGORIES = ['Linux', 'Networking', 'Python', 'C', 'Web Security', 'Cloud Security', 'Operating Systems', 'DBMS', 'Mathematics', 'Internship Preparation'];
export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
export const STATUSES = ['planned', 'in-progress', 'completed'];
export const STATUS_LABEL = { planned: 'Planned', 'in-progress': 'In progress', completed: 'Completed' };

export function downloadFile(name, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (s) => (s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'untitled';

export const fmtDate = (d) => {
  if (!d) return '';
  const date = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
export const fmtMinutes = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch { return false; }
  }
}

const SECTIONS = [
  ['objective', 'Learning objective'], ['target_env', 'Authorized target / practice environment'], ['tools', 'Tools used'],
  ['commands', 'Commands executed'], ['procedure', 'Step-by-step procedure'], ['expected', 'Expected results'],
  ['observations', 'Actual observations'], ['learned', 'What I learned'], ['mistakes', 'Mistakes and troubleshooting'],
  ['security_lessons', 'Security lessons'], ['recommendations', 'Defensive recommendations'], ['next_steps', 'Next steps'],
];
export const LAB_SECTIONS = SECTIONS;

export function labToMarkdown(l) {
  const lines = [`# ${l.title}`, '',
    `- **Date:** ${l.lab_date}`, `- **Category:** ${l.category}`, `- **Difficulty:** ${l.difficulty}`,
    `- **Status:** ${STATUS_LABEL[l.status] || l.status}`, `- **Time spent:** ${fmtMinutes(l.time_spent_min || 0)}`];
  if (l.tags) lines.push(`- **Tags:** ${l.tags}`);
  lines.push('');
  for (const [key, label] of SECTIONS) if (l[key]) lines.push(`## ${label}`, '', l[key], '');
  return lines.join('\n');
}

export function noteToMarkdown(n) {
  return `# ${n.title}\n\n- **Category:** ${n.category}${n.tags ? `\n- **Tags:** ${n.tags}` : ''}\n\n${n.body || ''}\n`;
}
