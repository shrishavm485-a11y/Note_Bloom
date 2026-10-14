import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { api, setToken } from './api.js';
import { BootScreen, ToastProvider, Wordmark, useToast } from './components/Ui.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { LabList, LabForm, LabDetail } from './pages/Labs.jsx';
import Notes from './pages/Notes.jsx';
import Commands from './pages/Commands.jsx';
import Networking from './pages/Networking.jsx';
import Safety from './pages/Safety.jsx';
import SettingsPage from './pages/Settings.jsx';
import { Hub } from './pages/Hub.jsx';
import Timer from './pages/Timer.jsx';
import Quiz from './pages/Quiz.jsx';
import Roadmap from './pages/Roadmap.jsx';
import Cloud from './pages/Cloud.jsx';
import Resources from './pages/Resources.jsx';
import Portfolio from './pages/Portfolio.jsx';
import PublicPortfolio from './pages/PublicPortfolio.jsx';
import { DEFAULT_SETTINGS, SettingsCtx } from './settings.js';


function Login({ onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api.post('/api/auth/login', { password });
      setToken(r.token);
      onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="boot">
      <Wordmark />
      <form className="card login" onSubmit={submit}>
        <h1>Access terminal</h1>
        <p className="dim">This workspace is password protected.</p>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={busy || !password}>{busy ? 'Checking...' : 'Unlock'}</button>
      </form>
    </div>
  );
}

function Shell() {
  const [settings, setSettingsState] = useState(null);
  const toast = useToast();
  const load = useCallback(async () => {
    try { setSettingsState(await api.get('/api/settings')); } catch (e) { toast(e.message, 'error'); setSettingsState(DEFAULT_SETTINGS); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!settings) return;
    document.documentElement.setAttribute('data-theme', settings.theme);
    try { localStorage.setItem('cyberlab_theme', settings.theme); } catch { /* ignore */ }
  }, [settings]);
  if (!settings) return <BootScreen />;
  return (
    <SettingsCtx.Provider value={{ settings, setSettings: setSettingsState }}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="labs" element={<LabList />} />
          <Route path="labs/new" element={<LabForm />} />
          <Route path="labs/:id" element={<LabDetail />} />
          <Route path="labs/:id/edit" element={<LabForm />} />
          <Route path="notes" element={<Notes />} />
          <Route path="commands" element={<Commands />} />
          <Route path="networking" element={<Networking />} />
          <Route path="networking/:slug" element={<Networking />} />
          <Route path="safety" element={<Safety />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="timer" element={<Timer />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="cloud" element={<Cloud />} />
          <Route path="cloud/:slug" element={<Cloud />} />
          <Route path="resources" element={<Resources />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="learn" element={<Hub kind="learn" />} />
          <Route path="more" element={<Hub kind="more" />} />
          <Route path="*" element={<Hub kind="notfound" />} />
        </Route>
      </Routes>
    </SettingsCtx.Provider>
  );
}

function Gate() {
  const [auth, setAuth] = useState('checking'); // checking | login | ok | offline
  const check = useCallback(async () => {
    try {
      const s = await api.get('/api/auth/status');
      setAuth(s.required && !s.authenticated ? 'login' : 'ok');
    } catch { setAuth('offline'); }
  }, []);
  useEffect(() => { check(); }, [check]);
  useEffect(() => {
    const h = () => { setToken(''); setAuth('login'); };
    window.addEventListener('cyberlab:unauthorized', h);
    return () => window.removeEventListener('cyberlab:unauthorized', h);
  }, []);
  if (auth === 'checking') return <BootScreen />;
  if (auth === 'offline') return (
    <div className="boot"><Wordmark />
      <div className="alert alert-error" role="alert">Cannot reach the server. <button className="btn btn-sm" onClick={check}>Retry</button></div>
    </div>
  );
  if (auth === 'login') return <Login onDone={() => setAuth('ok')} />;
  return <Shell />;
}

export default function App() {
  const { pathname } = useLocation();
  // The public portfolio is read-only and needs no login. Everything else goes through the gate.
  if (pathname === '/p' || pathname.startsWith('/p/')) return <PublicPortfolio />;
  return <ToastProvider><Gate /></ToastProvider>;
}
