// Builds Markdown and an introduction from portfolio data. Used by both the private preview and the public page.
export function portfolioMarkdown(p) {
  const out = [`# ${p.name}: Cybersecurity Learning Portfolio`, ''];
  if (p.intro) out.push(p.intro, '');
  if (p.github_url) out.push(`GitHub: ${p.github_url}`, '');
  out.push('## Skills summary', '', `- Completed labs: ${p.skills.labsCompleted} (${p.skills.labHours} hours)`);
  if (p.skills.categories.length) out.push(`- Areas: ${p.skills.categories.map((c) => `${c.name} (${c.count})`).join(', ')}`);
  if (p.skills.tools.length) out.push(`- Tools: ${p.skills.tools.join(', ')}`);
  out.push(`- Linux commands understood: ${p.skills.commandsUnderstood}`, `- Networking topics completed: ${p.skills.networkingTopicsCompleted}`, '');
  for (const l of p.labs) {
    out.push(`## ${l.title}`, '', `*${l.category} · ${l.difficulty} · ${l.lab_date}*`, '');
    for (const [k, label] of WRITEUP) if (l[k]) out.push(`### ${label}`, '', l[k], '');
  }
  return out.join('\n');
}

export const WRITEUP = [
  ['objective', 'Problem / learning objective'], ['target_env', 'Environment'], ['tools', 'Tools'], ['procedure', 'Methodology'],
  ['observations', 'Key observations'], ['security_lessons', 'Security findings'], ['recommendations', 'Defensive recommendations'], ['learned', 'Lessons learned'],
];

export function suggestIntro(p) {
  const areas = p.skills.categories.slice(0, 3).map((c) => c.name.toLowerCase());
  const areaText = areas.length ? areas.join(', ') : 'Linux, networking and cloud security';
  const hours = p.skills.labHours ? ` I have logged ${p.skills.labHours} hours of hands-on practice across ${p.skills.labsCompleted} documented labs.` : '';
  return `Hi, I'm ${p.name}, a Computer Science student building practical skills in ${areaText}. I document every lab I do on authorized or intentionally vulnerable systems, including what I tried, what I observed and how to defend against it.${hours} I'm looking for an internship where I can keep learning and contribute to defensive security work.`;
}
