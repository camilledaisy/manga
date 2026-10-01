import { html, useState } from '../../vendor/preact-htm.js';
import * as db from '../data/db.js';
import { peek, searchLocal } from '../data/provider.js';
import { ListCard, MangaCover, UserAvatar, Icon, EmptyState } from '../components.js';
import { openModal, toast } from '../ui.js';
import { mangaHref, userHref, go } from '../router.js';
import { relTime, plural } from '../util.js';

export function Lists() {
  const s = db.useDb();
  const mine = s.lists.filter(l => l.userId === db.meId());
  const others = s.lists.filter(l => l.userId !== db.meId() && l.public);
  return html`<div class="page">
    <header class="page-head row-between">
      <div><span class="kicker" lang="ja">リスト</span><h1>Lists</h1>
        <p class="lede">Collections you curate, and ones other readers have shared.</p></div>
      <button class="btn primary" onClick=${() => openModal('list')}><${Icon} name="plus" /> New list</button>
    </header>
    <section>
      <header class="section-head"><h2>Your lists</h2></header>
      ${mine.length ? html`<div class="list-grid">${mine.map(l => html`<${ListCard} key=${l.id} list=${l} />`)}</div>`
        : html`<${EmptyState} title="No lists yet" action=${html`<button class="btn primary" onClick=${() => openModal('list')}>Create your first list</button>`}>
            Group manga however you like: comfort reads, best art, ones to recommend.<//>`}
    </section>
    <section>
      <header class="section-head"><h2>Public lists from readers</h2></header>
      <div class="list-grid">${others.map(l => html`<${ListCard} key=${l.id} list=${l} />`)}</div>
    </section>
  </div>`;
}

export function ListDetail({ id }) {
  const s = db.useDb();
  const list = s.lists.find(l => l.id === id);
  const [dragFrom, setDragFrom] = useState(null);
  const [over, setOver] = useState(null);
  const [q, setQ] = useState('');
  if (!list || (!list.public && list.userId !== db.meId())) {
    return html`<div class="page"><${EmptyState} title="This list doesn't exist or is private" action=${html`<a class="btn" href="#/lists">Back to lists</a>`} /></div>`;
  }
  const owner = s.users[list.userId];
  const mine = owner.id === db.meId();
  const items = list.mangaIds.map(peek).filter(Boolean);
  const suggestions = q.trim() ? searchLocal(q).manga.filter(m => !list.mangaIds.includes(m.id)) : [];
  const drop = (to) => { if (dragFrom != null && dragFrom !== to) db.moveInList(list.id, dragFrom, to); setDragFrom(null); setOver(null); };
  const remove = () => { db.deleteList(list.id); go('#/lists'); toast('List deleted', { action: { label: 'Undo', run: db.undo } }); };

  return html`<div class="page">
    <header class="list-head">
      <div class="collage big" aria-hidden="true">${items.slice(0, 4).map((m, i) => html`<div class="collage-item" style=${`--i:${i}`}><${MangaCover} manga=${m} size="sm" stamp=${false} /></div>`)}</div>
      <div>
        <span class="kicker">${list.public ? 'Public list' : html`<${Icon} name="lock" size=${12} /> Private list`}</span>
        <h1>${list.title}</h1>
        ${list.description && html`<p class="lede">${list.description}</p>`}
        <p class="muted small byline"><${UserAvatar} user=${owner} size=${22} /> <a class="user-link" href=${userHref(owner)}>${owner.name}</a>
          · ${plural(items.length, 'manga', 'manga')} · updated ${relTime(list.updatedAt)}</p>
        ${mine && html`<div class="row">
          <button class="btn" onClick=${() => openModal('list', { listId: list.id })}><${Icon} name="edit" size=${16} /> Edit</button>
          <button class="btn" onClick=${() => db.updateList(list.id, { public: !list.public })}><${Icon} name=${list.public ? 'lock' : 'globe'} size=${16} /> Make ${list.public ? 'private' : 'public'}</button>
          <button class="btn ghost danger" onClick=${remove}><${Icon} name="trash" size=${16} /> Delete</button></div>`}
      </div>
    </header>

    ${mine && html`<div class="list-add">
      <div class="search inline"><${Icon} name="search" />
        <input value=${q} onInput=${e => setQ(e.target.value)} placeholder="Add manga to this list…" aria-label="Find manga to add" /></div>
      ${suggestions.length > 0 && html`<div class="add-sugg">${suggestions.map(m => html`<button class="sugg" onClick=${() => { db.toggleInList(list.id, m.id); setQ(''); }}>
        <${MangaCover} manga=${m} size="thumb" stamp=${false} /><span class="sugg-main"><b>${m.title}</b><span class="muted small">${m.authors[0]}</span></span>
        <${Icon} name="plus" /></button>`)}</div>`}
    </div>`}

    ${items.length ? html`<ol class="ranked">
      ${items.map((m, i) => html`<li key=${m.id} class=${(over === i ? 'drop-target ' : '') + (dragFrom === i ? 'dragging' : '')}
          draggable=${mine} onDragStart=${e => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; }}
          onDragOver=${e => { if (dragFrom == null) return; e.preventDefault(); setOver(i); }} onDrop=${e => { e.preventDefault(); drop(i); }}
          onDragEnd=${() => { setDragFrom(null); setOver(null); }}>
        ${mine && html`<span class="grip" aria-hidden="true" title="Drag to reorder"><${Icon} name="grip" /></span>`}
        <span class="ranked-n mono">${String(i + 1).padStart(2, '0')}</span>
        <${MangaCover} manga=${m} size="xs" href=${mangaHref(m.id)} />
        <div class="ranked-main"><a class="title-link" href=${mangaHref(m.id)}>${m.title}</a>
          <span class="muted small">${m.authors.join(', ')} · ${m.start || '?'} · ${m.genres.slice(0, 3).join(', ')}</span></div>
        ${mine && html`<div class="ranked-tools">
          <button class="btn icon-btn ghost small" disabled=${i === 0} onClick=${() => db.moveInList(list.id, i, i - 1)} aria-label=${`Move ${m.title} up`}><${Icon} name="up" size=${16} /></button>
          <button class="btn icon-btn ghost small" disabled=${i === items.length - 1} onClick=${() => db.moveInList(list.id, i, i + 1)} aria-label=${`Move ${m.title} down`}><${Icon} name="down" size=${16} /></button>
          <button class="btn icon-btn ghost small" onClick=${() => db.toggleInList(list.id, m.id)} aria-label=${`Remove ${m.title} from list`}><${Icon} name="x" size=${16} /></button>
        </div>`}
      </li>`)}
    </ol>` : html`<${EmptyState} title="This list is empty">${mine ? 'Use the search above to add manga.' : ''}<//>`}
  </div>`;
}
