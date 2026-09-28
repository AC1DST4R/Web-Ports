


import { METHODS } from './bindings.js';



export function createInputMethod({ initial = 'keyboard', onChange = null, now = null } = {}) {
  const clock = now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  let active = METHODS.includes(initial) ? initial : 'keyboard';
  let since = clock();
  let changes = 0;


  const seen = { keyboard: false, gamepad: false, touch: false };

  return {

    get active() { return active; },

    get since() { return since; },


    get changes() { return changes; },

    hasUsed(method) { return !!seen[method]; },



    note(method) {
      if (!METHODS.includes(method)) return false;
      seen[method] = true;
      if (method === active) return false;
      const prev = active;
      active = method;
      since = clock();
      changes += 1;
      onChange?.(active, prev);
      return true;
    },


    snapshot() {
      return { active, since, changes, seen: { ...seen } };
    },
  };
}



export const NO_METHOD = Object.freeze({
  active: 'keyboard',
  since: 0,
  changes: 0,
  hasUsed: () => false,
  note: () => false,
  snapshot: () => ({ active: 'keyboard', since: 0, changes: 0, seen: {} }),
});
