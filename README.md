# Manga Shelf

A personal manga library, reading diary and social discovery app. Static files only (no build step), so it runs on GitHub Pages or any static host.

Open `index.html` through a local server (`python3 -m http.server`) or the Pages URL. ES modules don't load from `file://`.

## Layout

```
index.html, styles.css        page shell and the whole visual system (light + dark tokens at the top)
vendor/preact-htm.js          Preact + hooks + htm, vendored (13 KB) so nothing loads from a CDN
src/main.js                   app shell: nav, routes, theme, error boundary
src/router.js                 hash router (#/manga/monster/reviews), works on any static host
src/components.js             MangaCard, MangaCover, ProgressBar, RatingInput, StatusDropdown, ReviewCard,
                              ActivityCard, UserAvatar, MangaShelf, SearchBar, FilterPanel, StatsCard, ListCard…
src/modals.js, src/ui.js      dialogs (update progress, review, lists, profile) and toasts
src/pages/*.js                Home, Discover, Manga detail, Library, Lists, Reviews, Stats, Profile
src/data/catalog.js           EXTERNAL metadata: mock catalog (titles, authors, genres, chapters…)
src/data/provider.js          the only code that knows where metadata comes from (mock + AniList GraphQL)
src/data/db.js                USER data: library, ratings, reviews, lists, follows, activity. Local demo or online
src/data/remote.js            Supabase adapter: accounts, loading shared data, saving your changes
src/data/seed.js              sample readers, reviews and reading history for the local demo
src/config.js                 Supabase URL + key; empty = local demo
supabase/schema.sql           database tables and row-level security (run once in Supabase)
src/pages/auth.js             sign in, sign up, password reset
src/pages/messages.js         direct messages
src/pages/assistant.js        AI assistant chat
supabase/functions/assistant  Edge Function that calls Claude with the reader's shelf
src/data/selectors.js         derived views: feeds, recommendations, stats
```

## Turn on accounts (so friends can see each other)

Without configuration the app runs as a local demo with sample readers. To make it real:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project, open **SQL Editor**, paste all of `supabase/schema.sql`, and run it.
3. Open **Authentication → URL Configuration**. Set **Site URL** to `https://camilledaisy.github.io/manga/` and add the same address under **Redirect URLs**. Confirmation and password-reset emails link back here.
4. Open **Project Settings → API** (called **API Keys** in newer dashboards). Copy the **Project URL** and the **anon** (or **publishable**) key into `src/config.js`, then commit and push.
5. Open the site, create your account, and send friends your profile link (Profile → Copy profile link). They sign up, follow you, and see your reading.

Both values in `config.js` are designed to be public. What each person can read and write is enforced by the database's row-level security:

- Anyone signed in can see profiles, libraries, ratings, reviews, comments, follows, activity and public lists.
- Only you can change your own rows.
- Private notes and private lists are visible to their owner only.
- Signed-out visitors see nothing.

Supabase's built-in email sender only allows a few emails per hour. That's fine for a handful of friends; for more, connect your own SMTP under Authentication → Emails, or turn off **Confirm email** under Authentication → Sign In / Providers → Email.

## Turn on the AI assistant

The assistant (sparkle icon) answers questions about manga and your shelf using Claude. It runs as a Supabase Edge Function, so your Anthropic API key stays on the server. It needs accounts turned on first.

1. Create an API key at [console.anthropic.com](https://console.anthropic.com).
2. In Supabase, open **Edge Functions → Secrets** and add `ANTHROPIC_API_KEY` with that key.
3. Deploy `supabase/functions/assistant/index.ts` as a function named `assistant`. You can do this in the dashboard (**Edge Functions → Deploy a new function → Via editor**, paste the file, name it `assistant`), or with the CLI: `supabase functions deploy assistant`.

Each question sends your shelf summary plus the conversation to Claude Opus 5.5 ($4 / $20 per million input/output tokens), which comes to a few cents per question. Every account gets 30 questions per day; change the number in `use_assistant_quota()` in `supabase/schema.sql`.

**Already ran `schema.sql` before messages and the assistant existed?** Run just its last two sections (from `-- ---------- direct messages` to the end) in the SQL Editor.

## How data flows

- **Metadata** (titles, covers, chapters) comes from `provider.js`: the mock catalog plus AniList. Manga found through AniList search are saved to the shared `manga_cache` table so friends' browsers can show them too.
- **User data** changes only through actions in `db.js` (`setStatus`, `setProgress`, `saveReview`, `toggleFollow`, `createList`…). In online mode each action is applied instantly on screen, then `remote.js` compares the state before and after and writes just the rows that changed. Writes are saved in order, Undo is saved the same way, and a failed save reloads your data from the server.
- **Direct messages** are readable only by the two people in the conversation. An open conversation checks for new messages every 4 seconds.
- **Friends' updates** load at sign-in, whenever you come back to the tab, and every minute while it's open. A refresh never overwrites a change that's still saving.
- At sign-in the app loads every shared row. That suits a group of friends; past roughly a thousand rows per table, scope the queries to people you follow and paginate (see the `ponytail:` note in `remote.js`).
