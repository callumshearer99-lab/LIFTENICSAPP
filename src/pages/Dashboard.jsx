import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useApi } from '../useApi.js';
import { WorkoutDay } from './PlanDetail.jsx';

function Landing() {
  return (
    <div className="hero">
      <h1>
        Master your bodyweight.<br />
        <span className="accent">Train together.</span>
      </h1>
      <p className="lead">
        Structured calisthenics plans, an exercise library with form videos, and a community to share progress and get
        form checks.
      </p>
      <div className="row wrap">
        <Link to="/login" className="btn">Get started — it's free</Link>
        <Link to="/plans" className="btn ghost">Browse plans</Link>
      </div>
      <div className="features">
        <div className="card"><h3>▤ Plans</h3><p className="muted">From your first pull-up to the muscle-up — or build your own.</p></div>
        <div className="card"><h3>◎ Exercises</h3><p className="muted">Step-by-step cues, common mistakes, progressions and videos.</p></div>
        <div className="card"><h3>✉ Community</h3><p className="muted">Live chat channels for progress, form checks and beginners.</p></div>
      </div>
    </div>
  );
}

function TodayWorkout({ plan, onLogged }) {
  const [dayIndex, setDayIndex] = useState(plan.nextDayIndex);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const day = plan.days[dayIndex];

  async function complete() {
    setBusy(true);
    setError('');
    try {
      await api('/me/workouts', { method: 'POST', body: { dayIndex, notes } });
      setNotes('');
      onLogged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card today">
      <div className="row between wrap">
        <div>
          <p className="eyebrow">Today's session · <Link to={`/plans/${plan.slug}`}>{plan.name}</Link></p>
          <h2>{day.name}</h2>
        </div>
        <select value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))} aria-label="Choose session">
          {plan.days.map((d, i) => (
            <option key={i} value={i}>{d.name}</option>
          ))}
        </select>
      </div>
      <WorkoutDay day={day} />
      <textarea
        placeholder="Notes (optional) — how did it feel? Any PRs?"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={500}
        rows={2}
      />
      {error && <p className="error">{error}</p>}
      <button className="btn" onClick={complete} disabled={busy}>
        {busy ? 'Saving…' : '✓ Mark session complete'}
      </button>
    </section>
  );
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { data, error, reload } = useApi(user ? '/me' : null);

  if (loading) return <p className="muted center">Loading…</p>;
  if (!user) return <Landing />;
  if (error) return <p className="error">{error.message}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const { activePlan: plan, recentWorkouts, stats } = data;
  const progress = plan ? Math.min(100, Math.round((plan.completedSessions / plan.totalSessions) * 100)) : 0;

  return (
    <>
      <div className="page-head">
        <h1>Hey {user.username} 👋</h1>
      </div>

      <div className="stats">
        <div className="card stat"><span className="stat-num">{stats.thisWeek}</span><span className="muted small">sessions this week</span></div>
        <div className="card stat"><span className="stat-num">{stats.totalWorkouts}</span><span className="muted small">total sessions</span></div>
        <div className="card stat">
          <span className="stat-num">{plan ? `${progress}%` : '—'}</span>
          <span className="muted small">plan complete</span>
        </div>
      </div>

      {plan ? (
        <>
          <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${progress}%` }} />
          </div>
          <p className="small muted">
            {plan.completedSessions} of {plan.totalSessions} sessions done
          </p>
          <TodayWorkout key={`${plan.slug}-${plan.nextDayIndex}-${plan.completedSessions}`} plan={plan} onLogged={reload} />
        </>
      ) : (
        <section className="card empty">
          <h2>No active plan yet</h2>
          <p className="muted">Choose a training plan and your sessions will show up here.</p>
          <Link to="/plans" className="btn">Choose a plan</Link>
        </section>
      )}

      <section>
        <h2 className="section-title">Recent workouts</h2>
        {recentWorkouts.length === 0 ? (
          <p className="muted">Nothing logged yet — your completed sessions will appear here.</p>
        ) : (
          <ul className="log">
            {recentWorkouts.map((w) => (
              <li key={w.id} className="card">
                <div className="row between">
                  <strong>{w.dayName}</strong>
                  <span className="small muted">{new Date(`${w.completedAt}Z`).toLocaleDateString()}</span>
                </div>
                <span className="small muted">{w.planName}</span>
                {w.notes && <p className="note">{w.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link to="/community" className="card cta">
        <strong>✉ Join the conversation</strong>
        <span className="muted">Share your progress or ask for a form check in the community →</span>
      </Link>
    </>
  );
}
