import { html, useEffect, useRef, useState } from '../../vendor/preact-htm.js';
import * as db from '../data/db.js';
import { UserAvatar, EmptyState, Icon } from '../components.js';
import { userHref } from '../router.js';
import { relTime, cls } from '../util.js';

const POLL_MS = 4000;   // ponytail: polls while open; switch to Supabase Realtime if this feels slow or chatty

function conversations(s, me) {
  const byOther = {};
  for (const m of s.messages) {
    const other = m.from === me ? m.to : m.from;
    (byOther[other] ??= []).push(m);
  }
  return Object.entries(byOther).filter(([id]) => s.users[id])
    .map(([id, msgs]) => ({ user: s.users[id], last: msgs[msgs.length - 1], unread: msgs.filter(m => m.to === me && !m.readAt).length }))
    .sort((a, b) => b.last.at - a.last.at);
}

export function Messages({ username }) {
  const s = db.useDb();
  const me = db.meId();
  const other = username ? db.userByName(username) : null;
  const convos = conversations(s, me);

  useEffect(() => {
    if (!db.online) return;
    db.refreshMessages();
    const t = setInterval(() => document.visibilityState === 'visible' && db.refreshMessages(), POLL_MS);
    return () => clearInterval(t);
  }, []);

  const following = (s.follows[me] || []).map(id => s.users[id]).filter(u => u && !convos.some(c => c.user.id === u.id));
  return html`<div class="page messages-page">
    <header class="page-head"><span class="kicker" lang="ja">手紙</span><h1>Messages</h1></header>
    <div class=${cls('dm', other && 'has-thread')}>
      <aside class="dm-list" aria-label="Conversations">
        ${convos.map(c => html`<a class=${cls('dm-item', other?.id === c.user.id && 'on')} href=${'#/messages/' + encodeURIComponent(c.user.username)} key=${c.user.id}>
          <${UserAvatar} user=${c.user} size=${40} link=${false} />
          <span class="dm-item-main"><b>${c.user.name}</b>
            <span class="muted small">${c.last.from === me ? 'You: ' : ''}${c.last.body}</span></span>
          <span class="dm-item-side"><span class="muted small">${relTime(c.last.at).replace(' ago', '')}</span>
            ${c.unread > 0 && html`<span class="badge" aria-label=${`${c.unread} unread`}>${c.unread}</span>`}</span>
        </a>`)}
        ${following.length > 0 && html`<p class="dm-sub muted small">Start a conversation</p>
          ${following.map(u => html`<a class="dm-item" href=${'#/messages/' + encodeURIComponent(u.username)} key=${u.id}>
            <${UserAvatar} user=${u} size=${40} link=${false} /><span class="dm-item-main"><b>${u.name}</b><span class="muted small">@${u.username}</span></span></a>`)}`}
        ${!convos.length && !following.length && html`<${EmptyState} title="No messages yet">Follow readers, then message them from here or from their profile.<//>`}
      </aside>
      <section class="dm-thread">
        ${other && other.id !== me ? html`<${Thread} other=${other} key=${other.id} />`
          : html`<div class="dm-placeholder muted"><${Icon} name="comment" size=${28} /><p>Pick a conversation, or message someone from their profile.</p></div>`}
      </section>
    </div>
  </div>`;
}

function Thread({ other }) {
  const s = db.getState();
  const me = db.meId();
  const msgs = s.messages.filter(m => (m.from === me && m.to === other.id) || (m.from === other.id && m.to === me));
  const [draft, setDraft] = useState('');
  const end = useRef();
  const unread = msgs.some(m => m.to === me && !m.readAt);

  useEffect(() => { if (unread) db.markRead(other.id); }, [unread, other.id]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const send = (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    db.sendMessage(other.id, body.slice(0, 2000));
    setDraft('');
  };
  const lastMine = [...msgs].reverse().find(m => m.from === me);
  return html`
    <header class="dm-head">
      <a class="btn icon-btn ghost dm-back" href="#/messages" aria-label="All conversations"><${Icon} name="left" /></a>
      <${UserAvatar} user=${other} size=${36} />
      <div><a class="user-link" href=${userHref(other)}>${other.name}</a><div class="muted small">@${other.username}</div></div>
    </header>
    <div class="dm-scroll" role="log" aria-live="polite" aria-label=${`Conversation with ${other.name}`}>
      ${!msgs.length && html`<p class="muted dm-empty">Say hi to ${other.name}. Ask what they're reading.</p>`}
      ${msgs.map((m, i) => {
        const newDay = i === 0 || new Date(m.at).toDateString() !== new Date(msgs[i - 1].at).toDateString();
        return html`
          ${newDay && html`<p class="dm-day muted small">${new Date(m.at).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</p>`}
          <div class=${cls('bubble', m.from === me ? 'mine' : 'theirs')} key=${m.id} title=${new Date(m.at).toLocaleString()}>${m.body}</div>`;
      })}
      ${lastMine && html`<p class="dm-receipt muted small">${lastMine.readAt ? 'Seen' : 'Sent'} · ${relTime(lastMine.at)}</p>`}
      <span ref=${end}></span>
    </div>
    <form class="dm-compose" onSubmit=${send}>
      <textarea rows="1" value=${draft} maxlength="2000" placeholder=${`Message ${other.name}`} aria-label=${`Message ${other.name}`}
        onInput=${e => setDraft(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}></textarea>
      <button class="btn primary" disabled=${!draft.trim()}>Send</button>
    </form>`;
}
