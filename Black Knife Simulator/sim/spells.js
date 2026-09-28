


import { PARTY, statFor } from './damage.js';
import { spellDamage, damageKnight } from './knight.js';
import { castRudeBuster } from './rudebuster.js';
import { applyHeal } from './items.js';
import { spawnSelfHealNumber, spawnDmgNumber } from './dmgnumbers.js';
import { PARTY as PARTY_STATS, partyMaxhp } from './damage.js';



const healAmountModifyByEquipment = (amount, ribbons) =>
  amount + Math.ceil(amount / 8) * ribbons;



function healNumber(state, target, amount) {
  const maxed = state.partyHp[target] >= partyMaxhp(state, target);
  spawnSelfHealNumber(state, target, amount, maxed);
}
import { cue } from './audio.js';
import { ACT_PAGES, ACT_FACES, withFacePages } from './dialogue.js';


const PARTY_POS = [{ x: 126, y: 104 }, { x: 80, y: 142 }, { x: 58, y: 190 }];
const KNIGHT_POS = { x: 425, y: 78 };

const C_YELLOW_BGR = 65535;


const KNIGHT_SPRITE_HALF = { w: 117, h: 115 };


export const SPELLS = {
  2: { name: 'Heal Prayer', descb: 'Heal#Ally', cost: 80, target: 1 },
  3: { name: 'Pacify', descb: 'Spare#TIRED foe', cost: 40, target: 2 },
  4: { name: 'Rude Buster', descb: 'Rude#Damage#', cost: 125, target: 2 },
  7: { name: 'ACT', descb: 'Use#action', cost: 0, target: 0 },
  11: { name: 'UltraHeal', descb: 'Best#healing', cost: 225, target: 1 },
};


export const SPELL_LIST = [[7], [4, 11], [3, 2]];





export const ACT_ROW_DEFAULT = Object.freeze({
  canact: 0, name: ' ', actor: 1, descb: ' ', cost: 0, simul: 0,
});



const actRow = (r) => Object.freeze({
  canact: 1,
  name: ACT_ROW_DEFAULT.name,
  descb: ACT_ROW_DEFAULT.descb,
  cost: ACT_ROW_DEFAULT.cost,
  simul: ACT_ROW_DEFAULT.simul,
  ...r,
});



export const ACT_TABLES = Object.freeze({
  104: Object.freeze({
    1: Object.freeze([
      actRow({ name: 'Check', descb: 'Useless#analysis' }),
      actRow({ name: 'HoldBreath' }),
    ]),
    2: Object.freeze([actRow({ name: 'S-Action' })]),
    3: Object.freeze([actRow({ name: 'R-Action' })]),
    4: Object.freeze([]),
  }),
});


export const KNIGHT_MONSTERTYPE = 104;



export const ACT_GENERIC_NAMES = Object.freeze(['S-Action', 'R-Action', 'N-Action']);



export const ACT_SPECIAL_BY_CHAR = Object.freeze({ 1: 1, 2: 2, 3: 3, 4: 4 });



export const ACTS = [1, 2, 3].map((id) =>
  ACT_TABLES[KNIGHT_MONSTERTYPE][id].map((r) => ({ name: r.name, descb: r.descb })));


export function spellInfo(state, id) {
  return state?.kaizo?.hooks?.spellInfo?.[id] ?? SPELLS[id];
}

export function spellListFor(state, c) {
  return state?.kaizo?.hooks?.spellList?.(state, c) ?? SPELL_LIST[c];
}



export function enemyMonsterType(state) {
  return state?.monsterType ?? KNIGHT_MONSTERTYPE;
}



function charIdOfSlot(state, slot) {
  const ids = state?.partyCharIds ?? state?.kaizo?.globalChar;
  if (Array.isArray(ids)) return ids[slot] > 0 ? ids[slot] : 0;
  return slot + 1;
}



export function actsFor(state, c) {
  const hooked = state?.kaizo?.hooks?.actList?.(state, c);
  if (hooked) return hooked;
  const table = ACT_TABLES[enemyMonsterType(state)];
  return table?.[charIdOfSlot(state, c)] ?? [];
}



export function actUsable(state, slot, row) {
  if (!row) return false;
  if (row.usable !== undefined) return row.usable;
  const actor = row.actor ?? ACT_ROW_DEFAULT.actor;

  const upById = (id) => {
    for (let s = 0; s < 3; s++) {
      if (charIdOfSlot(state, s) !== id) continue;
      return (state?.partyHp?.[s] ?? 0) > 0;
    }
    return false;
  };
  if (actor === 2 || actor === 4) { if (!upById(2)) return false; }
  if (actor === 3 || actor === 4) { if (!upById(3)) return false; }
  if (actor === 5) { if (!upById(4)) return false; }
  if ((state?.tension ?? 0) < (row.cost ?? ACT_ROW_DEFAULT.cost)) return false;
  return true;
}



export function spellCost(state, slot, spellId) {

  const hook = state?.kaizo?.hooks?.spellCost;
  if (hook) {
    const v = hook(state, slot, spellId);
    if (v !== undefined) return v;
  }
  const s = spellInfo(state, spellId);
  if (!s) return Infinity;

  if (spellId === 4) return statFor(state, slot).rudeBusterCost;
  return s.cost;
}

export function canAfford(state, spellId, slot = 1) {
  return state.tension >= spellCost(state, slot, spellId);
}





export function resolveActPages(state, c, actId) {
  state.actCounts = state.actCounts ?? {};
  const n = state.actCounts;

  const hook = state.kaizo?.hooks?.resolveActPages;
  if (hook) {
    const pages = hook(state, c, actId);
    if (pages) return pages;
  }
  if (c === 0) {
    if (actId === 1) return ACT_PAGES[holdBreath(state)];
    n.check = (n.check ?? 0) + 1;
    return ACT_PAGES[n.check === 1 ? 'check' : 'point'];
  }
  if (c === 1) {

    n.susieUsed = true;

    return withFacePages(ACT_PAGES.susie, ACT_FACES.susie);
  }
  n.ralsei = (n.ralsei ?? 0) + 1;
  const rk = n.ralsei <= 1 ? 'ralsei' : 'ralsei_again';
  return withFacePages(ACT_PAGES[rk], ACT_FACES[rk]);
}

export function holdBreath(state) {

  const n = (state.knight.holdbreathcount ?? 0) + 1;
  state.knight.holdbreathcount = 1;
  return n <= 1 ? 'holdbreath_first' : 'holdbreath_again';
}


export function soulSpeed(state) {
  if (!state.knight?.holdbreathcount) return 4;
  return state.roaringActive ? 6 : 5;
}



export function castSpare(state, slot, target = 0, opts = {}) {
  const xy = opts.monsterXY ?? { x: KNIGHT_POS.x, y: KNIGHT_POS.y + 40 };
  spawnDmgNumber(state, xy.x, xy.y, 0, 5, 2);
  state.pacifyFail = { con: 6, alarm: 8, color: C_YELLOW_BGR };
  return null;
}



export function castSpell(state, slot, spellId, target = 0, opts = {}) {

  const hook = state.kaizo?.hooks?.castSpell;
  if (hook) {
    const r = hook(state, slot, spellId, target, opts);
    if (r !== undefined) return r;
  }
  if (spellId === 100) return castSpare(state, slot, target, opts);
  const s = spellInfo(state, spellId);
  if (!s) return null;

  if (!opts.alreadyPaid) {
    if (state.tension < s.cost) return null;
    state.tension -= s.cost;
  }

  if (spellId === 4) {

    const kx = KNIGHT_POS.x + KNIGHT_SPRITE_HALF.w;
    const ky = KNIGHT_POS.y + KNIGHT_SPRITE_HALF.h - 50;

    castRudeBuster(state, PARTY_POS[slot].x, PARTY_POS[slot].y,
      spellDamage(state, slot), kx, ky, 50);
    return 'Rude Buster!';
  }
  if (spellId === 2) {

    const st = statFor(state, slot);
    const amount = healAmountModifyByEquipment(st.magic * 5, st.healRibbons);
    applyHeal(state, target, st.magic * 5, st.healRibbons);
    healNumber(state, target, amount);

    return null;
  }
  if (spellId === 11) {

    const st2 = statFor(state, slot);
    const amount = healAmountModifyByEquipment(st2.magic * 5 + 100, st2.healRibbons);
    const did = applyHeal(state, target, st2.magic * 5 + 100, st2.healRibbons);
    healNumber(state, target, amount);
    return `UltraHeal: +${did}`;
  }
  if (spellId === 3) {

    state.pacifyFail = { con: 6, alarm: 8 };
    return null;
  }
  return null;
}
