


import { createState, stepFrame } from '../sim/index.js';
import { drain, MS_PER_FRAME } from '../sim/clock.js';
import { buildPracticeScene } from '../sim/scenes/practice.js';
import { decodeReplay, markReplay } from '../sim/replay.js';
import { normaliseDials } from '../sim/dials.js';
import { createTitle, stepTitle, MODES, CREDITS, creditLink,

  ENDLESS_STAGES, endlessPhase,
} from '../sim/modes.js';
import { encodeConfig, decodeConfig, NONE } from '../sim/share.js';
import { WEAPONS, ARMOR, canEquip } from '../sim/equipment.js';
import { ITEMS } from '../sim/items.js';
import { drawTitle, drawGameOver, stepGameOver, makeGameOver } from '../render/title.js';
import { loadFont, drawText } from '../render/font.js';
import { drawBackground } from '../render/background.js';
import { buildSingleAttackScene, ATTACK_MENU, menuEntry } from '../sim/scenes/single.js';
import { bindKeyboard } from '../input/keyboard.js';
import { bindTouch } from '../input/touch.js';
import { bindGamepad } from '../input/gamepad.js';
import { createRenderer } from '../render/canvas.js';
import { createIntroScene, stepIntroScene } from '../sim/intro.js';
import { drawIntroScene } from '../render/draw/intro-fx.js';
import { createVictoryScene, stepVictoryScene } from '../sim/victory-scene.js';
import { drawVictoryScene } from '../render/draw/victory-scene.js';
import { createTvTurnoff, stepTvTurnoff } from '../sim/tvturnoff.js';
import { drawTvTurnoff } from '../render/draw/tvturnoff.js';
import { KNIGHT, PARTY as PARTY_ACTORS } from '../sim/actors.js';
import { damageKnight } from '../sim/knight.js';
import { spawnDmgNumber } from '../sim/dmgnumbers.js';
import { createAudio } from '../render/audio.js';
import { deltaruneMultiplier } from '../render/windowsize.js';
import { drainCues } from '../sim/audio.js';
import { resetTensionBar } from '../render/tensionbar.js';

const canvas = document.getElementById('game');
const renderer = await createRenderer(canvas);
const ctx = renderer.ctx;



let scalingMode = 'fit';

function fitCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const availW = window.innerWidth * dpr;
  const availH = window.innerHeight * dpr;
  const fit = Math.min(availW / renderer.VIEW_W, availH / renderer.VIEW_H);
  let scale = fit;
  if (scalingMode === 'pixel' && fit >= 1) {

    const m = deltaruneMultiplier(
      window.screen?.width ?? window.innerWidth,
      window.screen?.height ?? window.innerHeight,
      renderer.VIEW_W,
      renderer.VIEW_H,
    );
    scale = Math.min(m * dpr, Math.floor(fit));
  }
  canvas.style.width = `${(renderer.VIEW_W * scale) / dpr}px`;
  canvas.style.height = `${(renderer.VIEW_H * scale) / dpr}px`;
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

if (window.matchMedia) {
  const watchDpr = () => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener('change', () => { fitCanvas(); watchDpr(); }, { once: true });
  };
  watchDpr();
}
const audio = createAudio();
const keyboard = bindKeyboard(window);
const gamepad = bindGamepad();

let syncOpenedLink = null;
const touch = bindTouch({
  pad: document.getElementById('dpad'),
  buttons: [
    { el: document.getElementById('btnZ'), actions: ['confirm'] },
    { el: document.getElementById('btnX'), actions: ['focus', 'cancel'] },
    { el: document.getElementById('btnR'), actions: ['reset'] },
  ],
  onReset: () => reset(),
  onExit: () => exitRun(),

  onAction: (a) => {
    if (a !== 'confirm' || title.mode !== null) return;
    const s = title.settings;
    if (!s || s.page !== 'credits') return;
    const href = creditLink(CREDITS[s.cursor] ?? {});
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
    syncOpenedLink = href;
  },
});

const keys = {
  read() {
    const k = keyboard.read();
    const g = gamepad.read();
    const t = touch.read();
    for (const a of Object.keys(g)) if (g[a]) k[a] = true;
    for (const a of Object.keys(t)) if (t[a]) k[a] = true;
    return k;
  },
};

const params = new URLSearchParams(location.search);


let mode = params.get('mode') === 'practice' ? 'practice' : 'fight';
let attackId = params.get('attack') ?? ATTACK_MENU[0].id;
let difficulty = Number(params.get('difficulty') ?? 0);


let practiceOpts = null;
function practiceOptsFor(m) {
  return m === 'practice' ? { target: 1, reset: 'attack' } : null;
}

function build(st) {

  st.noBulletCooldown = title.noBulletCooldown === true;
  if (mode === 'practice') {

    buildSingleAttackScene(st, {
      seed: st.seed, attack: attackId, difficulty, holdBreath: title.holdBreath,

      dials: title.dials,
    });
  } else {
    buildPracticeScene(st, { seed: st.seed, practice: practiceOpts, dials: title.dials });
  }
}


const replayToken = params.get('replay');
let replay = null;
if (replayToken) {
  try {
    replay = decodeReplay(replayToken);
    mode = replay.meta.mode;
    attackId = replay.meta.attack || attackId;
    difficulty = replay.meta.difficulty;
  } catch (err) {
    void 0;
  }
}


const title = createTitle();

title.replaying = !!replay;


const SETTINGS_KEY = 'knightsim.settings';
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
  if (saved?.gear?.length === 3) {
    title.gear = saved.gear.map((g) => ({ weapon: g.weapon | 0, armor: (g.armor ?? []).map((a) => a | 0) }));
  }
  if (Array.isArray(saved?.bag)) {

    const bag = saved.bag.map((v) => v | 0).slice(0, 12);
    while (bag.length < 12) bag.push(0);
    title.bag = bag;
  }

  if (saved?.volumes && (saved.v | 0) >= 1) {
    title.volumes.music = Math.max(0, Math.min(100, saved.volumes.music | 0));
    title.volumes.sfx = Math.max(0, Math.min(100, saved.volumes.sfx | 0));
  }
  if (typeof saved?.shake === 'boolean') title.shake = saved.shake;
  if (saved?.scaling === 'fit' || saved?.scaling === 'pixel') title.scaling = saved.scaling;

  if (typeof saved?.swapZX === 'boolean') title.swapZX = saved.swapZX;

  if (typeof saved?.holdBreath === 'boolean') title.holdBreath = saved.holdBreath;

  {
    const st = saved?.endlessStage | 0;
    if (st >= 0 && st < ENDLESS_STAGES.length) title.stageIndex = st;
  }

  if (typeof saved?.noBulletCooldown === 'boolean') title.noBulletCooldown = saved.noBulletCooldown;

  if (saved?.dials && typeof saved.dials === 'object') {
    title.dials = normaliseDials(saved.dials);
  }

  if (saved?.bindings && typeof saved.bindings === 'object') title.bindingsSaved = saved.bindings;
} catch {   }


const sharedCfg = decodeConfig(params.get('cfg'), {
  weaponOk: (id, c) => id === 0 || (!!WEAPONS[id] && canEquip('weapon', id, c)),
  armorOk: (id, c) => id === 0 || (!!ARMOR[id] && canEquip('armor', id, c)),
  itemOk: (id) => !!ITEMS[id],
  modeCount: MODES.length,
  attackCount: ATTACK_MENU.length,
});
if (sharedCfg) {
  if (sharedCfg.gear) title.gear = sharedCfg.gear;
  if (sharedCfg.bag) title.bag = sharedCfg.bag;
  if (sharedCfg.attack !== null) {
    title.attackIndex = sharedCfg.attack;
    attackId = ATTACK_MENU[sharedCfg.attack].id;
  }
  if (sharedCfg.difficulty !== null) {
    const entry = ATTACK_MENU[title.attackIndex];

    const di = Math.min(sharedCfg.difficulty, entry.difficulties.length - 1);
    title.difficultyIndex = Math.max(0, di);
    difficulty = entry.difficulties[title.difficultyIndex] ?? 0;
  }

  if (sharedCfg.mode !== null) {
    title.mode = MODES[sharedCfg.mode].id;
    mode = title.mode === 'single' ? 'practice' : 'fight';

    practiceOpts = practiceOptsFor(title.mode);
  }
}

let state = createState({
  seed: replay ? replay.meta.seed : Number(params.get('seed') ?? 12345),
  traceBulletSlots: 0,

  bag: title.bag,
});

if (replay) markReplay(state);
state.spriteFrames = renderer.spriteFrames;
state.spriteRate = renderer.spriteRate;
build(state);


const skip = Number(params.get('frames') ?? (replay ? replay.frames : 0));
if (skip > 0) {
  const idle = keys.read();

  for (let i = 0; i < skip; i++) {
    stepFrame(state, replay ? replay.inputAt(i) : idle);
  }
}


let acc = 0;
let last = performance.now();


const bar = document.getElementById('picker');




let inputMask = {};
function gatedKeys() {
  const raw = keys.read();
  const out = { ...raw };
  for (const k of Object.keys(inputMask)) {
    if (!raw[k]) delete inputMask[k];
    else out[k] = false;
  }
  return out;
}

function maskHeldInput() {
  inputMask = {};
  const raw = keys.read();
  for (const k of Object.keys(raw)) if (raw[k]) inputMask[k] = true;
}

function reset() {

  audio.stopAll();

  maskHeldInput();

  resetTensionBar();

  const vistaFs = state?.vistaFsBase ?? 0;
  state = createState({
    seed: (Math.floor(performance.now()) % 100000) + 1,
    traceBulletSlots: 0,

    bag: title.bag,
  });
  state.runMode = runMode;

  state.endlessStage = runMode === 'endless' ? endlessPhase(title.stageIndex) : 0;
  state.vistaFsBase = vistaFs;

  state.loadout.gear = title.gear.map((g) => ({ weapon: g.weapon, armor: [...g.armor] }));

  state.flag12 = title.shake ? 0 : 1;
  state.spriteFrames = renderer.spriteFrames;
state.spriteRate = renderer.spriteRate;
  build(state);
  acc = 0;
}



function exitRun() {
  if (title.mode === null) return;
  over = null;
  introSeq = null;
  cutsceneSeq = null;
  tvOff = null;
  title.mode = null;
  title.pickingAttack = false;
  title.pickingDifficulty = false;

  title.pickingStage = false;
  reset();
}


window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyR') reset();
  if (e.code === 'Escape') exitRun();
});


function applySettings() {
  audio.setVolumes(title.volumes.music / 100, title.volumes.sfx / 100);

  state.flag12 = title.shake ? 0 : 1;
  if (scalingMode !== title.scaling) {
    scalingMode = title.scaling;
    fitCanvas();
  }

  document.getElementById('touch')?.classList.toggle('swap', title.swapZX);
}

function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      v: 1,
      gear: title.gear, bag: title.bag, volumes: title.volumes,
      shake: title.shake, scaling: title.scaling, swapZX: title.swapZX,

      holdBreath: title.holdBreath,

      endlessStage: title.stageIndex,

      noBulletCooldown: title.noBulletCooldown,

      dials: title.dials,
      bindings: title.bindings?.custom ?? undefined,
    }));
  } catch {   }
  applySettings();
}


if (sharedCfg) applySettings(); else persistSettings();
if (replay || params.get('mode')) title.mode = mode === 'practice' ? 'single' : 'normal';



function shareUrl() {
  const modeIndex = title.mode ? MODES.findIndex((m) => m.id === title.mode) : NONE;
  const cfg = encodeConfig({
    mode: modeIndex < 0 ? NONE : modeIndex,
    attack: title.attackIndex,
    difficulty: title.difficultyIndex,
    gear: title.gear,
    bag: title.bag,
  });
  const url = new URL(location.href);

  url.search = '';
  url.searchParams.set('cfg', cfg);
  return url.toString();
}



function shareSetup() {
  const url = shareUrl();
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {   }
    ta.remove();
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).catch(fallback);
  } else {
    fallback();
  }
}

function cueLoopNow(name) {
  audio.play([{ name, pitch: 1, gain: 1, loop: true }]);
}

let over = null;

let tvOff = null;

let cutsceneSeq = null;



let hitlessDeaths = 0;


let introSeq = null;

function startRun() {
  runMode = title.mode;

  if (runMode === 'normal' || runMode === 'hitless') {
    introSeq = createIntroScene();

    maskHeldInput();
  }

  state.runMode = runMode;

  state.endlessStage = runMode === 'endless' ? endlessPhase(title.stageIndex) : 0;
  mode = runMode === 'single' ? 'practice' : 'fight';

  practiceOpts = practiceOptsFor(runMode);
  if (runMode === 'single') {
    const entry = ATTACK_MENU[title.attackIndex];
    attackId = entry.id;

    difficulty = entry.difficulties[title.difficultyIndex] ?? entry.difficulties[0] ?? 0;
  }
  reset();
}

let runMode = title.mode ?? 'normal';

function frame(now) {
  lastFrameRun = now;
  const elapsed = now - last;
  last = now;


  {
    const pe = gamepad.driverEdges();
    if (pe.reset) reset();
    if (pe.exit) exitRun();
  }



  if (!title.mode) {
    const { steps: ts, accumulator: ta } = drain(acc, elapsed);
    acc = ta;
    for (let i = 0; i < ts; i++) {
      const r = stepTitle(title, gatedKeys(), ATTACK_MENU);
      if (r.moved) audio.play([{ name: 'snd_menumove', pitch: 1, gain: 1 }]);
      if (r.selected) audio.play([{ name: 'snd_select', pitch: 1, gain: 1 }]);

      if (r.error) audio.play([{ name: 'snd_error', pitch: 1, gain: 1 }]);

      if (r.link) {

        if (r.link === syncOpenedLink) syncOpenedLink = null;
        else window.open(r.link, '_blank', 'noopener,noreferrer');
      }

      if (r.share) shareSetup();

      if (r.rebind) title.bindings?.beginCapture?.(r.rebind);
      if (title.dirty) {
        title.dirty = false;
        persistSettings();
      }
      if (r.chosen) { startRun(); break; }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, renderer.VIEW_W, renderer.VIEW_H);
    drawBackground(ctx, state, renderer.sprites);
    drawTitle(ctx, title, renderer.sprites, ATTACK_MENU);
    scheduleFrame();
    return;
  }


  if (introSeq && !introSeq.done) {
    const { steps: is, accumulator: ia } = drain(acc, elapsed);
    acc = ia;
    for (let i = 0; i < is; i++) {
      const input = gatedKeys();
      if (input.confirm || input.cancel) {
        introSeq.done = true;

        maskHeldInput();
        break;
      }
      const cues = [];
      stepIntroScene(introSeq, cues);
      if (cues.length) audio.play(cues);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, renderer.VIEW_W, renderer.VIEW_H);

    drawBackground(ctx, state, renderer.sprites);
    drawIntroScene(ctx, introSeq, renderer.sprites);
    if (introSeq.done) {

      state.vistaFsBase = introSeq.bg.fountain_speed;
      introSeq = null;
      maskHeldInput();
    }
    scheduleFrame();
    return;
  }


  if (cutsceneSeq) {
    const { steps: cs, accumulator: ca } = drain(acc, elapsed);
    acc = ca;
    for (let i = 0; i < cs; i++) {
      const input = gatedKeys();
      if (input.cancel) {
        cutsceneSeq.done = true;
      }
      const cues = [];
      stepVictoryScene(cutsceneSeq, input, cues);

      for (const c of cues) {
        if (!c.music) continue;
        if (c.music === 'wind') {
          audio.play([{ name: 'wind_highplace', pitch: 0.5, gain: 1, loop: true }]);
        } else if (c.music === 'stop') {
          audio.stopLoop('wind_highplace');
        }
      }
      const sound = cues.filter((c) => !c.music);
      if (sound.length) audio.play(sound);
      if (cutsceneSeq.done) break;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, renderer.VIEW_W, renderer.VIEW_H);
    drawBackground(ctx, state, renderer.sprites);
    if (!cutsceneSeq.done) {
      drawVictoryScene(ctx, cutsceneSeq, renderer.sprites);

      const white = Math.max(0, 1 - cutsceneSeq.t / 20);
      if (white > 0) {
        ctx.globalAlpha = white;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, renderer.VIEW_W, renderer.VIEW_H);
        ctx.globalAlpha = 1;
      }
    } else {

      cutsceneSeq = null;
      maskHeldInput();
      tvOff = createTvTurnoff();
    }
    scheduleFrame();
    return;
  }


  if (tvOff) {
    const { steps: ts2, accumulator: ta2 } = drain(acc, elapsed);
    acc = ta2;
    for (let i = 0; i < ts2; i++) {
      const cues = [];
      stepTvTurnoff(tvOff, cues);
      for (const c of cues) {
        if (c.stop) audio.stopLoop(c.name);
        else audio.play([c]);
      }
      if (tvOff.done) break;
    }
    drawTvTurnoff(ctx, tvOff, renderer.sprites);

    if (tvOff.done) exitRun();
    scheduleFrame();
    return;
  }


  if (over) {
    const { steps: gs, accumulator: ga } = drain(acc, elapsed);
    acc = ga;
    for (let i = 0; i < gs; i++) {
      const r = stepGameOver(over, gatedKeys());
      if (r.moved) audio.play([{ name: 'snd_menumove', pitch: 1, gain: 1 }]);

      if (r.chosen !== undefined) {
        audio.play([{ name: 'snd_select', pitch: 1, gain: 1 }]);
        audio.stopLoop('audio_drone');
        over = null;
        if (r.chosen === 0) {

          reset();
        } else {

          exitRun();
        }
        break;
      }
    }
    renderer.draw(state);
    if (over) drawGameOver(ctx, over, renderer.sprites);
    scheduleFrame();
    return;
  }

  {
    const { steps, accumulator } = drain(acc, elapsed);
    acc = accumulator;
    for (let i = 0; i < steps; i++) {
      const input = gatedKeys();

      const hpBefore = state.partyHp[0] + state.partyHp[1] + state.partyHp[2];
      const caughtBefore = state.soul?.alive && state.soul.image_alpha === 0;
      stepFrame(state, input);
      audio.play(drainCues(state));


      if (!tvOff && !cutsceneSeq && (state.endFade ?? 0) >= 1) {
        maskHeldInput();
        cutsceneSeq = createVictoryScene();
      }


      const hpNow = state.partyHp[0] + state.partyHp[1] + state.partyHp[2];
      const caughtNow = state.soul?.alive && state.soul.image_alpha === 0;
      if (runMode === 'hitless' && (hpNow < hpBefore || (caughtNow && !caughtBefore))) {
        hitlessDeaths += 1;
        reset();
        break;
      }


      if (state.gameOver) {
        if (runMode === 'endless' || runMode === 'hitless' || runMode === 'practice') {
          reset();
        } else {

          audio.stopAll();
          audio.play([{ name: 'snd_hurt1', pitch: 1, gain: 1 }]);
          renderer.draw(state);
          const shot = document.createElement('canvas');
          shot.width = renderer.VIEW_W;
          shot.height = renderer.VIEW_H;
          shot.getContext('2d').drawImage(canvas, 0, 0);

          maskHeldInput();

          audio.stopLoop('mus_knight');
          audio.play([{ name: 'audio_drone', pitch: 1, gain: 1, loop: true }]);
          over = makeGameOver(
            shot,
            (state.soul?.x ?? renderer.VIEW_W / 2) + 2 - (state.view?.x ?? 0),
            (state.soul?.y ?? 170) + 2 - (state.view?.y ?? 0),
          );
        }
        break;
      }
    }
  }

  renderer.draw(state);


  scheduleFrame();
}


let lastFrameRun = performance.now();


let rafId = 0;
function scheduleFrame() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(frame);
}
scheduleFrame();

let rafTick = performance.now();
let probeId = 0;
const rafProbe = () => { rafTick = performance.now(); probeId = requestAnimationFrame(rafProbe); };
function scheduleProbe() {
  if (probeId) cancelAnimationFrame(probeId);
  probeId = requestAnimationFrame(rafProbe);
}
scheduleProbe();
let fallback = null;
function disarmFallback() {
  if (fallback) {
    clearInterval(fallback);
    fallback = null;
  }
}
setInterval(() => {
  const stale = performance.now() - rafTick > 500;
  const visible = document.visibilityState === 'visible';
  if (stale && visible && !fallback) {
    fallback = setInterval(() => frame(performance.now()), 33);
  } else if (!stale) {
    disarmFallback();
  }
}, 250);


document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    rafTick = performance.now();
    scheduleProbe();
    scheduleFrame();
  }
  disarmFallback();
});


if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {

  navigator.serviceWorker.register(new URL('./sw.js', import.meta.url)).catch(() => {});
}
