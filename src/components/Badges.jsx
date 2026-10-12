const LEVEL_NAMES = ['', 'Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];

export function Difficulty({ value }) {
  return (
    <span className="difficulty" title={`${LEVEL_NAMES[value]} (${value}/5)`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <i key={n} className={n <= value ? 'on' : ''} />
      ))}
      <span className="sr-only">{LEVEL_NAMES[value]}</span>
    </span>
  );
}

export function Tag({ kind, children }) {
  return <span className={`tag tag-${kind}`}>{children}</span>;
}
