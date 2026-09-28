




export const BINDINGS_VERSION = 1;


export const SIM_ACTIONS = Object.freeze([
  'left', 'right', 'up', 'down', 'focus', 'confirm', 'cancel', 'button3',
]);


export const DRIVER_ACTIONS = Object.freeze(['reset', 'exit']);

export const ACTIONS = Object.freeze([...SIM_ACTIONS, ...DRIVER_ACTIONS]);


export const REQUIRED_ACTIONS = Object.freeze(['confirm', 'cancel']);

export const METHODS = Object.freeze(['keyboard', 'gamepad', 'touch']);



export const MAX_CODES_PER_ACTION = 6;
const MAX_CODE_LENGTH = 24;



export const DEFAULT_BINDINGS = Object.freeze({

  keyboard: Object.freeze({
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],

    focus: ['KeyX', 'ShiftLeft', 'ShiftRight'],

    confirm: ['KeyZ', 'Enter'],

    cancel: ['KeyX', 'ShiftLeft', 'ShiftRight', 'Escape'],

    button3: ['KeyC', 'ControlLeft', 'ControlRight'],
    reset: ['KeyR'],
    exit: ['Escape'],
  }),

  gamepad: Object.freeze({
    left: ['b14', 'a0-'],
    right: ['b15', 'a0+'],
    up: ['b12', 'a1-'],
    down: ['b13', 'a1+'],
    focus: ['b1', 'b4', 'b5'],
    confirm: ['b0'],
    cancel: ['b1'],
    button3: ['b2', 'b3'],
    reset: ['b8'],
    exit: ['b9'],
  }),

  touch: Object.freeze({
    left: ['pad'],
    right: ['pad'],
    up: ['pad'],
    down: ['pad'],
    focus: ['btnX'],
    confirm: ['btnZ'],
    cancel: ['btnX'],
    button3: [],
    reset: ['btnR'],
    exit: ['btnR'],
  }),
});


export const TOUCH_SLOTS = Object.freeze(['pad', 'btnZ', 'btnX', 'btnR']);



export const TOUCH_SLOT_KIND = Object.freeze({
  pad: 'direction', btnZ: 'button', btnX: 'button', btnR: 'button',
});


const DIRECTION_ACTIONS = Object.freeze(['left', 'right', 'up', 'down']);



export function canProduce(method, code, action) {
  if (!isValidCode(method, code)) return false;
  if (method !== 'touch') return true;
  const kind = TOUCH_SLOT_KIND[code];
  return DIRECTION_ACTIONS.includes(action) ? kind === 'direction' : kind === 'button';
}



export const RESERVED = Object.freeze({
  keyboard: Object.freeze({ Escape: Object.freeze(['cancel', 'exit']) }),
  gamepad: Object.freeze({}),
  touch: Object.freeze({}),
});


export function isReserved(method, code) {
  return Object.prototype.hasOwnProperty.call(RESERVED[method] ?? {}, code);
}

const KEYBOARD_CODE = /^[A-Za-z][A-Za-z0-9]{0,23}$/;
const GAMEPAD_CODE = /^(b(?:[0-9]|[12][0-9]|3[01])|a(?:[0-9]|1[0-5])[+-])$/;



export function isValidCode(method, code) {
  if (typeof code !== 'string' || code.length === 0 || code.length > MAX_CODE_LENGTH) return false;
  if (method === 'keyboard') return KEYBOARD_CODE.test(code);
  if (method === 'gamepad') return GAMEPAD_CODE.test(code);
  if (method === 'touch') return TOUCH_SLOTS.includes(code);
  return false;
}


export function defaultProfile(method) {
  const src = DEFAULT_BINDINGS[method];
  if (!src) throw new Error(`unknown input method: ${method}`);
  const out = {};
  for (const a of ACTIONS) out[a] = [...(src[a] ?? [])];
  return out;
}


export function defaultBindings() {
  const out = {};
  for (const m of METHODS) out[m] = defaultProfile(m);
  return out;
}



export function normalizeProfile(method, raw) {
  if (!METHODS.includes(method)) throw new Error(`unknown input method: ${method}`);
  const def = defaultProfile(method);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { bindings: def, repaired: raw !== undefined && raw !== null };
  }
  let repaired = false;
  const out = {};
  for (const action of ACTIONS) {
    const stored = raw[action];
    if (stored === undefined || !Array.isArray(stored)) {
      out[action] = [...def[action]];
      if (stored !== undefined) repaired = true;
      continue;
    }
    const seen = new Set();
    const codes = [];
    for (const code of stored) {
      if (!isValidCode(method, code) || seen.has(code)) { repaired = true; continue; }
      if (codes.length >= MAX_CODES_PER_ACTION) { repaired = true; continue; }
      seen.add(code);
      codes.push(code);
    }
    if (codes.length === 0 && stored.length > 0) {

      out[action] = [...def[action]];
      repaired = true;
      continue;
    }
    out[action] = codes;
  }

  for (const key of Object.keys(raw)) if (!ACTIONS.includes(key)) repaired = true;


  for (const [code, actions] of Object.entries(RESERVED[method] ?? {})) {
    for (const action of actions) {
      if (!out[action].includes(code)) {
        out[action] = [code, ...out[action]].slice(0, MAX_CODES_PER_ACTION);
        repaired = true;
      }
    }
  }

  for (const action of REQUIRED_ACTIONS) {
    if (!out[action].some((code) => canProduce(method, code, action))) {
      out[action] = [...def[action]];
      repaired = true;
    }
  }
  return { bindings: out, repaired };
}



export function loadBindings(raw) {
  const fresh = { ...defaultBindings(), repaired: false };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fresh;
  if ((raw.v | 0) !== BINDINGS_VERSION) {
    return { ...defaultBindings(), repaired: raw.v !== undefined };
  }
  const out = { repaired: false };
  for (const m of METHODS) {
    const { bindings, repaired } = normalizeProfile(m, raw[m]);
    out[m] = bindings;
    if (repaired) out.repaired = true;
  }
  return out;
}



export function serializeBindings(bindings) {
  const out = { v: BINDINGS_VERSION };
  for (const m of METHODS) {
    const prof = {};
    for (const a of ACTIONS) prof[a] = [...(bindings?.[m]?.[a] ?? DEFAULT_BINDINGS[m][a])];
    out[m] = prof;
  }
  return out;
}



export function bindingIndex(profile) {
  const index = new Map();
  for (const action of ACTIONS) {
    for (const code of profile?.[action] ?? []) {
      const list = index.get(code);
      if (list) { if (!list.includes(action)) list.push(action); } else index.set(code, [action]);
    }
  }
  return index;
}



export function conflictsFor(profile, code, action) {
  const out = [];
  for (const a of ACTIONS) {
    if (a === action) continue;
    if ((profile?.[a] ?? []).includes(code)) out.push(a);
  }
  return out;
}



export function bindCode(method, profile, action, code, { exclusive = false } = {}) {
  if (!ACTIONS.includes(action)) return { profile, changed: false, reason: 'unknown-action' };
  if (!isValidCode(method, code)) return { profile, changed: false, reason: 'invalid-code' };
  const pinned = RESERVED[method]?.[code];
  if (pinned && !pinned.includes(action)) {
    return { profile, changed: false, reason: 'reserved' };
  }
  const next = {};
  for (const a of ACTIONS) next[a] = [...(profile?.[a] ?? [])];
  if (exclusive) {
    for (const a of ACTIONS) {
      if (a === action) continue;

      if (pinned?.includes(a)) continue;
      next[a] = next[a].filter((c) => c !== code);
    }
    for (const a of REQUIRED_ACTIONS) {
      if (next[a].length === 0) next[a] = [...defaultProfile(method)[a]];
    }
  }
  if (next[action].includes(code)) return { profile: next, changed: exclusive, reason: 'already-bound' };
  if (next[action].length >= MAX_CODES_PER_ACTION) {
    return { profile, changed: false, reason: 'full' };
  }
  next[action] = [...next[action], code];
  return { profile: next, changed: true, reason: 'ok' };
}



export function unbindCode(method, profile, action, code) {
  if (!ACTIONS.includes(action)) return { profile, changed: false, reason: 'unknown-action' };
  if (RESERVED[method]?.[code]?.includes(action)) {
    return { profile, changed: false, reason: 'reserved' };
  }
  const next = {};
  for (const a of ACTIONS) next[a] = [...(profile?.[a] ?? [])];
  if (!next[action].includes(code)) return { profile, changed: false, reason: 'not-bound' };
  next[action] = next[action].filter((c) => c !== code);
  let reason = 'ok';
  if (next[action].length === 0 && REQUIRED_ACTIONS.includes(action)) {
    next[action] = [...defaultProfile(method)[action]];
    reason = 'restored-required';
  }
  return { profile: next, changed: true, reason };
}


export function resetBindings(method, profile, action = null) {
  const def = defaultProfile(method);
  if (action === null) return def;
  if (!ACTIONS.includes(action)) return profile;
  const next = {};
  for (const a of ACTIONS) next[a] = [...(profile?.[a] ?? [])];
  next[action] = [...def[action]];
  return next;
}



export function sameBindings(a, b) {
  for (const action of ACTIONS) {
    const x = a?.[action] ?? [];
    const y = b?.[action] ?? [];
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  }
  return true;
}
