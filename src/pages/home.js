import { html } from '../../vendor/preact-htm.js';
import * as db from '../data/db.js';
import { CATALOG } from '../data/catalog.js';
import { peek } from '../data/provider.js';
import { libraryItems, feed, recommendFor, totalOf } from '../data/selectors.js';
import { MangaShelf, MangaCover, ActivityCard, EmptyState, Icon, ProgressBar, plusOne, progressText } from '../components.js';
import { openModal } from '../ui.js';
import { mangaHref } from '../router.js';
import { relTime } from '../util.js';

export function Home() {
  const s = db.useDb();
  const u = db.me();
  const items = libraryItems(u.id);
  const reading = items.filter(x => x.entry.status === 'reading').sort((a, b) => b.entry.updatedAt - a.entry.updatedAt);
  const cont = reading[0];
  const behind = (m) => { const e = db.entryOf(m.id); return e && m.latest && e.chapter < m.latest && e.status !== 'planning'; };
  const updated = CATALOG.map(m => peek(m.id)).filter(m => m.updatedAt).sort((a, b) => b.updatedAt - a.updatedAt);
  const newForYou = updated.filter(behind).length;
  const today = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });

  return html`<div class="page home">
    <header class="page-head greet">
      <span class="kicker"><span lang="ja">おかえり</span> · ${today}</span>
      <h1>Welcome back, ${u.name}</h1>
      <p class="lede">${reading.length
        ? html`You're reading ${reading.length} manga${newForYou ? html`, and <button class="link" onClick=${() => document.getElementById('updated').scrollIntoView({ behavior: 'smooth' })}>${newForYou} have new chapters</button> waiting` : ''}.`
        : 'Find something to start tonight.'}</p>
    </header>

    <${MangaShelf} title="Currently Reading" href="#/library/reading" variant="progress" items=${reading.map(x => x.manga)}
      empty=${html`<${EmptyState} title="Nothing in progress">Mark a manga as Currently Reading and it shows up here with a one-tap +1. <a href="#/discover">Find something to read</a><//>`} />

    ${cont && html`<${ContinueReading} manga=${cont.manga} entry=${cont.entry} />`}

    <div id="updated">
      <${MangaShelf} title="Recently Updated Manga" kicker="New chapters" href="#/discover?sort=updated" items=${updated.slice(0, 14)}
        meta=${(m) => html`<span class=${behind(m) ? 'new-dot' : ''}>Ch ${m.latest} · ${relTime(m.updatedAt)}</span>`} />
    </div>

    <${MangaShelf} title="Recommendations For You" kicker="Based on what you rate highly" items=${recommendFor(u.id, 14)} />

    <div class="two-col">
      <section>
        <header class="section-head"><h2>Your Recent Activity</h2><a class="see-all" href="#/profile">Profile</a></header>
        <div class="feed">${feed([u.id], 7).map(a => html`<${ActivityCard} key=${a.id} activity=${a} showUser=${false} />`)}</div>
      </section>
      <section>
        <header class="section-head"><h2>Friends' Activity</h2><a class="see-all" href="#/reviews">Reviews</a></header>
        <div class="feed">${(s.follows[u.id] || []).length
          ? feed(s.follows[u.id], 9).map(a => html`<${ActivityCard} key=${a.id} activity=${a} />`)
          : html`<${EmptyState} title="You're not following anyone yet">Follow readers from their profiles to see what they're reading.<//>`}</div>
      </section>
    </div>
  </div>`;
}

function ContinueReading({ manga: m, entry: e }) {
  const total = totalOf(m);
  return html`<section class="continue">
    <span class="kicker">Continue reading</span>
    <div class="continue-card">
      <div class="continue-cover"><${MangaCover} manga=${m} size="md" href=${mangaHref(m.id)} />
        <span class="obi" aria-hidden="true">${m.chapters ? `${m.chapters - e.chapter} chapters to go` : `${(m.latest || e.chapter) - e.chapter} chapters to catch up`}</span></div>
      <div class="continue-body">
        <a class="continue-title" href=${mangaHref(m.id)}>${m.title}</a>
        <span class="muted">${m.authors.join(', ')} · last read ${relTime(e.updatedAt)}</span>
        <p class="continue-next">Up next: <b>Chapter ${e.chapter + 1}</b></p>
        <${ProgressBar} value=${e.chapter} max=${total} />
        <span class="mono small muted">${progressText(m, e)}</span>
        <p class="continue-syn">${m.synopsis}</p>
        <div class="row">
          <button class="btn primary big" onClick=${() => plusOne(m)}><${Icon} name="check" size=${18} /> I read chapter ${e.chapter + 1}</button>
          <button class="btn" onClick=${() => openModal('progress', { mangaId: m.id })}>Update progress</button>
        </div>
      </div>
    </div>
  </section>`;
}
