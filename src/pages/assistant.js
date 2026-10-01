import { html, useEffect, useRef, useState } from '../../vendor/preact-htm.js';
import * as db from '../data/db.js';
import { CATALOG } from '../data/catalog.js';
import { libraryItems, stats } from '../data/selectors.js';
import { EmptyState, Icon } from '../components.js';
import { toast } from '../ui.js';
import { cls } from '../util.js';

const SUGGESTIONS = [
  'What should I read next?',
  'Recommend something like my favorites, but shorter',
  'Which manga on my Want to Read list should I start first?',
  'Sum up my reading year in three sentences',
];

let chat = [];   // kept for the session so the conversation survives navigating away

/** A compact, text-only picture of the reader for the assistant. */
function readerContext() {
  const me = db.me();
  const items = libraryItems(me.id);
  const st = stats(me.id);
  const line = ({ manga: m, entry: e }) => `- ${m.title} (${m.authors.join(', ') || 'unknown author'}; ${m.genres.join(', ')}): `
    + `${db.STATUSES[e.status]}${e.chapter ? `, chapter ${e.chapter}${m.chapters ? '/' + m.chapters : ''}` : ''}${e.rating ? `, rated ${e.rating}/10` : ''}`;
  const favs = me.favorites.map(id => items.find(x => x.manga.id === id)?.manga.title).filter(Boolean);
  return [
    `Reader: ${me.name} (@${me.username}). Today is ${new Date().toDateString()}.`,
    `Stats: ${st.counts.completed} completed, ${st.counts.reading} reading, ${st.chapters} chapters read, average rating ${st.avgRating?.toFixed(1) ?? 'none'}.`,
    `Top genres: ${st.genres.slice(0, 5).map(g => g.name).join(', ') || 'none yet'}.`,
    `Favorites: ${favs.join(', ') || 'none'}.`,
    `${st.wrapped.year} so far: ${st.wrapped.completed} completed, ${st.wrapped.chapters} chapters.`,
    `\nTheir shelf:\n${items.map(line).join('\n') || '(empty)'}`,
    `\nTitles in the Manga Shelf catalog (they can add any of these):\n${CATALOG.map(m => `- ${m.title} (${m.format}, ${m.start}, ${m.genres.join(', ')})`).join('\n')}`,
  ].join('\n').slice(0, 20000);
}

export function Assistant() {
  db.useDb();
  const [msgs, setMsgs] = useState(chat);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef();
  useEffect(() => { chat = msgs; end.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  if (!db.online) {
    return html`<div class="page"><header class="page-head"><span class="kicker" lang="ja">相談</span><h1>Ask the assistant</h1></header>
      <${EmptyState} title="The assistant needs accounts turned on">It runs on your own server so your API key stays private.
        Follow “Turn on accounts” and “Turn on the AI assistant” in the README, then come back here.<//></div>`;
  }

  const ask = async (text) => {
    const q = text.trim();
    if (!q || busy) return;
    const history = [...msgs, { role: 'user', content: q }];
    setMsgs([...history, { role: 'assistant', content: '' }]);
    setDraft('');
    setBusy(true);
    try {
      const answer = await db.backend.ask(history.slice(-20), readerContext(),
        (t) => setMsgs([...history, { role: 'assistant', content: t }]));
      if (!answer.trim()) throw new Error('The assistant returned an empty answer. Try again.');
    } catch (e) {
      setMsgs(msgs);      // drop the failed turn so the conversation stays valid
      setDraft(q);
      toast(e.message, { error: true });
    } finally { setBusy(false); }
  };

  return html`<div class="page assistant">
    <header class="page-head row-between">
      <div><span class="kicker" lang="ja">相談</span><h1>Ask the assistant</h1>
        <p class="lede">Recommendations, comparisons, or questions about your own shelf. It knows what you've read and how you rated it.</p></div>
      ${msgs.length > 0 && html`<button class="btn ghost" onClick=${() => setMsgs([])} disabled=${busy}>New conversation</button>`}
    </header>
    <div class="chat" role="log" aria-live="polite">
      ${!msgs.length && html`<div class="chips suggestions">${SUGGESTIONS.map(s => html`<button class="chip" onClick=${() => ask(s)}>${s}</button>`)}</div>`}
      ${msgs.map((m, i) => html`<div class=${cls('bubble', m.role === 'user' ? 'mine' : 'theirs ai')} key=${i}>
        ${m.content || html`<span class="typing" aria-label="Thinking"><i></i><i></i><i></i></span>`}</div>`)}
      <span ref=${end}></span>
    </div>
    <form class="dm-compose chat-compose" onSubmit=${e => { e.preventDefault(); ask(draft); }}>
      <textarea rows="1" value=${draft} maxlength="4000" placeholder="Ask about manga or your shelf…" aria-label="Ask the assistant"
        onInput=${e => setDraft(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(draft); } }}></textarea>
      <button class="btn primary" disabled=${busy || !draft.trim()}><${Icon} name="sparkle" size=${16} /> Ask</button>
    </form>
    <p class="muted small chat-note">Answers come from Claude and can be wrong about details like chapter counts. Your shelf is shared with it only when you ask.</p>
  </div>`;
}
