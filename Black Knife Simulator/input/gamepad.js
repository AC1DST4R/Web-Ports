


import { createInput } from './state.js';
import {
  DEFAULT_BINDINGS, SIM_ACTIONS, DRIVER_ACTIONS, bindingIndex,
} from './bindings.js';
import { NO_METHOD } from './method.js';

const DEADZONE = 0.5;
const SIM = new Set(SIM_ACTIONS);

function livePads() {
  const list = (typeof navigator !== 'undefined' && navigator.getGamepads)
    ? navigator.getGamepads()
    : [];
  const out = [];
  for (const p of list) if (p && p.connected) out.push(p);
  return out;
}


function codeActive(pad, code) {
  if (code.charCodeAt(0) === 98  ) {
    return !!pad.buttons?.[Number(code.slice(1))]?.pressed;
  }
  const dir = code[code.length - 1];
  const v = pad.axes?.[Number(code.slice(1, -1))] ?? 0;
  return dir === '+' ? v > DEADZONE : v < -DEADZONE;
}



function activeCodes(pad) {
  const out = [];
  const nb = pad.buttons?.length ?? 0;
  for (let i = 0; i < nb && i < 32; i++) if (pad.buttons[i]?.pressed) out.push(`b${i}`);
  const na = pad.axes?.length ?? 0;
  for (let i = 0; i < na && i < 16; i++) {
    const v = pad.axes[i] ?? 0;
    if (v > DEADZONE) out.push(`a${i}+`);
    else if (v < -DEADZONE) out.push(`a${i}-`);
  }
  return out;
}



export function bindGamepad({ profile = null, method = NO_METHOD } = {}) {
  let index = bindingIndex(profile ?? DEFAULT_BINDINGS.gamepad);

  const driverWas = {};
  for (const a of DRIVER_ACTIONS) driverWas[a] = false;

  let capture = null;

  let wasActive = new Set();



  function pollCapture() {
    if (!capture) return false;
    for (const p of livePads()) {
      for (const code of activeCodes(p)) {
        if (capture.baseline.has(code)) continue;
        const cb = capture.onCode;
        capture = null;
        method.note('gamepad');
        cb(code);
        return true;
      }
    }
    return false;
  }

  return {

    read() {

      if (capture) { pollCapture(); return createInput(); }
      const over = {};
      const nowActive = new Set();
      for (const p of livePads()) {
        for (const [code, actions] of index) {
          if (!codeActive(p, code)) continue;
          nowActive.add(code);
          for (const a of actions) if (SIM.has(a)) over[a] = true;
        }
      }
      for (const code of nowActive) {
        if (!wasActive.has(code)) { method.note('gamepad'); break; }
      }
      wasActive = nowActive;
      return createInput(over);
    },



    driverEdges() {
      const now = {};
      for (const a of DRIVER_ACTIONS) now[a] = false;
      if (!capture) {
        for (const p of livePads()) {
          for (const [code, actions] of index) {
            if (!codeActive(p, code)) continue;
            for (const a of actions) if (!SIM.has(a)) now[a] = true;
          }
        }
      }
      const edges = {};
      for (const a of DRIVER_ACTIONS) {
        edges[a] = now[a] && !driverWas[a];
        driverWas[a] = now[a];
      }
      return edges;
    },


    setProfile(next) {
      index = bindingIndex(next ?? DEFAULT_BINDINGS.gamepad);
      for (const a of DRIVER_ACTIONS) driverWas[a] = false;
      wasActive = new Set();
    },



    captureNext(onCode) {
      if (capture) capture.onCode(null);
      const baseline = new Set();
      for (const p of livePads()) for (const c of activeCodes(p)) baseline.add(c);
      capture = { onCode, baseline };
      const mine = capture;
      return () => { if (capture === mine) { capture = null; mine.onCode(null); } };
    },

    pollCapture,
    capturing() { return capture !== null; },

    connected() {
      return livePads().length > 0;
    },

    dispose() {},
  };
}
