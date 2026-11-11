// Tidewick: every tunable number lives here. Speeds are pixels per frame and accelerations pixels per frame²,
// at 60 updates a second (one "frame" is one fixed update). Times are in frames unless the name says otherwise.

// ---------- loop and display ----------
export const FPS = 60;                    // fixed updates per second
export const STEP_MS = 1000 / FPS;
export const MAX_FRAME_MS = 100;          // a longer gap between animation frames (tab switch) counts as this much
export const SCREEN_W = 256;              // internal resolution
export const SCREEN_H = 240;
export const TILE = 16;
export const VIEW_TILES_X = 16;
export const VIEW_TILES_Y = 15;
export const HUD_H = 32;                  // the HUD sits over the top two rows of the view

// ---------- player: horizontal (ground) ----------
export const MIN_WALK = 0.0742;           // speed when starting to move from rest
export const WALK_ACCEL = 0.0371;
export const RUN_ACCEL = 0.0557;
export const MAX_WALK = 1.5625;
export const MAX_RUN = 2.5625;
export const RELEASE_DECEL = 0.0508;      // no direction held (also how a too-fast walk settles back to MAX_WALK)
export const SKID_DECEL = 0.1016;         // pressing against the direction of travel
export const SKID_TURN = 0.5625;          // below this during a skid, Pip turns round

// ---------- player: jumping ----------
// Picked at take-off from the horizontal speed and fixed for the whole jump: [speed below, start speed, gravity while
// jump is held and rising, gravity otherwise]. The last band has no upper limit.
export const JUMP_BANDS = [
  { below: 1.0, vy: -4.0, holdG: 0.125, fallG: 0.4375 },
  { below: 2.5, vy: -4.0, holdG: 0.1172, fallG: 0.375 },
  { below: Infinity, vy: -5.0, holdG: 0.15625, fallG: 0.5625 }
];
export const MAX_FALL = 4.0;

// ---------- player: air control ----------
export const AIR_FWD_SLOW = 0.0371;       // pressing forward under MAX_WALK
export const AIR_FWD_FAST = 0.0557;       // pressing forward at MAX_WALK or more
export const AIR_BACK_FAST = 0.0557;      // pressing backward at MAX_WALK or more
export const AIR_BACK_MID = 0.0508;       // pressing backward, slower, after a take-off at AIR_BACK_TAKEOFF or more
export const AIR_BACK_SLOW = 0.0371;      // pressing backward otherwise
export const AIR_BACK_TAKEOFF = 1.8125;
export const AIR_CAP_SLOW = 1.5625;       // air speed cap after a take-off under AIR_CAP_TAKEOFF
export const AIR_CAP_FAST = 2.5625;
export const AIR_CAP_TAKEOFF = 1.5625;

// ---------- player: body ----------
export const SMALL_BOX = { w: 12, h: 14, ox: 2, oy: 2 };   // hitbox inside the 16×16 sprite (ox, oy from its top left)
export const BIG_BOX = { w: 12, h: 28, ox: 2, oy: 4 };     // inside the 16×32 sprite
export const CORNER_NUDGE = 4;            // a head that clips a block corner by this much or less slides past it
export const HEAD_BUMP_VY = 1.0;          // falling speed straight after hitting a block from below
export const CROUCH_EJECT = 1.0;          // big Pip stuck crouching under a 1-tile ceiling slides out this fast
export const STOMP_BOUNCE = -4.0;
export const START_X = 40;                // Pip's start (hitbox left), in pixels

// ---------- power states ----------
export const POWER_FREEZE = 60;           // growing, shrinking or catching fire freezes play this long (about 1 s)
export const HURT_INVULN = 120;           // blinking after a hit (about 2 s)
export const STAR_TIME = 720;             // firefly jar (about 12 s)
export const STAR_WARN = 120;             // its music stops and the glow slows for the last 2 s
export const ITEM_RISE_SPEED = 0.5;       // items rise out of a block this fast (16 px = 32 frames)
export const ITEM_WALK = 1.0;             // loaf and clover
export const ITEM_GRAV = 0.375;
export const STAR_VX = 1.0;               // the jar bounces along
export const STAR_BOUNCE = -3.5;
export const STAR_GRAV = 0.15;

// ---------- sparks (the ember pepper's projectile) ----------
export const SPARK_MAX = 2;
export const SPARK_VX = 4.0;
export const SPARK_START_VY = 1.5;
export const SPARK_GRAV = 0.3;
export const SPARK_BOUNCE = -2.4;
export const SPARK_MAX_FALL = 4.0;
export const THROW_POSE = 8;              // frames the throwing pose shows

// ---------- enemies ----------
export const ENEMY_SPEED = 0.5;
export const ENEMY_GRAV = 0.375;
export const ENEMY_MAX_FALL = 4.0;
export const FLAT_TIME = 30;              // a stomped Bilge stays flat this long (half a second)
export const SHELL_SPEED = 3.0;           // a kicked shell
export const KICK_GRACE = 10;             // frames a just-kicked shell can't hurt the player who kicked it
export const ACTIVATE_MARGIN = 32;        // enemies wake when they come within this many px of the right edge of the view
export const REMOVE_BEHIND = 96;          // and are removed once this far behind its left edge
export const REMOVE_AHEAD = 2 * SCREEN_W; // a sliding shell this far ahead of the view is removed too
export const FLIP_VY = -3.0;              // enemies knocked out (spark, shell, bump, jar) flip and fall
export const FLIP_GRAV = 0.25;

// ---------- scoring ----------
export const STOMP_CHAIN = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];   // then an extra life
export const SHELL_CHAIN = [500, 800, 1000, 2000, 4000, 5000, 8000];                  // then an extra life
export const BUTTON_POINTS = 200;
export const BUTTONS_FOR_LIFE = 100;
export const POWERUP_POINTS = 1000;
export const BRICK_POINTS = 50;
export const SPARK_POINTS = 200;
export const STAR_KILL_POINTS = 200;      // an enemy touched while the jar glows
export const BUMP_KILL_POINTS = 100;      // an enemy knocked off a block from below
export const TIME_POINTS = 50;            // each second left on the clock at the end
export const BOSS_POINTS = 5000;
export const POPUP_LIFE = 40;             // floating score numbers
export const POPUP_RISE = 0.75;

// ---------- blocks ----------
export const BUMP_HEIGHT = 8;             // a bumped block pops up this far
export const BUMP_FRAMES = 12;            // and settles back over this long
export const MULTI_WINDOW = 240;          // the multi-button planks keep paying for 4 s after the first hit
export const MULTI_MAX = 10;
export const DEBRIS_VX = [-1.0, 1.0, -0.75, 0.75];
export const DEBRIS_VY = [-5.0, -5.0, -3.5, -3.5];
export const DEBRIS_GRAV = 0.3;
export const BLOCK_BUTTON_VY = -5.5;      // a button knocked out of a crate jumps up, spins and vanishes
export const BLOCK_BUTTON_GRAV = 0.35;
export const BLOCK_BUTTON_LIFE = 30;
export const SHIMMER_FRAMES = [16, 8, 8]; // the lantern crate's 3-frame shimmer (frames each step lasts)

// ---------- timer, lives ----------
export const TIME_START = 400;
export const TIME_TICK = 24;              // frames per clock tick
export const TIME_HURRY = 100;
export const START_LIVES = 3;
export const COUNT_STEP = 1;              // frames per tick while the time left converts to points

// ---------- camera ----------
export const CAM_FOLLOW_X = 112;          // the view follows once Pip's centre passes this far from its left edge

// ---------- chimneys and the cellar ----------
export const PIPE_SPEED = 1.0;            // sinking into / rising out of a chimney
export const PIPE_DEPTH = 32;
export const PIPE_ENTER_SLACK = 4;        // Pip's hitbox must be within the chimney's mouth, with this much spare
export const FADE_FRAMES = 20;

// ---------- the signal mast and the hut ----------
export const MAST_HEIGHT = 9;             // pole tiles above the stone base
export const MAST_SLIDE = 2.0;            // sliding down
export const MAST_SCORES = [              // grab height (pixels of the pole above the base, at Pip's feet) → points
  { min: 128, pts: 5000 }, { min: 98, pts: 2000 }, { min: 66, pts: 800 }, { min: 34, pts: 400 }, { min: -999, pts: 100 }];
export const MAST_WAIT = 24;              // at the bottom before stepping off
export const AUTO_WALK = 1.0;             // walking to the hut
export const CLEAR_HOLD = 90;             // after the count, before moving on

// ---------- game states ----------
export const INTRO_FRAMES = 150;          // the black card with the stage name and lives (2.5 s)
export const DEATH_PAUSE = 30;            // everything freezes, Pip waits, then hops
export const DEATH_HOP = -4.0;
export const DEATH_GRAV = 0.25;
export const DEATH_TOTAL = 200;           // frames from death to the next card
export const GAMEOVER_FRAMES = 300;
export const ENDING_MIN = 120;            // the ending card ignores keys this long

// ---------- stage 2: the Tollkeeper ----------
export const BOSS_W = 28;                 // hitbox (the sprite is 32×32)
export const BOSS_H = 30;
export const BOSS_SPEED = 0.5;            // pacing
export const BOSS_RANGE = 40;             // paces this many px either side of where it starts
export const BOSS_HOP_VY = -4.0;
export const BOSS_GRAV = 0.15;
export const BOSS_HOP_GAPS = [70, 150, 100, 190, 80, 130, 160, 90];   // frames between hops (cycled; looks random)
export const BOSS_SPIT_GAPS = [150, 120, 170, 135, 180, 125, 160];    // 2 to 3 s between brine bolts
export const BOSS_SPIT_POSE = 20;         // mouth open before the bolt leaves
export const BOSS_HITS = 5;               // sparks it takes
export const BOSS_HIT_FLASH = 12;
export const BOSS_WAKE_MARGIN = 16;       // wakes once this close to the right edge of the view
export const BOLT_VX = 1.25;              // brine bolts drift towards the player
export const BOLT_VY = 0.5;               // and settle onto their lane this fast
export const BOLT_W = 24;
export const BOLT_H = 8;
export const BOLT_LANES = [8, 22, 36];    // lane centre, px above the bridge: jump the low one, big Pip ducks the middle one
export const BOLT_LANE_ORDER = [0, 1, 0, 2, 1, 0, 1, 2, 0, 1];
export const BOLT_WARN_RANGE = 160;       // bolts start coming in from off screen once the boss is this close
export const BOLT_WARN_GAP = 150;
export const BRIDGE_DROP_STEP = 3;        // frames between planks falling once the winch turns
export const BOSS_FALL_GRAV = 0.2;
export const BOSS_DOWN_FRAMES = 110;      // the fall before Pip walks on

// ---------- audio ----------
export const MASTER_VOL = 0.6;               // music peaks near 0.2 of full scale, the loudest effect near 0.45
export const SFX_GAIN = 2.5;            // effects over the music
export const HURRY_TEMPO = 1.35;
export const SCHEDULE_AHEAD = 0.12;       // seconds of music scheduled ahead
export const SCHEDULE_EVERY_MS = 25;

// ---------- misc ----------
export const DEBUG_KEY = 'Backquote';
export const STEP_KEY = 'KeyP';
export const STORE_PREFIX = 'tidewick:';
export const SEED = 0x7a1d;               // background decoration and the boss's pattern use fixed seeds
