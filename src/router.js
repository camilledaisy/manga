// Hash router: works on any static host (GitHub Pages) with no server rewrites.
import { useEffect, useState } from '../vendor/preact-htm.js';

function parse(hash) {
  const [path, q = ''] = hash.replace(/^#\/?/, '').split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: Object.fromEntries(new URLSearchParams(q)) };
}

export function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const f = () => setHash(location.hash);
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return parse(hash);
}

/** Builds "#/discover?genre=Horror". Empty query values are dropped. */
export function link(path, query = {}) {
  const q = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null && v !== false));
  return '#/' + path + (q.toString() ? '?' + q : '');
}
export const go = (href) => { location.hash = href.replace(/^#/, ''); };
export const mangaHref = (id, tab) => '#/manga/' + encodeURIComponent(id) + (tab ? '/' + tab : '');
export const userHref = (u) => '#/user/' + encodeURIComponent(u.username);
