import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useApi } from '../useApi.js';
import { Difficulty, Tag } from '../components/Badges.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';

function VideoEditor({ slug, current, onSaved }) {
  const [url, setUrl] = useState(current ?? '');
  const [status, setStatus] = useState('');

  async function save(e) {
    e.preventDefault();
    setStatus('Saving…');
    try {
      await api(`/exercises/${slug}/video`, { method: 'PUT', body: { videoUrl: url } });
      setStatus('Saved');
      onSaved();
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <form onSubmit={save} className="card admin-box">
      <strong>Admin: form video</strong>
      <p className="small muted">Paste a YouTube link or a direct .mp4 URL. Leave blank to remove.</p>
      <div className="row">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
        <button className="btn small">Save</button>
      </div>
      {status && <p className="small muted">{status}</p>}
    </form>
  );
}

export default function ExerciseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data, error, reload } = useApi(`/exercises/${slug}`);

  if (error) return <p className="error">{error.message}</p>;
  if (!data) return <p className="muted">Loading…</p>;
  const { exercise: e, easier, harder, usedIn } = data;

  return (
    <article className="detail">
      <Link to="/exercises" className="back">← All exercises</Link>
      <div className="row between wrap">
        <h1>{e.name}</h1>
        <div className="row">
          <Tag kind={e.category}>{e.category}</Tag>
          <Difficulty value={e.difficulty} />
        </div>
      </div>
      <p className="lead">{e.description}</p>

      <VideoPlayer url={e.videoUrl} title={e.name} />
      {user?.isAdmin ? <VideoEditor key={e.videoUrl ?? ''} slug={e.slug} current={e.videoUrl} onSaved={reload} /> : null}

      <div className="two-col">
        <section className="card">
          <h2>How to do it</h2>
          <ol className="steps">
            {e.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>
        <section className="card">
          <h2>Common mistakes</h2>
          <ul className="mistakes">
            {e.mistakes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
          <h2>Muscles worked</h2>
          <div className="chips">
            {e.muscles.map((m) => (
              <span key={m} className="chip static">{m}</span>
            ))}
          </div>
        </section>
      </div>

      {(easier || harder.length > 0) && (
        <section className="card">
          <h2>Progressions</h2>
          <div className="progression">
            {easier && (
              <Link to={`/exercises/${easier.slug}`} className="prog-step">
                <span className="small muted">Easier</span>
                {easier.name}
              </Link>
            )}
            <span className="prog-step current">
              <span className="small muted">This exercise</span>
              {e.name}
            </span>
            {harder.map((h) => (
              <Link key={h.slug} to={`/exercises/${h.slug}`} className="prog-step">
                <span className="small muted">Harder</span>
                {h.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {usedIn.length > 0 && (
        <section>
          <h2>Featured in</h2>
          <div className="chips">
            {usedIn.map((p) => (
              <Link key={p.slug} to={`/plans/${p.slug}`} className="chip">{p.name}</Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
