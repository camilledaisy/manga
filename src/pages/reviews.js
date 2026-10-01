import { html } from '../../vendor/preact-htm.js';
import * as db from '../data/db.js';
import { libraryItems } from '../data/selectors.js';
import { ReviewCard, MangaCover, Tabs, EmptyState } from '../components.js';
import { openModal } from '../ui.js';

export function Reviews({ tab = 'following' }) {
  const s = db.useDb();
  const me = db.meId();
  const following = new Set(s.follows[me] || []);
  const lists = {
    following: s.reviews.filter(r => following.has(r.userId)).sort((a, b) => b.createdAt - a.createdAt),
    popular: [...s.reviews].sort((a, b) => b.likes.length + b.comments.length - (a.likes.length + a.comments.length)),
    yours: s.reviews.filter(r => r.userId === me).sort((a, b) => b.createdAt - a.createdAt),
  };
  const reviewed = new Set(lists.yours.map(r => r.mangaId));
  const waiting = libraryItems(me).filter(x => x.entry.status === 'completed' && !reviewed.has(x.manga.id))
    .sort((a, b) => b.entry.completedAt - a.entry.completedAt).slice(0, 8);
  const tabs = [
    { id: 'following', label: 'Following', count: lists.following.length }, { id: 'popular', label: 'Popular', count: lists.popular.length },
    { id: 'yours', label: 'Yours', count: lists.yours.length },
  ].map(t => ({ ...t, href: '#/reviews/' + t.id }));
  const shown = lists[tab] || lists.following;

  return html`<div class="page">
    <header class="page-head"><span class="kicker" lang="ja">感想</span><h1>Reviews</h1>
      <p class="lede">What readers you follow are saying. Spoilers stay hidden until you choose to see them.</p></header>

    ${waiting.length > 0 && html`<section class="waiting">
      <header class="section-head"><h2>Finished, but not reviewed</h2></header>
      <div class="waiting-row">${waiting.map(({ manga: m, entry: e }) => html`<button class="waiting-item" onClick=${() => openModal('review', { mangaId: m.id })}
          aria-label=${`Review ${m.title}`}><${MangaCover} manga=${m} size="sm" stamp=${false} />
          <span class="small">${e.rating ? `${e.rating}/10 · ` : ''}Write a review</span></button>`)}</div>
    </section>`}

    <${Tabs} tabs=${tabs} active=${tab} label="Review feeds" />
    <div class="stack">
      ${shown.length ? shown.map(r => html`<${ReviewCard} key=${r.id} review=${r} />`)
        : html`<${EmptyState} title=${tab === 'yours' ? "You haven't written a review yet" : 'No reviews from people you follow'}>
            ${tab === 'yours' ? 'Finish something, then tell everyone how it made you feel.' : 'Follow more readers from their profiles, or browse the Popular tab.'}<//>`}
    </div>
  </div>`;
}
