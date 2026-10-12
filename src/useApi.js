import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Fetches `path` and re-fetches whenever it changes. Pass null to skip.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return;
    let stale = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path)
      .then((data) => !stale && setState({ data, error: null, loading: false }))
      .catch((error) => !stale && setState({ data: null, error, loading: false }));
    return () => {
      stale = true;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
