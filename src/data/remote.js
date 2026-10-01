// Supabase backend: accounts, loading everyone's shared data, and saving your changes.
// db.js stays the single source of truth for the UI; this module converts between its
// state shape and the tables in supabase/schema.sql.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { peek, remember } from './provider.js';
import { CATALOG } from './catalog.js';

export const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const known = new Set(CATALOG.map(m => m.id));
let sb = null;

async function client() {
  if (sb) return sb;
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL('../../vendor/supabase.js', import.meta.url).href;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load the sign-in library.'));
      document.head.append(s);
    });
  }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } });
  return sb;
}

const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const redirectTo = () => location.origin + location.pathname;

// ---------- auth ----------
export async function session() { return ok(await (await client()).auth.getSession()).session; }
export async function onAuth(f) { (await client()).auth.onAuthStateChange((event, s) => f(event, s)); }
export async function signIn(email, password) { ok(await (await client()).auth.signInWithPassword({ email, password })); }
export async function signOut() { await (await client()).auth.signOut(); }
export async function sendReset(email) { ok(await (await client()).auth.resetPasswordForEmail(email, { redirectTo: redirectTo() })); }
export async function setPassword(password) { ok(await (await client()).auth.updateUser({ password })); }

export const USERNAME = /^[a-z0-9_]{3,20}$/;
/** Returns true when the account is ready, false when the email must be confirmed first. */
export async function signUp({ email, password, username, name }) {
  const c = await client();
  if (!ok(await c.rpc('username_available', { wanted: username }))) throw new Error(`The username “${username}” is taken. Try another.`);
  const data = ok(await c.auth.signUp({ email, password, options: { data: { username, name }, emailRedirectTo: redirectTo() } }));
  return Boolean(data.session);
}

// ---------- load ----------
// ponytail: loads every shared row at sign-in (fine for a circle of friends, ~1000 rows per table);
// scope queries to people you follow and paginate if the site grows.
export async function loadAll(user) {
  const c = await client();
  const q = (t, f = x => x) => f(c.from(t).select('*')).then(ok);
  const [profiles, entries, notes, reviews, likes, comments, follows, lists, activity, cache, messages] = await Promise.all([
    q('profiles'), q('library_entries'), q('private_notes'), q('reviews'), q('review_likes'),
    q('review_comments', x => x.order('created_at')), q('follows'), q('lists', x => x.order('updated_at', { ascending: false })),
    q('activity', x => x.order('at', { ascending: false }).limit(1000)), q('manga_cache'), loadMessages(),
  ]);
  for (const row of cache) {
    const m = row.data;
    if (m && typeof m.title === 'string') remember({ ...m, id: row.id, cover: /^https:\/\/s4\.anilist\.co\//.test(m.cover || '') ? m.cover : null });
    known.add(row.id);
  }

  const users = {};
  for (const p of profiles) users[p.id] = { id: p.id, username: p.username, name: p.name || p.username, bio: p.bio, avatar: p.avatar, hue: p.hue,
    favorites: p.favorites, favoriteCharacters: p.favorite_characters, joinedAt: p.joined_at };
  if (!users[user.id]) {   // profile row missing (e.g. signup trigger added later): create it
    const username = (user.user_metadata?.username || 'reader_' + user.id.slice(0, 6)).toLowerCase();
    const p = ok(await c.from('profiles').insert({ id: user.id, username, name: user.user_metadata?.name || username }).select().single());
    users[p.id] = { id: p.id, username: p.username, name: p.name, bio: '', avatar: null, hue: p.hue, favorites: [], favoriteCharacters: [], joinedAt: p.joined_at };
  }

  const library = Object.fromEntries(Object.keys(users).map(id => [id, {}]));
  for (const e of entries) library[e.user_id][e.manga_id] = { status: e.status, chapter: e.chapter, volume: e.volume, rating: e.rating, notes: '',
    addedAt: e.added_at, updatedAt: e.updated_at, startedAt: e.started_at, completedAt: e.completed_at };
  for (const n of notes) if (library[n.user_id][n.manga_id]) library[n.user_id][n.manga_id].notes = n.notes;

  const byReview = (rows, f) => rows.reduce((o, r) => ((o[r.review_id] ??= []).push(f(r)), o), {});
  const likesBy = byReview(likes, r => r.user_id);
  const commentsBy = byReview(comments, r => ({ id: r.id, userId: r.user_id, body: r.body, createdAt: r.created_at }));

  return {
    version: 1, online: true, session: { userId: user.id }, users,
    follows: follows.reduce((o, f) => ((o[f.follower_id] ??= []).push(f.followee_id), o), {}),
    library,
    reviews: reviews.map(r => ({ id: r.id, userId: r.user_id, mangaId: r.manga_id, rating: r.rating, body: r.body, spoiler: r.spoiler,
      createdAt: r.created_at, editedAt: r.edited_at ?? undefined, likes: likesBy[r.id] || [], comments: commentsBy[r.id] || [] }))
      .sort((a, b) => b.createdAt - a.createdAt),
    lists: lists.map(l => ({ id: l.id, userId: l.user_id, title: l.title, description: l.description, public: l.public, mangaIds: l.manga_ids,
      createdAt: l.created_at, updatedAt: l.updated_at })),
    activity: activity.map(a => ({ id: a.id, userId: a.user_id, type: a.type, mangaId: a.manga_id ?? undefined, at: a.at, ...a.data })),
    messages,
  };
}

/** Your conversations only: row-level security returns messages you sent or received. */
export async function loadMessages() {
  const rows = ok(await (await client()).from('messages').select('*').order('created_at'));
  return rows.map(m => ({ id: m.id, from: m.sender_id, to: m.recipient_id, body: m.body, at: m.created_at, readAt: m.read_at }));
}

// ---------- save: diff the state before and after an action, write what changed ----------
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function diff(prev = {}, next = {}) {
  const changed = Object.keys(next).filter(k => !same(prev[k], next[k]));
  const removed = Object.keys(prev).filter(k => !(k in next));
  return { changed, removed };
}
const byId = (xs) => Object.fromEntries(xs.map(x => [x.id, x]));

export async function push(prev, next) {
  const c = await client();
  const uid = next.session.userId;
  const run = async (p) => ok(await p);
  const mangaIds = new Set();

  const u0 = prev.users[uid], u1 = next.users[uid];
  if (!same(u0, u1)) {
    u1.favorites.forEach(id => mangaIds.add(id));
    await cache(c, mangaIds);
    await run(c.from('profiles').update({ name: u1.name, bio: u1.bio, avatar: u1.avatar, favorites: u1.favorites, favorite_characters: u1.favoriteCharacters }).eq('id', uid));
  }

  const lib = diff(prev.library[uid], next.library[uid]);
  for (const id of lib.changed) mangaIds.add(id);
  const myLists = diff(byId(prev.lists.filter(l => l.userId === uid)), byId(next.lists.filter(l => l.userId === uid)));
  for (const id of myLists.changed) next.lists.find(l => l.id === id).mangaIds.forEach(m => mangaIds.add(m));
  await cache(c, mangaIds);

  for (const id of lib.changed) {
    const e = next.library[uid][id], old = prev.library[uid]?.[id];
    const { notes, ...rest } = e;
    if (!old || !same({ ...old, notes: '' }, { ...rest, notes: '' })) {
      await run(c.from('library_entries').upsert({ user_id: uid, manga_id: id, status: e.status, chapter: e.chapter, volume: e.volume, rating: e.rating,
        added_at: e.addedAt, updated_at: e.updatedAt, started_at: e.startedAt, completed_at: e.completedAt }));
    }
    if ((old?.notes || '') !== notes) {
      await run(notes ? c.from('private_notes').upsert({ user_id: uid, manga_id: id, notes }) : c.from('private_notes').delete().match({ user_id: uid, manga_id: id }));
    }
  }
  for (const id of lib.removed) {
    await run(c.from('library_entries').delete().match({ user_id: uid, manga_id: id }));
    await run(c.from('private_notes').delete().match({ user_id: uid, manga_id: id }));
  }

  const strip = ({ likes, comments, ...r }) => r;
  const myRev = diff(byId(prev.reviews.filter(r => r.userId === uid).map(strip)), byId(next.reviews.filter(r => r.userId === uid).map(strip)));
  for (const id of myRev.changed) {
    const r = next.reviews.find(x => x.id === id);
    await run(c.from('reviews').upsert({ id, user_id: uid, manga_id: r.mangaId, rating: r.rating, body: r.body, spoiler: r.spoiler, created_at: r.createdAt, edited_at: r.editedAt ?? null }));
  }
  for (const id of myRev.removed) await run(c.from('reviews').delete().eq('id', id));

  const prevRev = byId(prev.reviews);
  for (const r of next.reviews) {
    const p = prevRev[r.id];
    const had = p?.likes.includes(uid), has = r.likes.includes(uid);
    if (has && !had) await run(c.from('review_likes').insert({ review_id: r.id, user_id: uid }));
    if (had && !has) await run(c.from('review_likes').delete().match({ review_id: r.id, user_id: uid }));
    const before = new Set((p?.comments || []).map(x => x.id));
    for (const cm of r.comments) if (cm.userId === uid && !before.has(cm.id)) {
      await run(c.from('review_comments').insert({ id: cm.id, review_id: r.id, user_id: uid, body: cm.body, created_at: cm.createdAt }));
    }
  }

  const f0 = new Set(prev.follows[uid] || []), f1 = new Set(next.follows[uid] || []);
  for (const id of f1) if (!f0.has(id)) await run(c.from('follows').insert({ follower_id: uid, followee_id: id }));
  for (const id of f0) if (!f1.has(id)) await run(c.from('follows').delete().match({ follower_id: uid, followee_id: id }));

  for (const id of myLists.changed) {
    const l = next.lists.find(x => x.id === id);
    await run(c.from('lists').upsert({ id, user_id: uid, title: l.title, description: l.description, public: l.public, manga_ids: l.mangaIds, created_at: l.createdAt, updated_at: l.updatedAt }));
  }
  for (const id of myLists.removed) await run(c.from('lists').delete().eq('id', id));

  const sentBefore = new Set(prev.messages.map(m => m.id));
  for (const m of next.messages) if (m.from === uid && !sentBefore.has(m.id)) {
    await run(c.from('messages').insert({ id: m.id, sender_id: uid, recipient_id: m.to, body: m.body, created_at: m.at }));
  }
  const unreadBefore = new Set(prev.messages.filter(m => m.to === uid && !m.readAt).map(m => m.id));
  const nowRead = new Set(next.messages.filter(m => unreadBefore.has(m.id) && m.readAt).map(m => m.from));
  for (const other of nowRead) await run(c.rpc('mark_read', { other }));

  const act = diff(byId(prev.activity.filter(a => a.userId === uid)), byId(next.activity.filter(a => a.userId === uid)));
  for (const id of act.changed) {
    const { id: _, userId, type, mangaId, at, ...data } = next.activity.find(a => a.id === id);
    await run(c.from('activity').upsert({ id, user_id: uid, type, manga_id: mangaId ?? null, data, at }));
  }
  if (act.removed.length) await run(c.from('activity').delete().in('id', act.removed));
}

/** Share metadata of AniList-sourced manga so friends' browsers can show them. */
async function cache(c, ids) {
  const rows = [...ids].filter(id => !known.has(id) && /^al-\d+$/.test(id)).map(id => ({ id, data: peek(id) })).filter(r => r.data);
  if (!rows.length) return;
  ok(await c.from('manga_cache').upsert(rows, { onConflict: 'id', ignoreDuplicates: true }));
  rows.forEach(r => known.add(r.id));
}
