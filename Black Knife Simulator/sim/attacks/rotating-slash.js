


import { scrLerpvar, scrScriptDelayedDestroy } from '../lerpvar.js';
import { spawn, destroy } from '../entity.js';
import { roaringknightSlash } from './roaringknight-slash.js';
import { knightCircle, knightWarp, knightWarpOut, particleGeneric } from '../fx.js';
import { cue, cueLoop, cueStop } from '../audio.js';
import { nbcOn } from './nbc.js';
import { scrApproach, lengthdirX, lengthdirY } from '../gml.js';
import { gmlChoose, gmlIrandom, gmlRandom, gmlRandomRange, gmlU32 } from '../rng.js';
import { scrBulletInherit } from '../bullets/regularbullet.js';
import { chainNext } from './combination.js';


function shuffleList(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = gmlU32(rng) % (i + 1);
    const t = list[i];
    list[i] = list[j];
    list[j] = t;
  }
  return list;
}

export const rotatingSlash = {
  name: 'obj_knight_rotating_slash',

  create(e, state) {

    e.grazed = 0;
    e.grazetimer = 0;
    e.destroyonhit = 1;
    e.target = 0;
    e.inv = 60;
    e.damage = 10;
    e.element = 0;
    e.grazepoints = 1;
    e.timepoints = 1;
    e.active = 1;
    e.updateimageangle = 0;


    e.image_speed = 0;

    e.sprite_index = 'spr_roaringknight_attack_ol';
    e.image_index = 0;

    e.image_xscale = 2;
    e.image_yscale = 2;

    e.difficulty = 2;
    e.slash_number = 1;
    e.rotation = 16;
    e.rotation_base = 16;

    e.r = 0;
    e.g = 0;
    e.b = 0;
    e.line_width = 4;
    e.line2 = -1;
    e.line3 = -1;
    e.rotation_change = 1;
    e.rotation_goal = 2;
    e.timer = 0;
    e.state = 'intro';
    e.turn_type = 'full';
    e.local_turntimer = 0;
    e.aim_direction = 0;
    e.spin = state.spinSequence
      ? state.spinSequence[state.spinIndex++]
      : gmlChoose(state.gmlRng, [-1, 1]);
    e.random_offset = gmlIrandom(state.gmlRng, 360);
    e.slash_array = [1, 2, 2, 3, 3, 4];
    e.slash_counter = 0;
    e.final_counter = 0;
    e.slash_base = 18;
    e.slash_offset = 6;
    e.speed_gain = 16;
    e.cooldown_time = 6;
    e.slash_timer = 8;
    e.aim_type = 0;
    e.anchor_x = e.x;
    e.anchor_y = e.y;

    e.returnLerp = null;
    e.aim_x = e.x;
    e.aim_y = e.y;
    e.slash_list = [];
    e.movebox_x = 40;
    e.movebox_y = 60;
    e.do_final = true;
    e.turn_limit_4 = 270;
    e.slashes_done = false;
    e.done = false;
  },


  init(e) {
    if (e.difficulty === 1) {
      e.slash_offset = 6;
      e.slash_number = 3;
      e.slash_array = [2, 3, 4, 4, 4, 4];
    }
    if (e.difficulty === 2) {
      e.slash_offset = 0;
      e.slash_number = 3;
      e.slash_array = [3, 4, 4, 4, 4, 4];
    }

    if (e.turn_type === 'full') e.local_turntimer = 400;
    if (e.turn_type === 'start') e.local_turntimer = 320;
    if (e.turn_type === 'end') {
      e.local_turntimer = 300;
      e.timer = 15;
    }
    if (e.turn_type === 'short start') {
      e.local_turntimer = 270;
      e.timer = 12;
      e.turn_limit_4 = 250;
    }
    if (e.turn_type === 'short mid') {
      e.local_turntimer = 260;
      e.timer = 15;
      e.turn_limit_4 = 250;
    }
    if (e.turn_type === 'short end') {
      e.local_turntimer = 260;
      e.timer = 15;
    }
  },

  alarm: {

    3(e, state) {

      const closing =
        e.turn_type !== 'start' &&
        e.turn_type !== 'short start' &&
        e.turn_type !== 'short mid';

      if (closing) {
        const knight = state.entities.find(
          (x) => x.alive && x.type.name === 'obj_knight_enemy',
        );
        if (knight) knight.image_alpha = 1;
        state.turntimer = -1;
      }

      destroy(e, state);
    },



    2(e, state) {
      chainNext(state, e);

      destroy(e, state);
    },
  },



  cleanUp(e, state) {
    cueStop(state, 'snd_knight_rotatingslash_line');
  },



  endStep(e, state) {
    if (e.nbcController && nbcOn(state)) {
      let live = 0;
      for (const o of state.entities) {
        if (o.alive && o.type === rotatingSlash) live += 1;
      }
      if (live < 30) {

        const src = state.entities.find(
          (x) => x.alive && x.type.name === 'obj_knight_enemy',
        ) ?? e;
        const extra = spawn(state, rotatingSlash, { x: src.x, y: src.y });
        extra.difficulty = e.difficulty;
        rotatingSlash.init(extra);
      }
    }

  },

  step(e, state) {

    {
      const kx = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_knight_enemy',
      );
      if (kx) {
        kx.siner2 = 0;
        e.anchor_x = kx.x;
        e.anchor_y = kx.y;
      }
    }
    tickReturnLerp(state, e);

    e.local_turntimer -= 1;
    if (globalThis.process?.env?.KNIGHT_RS_DEBUG) {
      const f = globalThis.__simFrame;
      const [a, b] = globalThis.process.env.KNIGHT_RS_DEBUG.split('-').map(Number);
      if (f >= a && f <= (b ?? a) && (e.state !== e._lastLoggedState || e.local_turntimer === 199)) {
        void 0;
        e._lastLoggedState = e.state;
      }
    }
    if (e.done) return;


    if (e.image_index >= 5 && e.aim_type !== 2) {
      e.image_index = 5;
      e.image_speed = 0;
    }

    if (e.state === 'intro') {
      e.timer += 1;
      if (e.timer > 16) {
        e.state = 'aim';
        e.timer = 0;
      }
    }

    if (e.state === 'aim') {
      e.timer += 1;
      if (e.timer === 1) {

        cueStop(state, 'snd_knight_rotatingslash_line');
        cueLoop(state, 'snd_knight_rotatingslash_line');
        e.rotation = e.rotation_base;

        e.r = 128;
        e.g = 128;
        e.b = 128;
        e.spin = state.spinSequence
      ? state.spinSequence[state.spinIndex++]
      : gmlChoose(state.gmlRng, [-1, 1]);
        e.movebox_x += 20 + gmlIrandom(state.gmlRng, 40);
        e.movebox_y += 30 + gmlIrandom(state.gmlRng, 60);
        if (e.movebox_x > 80) e.movebox_x -= 80;
        if (e.movebox_y > 120) e.movebox_y -= 120;


        if (e.aim_type !== 2) {
          e.image_index = 1;
        } else {
          e.sprite_index = 'spr_roaringknight_flurry_prepare';
          e.image_index = 0;
        }


        {
          const b = boxEdges(state);
          const dur = e.slash_base + e.slash_offset - 8;
          scrLerpvar(state, spawn, e, 'x', e.x, b[0] - 20 + e.movebox_x, dur, 1);
          scrLerpvar(state, spawn, e, 'y', e.y, b[1] - 20 + e.movebox_y, dur, 1);
        }
      }


      if (e.timer === Math.floor((e.slash_base + e.slash_offset) * 0.5) && e.aim_type !== 2) {
        e.image_index += 1;
      }
      if (e.timer === e.slash_base + e.slash_offset && e.aim_type !== 2) {
        e.image_speed = 0.5;
      }


      e.aim_direction += e.rotation * e.spin;
      e.rotation = scrApproach(e.rotation, e.rotation_goal, e.rotation_change);

      if (e.timer === 1 && e.aim_type === 0) {
        const heart = state.soul;

        if (!heart) return;

        const hp = state.soulPrev ?? heart;
        e.aim_x = hp.x + 10;
        e.aim_y = hp.y + 10;
      }


      if (e.timer === 1) {
        spawn(state, knightCircle, { x: e.aim_x, y: e.aim_y });
      } else {

        e.r = scrApproach(e.r, 255, 9.142857142857142);
        e.g = scrApproach(e.g, 0, 9.142857142857142);
        e.b = scrApproach(e.b, 0, 9.142857142857142);
      }

      if (e.timer === e.slash_base + 6 + e.slash_offset) {
        e.state = 'slash';
        e.timer = 0;
      }
    }

    if (e.state === 'slash') {
      e.timer += 1;
      if (e.timer === 1) {
        e.slash_list = [];
        for (let a = 0; a < e.slash_number; a++) {
          e.slash_list.push(
            (360 / (e.slash_number * 2)) * a + e.random_offset + e.aim_direction,
          );
        }

        cueStop(state, 'snd_knight_rotatingslash_line');

        cue(state, 'snd_knight_cut');
        cue(state, 'snd_explosion_firework');
        if (state.fixedSlashOrder === true && state.angleLists) {

          if (state.gmlRng) {
            for (let i = 0; i < e.slash_list.length * 16; i++) gmlU32(state.gmlRng);
          }
          const rec = state.angleLists[state.angleIndex++];
          if (rec) e.slash_list = [...rec];
        } else {
          shuffleList(e.slash_list, state.gmlRng);
        }
      }

      if (e.timer - 1 < e.slash_list.length) {
        const s = spawn(state, roaringknightSlash, { x: e.aim_x, y: e.aim_y });
        s.direction = e.slash_list[e.timer - 1];
        s.image_xscale = 2;
        s.xscale = 2;
        s.image_angle = s.direction;

        s.width = s.width * 2;
        s.aoe = true;

        scrBulletInherit(e, s);


        if (state.gmlRng) {

          const markscalex = 5 + gmlRandom(state.gmlRng, 3);
          const markscaley = 2 + gmlRandom(state.gmlRng, 1);


          const markA = spawn(state, particleGeneric, { x: s.x, y: s.y });

          markA.depth = (markA.depth ?? 0) + 100;
          markA.sprite_index = 'spr_knight_slash_mark';
          markA.image_blend = [255, 0, 0];
          markA.image_angle = s.image_angle;
          markA.image_xscale = markscalex;
          markA.image_yscale = markscaley;

          markA.image_speed = 0;

          scrLerpvar(state, spawn, markA, 'image_xscale', markA.image_xscale, 0, 4);
          scrLerpvar(state, spawn, markA, 'image_yscale', markA.image_yscale, 0, 4);
          scrScriptDelayedDestroy(state, spawn, markA, 4);


          const markB = spawn(state, particleGeneric, { x: s.x, y: s.y });
          markB.depth = (markB.depth ?? 0) + 99;
          markB.sprite_index = 'spr_knight_slash_mark';
          markB.image_blend = [0, 0, 0];
          markB.image_angle = s.image_angle;
          markB.image_xscale = markscaley * 0.85;
          markB.image_yscale = markscaley * 0.85;
          markB.image_speed = 0;
          scrLerpvar(state, spawn, markB, 'image_xscale', markB.image_xscale, 0, 4);
          scrLerpvar(state, spawn, markB, 'image_yscale', markB.image_yscale, 0, 4);
          scrScriptDelayedDestroy(state, spawn, markB, 4);


          for (let burst = 0; burst < 2; burst++) {

            const reps = 4 + gmlIrandom(state.gmlRng, 3);
            for (let i = 0; i < reps; i++) {

              const faade = 12 + gmlIrandom(state.gmlRng, 8);
              const diist = -20 + gmlRandom(state.gmlRng, 60);
              const p = spawn(state, particleGeneric, { x: s.x, y: s.y });

              p.speed = 6 + gmlRandom(state.gmlRng, 4);
              p.image_angle = (burst === 0 ? s.image_angle : s.image_angle + 180)
                + gmlRandomRange(state.gmlRng, -10, 10);
              p.direction = p.image_angle;
              p.builtinMotion = true;

              const [boxR, boxT, boxL, boxB] = boxEdges(state);
              for (let w = 0; w < 50; w++) {
                p.x = p.x + lengthdirX(5, p.direction);
                p.y = p.y + lengthdirY(5, p.direction);
                if (p.x < boxL || p.x > boxR || p.y < boxT || p.y > boxB) break;
              }

              p.x = p.x + lengthdirX(diist, p.direction);
              p.y = p.y + lengthdirY(diist, p.direction);

              p.depth = (p.depth ?? 0) + 101;
              p.sprite_index = 'spr_knight_slash_mark';
              p.image_blend = [255, 0, 0];
              p.image_xscale = 0.3;
              p.image_yscale = 0.15;
              p.image_speed = 0;
              scrLerpvar(state, spawn, p, 'image_xscale', p.image_xscale, 0, faade);
              scrLerpvar(state, spawn, p, 'image_yscale', p.image_yscale, 0, faade);
              scrScriptDelayedDestroy(state, spawn, p, faade);
            }
          }
        }
      }

      if (e.timer === e.slash_timer) {
        e.state = 'cooldown';
        e.timer = 0;
      }
    }

    if (e.state === 'cooldown') {
      e.timer += 1;
      if (e.timer === e.cooldown_time || e.local_turntimer < 200) {
        e.slash_counter += 1;
        if (e.slash_counter < e.slash_array.length) {
          e.slash_number = e.slash_array[e.slash_counter];

          e.slash_offset = scrApproach(e.slash_offset, 0, 6);
          e.slash_base = scrApproach(e.slash_base, 15, 1);
        }

        if (e.local_turntimer < 200 && !e.slashes_done) {
          e.slashes_done = true;
          e.local_turntimer = 99999;
        }


        if (e.slashes_done) {
          if (e.difficulty === 2 && e.turn_type === 'full') {
            if (e.do_final) {

              cue(state, 'snd_knight_puff');
              cue(state, 'snd_knight_teleport', 0.5);

              e.rotation_base = 18;
              e.rotation_change = 0.5;
              e.line_width = 4;
              e.slash_number = 1;
              e.slash_base = 24;
              e.cooldown_time = 2;
              e.slash_timer = 2;
              e.aim_type = scrApproach(e.aim_type, 2, 1);
              e.do_final = false;
              const b = boxEdges(state);
              e.aim_x = (b[2] + b[0]) / 2;
              e.aim_y = (b[1] + b[3]) / 2;
            }
          } else if (e.turn_type === 'start' || e.turn_type === 'short start'
            || e.turn_type === 'short mid') {

            if (!e.handoffArmed) {
              e.handoffArmed = true;
              const w = spawn(state, knightWarp, { x: e.x, y: e.y });
              w.master = e;
              knightWarpOut(state, w);
              e.alarm[2] = 4;
            }
            return;
          } else {
            e.state = 'return';
            e.timer = 0;
            e.done = true;

            delayedReturnLerp(e, e.x, e.anchor_x, e.y, e.anchor_y);
            e.alarm[3] = 22;
            return;
          }
        }

        if (e.aim_type < 2) {
          e.state = 'aim';
          e.timer = 0;

          if (e.aim_type === 1) {
            e.line2 = 0;
            e.alarm[1] = 4;
            e.aim_type = scrApproach(e.aim_type, 2, 1);
          }
          return;
        }


        e.state = 'slash';
        e.timer = 0;
        e.aim_direction += e.speed_gain * e.spin;
        e.speed_gain = scrApproach(e.speed_gain, 24, 1);
        e.final_counter += 1;
        if (e.final_counter === 28) {
          e.state = 'return';
          e.done = true;

          cancelLerps(state, e);
          scrLerpvar(state, spawn, e, 'x', e.x, e.anchor_x, 12, 1);
          scrLerpvar(state, spawn, e, 'y', e.y, e.anchor_y, 12, 1);

          e.alarm[3] = 22;
        } else {

          const rec = state.finalMoveTable ? state.finalMoveTable[state.finalMoveIndex++] : null;
          e.movebox_x += rec ? rec.mx : 20 + gmlIrandom(state.gmlRng, 40);
          e.movebox_y += rec ? rec.my : 30 + gmlIrandom(state.gmlRng, 60);
          e.sprite_index = 'spr_roaringknight_flurry';
          e.image_speed = 1;
          if (e.movebox_x > 80) e.movebox_x -= 80;
          if (e.movebox_y > 120) e.movebox_y -= 120;
          const b = boxEdges(state);
          const dur = e.slash_base + e.slash_offset - 8;
          scrLerpvar(state, spawn, e, 'x', e.x, b[0] - 20 + e.movebox_x, dur, 1);
          scrLerpvar(state, spawn, e, 'y', e.y, b[1] - 20 + e.movebox_y, dur, 1);
        }
      }
    }
  },
};



function cancelLerps(state, e) {
  for (const t of state.entities) {
    if (t.alive && t.type.name === 'obj_lerpvar' && t.target === e) destroy(t);
  }
}



function delayedReturnLerp(e, fromX, toX, fromY, toY) {
  e.returnLerp = { delay: 7, fromX, toX, fromY, toY };
}


function tickReturnLerp(state, e) {
  const r = e.returnLerp;
  if (!r) return;
  r.delay -= 1;
  if (r.delay > 0) return;
  e.returnLerp = null;
  scrLerpvar(state, spawn, e, 'x', r.fromX, r.toX, 12, 1);
  scrLerpvar(state, spawn, e, 'y', r.fromY, r.toY, 12, 1);
}



function boxEdges(state) {
  const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
  if (!gt) return [0, 0, 0, 0];
  const hw = (gt.spriteWidth ?? 75 * gt.image_xscale) * 0.5;
  const hh = (gt.spriteHeight ?? 75 * gt.image_yscale) * 0.5;
  return [gt.x + hw, gt.y - hh, gt.x - hw, gt.y + hh];
}


export function spawnRotatingSlash(state, x, y, { difficulty = 0 } = {}) {

  const knight = state.entities.find(
    (k) => k.alive && k.type.name === 'obj_knight_enemy',
  );
  if (knight) knight.image_alpha = 0;

  const e = spawn(state, rotatingSlash, { x, y });
  e.difficulty = difficulty;

  e.nbcController = true;
  rotatingSlash.init(e);
  return e;
}


import { registerComboAttack } from './combination.js';
registerComboAttack(2, rotatingSlash);
