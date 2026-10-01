// Reusable UI components. Each takes plain props; data comes from db/provider/selectors.
import { html, useState, useEffect, useRef, useMemo } from '../vendor/preact-htm.js';
import * as db from './data/db.js';
import * as provider from './data/provider.js';
import { PUB_STATUS, GENRES, FORMATS, DEMOGRAPHICS } from './data/catalog.js';
import { totalOf } from './data/selectors.js';
import { mangaHref, userHref, go, link } from './router.js';
import { openModal, toast } from './ui.js';
import { cls, relTime, plural, years } from './util.js';

// ---------- Icon ----------
const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const ICONS = {
  home: 'M3.5 10.5 12 3.5l8.5 7V20a.5.5 0 0 1-.5.5h-5.5v-6h-5v6H4a.5.5 0 0 1-.5-.5z',
  compass: C(12, 12, 9) + 'M15.5 8.5l-2 5-5 2 2-5z',
  books: 'M4 4h4v16H4zM10 4h4v16h-4zM16 6.2l3.4-.9 3.1 14.5-3.4.9z',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  quote: 'M6 7h4v4c0 3-1.3 5-4 6M14 7h4v4c0 3-1.3 5-4 6',
  chart: 'M5 20V11M11 20V5M17 20v-7M3 20.5h18',
  user: C(12, 8, 4) + 'M4.5 20.5a7.5 7.5 0 0 1 15 0',
  search: C(11, 11, 6.5) + 'M20 20l-4.2-4.2',
  sun: C(12, 12, 4) + 'M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  rows: 'M4 5h16M4 12h16M4 19h16',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  globe: C(12, 12, 9) + 'M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  x: 'M6 6l12 12M18 6 6 18', check: 'M5 12.5l4.5 4.5L19 7.5',
  left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6', up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6',
  filter: 'M4 5h16l-6 7.5V19l-4-2v-4.5z', edit: 'M4 20h4L19.5 8.5l-4-4L4 16z', trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13',
  star: 'M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z' + C(12, 12, 3),
  comment: 'M4 5h16v11H10l-5 4v-4H4z', book: 'M3 5h6a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3zM21 5h-6a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21z',
  sparkle: 'M12 3v5M12 16v5M3 12h5M16 12h5M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  camera: 'M4 8h3l1.5-2h7L17 8h3v11H4z' + C(12, 13, 3.5),
};
export const Icon = ({ name, size = 18, fill }) => html`
  <svg class="icon" width=${size} height=${size} viewBox="0 0 24 24" aria-hidden="true" fill=${fill ? 'currentColor' : 'none'}
    stroke="currentColor" stroke-width=${name === 'grip' ? 3 : 1.75} stroke-linecap="round" stroke-linejoin="round"><path d=${ICONS[name]} /></svg>`;

// ---------- small primitives ----------
export const Skeleton = ({ w = '100%', h = 14, r = 4, style = '' }) =>
  html`<span class="skeleton" style=${`width:${w};height:${typeof h === 'number' ? h + 'px' : h};border-radius:${r}px;${style}`}></span>`;

export const EmptyState = ({ title, children, action }) => html`
  <div class="empty"><div class="empty-mark" aria-hidden="true">空</div><p class="empty-title">${title}</p>
    ${children && html`<p class="muted">${children}</p>`}${action}</div>`;

export const ErrorState = ({ message, onRetry }) => html`
  <div class="empty error" role="alert"><div class="empty-mark" aria-hidden="true">!</div>
    <p class="empty-title">Something went wrong</p><p class="muted">${message}</p>
    ${onRetry && html`<button class="btn" onClick=${onRetry}>Try again</button>`}</div>`;

export const Chip = ({ children, active, onClick, href }) => href
  ? html`<a class=${cls('chip', active && 'on')} href=${href}>${children}</a>`
  : html`<button type="button" class=${cls('chip', active && 'on')} aria-pressed=${!!active} onClick=${onClick}>${children}</button>`;

export function Tabs({ tabs, active, onChange, label }) {
  return html`<div class="tabs" role="tablist" aria-label=${label}>
    ${tabs.map(t => html`<${t.href ? 'a' : 'button'} role="tab" class="tab" aria-selected=${t.id === active} href=${t.href}
      onClick=${t.href ? undefined : () => onChange(t.id)}>${t.label}${t.count != null && html`<span class="tab-n">${t.count}</span>`}<//>`)}
  </div>`;
}

export function Stepper({ label, value, onChange, max, id }) {
  return html`<div class="stepper">
    <label for=${id}>${label}</label>
    <div class="stepper-row">
      <button type="button" class="btn icon-btn" aria-label=${'Decrease ' + label} onClick=${() => onChange(Math.max(0, value - 1))} disabled=${value <= 0}><${Icon} name="minus" /></button>
      <input id=${id} type="number" inputmode="numeric" min="0" max=${max || undefined} value=${value}
        onInput=${e => onChange(Math.max(0, Math.min(+e.target.value || 0, max || Infinity)))} />
      <button type="button" class="btn icon-btn" aria-label=${'Increase ' + label} onClick=${() => onChange(Math.min(value + 1, max || Infinity))} disabled=${max && value >= max}><${Icon} name="plus" /></button>
      <span class="muted mono">/ ${max || '?'}</span>
    </div>
  </div>`;
}

// ---------- MangaCover ----------
export function MangaCover({ manga, size = 'md', href, stamp = true }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const entry = db.entryOf(manga.id);
  const fav = db.me().favorites.includes(manga.id);
  const body = html`
    <div class="cover-ph" aria-hidden="true">
      <span class="cover-native">${manga.native || manga.title}</span>
      <span class="cover-title">${manga.title}</span>
      <span class="cover-author">${manga.authors[0] || ''}</span>
    </div>
    ${manga.cover && !failed && html`<img src=${manga.cover} alt="" loading="lazy" class=${loaded ? 'in' : ''}
      onLoad=${() => setLoaded(true)} onError=${() => setFailed(true)} />`}
    ${stamp && entry?.status === 'completed' && html`<span class="stamp" title="Completed">読了</span>`}
    ${stamp && fav && html`<span class="fav-pin" title="Favorite"><${Icon} name="heart" size=${12} fill /></span>`}`;
  const props = { class: `cover cover--${size}`, style: `--h:${manga.hue ?? 220}` };
  return href ? html`<a ...${props} href=${href} aria-label=${manga.title}>${body}</a>` : html`<div ...${props}>${body}</div>`;
}

// ---------- ProgressBar ----------
export function ProgressBar({ value, max, compact }) {
  const pct = max ? Math.min(100, Math.round(100 * value / max)) : null;
  return html`<div class=${cls('progress', compact && 'compact')}>
    <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax=${max || undefined} aria-valuenow=${value}
      aria-label=${max ? `${pct}% read` : `Chapter ${value}, total unknown`}>
      <span class="progress-fill" style=${`width:${pct ?? 0}%`}></span>
    </div>
    ${!compact && html`<span class="progress-pct mono">${pct != null ? pct + '%' : '—'}</span>`}
  </div>`;
}

export function progressText(m, e) {
  const total = m.chapters;
  return total ? `Chapter ${e.chapter} / ${total}` : `Chapter ${e.chapter}${m.latest ? ` · ${m.latest} out` : ''}`;
}

// ---------- RatingInput ----------
export function RatingInput({ value = 0, onChange, label = 'Your rating' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return html`<div class="rating-input" role="radiogroup" aria-label=${label} onMouseLeave=${() => setHover(0)}>
    ${Array.from({ length: 10 }, (_, i) => i + 1).map(n => html`
      <button type="button" role="radio" aria-checked=${value === n} aria-label=${`${n} out of 10`}
        class=${cls('rate-cell', n <= shown && 'on')} onMouseEnter=${() => setHover(n)}
        onClick=${() => onChange(value === n ? 0 : n)}>${n}</button>`)}
    <span class="rate-value mono">${shown ? `${shown}/10` : 'Unrated'}</span>
  </div>`;
}

export const RatingBadge = ({ value, label }) => value ? html`
  <span class="rating-badge" title=${label}><${Icon} name="star" size=${13} fill /> ${Number(value).toFixed(value % 1 ? 1 : 0)}</span>` : null;

// ---------- StatusDropdown ----------
export function StatusDropdown({ mangaId, compact }) {
  const e = db.entryOf(mangaId);
  const onChange = (ev) => {
    const v = ev.target.value;
    if (v === '__remove') {
      db.removeFromLibrary(mangaId);
      toast('Removed from your library', { action: { label: 'Undo', run: db.undo } });
    } else if (v) {
      db.setStatus(mangaId, v);
      toast(`Moved to ${db.STATUSES[v]}`, { action: { label: 'Undo', run: db.undo } });
    }
  };
  return html`<select class=${cls('status-select', compact && 'compact', e && 'st-' + e.status)} value=${e?.status || ''} onChange=${onChange}
    aria-label="Reading status">
    ${!e && html`<option value="">Add to library…</option>`}
    ${Object.entries(db.STATUSES).map(([k, v]) => html`<option value=${k}>${v}</option>`)}
    ${e && html`<option value="__remove">Remove from library</option>`}
  </select>`;
}

// ---------- MangaCard ----------
export function plusOne(m) {
  const before = db.entryOf(m.id);
  const e = db.plusOne(m.id);
  if (e.chapter === before?.chapter) return toast(`You're caught up on ${m.title}.`);
  const done = e.status === 'completed' && before?.status !== 'completed';
  toast(done ? `Finished ${m.title}! Rate it?` : `Chapter ${e.chapter} · ${m.title}`, {
    action: done ? { label: 'Rate', run: () => openModal('review', { mangaId: m.id }) } : { label: 'Undo', run: db.undo },
  });
}

function quickAdd(m) {
  db.setStatus(m.id, 'planning');
  toast(`Added ${m.title} to Want to Read`, { action: { label: 'Undo', run: db.undo } });
}

export function MangaCard({ manga: m, variant = 'tile', meta, rank }) {
  const e = db.entryOf(m.id);
  const href = mangaHref(m.id);

  if (variant === 'progress') {
    const total = totalOf(m);
    return html`<article class="card-progress">
      <${MangaCover} manga=${m} size="sm" href=${href} />
      <div class="cp-body">
        <a class="title-link" href=${href}>${m.title}</a>
        <span class="mono small">${progressText(m, e)}</span>
        <${ProgressBar} value=${e.chapter} max=${total} />
        <div class="cp-actions">
          <button class="btn primary" onClick=${() => plusOne(m)} aria-label=${`Read chapter ${e.chapter + 1} of ${m.title}`}><${Icon} name="plus" size=${16} /> 1 ch</button>
          <button class="btn" onClick=${() => openModal('progress', { mangaId: m.id })}>Update progress</button>
        </div>
      </div>
    </article>`;
  }

  if (variant === 'row') {
    const total = totalOf(m);
    return html`<article class="card-row">
      <${MangaCover} manga=${m} size="xs" href=${href} />
      <div class="cr-main">
        <a class="title-link" href=${href}>${m.title}</a>
        <span class="muted small">${m.authors.join(', ')} · ${years(m)} · ${m.format}</span>
      </div>
      <div class="cr-status"><${StatusDropdown} mangaId=${m.id} compact /></div>
      <div class="cr-progress">
        <span class="mono small">${e.chapter}${total ? ' / ' + total : ''} ch${e.volume ? ` · v${e.volume}` : ''}</span>
        <${ProgressBar} value=${e.chapter} max=${total} compact />
      </div>
      <div class="cr-rating">${e.rating ? html`<span class="mono">${e.rating}<span class="muted">/10</span></span>` : html`<span class="muted small">—</span>`}</div>
      <div class="cr-actions">
        ${e.status !== 'completed' && html`<button class="btn small" onClick=${() => plusOne(m)} aria-label=${`Read next chapter of ${m.title}`}>+1</button>`}
        <button class="btn small ghost" onClick=${() => openModal('progress', { mangaId: m.id })} aria-label=${`Update progress for ${m.title}`}><${Icon} name="edit" size=${15} /></button>
      </div>
    </article>`;
  }

  // tile
  return html`<article class="card-tile">
    <div class="ct-cover">
      <${MangaCover} manga=${m} href=${href} />
      ${rank && html`<span class="rank mono">${rank}</span>`}
      ${!e && html`<button class="quick-add" onClick=${() => quickAdd(m)} aria-label=${`Add ${m.title} to Want to Read`} title="Want to Read"><${Icon} name="plus" size=${16} /></button>`}
      ${e && e.status !== 'planning' && e.status !== 'completed' && totalOf(m) && html`<div class="ct-bar"><${ProgressBar} value=${e.chapter} max=${totalOf(m)} compact /></div>`}
    </div>
    <a class="title-link ct-title" href=${href}>${m.title}</a>
    <span class="muted small ct-meta">${meta ?? html`${m.authors[0]}${m.start ? ' · ' + m.start : ''}`}</span>
    ${e && html`<span class=${'pill st-' + e.status}>${db.SHORT_STATUS[e.status]}${e.status === 'reading' ? ` · ch ${e.chapter}` : ''}</span>`}
  </article>`;
}

export const MangaCardSkeleton = ({ variant = 'tile' }) => variant === 'progress'
  ? html`<div class="card-progress"><${Skeleton} w="84px" h="126px" /><div class="cp-body"><${Skeleton} w="70%" h=${16} /><${Skeleton} w="45%" /><${Skeleton} h=${6} /><${Skeleton} w="60%" h=${34} r=${6} /></div></div>`
  : html`<div class="card-tile"><${Skeleton} h="auto" style="aspect-ratio:2/3" r=${4} /><${Skeleton} w="80%" h=${14} /><${Skeleton} w="50%" h=${12} /></div>`;

// ---------- MangaShelf ----------
export function MangaShelf({ title, kicker, href, items, loading, empty, variant = 'tile', meta, ranked }) {
  const ref = useRef();
  const scroll = (dir) => ref.current.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return html`<section class="shelf">
    <header class="shelf-head">
      <div>${kicker && html`<span class="kicker">${kicker}</span>`}<h2>${title}</h2></div>
      <div class="shelf-nav">
        ${href && html`<a class="see-all" href=${href}>See all</a>`}
        <button class="btn icon-btn ghost" onClick=${() => scroll(-1)} aria-label=${`Scroll ${title} left`}><${Icon} name="left" /></button>
        <button class="btn icon-btn ghost" onClick=${() => scroll(1)} aria-label=${`Scroll ${title} right`}><${Icon} name="right" /></button>
      </div>
    </header>
    <div class=${cls('shelf-row', 'shelf-' + variant)} ref=${ref}>
      ${loading ? Array.from({ length: 6 }, () => html`<${MangaCardSkeleton} variant=${variant} />`)
        : items.length ? items.map((m, i) => html`<${MangaCard} key=${m.id} manga=${m} variant=${variant} meta=${meta?.(m)} rank=${ranked && i + 1} />`)
        : html`<div class="shelf-empty">${empty}</div>`}
    </div>
    <div class="shelf-plank" aria-hidden="true"></div>
  </section>`;
}

/** Favorites as book spines on a shelf. Editable on your own profile. */
export function SpineShelf({ ids, editable }) {
  const items = ids.map(provider.peek).filter(Boolean);
  if (!items.length) return html`<${EmptyState} title="No favorites yet">Open any manga and press the heart to put it on this shelf.<//>`;
  return html`<div class="spines" role="list">
    ${items.map((m, i) => html`<div class="spine-wrap" role="listitem" style=${`--h:${m.hue};--tilt:${i === items.length - 1 && items.length > 3 ? -4 : 0}deg`}>
      <a class="spine" href=${mangaHref(m.id)} aria-label=${m.title} title=${m.title}>
        <span class="spine-title">${m.native || m.title}</span>
        <span class="spine-mark" aria-hidden="true">${(m.authors[0] || '?')[0]}</span>
      </a>
      ${editable && html`<div class="spine-tools">
        <button class="btn icon-btn ghost small" disabled=${i === 0} onClick=${() => db.moveFavorite(i, i - 1)} aria-label=${`Move ${m.title} left`}><${Icon} name="left" size=${14} /></button>
        <button class="btn icon-btn ghost small" disabled=${i === items.length - 1} onClick=${() => db.moveFavorite(i, i + 1)} aria-label=${`Move ${m.title} right`}><${Icon} name="right" size=${14} /></button>
      </div>`}
    </div>`)}
  </div>`;
}

// ---------- UserAvatar ----------
export const UserAvatar = ({ user, size = 36, link: asLink = true }) => {
  const inner = user.avatar
    ? html`<img src=${user.avatar} alt="" />`
    : html`<span aria-hidden="true">${(user.name || user.username)[0].toUpperCase()}</span>`;
  const props = { class: 'avatar', style: `--h:${user.hue};width:${size}px;height:${size}px;font-size:${size * 0.42}px`, title: user.name };
  return asLink ? html`<a ...${props} href=${userHref(user)} aria-label=${user.name}>${inner}</a>` : html`<span ...${props}>${inner}</span>`;
};

// ---------- ActivityCard ----------
const STATUS_VERB = { reading: 'started reading', planning: 'wants to read', completed: 'completed', paused: 'put on hold', dropped: 'dropped' };

export function activityText(a, m) {
  const t = html`<a class="title-link" href=${mangaHref(m.id)}>${m.title}</a>`;
  switch (a.type) {
    case 'progress': {
      const unit = a.unit === 'volume' ? 'volume' : 'chapter';
      if (a.to < a.from) return html`moved back to ${unit} ${a.to} of ${t}`;
      return a.to - a.from > 1 ? html`read ${unit}s ${a.from + 1}–${a.to} of ${t}` : html`read ${unit} ${a.to} of ${t}`;
    }
    case 'status': return html`${STATUS_VERB[a.status]} ${t}`;
    case 'rating': return html`rated ${t} <b class="mono">${a.rating}/10</b>`;
    case 'review': return html`reviewed ${t}${a.rating ? html` <b class="mono">${a.rating}/10</b>` : ''}`;
    case 'favorite': return html`added ${t} to their favorites`;
    default: return '';
  }
}

export function ActivityCard({ activity: a, showUser = true }) {
  const state = db.getState();
  const user = state.users[a.userId];
  if (a.type === 'list') {
    const list = state.lists.find(l => l.id === a.listId);
    return html`<div class="activity">
      ${showUser && html`<${UserAvatar} user=${user} size=${32} />`}
      <p><a class="user-link" href=${userHref(user)}>${user.name}</a> created the list ${list ? html`<a class="title-link" href=${'#/lists/' + list.id}>${a.title}</a>` : html`<b>${a.title}</b>`}
        <span class="muted small time">${relTime(a.at)}</span></p>
    </div>`;
  }
  const m = provider.peek(a.mangaId);
  if (!m || !user) return null;
  return html`<div class="activity">
    ${showUser && html`<${UserAvatar} user=${user} size=${32} />`}
    <p>${showUser && html`<a class="user-link" href=${userHref(user)}>${user.name}</a> `}${activityText(a, m)}
      <span class="muted small time">${relTime(a.at)}</span></p>
    <${MangaCover} manga=${m} size="thumb" href=${mangaHref(m.id)} stamp=${false} />
  </div>`;
}

// ---------- ReviewCard ----------
export function ReviewCard({ review: r, showManga = true }) {
  const state = db.getState();
  const user = state.users[r.userId];
  const m = provider.peek(r.mangaId);
  const mine = r.userId === db.meId();
  const [revealed, setRevealed] = useState(!r.spoiler);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');
  const liked = r.likes.includes(db.meId());
  if (!m || !user) return null;
  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    db.addComment(r.id, draft.trim());
    setDraft('');
  };
  return html`<article class="review">
    ${showManga && html`<${MangaCover} manga=${m} size="xs" href=${mangaHref(m.id)} stamp=${false} />`}
    <div class="review-body">
      <header class="review-head">
        <${UserAvatar} user=${user} size=${28} />
        <div>
          <a class="user-link" href=${userHref(user)}>${user.name}</a>
          ${showManga && html` on <a class="title-link" href=${mangaHref(m.id)}>${m.title}</a>`}
          <div class="muted small">${relTime(r.createdAt)}${r.editedAt ? ' · edited' : ''}</div>
        </div>
        ${r.rating ? html`<span class="review-score mono">${r.rating}<small>/10</small></span>` : null}
      </header>
      ${revealed
        ? html`<p class="review-text">${r.body}</p>`
        : html`<button class="spoiler" onClick=${() => setRevealed(true)}><${Icon} name="eye" size=${16} /> This review contains spoilers. Show it anyway</button>`}
      <footer class="review-foot">
        <button class=${cls('btn ghost small', liked && 'liked')} aria-pressed=${liked} onClick=${() => db.toggleLike(r.id)}>
          <${Icon} name="heart" size=${15} fill=${liked} /> ${r.likes.length || ''} <span class="sr-only">likes</span></button>
        <button class="btn ghost small" aria-expanded=${showComments} onClick=${() => setShowComments(!showComments)}>
          <${Icon} name="comment" size=${15} /> ${r.comments.length || ''} <span class="sr-only">comments</span></button>
        ${r.spoiler && revealed && html`<span class="pill spoiler-tag">Spoilers</span>`}
        ${mine && html`<span class="spacer"></span>
          <button class="btn ghost small" onClick=${() => openModal('review', { mangaId: r.mangaId })}>Edit</button>`}
      </footer>
      ${showComments && html`<div class="comments">
        ${r.comments.map(c => { const u = state.users[c.userId]; return html`<div class="comment" key=${c.id}>
          <${UserAvatar} user=${u} size=${24} /><p><a class="user-link" href=${userHref(u)}>${u.name}</a> ${c.body}
          <span class="muted small time">${relTime(c.createdAt)}</span></p></div>`; })}
        <form class="comment-form" onSubmit=${submit}>
          <input value=${draft} onInput=${e => setDraft(e.target.value)} placeholder="Add a comment…" aria-label="Add a comment" maxlength="500" />
          <button class="btn small" disabled=${!draft.trim()}>Post</button>
        </form>
      </div>`}
    </div>
  </article>`;
}

// ---------- ListCard ----------
export function ListCard({ list }) {
  const owner = db.getState().users[list.userId];
  const covers = list.mangaIds.slice(0, 4).map(provider.peek).filter(Boolean);
  return html`<a class="list-card" href=${'#/lists/' + list.id}>
    <div class="collage" aria-hidden="true">
      ${covers.length ? covers.map((m, i) => html`<div class="collage-item" style=${`--i:${i}`}><${MangaCover} manga=${m} size="sm" stamp=${false} /></div>`)
        : html`<div class="collage-empty">No manga yet</div>`}
    </div>
    <div class="list-info">
      <h3>${list.title}</h3>
      <span class="muted small">${plural(list.mangaIds.length, 'manga', 'manga')} · by ${owner.name}
        ${!list.public && html` · <${Icon} name="lock" size=${12} /> Private`}</span>
      ${list.description && html`<p class="small list-desc">${list.description}</p>`}
    </div>
  </a>`;
}

// ---------- InviteButton ----------
/** Copies a link to a profile, the way friends find each other. */
export function InviteButton({ user, label = 'Copy profile link' }) {
  const url = location.origin + location.pathname + '#/user/' + encodeURIComponent(user.username);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copied. Send it to a friend so they can follow you.'); }
    catch { toast(`Your profile link: ${url}`); }
  };
  return html`<button class="btn" onClick=${copy}><${Icon} name="globe" size=${16} /> ${label}</button>`;
}

// ---------- StatsCard ----------
export const StatsCard = ({ label, value, sub }) => html`
  <div class="stat-card"><span class="stat-value">${value}</span><span class="stat-label">${label}</span>${sub && html`<span class="muted small">${sub}</span>`}</div>`;

// ---------- SearchBar (live suggestions) ----------
export function SearchBar({ autoFocus, onDone }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState({ q: '', items: [], loading: false, error: null });
  const [active, setActive] = useState(0);
  const local = useMemo(() => provider.searchLocal(q), [q]);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 3) { setRemote({ q: s, items: [], loading: false, error: null }); return; }
    setRemote(r => ({ ...r, loading: true, error: null }));
    const t = setTimeout(() => provider.searchRemote(s)
      .then(items => setRemote({ q: s, items, loading: false, error: null }))
      .catch(e => setRemote({ q: s, items: [], loading: false, error: e.message })), 350);
    return () => clearTimeout(t);
  }, [q]);

  const s = q.trim().toLowerCase();
  const people = s ? Object.values(db.getState().users).filter(u => u.username.includes(s) || u.name.toLowerCase().includes(s)).slice(0, 4) : [];
  const localTitles = new Set(local.manga.map(m => m.title.toLowerCase()));
  const extra = remote.items.filter(m => !localTitles.has(m.title.toLowerCase())).slice(0, 5);
  const options = [
    ...local.manga.map(m => ({ kind: 'manga', m, href: mangaHref(m.id) })),
    ...extra.map(m => ({ kind: 'manga', m, href: mangaHref(m.id), remote: true })),
    ...people.map(u => ({ kind: 'person', u, href: userHref(u) })),
    ...local.authors.map(a => ({ kind: 'author', label: a, href: link('discover', { author: a }) })),
    ...local.genres.map(g => ({ kind: 'genre', label: g, href: link('discover', { genre: g }) })),
  ];
  const choose = (o) => { go(o.href); setQ(''); setOpen(false); onDone?.(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && options[active]) { e.preventDefault(); choose(options[active]); }
    else if (e.key === 'Escape') { setOpen(false); e.target.blur(); onDone?.(); }
  };
  const showing = open && q.trim();
  return html`<div class="search" onFocusOut=${e => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
    <${Icon} name="search" />
    <input type="search" value=${q} placeholder="Search manga, authors, genres, people" aria-label="Search manga, authors, genres and people"
      role="combobox" aria-expanded=${!!showing} aria-controls="search-results" aria-autocomplete="list" autoFocus=${autoFocus}
      aria-activedescendant=${showing && options[active] ? 'opt-' + active : undefined}
      onInput=${e => { setQ(e.target.value); setOpen(true); setActive(0); }} onFocus=${() => setOpen(true)} onKeyDown=${onKey} />
    ${showing && html`<div class="search-pop" id="search-results" role="listbox">
      ${options.map((o, i) => html`<a id=${'opt-' + i} role="option" aria-selected=${i === active} class=${cls('sugg', i === active && 'active')}
          href=${o.href} onMouseEnter=${() => setActive(i)} onClick=${e => { e.preventDefault(); choose(o); }}>
        ${o.kind === 'manga' ? html`
          <${MangaCover} manga=${o.m} size="thumb" stamp=${false} />
          <span class="sugg-main"><b>${o.m.title}</b><span class="muted small">${o.m.authors[0] || 'Unknown author'} · ${o.m.start || '?'} · ${PUB_STATUS[o.m.status]}</span></span>
          ${o.remote && html`<span class="pill">AniList</span>`}`
        : o.kind === 'person' ? html`<${UserAvatar} user=${o.u} size=${34} link=${false} />
          <span class="sugg-main"><b>${o.u.name}</b><span class="muted small">@${o.u.username} · reader</span></span>`
        : html`<span class="sugg-ico"><${Icon} name=${o.kind === 'author' ? 'user' : 'compass'} /></span>
          <span class="sugg-main"><b>${o.label}</b><span class="muted small">${o.kind === 'author' ? 'Author · see their manga' : 'Genre · browse in Discover'}</span></span>`}
      </a>`)}
      ${remote.loading && html`<div class="sugg"><${Skeleton} w="34px" h="48px" /><span class="sugg-main"><${Skeleton} w="60%" /><${Skeleton} w="40%" h=${10} /></span></div>`}
      ${!remote.loading && remote.error && html`<p class="sugg-note muted small">Showing local results only. ${remote.error}</p>`}
      ${!options.length && !remote.loading && html`<p class="sugg-note">No matches for “${q}”.</p>`}
    </div>`}
  </div>`;
}

// ---------- FilterPanel ----------
export const EMPTY_FILTERS = { genre: '', status: '', from: '', to: '', demographic: '', format: '', rating: '', length: '', author: '' };
export const LENGTHS = { short: 'Under 50 ch', mid: '50–150 ch', long: 'Over 150 ch' };

export function applyFilters(items, f, { getRating = (m) => m.score, getStatus = (m) => m.status } = {}) {
  const genres = f.genre ? f.genre.split(',') : [];
  return items.filter(m => {
    const ch = totalOf(m) || 0;
    return (!genres.length || genres.every(g => m.genres.includes(g)))
      && (!f.status || getStatus(m) === f.status)
      && (!f.from || (m.start || 0) >= +f.from) && (!f.to || (m.start || 9999) <= +f.to)
      && (!f.demographic || m.demographic === f.demographic)
      && (!f.format || m.format === f.format)
      && (!f.rating || (getRating(m) || 0) >= +f.rating)
      && (!f.length || (f.length === 'short' ? ch < 50 : f.length === 'mid' ? ch >= 50 && ch <= 150 : ch > 150))
      && (!f.author || [...m.authors, ...m.artists].includes(f.author));
  });
}

/** fields: which filters to show. statusOptions: {value: label}. */
export function FilterPanel({ value, onChange, fields, statusOptions = PUB_STATUS, ratingLabel = 'Min rating', yearsRange }) {
  const [open, setOpen] = useState(null);
  const set = (k, v) => onChange({ ...value, [k]: v });
  const genres = value.genre ? value.genre.split(',') : [];
  const toggleGenre = (g) => set('genre', (genres.includes(g) ? genres.filter(x => x !== g) : [...genres, g]).join(','));
  const active = Object.entries(value).filter(([k, v]) => v && fields.includes(k === 'from' || k === 'to' ? 'year' : k)).length;
  const shown = open ?? active > 0;   // starts open only when filters are already applied
  const [lo, hi] = yearsRange || [1985, new Date().getFullYear()];
  const yearOpts = Array.from({ length: hi - lo + 1 }, (_, i) => hi - i);
  const sel = (k, label, opts) => html`<label class="field"><span>${label}</span>
    <select value=${value[k]} onChange=${e => set(k, e.target.value)}><option value="">Any</option>
      ${Object.entries(opts).map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select></label>`;
  return html`<div class="filters">
    <button type="button" class="btn filters-toggle" aria-expanded=${shown} onClick=${() => setOpen(!shown)}>
      <${Icon} name="filter" size=${16} /> Filters${active ? html` <span class="tab-n">${active}</span>` : ''}</button>
    <div class=${cls('filters-body', shown && 'open')}>
      ${fields.includes('genre') && html`<div class="chips" role="group" aria-label="Genres">
        ${GENRES.map(g => html`<${Chip} active=${genres.includes(g)} onClick=${() => toggleGenre(g)}>${g}<//>`)}</div>`}
      <div class="filter-fields">
        ${fields.includes('status') && sel('status', 'Status', statusOptions)}
        ${fields.includes('format') && sel('format', 'Format', Object.fromEntries(FORMATS.map(f => [f, f])))}
        ${fields.includes('demographic') && sel('demographic', 'Demographic', Object.fromEntries(DEMOGRAPHICS.map(f => [f, f])))}
        ${fields.includes('year') && html`<div class="field"><span>Year</span><div class="field-pair">
          <select aria-label="From year" value=${value.from} onChange=${e => set('from', e.target.value)}><option value="">From</option>${yearOpts.map(y => html`<option>${y}</option>`)}</select>
          <select aria-label="To year" value=${value.to} onChange=${e => set('to', e.target.value)}><option value="">To</option>${yearOpts.map(y => html`<option>${y}</option>`)}</select></div></div>`}
        ${fields.includes('rating') && sel('rating', ratingLabel, { 9: '9+', 8: '8+', 7: '7+', 6: '6+', 5: '5+' })}
        ${fields.includes('length') && sel('length', 'Chapters', LENGTHS)}
      </div>
      ${value.author && html`<div class="chips"><${Chip} active onClick=${() => set('author', '')}>Author: ${value.author} <${Icon} name="x" size=${12} /><//></div>`}
      ${active > 0 && html`<button class="btn ghost small" onClick=${() => onChange({ ...EMPTY_FILTERS })}>Clear filters</button>`}
    </div>
  </div>`;
}
