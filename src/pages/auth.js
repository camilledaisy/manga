import { html, useState } from '../../vendor/preact-htm.js';
import * as db from '../data/db.js';

const remote = db.backend;

export function AuthScreen({ recovery }) {
  const [mode, setMode] = useState(recovery ? 'recovery' : 'signin');   // signin | signup | reset | recovery | sent
  const [form, setForm] = useState({ email: '', password: '', username: '', name: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: k === 'username' ? e.target.value.toLowerCase() : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && !remote.USERNAME.test(form.username)) return setError('Usernames are 3–20 characters: lowercase letters, numbers and _.');
    if ((mode === 'signup' || mode === 'recovery') && form.password.length < 8) return setError('Use a password of at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'signin') await remote.signIn(form.email.trim(), form.password);
      if (mode === 'signup') {
        const ready = await remote.signUp({ email: form.email.trim(), password: form.password, username: form.username, name: form.name.trim() });
        if (!ready) { setSent(`We sent a confirmation link to ${form.email.trim()}. Open it on this device to finish creating your account.`); setMode('sent'); }
      }
      if (mode === 'reset') { await remote.sendReset(form.email.trim()); setSent(`If an account exists for ${form.email.trim()}, a link to reset your password is on its way.`); setMode('sent'); }
      if (mode === 'recovery') { await remote.setPassword(form.password); await db.finishRecovery(); }
    } catch (err) {
      setError(/invalid login/i.test(err.message) ? 'That email and password don’t match an account.'
        : /email not confirmed/i.test(err.message) ? 'Confirm your email first: open the link we sent you.'
        : err.message);
    } finally { setBusy(false); }
  };

  const titles = { signin: 'Welcome back', signup: 'Start your shelf', reset: 'Reset your password', recovery: 'Choose a new password', sent: 'Check your email' };
  return html`<div class="auth">
    <div class="auth-card">
      <div class="auth-brand"><span class="hanko" aria-hidden="true">棚</span><span class="wordmark">Manga Shelf</span></div>
      <h1>${titles[mode]}</h1>
      <p class="muted">${mode === 'signup' ? 'Track what you read, rate it, and see what your friends are reading.'
        : mode === 'signin' ? 'Sign in to your shelf and your friends’ activity.'
        : mode === 'reset' ? 'Enter the email you signed up with.' : mode === 'recovery' ? 'You followed a reset link. Pick a new password to finish.' : ''}</p>
      ${mode === 'sent' ? html`<p class="auth-sent">${sent}</p>
          <button class="btn" onClick=${() => { setMode('signin'); setSent(''); }}>Back to sign in</button>`
        : html`<form class="auth-form" onSubmit=${submit}>
          ${mode === 'signup' && html`
            <label class="field"><span>Username</span><input required autocomplete="username" value=${form.username} onInput=${set('username')}
              placeholder="e.g. daisy" maxlength="20" pattern="[a-z0-9_]{3,20}" /><span class="muted small">Friends find you by this. Lowercase letters, numbers, _</span></label>
            <label class="field"><span>Display name <span class="muted">(optional)</span></span><input autocomplete="name" value=${form.name} onInput=${set('name')} maxlength="40" /></label>`}
          ${mode !== 'recovery' && html`<label class="field"><span>Email</span><input type="email" required autocomplete="email" value=${form.email} onInput=${set('email')} /></label>`}
          ${mode !== 'reset' && html`<label class="field"><span>${mode === 'recovery' ? 'New password' : 'Password'}</span>
            <input type="password" required minlength=${mode === 'signin' ? undefined : 8} value=${form.password} onInput=${set('password')}
              autocomplete=${mode === 'signin' ? 'current-password' : 'new-password'} /></label>`}
          ${error && html`<p class="auth-error" role="alert">${error}</p>`}
          <button class="btn primary big block" disabled=${busy}>${busy ? 'One moment…'
            : { signin: 'Sign in', signup: 'Create account', reset: 'Send reset link', recovery: 'Save new password' }[mode]}</button>
        </form>
        <div class="auth-links small">
          ${mode === 'signin' && html`<button class="link" onClick=${() => setMode('reset')}>Forgot password?</button>
            <span>New here? <button class="link" onClick=${() => { setMode('signup'); setError(''); }}>Create an account</button></span>`}
          ${(mode === 'signup' || mode === 'reset') && html`<span>Already have an account? <button class="link" onClick=${() => { setMode('signin'); setError(''); }}>Sign in</button></span>`}
        </div>`}
    </div>
  </div>`;
}
