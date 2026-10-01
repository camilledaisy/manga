export const cls = (...xs) => xs.filter(Boolean).join(' ');
export const plural = (n, one, many = one + 's') => `${n.toLocaleString()} ${n === 1 ? one : many}`;
export const fmtDate = (t) => new Date(t).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });

export function relTime(t, now = Date.now()) {
  const s = (now - t) / 1000;
  if (s < 60) return 'just now';
  const units = [[60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']];
  let v = s / 60;
  for (const [k, name] of units) { if (v < k) return `${Math.floor(v)} ${name}${Math.floor(v) === 1 ? '' : 's'} ago`; v /= k; }
}

export const years = (m) => !m.start ? 'Year unknown' : m.end && m.end !== m.start ? `${m.start}–${m.end}` : m.status === 'FINISHED' ? `${m.start}` : `${m.start}–present`;
