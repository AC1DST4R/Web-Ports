


import { createInput } from './state.js';
import {
  DEFAULT_BINDINGS, SIM_ACTIONS, DRIVER_ACTIONS, bindingIndex, isReserved,
} from './bindings.js';
import { NO_METHOD } from './method.js';

const SIM = new Set(SIM_ACTIONS);



export function bindKeyboard(target = window, { profile = null, method = NO_METHOD } = {}) {
  let index = bindingIndex(profile ?? DEFAULT_BINDINGS.keyboard);
  const held = new Set();
  const pressedSinceRead = new Set();

  const driverPressed = new Set();

  let capture = null;

  const onDown = (ev) => {

    if (capture) {
      ev.preventDefault();
      if (ev.repeat) return;
      method.note('keyboard');
      const cb = capture;
      capture = null;

      cb.onCode(isReserved('keyboard', ev.code) ? null : ev.code);
      return;
    }
    const actions = index.get(ev.code);
    if (!actions) return;
    ev.preventDefault();
    method.note('keyboard');
    for (const a of actions) {
      if (SIM.has(a)) {
        held.add(a);
        pressedSinceRead.add(a);
      } else if (!ev.repeat) {
        driverPressed.add(a);
      }
    }
  };
  const onUp = (ev) => {
    const actions = index.get(ev.code);
    if (!actions) return;
    ev.preventDefault();
    for (const a of actions) if (SIM.has(a)) held.delete(a);
  };
  const onBlur = () => {
    held.clear();
  };

  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('blur', onBlur);

  return {

    read() {
      const over = {};
      for (const a of held) over[a] = true;
      for (const a of pressedSinceRead) over[a] = true;
      pressedSinceRead.clear();
      return createInput(over);
    },



    driverEdges() {
      const edges = {};
      for (const a of DRIVER_ACTIONS) edges[a] = driverPressed.has(a);
      driverPressed.clear();
      return edges;
    },


    setProfile(next) {
      index = bindingIndex(next ?? DEFAULT_BINDINGS.keyboard);
      held.clear();
      pressedSinceRead.clear();
      driverPressed.clear();
    },



    captureNext(onCode) {
      if (capture) capture.onCode(null);
      capture = { onCode };
      const mine = capture;
      return () => { if (capture === mine) { capture = null; mine.onCode(null); } };
    },


    capturing() { return capture !== null; },

    dispose() {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', onBlur);
    },
  };
}
