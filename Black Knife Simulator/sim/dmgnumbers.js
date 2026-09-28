

import { PARTY_POS, PARTY, partyMaxhp } from './damage.js';
import { gmlRandom } from './rng.js';
import { mergeColor } from './gml.js';

import { scrOflash } from './fx.js';

const CHARBOX_X = [0, 212, 424];

const WHITE_RGB = [255, 255, 255];
const LIGHTB = mergeColor([0, 255, 255], WHITE_RGB, 0.5);
const LIGHTF = mergeColor([128, 0, 128], WHITE_RGB, 0.6);
const LIGHTG = mergeColor([0, 255, 0], WHITE_RGB, 0.5);
export const DMG_COLORS = [LIGHTB, LIGHTF, LIGHTG];

export const TYPE_PARTY = -1;
export const TYPE_DEAD = 4;

export const TYPE_SWOON = 12;

export const TYPE_HEAL = 3;
const C_WHITE = [255, 255, 255];
const C_RED = [255, 0, 0];
export const C_LIME = [0, 255, 0];

export const MSG_MAX = 3;

const LIGHTY = [255, 255, 76];
export const TYPE_NOELLE = 6;

export function dmgColor(type) {
  if (type === 0) return LIGHTB;
  if (type === 1) return LIGHTF;
  if (type === 2) return LIGHTG;
  if (type === TYPE_HEAL) return C_LIME;
  if (type === TYPE_DEAD) return C_RED;
  if (type === TYPE_NOELLE) return LIGHTY;
  if (type === TYPE_SWOON) return C_RED;

  return C_WHITE;
}

export function createDmgNumbers() {

  return { list: [], heals: [], anims: [], hittarget: 0, tu: [0, 0, 0] };
}

export function spawnDmgNumber(state, x, y, damage, type, delay = 8, opts = {}) {
  const d = state.dmg;
  if (!d) return;

  const { special = 0, stack = true, yoff = 0 } = opts;
  const top = stack ? y + 20 - d.hittarget * 20 : y + yoff;

  if (state.gmlRng) gmlRandom(state.gmlRng, 600);
  d.list.push({

    seq: (state.nextSpawnSeq ?? 0) - 0.5,
    x,

    y: top,
    ystart: top,
    damage,
    type,
    special,
    delay,
    delaytimer: 0,
    hspeed: 0,
    vspeed: 0,
    vstart: 0,
    bounces: 0,
    stretch: 0.2,
    stretchgo: 1,
    killtimer: 0,
    killactive: 0,
    kill: 0,
  });
  if (stack) d.hittarget += 1;
}

export function resetDmgStack(state) {
  if (state.dmg) {
    state.dmg.hittarget = 0;
    state.dmg.tu = [0, 0, 0];
  }
}

const HEAL_ANCHOR = [
  { x: 156, y: 104 },
  { x: 96, y: 142 },
  { x: 127, y: 190 },
];

const HEALANIM_SPAWN_FRAMES = 5;
const HEALANIM_PER_FRAME = 2;
const HEALANIM_LIFE = 30;

export const HEALANIM_DRAWS =
  HEALANIM_SPAWN_FRAMES * HEALANIM_PER_FRAME * 5;

export const C_ORANGE = [255, 160, 64];

const HEALANIM_SW = [68, 70, 52];
const HEALANIM_SH = [74, 82, 86];

export function spawnHealAnim(state, target, { color = C_LIME } = {}) {
  const d = state.dmg;
  if (!d) return null;
  if (!d.anims) d.anims = [];

  const pos = PARTY_POS[target] ?? PARTY[target] ?? { x: 0, y: 0 };
  const a = {
    slot: target,
    t: 0,
    x: pos.x,
    y: pos.y,
    sw: HEALANIM_SW[target] ?? 34,
    sh: HEALANIM_SH[target] ?? 37,
    color,
    stars: [],
    flashed: false,
  };
  d.anims.push(a);
  return a;
}

export function stepHealAnims(state) {
  const d = state.dmg;
  if (!d || !d.anims || !d.anims.length) return;
  const r = state.gmlRng;
  const f = Math.fround;
  for (const a of d.anims) {

    for (const s of a.stars) {
      if (!s.alive) continue;
      let spd = Math.hypot(s.hspeed, s.vspeed);
      if (spd > 0) {
        const dirx = s.hspeed / spd;
        const diry = s.vspeed / spd;

        spd = Math.max(0, spd - 0.2);
        s.hspeed = f(dirx * spd);
        s.vspeed = f(diry * spd);
      }
      s.x = f(s.x + s.hspeed);
      s.y = f(s.y + s.vspeed);

      s.image_index += 0.25;
    }

    a.t += 1;

    if (a.t === 1 && !a.flashed) {
      a.flashed = true;
      const actor = state.entities?.find(
        (e) => e.alive && e.isActor === true && e.slot === a.slot);

      if (actor) scrOflash(state, actor);
    }
    if (a.t >= 1 && a.t <= HEALANIM_SPAWN_FRAMES) {
      for (let i = 0; i < HEALANIM_PER_FRAME; i += 1) {

        const ox = r ? gmlRandom(r, a.sw) : a.sw / 2;
        const oy = r ? gmlRandom(r, a.sh) : a.sh / 2;
        const ang = r ? gmlRandom(r, 360) : 0;
        const hs = 2 - (r ? gmlRandom(r, 2) : 1);
        const vs = -3 - (r ? gmlRandom(r, 2) : 1);
        a.stars.push({
          alive: true,
          x: f(a.x + ox),
          y: f(a.y + oy),
          angle: f(ang),

          alpha: 2,
          image_index: 0,
          hspeed: f(hs),
          vspeed: f(vs),
        });
      }
    }
    if (a.t >= HEALANIM_SPAWN_FRAMES && a.t <= HEALANIM_LIFE) {
      for (const s of a.stars) {
        if (!s.alive) continue;
        s.angle = f(s.angle - 10);
        s.alpha = f(s.alpha - 0.1);

        if (s.alpha <= 0) s.alive = false;
      }

      if (a.t >= HEALANIM_LIFE) a.dead = true;
    }
    a.stars = a.stars.filter((s) => s.alive);
  }

  d.anims = d.anims.filter((a) => !a.dead);
}

export function spawnSelfHealNumber(state, target, amount, maxed) {
  const d = state.dmg;
  if (!d) return;

  spawnHealAnim(state, target);

  const pos = HEAL_ANCHOR[target] ?? PARTY_POS[target];
  const tu = d.tu[target] ?? 0;
  spawnDmgNumber(state, pos.x, pos.y, amount, TYPE_HEAL, 8,
    { special: maxed ? MSG_MAX : 0, stack: false, yoff: -tu * 20 });
  d.tu[target] = tu + 1;
}

export function spawnHealWriter(state, target, amount) {
  const d = state.dmg;
  if (!d) return;

  const hp = state.partyHp?.[target] ?? 0;

  const max = partyMaxhp(state, target) ?? 0;
  const pos = HEAL_ANCHOR[target] ?? PARTY_POS[target];
  d.heals.push({

    x: pos.x,
    y: pos.y - 6,
    maxed: max > 0 && hp >= max,
    healamt: amount,

    stretch: 0.2,
    stretchgo: 1,

    vspeed: -6,
    alpha: 1.5,
  });
}

export function stepHealWriters(state) {

  stepHealAnims(state);
  for (const h of state.dmg?.heals ?? []) {

    if (h.stretchgo === 1) h.stretch = (h.stretch ?? 0.2) + 0.4;
    if ((h.stretch ?? 0) >= 1.2) { h.stretch = 1; h.stretchgo = 0; }
  }
  const d = state.dmg;
  if (!d || !d.heals.length) return;
  for (const h of d.heals) {
    h.y += h.vspeed;
    h.vspeed = h.vspeed + 0.2 > 0 ? 0 : h.vspeed + 0.2;

    h.alpha -= 0.1;
  }
  d.heals = d.heals.filter((h) => h.alpha >= 0);
}

export function stepDmgNumbers(state, rng) {
  const d = state.dmg;
  if (!d) return;
  for (const n of d.list) stepDmgNumber(state, n, rng);
  d.list = d.list.filter((n) => n.kill <= 1);
}

export function dmgNumberDrawItems(state, rng) {
  const d = state.dmg;
  if (!d || !d.list.length) return null;
  return d.list.map((n) => ({
    depth: 0, seq: n.seq ?? -Infinity, drawExtra: () => stepDmgNumber(state, n, rng),
  }));
}

export function sweepDmgNumbers(state) {
  const d = state.dmg;
  if (d) d.list = d.list.filter((n) => n.kill <= 1);
}

function stepDmgNumber(state, n, rng) {
  {

    if (n.delaytimer < n.delay) {
      n.delaytimer += 1;
      if (n.delaytimer === n.delay) {

        n.vspeed = -5 - (state.gmlRng ? gmlRandom(state.gmlRng, 2)
          : (rng ? rng() * 2 : 1));
        n.vstart = n.vspeed;
        n.hspeed = 10;
      }
      return;
    }

    if (n.hspeed > 0) n.hspeed -= 1;
    else if (n.hspeed < 0) n.hspeed += 1;
    if (Math.abs(n.hspeed) < 1) n.hspeed = 0;
    n.x += n.hspeed;

    if (n.bounces < 2) n.vspeed += 1;
    n.y += n.vspeed;
    if (n.y > n.ystart && n.bounces < 2 && n.killactive === 0) {
      n.y = n.ystart;
      n.vspeed = n.vstart / 2;
      n.bounces += 1;
    }
    if (n.bounces >= 2 && n.killactive === 0) {
      n.vspeed = 0;
      n.y = n.ystart;
    }

    if (n.stretchgo === 1) n.stretch += 0.4;
    if (n.stretch >= 1.2) {
      n.stretch = 1;
      n.stretchgo = 0;
    }

    n.killtimer += 1;
    if (n.killtimer > 35) n.killactive = 1;
    if (n.killactive === 1) {
      n.kill += 0.08;
      n.y -= 4;
    }
  }
}
