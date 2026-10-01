import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import * as db from './data/db.js';
import { peek } from './data/provider.js';
import { useUi, openModal, closeModal, toast, dismiss, attempt } from './ui.js';
import { Icon, MangaCover, Stepper, RatingInput, ProgressBar, progressText } from './components.js';
import { totalOf } from './data/selectors.js';

function Dialog({ title, children, wide }) {
  const ref = useRef();
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    const onClose = () => closeModal();
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, []);
  return html`<dialog ref=${ref} class=${wide ? 'wide' : ''} aria-labelledby="dlg-title"
      onClick=${e => e.target === ref.current && ref.current.close()}>
    <div class="dlg">
      <header class="dlg-head"><h2 id="dlg-title">${title}</h2>
        <button class="btn icon-btn ghost" onClick=${() => ref.current.close()} aria-label="Close"><${Icon} name="x" /></button></header>
      ${children}
    </div>
  </dialog>`;
}

function UpdateProgress({ mangaId }) {
  const m = peek(mangaId);
  const e = db.entryOf(mangaId) || { chapter: 0, volume: 0 };
  const [chapter, setChapter] = useState(e.chapter);
  const [volume, setVolume] = useState(e.volume);
  const chMax = m.chapters || (m.status === 'FINISHED' ? m.latest : null);
  const save = (ev) => {
    ev.preventDefault();
    db.setProgress(mangaId, { chapter, volume });
    closeModal();
    toast(`Saved · ${progressText(m, { chapter })}`, { action: { label: 'Undo', run: db.undo } });
  };
  return html`<${Dialog} title="Update progress">
    <form onSubmit=${save} class="dlg-body">
      <div class="dlg-manga"><${MangaCover} manga=${m} size="xs" /><div><b>${m.title}</b>
        <span class="muted small">${m.chapters ? `${m.chapters} chapters` : m.latest ? `Ongoing · ${m.latest} chapters out` : 'Ongoing'}${m.volumes ? ` · ${m.volumes} volumes` : ''}</span></div></div>
      <${Stepper} id="ch" label="Chapter" value=${chapter} onChange=${setChapter} max=${chMax} />
      <${Stepper} id="vol" label="Volume" value=${volume} onChange=${setVolume} max=${m.volumes} />
      <${ProgressBar} value=${chapter} max=${totalOf(m)} />
      <footer class="dlg-foot"><button type="button" class="btn ghost" onClick=${closeModal}>Cancel</button>
        <button class="btn primary">Save progress</button></footer>
    </form>
  <//>`;
}

function ReviewEditor({ mangaId }) {
  const m = peek(mangaId);
  const existing = db.myReviewOf(mangaId);
  const [rating, setRating] = useState(existing?.rating || db.entryOf(mangaId)?.rating || 0);
  const [body, setBody] = useState(existing?.body || '');
  const [spoiler, setSpoiler] = useState(existing?.spoiler || false);
  const save = (ev) => {
    ev.preventDefault();
    if (!body.trim()) { db.rate(mangaId, rating); closeModal(); toast(rating ? `Rated ${m.title} ${rating}/10` : 'Rating cleared'); return; }
    db.saveReview({ mangaId, rating, body: body.trim(), spoiler });
    closeModal();
    toast(existing ? 'Review updated' : 'Review posted');
  };
  const remove = () => { db.deleteReview(existing.id); closeModal(); toast('Review deleted'); };
  return html`<${Dialog} title=${existing ? 'Edit your review' : 'Rate & review'} wide>
    <form onSubmit=${save} class="dlg-body">
      <div class="dlg-manga"><${MangaCover} manga=${m} size="xs" /><div><b>${m.title}</b><span class="muted small">${m.authors.join(', ')}</span></div></div>
      <${RatingInput} value=${rating} onChange=${setRating} />
      <label class="field"><span>Review <span class="muted">(optional, leave empty to just rate)</span></span>
        <textarea rows="6" value=${body} onInput=${e => setBody(e.target.value)} maxlength="5000"
          placeholder="What stayed with you? What would you tell a friend before they start?"></textarea></label>
      <label class="switch"><input type="checkbox" checked=${spoiler} onChange=${e => setSpoiler(e.target.checked)} />
        <span>Contains spoilers <span class="muted small">(hidden until a reader chooses to see it)</span></span></label>
      <footer class="dlg-foot">
        ${existing && html`<button type="button" class="btn ghost danger" onClick=${remove}>Delete review</button>`}
        <span class="spacer"></span>
        <button type="button" class="btn ghost" onClick=${closeModal}>Cancel</button>
        <button class="btn primary" disabled=${!rating && !body.trim()}>${body.trim() ? (existing ? 'Save review' : 'Post review') : 'Save rating'}</button>
      </footer>
    </form>
  <//>`;
}

function ListEditor({ listId, addMangaId }) {
  const list = db.getState().lists.find(l => l.id === listId);
  const [title, setTitle] = useState(list?.title || '');
  const [description, setDescription] = useState(list?.description || '');
  const [isPublic, setPublic] = useState(list?.public ?? true);
  const save = (ev) => {
    ev.preventDefault();
    if (list) { db.updateList(list.id, { title: title.trim(), description: description.trim(), public: isPublic }); closeModal(); toast('List saved'); return; }
    const id = db.createList({ title: title.trim(), description: description.trim(), isPublic, mangaIds: addMangaId ? [addMangaId] : [] });
    closeModal();
    toast(`Created “${title.trim()}”`);
    if (!addMangaId) location.hash = '/lists/' + id;
  };
  return html`<${Dialog} title=${list ? 'Edit list' : 'New list'}>
    <form onSubmit=${save} class="dlg-body">
      <label class="field"><span>Title</span><input required maxlength="80" value=${title} onInput=${e => setTitle(e.target.value)}
        placeholder="e.g. Comfort Reads" autofocus /></label>
      <label class="field"><span>Description</span><textarea rows="3" maxlength="400" value=${description}
        onInput=${e => setDescription(e.target.value)} placeholder="What ties these together?"></textarea></label>
      <label class="switch"><input type="checkbox" checked=${isPublic} onChange=${e => setPublic(e.target.checked)} />
        <span>Public <span class="muted small">(${isPublic ? 'anyone can find this list' : 'only you can see this list'})</span></span></label>
      <footer class="dlg-foot"><button type="button" class="btn ghost" onClick=${closeModal}>Cancel</button>
        <button class="btn primary" disabled=${!title.trim()}>${list ? 'Save' : 'Create list'}</button></footer>
    </form>
  <//>`;
}

function AddToList({ mangaId }) {
  const s = db.useDb();
  const m = peek(mangaId);
  const mine = s.lists.filter(l => l.userId === db.meId());
  return html`<${Dialog} title="Add to list">
    <div class="dlg-body">
      <div class="dlg-manga"><${MangaCover} manga=${m} size="xs" /><div><b>${m.title}</b></div></div>
      <div class="check-list">
        ${mine.map(l => html`<label class="switch" key=${l.id}><input type="checkbox" checked=${l.mangaIds.includes(mangaId)}
          onChange=${() => db.toggleInList(l.id, mangaId)} /><span>${l.title} <span class="muted small">${l.mangaIds.length}${!l.public ? ' · private' : ''}</span></span></label>`)}
        ${!mine.length && html`<p class="muted">You don't have any lists yet.</p>`}
      </div>
      <footer class="dlg-foot">
        <button class="btn ghost" onClick=${() => openModal('list', { addMangaId: mangaId })}><${Icon} name="plus" size=${16} /> New list</button>
        <span class="spacer"></span><button class="btn primary" onClick=${closeModal}>Done</button></footer>
    </div>
  <//>`;
}

function EditProfile() {
  const u = db.me();
  const [name, setName] = useState(u.name);
  const [bio, setBio] = useState(u.bio);
  const [avatar, setAvatar] = useState(u.avatar);
  const [chars, setChars] = useState(u.favoriteCharacters);
  const [charName, setCharName] = useState('');
  const pick = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Choose an image file (JPG, PNG, GIF or WebP).', { error: true });
    try { setAvatar(await shrink(file, 192)); } catch { toast('Could not read that image. Try another one.', { error: true }); }
  };
  const save = (ev) => {
    ev.preventDefault();
    attempt(() => { db.updateProfile({ name: name.trim() || u.username, bio: bio.trim(), avatar, favoriteCharacters: chars }); closeModal(); toast('Profile saved'); });
  };
  return html`<${Dialog} title="Edit profile" wide>
    <form onSubmit=${save} class="dlg-body">
      <div class="avatar-edit">
        <span class="avatar" style=${`--h:${u.hue};width:72px;height:72px;font-size:30px`}>${avatar ? html`<img src=${avatar} alt="" />` : (name || u.username)[0]?.toUpperCase()}</span>
        <label class="btn"><${Icon} name="camera" size=${16} /> Change picture<input type="file" accept="image/*" hidden onChange=${pick} /></label>
        ${avatar && html`<button type="button" class="btn ghost" onClick=${() => setAvatar(null)}>Remove</button>`}
      </div>
      <label class="field"><span>Display name</span><input maxlength="40" value=${name} onInput=${e => setName(e.target.value)} /></label>
      <label class="field"><span>Bio</span><textarea rows="3" maxlength="300" value=${bio} onInput=${e => setBio(e.target.value)}></textarea></label>
      <div class="field"><span>Favorite characters</span>
        <div class="chips">${chars.map((c, i) => html`<span class="chip on">${c.name}
          <button type="button" class="chip-x" aria-label=${'Remove ' + c.name} onClick=${() => setChars(chars.filter((_, j) => j !== i))}><${Icon} name="x" size=${12} /></button></span>`)}</div>
        <div class="inline-add"><input value=${charName} onInput=${e => setCharName(e.target.value)} placeholder="Add a character" maxlength="60"
          onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); e.target.nextElementSibling.click(); } }} />
          <button type="button" class="btn" disabled=${!charName.trim()} onClick=${() => { setChars([...chars, { name: charName.trim() }]); setCharName(''); }}>Add</button></div>
      </div>
      <footer class="dlg-foot"><button type="button" class="btn ghost" onClick=${closeModal}>Cancel</button><button class="btn primary">Save profile</button></footer>
    </form>
  <//>`;
}

/** Downscale an uploaded image to a small square data URL so it fits in local storage. */
function shrink(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const s = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const MODALS = { progress: UpdateProgress, review: ReviewEditor, list: ListEditor, addToList: AddToList, profile: EditProfile };

export function ModalHost() {
  const { modal } = useUi();
  if (!modal) return null;
  const M = MODALS[modal.type];
  return html`<${M} key=${modal.type + JSON.stringify(modal.props)} ...${modal.props} />`;
}

export function Toasts() {
  const { toasts } = useUi();
  return html`<div class="toasts" role="status" aria-live="polite">
    ${toasts.map(t => html`<div class=${'toast' + (t.error ? ' error' : '')} key=${t.id}>
      <span>${t.message}</span>
      ${t.action && html`<button class="btn small" onClick=${() => { t.action.run(); dismiss(t.id); }}>${t.action.label}</button>`}
      <button class="btn icon-btn ghost small" aria-label="Dismiss" onClick=${() => dismiss(t.id)}><${Icon} name="x" size=${14} /></button>
    </div>`)}
  </div>`;
}
