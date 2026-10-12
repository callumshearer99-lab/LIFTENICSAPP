import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../useApi.js';
import { Difficulty, Tag } from '../components/Badges.jsx';

export default function Exercises() {
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (query.trim()) params.set('q', query.trim());
  const { data, error, loading } = useApi(`/exercises?${params}`);

  return (
    <>
      <div className="page-head">
        <h1>Exercise library</h1>
        <p className="muted">Step-by-step technique, common mistakes and form videos for every movement.</p>
      </div>

      <input
        className="search"
        type="search"
        placeholder="Search exercises or muscles…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="chips">
        <button className={`chip ${category === '' ? 'active' : ''}`} onClick={() => setCategory('')}>
          All
        </button>
        {(data?.categories ?? ['push', 'pull', 'legs', 'core', 'skills']).map((c) => (
          <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {error && <p className="error">{error.message}</p>}
      {loading && !data && <p className="muted">Loading…</p>}
      {data && data.exercises.length === 0 && <p className="muted">No exercises match that search.</p>}

      <div className="grid">
        {data?.exercises.map((e) => (
          <Link key={e.slug} to={`/exercises/${e.slug}`} className="card exercise-card">
            <div className="row between">
              <Tag kind={e.category}>{e.category}</Tag>
              <Difficulty value={e.difficulty} />
            </div>
            <h3>{e.name}</h3>
            <p className="muted clamp">{e.description}</p>
            <p className="small muted">{e.muscles.join(' · ')}</p>
            {e.videoUrl && <span className="has-video">▶ Video</span>}
          </Link>
        ))}
      </div>
    </>
  );
}
