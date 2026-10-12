import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useApi } from '../useApi.js';
import { Tag } from '../components/Badges.jsx';

export function WorkoutDay({ day }) {
  return (
    <table className="workout">
      <thead>
        <tr>
          <th>Exercise</th>
          <th>Sets</th>
          <th>Reps</th>
          <th>Rest</th>
        </tr>
      </thead>
      <tbody>
        {day.exercises.map((x, i) => (
          <tr key={i}>
            <td><Link to={`/exercises/${x.slug}`}>{x.name ?? x.slug}</Link></td>
            <td>{x.sets}</td>
            <td>{x.reps}</td>
            <td>{x.rest}s</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PlanDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error } = useApi(`/plans/${slug}`);
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState('');

  if (error) return <p className="error">{error.message}</p>;
  if (!data) return <p className="muted">Loading…</p>;
  const { plan, isActive } = data;

  async function start() {
    if (!user) return navigate('/login', { state: { from: `/plans/${slug}` } });
    setBusy(true);
    try {
      await api(`/plans/${slug}/start`, { method: 'POST' });
      navigate('/');
    } catch (err) {
      setStartError(err.message);
      setBusy(false);
    }
  }

  return (
    <article className="detail">
      <Link to="/plans" className="back">← All plans</Link>
      <div className="row between wrap">
        <div>
          <Tag kind={plan.level}>{plan.level}</Tag>
          <h1>{plan.name}</h1>
          <p className="muted">
            {plan.weeks} weeks · {plan.days.length} sessions per week
            {plan.author && <> · created by @{plan.author}</>}
          </p>
        </div>
        {isActive ? (
          <span className="tag tag-active">✓ Your current plan</span>
        ) : (
          <button className="btn" onClick={start} disabled={busy}>
            {busy ? 'Starting…' : 'Start this plan'}
          </button>
        )}
      </div>
      {startError && <p className="error">{startError}</p>}
      {plan.description && <p className="lead">{plan.description}</p>}

      {plan.days.map((day, i) => (
        <section key={i} className="card">
          <h2>{day.name}</h2>
          <WorkoutDay day={day} />
        </section>
      ))}
    </article>
  );
}
