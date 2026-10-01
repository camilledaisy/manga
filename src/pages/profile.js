import { html, useState } from '../../vendor/preact-htm.js';
import * as db from '../data/db.js';
import { feed, stats } from '../data/selectors.js';
import { UserAvatar, SpineShelf, ActivityCard, ListCard, ReviewCard, StatsCard, Tabs, Icon, EmptyState, InviteButton } from '../components.js';
import { openModal, toast } from '../ui.js';
import { userHref, mangaHref } from '../router.js';
import { fmtDate } from '../util.js';

export function Profile({ username, tab = 'activity' }) {
  const s = db.useDb();
  const u = username ? db.userByName(username) : db.me();
  const [confirmReset, setConfirmReset] = useState(false);
  const [arranging, setArranging] = useState(false);
  if (!u) return html`<div class="page"><${EmptyState} title="No reader with that name" action=${html`<a class="btn" href="#/">Go home</a>`} /></div>`;
  const mine = u.id === db.meId();
  const st = stats(u.id);
  const following = s.follows[u.id] || [];
  const followers = db.followersOf(u.id);
  const lists = s.lists.filter(l => l.userId === u.id && (l.public || mine));
  const reviews = s.reviews.filter(r => r.userId === u.id);
  const base = mine ? '#/profile' : userHref(u);
  const tabs = [{ id: 'activity', label: 'Activity' }, { id: 'lists', label: 'Lists', count: lists.length }, { id: 'reviews', label: 'Reviews', count: reviews.length },
    { id: 'people', label: 'Following', count: following.length }].map(t => ({ ...t, href: base + (t.id === 'activity' ? '' : '/' + t.id) }));
  const suggestions = Object.values(s.users).filter(x => x.id !== db.meId() && !(s.follows[db.meId()] || []).includes(x.id));

  return html`<div class="page profile">
    <header class="profile-head">
      <${UserAvatar} user=${u} size=${104} link=${false} />
      <div class="profile-info">
        <h1>${u.name}</h1>
        <span class="muted">@${u.username} · joined ${fmtDate(u.joinedAt)}</span>
        <p class="bio">${u.bio || (mine ? 'Add a short bio so other readers know what you like.' : '')}</p>
        <div class="follow-counts small">
          <a href=${base + '/people'}><b>${following.length}</b> following</a><span><b>${followers.length}</b> followers</span>
        </div>
      </div>
      <div class="profile-actions">
        ${mine ? html`<div class="row"><button class="btn" onClick=${() => openModal('profile')}><${Icon} name="edit" size=${16} /> Edit profile</button>
            ${db.online && html`<${InviteButton} user=${u} />`}</div>`
          : html`<${FollowButton} user=${u} />`}
      </div>
    </header>

    <div class="stat-row compact">
      <${StatsCard} label="Completed" value=${st.counts.completed} />
      <${StatsCard} label="Reading" value=${st.counts.reading} />
      <${StatsCard} label="Chapters" value=${st.chapters.toLocaleString()} />
      <${StatsCard} label="Avg rating" value=${st.avgRating ? st.avgRating.toFixed(1) : '–'} />
      ${mine && html`<a class="stat-card link-card" href="#/stats">See all stats <${Icon} name="right" size=${16} /></a>`}
    </div>

    <section>
      <header class="section-head"><h2>Favorites</h2>${mine && html`<span class="row small muted">${u.favorites.length}/${db.FAVORITES_MAX} · add with the heart on any manga
        ${u.favorites.length > 1 && html`<button class="btn small" aria-pressed=${arranging} onClick=${() => setArranging(!arranging)}>${arranging ? 'Done' : 'Rearrange'}</button>`}</span>`}</header>
      <${SpineShelf} ids=${u.favorites} editable=${mine && arranging} />
    </section>

    ${u.favoriteCharacters.length > 0 && html`<section>
      <header class="section-head"><h2>Favorite characters</h2></header>
      <div class="chips">${u.favoriteCharacters.map(c => c.mangaId
        ? html`<a class="chip char-chip" href=${mangaHref(c.mangaId, 'characters')}>${c.name}</a>` : html`<span class="chip char-chip">${c.name}</span>`)}</div>
    </section>`}

    <${Tabs} tabs=${tabs} active=${tab} label="Profile sections" />
    <div class="tab-panel">
      ${tab === 'activity' && html`<div class="feed">${feed([u.id], 25).map(a => html`<${ActivityCard} key=${a.id} activity=${a} />`)}</div>`}
      ${tab === 'lists' && (lists.length ? html`<div class="list-grid">${lists.map(l => html`<${ListCard} key=${l.id} list=${l} />`)}</div>` : html`<${EmptyState} title="No public lists" />`)}
      ${tab === 'reviews' && (reviews.length ? html`<div class="stack">${reviews.map(r => html`<${ReviewCard} key=${r.id} review=${r} />`)}</div>` : html`<${EmptyState} title="No reviews yet" />`)}
      ${tab === 'people' && html`<div class="people">
        ${following.map(id => html`<${PersonRow} key=${id} user=${s.users[id]} />`)}
        ${!following.length && html`<${EmptyState} title="Not following anyone yet"
          action=${mine && db.online && html`<${InviteButton} user=${u} label="Copy your profile link to share" />`}>
          ${mine ? 'Search for friends by username, or send them your profile link.' : ''}<//>`}
        ${mine && suggestions.length > 0 && html`<h2 class="sub">Readers you might like</h2>${suggestions.map(x => html`<${PersonRow} key=${x.id} user=${x} />`)}`}
      </div>`}
    </div>

    ${mine && db.online && html`<footer class="danger-zone small muted">
      Signed in as @${u.username}. <button class="btn small" onClick=${() => db.signOut()}>Sign out</button>
    </footer>`}
    ${mine && !db.online && html`<footer class="danger-zone small muted">
      This prototype keeps your data in this browser.
      ${confirmReset ? html` Reset everything to the sample data? <button class="btn small danger" onClick=${() => { db.resetAll(); setConfirmReset(false); toast('Sample data restored'); }}>Yes, reset</button>
          <button class="btn small ghost" onClick=${() => setConfirmReset(false)}>Cancel</button>`
        : html` <button class="link" onClick=${() => setConfirmReset(true)}>Reset to sample data</button>`}
    </footer>`}
  </div>`;
}

function FollowButton({ user }) {
  const on = db.isFollowing(user.id);
  return html`<button class=${'btn' + (on ? '' : ' primary')} aria-pressed=${on} onClick=${() => db.toggleFollow(user.id)}>${on ? 'Following' : 'Follow'}</button>`;
}

function PersonRow({ user }) {
  return html`<div class="person"><${UserAvatar} user=${user} size=${44} />
    <div><a class="user-link" href=${userHref(user)}>${user.name}</a><p class="muted small">${user.bio}</p></div>
    ${user.id !== db.meId() && html`<${FollowButton} user=${user} />`}</div>`;
}
