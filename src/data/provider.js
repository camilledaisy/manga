// Metadata provider: the only module that knows where EXTERNAL manga data comes from.
// Today: the mock CATALOG, plus AniList's public GraphQL API (no key needed) for covers,
// live search and titles outside the mock set. A different provider only needs to
// implement peek/get/list/search with the same manga shape (see catalog.js).
import { CATALOG } from './catalog.js';

const ANILIST = 'https://graphql.anilist.co';
const CACHE_KEY = 'mangashelf:catalog-cache:v1';
const COVERS_KEY = 'mangashelf:covers:v1';
// ponytail: simulated network latency so loading states are real; delete with a real backend.
const MOCK_LATENCY = 250;

const local = new Map(CATALOG.map(m => [m.id, m]));
const cache = new Map(Object.entries(read(CACHE_KEY) || {}));   // remote manga we've seen, kept so library entries resolve offline
let covers = read(COVERS_KEY) || {};                              // id -> cover url (AniList)
const coverListeners = new Set();

function read(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked: data stays in memory */ } }
const wait = (ms) => new Promise(r => setTimeout(r, ms));

function withCover(m) { return m && (m.cover || !covers[m.id] ? m : { ...m, cover: covers[m.id] }); }
const releasedAt = (m) => m.updatedDaysAgo == null ? null : Date.now() - m.updatedDaysAgo * 864e5;

/** Synchronous lookup for anything already known (mock catalog or cached remote). */
export function peek(id) {
  const m = local.get(id) || cache.get(id);
  return m ? withCover({ ...m, updatedAt: releasedAt(m) }) : null;
}

export async function list() {
  await wait(MOCK_LATENCY);
  return CATALOG.map(m => peek(m.id));
}

export async function get(id) {
  if (local.has(id) || cache.has(id)) { await wait(MOCK_LATENCY); return peek(id); }
  const alId = /^al-(\d+)$/.exec(id)?.[1];
  if (!alId) throw new Error('This manga does not exist.');
  const data = await gql(`query($id:Int){Media(id:$id,type:MANGA){${FIELDS}}}`, { id: +alId });
  return remember(fromAniList(data.Media));
}

/** Instant local matches over title, alt/native titles, authors and genres. */
export function searchLocal(q) {
  const s = norm(q);
  if (!s) return { manga: [], authors: [], genres: [] };
  const all = [...CATALOG, ...cache.values()];
  const hit = (str) => norm(str).includes(s);
  const manga = all.filter(m => [m.title, m.native, ...m.alt].some(hit))
    .sort((a, b) => (norm(b.title).startsWith(s) - norm(a.title).startsWith(s)) || b.popularity - a.popularity);
  const authors = [...new Set(all.flatMap(m => [...m.authors, ...m.artists]))].filter(hit);
  const genres = [...new Set(all.flatMap(m => m.genres))].filter(hit);
  return { manga: manga.slice(0, 6).map(m => peek(m.id)), authors: authors.slice(0, 3), genres: genres.slice(0, 3) };
}

/** Remote search on AniList. Results are cached so they can be opened and added. */
export async function searchRemote(q) {
  const data = await gql(`query($q:String){Page(perPage:8){media(search:$q,type:MANGA,sort:SEARCH_MATCH,isAdult:false){${FIELDS}}}}`, { q });
  return data.Page.media.map(fromAniList).map(remember);
}

/** Fetch real covers for the mock catalog once, in the background. Silent on failure. */
export async function hydrateCovers() {
  if (covers._at > Date.now() - 30 * 864e5) return;
  for (let i = 0; i < CATALOG.length; i += 10) {   // small batches keep each query under AniList's complexity limit
    const batch = CATALOG.slice(i, i + 10);
    const query = '{' + batch.map((m, j) =>
      `c${j}:Media(search:${JSON.stringify(m.title)},type:MANGA,startDate_like:"${m.start}%"){coverImage{large}}`).join(' ') + '}';
    try {
      const r = await fetch(ANILIST, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
      const { data } = await r.json();   // partial data is fine: misses keep their placeholder cover
      if (!data) continue;
      batch.forEach((m, j) => { const url = data[`c${j}`]?.coverImage?.large; if (url) covers[m.id] = url; });
      coverListeners.forEach(f => f());
    } catch { return; /* offline: placeholders stay, retry next visit */ }
  }
  covers._at = Date.now();
  write(COVERS_KEY, covers);
}
export function onCovers(f) { coverListeners.add(f); return () => coverListeners.delete(f); }

/** Store a manga we got from somewhere else (e.g. migrated from the old app). */
export function remember(m) {
  if (!local.has(m.id)) { cache.set(m.id, m); write(CACHE_KEY, Object.fromEntries(cache)); }
  return peek(m.id);
}

// --- AniList mapping ---
const FIELDS = `id title{romaji english native} synonyms coverImage{large} status chapters volumes
  startDate{year} endDate{year} genres tags{name} countryOfOrigin format averageScore popularity trending
  description(asHtml:false) staff(perPage:6){edges{role node{name{full}}}}
  characters(perPage:6,sort:ROLE){edges{role node{name{full}}}}`;

async function gql(query, variables) {
  let r;
  try {
    r = await fetch(ANILIST, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables }) });
  } catch { throw new Error('Could not reach AniList. Check your connection.'); }
  const json = await r.json().catch(() => ({}));
  if (!r.ok || json.errors) throw new Error(json.errors?.[0]?.message || `AniList returned an error (HTTP ${r.status}).`);
  return json.data;
}

const STATUS = { FINISHED: 'FINISHED', RELEASING: 'RELEASING', HIATUS: 'HIATUS', NOT_YET_RELEASED: 'RELEASING', CANCELLED: 'FINISHED' };
const COUNTRY = { KR: 'Manhwa', CN: 'Manhua', TW: 'Manhua' };
const DEMO = ['Shounen', 'Seinen', 'Shoujo', 'Josei'];

function fromAniList(a) {
  const staff = a.staff?.edges || [];
  const who = (re) => staff.filter(e => re.test(e.role)).map(e => e.node.name.full);
  const story = who(/story/i), art = who(/art/i);
  const text = (a.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\(Source:[^)]*\)/i, '').trim();
  return {
    id: 'al-' + a.id,
    title: a.title.english || a.title.romaji, native: a.title.native || '',
    alt: [a.title.romaji, ...(a.synonyms || [])].filter(t => t && t !== (a.title.english || a.title.romaji)).slice(0, 4),
    authors: story.length ? story : art.slice(0, 1), artists: art.length ? art : story,
    status: STATUS[a.status] || 'FINISHED', start: a.startDate?.year || null, end: a.endDate?.year || null,
    genres: a.genres || [], demographic: DEMO.find(d => a.tags?.some(t => t.name === d)) || null,
    format: a.format === 'ONE_SHOT' ? 'One-shot' : COUNTRY[a.countryOfOrigin] || 'Manga',
    chapters: a.chapters, volumes: a.volumes, latest: a.chapters, updatedDaysAgo: null,
    score: a.averageScore ? a.averageScore / 10 : null, popularity: Math.min(99, Math.round(Math.log10((a.popularity || 1)) * 18)),
    trending: a.trending || 0, synopsis: text,
    characters: (a.characters?.edges || []).map(e => ({ name: e.node.name.full, role: e.role === 'MAIN' ? 'Main' : 'Supporting' })),
    hue: (a.id * 47) % 360, cover: a.coverImage?.large || null,
  };
}

const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
