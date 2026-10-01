// Transient UI state shared across the app: the open modal and toasts.
import { useEffect, useState } from '../vendor/preact-htm.js';

let ui = { modal: null, toasts: [] };
const listeners = new Set();
const set = (patch) => { ui = { ...ui, ...patch }; listeners.forEach(f => f()); };

export function useUi() {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick(t => t + 1); listeners.add(f); return () => listeners.delete(f); }, []);
  return ui;
}

/** type: 'progress' | 'review' | 'list' | 'addToList' | 'profile' */
export const openModal = (type, props = {}) => set({ modal: { type, props } });
export const closeModal = () => set({ modal: null });

let n = 0;
/** toast('Added', { action: { label: 'Undo', run } }) */
export function toast(message, { action, error } = {}) {
  const id = ++n;
  set({ toasts: [...ui.toasts.slice(-2), { id, message, action, error }] });
  setTimeout(() => dismiss(id), action ? 6000 : 3500);
}
export const dismiss = (id) => set({ toasts: ui.toasts.filter(t => t.id !== id) });

/** Runs a db action, turning thrown errors into an error toast. */
export function attempt(fn) {
  try { return fn(); } catch (e) { toast(e.message, { error: true }); }
}
