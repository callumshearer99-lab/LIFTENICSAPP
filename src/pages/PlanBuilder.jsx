import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApi } from '../useApi.js';

const emptyExercise = () => ({ slug: '', sets: 3, reps: '8-12', rest: 90 });
const emptyDay = (n) => ({ name: `Day ${n}`, exercises: [emptyExercise()] });

export default function PlanBuilder() {
  const navigate = useNavigate();
  const { data } = useApi('/exercises');
  const [form, setForm] = useState({ name: '', level: 'beginner', weeks: 4, description: '' });
  const [days, setDays] = useState([emptyDay(1)]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const updateDay = (i, patch) => setDays((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const updateExercise = (di, xi, patch) =>
    updateDay(di, { exercises: days[di].exercises.map((x, j) => (j === xi ? { ...x, ...patch } : x)) });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const cleaned = days.map((d) => ({ ...d, exercises: d.exercises.filter((x) => x.slug) }));
      const { slug } = await api('/plans', { method: 'POST', body: { ...form, days: cleaned } });
      navigate(`/plans/${slug}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const byCategory = {};
  for (const ex of data?.exercises ?? []) (byCategory[ex.category] ??= []).push(ex);

  return (
    <form onSubmit={submit} className="detail stack">
      <Link to="/plans" className="back">← All plans</Link>
      <h1>Build your own plan</h1>

      <section className="card stack">
        <label>
          Plan name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} required />
        </label>
        <div className="row wrap">
          <label>
            Level
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label>
            Weeks
            <input type="number" min={1} max={52} value={form.weeks} onChange={(e) => setForm({ ...form, weeks: e.target.value })} />
          </label>
        </div>
        <label>
          Description
          <textarea rows={2} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
      </section>

      {days.map((day, di) => (
        <section key={di} className="card stack">
          <div className="row between">
            <input className="day-name" value={day.name} onChange={(e) => updateDay(di, { name: e.target.value })} aria-label="Day name" />
            {days.length > 1 && (
              <button type="button" className="btn ghost small" onClick={() => setDays(days.filter((_, j) => j !== di))}>
                Remove day
              </button>
            )}
          </div>
          {day.exercises.map((x, xi) => (
            <div key={xi} className="builder-row">
              <select value={x.slug} onChange={(e) => updateExercise(di, xi, { slug: e.target.value })} aria-label="Exercise">
                <option value="">Choose exercise…</option>
                {Object.entries(byCategory).map(([cat, list]) => (
                  <optgroup key={cat} label={cat}>
                    {list.map((ex) => <option key={ex.slug} value={ex.slug}>{ex.name}</option>)}
                  </optgroup>
                ))}
              </select>
              <label className="mini">Sets<input type="number" min={1} max={20} value={x.sets} onChange={(e) => updateExercise(di, xi, { sets: e.target.value })} /></label>
              <label className="mini">Reps<input value={x.reps} maxLength={40} onChange={(e) => updateExercise(di, xi, { reps: e.target.value })} /></label>
              <label className="mini">Rest (s)<input type="number" min={0} max={600} value={x.rest} onChange={(e) => updateExercise(di, xi, { rest: e.target.value })} /></label>
              <button type="button" className="icon-btn" aria-label="Remove exercise"
                onClick={() => updateDay(di, { exercises: day.exercises.filter((_, j) => j !== xi) })}>✕</button>
            </div>
          ))}
          <button type="button" className="btn ghost small" onClick={() => updateDay(di, { exercises: [...day.exercises, emptyExercise()] })}>
            + Add exercise
          </button>
        </section>
      ))}

      {days.length < 7 && (
        <button type="button" className="btn ghost" onClick={() => setDays([...days, emptyDay(days.length + 1)])}>
          + Add workout day
        </button>
      )}
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save plan'}</button>
    </form>
  );
}
