import { html, render, useEffect, useState, useErrorBoundary } from '../vendor/preact-htm.js';
import * as db from './data/db.js';
import { hydrateCovers, onCovers } from './data/provider.js';
import { useRoute } from './router.js';
import { Icon, SearchBar, UserAvatar, ErrorState, EmptyState } from './components.js';
import { ModalHost, Toasts } from './modals.js';
import { toast } from './ui.js';
import { Home } from './pages/home.js';
import { Discover } from './pages/discover.js';
import { MangaPage } from './pages/manga.js';
import { Library } from './pages/library.js';
import { Lists, ListDetail } from './pages/lists.js';
import { Reviews } from './pages/reviews.js';
import { Stats } from './pages/stats.js';
import { Profile } from './pages/profile.js';
import { AuthScreen } from './pages/auth.js';
import { Messages } from './pages/messages.js';
import { Assistant } from './pages/assistant.js';

const NAV = [
  ['', 'Home', 'home'], ['discover', 'Discover', 'compass'], ['library', 'My Library', 'books'], ['lists', 'Lists', 'list'],
  ['reviews', 'Reviews', 'quote'], ['stats', 'Stats', 'chart'], ['profile', 'Profile', 'user'],
];

function page({ parts: [root, a, b], query }) {
  switch (root) {
    case undefined: return html`<${Home} />`;
    case 'discover': return html`<${Discover} query=${query} />`;
    case 'manga': return html`<${MangaPage} id=${a} tab=${b} />`;
    case 'library': return html`<${Library} status=${a && (a in db.STATUSES) ? a : 'all'} query=${query} />`;
    case 'lists': return a ? html`<${ListDetail} id=${a} />` : html`<${Lists} />`;
    case 'reviews': return html`<${Reviews} tab=${a} />`;
    case 'stats': return html`<${Stats} />`;
    case 'profile': return html`<${Profile} tab=${a} />`;
    case 'user': return html`<${Profile} username=${a} tab=${b} />`;
    case 'messages': return html`<${Messages} username=${a} />`;
    case 'assistant': return html`<${Assistant} />`;
    default: return html`<div class="page"><${EmptyState} title="Page not found" action=${html`<a class="btn" href="#/">Go home</a>`} /></div>`;
  }
}

function Boundary({ children }) {
  const [error, reset] = useErrorBoundary(e => console.error(e));
  return error ? html`<div class="page"><${ErrorState} message=${error.message} onRetry=${reset} /></div>` : children;
}

// Theme: 'system' follows the OS; an explicit choice sets data-theme on <html>.
function useTheme() {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('mangashelf:theme') || 'system'; } catch { return 'system'; } });
  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('mangashelf:theme', theme); } catch { /* per-device convenience only */ }
  }, [theme]);
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  // Switch with a circle that grows from the button (View Transitions), or a short colour fade elsewhere.
  const toggle = (e) => {
    const next = dark ? 'light' : 'dark';
    const root = document.documentElement;
    const flip = () => { root.dataset.theme = next; setTheme(next); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return flip();
    if (!document.startViewTransition) {
      root.classList.add('theme-fade');
      flip();
      return setTimeout(() => root.classList.remove('theme-fade'), 450);
    }
    const r = e.currentTarget.getBoundingClientRect();
    root.style.setProperty('--tx', `${r.left + r.width / 2}px`);
    root.style.setProperty('--ty', `${r.top + r.height / 2}px`);
    document.startViewTransition(flip);
  };
  return [dark, toggle];
}

function App() {
  const route = useRoute();
  db.useDb();
  const [dark, toggleTheme] = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [, coversTick] = useState(0);
  const root = route.parts[0] || '';
  const section = root === 'user' ? 'profile' : root === 'manga' ? null : root;
  const key = route.parts.slice(0, 2).join('/');

  useEffect(() => { scrollTo(0, 0); setSearchOpen(false); }, [key]);
  useEffect(() => {
    const off = onCovers(() => coversTick(t => t + 1));
    hydrateCovers();
    const unsub = db.subscribe((e) => e?.error && toast(e.error, { error: true }));
    return () => { off(); unsub(); };
  }, []);
  useEffect(() => {
    const t = NAV.find(([p]) => p === section)?.[1];
    document.title = t && t !== 'Home' ? `${t} · Manga Shelf` : 'Manga Shelf';
  }, [section]);

  return html`
    <a class="skip" href="#main" onClick=${e => { e.preventDefault(); document.getElementById('main').focus(); }}>Skip to content</a>
    <header class="topbar">
      <div class="topbar-inner">
        <a class="logo" href="#/" aria-label="Manga Shelf home"><span class="hanko" aria-hidden="true">棚</span><span class="wordmark">Manga Shelf</span></a>
        <nav class="nav-desktop" aria-label="Main">
          ${NAV.map(([p, label]) => html`<a href=${'#/' + p} aria-current=${section === p ? 'page' : undefined}>${label}</a>`)}
        </nav>
        <div class=${'topbar-search' + (searchOpen ? ' open' : '')}><${SearchBar} autoFocus=${searchOpen} onDone=${() => setSearchOpen(false)} /></div>
        <button class="btn icon-btn ghost search-toggle" aria-label=${searchOpen ? 'Close search' : 'Search'} onClick=${() => setSearchOpen(!searchOpen)}>
          <${Icon} name=${searchOpen ? 'x' : 'search'} /></button>
        <a class=${'btn icon-btn ghost' + (root === 'assistant' ? ' current' : '')} href="#/assistant" aria-label="Ask the assistant" title="Ask the assistant"><${Icon} name="sparkle" /></a>
        <a class=${'btn icon-btn ghost badge-host' + (root === 'messages' ? ' current' : '')} href="#/messages" title="Messages"
          aria-label=${db.unreadCount() ? `Messages, ${db.unreadCount()} unread` : 'Messages'}><${Icon} name="comment" />
          ${db.unreadCount() > 0 && html`<span class="badge dot" aria-hidden="true">${db.unreadCount()}</span>`}</a>
        <button class="btn icon-btn ghost" onClick=${toggleTheme} aria-label=${dark ? 'Switch to light mode' : 'Switch to dark mode'} title="Toggle theme">
          <${Icon} name=${dark ? 'sun' : 'moon'} /></button>
        <span class="topbar-avatar"><${UserAvatar} user=${db.me()} size=${34} /></span>
      </div>
    </header>
    <main id="main" tabindex="-1"><${Boundary} key=${key}>${page(route)}<//></main>
    <nav class="nav-mobile" aria-label="Main">
      ${NAV.map(([p, label, icon]) => html`<a href=${'#/' + p} aria-current=${section === p ? 'page' : undefined}>
        <${Icon} name=${icon} size=${20} /><span>${label.replace('My ', '')}</span></a>`)}
    </nav>
    <${ModalHost} /><${Toasts} />`;
}

// Accounts gate (online mode only): sign-in screen until there's a session, then the app.
function Root() {
  db.useDb();
  const status = db.getStatus();
  useEffect(() => { db.start(); }, []);
  useEffect(() => {
    if (status !== 'ready' || !db.online) return;
    const pull = () => document.visibilityState === 'visible' && db.refresh();
    const t = setInterval(pull, 60e3);
    addEventListener('focus', pull);
    return () => { clearInterval(t); removeEventListener('focus', pull); };
  }, [status]);
  if (status === 'ready') return html`<${App} />`;
  if (status === 'signedOut' || status === 'recovery') return html`<${AuthScreen} recovery=${status === 'recovery'} key=${status} /><${Toasts} />`;
  if (status === 'error') return html`<div class="page"><${ErrorState} message=${`Couldn't reach your shelf: ${db.getStatusError()}`} onRetry=${() => location.reload()} /></div>`;
  return html`<p class="boot">Opening your shelf…</p>`;
}

render(html`<${Root} />`, document.getElementById('app'));
