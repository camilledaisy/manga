// USER-GENERATED data store: library, ratings, reviews, lists, follows, activity.
// Every write goes through an action below, so the UI never talks to storage directly.
// Two backends:
//   local demo (no config): sample readers, everything in this browser's localStorage
//   online (src/config.js filled in): Supabase accounts; each action is diffed and saved by remote.js
// `state.session.userId` is the signed-in user.
import { useEffect, useState } from '../../vendor/preact-htm.js';
import { seed } from './seed.js';
import * as provider from './provider.js';
import * as remote from './remote.js';

const KEY = 'mangashelf:db:v1';
const LEGACY_KEY = 'manga-shelf';   // the first single-page version of this app
const LEGACY_DONE = 'mangashelf:legacy-imported';
const MERGE_WINDOW = 30 * 60e3;     // consecutive +1s within 30 min become one "read chapters 84–87" entry
export const FAVORITES_MAX = 10;

export const STATUSES = { reading: 'Currently Reading', planning: 'Want to Read', completed: 'Completed', paused: 'On Hold', dropped: 'Dropped' };
export const SHORT_STATUS = { ...STATUSES, reading: 'Reading' };

export const online = remote.enabled;
let state = online ? null : load();
let undoState = null;
// 'ready' | 'loading' | 'signedOut' | 'recovery' (setting a new password) | 'error'
let status = online ? 'loading' : 'ready';
let statusError = '';
let recovering = false;
let version = 0;      // bumps on every local change, so a slow refresh never overwrites newer edits
let saving = 0;       // writes still on their way to the server
let queue = Promise.resolve();
const listeners = new Set();
const notify = (e) => listeners.forEach(f => f(e));
const newId = (p) => p + '_' + (crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2));

function load() {
  let s;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch { /* corrupt or blocked: reseed */ }
  if (!s || s.version !== 1) s = seed();
  s.library[s.session.userId] ??= {};
  s.messages ??= [];
  migrateLegacy(s);
  return s;
}

/** Imports the shelf saved by the first version of the app, once per browser. */
function migrateLegacy(s) {
  let old;
  try { old = JSON.parse(localStorage.getItem(LEGACY_KEY)); if (localStorage.getItem(LEGACY_DONE)) return false; } catch { return false; }
  if (!old || s.migratedLegacy) return false;
  const lib = s.library[s.session.userId];
  for (const e of Object.values(old)) {
    if (!e || typeof e.title !== 'string' || !(e.status in STATUSES)) continue;
    const id = 'al-' + e.id;
    provider.remember({ id, title: e.title, native: '', alt: [], authors: [], artists: [], status: 'RELEASING', start: null, end: null,
      genres: [], demographic: null, format: 'Manga', chapters: e.chapters, volumes: null, latest: e.chapters, updatedDaysAgo: null,
      score: null, popularity: 0, trending: 0, synopsis: '', characters: [], hue: (e.id * 47) % 360, cover: e.cover || null });
    lib[id] ??= { status: e.status, chapter: e.progress || 0, volume: 0, rating: e.score || 0, notes: e.notes || '',
      addedAt: e.updated || Date.now(), updatedAt: e.updated || Date.now(), startedAt: null, completedAt: null };
  }
  s.migratedLegacy = true;
  if (s.online) try { localStorage.setItem(LEGACY_DONE, '1'); } catch { /* imports again next time; entries are not duplicated */ }
  return true;
}

function persist() {
  if (state?.online) return;   // online data lives on the server
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { notify({ error: 'Could not save. Your browser storage may be full or blocked.' }); }
}

function apply(next, undoable = false) {
  const prev = state;
  undoState = undoable ? prev : null;
  state = next;
  version++;
  persist();
  if (next.online) save(prev, next);
  notify();
}

function save(prev, next) {
  saving++;
  queue = queue.then(() => remote.push(prev, next))
    .catch(e => { notify({ error: `Couldn't save your change (${e.message}). Reloading your data.` }); return refresh(true); })
    .finally(() => { saving--; });
}

function mutate(fn, undoable) {
  const next = structuredClone(state);
  const out = fn(next, next.session.userId, next.library[next.session.userId]);
  apply(next, undoable);
  return out;
}

/** Restores the state before the last undoable action (+1, status change, removal). */
export function undo() { if (undoState) { const u = undoState; apply(u); } }

// ---------- accounts (online mode) ----------
export const getStatus = () => status;
export const getStatusError = () => statusError;
const setStatus_ = (s, err = '') => { status = s; statusError = err; notify(); };

export async function start() {
  if (!online) return;
  try {
    // Supabase warns against awaiting its calls inside this callback, hence the setTimeout.
    await remote.onAuth((event, s) => {
      if (event === 'PASSWORD_RECOVERY') recovering = true;   // set synchronously: start() checks it right after
      setTimeout(() => {
        if (event === 'PASSWORD_RECOVERY') setStatus_('recovery');
        else if (event === 'SIGNED_OUT') { state = null; setStatus_('signedOut'); }
        else if (event === 'SIGNED_IN' && s && status === 'signedOut' && !recovering) open(s.user);
      });
    });
    const s = await remote.session();
    if (recovering) return setStatus_('recovery');
    s ? await open(s.user) : setStatus_('signedOut');
  } catch (e) { setStatus_('error', e.message); }
}

/** Called after a new password is saved from a reset link. */
export async function finishRecovery() {
  recovering = false;
  const s = await remote.session();
  s ? await open(s.user) : setStatus_('signedOut');
}

async function open(user) {
  setStatus_('loading');
  try {
    state = await remote.loadAll(user);
    version++;
    setStatus_('ready');
    const next = structuredClone(state);
    if (migrateLegacy(next)) apply(next);
  } catch (e) { setStatus_('error', e.message); }
}

/** Pulls friends' latest changes. Skipped while your own edits are saving. */
export async function refresh(force = false) {
  if (!state?.online || (!force && saving)) return;
  const v = version;
  try {
    const s = await remote.session();
    if (!s) return setStatus_('signedOut');
    const next = await remote.loadAll(s.user);
    if (force || version === v) { state = next; undoState = null; notify(); }
  } catch { /* offline for a moment: keep what we have */ }
}

export const signOut = () => remote.signOut();

/** Fetches just your messages (cheap enough to poll while a conversation is open). */
export async function refreshMessages() {
  if (!state?.online || saving) return;
  const v = version;
  try {
    const messages = await remote.loadMessages();
    if (version === v && state && JSON.stringify(messages) !== JSON.stringify(state.messages)) { state = { ...state, messages }; notify(); }
  } catch { /* try again on the next tick */ }
}
export const backend = remote;

export const getState = () => state;
export function subscribe(f) { listeners.add(f); return () => listeners.delete(f); }

/** Re-renders the calling component on every change. */
export function useDb() {
  const [, tick] = useState(0);
  useEffect(() => subscribe(() => tick(t => t + 1)), []);
  return state;
}

export const meId = () => state.session.userId;
export const me = () => state.users[meId()];
export const userByName = (name) => Object.values(state.users).find(u => u.username === name);
export const entryOf = (mangaId, userId = meId()) => state.library[userId]?.[mangaId] || null;
export const isFollowing = (userId) => state.follows[meId()]?.includes(userId);

// ---------- activity ----------
function log(s, uid, a) {
  const now = Date.now();
  // The latest entry of the same kind for this manga; a status change in between doesn't break a reading session.
  const last = s.activity.find(x => x.userId === uid && x.type === a.type && x.mangaId === a.mangaId && x.unit === a.unit);
  const same = last && now - last.at < MERGE_WINDOW;
  if (same && a.type === 'progress') {
    last.to = a.to; last.at = now;
    if (last.to <= last.from) s.activity.splice(s.activity.indexOf(last), 1);
    return;
  }
  if (same && (a.type === 'rating' || a.type === 'status')) { Object.assign(last, a, { at: now }); return; }
  s.activity.unshift({ id: newId('a'), userId: uid, at: now, ...a });
}

// ---------- library ----------
function ensureEntry(s, uid, lib, mangaId) {
  return lib[mangaId] ??= { status: 'planning', chapter: 0, volume: 0, rating: 0, notes: '', addedAt: Date.now(), updatedAt: Date.now(), startedAt: null, completedAt: null };
}

function applyStatus(s, uid, e, mangaId, status) {
  const m = provider.peek(mangaId);
  e.status = status;
  if (status === 'reading') e.startedAt ??= Date.now();
  if (status === 'completed') {
    e.completedAt = Date.now();
    e.startedAt ??= Date.now();
    if (m?.chapters && e.chapter < m.chapters) e.chapter = m.chapters;
    if (m?.volumes && e.volume < m.volumes) e.volume = m.volumes;
  }
  log(s, uid, { type: 'status', mangaId, status });
}

export function setStatus(mangaId, status) {
  mutate((s, uid, lib) => {
    const fresh = !lib[mangaId];
    const e = ensureEntry(s, uid, lib, mangaId);
    if (fresh || e.status !== status) applyStatus(s, uid, e, mangaId, status);
    e.updatedAt = Date.now();
  }, true);
}

export function setProgress(mangaId, { chapter, volume }) {
  return mutate((s, uid, lib) => {
    const m = provider.peek(mangaId);
    const e = ensureEntry(s, uid, lib, mangaId);
    const clamp = (n, max) => Math.max(0, Math.min(Math.floor(Number(n) || 0), max || Infinity));
    if (chapter != null) {
      const to = clamp(chapter, m?.chapters || (m?.status === 'FINISHED' ? m?.latest : null));
      if (to !== e.chapter) log(s, uid, { type: 'progress', mangaId, unit: 'chapter', from: e.chapter, to });
      e.chapter = to;
    }
    if (volume != null) {
      const to = clamp(volume, m?.volumes);
      if (to !== e.volume) log(s, uid, { type: 'progress', mangaId, unit: 'volume', from: e.volume, to });
      e.volume = to;
    }
    if ((e.status === 'planning' || e.status === 'paused') && e.chapter > 0) applyStatus(s, uid, e, mangaId, 'reading');
    if (m?.chapters && e.chapter >= m.chapters && m.status === 'FINISHED' && e.status !== 'completed') applyStatus(s, uid, e, mangaId, 'completed');
    e.updatedAt = Date.now();
    return e;
  }, true);
}

export const plusOne = (mangaId) => setProgress(mangaId, { chapter: (entryOf(mangaId)?.chapter || 0) + 1 });

export function rate(mangaId, rating) {
  mutate((s, uid, lib) => {
    const e = ensureEntry(s, uid, lib, mangaId);
    e.rating = rating;
    e.updatedAt = Date.now();
    if (rating) log(s, uid, { type: 'rating', mangaId, rating });
  });
}

export function setNotes(mangaId, notes) {
  mutate((s, uid, lib) => { ensureEntry(s, uid, lib, mangaId).notes = notes; });
}

export function removeFromLibrary(mangaId) {
  mutate((s, uid, lib) => { delete lib[mangaId]; }, true);
}

export function toggleFavorite(mangaId) {
  return mutate((s, uid) => {
    const f = s.users[uid].favorites;
    const i = f.indexOf(mangaId);
    if (i >= 0) { f.splice(i, 1); return false; }
    if (f.length >= FAVORITES_MAX) throw new Error(`Your favorites shelf holds ${FAVORITES_MAX} titles. Remove one first.`);
    f.push(mangaId);
    log(s, uid, { type: 'favorite', mangaId });
    return true;
  });
}

export function moveFavorite(from, to) {
  mutate((s, uid) => { const f = s.users[uid].favorites; f.splice(to, 0, f.splice(from, 1)[0]); });
}

// ---------- reviews ----------
export const myReviewOf = (mangaId) => state.reviews.find(r => r.mangaId === mangaId && r.userId === meId());

export function saveReview({ mangaId, rating, body, spoiler }) {
  mutate((s, uid, lib) => {
    let r = s.reviews.find(x => x.mangaId === mangaId && x.userId === uid);
    if (r) Object.assign(r, { rating, body, spoiler, editedAt: Date.now() });
    else {
      s.reviews.unshift({ id: newId('r'), userId: uid, mangaId, rating, body, spoiler, createdAt: Date.now(), likes: [], comments: [] });
      log(s, uid, { type: 'review', mangaId, rating });
    }
    if (rating) { const e = ensureEntry(s, uid, lib, mangaId); e.rating = rating; e.updatedAt = Date.now(); }
  });
}

export function deleteReview(id) {
  mutate((s, uid) => { s.reviews = s.reviews.filter(r => !(r.id === id && r.userId === uid)); });
}

export function toggleLike(reviewId) {
  mutate((s, uid) => {
    const r = s.reviews.find(x => x.id === reviewId);
    const i = r.likes.indexOf(uid);
    i >= 0 ? r.likes.splice(i, 1) : r.likes.push(uid);
  });
}

export function addComment(reviewId, body) {
  mutate((s, uid) => {
    s.reviews.find(x => x.id === reviewId).comments.push({ id: newId('c'), userId: uid, body, createdAt: Date.now() });
  });
}

// ---------- direct messages ----------
export const unreadCount = () => (state?.messages || []).filter(m => m.to === meId() && !m.readAt).length;

export function sendMessage(to, body) {
  mutate((s, uid) => { s.messages.push({ id: newId('m'), from: uid, to, body, at: Date.now(), readAt: null }); });
}

export function markRead(other) {
  if (!state.messages.some(m => m.from === other && m.to === meId() && !m.readAt)) return;
  mutate((s, uid) => { for (const m of s.messages) if (m.from === other && m.to === uid && !m.readAt) m.readAt = Date.now(); });
}

// ---------- social ----------
export function toggleFollow(userId) {
  mutate((s, uid) => {
    const f = s.follows[uid] ??= [];
    const i = f.indexOf(userId);
    i >= 0 ? f.splice(i, 1) : f.push(userId);
  });
}
export const followersOf = (userId) => Object.keys(state.follows).filter(u => state.follows[u].includes(userId));

export function updateProfile(patch) {
  mutate((s, uid) => { Object.assign(s.users[uid], patch); });
}

// ---------- lists ----------
export function createList({ title, description = '', isPublic = true, mangaIds = [] }) {
  return mutate((s, uid) => {
    const id = newId('l');
    s.lists.unshift({ id, userId: uid, title, description, public: isPublic, mangaIds, createdAt: Date.now(), updatedAt: Date.now() });
    if (isPublic) log(s, uid, { type: 'list', listId: id, title });
    return id;
  });
}

function ownList(s, uid, id) {
  const l = s.lists.find(x => x.id === id);
  if (!l || l.userId !== uid) throw new Error('You can only edit your own lists.');
  l.updatedAt = Date.now();
  return l;
}

export function updateList(id, patch) { mutate((s, uid) => { Object.assign(ownList(s, uid, id), patch); }); }
export function deleteList(id) { mutate((s, uid) => { ownList(s, uid, id); s.lists = s.lists.filter(l => l.id !== id); }, true); }
export function toggleInList(id, mangaId) {
  mutate((s, uid) => {
    const l = ownList(s, uid, id);
    const i = l.mangaIds.indexOf(mangaId);
    i >= 0 ? l.mangaIds.splice(i, 1) : l.mangaIds.push(mangaId);
  });
}
export function moveInList(id, from, to) {
  mutate((s, uid) => { const ids = ownList(s, uid, id).mangaIds; ids.splice(to, 0, ids.splice(from, 1)[0]); });
}

/** Wipes local data back to the sample data (Profile → Reset). */
export function resetAll() { const s = seed(); s.migratedLegacy = true; apply(s); }
