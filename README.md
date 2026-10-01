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
src/data/db.js                USER data: library, ratings, reviews, lists, follows, activity (localStorage)
src/data/seed.js              sample readers, reviews and reading history for the prototype
src/data/selectors.js         derived views: feeds, recommendations, stats
```

## Where a backend plugs in

- **Metadata:** implement `peek / get / list / searchLocal / searchRemote` in `provider.js` against your API. Manga ids are opaque strings; AniList results already use `al-<id>`.
- **User data:** every write goes through an action in `db.js` (`setStatus`, `setProgress`, `saveReview`, `toggleFollow`, `createList`…). Replace their bodies with API calls; the UI only calls these.
- **Accounts:** `state.session.userId` is the signed-in user. A login flow only needs to set it and load that user's data.

On the live site the app fetches real cover art and live search results from AniList in the browser. Offline, or if AniList is unreachable, it falls back to generated covers and local search.
