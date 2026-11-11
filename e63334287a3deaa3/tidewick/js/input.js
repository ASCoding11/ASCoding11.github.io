// Keyboard and touch input. Keys go through the Back Room's keybinds.js (window.Keybinds) when it is loaded, so players
// can rebind them; the defaults are the ones below. A press is remembered until the next fixed update reads it, so a tap
// shorter than one update still counts (and still counts as "held" for that one update).

export const ACTIONS = [
  { id: 'left', label: 'Move left', group: 'Move', keys: ['ArrowLeft', 'KeyA'] },
  { id: 'right', label: 'Move right', group: 'Move', keys: ['ArrowRight', 'KeyD'] },
  { id: 'down', label: 'Crouch / go down a chimney', group: 'Move', keys: ['ArrowDown', 'KeyS'] },
  { id: 'jump', label: 'Jump', note: 'Hold for a higher jump', group: 'Move', keys: ['KeyX', 'Space'] },
  { id: 'run', label: 'Run / throw a spark', group: 'Move', keys: ['KeyZ', 'ShiftLeft'] },
  { id: 'start', label: 'Start / pause', group: 'Game', keys: ['Enter'] },
  { id: 'mute', label: 'Sound on / off', group: 'Game', keys: ['KeyM'] },
  { id: 'pause', label: 'Pause', group: 'Game', keys: ['Escape'], fixed: true }
];
const IDS = ['left', 'right', 'down', 'jump', 'run', 'start', 'mute'];
const NO_SCROLL = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

export class Input {
  constructor(target = window) {
    this.keys = {};                    // e.code → held
    this.touch = {};                   // action → held by a finger
    this.queued = {};                  // action → pressed since the last update
    this.extra = {};                   // non-rebindable keys pressed since the last update (debug)
    this.enabled = true;
    this.kb = (typeof window !== 'undefined' && window.Keybinds) ? window.Keybinds.create({
      game: 'tidewick', actions: ACTIONS, classes: { button: 'tbtn', primary: 'tbtn primary' }
    }) : null;
    this.onAny = null;
    target.addEventListener('keydown', e => this.down(e), { passive: false });
    target.addEventListener('keyup', e => this.up(e));
    target.addEventListener('blur', () => { this.keys = {}; this.touch = {}; });
  }

  bound(action, code) {
    if (this.kb) return this.kb.is(action, code);
    const a = ACTIONS.find(x => x.id === action);
    return !!a && a.keys.includes(code);
  }
  actionsFor(code) { return IDS.filter(id => this.bound(id, code)).concat(code === 'Escape' ? ['pause'] : []); }

  down(e) {
    if (this.kb && this.kb.busy()) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const acts = this.actionsFor(e.code);
    if (NO_SCROLL.has(e.code) || acts.length) e.preventDefault();
    if (this.onAny) this.onAny(e);
    if (e.repeat) return;
    this.keys[e.code] = true;
    for (const a of acts) this.queued[a === 'pause' ? 'start' : a] = true;
    this.extra[e.code] = true;
  }
  up(e) { this.keys[e.code] = false; }

  // touch buttons call these
  press(action) { if (!this.touch[action]) this.queued[action] = true; this.touch[action] = true; }
  release(action) { this.touch[action] = false; }

  held(action) {
    if (this.touch[action]) return true;
    if (this.kb) return this.kb.held(action, this.keys);
    return ACTIONS.find(x => x.id === action).keys.some(k => this.keys[k]);
  }

  // read once per fixed update
  read() {
    const q = this.queued, on = this.enabled;
    const h = id => on && (this.held(id) || !!q[id]);
    const out = {
      left: h('left'), right: h('right'), down: h('down'), jump: h('jump'), run: h('run'),
      jumpPressed: on && !!q.jump, runPressed: on && !!q.run, startPressed: !!q.start, mutePressed: !!q.mute,
      debugPressed: !!this.extra.Backquote, stepPressed: !!this.extra.KeyP
    };
    this.queued = {}; this.extra = {};
    return out;
  }
}
