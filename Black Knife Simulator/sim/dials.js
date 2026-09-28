


import { isReplaying } from './replay.js';



export const DIALS = [
  {
    id: 'bulletMult',
    name: 'BULLET MULTIPLIER',
    min: 1,
    max: 3,
    step: 1,
    def: 1,
    format: (v) => `${v}x`,
  },
  {
    id: 'bulletCooldown',
    name: 'BULLET COOLDOWN',
    min: 0,
    max: 200,
    step: 25,
    def: 100,

    format: (v) => (v === 0 ? 'EVERY FRAME' : `${v}%`),
  },
];


export function dialSpec(id) {
  return DIALS.find((d) => d.id === id);
}


export function freshDials() {
  const out = {};
  for (const d of DIALS) out[d.id] = d.def;
  return out;
}



export function clampDial(id, v) {
  const d = dialSpec(id);
  if (!d) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return d.def;
  const snapped = d.min + Math.round((n - d.min) / d.step) * d.step;
  return Math.max(d.min, Math.min(d.max, snapped));
}


export function normaliseDials(dials) {
  const out = freshDials();
  if (dials && typeof dials === 'object') {
    for (const d of DIALS) {
      if (d.id in dials) out[d.id] = clampDial(d.id, dials[d.id]);
    }
  }
  return out;
}



export function stepDial(dials, id, dir) {
  const d = dialSpec(id);
  if (!d) return false;
  const before = clampDial(id, dials[id]);
  const after = clampDial(id, before + dir * d.step);
  dials[id] = after;
  return after !== before;
}


export function dialFraction(id, v) {
  const d = dialSpec(id);
  if (!d) return 0;
  return (clampDial(id, v) - d.min) / (d.max - d.min);
}



export function dialsActive(dials) {
  if (!dials) return false;
  for (const d of DIALS) {
    if (clampDial(d.id, dials[d.id]) !== d.def) return true;
  }
  return false;
}





export function applyDials(state, dials) {
  state.dials = null;
  if (!state || isReplaying(state)) return false;
  const norm = normaliseDials(dials);
  if (!dialsActive(norm)) return false;
  state.dials = norm;
  return true;
}





export function cooldownFrames(state, frames) {
  const d = state && state.dials;
  if (!d || d.bulletCooldown === 100) return frames;
  if (d.bulletCooldown === 0) return 1;
  return Math.max(1, Math.round((frames * d.bulletCooldown) / 100));
}



export function bulletCopies(state) {
  const d = state && state.dials;
  if (!d) return 1;
  return clampDial('bulletMult', d.bulletMult);
}



export const COPY_SPACING = 14;
