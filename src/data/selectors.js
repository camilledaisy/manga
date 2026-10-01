// Derived views over user data + metadata. Pure functions of (db state, catalog),
// so a backend could serve the same shapes later.
import { CATALOG } from './catalog.js';
import { peek } from './provider.js';
import { getState } from './db.js';

export function libraryItems(userId) {
  const lib = getState().library[userId] || {};
  return Object.entries(lib).map(([id, entry]) => ({ manga: peek(id), entry })).filter(x => x.manga);
}

export function feed(userIds, limit = 20) {
  const ids = new Set(userIds);
  return getState().activity.filter(a => ids.has(a.userId)).slice(0, limit);
}

/** Total chapters to measure progress against: known total, else latest released chapter. */
export const totalOf = (m) => m.chapters || m.latest || null;

function genreWeights(userId) {
  const w = {};
  for (const { manga, entry } of libraryItems(userId)) {
    if (entry.status === 'planning') continue;
    const k = entry.status === 'dropped' ? -1 : entry.rating ? (entry.rating - 5) / 2 : 1;
    for (const g of manga.genres) w[g] = (w[g] || 0) + k;
  }
  return w;
}

export function recommendFor(userId, n = 12) {
  const lib = getState().library[userId] || {};
  const w = genreWeights(userId);
  return CATALOG.filter(m => !lib[m.id])
    .map(m => ({ m, s: m.genres.reduce((t, g) => t + (w[g] || 0), 0) / Math.sqrt(m.genres.length) + m.score }))
    .sort((a, b) => b.s - a.s).slice(0, n).map(x => peek(x.m.id));
}

export function similarTo(manga, n = 10) {
  const g = new Set(manga.genres);
  return CATALOG.filter(m => m.id !== manga.id)
    .map(m => {
      const overlap = m.genres.filter(x => g.has(x)).length / new Set([...m.genres, ...g]).size;
      return { m, s: overlap * 3 + (m.demographic && m.demographic === manga.demographic) * 0.6 + m.score / 10 };
    })
    .sort((a, b) => b.s - a.s).slice(0, n).map(x => peek(x.m.id));
}

export const byAuthor = (manga) => CATALOG.filter(m => m.id !== manga.id && m.authors.some(a => manga.authors.includes(a))).map(m => peek(m.id));

/** Ratings given by readers on this site (as opposed to the external community score). */
export function shelfRating(mangaId) {
  const r = Object.values(getState().library).map(l => l[mangaId]?.rating).filter(Boolean);
  return r.length ? { avg: r.reduce((a, b) => a + b, 0) / r.length, count: r.length } : null;
}

const MONTH = (d) => new Date(d).toLocaleString('en', { month: 'short' });

export function stats(userId, now = Date.now()) {
  const items = libraryItems(userId);
  const year = new Date(now).getFullYear();
  const yearStart = new Date(year, 0, 1).getTime();
  const read = items.filter(x => x.entry.status !== 'planning');
  const rated = items.filter(x => x.entry.rating);
  const avg = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  const by = (k) => items.filter(x => x.entry.status === k).length;

  // Chapter reading events (only forward progress counts as reading).
  const events = getState().activity
    .filter(a => a.userId === userId && a.type === 'progress' && a.unit === 'chapter' && a.to > a.from)
    .map(a => ({ at: a.at, n: a.to - a.from, mangaId: a.mangaId }));

  // Last 12 calendar months, oldest first.
  const d0 = new Date(now);
  const months = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(d0.getFullYear(), d0.getMonth() - 11 + i, 1);
    const end = new Date(d0.getFullYear(), d0.getMonth() - 10 + i, 1);
    const ev = events.filter(e => e.at >= start && e.at < end);
    return { label: MONTH(start), year: start.getFullYear(), chapters: ev.reduce((t, e) => t + e.n, 0),
      days: new Set(ev.map(e => new Date(e.at).toDateString())).size,
      completed: items.filter(x => x.entry.completedAt >= start && x.entry.completedAt < end).length };
  });

  // Daily heatmap: the last 26 full weeks ending this week (Mon-first columns).
  const today = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
  const firstDay = new Date(today); firstDay.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 25 * 7);
  const perDay = {};
  for (const e of events) { const k = new Date(e.at).toDateString(); perDay[k] = (perDay[k] || 0) + e.n; }
  const days = [];
  for (let d = new Date(firstDay); d <= today; d.setDate(d.getDate() + 1)) days.push({ date: new Date(d), chapters: perDay[d.toDateString()] || 0 });

  const genreCount = {};
  for (const { manga } of read) for (const g of manga.genres) genreCount[g] = (genreCount[g] || 0) + 1;
  const genres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  const authorCh = {};
  for (const { manga, entry } of read) for (const a of manga.authors) authorCh[a] = (authorCh[a] || 0) + entry.chapter;
  const authors = Object.entries(authorCh).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, chapters]) => ({ name, chapters }));

  const ratings = Array.from({ length: 10 }, (_, i) => ({ score: i + 1, count: rated.filter(x => x.entry.rating === i + 1).length }));

  // Year in review.
  const yearEvents = events.filter(e => e.at >= yearStart);
  const completedThisYear = items.filter(x => x.entry.completedAt >= yearStart).sort((a, b) => a.entry.completedAt - b.entry.completedAt);
  const yearGenre = {};
  for (const e of yearEvents) for (const g of peek(e.mangaId)?.genres || []) yearGenre[g] = (yearGenre[g] || 0) + e.n;
  const monthsThisYear = months.filter(m => m.year === year);
  const busiest = monthsThisYear.reduce((a, b) => (b.chapters > (a?.chapters || 0) ? b : a), null);
  const top = [...completedThisYear].sort((a, b) => b.entry.rating - a.entry.rating || b.entry.chapter - a.entry.chapter)[0];

  return {
    counts: { completed: by('completed'), reading: by('reading'), planning: by('planning'), paused: by('paused'), dropped: by('dropped'), total: items.length },
    chapters: read.reduce((t, x) => t + x.entry.chapter, 0),
    volumes: read.reduce((t, x) => t + x.entry.volume, 0),
    avgRating: avg(rated.map(x => x.entry.rating)),
    genres, authors, ratings, months, days, completedThisYear,
    wrapped: {
      year, completed: completedThisYear.length, chapters: yearEvents.reduce((t, e) => t + e.n, 0),
      topGenre: Object.entries(yearGenre).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      avgRating: avg(completedThisYear.filter(x => x.entry.rating).map(x => x.entry.rating)),
      busiestMonth: busiest?.chapters ? busiest : null, top: top || null,
      daysRead: new Set(yearEvents.map(e => new Date(e.at).toDateString())).size,
    },
  };
}
