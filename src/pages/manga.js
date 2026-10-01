import { html, useEffect, useState } from '../../vendor/preact-htm.js';
import * as db from '../data/db.js';
import { get, peek } from '../data/provider.js';
import { PUB_STATUS } from '../data/catalog.js';
import { similarTo, byAuthor, shelfRating, totalOf } from '../data/selectors.js';
import { MangaCover, MangaCard, StatusDropdown, RatingInput, Stepper, ProgressBar, ReviewCard, UserAvatar, Tabs, Icon,
  Skeleton, EmptyState, ErrorState, Chip } from '../components.js';
import { openModal, toast, attempt } from '../ui.js';
import { link, mangaHref } from '../router.js';
import { years, plural } from '../util.js';

export function MangaPage({ id, tab = 'overview' }) {
  db.useDb();
  const [state, setState] = useState({ m: peek(id), loading: true, error: null });
  const load = () => {
    setState(s => ({ ...s, loading: true, error: null }));
    get(id).then(m => setState({ m, loading: false, error: null })).catch(e => setState({ m: null, loading: false, error: e.message }));
  };
  useEffect(load, [id]);
  const { m, error } = state;

  if (error) return html`<div class="page"><${ErrorState} message=${error} onRetry=${load} /></div>`;
  if (!m) return html`<div class="page"><${DetailSkeleton} /></div>`;

  const reviews = db.getState().reviews.filter(r => r.mangaId === m.id);
  const tabs = [
    { id: 'overview', label: 'Overview' }, { id: 'reviews', label: 'Reviews', count: reviews.length },
    { id: 'characters', label: 'Characters', count: m.characters.length }, { id: 'related', label: 'Related Manga' },
    { id: 'recommendations', label: 'Recommendations' },
  ].map(t => ({ ...t, href: mangaHref(m.id, t.id === 'overview' ? '' : t.id) }));
  const shelf = shelfRating(m.id);

  return html`<div class="page detail">
    <header class="detail-head" style=${`--h:${m.hue}`}>
      <div class="detail-cover"><${MangaCover} manga=${m} size="lg" />
        ${m.score && html`<span class="obi" aria-label=${`Community score ${m.score.toFixed(1)} out of 10`}>★ ${m.score.toFixed(1)}</span>`}</div>
      <div class="detail-info">
        ${m.native && m.native.toLowerCase() !== m.title.toLowerCase() && html`<span class="detail-native" lang="ja">${m.native}</span>`}
        <h1>${m.title}</h1>
        ${m.alt.length > 0 && html`<p class="muted small">Also known as ${m.alt.join(' · ')}</p>`}
        <dl class="credits">
          ${m.authors.length > 0 && html`<div><dt>Story</dt><dd>${m.authors.map((a, i) => html`${i ? ', ' : ''}<a href=${link('discover', { author: a })}>${a}</a>`)}</dd></div>`}
          ${m.artists.length > 0 && m.artists.join() !== m.authors.join() && html`<div><dt>Art</dt><dd>${m.artists.map((a, i) => html`${i ? ', ' : ''}<a href=${link('discover', { author: a })}>${a}</a>`)}</dd></div>`}
        </dl>
        <div class="facts">
          <span class=${'pill pub-' + m.status}>${PUB_STATUS[m.status]}</span>
          <span>${years(m)}</span>
          <span>${m.chapters ? plural(m.chapters, 'chapter') : m.latest ? `${m.latest}+ chapters` : 'Chapters unknown'}</span>
          <span>${m.volumes ? plural(m.volumes, 'volume') : 'Volumes unknown'}</span>
          <span>${m.format}${m.demographic ? ' · ' + m.demographic : ''}</span>
        </div>
        <div class="chips">${m.genres.map(g => html`<${Chip} href=${link('discover', { genre: g })}>${g}<//>`)}</div>
        <div class="scores">
          ${m.score && html`<div><b class="score-big">${m.score.toFixed(1)}</b><span class="muted small">community average</span></div>`}
          ${shelf && html`<div><b class="score-big">${shelf.avg.toFixed(1)}</b><span class="muted small">from ${plural(shelf.count, 'reader')} here</span></div>`}
        </div>
      </div>
      <${ActionPanel} m=${m} />
    </header>

    <${Tabs} tabs=${tabs} active=${tab} label="Manga sections" />
    <div class="tab-panel">
      ${tab === 'overview' && html`<${Overview} m=${m} />`}
      ${tab === 'reviews' && html`<${ReviewsTab} m=${m} reviews=${reviews} />`}
      ${tab === 'characters' && (m.characters.length
        ? html`<div class="characters">${m.characters.map(c => html`<div class="character" style=${`--h:${(m.hue + c.name.length * 23) % 360}`}>
            <span class="char-face" aria-hidden="true">${c.name.replace(/["“”]/g, '')[0]}</span><b>${c.name}</b><span class="muted small">${c.role}</span></div>`)}</div>`
        : html`<${EmptyState} title="No characters listed yet" />`)}
      ${tab === 'related' && html`<${Related} m=${m} />`}
      ${tab === 'recommendations' && html`<div class="grid">${similarTo(m, 12).map(x => html`<${MangaCard} key=${x.id} manga=${x} />`)}</div>`}
    </div>
  </div>`;
}

function ActionPanel({ m }) {
  const e = db.entryOf(m.id);
  const fav = db.me().favorites.includes(m.id);
  const add = () => { db.setStatus(m.id, 'planning'); toast(`Added to Want to Read`, { action: { label: 'Undo', run: db.undo } }); };
  const favorite = () => attempt(() => toast(db.toggleFavorite(m.id) ? 'Added to your favorites shelf' : 'Removed from favorites'));
  return html`<aside class="actions" aria-label="Your library">
    ${e ? html`
      <label class="field"><span>Status</span><${StatusDropdown} mangaId=${m.id} /></label>
      <${Stepper} id="d-ch" label="Chapter" value=${e.chapter} max=${m.chapters || (m.status === 'FINISHED' ? m.latest : null)}
        onChange=${v => db.setProgress(m.id, { chapter: v })} />
      <${Stepper} id="d-vol" label="Volume" value=${e.volume} max=${m.volumes} onChange=${v => db.setProgress(m.id, { volume: v })} />
      <${ProgressBar} value=${e.chapter} max=${totalOf(m)} />
      <div class="field"><span>Your rating</span><${RatingInput} value=${e.rating} onChange=${r => db.rate(m.id, r)} /></div>`
    : html`
      <button class="btn primary big block" onClick=${add}><${Icon} name="plus" /> Add to Library</button>
      <label class="field"><span>Or add as</span><${StatusDropdown} mangaId=${m.id} /></label>`}
    <div class="action-row">
      <button class=${'btn' + (fav ? ' faved' : '')} aria-pressed=${fav} onClick=${favorite}><${Icon} name="heart" size=${16} fill=${fav} /> ${fav ? 'Favorited' : 'Favorite'}</button>
      <button class="btn" onClick=${() => openModal('addToList', { mangaId: m.id })}><${Icon} name="list" size=${16} /> Add to list</button>
      <button class="btn" onClick=${() => openModal('review', { mangaId: m.id })}><${Icon} name="edit" size=${16} /> ${db.myReviewOf(m.id) ? 'Edit review' : 'Review'}</button>
    </div>
  </aside>`;
}

function Overview({ m }) {
  const e = db.entryOf(m.id);
  const s = db.getState();
  const readers = Object.keys(s.library).filter(u => u !== db.meId() && s.library[u][m.id]).map(u => ({ user: s.users[u], entry: s.library[u][m.id] }));
  const [notes, setNotes] = useState(e?.notes || '');
  return html`<div class="overview">
    <section class="synopsis">
      <h2>Synopsis</h2>
      <p>${m.synopsis || 'No synopsis yet.'}</p>
      ${e && html`<label class="field notes"><span>Your private notes</span>
        <textarea rows="3" value=${notes} onInput=${ev => setNotes(ev.target.value)} onBlur=${() => notes !== e.notes && db.setNotes(m.id, notes)}
          placeholder="Where you left off, favorite panels, theories…"></textarea></label>`}
    </section>
    <aside>
      <h2>Readers here</h2>
      ${readers.length ? html`<ul class="readers">${readers.map(({ user, entry }) => html`<li><${UserAvatar} user=${user} size=${28} />
          <span><a class="user-link" href=${'#/user/' + user.username}>${user.name}</a>
          <span class="muted small"> ${db.STATUSES[entry.status].toLowerCase()}${entry.rating ? ` · ${entry.rating}/10` : ''}</span></span></li>`)}</ul>`
        : html`<p class="muted">No one else here has this on their shelf yet.</p>`}
    </aside>
  </div>`;
}

function ReviewsTab({ m, reviews }) {
  const mine = db.myReviewOf(m.id);
  const sorted = [...reviews].sort((a, b) => (b.userId === db.meId()) - (a.userId === db.meId()) || b.likes.length - a.likes.length);
  return html`<div class="stack">
    ${!mine && html`<div class="cta-row"><p>What did you think of ${m.title}?</p>
      <button class="btn primary" onClick=${() => openModal('review', { mangaId: m.id })}>Write a review</button></div>`}
    ${sorted.length ? sorted.map(r => html`<${ReviewCard} key=${r.id} review=${r} showManga=${false} />`)
      : html`<${EmptyState} title="No reviews yet">Be the first to say something about it.<//>`}
  </div>`;
}

function Related({ m }) {
  const same = byAuthor(m);
  return same.length
    ? html`<h2 class="sub">More by ${m.authors.join(' & ')}</h2><div class="grid">${same.map(x => html`<${MangaCard} key=${x.id} manga=${x} />`)}</div>`
    : html`<${EmptyState} title="No related manga in the catalog">Check the Recommendations tab for similar stories.<//>`;
}

const DetailSkeleton = () => html`<div class="detail-head" aria-busy="true">
  <${Skeleton} w="220px" h="330px" r=${4} />
  <div class="detail-info"><${Skeleton} w="30%" /><${Skeleton} w="70%" h=${36} /><${Skeleton} w="50%" /><${Skeleton} w="80%" /><${Skeleton} w="60%" h=${28} r=${14} /></div>
  <div class="actions"><${Skeleton} h=${44} r=${6} /><${Skeleton} h=${36} r=${6} /></div>
</div>`;
