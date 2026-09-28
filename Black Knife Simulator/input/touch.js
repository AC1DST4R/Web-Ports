




import { createInput } from './state.js';
import { ACTIONS, SIM_ACTIONS, DEFAULT_BINDINGS } from './bindings.js';
import { NO_METHOD } from './method.js';

const SIM = new Set(SIM_ACTIONS);
const DIRECTIONS = new Set(['left', 'right', 'up', 'down']);



export function buttonsFromProfile(profile, slots = {}) {
  const prof = profile ?? DEFAULT_BINDINGS.touch;
  const out = [];
  for (const [code, el] of Object.entries(slots)) {
    if (code === 'pad' || !el) continue;
    const actions = [];
    for (const a of ACTIONS) {
      if (!(prof[a] ?? []).includes(code)) continue;
      if (DIRECTIONS.has(a)) continue;
      actions.push(a);
    }
    if (actions.length) out.push({ el, actions, code });
  }
  return out;
}

const DEAD_ZONE = 0.28;

const HOLD_MS = 600;

export function bindTouch({
  pad, buttons = null, slots = null, profile = null,
  onReset, onExit, onAction, holdMs = HOLD_MS, method = NO_METHOD,
} = {}) {

  const wiring = buttons ?? (slots || profile ? buttonsFromProfile(profile, { ...slots, pad: null }) : []);
  const held = new Set();

  let capture = null;
  const pressedSinceRead = new Set();

  const byPointer = new Map();

  const holdTimers = new Map();

  const press = (id, actions) => {
    let mine = byPointer.get(id);
    if (!mine) byPointer.set(id, (mine = new Set()));
    for (const a of actions) {
      if (!mine.has(a)) {
        mine.add(a);
        pressedSinceRead.add(a);
      }
      held.add(a);
    }
  };
  const release = (id, keep = null) => {
    const mine = byPointer.get(id);
    if (!mine) return;
    for (const a of mine) {
      if (keep && keep.has(a)) continue;
      mine.delete(a);

      let stillHeld = false;
      for (const [, set] of byPointer) if (set.has(a)) stillHeld = true;
      if (!stillHeld) held.delete(a);
    }
    if (!keep) byPointer.delete(id);
  };


  const padDirs = (ev) => {
    const r = pad.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = ev.clientX - cx;
    const dy = ev.clientY - cy;
    const radius = Math.min(r.width, r.height) / 2;
    if (Math.hypot(dx, dy) < radius * DEAD_ZONE) return [];

    const a = Math.atan2(dy, dx);
    const sector = Math.round(a / (Math.PI / 4));
    return [
      ['left'], ['left', 'up'], ['up'], ['up', 'right'],
      ['right'], ['right', 'down'], ['down'], ['down', 'left'],
      ['left'],
    ][sector + 4];
  };
  const onPadMove = (ev) => {
    ev.preventDefault();
    const dirs = new Set(padDirs(ev));
    release(ev.pointerId, dirs);
    press(ev.pointerId, dirs);
  };

  const grab = (el, id) => { try { el.setPointerCapture(id); } catch {   } };
  const onPadDown = (ev) => {
    method.note('touch');
    if (capture) { ev.preventDefault(); const cb = capture; capture = null; cb.onCode('pad'); return; }
    grab(pad, ev.pointerId);
    onPadMove(ev);
  };
  const onPadUp = (ev) => {
    ev.preventDefault();
    release(ev.pointerId);
  };
  if (pad) {
    pad.addEventListener('pointerdown', onPadDown);
    pad.addEventListener('pointermove', onPadMove);
    pad.addEventListener('pointerup', onPadUp);
    pad.addEventListener('pointercancel', onPadUp);
  }


  const entries = wiring.filter((b) => b.el).map((b) => ({ el: b.el, actions: [...b.actions], code: b.code ?? null }));
  for (const entry of entries) {
    const { el, code } = entry;
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      method.note('touch');

      if (capture) { const cb = capture; capture = null; cb.onCode(code); return; }
      grab(el, ev.pointerId);
      el.classList.add('down');
      const actions = entry.actions;
      if (actions.includes('reset')) {

        const id = ev.pointerId;
        const timer = setTimeout(() => {
          holdTimers.delete(id);
          onExit?.();
        }, holdMs);
        holdTimers.set(id, timer);
        return;
      }
      press(ev.pointerId, actions);

      for (const a of actions) onAction?.(a);
    });
    const up = (ev) => {
      ev.preventDefault();
      el.classList.remove('down');
      release(ev.pointerId);

      const timer = holdTimers.get(ev.pointerId);
      if (timer !== undefined) {
        clearTimeout(timer);
        holdTimers.delete(ev.pointerId);
        if (ev.type === 'pointerup') onReset?.();
      }
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  return {


    read() {
      const over = {};
      for (const a of held) if (SIM.has(a)) over[a] = true;
      for (const a of pressedSinceRead) if (SIM.has(a)) over[a] = true;
      pressedSinceRead.clear();
      return createInput(over);
    },



    setProfile(next) {
      const withCode = entries.filter((e) => e.code !== null);
      const wanted = buttonsFromProfile(next, Object.fromEntries(withCode.map((e) => [e.code, e.el])));
      const byCode = new Map(wanted.map((w) => [w.code, w.actions]));
      for (const e of withCode) e.actions = byCode.get(e.code) ?? [];
      held.clear();
      pressedSinceRead.clear();
      byPointer.clear();
    },



    captureNext(onCode) {
      if (capture) capture.onCode(null);
      capture = { onCode };
      const mine = capture;
      return () => { if (capture === mine) { capture = null; mine.onCode(null); } };
    },

    capturing() { return capture !== null; },


    slots() { return entries.map((e) => e.code).filter((c) => c !== null); },
  };
}
