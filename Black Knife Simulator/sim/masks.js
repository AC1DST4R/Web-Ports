



import { MASK_DATA as raw } from './data/masks.js';

function build(m) {
  return {
    name: m.name,
    w: m.w,
    h: m.h,
    originX: m.originX,
    originY: m.originY,
    bbox: m.bbox,

    px: m.rows.map((r) => Array.from(r, (c) => c === '1')),
  };
}

export const HEART_MASK = build(raw.heart);


export const HEART_RECT = {
  name: 'dodgeheart_rect',
  w: 20,
  h: 20,
  originX: 0,
  originY: 0,
  bbox: [0, 0, 19, 19],
  px: Array.from({ length: 20 }, () => new Array(20).fill(true)),
  axisRect: true,
};


export const HEART_RECT_WALL = { ...HEART_RECT, name: 'dodgeheart_rect_wall', axisRect: 'always' };


export const HEART_SMALL_MASK = build(raw.heartsmall);
export const BATTLEBG_MASK = build(raw.battlebg);


export const BATTLEBG_STRETCH_HITBOX_MASK = build(raw.battlebgStretchHitbox);


export const BATTLEBG_FIGHT_MASK = (() => {
  const src = build(raw.battlebg);
  const h = src.px.length;
  const w = src.px[0].length;
  const px = src.px.map((row, y) => row.map((v, x) => {
    if (v) return true;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy;
        const xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w && src.px[yy][xx]) return true;
      }
    }
    return false;
  }));
  return { ...src, name: 'battlebg_fight_effective', px };
})();
export const FOUNTAIN_MASK = build(raw.fountain);
export const TOOTH_MASK = build(raw.tooth);
export const STAR_MASK = build(raw.star);


export const STAR_FULL_MASK = build(raw.starfull);


export const DIAMOND_MASK = build(raw.diamondbullet);
export const PXWHITE2_MASK = build(raw.pxwhite2);
export const STARCHILD_MASK = build(raw.starchildparts);
export const SWORDOL_MASK = build(raw.swordol);
export const STARCHILD_TRAIL_MASK = build(raw.starchildtrail);
export const QUICKSLASH_MARKER_MASK = build(raw.quickslashmarker);


export const SMALLBULLET_MASK = build(raw.smallbullet);


export const STREAMDIAMOND_MASK = build(raw.streamdiamond);


export const WEIRDSHAPE_MASK = build(raw.weirdshape);


export const DIAMONDFORM_MASK = build(raw.diamondform);


export const SLASHTUNNEL_MASK = build(raw.slashtunnel);


export const CRESCENT_MASK = build(raw.crescenthitbox);


export const DIAMONDSWORD_MASK = { ...build(raw.diamondsword), rotRect: true };
export const DIAMONDBULLET_M_MASK = { ...build(raw.diamondbullet_m), rotRect: true };



export const SPRITE_MASKS = {
  spr_pxwhite2: PXWHITE2_MASK,
  spr_knight_starchild_parts: STARCHILD_MASK,

  spr_knight_starchild_trail: STARCHILD_TRAIL_MASK,
  spr_rk_quickslash_marker: QUICKSLASH_MARKER_MASK,
  spr_roaringknight_sword_ol: SWORDOL_MASK,
  spr_knight_diamondbullet_l: DIAMOND_MASK,

  spr_knight_bullet_star: STAR_FULL_MASK,
  spr_roaringknight_tooth: TOOTH_MASK,
  spr_rk_fountain_bullet: FOUNTAIN_MASK,
  spr_smallbullet: SMALLBULLET_MASK,
  spr_diamondbullet: STREAMDIAMOND_MASK,
  spr_knight_weird_shape: WEIRDSHAPE_MASK,
  spr_diamondbullet_form: DIAMONDFORM_MASK,
  spr_roaringknight_slash_tunnel: SLASHTUNNEL_MASK,
  spr_bullet_knightcrescent: CRESCENT_MASK,
  spr_knight_diamondswordbullet: DIAMONDSWORD_MASK,
  spr_knight_diamondbullet_m: DIAMONDBULLET_M_MASK,
};



const probeCache = new Map();
function probeMask(n) {
  let m = probeCache.get(n);
  if (!m) {
    const side = Math.max(1, Math.round(n));
    m = build({
      name: `probe${side}`,
      w: side,
      h: side,
      originX: 0,
      originY: 0,
      bbox: [0, 0, side - 1, side - 1],
      rows: Array.from({ length: side }, () => '1'.repeat(side)),
    });
    probeCache.set(n, m);
  }
  return m;
}



function rint(x) {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}



export function collisionRectanglePrecise(x1, y1, x2, y2, e, mask) {
  if (!mask) return false;

  const sxs = e.image_xscale ?? 1;
  const sys = e.image_yscale ?? 1;
  const ang = e.image_angle ?? 0;
  const r = (ang * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const [bl, bt, br, bb] = mask.bbox;
  const lx0 = (bl - mask.originX) * sxs;
  const lx1 = (br + 1 - mask.originX) * sxs;
  const ly0 = (bt - mask.originY) * sys;
  const ly1 = (bb + 1 - mask.originY) * sys;
  let mnx = Infinity;
  let mxx = -Infinity;
  let mny = Infinity;
  let mxy = -Infinity;
  for (const u of [lx0, lx1]) {
    for (const v of [ly0, ly1]) {
      const wx = e.x + u * cos + v * sin;
      const wy = e.y - u * sin + v * cos;
      if (wx < mnx) mnx = wx;
      if (wx > mxx) mxx = wx;
      if (wy < mny) mny = wy;
      if (wy > mxy) mxy = wy;
    }
  }
  const ix0 = Math.max(x1, mnx);
  const ix1 = Math.min(x2, mxx);
  const iy0 = Math.max(y1, mny);
  const iy1 = Math.min(y2, mxy);
  if (ix0 > ix1 || iy0 > iy1) return false;
  const px0 = rint(ix0);
  const px1 = rint(ix1);
  const py0 = rint(iy0);
  const py1 = rint(iy1);
  const ax = rint(e.x);
  const ay = rint(e.y);
  for (let py = py0; py <= py1; py++) {
    for (let px = px0; px <= px1; px++) {
      const dx = px + 0.5 - ax;
      const dy = py + 0.5 - ay;
      const u = dx * cos - dy * sin;
      const v = dx * sin + dy * cos;
      const sx = Math.floor(u / sxs + mask.originX);
      if (sx < 0 || sx >= mask.w) continue;
      const sy = Math.floor(v / sys + mask.originY);
      if (sy < 0 || sy >= mask.h) continue;
      if (mask.px[sy][sx]) return true;
    }
  }
  return false;
}

export function scrPreciseHit(heart, e, mask, n = 3) {
  const half = n / 2;
  const hx = heart.x + 10;
  const hy = heart.y + 10;
  if (!mask) return false;
  return collisionRectanglePrecise(hx - half, hy - half, hx + half, hy + half, e, mask);
}



export function enginePairHit(heart, e, mask) {
  if (!mask) return false;

  return masksOverlap(
    heart.mask ?? HEART_MASK, heart.x, heart.y,
    mask, e.x, e.y, e.image_xscale ?? 1, e.image_yscale ?? 1, e.image_angle ?? 0,
  );
}


export function spriteMaskHit(e, heart) {
  const m = SPRITE_MASKS[e.sprite_index];
  if (!m) return null;
  return masksOverlap(
    heart.mask ?? HEART_MASK, heart.x, heart.y,
    m, e.x, e.y, e.image_xscale, e.image_yscale, e.image_angle,
  );
}





function rintHalfEven(x) {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}





function maskHitsRotatedRect(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle) {
  const rotated = ((bangle % 360) + 360) % 360 !== 0;
  const px = rotated ? bx : Math.round(bx);
  const py = rotated ? by : Math.round(by);
  const [cos, sin] = collisionTrig(bangle);
  const [bl, bt, br, bb] = maskB.bbox;
  const [al, at, ar, ab] = maskA.bbox;

  const lx0 = (bl - maskB.originX) * bsx;
  const lx1 = (br + 1 - maskB.originX) * bsx;
  const ly0 = (bt - maskB.originY) * bsy;
  const ly1 = (bb + 1 - maskB.originY) * bsy;
  const corner = (u, v) => ({ x: px + u * cos + v * sin, y: py - u * sin + v * cos });
  const corners = [corner(lx0, ly0), corner(lx1, ly0), corner(lx1, ly1), corner(lx0, ly1)];

  if (maskA.axisRect !== 'always') {
    const [c32, s32] = collisionTrigF32(bangle);
    const W = [[lx0, ly0], [lx1, ly0], [lx1, ly1], [lx0, ly1]]
      .map(([u, v]) => [px + u * c32 + v * s32, py - u * s32 + v * c32]);
    const wxs = W.map((p) => p[0]);
    const wys = W.map((p) => p[1]);
    const BL = rintHalfEven(Math.min(...wxs));
    const BT = rintHalfEven(Math.min(...wys));
    const BR = rintHalfEven(Math.max(...wxs)) - 1;
    const BB = rintHalfEven(Math.max(...wys)) - 1;
    const AL = rintHalfEven(ax + al);
    const AT = rintHalfEven(ay + at);
    const AR = rintHalfEven(ax + ar + 1) - 1;
    const AB = rintHalfEven(ay + ab + 1) - 1;
    if (AL > BR || BL > AR || AT > BB || BT > AB) return false;
    const R = [[ax + al, ay + at], [ax + ar + 1, ay + at], [ax + ar + 1, ay + ab + 1], [ax + al, ay + ab + 1]];
    for (const [nx, ny] of [[1, 0], [0, 1], [c32, -s32], [s32, c32]]) {
      let a0 = Infinity; let a1 = -Infinity; let b0 = Infinity; let b1 = -Infinity;
      for (const [x, y] of R) { const d = x * nx + y * ny; if (d < a0) a0 = d; if (d > a1) a1 = d; }
      for (const [x, y] of W) { const d = x * nx + y * ny; if (d < b0) b0 = d; if (d > b1) b1 = d; }
      if (Math.min(a1, b1) - Math.max(a0, b0) <= 0) return false;
    }
    if (maskA.axisRect) return true;
    const x0 = Math.floor(ax);
    const y0 = Math.floor(ay);
    for (let wy = Math.max(AT, BT); wy <= Math.min(AB, BB); wy++) {
      const row = maskA.px[wy - y0];
      if (!row) continue;
      for (let wx = Math.max(AL, BL); wx <= Math.min(AR, BR); wx++) if (row[wx - x0]) return true;
    }
    return false;
  }

  for (let j = at; j <= ab; j++) {
    const row = maskA.px[j];
    for (let i = al; i <= ar; i++) {
      if (!row[i]) continue;
      const cx = ax + i;
      const cy = ay + j;
      if (aabbHitsOBB(cx, cy, cx + 1, cy + 1, corners)) return true;
    }
  }
  return false;
}

export function masksOverlap(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle = 0) {

  if (!bsx || !bsy) return false;

  if (maskB.rotRect) {
    return maskHitsRotatedRect(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle);
  }
  if (maskA.axisRect) {

    const unrotated = ((bangle % 360) + 360) % 360 === 0;
    if (unrotated && maskA.axisRect !== 'always') {
      return masksOverlapPrecise(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle);
    }
    return masksOverlapRectA(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle);
  }
  return masksOverlapPrecise(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle);
}



function collisionTrig(bangle) {
  const a = ((bangle % 360) + 360) % 360;
  if (a % 90 === 0) {
    return [[1, 0], [0, 1], [-1, 0], [0, -1]][a / 90];
  }
  const r = (bangle * Math.PI) / 180;
  return [Math.cos(r), Math.sin(r)];
}


function collisionTrigF32(bangle) {
  const a = ((bangle % 360) + 360) % 360;
  if (a % 90 === 0) {
    return [[1, 0], [0, 1], [-1, 0], [0, -1]][a / 90];
  }
  const r = Math.fround(Math.fround(bangle) * Math.fround(Math.PI / 180));
  return [Math.fround(Math.cos(r)), Math.fround(Math.sin(r))];
}



const f32 = Math.fround;
const F32_PI = f32(Math.PI);
function cardinalF32Trig(bangle) {
  const r = f32(f32(f32(bangle) * F32_PI) / 180);
  return [f32(Math.cos(r)), f32(Math.sin(r))];
}
function cardinalF32Hit(maskB, dx, dy, cos, sin, bsx, bsy) {
  const fdx = f32(dx);
  const fdy = f32(dy);
  const u = f32(f32(fdx * cos) - f32(fdy * sin));
  const v = f32(f32(fdx * sin) + f32(fdy * cos));
  const sx = Math.floor(f32(f32(u / f32(bsx)) + maskB.originX));
  if (sx < 0 || sx >= maskB.w) return false;
  const sy = Math.floor(f32(f32(v / f32(bsy)) + maskB.originY));
  if (sy < 0 || sy >= maskB.h) return false;
  return !!maskB.px[sy][sx];
}

function masksOverlapRectA(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle = 0) {

  const [cos, sin] = collisionTrig(bangle);



  const [al, at, ar, ab] = maskA.bbox;
  const aox = maskA.originX ?? 0;
  const aoy = maskA.originY ?? 0;
  const aLeft = ax - aox + al;
  const aRight = ax - aox + ar;
  const aTop = ay - aoy + at;
  const aBottom = ay - aoy + ab;

  const [bl, bt, br, bb] = maskB.bbox;
  const x0 = (bl - maskB.originX) * bsx;
  const x1 = (br + 1 - maskB.originX) * bsx;
  const y0 = (bt - maskB.originY) * bsy;
  const y1 = (bb + 1 - maskB.originY) * bsy;
  let minx = Infinity;
  let maxx = -Infinity;
  let miny = Infinity;
  let maxy = -Infinity;
  for (const u of [x0, x1]) {
    for (const v of [y0, y1]) {
      const wx = u * cos + v * sin;
      const wy = -u * sin + v * cos;
      if (wx < minx) minx = wx;
      if (wx > maxx) maxx = wx;
      if (wy < miny) miny = wy;
      if (wy > maxy) maxy = wy;
    }
  }

  const left = rintHalfEven(bx + minx);
  const right = rintHalfEven(bx + maxx) - 1;
  const top = rintHalfEven(by + miny);
  const bottom = rintHalfEven(by + maxy) - 1;
  if (left > right || top > bottom) return false;

  const gL = Math.max(rintHalfEven(ax - aox + al), left);
  const gR = Math.min(rintHalfEven(ax - aox + ar + 1) - 1, right);
  const gT = Math.max(rintHalfEven(ay - aoy + at), top);
  const gB = Math.min(rintHalfEven(ay - aoy + ab + 1) - 1, bottom);
  if (gL > gR || gT > gB) return false;

  const normB = ((bangle % 360) + 360) % 360;
  const cardinal = normB % 90 === 0 && normB !== 0;
  const [fcos, fsin] = cardinal ? cardinalF32Trig(bangle) : [0, 0];


  for (let py = gT; py <= gB; py++) {
    const rowA = maskA.px[Math.floor(py - (ay - aoy))];
    if (!rowA) continue;
    for (let px = gL; px <= gR; px++) {
      if (!rowA[Math.floor(px - (ax - aox))]) continue;

      const dx = px - bx;
      const dy = py - by;
      if (cardinal) {
        if (cardinalF32Hit(maskB, dx, dy, fcos, fsin, bsx, bsy)) return true;
        continue;
      }
      const u = dx * cos - dy * sin;
      const v = dx * sin + dy * cos;
      const sx = Math.floor(u / bsx + maskB.originX);
      if (sx < 0 || sx >= maskB.w) continue;
      const sy = Math.floor(v / bsy + maskB.originY);
      if (sy < 0 || sy >= maskB.h) continue;
      if (maskB.px[sy][sx]) return true;
    }
  }

  return false;
}

function masksOverlapPrecise(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle = 0) {

  const normAngle = ((bangle % 360) + 360) % 360;
  const offAxis = normAngle % 90 !== 0;

  const cardinal = !offAxis && normAngle !== 0;

  const scaled = bsx !== 1 || bsy !== 1;
  const px = offAxis || cardinal || scaled ? bx : Math.round(bx);
  const py = offAxis || normAngle !== 0 || scaled ? by : Math.round(by);

  const [fcos, fsin] = cardinal ? cardinalF32Trig(bangle) : [0, 0];

  const qax = offAxis ? Math.ceil(ax) : Math.round(ax);
  const qay = offAxis ? Math.ceil(ay) : Math.round(ay);

  const invCol = normAngle === 0 ? Math.trunc : Math.floor;
  const invRow = invCol;
  const [al, at, ar, ab] = maskA.bbox;
  const [bl, bt, br, bb] = maskB.bbox;


  const [cos, sin] = collisionTrig(bangle);


  const lx0 = (bl - maskB.originX) * bsx;
  const lx1 = (br + 1 - maskB.originX) * bsx;
  const ly0 = (bt - maskB.originY) * bsy;
  const ly1 = (bb + 1 - maskB.originY) * bsy;
  let minx = Infinity;
  let maxx = -Infinity;
  let miny = Infinity;
  let maxy = -Infinity;
  for (const u of [lx0, lx1]) {
    for (const v of [ly0, ly1]) {
      const wx = u * cos + v * sin;
      const wy = -u * sin + v * cos;
      if (wx < minx) minx = wx;
      if (wx > maxx) maxx = wx;
      if (wy < miny) miny = wy;
      if (wy > maxy) maxy = wy;
    }
  }

  const left = rintHalfEven(px + minx);
  const right = rintHalfEven(px + maxx) - 1;
  const top = rintHalfEven(py + miny);
  const bottom = rintHalfEven(py + maxy) - 1;


  const aox = maskA.originX ?? 0;
  const aoy = maskA.originY ?? 0;

  const rawA = !maskA.axisRect && (offAxis || cardinal || scaled);
  const sax = rawA ? ax : qax;
  const say = rawA ? ay : qay;
  const ax0 = rawA ? rintHalfEven(ax + al - aox) : qax + al - aox;
  const ax1 = rawA ? rintHalfEven(ax + ar + 1 - aox) - 1 : qax + ar - aox;
  const ay0 = rawA ? rintHalfEven(ay + at - aoy) : qay + at - aoy;
  const ay1 = rawA ? rintHalfEven(ay + ab + 1 - aoy) - 1 : qay + ab - aoy;
  const wy0 = Math.max(ay0, top);
  const wy1 = Math.min(ay1, bottom);
  const wx0 = Math.max(ax0, left);
  const wx1 = Math.min(ax1, right);
  for (let wy = wy0; wy <= wy1; wy++) {
    const cy = invRow(wy - say + aoy);
    if (cy < 0 || cy >= maskA.h) continue;
    const rowA = maskA.px[cy];
    const dy = wy - py;

    for (let wx = wx0; wx <= wx1; wx++) {
      const cx = invCol(wx - sax + aox);
      if (cx < 0 || cx >= maskA.w || !rowA[cx]) continue;
      const dx = wx - px;

      if (cardinal) {

        if (cardinalF32Hit(maskB, dx, dy, fcos, fsin, bsx, bsy)) return true;
        continue;
      }
      const u = dx * cos - dy * sin;
      const v = dx * sin + dy * cos;

      const sx = invCol(u / bsx + maskB.originX);
      if (sx < 0 || sx >= maskB.w) continue;
      const sy = invRow(v / bsy + maskB.originY);
      if (sy < 0 || sy >= maskB.h) continue;

      if (maskB.px[sy][sx]) return true;
    }
  }
  return false;
}






export const QUICKSLASH_SHAPE = { bbox: [2, 26, 241, 28], ox: 125, oy: 27, w: 250, h: 48 };


export const QUICKSLASH_MASK = (() => {
  const [bx0, by0, bx1, by1] = QUICKSLASH_SHAPE.bbox;
  const px = [];
  for (let y = 0; y < QUICKSLASH_SHAPE.h; y++) {
    const row = [];
    for (let x = 0; x < QUICKSLASH_SHAPE.w; x++) {
      row.push(x >= bx0 && x <= bx1 && y >= by0 && y <= by1);
    }
    px.push(row);
  }
  return {
    name: 'rk_quickslash_rect',
    w: QUICKSLASH_SHAPE.w,
    h: QUICKSLASH_SHAPE.h,
    originX: QUICKSLASH_SHAPE.ox,
    originY: QUICKSLASH_SHAPE.oy,
    bbox: QUICKSLASH_SHAPE.bbox,
    px,
  };
})();

SPRITE_MASKS.spr_rk_quickslash = QUICKSLASH_MASK;


function localBBox(meta, sx, sy) {
  const [bl, bt, br, bb] = meta.bbox;
  return {
    x0: (bl - meta.ox) * sx,

    x1: (br + 1 - meta.ox) * sx,
    y0: (bt - meta.oy) * sy,
    y1: (bb + 1 - meta.oy) * sy,
  };
}


export function rotatedRectCorners(meta, x, y, sx, sy, angleDeg) {
  const r = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const b = localBBox(meta, sx, sy);
  const pts = [];
  for (const u of [b.x0, b.x1]) {
    for (const v of [b.y0, b.y1]) {

      pts.push({ x: x + u * cos + v * sin, y: y - u * sin + v * cos });
    }
  }

  return [pts[0], pts[1], pts[3], pts[2]];
}


function aabbHitsOBB(rx0, ry0, rx1, ry1, corners) {
  const axes = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: corners[1].x - corners[0].x, y: corners[1].y - corners[0].y },
    { x: corners[3].x - corners[0].x, y: corners[3].y - corners[0].y },
  ];
  const rect = [
    { x: rx0, y: ry0 },
    { x: rx1, y: ry0 },
    { x: rx1, y: ry1 },
    { x: rx0, y: ry1 },
  ];

  for (const a of axes) {
    const len = Math.hypot(a.x, a.y);
    if (len === 0) continue;
    const ax = a.x / len;
    const ay = a.y / len;

    let amin = Infinity;
    let amax = -Infinity;
    for (const p of rect) {
      const d = p.x * ax + p.y * ay;
      if (d < amin) amin = d;
      if (d > amax) amax = d;
    }
    let bmin = Infinity;
    let bmax = -Infinity;
    for (const p of corners) {
      const d = p.x * ax + p.y * ay;
      if (d < bmin) bmin = d;
      if (d > bmax) bmax = d;
    }
    if (amax < bmin || bmax < amin) return false;
  }
  return true;
}



export function scrPreciseHitRotatedRect(heart, e, meta, n = 3) {
  const half = n / 2;
  const hx = heart.x + 10;
  const hy = heart.y + 10;
  const corners = rotatedRectCorners(
    meta,
    e.x,
    e.y,
    e.image_xscale ?? 1,
    e.image_yscale ?? 1,
    e.image_angle ?? 0,
  );
  return aabbHitsOBB(hx - half, hy - half, hx + half, hy + half, corners);
}



export function scrPreciseHitQuickslash(heart, e, n = 3) {
  const half = n / 2;
  const x1 = heart.x + 10 - half;
  const y1 = heart.y + 10 - half;
  const span = n;
  const sx = e.image_xscale ?? 1;
  const sy = e.image_yscale ?? 1;
  const r = ((e.image_angle ?? 0) * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const { ox, oy } = QUICKSLASH_SHAPE;
  const [bl, bt, br, bb] = QUICKSLASH_SHAPE.bbox;
  for (let ky = 0; ky <= span; ky++) {
    const dy = y1 + 0.5 + ky - e.y;
    for (let kx = 0; kx <= span; kx++) {
      const dx = x1 + 0.5 + kx - e.x;
      const u = (dx * cos - dy * sin) / sx + ox;
      const v = (dx * sin + dy * cos) / sy + oy;
      if (u >= bl && u < br + 1 && v >= bt && v < bb + 1) return true;
    }
  }
  return false;
}



export function collisionLineRect(x1, y1, x2, y2, rx0, ry0, rx1, ry1) {

  if (x1 === x2 && x1 > rx1) return false;

  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 64));
  if (steps <= 0) {
    const px = Math.floor(x1);
    const py = Math.floor(y1);
    return px >= rx0 && px <= rx1 && py >= ry0 && py <= ry1;
  }
  for (let i = 0; i <= steps; i++) {
    const px = Math.floor(x1 + ((x2 - x1) * i) / steps);
    const py = Math.floor(y1 + ((y2 - y1) * i) / steps);
    if (px >= rx0 && px <= rx1 && py >= ry0 && py <= ry1) return true;
  }
  return false;
}


export function heartBBox(heart) {

  const [l, t, r, b] = (heart.mask ?? HEART_MASK).bbox;

  return [heart.x + l, heart.y + t, heart.x + r, heart.y + b];
}




export const GRAZE_MASK = build({
  name: 'spr_grazemask',
  w: 50,
  h: 50,
  originX: 25,
  originY: 25,
  bbox: [0, 0, 49, 49],
  rows: Array.from({ length: 50 }, () => '1'.repeat(50)),
})

GRAZE_MASK.axisRect = 'always';



const grazeScaled = new Map();
export function grazeMaskAt(factor) {
  if (!(factor > 1)) return GRAZE_MASK;
  const key = factor.toFixed(4);
  const hit = grazeScaled.get(key);
  if (hit) return hit;
  const side = Math.round(50 * factor);
  const half = side / 2;
  const m = build({
    name: 'spr_grazemask',
    w: side,
    h: side,
    originX: half,
    originY: half,
    bbox: [0, 0, side - 1, side - 1],
    rows: Array.from({ length: side }, () => '1'.repeat(side)),
  });
  m.axisRect = 'always';
  grazeScaled.set(key, m);
  return m;
}
