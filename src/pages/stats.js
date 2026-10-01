import { html } from '../../vendor/preact-htm.js';
import * as db from '../data/db.js';
import { stats } from '../data/selectors.js';
import { StatsCard, MangaCover, EmptyState } from '../components.js';
import { mangaHref, link } from '../router.js';

export function Stats() {
  db.useDb();
  const st = stats(db.meId());
  const w = st.wrapped;
  const maxMonth = Math.max(1, ...st.months.map(m => m.chapters));
  const maxRating = Math.max(1, ...st.ratings.map(r => r.count));
  const maxGenre = Math.max(1, ...st.genres.map(g => g.count));
  const maxDay = Math.max(1, ...st.days.map(d => d.chapters));
  const peak = st.months.reduce((a, b) => (b.chapters > a.chapters ? b : a), st.months[0]);
  const level = (n) => n === 0 ? 0 : Math.min(4, Math.ceil(4 * n / maxDay));

  return html`<div class="page stats">
    <header class="page-head"><span class="kicker" lang="ja">記録</span><h1>Stats</h1>
      <p class="lede">Your reading, counted. Based on your library and every chapter you've logged.</p></header>

    <${Wrapped} w=${w} />

    <div class="stat-row">
      <${StatsCard} label="Completed" value=${st.counts.completed} />
      <${StatsCard} label="Currently reading" value=${st.counts.reading} />
      <${StatsCard} label="Chapters read" value=${st.chapters.toLocaleString()} />
      <${StatsCard} label="Volumes read" value=${st.volumes.toLocaleString()} />
      <${StatsCard} label="Average rating" value=${st.avgRating ? st.avgRating.toFixed(1) : '–'} sub="out of 10" />
    </div>

    <div class="chart-grid">
      <section class="chart-card wide">
        <header><h2>Chapters read over time</h2><span class="muted small">Last 12 months · peak ${peak.chapters} in ${peak.label}</span></header>
        <div class="bars" role="img" aria-label=${'Chapters read per month: ' + st.months.map(m => `${m.label} ${m.chapters}`).join(', ')}>
          ${st.months.map((m, i) => html`<div class="bar-col" key=${i}>
            <span class="bar-val mono">${(m === peak || i === 11) && m.chapters ? m.chapters : ''}</span>
            <div class="bar" tabindex="0" style=${`height:${(m.chapters / maxMonth) * 100}%`}
              data-tip=${`${m.label} ${m.year}: ${m.chapters} chapters on ${m.days} days${m.completed ? `, ${m.completed} completed` : ''}`}></div>
            <span class="bar-label">${m.label}</span></div>`)}
        </div>
        <${DataTable} head=${['Month', 'Chapters', 'Days read', 'Completed']} rows=${st.months.map(m => [`${m.label} ${m.year}`, m.chapters, m.days, m.completed])} />
      </section>

      <section class="chart-card wide">
        <header><h2>Monthly reading activity</h2><span class="muted small">Each square is a day · last 26 weeks</span></header>
        <div class="heat-wrap">
          <div class="heat-days muted small" aria-hidden="true"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span></span></div>
          <div class="heat" role="img" aria-label=${`Reading activity over the last 26 weeks: read on ${st.days.filter(d => d.chapters).length} of ${st.days.length} days`}>
            ${st.days.map(d => html`<span class=${'cell l' + level(d.chapters)}
              title=${`${d.date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}: ${d.chapters ? d.chapters + ' chapters' : 'no reading'}`}></span>`)}
          </div>
        </div>
        <div class="heat-legend muted small" aria-hidden="true">Less ${[0, 1, 2, 3, 4].map(l => html`<span class=${'cell l' + l}></span>`)} More</div>
      </section>

      <section class="chart-card">
        <header><h2>Genre distribution</h2><span class="muted small">Titles you've read, by genre</span></header>
        ${st.genres.length ? html`<div class="hbars">${st.genres.slice(0, 8).map(g => html`
          <a class="hbar" href=${link('library/all', { genre: g.name })} data-tip=${`${g.count} titles tagged ${g.name}`}>
            <span class="hbar-label">${g.name}</span>
            <span class="hbar-track"><span class="hbar-fill" style=${`width:${(g.count / maxGenre) * 100}%`}></span></span>
            <span class="hbar-val mono">${g.count}</span></a>`)}</div>` : html`<${EmptyState} title="Read something to see your genres" />`}
      </section>

      <section class="chart-card">
        <header><h2>Ratings distribution</h2><span class="muted small">How you score what you read</span></header>
        <div class="bars short" role="img" aria-label=${'Ratings given: ' + st.ratings.filter(r => r.count).map(r => `${r.count} rated ${r.score}`).join(', ')}>
          ${st.ratings.map(r => html`<div class="bar-col" key=${r.score}>
            <span class="bar-val mono">${r.count || ''}</span>
            <div class="bar" tabindex="0" style=${`height:${(r.count / maxRating) * 100}%`} data-tip=${`${r.count} manga rated ${r.score}/10`}></div>
            <span class="bar-label mono">${r.score}</span></div>`)}
        </div>
      </section>

      <section class="chart-card">
        <header><h2>Favorite genres</h2></header>
        <ol class="podium">${st.genres.slice(0, 3).map((g, i) => html`<li><span class="podium-n">${i + 1}</span><b>${g.name}</b><span class="muted small">${g.count} titles</span></li>`)}</ol>
      </section>

      <section class="chart-card">
        <header><h2>Most-read authors</h2><span class="muted small">By chapters read</span></header>
        <ol class="authors">${st.authors.map(a => html`<li><a href=${link('discover', { author: a.name })}>${a.name}</a><span class="mono small">${a.chapters.toLocaleString()} ch</span></li>`)}</ol>
      </section>

      <section class="chart-card wide">
        <header><h2>Completed in ${w.year}</h2><span class="muted small">${st.completedThisYear.length} manga, in the order you finished them</span></header>
        ${st.completedThisYear.length ? html`<div class="done-row">${st.completedThisYear.map(({ manga: m, entry: e }) => html`<a class="done-item" href=${mangaHref(m.id)}>
            <${MangaCover} manga=${m} size="sm" /><span class="small mono">${new Date(e.completedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}${e.rating ? ` · ${e.rating}/10` : ''}</span></a>`)}</div>`
          : html`<${EmptyState} title=${`Nothing finished in ${w.year} yet`} />`}
      </section>
    </div>
  </div>`;
}

function Wrapped({ w }) {
  return html`<section class="wrapped" aria-label=${`Your manga year ${w.year}`}>
    <div class="wrapped-head"><span class="wrapped-kicker">Your manga year</span><span class="wrapped-year">${w.year}</span></div>
    <div class="wrapped-grid">
      <div class="wrapped-big"><b>${w.completed}</b><span>manga completed</span></div>
      <div class="wrapped-big"><b>${w.chapters.toLocaleString()}</b><span>chapters read</span></div>
      <div class="wrapped-line">${w.topGenre ? html`<b>${w.topGenre}</b> was your most-read genre` : 'Read more to find your genre'}</div>
      <div class="wrapped-line">${w.avgRating ? html`<b>${w.avgRating.toFixed(1)}</b> average rating for what you finished` : ''}</div>
      ${w.busiestMonth && html`<div class="wrapped-line"><b>${w.busiestMonth.label}</b> was your busiest month: ${w.busiestMonth.chapters} chapters</div>`}
      <div class="wrapped-line">You read on <b>${w.daysRead}</b> different days</div>
    </div>
    ${w.top && html`<a class="wrapped-top" href=${mangaHref(w.top.manga.id)}>
      <${MangaCover} manga=${w.top.manga} size="sm" stamp=${false} />
      <span><span class="wrapped-kicker">Book of the year</span><b>${w.top.manga.title}</b><span>${w.top.entry.rating}/10</span></span></a>`}
  </section>`;
}

function DataTable({ head, rows }) {
  return html`<details class="data-table"><summary class="small">Show as table</summary>
    <div class="table-scroll"><table><thead><tr>${head.map(h => html`<th>${h}</th>`)}</tr></thead>
      <tbody>${rows.map(r => html`<tr>${r.map(c => html`<td>${c}</td>`)}</tr>`)}</tbody></table></div></details>`;
}
