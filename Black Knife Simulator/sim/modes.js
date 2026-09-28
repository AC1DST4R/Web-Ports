

export const MODES = [
  {
    id: 'normal',
    name: 'NORMAL',
  },
  {
    id: 'hitless',
    name: 'HITLESS',
  },
  {
    id: 'endless',
    name: 'ENDLESS',
  },
  {
    id: 'single',
    name: 'SINGLE ATTACK',
  },
  {
    id: 'practice',
    name: 'PRACTICE',
  },
];

export function modeRows(title) {
  const own = title && Array.isArray(title.modes) ? title.modes : null;
  return own && own.length > 0 ? own : MODES;
}

export const ENDLESS_STAGES = [
  {
    id: 'all',
    name: 'WHOLE FIGHT',
    phase: 0,
  },
  {
    id: 'phase1',
    name: 'PHASE 1',
    phase: 1,
  },
  {
    id: 'phase2',
    name: 'PHASE 2',
    phase: 2,
  },
  {
    id: 'phase3',
    name: 'PHASE 3',
    phase: 3,
  },
  {
    id: 'phase4',
    name: 'PHASE 4',
    phase: 4,
  },
];

export function endlessPhase(index) {
  return ENDLESS_STAGES[index | 0]?.phase ?? 0;
}

import { WEAPONS, ARMOR, canEquip, statsOf } from './equipment.js';
import { WEAPON_REFUSALS, ARMOR_REFUSALS } from './equip-refusals.js';
import { DEFAULT_GEAR, PARTY } from './damage.js';
import { ITEMS, ITEM_IDS, DEFAULT_BAG, INVENTORY_SIZE } from './items.js';

import {
  DIALS, freshDials, clampDial, stepDial,
} from './dials.js';

import { mergeColor, lengthdirX, lengthdirY, WHITE, RED } from './gml.js';
import { gmlCreate, gmlRandom } from './rng.js';

export const ITEM_PICKER = [0, ...ITEM_IDS];

export const SETTINGS_PAGES = [
  { id: 'audio', name: 'MUSIC / SFX' },
  { id: 'graphics', name: 'GRAPHICS' },

  { id: 'controls', name: 'CONTROLS' },

  { id: 'share', name: 'SHARE SETUP' },
  { id: 'unused', name: 'UNUSED' },
];

export function controlRows(title) {
  const rows = [

    { id: 'touch', name: 'TOUCH BUTTONS', value: title.swapZX ? 'X / Z' : 'Z / X' },

    { id: 'holdbreath', name: 'SINGLE HOLDBREATH', value: title.holdBreath ? 'ON' : 'OFF' },

    { id: 'nbc', name: 'NO BULLET COOLDOWNS', value: title.noBulletCooldown ? 'ON' : 'OFF' },
  ];

  const dials = title.dials ?? freshDials();
  for (const d of DIALS) {
    const v = clampDial(d.id, dials[d.id]);
    rows.push({
      id: d.id,
      name: d.name,
      value: d.format(v),
      slider: true,
      fraction: (v - d.min) / (d.max - d.min),
      off: v === d.def,

      locked: title.replaying === true,
    });
  }

  const devices = Object.keys(title.bindings?.devices ?? {});
  if (devices.length) {

    rows.push({ id: 'bindings', name: 'BUTTONS', value: deviceName(title.bindings.device) });
  }
  return rows;
}

export function deviceName(id) {

  if (id === 'gamepad') return 'CONTROLLER';
  if (id === 'touch') return 'TOUCH';
  if (id === 'keyboard') return 'KEYBOARD';
  return String(id ?? '').toUpperCase();
}

export const UNUSED_PRESSES = 20;

export const UNUSED_SHATTER = Object.freeze({
  fragments: 31,
  delay: 20,
  speed: 4,
  gravity: 0.4,
  gravitySpread: 0.12,
  friction: 0,
  doom: 120,
  cull: 480,
});

export const UNUSED_RED = mergeColor(WHITE, RED, 0.6);

export const UNUSED_SHAKE = Object.freeze({ amt: 4, reduct: 1 });

function minishakeUnused(u) {
  u.shake = { shakeamt: UNUSED_SHAKE.amt, shakereduct: UNUSED_SHAKE.reduct, on: 1, off: 0 };
  return u.shake;
}

function stepUnusedShake(title) {
  const sh = title?.unused?.shake;
  if (!sh) return;
  sh.shakeamt -= sh.shakereduct;
  sh.on *= -1;
  sh.off = sh.shakeamt * sh.on;

  if (sh.shakeamt <= 0) title.unused.shake = null;
}

export function armUnused(title, saved = {}) {
  const taken = !!saved.taken;
  const presses = Math.max(0, Math.min(UNUSED_PRESSES, saved.presses | 0));
  title.unused = {

    presses: taken ? UNUSED_PRESSES : presses,
    taken,
    sprite: typeof saved.sprite === 'string' ? saved.sprite : null,
    fragments: saved.fragments > 0
      ? Math.min(256, saved.fragments | 0)
      : UNUSED_SHATTER.fragments,

    seed: saved.seed === undefined ? 0x50524f43 : (saved.seed >>> 0),

    shatter: null,

    shake: null,
  };
  return title.unused;
}

function createUnusedShatter(u) {
  const rng = gmlCreate(u.seed >>> 0);
  const frags = [];
  for (let i = 0; i < u.fragments; i++) {
    const direction = gmlRandom(rng, 360);
    const gravity = UNUSED_SHATTER.gravity + gmlRandom(rng, UNUSED_SHATTER.gravitySpread);

    frags.push({ i, dx: 0, dy: 0, hsp: 0, vsp: 0, direction, gravity, alive: true });
  }
  return { t: 0, frags, live: frags.length };
}

function stepUnusedShatter(title) {
  const u = title?.unused;
  const sh = u?.shatter;
  if (!sh) return false;
  sh.t += 1;
  let live = 0;
  for (const f of sh.frags) {
    if (!f.alive) continue;
    if (sh.t === UNUSED_SHATTER.delay) {

      f.hsp = lengthdirX(UNUSED_SHATTER.speed, f.direction);
      f.vsp = lengthdirY(UNUSED_SHATTER.speed, f.direction);
    }
    if (sh.t >= UNUSED_SHATTER.delay) {

      if (UNUSED_SHATTER.friction) {
        const spd = Math.hypot(f.hsp, f.vsp);
        const k = spd > 0 ? Math.max(0, spd - UNUSED_SHATTER.friction) / spd : 0;
        f.hsp *= k;
        f.vsp *= k;
      }
      f.vsp += f.gravity;
      f.dx += f.hsp;
      f.dy += f.vsp;
    }
    if (sh.t >= UNUSED_SHATTER.doom || f.dy > UNUSED_SHATTER.cull) f.alive = false;
    else live += 1;
  }
  if (live > 0) return false;

  u.taken = true;
  u.shatter = null;
  u.presses = UNUSED_PRESSES;

  title.settings = null;
  title.dirty = true;
  return true;
}

export function unusedRowStyle(title) {
  const u = title?.unused;

  if (!u) {
    return {
      name: 'UNUSED', sub: null, dim: true, heat: 0, shake: 0,
      red: UNUSED_RED, sprite: null, shattering: false, taken: false,
    };
  }
  if (u.taken) {
    return {
      name: 'PROCEED', sub: null, dim: false, heat: 1, shake: 0,
      red: UNUSED_RED, sprite: u.sprite, shattering: false, taken: true,
    };
  }
  return {
    name: 'UNUSED', sub: null, dim: u.presses === 0,
    heat: Math.min(1, u.presses / UNUSED_PRESSES),
    shake: u.shake ? u.shake.off : 0,
    red: UNUSED_RED,
    sprite: u.sprite, shattering: !!u.shatter, taken: false,
  };
}

export const GEAR_PAGES = [
  { id: 'equip', name: 'WEAPONS / ARMOR' },
  { id: 'items', name: 'ITEMS' },
];

export const TITLE_EXTRAS = [
  { id: 'gear', name: 'GEAR / ITEMS' },
  { id: 'settings', name: 'SETTINGS' },
  { id: 'credits', name: 'CREDITS' },
];

export const CREDITS = [
  { role: 'Developer', who: 'Radi0', link: 'radi0.dev' },
  { role: 'Bug fixing and playtesting', who: 'WandeR', link: 'wander22lstr.carrd.co' },

  { role: 'Support', who: '', link: 'ko-fi.com/shadowcrystaldev' },
];

export const creditLink = (row) => (row.link ? `https://${row.link}` : null);

export function titleCredits(title) {
  return title?.credits ?? CREDITS;
}

export function pocketOf(kind, gear = null) {
  const table = kind === 'weapon' ? WEAPONS : ARMOR;
  const ids = Object.keys(table).map(Number).filter((id) => id !== 26 || kind !== 'weapon');
  return [0, ...ids];
}

export function wornBy(kind, id, gear) {
  if (!gear || id === 0) return [];
  return gear.flatMap((g, i) => (
    (kind === 'weapon' ? g.weapon === id : (g.armor ?? []).includes(id)) ? [i] : []
  ));
}

export const DEFAULT_PARTY_TABS = PARTY.map((p, i) => ({ name: p.name, char: i, base: p }));

export function partyTabs(title) {
  const tabs = title?.party;
  return Array.isArray(tabs) && tabs.length ? tabs : DEFAULT_PARTY_TABS;
}

export function createTitle() {
  return {

    mode: null,
    index: 0,

    attackIndex: 0,

    pickingAttack: false,

    pickingDifficulty: false,
    difficultyIndex: 0,
    difficultyCount: 1,

    stageIndex: 0,

    pickingStage: false,
    siner: 0,
    held: {},

    settings: null,

    gear: DEFAULT_GEAR.map((g) => ({ weapon: g.weapon, armor: [...g.armor] })),

    bag: [...DEFAULT_BAG],

    volumes: { music: 50, sfx: 50 },

    dials: freshDials(),

    replaying: false,

    shake: true,

    scaling: 'fit',

    swapZX: false,

    holdBreath: false,

    noBulletCooldown: false,

    bindings: null,

    unused: null,

    party: null,

    dirty: false,
  };
}

function openSettings(title) {
  title.settings = {
    page: null,
    cursor: 0,
    shared: 0,
    equip: { stage: 'char', char: 0, row: 0, pocket: 0 },
    items: { stage: 'slots', slot: 0, pick: 0 },

    controls: { stage: 'rows', bind: 0 },
  };
}

function openGear(title) {
  title.settings = {
    page: 'gearhub',
    root: true,
    cursor: 0,
    equip: { stage: 'char', char: 0, row: 0, pocket: 0 },
    items: { stage: 'slots', slot: 0, pick: 0 },
  };
}

function openCredits(title) {
  title.settings = {
    page: 'credits',
    root: true,
    cursor: 0,
    equip: { stage: 'char', char: 0, row: 0, pocket: 0 },
    items: { stage: 'slots', slot: 0, pick: 0 },
  };
}

function stepSettings(title, pressed) {
  const s = title.settings;
  const out = { moved: false, selected: false, error: false };

  const leavePage = () => {
    if (s.back) { s.page = s.back; s.back = null; }
    else if (s.root) title.settings = null;
    else s.page = null;
  };

  if (s.page === null) {

    if (s.shared > 0) s.shared -= 1;
    if (pressed('up')) { s.cursor = (s.cursor + SETTINGS_PAGES.length - 1) % SETTINGS_PAGES.length; out.moved = true; }
    if (pressed('down')) { s.cursor = (s.cursor + 1) % SETTINGS_PAGES.length; out.moved = true; }
    if (pressed('cancel')) { title.settings = null; out.moved = true; return out; }
    if (pressed('confirm')) {

      if (!(s.cursor >= 0 && s.cursor < SETTINGS_PAGES.length)) s.cursor = 0;
      const page = SETTINGS_PAGES[s.cursor].id;

      if (page === 'unused') {
        const u = title.unused;
        if (!u) { out.error = true; return out; }

        if (u.shatter || u.taken) { out.error = true; return out; }
        u.presses += 1;
        out.press = u.presses;

        title.dirty = true;
        if (u.presses >= UNUSED_PRESSES) {
          u.presses = UNUSED_PRESSES;

          u.shatter = createUnusedShatter(u);

          u.shake = null;
          out.shatter = true;
          out.selected = true;
          return out;
        }

        minishakeUnused(u);
        out.error = true;
        return out;
      }

      if (page === 'share') {
        out.share = true;
        out.selected = true;

        s.shared = 90;
        return out;
      }
      s.page = page;
      s.back = null;
      s.cursor = 0;
      s.equip = { stage: 'char', char: 0, row: 0, pocket: 0 };
      out.selected = true;
    }
    return out;
  }

  if (s.page === 'gearhub') {
    if (pressed('up')) { s.cursor = (s.cursor + GEAR_PAGES.length - 1) % GEAR_PAGES.length; out.moved = true; }
    if (pressed('down')) { s.cursor = (s.cursor + 1) % GEAR_PAGES.length; out.moved = true; }

    if (pressed('cancel')) { title.settings = null; out.moved = true; return out; }
    if (pressed('confirm')) {
      s.page = GEAR_PAGES[s.cursor].id;

      s.back = 'gearhub';
      s.equip = { stage: 'char', char: 0, row: 0, pocket: 0 };
      s.items = { stage: 'slots', slot: 0, pick: 0 };
      out.selected = true;
    }
    return out;
  }

  if (s.page === 'items') {
    const it = s.items;
    if (it.stage === 'slots') {
      if (pressed('up') && it.slot >= 2) { it.slot -= 2; out.moved = true; }
      if (pressed('down') && it.slot <= INVENTORY_SIZE - 3) { it.slot += 2; out.moved = true; }

      if (pressed('left') || pressed('right')) {
        it.slot += it.slot % 2 === 0 ? 1 : -1;
        out.moved = true;
      }
      if (pressed('cancel')) { leavePage(); out.moved = true; }
      if (pressed('confirm')) {
        it.stage = 'pick';

        it.pick = Math.max(0, ITEM_PICKER.indexOf(title.bag[it.slot] ?? 0));
        out.selected = true;
      }
      return out;
    }

    if (pressed('up')) {
      it.pick = (it.pick + ITEM_PICKER.length - 1) % ITEM_PICKER.length;
      out.moved = true;
    }
    if (pressed('down')) {
      it.pick = (it.pick + 1) % ITEM_PICKER.length;
      out.moved = true;
    }
    if (pressed('cancel')) { it.stage = 'slots'; out.moved = true; }
    if (pressed('confirm')) {
      title.bag[it.slot] = ITEM_PICKER[it.pick];
      title.dirty = true;
      it.stage = 'slots';
      out.selected = true;
    }
    return out;
  }

  if (s.page === 'credits') {
    if (pressed('confirm')) {
      const href = creditLink(titleCredits(title)[s.cursor] ?? {});
      if (href) { out.link = href; out.selected = true; }
      return out;
    }
    const rows = titleCredits(title).length;
    if (pressed('up')) { s.cursor = (s.cursor + rows - 1) % rows; out.moved = true; }
    if (pressed('down')) { s.cursor = (s.cursor + 1) % rows; out.moved = true; }

    if (pressed('cancel')) {
      leavePage();
      out.moved = true;
    }
    return out;
  }

  if (s.page === 'graphics') {

    const ROWS = 2;
    if (pressed('up')) { s.cursor = (s.cursor + ROWS - 1) % ROWS; out.moved = true; }
    if (pressed('down')) { s.cursor = (s.cursor + 1) % ROWS; out.moved = true; }
    const flipL = pressed('left');
    const flipR = pressed('right');
    const flipC = pressed('confirm');
    if (flipL || flipR || flipC) {
      if (s.cursor === 0) title.scaling = title.scaling === 'fit' ? 'pixel' : 'fit';
      else title.shake = !title.shake;
      title.dirty = true;
      out.moved = true;
    }
    if (pressed('cancel')) { leavePage(); out.moved = true; }
    return out;
  }

  if (s.page === 'controls') {

    const c = s.controls ?? (s.controls = { stage: 'rows', bind: 0 });
    const rows = controlRows(title);

    if (c.stage === 'rows') {
      if (pressed('up')) { s.cursor = (s.cursor + rows.length - 1) % rows.length; out.moved = true; }
      if (pressed('down')) { s.cursor = (s.cursor + 1) % rows.length; out.moved = true; }
      const row = rows[s.cursor] ?? rows[0];
      const left = pressed('left');
      const right = pressed('right');
      const confirm = pressed('confirm');
      if (row.id === 'bindings') {

        if (confirm) { c.stage = 'bind'; c.bind = 0; out.selected = true; }
      } else if (row.slider) {

        if (row.locked) {
          if (left || right) out.error = true;
        } else {
          const dir = (right ? 1 : 0) - (left ? 1 : 0);

          if (dir !== 0) {
            if (!title.dials) title.dials = freshDials();
            if (stepDial(title.dials, row.id, dir)) {
              title.dirty = true;
              out.moved = true;
            }

          }
        }
      } else if (left || right || confirm) {

        if (row.id === 'touch') title.swapZX = !title.swapZX;
        else if (row.id === 'holdbreath') title.holdBreath = !title.holdBreath;
        else if (row.id === 'nbc') title.noBulletCooldown = !title.noBulletCooldown;
        title.dirty = true;
        out.moved = true;
      }
      if (pressed('cancel')) { leavePage(); out.moved = true; }
      return out;
    }

    const b = title.bindings;
    if (!b) { c.stage = 'rows'; return out; }
    const devices = Object.keys(b.devices ?? {});
    if (!devices.length) { c.stage = 'rows'; return out; }
    if (!devices.includes(b.device)) b.device = devices[0];
    const list = b.devices[b.device] ?? [];

    if (b.capture) {
      if (pressed('cancel')) { b.capture = null; out.moved = true; }
      return out;
    }

    if (pressed('left')) {
      b.device = devices[(devices.indexOf(b.device) + devices.length - 1) % devices.length];
      c.bind = 0;
      out.moved = true;
    }
    if (pressed('right')) {
      b.device = devices[(devices.indexOf(b.device) + 1) % devices.length];
      c.bind = 0;
      out.moved = true;
    }

    const live = b.devices[b.device] ?? list;
    if (c.bind >= live.length) c.bind = 0;
    if (live.length) {
      if (pressed('up')) { c.bind = (c.bind + live.length - 1) % live.length; out.moved = true; }
      if (pressed('down')) { c.bind = (c.bind + 1) % live.length; out.moved = true; }
    }
    if (pressed('confirm')) {
      const entry = live[c.bind];

      if (!entry || entry.fixed) out.error = true;
      else {
        b.capture = { device: b.device, action: entry.action };
        out.rebind = { device: b.device, action: entry.action };
        out.selected = true;
      }
    }
    if (pressed('cancel')) { c.stage = 'rows'; out.moved = true; }
    return out;
  }

  if (s.page === 'audio') {
    if (pressed('up') || pressed('down')) { s.cursor = 1 - s.cursor; out.moved = true; }
    const key = s.cursor === 0 ? 'music' : 'sfx';
    if (pressed('left')) {
      title.volumes[key] = Math.max(0, title.volumes[key] - 5);
      title.dirty = true;
      out.moved = true;
    }
    if (pressed('right')) {
      title.volumes[key] = Math.min(100, title.volumes[key] + 5);
      title.dirty = true;
      out.moved = true;
    }
    if (pressed('cancel')) { leavePage(); out.moved = true; }
    return out;
  }

  const eq = s.equip;

  const tabs = partyTabs(title);
  if (eq.char >= tabs.length) eq.char = 0;
  const charFlag = tabs[eq.char].char;
  if (eq.stage === 'char') {
    if (pressed('left')) { eq.char = (eq.char + tabs.length - 1) % tabs.length; out.moved = true; }
    if (pressed('right')) { eq.char = (eq.char + 1) % tabs.length; out.moved = true; }

    if (pressed('cancel')) {
      leavePage();
      out.moved = true;
    }
    if (pressed('confirm')) { eq.stage = 'slot'; eq.row = 0; out.selected = true; }
    return out;
  }
  if (eq.stage === 'slot') {
    if (pressed('up')) { eq.row = (eq.row + 2) % 3; out.moved = true; }
    if (pressed('down')) { eq.row = (eq.row + 1) % 3; out.moved = true; }
    if (pressed('cancel')) { eq.stage = 'char'; out.moved = true; }
    if (pressed('confirm')) {
      eq.stage = 'pocket';

      const kind = eq.row === 0 ? 'weapon' : 'armor';
      const cur = eq.row === 0 ? title.gear[eq.char].weapon : title.gear[eq.char].armor[eq.row - 1] ?? 0;
      const pocket = pocketOf(kind, title.gear);
      eq.pocket = Math.max(0, pocket.indexOf(cur));
      out.selected = true;
    }
    return out;
  }

  const kind = eq.row === 0 ? 'weapon' : 'armor';
  const pocket = pocketOf(kind, title.gear);
  if (pressed('up')) { eq.pocket = (eq.pocket + pocket.length - 1) % pocket.length; out.moved = true; }
  if (pressed('down')) { eq.pocket = (eq.pocket + 1) % pocket.length; out.moved = true; }

  if (out.moved) eq.comment = null;
  if (pressed('cancel')) { eq.stage = 'slot'; eq.comment = null; out.moved = true; }
  if (pressed('confirm')) {
    const id = pocket[eq.pocket];

    {

      const table = kind === 'weapon' ? WEAPON_REFUSALS : ARMOR_REFUSALS;
      const line = id !== 0 ? table[id]?.[String(charFlag + 1)] : null;
      eq.comment = line && line.trim() ? line : null;
    }
    if (id !== 0 && !canEquip(kind, id, charFlag)) { out.error = true; return out; }
    if (eq.row === 0) title.gear[eq.char].weapon = id;
    else {
      const armor = title.gear[eq.char].armor;
      while (armor.length < 2) armor.push(0);
      armor[eq.row - 1] = id;
    }
    title.dirty = true;
    eq.stage = 'slot';
    out.selected = true;
  }
  return out;
}

export function previewStats(title, char) {
  const tabs = partyTabs(title);
  return statsOf((tabs[char] ?? tabs[0]).base, title.gear[char]);
}

export function stepTitle(title, input, attacks) {
  const attackCount = Array.isArray(attacks) ? attacks.length : attacks;
  title.siner += 1;

  stepUnusedShake(title);
  const pressed = (k) => {
    const down = !!input?.[k];
    const was = !!title.held[k];
    title.held[k] = down;
    return down && !was;
  };

  if (title.unused?.shatter) {
    for (const k of ['up', 'down', 'left', 'right', 'confirm', 'cancel']) pressed(k);
    const done = stepUnusedShatter(title);

    return {
      moved: false, chosen: false, selected: false, error: false,
      link: null, share: false, proceed: done, press: 0, shatter: false,
      rebind: null,
    };
  }

  if (title.settings) {
    const r = stepSettings(title, pressed);

    return {
      moved: r.moved, chosen: false, selected: r.selected, error: r.error,
      link: r.link ?? null, share: r.share ?? false,
      proceed: r.proceed ?? false, press: r.press ?? 0,
      shatter: r.shatter ?? false,

      rebind: r.rebind ?? null,
    };
  }

  const list = title.pickingStage
    ? ENDLESS_STAGES.length
    : title.pickingDifficulty
      ? title.difficultyCount
      : title.pickingAttack ? attackCount : modeRows(title).length + TITLE_EXTRAS.length;
  const cur = title.pickingStage
    ? 'stageIndex'
    : title.pickingDifficulty
      ? 'difficultyIndex'
      : title.pickingAttack ? 'attackIndex' : 'index';
  let moved = false;

  if (pressed('up')) {
    title[cur] = (title[cur] + list - 1) % list;
    moved = true;
  }
  if (pressed('down')) {
    title[cur] = (title[cur] + 1) % list;
    moved = true;
  }

  const cancelled = pressed('cancel');
  if (cancelled && title.pickingDifficulty) {
    title.pickingDifficulty = false;
    return { moved: true, chosen: false };
  }
  if (cancelled && title.pickingAttack) {
    title.pickingAttack = false;
    return { moved: true, chosen: false };
  }

  if (cancelled && title.pickingStage) {
    title.pickingStage = false;
    return { moved: true, chosen: false };
  }

  if (pressed('confirm')) {

    if (title.pickingStage) {
      title.mode = 'endless';
      return { moved: false, chosen: true, selected: true };
    }
    if (!title.pickingAttack && title.index >= modeRows(title).length) {
      const extra = TITLE_EXTRAS[title.index - modeRows(title).length];
      if (extra.id === 'credits') openCredits(title);
      else if (extra.id === 'gear') openGear(title);
      else openSettings(title);
      return { moved: false, chosen: false, selected: true };
    }
    if (!title.pickingAttack && modeRows(title)[title.index].id === 'single') {

      title.pickingAttack = true;
      return { moved: false, chosen: false, selected: true };
    }

    if (!title.pickingAttack && modeRows(title)[title.index].id === 'endless') {

      const n = ENDLESS_STAGES.length;
      if (!(title.stageIndex >= 0 && title.stageIndex < n)) title.stageIndex = 0;
      title.pickingStage = true;
      return { moved: false, chosen: false, selected: true };
    }

    if (title.pickingAttack && !title.pickingDifficulty && Array.isArray(attacks)) {
      const entry = attacks[title.attackIndex];
      const count = entry?.difficulties?.length ?? 1;
      if (count > 1) {
        title.pickingDifficulty = true;
        title.difficultyIndex = 0;
        title.difficultyCount = count;
        return { moved: false, chosen: false, selected: true };
      }
    }
    title.mode = modeRows(title)[title.index].id;
    return { moved: false, chosen: true, selected: true };
  }

  return { moved, chosen: false };
}
