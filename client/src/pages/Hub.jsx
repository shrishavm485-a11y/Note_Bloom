import { Link } from 'react-router-dom';
import { Cloud, Terminal, Network, ShieldCheck, Settings, Brain, Map, Timer, Briefcase, Library, ChevronRight } from 'lucide-react';
import { Badge, PageHeader } from '../components/Ui.jsx';

const ITEMS = {
  learn: {
    title: 'Learn', sub: 'Reference libraries and practice tools.',
    live: [
      { to: '/commands', icon: Terminal, title: 'Linux command reference', text: '34 commands with English and Romanized Hindi explanations, examples and risk levels.' },
      { to: '/networking', icon: Network, title: 'Networking knowledge base', text: '16 topics, an interactive OSI model and a searchable ports table.' },
      { to: '/cloud', icon: Cloud, title: 'Cloud security workspace', text: '16 concepts, AWS / Azure / GCP mapping and 5 reference diagrams.' },
      { to: '/quiz', icon: Brain, title: 'Quizzes and flashcards', text: '47 questions with explanations, score tracking and spaced review.' },
      { to: '/roadmap', icon: Map, title: 'Learning roadmap', text: 'Ten stages from Linux basics to internship preparation.' },
      { to: '/timer', icon: Timer, title: 'Study timer', text: 'Pomodoro timer, goals, streak and a progress calendar.' },
    ],
    later: [],
  },
  more: {
    title: 'More', sub: 'Everything else in your workspace.',
    live: [
      { to: '/portfolio', icon: Briefcase, title: 'Portfolio', text: 'Turn completed labs into write-ups and optionally publish a read-only page.' },
      { to: '/resources', icon: Library, title: 'Resource library', text: 'Save and organise free learning material.' },
      { to: '/timer', icon: Timer, title: 'Study timer', text: 'Focus sessions and study history.' },
      { to: '/quiz', icon: Brain, title: 'Quizzes', text: 'Practice and review.' },
      { to: '/roadmap', icon: Map, title: 'Roadmap', text: 'Track your learning stages.' },
      { to: '/cloud', icon: Cloud, title: 'Cloud security', text: 'Concepts and diagrams.' },
      { to: '/commands', icon: Terminal, title: 'Linux commands', text: 'Searchable command library.' },
      { to: '/networking', icon: Network, title: 'Networking', text: 'Topics, OSI model and ports.' },
      { to: '/safety', icon: ShieldCheck, title: 'Practice Safely', text: 'Authorization checklist and legitimate practice platforms.' },
      { to: '/settings', icon: Settings, title: 'Settings', text: 'Profile, goals, timer, export and reset.' },
    ],
    later: [],
  },
  notfound: { title: 'Page not found', sub: 'That address does not exist in this workspace.', live: [{ to: '/', icon: ChevronRight, title: 'Back to dashboard', text: '' }], later: [] },
};

export function Hub({ kind }) {
  const cfg = ITEMS[kind];
  return (
    <>
      <PageHeader title={cfg.title} sub={cfg.sub} />
      <div className="grid-2">
        {cfg.live.map(({ to, icon: Icon, title, text }) => (
          <Link key={to + title} to={to} className="card card-link">
            <Icon size={22} aria-hidden="true" className="accent" />
            <div><h3>{title}</h3>{text && <p className="dim">{text}</p>}</div>
            <ChevronRight size={18} aria-hidden="true" className="dim" />
          </Link>
        ))}
      </div>
      {cfg.later.length > 0 && (
        <>
          <h2 className="section-title">Not built yet</h2>
          <p className="dim">These are planned and are not available in this release.</p>
          <div className="grid-2">
            {cfg.later.map(({ icon: Icon, title, phase }) => (
              <div key={title} className="card card-disabled" aria-disabled="true">
                <Icon size={22} aria-hidden="true" />
                <div><h3>{title}</h3></div>
                <Badge tone="badge-amber">{phase}</Badge>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
