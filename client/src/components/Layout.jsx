import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Briefcase, Cloud, FlaskConical, Library, Milestone, Brain, Timer, LayoutDashboard, MoreHorizontal, Moon, NotebookPen, Network, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, Sun, Terminal } from 'lucide-react';
import { api } from '../api.js';
import { useSettings } from '../settings.js';
import { Wordmark, useToast } from './Ui.jsx';

const SIDE = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/labs', label: 'Lab Journal', icon: FlaskConical },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/commands', label: 'Linux Commands', icon: Terminal },
  { to: '/networking', label: 'Networking', icon: Network },
  { to: '/cloud', label: 'Cloud Security', icon: Cloud },
  { to: '/timer', label: 'Study Timer', icon: Timer },
  { to: '/quiz', label: 'Quizzes', icon: Brain },
  { to: '/roadmap', label: 'Roadmap', icon: Milestone },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/resources', label: 'Resources', icon: Library },
  { to: '/safety', label: 'Practice Safely', icon: ShieldCheck },
  { to: '/settings', label: 'Settings', icon: Settings },
];
const BOTTOM = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/labs', label: 'Labs', icon: FlaskConical },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/more', label: 'More', icon: MoreHorizontal },
];

function StatusIndicator() {
  const [state, setState] = useState('checking');
  useEffect(() => {
    let alive = true;
    const ping = () => api.get('/api/health').then(() => alive && setState('online'), () => alive && setState('offline'));
    ping();
    const id = setInterval(ping, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  const label = { checking: 'CHECKING', online: 'SYSTEM ONLINE', offline: 'SERVER OFFLINE' }[state];
  return <span className={`status status-${state}`} role="status"><i className="status-dot" aria-hidden="true" />{label}</span>;
}

export default function Layout() {
  const { settings, setSettings } = useSettings();
  const toast = useToast();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('cyberlab_sidebar') === '1'; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem('cyberlab_sidebar', collapsed ? '1' : '0'); } catch { /* ignore */ } }, [collapsed]);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  const toggleTheme = async () => {
    const next = settings.theme === 'cybercore' ? 'soft' : 'cybercore';
    setSettings({ ...settings, theme: next });
    try { setSettings(await api.put('/api/settings', { theme: next })); } catch (e) { toast(e.message, 'error'); }
  };
  const themeBtn = (
    <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label={settings.theme === 'cybercore' ? 'Switch to low-contrast dark theme' : 'Switch to cybercore theme'} title="Toggle theme">
      {settings.theme === 'cybercore' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );

  return (
    <div className={`shell ${collapsed ? 'is-collapsed' : ''}`}>
      <a className="skip" href="#content">Skip to content</a>
      <aside className="sidebar" aria-label="Primary">
        <div className="side-top"><Wordmark small={collapsed} /></div>
        <nav>
          {SIDE.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`} title={label}>
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <StatusIndicator />
          <div className="side-tools">
            {themeBtn}
            <button className="btn btn-ghost btn-icon" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar"><Wordmark small /><div className="topbar-r"><StatusIndicator />{themeBtn}</div></header>
        <main id="content" tabIndex={-1}><Outlet /></main>
      </div>
      <nav className="bottomnav" aria-label="Mobile">
        {BOTTOM.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `bn ${isActive ? 'active' : ''}`}>
            <Icon size={22} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
