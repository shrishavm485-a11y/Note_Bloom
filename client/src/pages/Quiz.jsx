import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { api, qs } from '../api.js';
import { useAsync } from '../lib/hooks.js';
import { Badge, Empty, ErrorBox, Loader, PageHeader, useToast } from '../components/Ui.jsx';
import { fmtDate } from '../lib/util.js';

const TOPICS = ['Linux', 'Networking', 'Security Fundamentals', 'Cloud Security'];
const DIFFS = ['Beginner', 'Intermediate', 'Advanced'];
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

function Results({ result, onRetry, onClose }) {
  const wrong = result.results.filter((r) => !r.correct);
  const pct = Math.round((result.score / result.total) * 100);
  return (
    <div className="stack">
      <div className="card hero-score"><p className="mono dim">RESULT</p><h2>{result.score} / {result.total} <small className="dim">({pct}%)</small></h2>
        <div className="row-gap">{wrong.length > 0 && <button className="btn btn-primary" onClick={() => onRetry(wrong.map((w) => w.id))}><RotateCcw size={16} aria-hidden="true" /> Retry {wrong.length} incorrect</button>}<button className="btn" onClick={onClose}>Done</button></div></div>
      <h3>Answer review</h3>
      {result.results.map((r, i) => (
        <article key={r.id} className={`card review ${r.correct ? 'ok' : 'bad'}`}>
          <p className="row-gap">{r.correct ? <CheckCircle2 size={18} className="accent" aria-label="Correct" /> : <XCircle size={18} aria-label="Incorrect" className="red" />}<b>{i + 1}. {r.text}</b></p>
          <p>Your answer: <span className={r.correct ? 'accent' : 'red'}>{r.choice === null ? 'No answer' : r.options[r.choice]}</span></p>
          {!r.correct && <p>Correct answer: <span className="accent">{r.options[r.answer]}</span></p>}
          <p className="dim">{r.explanation}</p>
        </article>))}
    </div>
  );
}

function QuizRunner({ params, onExit }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get(`/api/quiz/questions${qs(params)}`), [JSON.stringify(params)]);
  const [qs_, setQs] = useState([]);
  const [picked, setPicked] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) { setQs(data.items.map((q) => ({ ...q, order: shuffle(q.options.map((text, idx) => ({ text, idx }))) }))); setPicked({}); setResult(null); } }, [data]);

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (data.items.length === 0) return <Empty title="No questions match">Try another topic or difficulty{params.mode === 'review' ? ', or answer some quizzes first so there is something to review' : ''}.<div><button className="btn" onClick={onExit}>Back</button></div></Empty>;
  if (result) return <Results result={result} onClose={onExit} onRetry={(ids) => onExit({ ids: ids.join(','), count: ids.length, mode: 'retry' })} />;

  const submit = async () => {
    setBusy(true);
    try {
      setResult(await api.post('/api/quiz/attempts', { answers: qs_.map((q) => ({ question_id: q.id, choice: picked[q.id] ?? null })), topic: params.topic, difficulty: params.difficulty, mode: params.mode === 'review' ? 'review' : params.mode === 'retry' ? 'retry' : 'random' }));
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const answered = Object.keys(picked).length;
  return (
    <div className="stack">
      {qs_.map((q, i) => (
        <fieldset key={q.id} className="card qcard">
          <legend><span className="mono dim">{i + 1}/{qs_.length}</span> <Badge>{q.topic}</Badge> <Badge>{q.difficulty}</Badge>{q.type === 'true_false' && <Badge tone="badge-cyan">True / False</Badge>}</legend>
          <p><b>{q.text}</b></p>
          <div className="options">{q.order.map((o) => (
            <label key={o.idx} className="option"><input type="radio" name={`q${q.id}`} checked={picked[q.id] === o.idx} onChange={() => setPicked({ ...picked, [q.id]: o.idx })} /><span>{o.text}</span></label>))}</div>
        </fieldset>))}
      <div className="form-actions"><button className="btn" onClick={onExit}>Cancel</button><button className="btn btn-primary" disabled={busy || answered === 0} onClick={submit}>{busy ? 'Checking...' : `Submit (${answered}/${qs_.length} answered)`}</button></div>
      <p className="dim small">Correct answers are shown only after you submit.</p>
    </div>
  );
}

function Flashcards({ params, onExit }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get(`/api/quiz/cards${qs(params)}`), [JSON.stringify(params)]);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [known, setKnown] = useState(0);
  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (data.items.length === 0) return <Empty title="No cards">Try different filters.<div><button className="btn" onClick={onExit}>Back</button></div></Empty>;
  if (i >= data.items.length) return <div className="card"><h2>Deck complete</h2><p>You knew {known} of {data.items.length} cards. Missed cards are added to your review list.</p><button className="btn btn-primary" onClick={onExit}>Done</button></div>;
  const c = data.items[i];
  const mark = async (k) => { try { await api.post(`/api/quiz/cards/${c.id}`, { known: k }); } catch (e) { toast(e.message, 'error'); } if (k) setKnown(known + 1); setFlip(false); setI(i + 1); };
  return (
    <div className="stack">
      <p className="mono dim">Card {i + 1} of {data.items.length} · {c.topic} · {c.difficulty}</p>
      <button className={`flashcard ${flip ? 'flipped' : ''}`} onClick={() => setFlip(!flip)} aria-label={flip ? 'Show question' : 'Reveal answer'}>
        {!flip ? <div><p className="mono dim">QUESTION (tap to reveal)</p><p className="fc-text">{c.front}</p></div>
          : <div><p className="mono dim">ANSWER</p><p className="fc-text accent">{c.back}</p><p className="dim">{c.explanation}</p></div>}
      </button>
      {flip ? <div className="row-gap"><button className="btn btn-primary" onClick={() => mark(true)}>I knew it</button><button className="btn" onClick={() => mark(false)}>Missed it</button></div>
        : <p className="dim small">Try to answer in your head first, then tap the card.</p>}
    </div>
  );
}

export default function Quiz() {
  const [tab, setTab] = useState('quiz');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [count, setCount] = useState(10);
  const [run, setRun] = useState(null); // {kind, params}
  const stats = useAsync(() => api.get('/api/quiz/stats'), []);
  const attempts = useAsync(() => api.get('/api/quiz/attempts'), []);
  const [viewing, setViewing] = useState(null);
  const exit = (next) => { setRun(next && next.ids ? { kind: 'quiz', params: next } : null); stats.reload(); attempts.reload(); };
  const S = stats.data;
  const base = { topic, difficulty, count };

  if (run) return (<><PageHeader title={run.kind === 'cards' ? 'Flashcards' : 'Quiz'} />{run.kind === 'cards' ? <Flashcards params={run.params} onExit={exit} /> : <QuizRunner params={run.params} onExit={exit} />}</>);

  const openAttempt = async (id) => { try { setViewing(await api.get(`/api/quiz/attempts/${id}`)); } catch { setViewing(null); } };
  return (
    <>
      <PageHeader title="Quizzes and flashcards" sub="Test yourself on Linux, networking, security fundamentals and cloud security." />
      {S && <div className="stat-row"><div className="stat"><b>{S.attempts}</b><span>quizzes taken</span></div><div className="stat"><b>{S.averagePercent}%</b><span>average score</span></div><div className="stat"><b>{S.reviewList.length}</b><span>to review</span></div><div className="stat"><b>{S.bank.reduce((a, b) => a + b.n, 0)}</b><span>questions in bank</span></div></div>}
      <div className="tabs" role="tablist" aria-label="Quiz sections">
        {[['quiz', 'Quiz'], ['cards', 'Flashcards'], ['review', 'Review list'], ['history', 'History']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setViewing(null); }}>{l}</button>)}
      </div>
      {(tab === 'quiz' || tab === 'cards') && (
        <div className="card">
          <div className="grid-form">
            <div className="field"><label htmlFor="q-topic">Topic</label><select id="q-topic" value={topic} onChange={(e) => setTopic(e.target.value)}><option value="">All topics</option>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label htmlFor="q-diff">Difficulty</label><select id="q-diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="">Any difficulty</option>{DIFFS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label htmlFor="q-n">Questions</label><select id="q-n" value={count} onChange={(e) => setCount(Number(e.target.value))}>{[5, 10, 20].map((n) => <option key={n}>{n}</option>)}</select></div>
          </div>
          <button className="btn btn-primary" onClick={() => setRun({ kind: tab, params: base })}>{tab === 'quiz' ? 'Start quiz' : 'Start flashcards'}</button>
          {S && <div className="cats section-gap">{S.byTopic.map((b) => <div key={b.topic} className="cat"><div className="row-between"><span>{b.topic}</span><b className="mono">{b.percent}%</b></div><div className="meter"><div style={{ width: `${b.percent}%` }} /></div><small className="dim">{b.answered} answers recorded</small></div>)}</div>}
        </div>)}
      {tab === 'review' && S && (
        <div className="card">
          <h2>Spaced review list</h2>
          <p className="dim">Questions you missed come back until you answer them correctly a few times in a row.</p>
          {S.reviewList.length === 0 ? <Empty title="Nothing to review">Take a quiz. Missed questions will appear here.</Empty> : <>
            <ul className="list">{S.reviewList.map((r) => <li key={r.id}><span>{r.text}</span><small className="dim">{r.topic} · missed {r.wrong}×</small></li>)}</ul>
            <button className="btn btn-primary" onClick={() => setRun({ kind: 'quiz', params: { mode: 'review', count: 10 } })}>Practise these questions</button></>}
        </div>)}
      {tab === 'history' && (viewing
        ? <div className="stack"><button className="btn" onClick={() => setViewing(null)}>Back to history</button><Results result={{ score: viewing.score, total: viewing.total, results: viewing.details }} onClose={() => setViewing(null)} onRetry={(ids) => setRun({ kind: 'quiz', params: { ids: ids.join(','), count: ids.length, mode: 'retry' } })} /></div>
        : <div className="card"><h2>Recent quizzes</h2>{attempts.data?.items.length ? <ul className="list">{attempts.data.items.map((a) => <li key={a.id}><button className="linklike" onClick={() => openAttempt(a.id)}>{a.score}/{a.total} · {a.topic || 'All topics'}{a.difficulty ? ` · ${a.difficulty}` : ''}</button><small className="dim">{fmtDate(a.created_at)} · {a.mode}</small></li>)}</ul> : <p className="dim">No quizzes yet.</p>}</div>)}
    </>
  );
}
