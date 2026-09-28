

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function clamp01(v) {
  return clamp(v, 0, 1);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function sign(v) {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

export function scrMovetowards(from, to, step) {
  if (from === to) return from;
  if (from > to) return Math.max(from - step, to);
  return Math.min(from + step, to);
}

export function scrApproach(from, to, step) {
  if (from < to) {
    from += step;
    if (from > to) return to;
  } else {
    from -= step;
    if (from < to) return to;
  }
  return from;
}

export function inverselerp(a, b, v) {
  if (b === a) return 0;
  return (v - a) / (b - a);
}

export const GML_EPSILON = 1e-5;

export function gmlEq(a, b) {
  return Math.abs(a - b) < GML_EPSILON;
}

export function gmlLt(a, b) {
  return a < b - GML_EPSILON;
}

export function gmlLte(a, b) {
  return a <= b + GML_EPSILON;
}

export function gmlMedian(...values) {
  const v = [...values].sort((a, b) => a - b);
  return v[Math.floor((v.length - 1) / 2)];
}

export function scrEaseIn(t, curve) {
  if (curve < -3 || curve > 7) return t;
  switch (curve) {
    case 0:
      return t;
    case 1:
      return -Math.cos(t * 1.5707963267948966) + 1;
    case 6:
      return Math.pow(2, 10 * (t - 1));
    case 7:
      return -(Math.sqrt(1 - t * t) - 1);
    case -1: {
      const s = 1.70158;
      return t * t * ((s + 1) * t - s);
    }
    default:
      return Math.pow(t, curve);
  }
}

export function scrEaseOut(t, curve) {
  if (curve < -3 || curve > 7) return t;
  switch (curve) {

    case -3:

      if (t < 0.36363636363636365) return 7.5625 * t * t;
      if (t < 0.7272727272727273) {
        const u = t - 0.5454545454545454;
        return 7.5625 * u * u + 0.75;
      }
      if (t < 0.9090909090909091) {
        const u = t - 0.8181818181818182;
        return 7.5625 * u * u + 0.9375;
      }
      {
        const u = t - 0.9545454545454546;
        return 7.5625 * u * u + 0.984375;
      }
    case -2: {

      if (t === 0) return 0;
      if (t === 1) return 1;
      const p = 0.3;
      const s = p / 4;
      return Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / p) + 1;
    }
    case -1: {

      const s = 1.70158;
      const u = t - 1;
      return u * u * ((s + 1) * u + s) + 1;
    }
    case 0:
      return t;
    case 1:
      return Math.sin(t * 1.5707963267948966);
    case 2:
      return -t * (t - 2);
    case 6:
      return -Math.pow(2, -10 * t) + 1;
    case 7: {
      const u = t - 1;
      return Math.sqrt(1 - u * u);
    }
    default: {
      const u = t - 1;
      if (curve === 4) return -1 * (Math.pow(u, curve) - 1);
      return Math.pow(u, curve) + 1;
    }
  }
}

export function scrEaseInout(t, curve) {
  if (curve < -3 || curve > 7) return t;
  if (curve === -1) {

    const s = 1.70158 * 1.525;
    let u = t * 2;
    if (u < 1) return 0.5 * (u * u * ((s + 1) * u - s));
    u -= 2;
    return 0.5 * (u * u * ((s + 1) * u + s) + 2);
  }
  if (curve === -3 || curve === -2) {
    throw new Error(`scr_ease_inout curve ${curve} not translated`);
  }
  if (curve === 1) return -0.5 * Math.cos(Math.PI * t - 1);
  if (curve === 0) return t;

  let u = t * 2;
  if (u < 1) return 0.5 * scrEaseIn(u, curve);
  u -= 1;
  return 0.5 * (scrEaseOut(u, curve) + 1);
}

const PI32 = Math.fround(Math.PI);

function cardinal(dir) {
  const a = ((dir % 360) + 360) % 360;
  return a % 90 === 0 ? a : -1;
}
const COS_CARDINAL = [1, 0, -1, 0];
const SIN_CARDINAL = [0, 1, 0, -1];
function runnerCos(dir) {
  const a = cardinal(dir);
  if (a >= 0) return COS_CARDINAL[a / 90];
  return Math.cos(Math.fround(Math.fround(Math.fround(dir) * PI32) / 180));
}
function runnerSin(dir) {
  const a = cardinal(dir);
  if (a >= 0) return SIN_CARDINAL[a / 90];
  return Math.sin(Math.fround(Math.fround(Math.fround(dir) * PI32) / 180));
}

function ldSnap(r) {
  return Math.abs(r) < 1e-4 ? 0 : r;
}
export function lengthdirX(len, dir) {
  return ldSnap(Math.fround(Math.fround(len) * Math.fround(runnerCos(dir))));
}

export function lengthdirY(len, dir) {
  return ldSnap(-Math.fround(Math.fround(len) * Math.fround(runnerSin(dir))));
}

export function gmlRound(x) {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

const PI32_PD = Math.fround(Math.PI);
export function pointDirection(x1, y1, x2, y2) {
  const f = Math.fround;
  const dx = f(f(x2) - f(x1));
  const dy = f(f(y2) - f(y1));
  const a = f(Math.atan2(f(-dy), dx));
  let d = f(f(a * 180) / PI32_PD);
  const n = Math.round(d);
  if (Math.abs(d - n) < 1e-4) d = n;
  return d < 0 ? f(d + 360) : d;
}

export function pointDistance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function angleDifference(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export const WHITE = [255, 255, 255];
export const BLACK = [0, 0, 0];
export const RED = [255, 0, 0];
export const GRAY = [128, 128, 128];

export function mergeColor(a, b, t) {
  const f = Math.fround;
  const k = f(t < 0 ? 0 : t > 1 ? 1 : t);
  const inv = f(1 - k);
  const ch = (c1, c2) => gmlRound(f(f(c1 * inv) + f(c2 * k)));
  return [ch(a[0], b[0]), ch(a[1], b[1]), ch(a[2], b[2])];
}

export function makeColorHsv(h, s, v) {
  const hh = ((h / 255) * 6) % 6;
  const ss = s / 255;
  const vv = v / 255;
  const i = Math.floor(hh);
  const f = hh - i;
  const p = vv * (1 - ss);
  const q = vv * (1 - ss * f);
  const t = vv * (1 - ss * (1 - f));
  const map = [[vv, t, p], [q, vv, p], [p, vv, t], [p, q, vv], [t, p, vv], [vv, p, q]];
  const c = map[i % 6];
  return [Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)];
}

export function scrAnglechange(current, target, limit) {
  const d = angleDifference(target, current);
  return d < -limit ? -limit : d > limit ? limit : d;
}
