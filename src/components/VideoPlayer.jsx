// Renders a form video from a YouTube link or a direct video file URL.
// Falls back to a YouTube search link when no video has been set.

function youTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname.endsWith('youtube.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const match = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/);
      if (match) return match[1];
    }
  } catch {
    // not a URL
  }
  return null;
}

export default function VideoPlayer({ url, title }) {
  if (!url) {
    const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} calisthenics form tutorial`)}`;
    return (
      <div className="video-placeholder">
        <span className="play" aria-hidden="true">▶</span>
        <p>No form video added yet.</p>
        <a className="btn small" href={search} target="_blank" rel="noreferrer">
          Find {title} tutorials on YouTube
        </a>
      </div>
    );
  }

  const id = youTubeId(url);
  if (id) {
    return (
      <div className="video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`}
          title={`${title} form video`}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) {
    return (
      <div className="video">
        <video src={url} controls playsInline preload="metadata" />
      </div>
    );
  }

  return (
    <div className="video-placeholder">
      <a className="btn small" href={url} target="_blank" rel="noreferrer">
        Watch the {title} form video
      </a>
    </div>
  );
}
