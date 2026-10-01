import { html, useEffect, useState } from '../../vendor/preact-htm.js';
import * as db from '../data/db.js';
import { list } from '../data/provider.js';
import { GENRES, FORMATS } from '../data/catalog.js';
import { MangaShelf, MangaCard, MangaCardSkeleton, FilterPanel, EMPTY_FILTERS, applyFilters, Chip, EmptyState, ErrorState } from '../components.js';
import { go, link } from '../router.js';
import { relTime } from '../util.js';

const SORTS = { popular: 'Most popular', trending: 'Trending', score: 'Highest rated', updated: 'Recently updated', newest: 'Newest', title: 'Title A–Z' };
const SORTERS = {
  popular: (a, b) => b.popularity - a.popularity, trending: (a, b) => b.trending - a.trending, score: (a, b) => b.score - a.score,
  updated: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0), newest: (a, b) => (b.start || 0) - (a.start || 0), title: (a, b) => a.title.localeCompare(b.title),
};

export function Discover({ query }) {
  db.useDb();
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);
  const load = () => { setError(null); list().then(setCatalog).catch(e => setError(e.message)); };
  useEffect(load, []);

  const filters = Object.fromEntries(Object.keys(EMPTY_FILTERS).map(k => [k, query[k] || '']));
  const sort = SORTS[query.sort] ? query.sort : 'popular';
  const filtering = Object.values(filters).some(Boolean) || query.sort;
  const setQuery = (f, s = query.sort) => go(link('discover', { ...f, sort: s }));
  const year = new Date().getFullYear();

  const by = (fn, n = 14) => catalog && [...catalog].sort(fn).slice(0, n);
  return html`<div class="page">
    <header class="page-head">
      <span class="kicker" lang="ja">さがす</span>
      <h1>Discover</h1>
      <p class="lede">Browse what's trending, dig for hidden gems, or filter down to exactly the kind of story you're craving.</p>
    </header>

    <div class="genre-strip" role="group" aria-label="Browse by format and genre">
      ${FORMATS.map(f => html`<${Chip} href=${link('discover', { format: f })} active=${filters.format === f}>${f}<//>`)}
      <span class="strip-sep" aria-hidden="true"></span>
      ${GENRES.map(g => html`<${Chip} href=${link('discover', { genre: g })} active=${filters.genre === g}>${g}<//>`)}
    </div>

    <${FilterPanel} value=${filters} onChange=${f => setQuery(f)} fields=${['genre', 'status', 'year', 'demographic', 'format', 'rating', 'length']} />

    ${error ? html`<${ErrorState} message=${error} onRetry=${load} />`
      : filtering ? html`<${Results} catalog=${catalog} filters=${filters} sort=${sort} onSort=${s => setQuery(filters, s)} />`
      : html`
        <${MangaShelf} title="Trending Manga" kicker="Right now" loading=${!catalog} items=${by(SORTERS.trending, 10)} ranked href=${link('discover', { sort: 'trending' })} />
        <${MangaShelf} title="Popular This Week" loading=${!catalog} items=${by(SORTERS.popular)} href=${link('discover', { sort: 'popular' })} />
        <${MangaShelf} title="Recently Updated" kicker="Fresh chapters" loading=${!catalog} items=${catalog?.filter(m => m.updatedAt).sort(SORTERS.updated)}
          meta=${m => `Ch ${m.latest} · ${relTime(m.updatedAt)}`} href=${link('discover', { sort: 'updated' })} />
        <${MangaShelf} title="Highest Rated" loading=${!catalog} items=${by(SORTERS.score)} meta=${m => `★ ${m.score.toFixed(1)} · ${m.authors[0]}`} href=${link('discover', { sort: 'score' })} />
        <${MangaShelf} title="Hidden Gems" kicker="Loved by the few who've read them" loading=${!catalog}
          items=${catalog?.filter(m => m.score >= 8.2 && m.popularity < 50).sort(SORTERS.score)} meta=${m => `★ ${m.score.toFixed(1)} · ${m.authors[0]}`} />
        <${MangaShelf} title="New Releases" kicker=${`Started ${year - 3} or later`} loading=${!catalog}
          items=${catalog?.filter(m => m.start >= year - 3).sort(SORTERS.newest)} href=${link('discover', { from: year - 3, sort: 'newest' })} />
        <${MangaShelf} title="Completed Series" kicker="Binge from start to finish" loading=${!catalog}
          items=${catalog?.filter(m => m.status === 'FINISHED' && m.format !== 'One-shot').sort(SORTERS.score)} meta=${m => `${m.chapters} ch · ${m.start}–${m.end}`}
          href=${link('discover', { status: 'FINISHED', sort: 'score' })} />
      `}
  </div>`;
}

function Results({ catalog, filters, sort, onSort }) {
  const results = catalog && applyFilters(catalog, filters).sort(SORTERS[sort]);
  return html`<section>
    <header class="section-head">
      <h2>${results ? `${results.length} manga` : 'Loading…'}</h2>
      <label class="field inline"><span>Sort</span>
        <select value=${sort} onChange=${e => onSort(e.target.value)}>${Object.entries(SORTS).map(([k, v]) => html`<option value=${k}>${v}</option>`)}</select></label>
    </header>
    <div class="grid">
      ${!results ? Array.from({ length: 12 }, () => html`<${MangaCardSkeleton} />`)
        : results.length ? results.map(m => html`<${MangaCard} key=${m.id} manga=${m} />`)
        : html`<div class="grid-full"><${EmptyState} title="No manga match these filters">Try removing a genre or widening the year range.<//></div>`}
    </div>
  </section>`;
}
