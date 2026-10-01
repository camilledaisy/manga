import { html, useState } from '../../vendor/preact-htm.js';
import * as db from '../data/db.js';
import { libraryItems, totalOf } from '../data/selectors.js';
import { MangaCard, FilterPanel, EMPTY_FILTERS, applyFilters, Tabs, Icon, EmptyState } from '../components.js';
import { link } from '../router.js';

const SORTS = {
  updated: ['Recently updated', (a, b) => b.entry.updatedAt - a.entry.updatedAt],
  title: ['Title', (a, b) => a.manga.title.localeCompare(b.manga.title)],
  rating: ['Your rating', (a, b) => b.entry.rating - a.entry.rating],
  progress: ['Progress', (a, b) => pct(b) - pct(a)],
  added: ['Date added', (a, b) => b.entry.addedAt - a.entry.addedAt],
  completed: ['Date completed', (a, b) => (b.entry.completedAt || 0) - (a.entry.completedAt || 0)],
};
const pct = (x) => totalOf(x.manga) ? x.entry.chapter / totalOf(x.manga) : 0;

function pref(k, d) { try { return localStorage.getItem('mangashelf:' + k) || d; } catch { return d; } }
function savePref(k, v) { try { localStorage.setItem('mangashelf:' + k, v); } catch { /* per-device convenience only */ } }

export function Library({ status = 'all', query }) {
  db.useDb();
  const [view, setView] = useState(() => pref('view', 'grid'));
  const sort = SORTS[query.sort] ? query.sort : 'updated';
  const filters = Object.fromEntries(Object.keys(EMPTY_FILTERS).map(k => [k, query[k] || '']));
  const go = (f, s = sort) => { location.hash = link('library/' + status, { ...f, sort: s === 'updated' ? '' : s }).slice(1); };
  const setV = (v) => { setView(v); savePref('view', v); };

  const all = libraryItems(db.meId());
  const counts = Object.fromEntries(Object.keys(db.STATUSES).map(s => [s, all.filter(x => x.entry.status === s).length]));
  const inTab = status === 'all' ? all : all.filter(x => x.entry.status === status);
  const byManga = new Map(inTab.map(x => [x.manga, x]));
  const shown = applyFilters([...byManga.keys()], filters, { getRating: m => byManga.get(m).entry.rating, getStatus: m => m.status })
    .map(m => byManga.get(m)).sort(SORTS[sort][1]);

  const tabs = [{ id: 'all', label: 'All', count: all.length }, ...Object.entries(db.STATUSES).map(([id, label]) => ({ id, label, count: counts[id] }))]
    .map(t => ({ ...t, href: link('library/' + t.id, { sort: sort === 'updated' ? '' : sort }) }));
  const years = all.map(x => x.manga.start).filter(Boolean);

  return html`<div class="page">
    <header class="page-head">
      <span class="kicker" lang="ja">本棚</span>
      <h1>My Library</h1>
      <p class="lede">${all.length} manga on your shelves. ${counts.reading} in progress, ${counts.completed} finished.</p>
    </header>
    <${Tabs} tabs=${tabs} active=${status} label="Library shelves" />
    <div class="toolbar">
      <${FilterPanel} value=${filters} onChange=${f => go(f)} fields=${['genre', 'year', 'status', 'rating']} ratingLabel="Your rating"
        yearsRange=${years.length ? [Math.min(...years), Math.max(...years)] : undefined} />
      <div class="toolbar-right">
        <label class="field inline"><span>Sort</span>
          <select value=${sort} onChange=${e => go(filters, e.target.value)}>${Object.entries(SORTS).map(([k, [l]]) => html`<option value=${k}>${l}</option>`)}</select></label>
        <div class="seg" role="group" aria-label="View">
          <button class="btn icon-btn" aria-pressed=${view === 'grid'} onClick=${() => setV('grid')} aria-label="Grid view"><${Icon} name="grid" /></button>
          <button class="btn icon-btn" aria-pressed=${view === 'list'} onClick=${() => setV('list')} aria-label="List view"><${Icon} name="rows" /></button>
        </div>
      </div>
    </div>
    ${!shown.length ? html`<${EmptyState} title=${inTab.length ? 'Nothing matches these filters' : `No manga in ${status === 'all' ? 'your library' : db.STATUSES[status]} yet`}
        action=${!inTab.length && html`<a class="btn primary" href="#/discover">Discover manga</a>`}>
        ${inTab.length ? 'Try clearing a filter.' : 'Add manga from Discover or search, and they land here.'}<//>`
      : view === 'grid'
        ? html`<div class="grid">${shown.map(x => html`<${MangaCard} key=${x.manga.id} manga=${x.manga}
            meta=${x.entry.rating ? `★ ${x.entry.rating}/10 · ${x.manga.authors[0] || ''}` : undefined} />`)}</div>`
        : html`<div class="rows">
            <div class="row-head" aria-hidden="true"><span></span><span>Title</span><span>Status</span><span>Progress</span><span>Rating</span><span></span></div>
            ${shown.map(x => html`<${MangaCard} key=${x.manga.id} manga=${x.manga} variant="row" />`)}</div>`}
  </div>`;
}
