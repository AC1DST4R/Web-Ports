


import { objectIndex } from './data/object-order.js';

import { bulletCopies, COPY_SPACING } from './dials.js';
import { lengthdirX, lengthdirY } from './gml.js';

export const ALARM_COUNT = 12;



export const F32_BUILTINS = [
  'x', 'y', 'xstart', 'ystart',
  'speed', 'direction',
  'image_angle', 'image_xscale', 'image_yscale',
  'image_index', 'image_speed', 'image_alpha',
  'friction', 'gravity', 'gravity_direction',
  'depth',
];





const ANGLE_BUILTINS = new Set(['direction', 'gravity_direction']);


const MOTION_POLAR = new Set(['speed', 'direction']);

function installF32Builtins(e) {
  const store = Object.create(null);
  for (const k of F32_BUILTINS) {
    const norm = ANGLE_BUILTINS.has(k)
      ? (v) => {
        const f = Math.fround(v);
        return Math.fround(((f % 360) + 360) % 360);
      }
      : (v) => Math.fround(v);
    const polar = MOTION_POLAR.has(k);
    store[k] = typeof e[k] === 'number' ? norm(e[k]) : e[k];
    delete e[k];
    Object.defineProperty(e, k, {
      enumerable: true,
      configurable: true,
      get() {
        return store[k];
      },
      set(v) {
        store[k] = typeof v === 'number' ? norm(v) : v;

        if (polar) e.motionPolarWritten = true;
      },
    });
  }
}





const INSTANCE_DEFAULTS = {
  image_xscale: 1,
  image_yscale: 1,
  image_angle: 0,
  image_alpha: 1,
  image_index: 0,
  image_speed: 1,
  speed: 0,
  direction: 0,
  friction: 0,
  gravity: 0,
  gravity_direction: 270,
};

export function spawn(state, type, vars = {}) {
  const e = {
    seq: state.nextSpawnSeq++,

    bornFrame: state.frame,
    type,
    alive: true,
    alarm: new Array(ALARM_COUNT).fill(-1),
    x: 0,
    y: 0,
    ...INSTANCE_DEFAULTS,
    ...vars,
  };

  installF32Builtins(e);


  e.xstart = e.x;
  e.ystart = e.y;

  state.entities.push(e);
  if (type.create) type.create(e, state);


  if (e.type !== type) {
    throw new Error(
      `${type.name ?? 'an object'}'s create() overwrote e.type — that field is `
      + 'the entity descriptor. Rename the GML variable (see sim/entity.js).',
    );
  }


  if (state.dials && e.isBullet && state.dialSpawnBlock) e.dialFromBullet = true;
  return e;
}




export function destroy(e, state) {
  if (!e.alive) return;

  if (state && typeof e.type?.destroyEvent === 'function' && !e.destroyed) {
    e.destroyed = true;
    e.type.destroyEvent(e, state);
  }
  if (state && typeof e.type?.cleanUp === 'function' && !e.cleanedUp) {
    e.cleanedUp = true;
    e.type.cleanUp(e, state);
  }
  e.alive = false;
}





function phaseList(state) {

  const newestFirst = state.stepNewestFirst === true;
  return state.entities
    .filter((e) => e.alive)

    .sort((a, b) => (a.type.stepOrder ?? 0) - (b.type.stepOrder ?? 0)
      || (newestFirst ? b.seq - a.seq : a.seq - b.seq));
}



function drawList(state, extras = null) {
  const list = state.entities.filter((e) => e.alive);
  if (extras) for (const x of extras) list.push(x);
  return list.sort((a, b) => ((b.depth ?? 0) - (a.depth ?? 0)) || b.seq - a.seq);
}

export function runPhase(state, phase, extras = null) {
  state.eventPhase = phase;

  const armed = state.dials != null;
  for (const e of (phase === 'draw' ? drawList(state, extras) : phaseList(state))) {
    if (e.drawExtra) { e.drawExtra(); continue; }
    if (!e.alive) continue;
    if (armed) state.dialSpawnBlock = e.isBullet === true;
    const fn = e.type[phase];

    state.gmlSelf = e;
    if (fn) fn(e, state);
  }
  state.gmlSelf = null;

  if (armed) state.dialSpawnBlock = false;
}





function alarmList(state) {
  return state.entities
    .filter((e) => e.alive)
    .sort((a, b) => {
      const ai = objectIndex(a.type.name) ?? Number.POSITIVE_INFINITY;
      const bi = objectIndex(b.type.name) ?? Number.POSITIVE_INFINITY;
      return ai - bi || a.seq - b.seq;
    });
}


export function runAlarms(state) {
  state.eventPhase = 'alarm';

  const armed = state.dials != null;
  for (const e of alarmList(state)) {
    if (!e.alive) continue;
    if (armed) state.dialSpawnBlock = e.isBullet === true;

    for (let i = 0; i < ALARM_COUNT; i++) {

      if (e.alarm[i] > 0) {
        e.alarm[i] -= 1;
        if (e.alarm[i] === 0) {
          const fn = e.type.alarm && e.type.alarm[i];
          if (fn) {
            state.counters.alarmFires += 1;

            state.gmlSelf = e;
            fn(e, state);
            state.gmlSelf = null;
          }
        }
      } else if (e.alarm[i] === 0) {
        e.alarm[i] = -1;
      }
    }
  }
  if (armed) state.dialSpawnBlock = false;
}



export function multiplyBullets(state) {
  if (!state.dials) return 0;
  const copies = bulletCopies(state);
  if (copies <= 1) return 0;

  const born = [];
  for (const e of state.entities) {
    if (e.alive && e.isBullet && e.bornFrame === state.frame
        && !e.dialCopy && !e.dialFromBullet

        && e.type.dialNoCopy !== true) born.push(e);
  }
  let made = 0;
  for (const src of born) {
    for (let k = 1; k < copies; k++) {

      const c = { ...src };
      c.seq = state.nextSpawnSeq++;
      c.bornFrame = state.frame;
      c.alarm = src.alarm.slice();
      c.dialCopy = true;

      c.dialFromBullet = true;
      installF32Builtins(c);

      const back = k * COPY_SPACING;
      c.x = src.x - lengthdirX(back, c.direction);
      c.y = src.y - lengthdirY(back, c.direction);

      c.xstart = c.x;
      c.ystart = c.y;

      if (typeof src.type.dialCopied === 'function') src.type.dialCopied(c, src, k, state);
      state.entities.push(c);
      made += 1;
    }
  }
  return made;
}


export function reap(state) {

  multiplyBullets(state);
  if (state.entities.some((e) => !e.alive)) {
    state.entities = state.entities.filter((e) => e.alive);
  }
}
