




export function nbcOn(state) {
  return state?.noBulletCooldown === true;
}




export const NBC_TRACKING_DAMAGE = 103;

export const NBC_VORTEX_DAMAGE = 103;

export const NBC_POINTING_DAMAGE = 100;

export const NBC_SLASH_AOE_DAMAGE = 69;

export const NBC_SPLITSLASH_DAMAGE = 242;

export const NBC_CATCH_DAMAGE = 15;


export const NBC_BOXSPLITTER_SPAWN = 33;

export const NBC_ROARING_STAR_BURST = 2;


export const NBC_SWORD_TUNNEL_RATE = -999;





export const NBC_NAME_THRESHOLD = 5840;
export const NBC_NAME = 'Roaring Knight';
export const NBC_NAME_LOW = 'Roaring Fraud';
export const VANILLA_NAME = 'Knight';



export function knightName(state) {
  if (!nbcOn(state)) return VANILLA_NAME;
  const hp = state?.knight?.hp;
  return typeof hp === 'number' && hp < NBC_NAME_THRESHOLD ? NBC_NAME_LOW : NBC_NAME;
}




export const NBC_BATTLE_MSG = {
  1: {

    1: '* You felt countless lethal objects hovering close behind your head...',
    2: '* Suddenly, the north wind roared fiercely.',
    3: '* Your vision narrows to a point.',
    4: '* Your soul feels constricted.',
  },
  2: {
    0: '* You felt lightheaded.&* You saw a storm of golden stars...',
    1: '* Suddenly, the north and east winds roared fiercely.',
    2: "* Your vision narrows.&* ... Your head can't stop spinning.",
    3: '* You feel surrounded by the imminent threat.',
    4: '* You felt your soul twisting.',
  },
  3: {
    0: '* You felt faint.&* For a moment, you thought you saw starry skies...',
    1: '* The upheaval almost sweeps you off your feet.',
    2: '* Your peripheral fades.&* ... The world revolves around you.',
    3: "* You can't find an escape.",
    4: '* You felt something pulling on your soul...',
  },
};



export const NBC_PROGAMER_MSG =
  '* Kris gave the enemy a knowing gaze.&* The enemy seems flabbergasted.';



export const NBC_DOWN_MSG = {
  kris: '* Kris accepts their situation.&',
  susie: "* Susie's will was shattered.&",
  susieLate: "* Susie realised she should've kept quiet.&",
  ralsei: '* Ralsei became a pile of dust.&',
};


export const NBC_SUSIE_LATE_TURN = 6;
