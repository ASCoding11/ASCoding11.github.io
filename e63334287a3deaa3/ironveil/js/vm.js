/* Midnight Ops: the first-person gun and hands (window.IVVM). No skeleton, no skinning, no baked clips.

   The gun is drawn big and close in the lower right with its barrel running toward the screen centre. The firing
   hand is a static glove mesh (js/hands.js) built closed round the gun's grip and fixed to the gun, so it can never
   drift; only its trigger finger has two builds (resting along the guard / pressed) mixed per vertex. The support
   hand is its own glove with several builds (fore-end wrap, holding a magazine, working the bolt, pulling the slide,
   a grenade, a flat reach) that are swapped or cross-faded in 60 ms and moved as a rigid object. A third glove (the
   right hand alone) appears only for the knife and the binoculars, while the gun is lowered out of view.

   Everything that moves is driven by a small keyframe timeline (below): per clip, channels for the gun's offset, the
   support hand's place (on the gun, or in the eye's frame), which build each hand shows, the gun's moving parts from
   weapons.glb (bolt, magazine, slide, hammer, trigger, charging handle) and named events at times.

   IVVM.create(kind, { weapon: fn(kind) -> Object3D }) -> vm, kind 'rifleScoped' | 'smg' | 'pistol'. The vm has the
   interface js/fp.js and js/weapons.js use (the one IVChars.viewmodel had):
     vm.group (add to the viewmodel camera: origin at the eye, -Z ahead, +Y up, +X right, metres; FOV ~55)
     vm.drive(state, dt) -> events [{ clip, name, time }]   state = { ads 0..1, sprint 0..1, crouch 0..1, prone 0..1 }
     vm.play(name, { fade, speed, loop }) -> seconds; vm.stop(fade); vm.isPlaying(name); vm.current; vm.clipLength(name);
     vm.events(name); vm.clips; vm.onEvent(name, clip); vm.setProp('grenade' | 'rock'); vm.sockets { muzzle,
     ejection, scopeEye, sightRear, sightFront, handR, handL, prop, weapon }; vm.muzzle, vm.ejection, vm.scopeEye;
     vm.weapon; vm.tris(); vm.setVisible(b); vm.dispose(); vm.sleeveEnds(out) (the open ends of the sleeves, for tests).
   Clip names and event names are the old rig's, with its durations: fire / fireAds (shot), reload / reloadEmpty
   (magOut, magIn, done, boltBack or slide), boltCycle (boltUp, boltBack, eject, boltForward, boltDown), charge
   (charge), draw (ready), holster, sprintIn, sprintOut, grenade (pin, release, done), grenadePull (pin, holds),
   grenadeCook (loop), grenadeThrow (release, done), melee (hit), interact (touch), binoculars (atEye, holds),
   binocularsLower. idle / ads / sprint / adsRaise are poses, not clips (state.ads and state.sprint blend them).

   Gun frame (weapons.glb): barrel +Z, up +Y, +X the gun's LEFT side (the side the player sees), origin at the grip.
*/
(function () {
  'use strict';
  if (!window.THREE || !window.IVHands) return;
  const T = THREE, H = window.IVHands;
  const VM = window.IVVM = {};
  const PI = Math.PI;

  // ------------------------------------------------------------------ grips
  // Hand poses (curls, thumb directions, forearm) are in the hand's own anatomical frame (IVHands: +x toward the
  // little finger) for both hands; a left hand is built as the mirror image, so its +x points to its thumb.
  // A grip places one hand build on the gun: the hand-frame point `anchor` goes to the gun-frame point `at`, the
  // hand's +y (wrist to fingers) along `fwd` and its +z (back of the hand) as near `back` as it can be.
  // forearmGun / thumbGun / nailGun / towardGun: the same, written as gun-frame directions.
  // The finger curls were closed onto the real gun mesh in vm-test.html (?bake) and are stored in BAKED below; the
  // game never runs the solver.
  const F4 = (c, sp) => ({ curl: c, spread: sp || 0 });
  const OPEN = { index: F4([0.1, 0.1, 0.05], 0.03), middle: F4([0.1, 0.1, 0.05], 0.0), ring: F4([0.1, 0.1, 0.05], -0.02), little: F4([0.15, 0.1, 0.05], -0.045) };   // fingers close together, not splayed
  const HK = (c, sp) => ({ curl: c, spread: sp, fixed: true });
  // a fist round the rifle's short magazine (fixed: the solver left the fingers splayed off its small box, and a
  // looser close read as an open mitt while the hand carried it out of view)
  const CLOSED = { index: HK([1.25, 1.45, 0.95], 0.02), middle: HK([1.3, 1.5, 1.0], 0.0), ring: HK([1.35, 1.5, 1.0], -0.02), little: HK([1.4, 1.5, 1.0], -0.05) };
  const HOOK = { index: HK([0.35, 1.35, 0.9], 0.04), middle: HK([0.35, 1.4, 0.95], 0.01), ring: HK([0.4, 1.45, 1.0], -0.03), little: HK([0.5, 1.5, 1.0], -0.07) };
  const GRIPS = VM.GRIPS = {
    smg: {
      // firing hand high on the raked pistol grip (the web up under the tang): palm on the right side, the three lower
      // fingers stacked together round the front, index straight along the frame, thumb round onto the left side
      grip: { side: 'r', anchor: [0, 0.086, -0.012], at: [-0.0175, -0.061, -0.020], fwd: [0, -0.305, 0.952], back: [-1, 0, 0],
        forearmGun: [-0.25, -0.5, -0.83], thumbGun: [[0.75, 0.25, 0.25], [0.45, 0.1, 0.89], [0.12, 0.02, 0.99]], nailGun: [0.5, 0.8, 0], towardGun: [-1, 0, 0],
        pose: { cup: 0.35, radial: 10, fingers: { index: { curl: [0.12, 0.06, 0.04], spread: -0.32, fixed: true }, middle: F4([0.6, 0.6, 0.3], 0.0), ring: F4([0.6, 0.6, 0.3], 0.05), little: F4([0.6, 0.6, 0.3], 0.1) }, thumb: { close: true }, sleeve: 0.25 } },
      gripPress: { like: 'grip', index: { curl: [0.42, 1.0, 0.45], spread: -0.12, fixed: true } },
      // support hand under the fore-end: palm under, fingers up the far side, thumb along the near side
      fore: { side: 'l', anchor: [0, 0.058, -0.0145], at: [0.021, -0.023, 0.245], fwd: [-0.55, -0.45, 0.7], back: [0.7, -0.7, 0],
        forearmGun: [-0.1, -0.85, -0.5], thumbGun: [[0.2, 0.45, 0.85], [0.02, 0.12, 0.99], [-0.06, 0.02, 1]], nailGun: [1, 0.2, 0], towardGun: [-1, 0, 0],
        pose: { cup: 0.55, fingers: OPEN, thumb: { close: true }, sleeve: 0.70 } },
      // holding the magazine at its seat: palm on its near side, fingers round its front, thumb up its side
      mag: { side: 'l', anchor: [0, 0.05, -0.014], at: [0.0135, -0.135, 0.074], fwd: [0, -0.1, 1], back: [1, 0, 0],
        forearmGun: [0.3, -0.45, -0.85], thumbGun: [[0.15, 0.75, 0.6], [0.05, 0.9, 0.4], [0, 0.95, 0.3]], nailGun: [1, 0, -0.3], towardGun: [-1, 0, 0],
        pose: { cup: 0.4, fingers: OPEN, thumb: { close: true }, sleeve: 0.70 } },
      // over the top to the cocking handle on the right side: palm down, fingers hooked round the handle
      // the cocking handle on the right side, from below: back of the hand to the right, fingers hooked up over it
      charge: { side: 'l', part: 'charging', anchor: [0, 0.085, -0.012], at: [-0.050, -0.040, -0.040], fwd: [0, 1, 0.1], back: [-1, 0, 0],
        forearmGun: [-0.25, -0.75, -0.6], thumbGun: [[0.1, 0.4, 0.9], [0.05, 0.3, 0.95], [0.0, 0.2, 0.98]], nailGun: [-1, 0, 0], towardGun: [1, 0, 0],
        pose: { cup: 0.3, fingers: { index: F4([0.35, 0.6, 0.4], 0.04), middle: F4([0.35, 0.6, 0.4], 0.01), ring: F4([0.4, 0.6, 0.4], -0.03), little: F4([0.5, 0.6, 0.4], -0.07) }, thumb: { close: true }, sleeve: 0.70 } }   // fingers closed by the solver onto the (rebuilt, wider) receiver
    },
    pistol: {
      base: 'cup',
      grip: { side: 'r', anchor: [0, 0.086, -0.012], at: [-0.0165, -0.042, -0.006], fwd: [0, -0.17, 0.985], back: [-1, 0, 0],
        forearmGun: [-0.2, -0.55, -0.8], thumbGun: [[0.75, 0.3, 0.2], [0.45, 0.12, 0.88], [0.12, 0.03, 0.99]], nailGun: [0.5, 0.8, 0], towardGun: [-1, 0, 0],
        pose: { cup: 0.35, radial: 10, fingers: { index: { curl: [0.1, 0.05, 0.03], spread: -0.3, fixed: true }, middle: F4([0.6, 0.6, 0.3], 0.0), ring: F4([0.6, 0.6, 0.3], 0.05), little: F4([0.6, 0.6, 0.3], 0.1) }, thumb: { close: true }, sleeve: 0.25 } },
      gripPress: { like: 'grip', index: { curl: [0.38, 1.05, 0.5], spread: -0.1, fixed: true } },
      // two-hand hold: the support palm on the grip's near side over the firing fingers, its fingers round the front, thumb forward under the slide
      cup: { side: 'l', anchor: [0, 0.05, -0.014], at: [0.040, -0.072, -0.034], fwd: [0, -0.35, 0.94], back: [1, -0.15, 0], solveWith: ['grip'],
        forearmGun: [0.35, -0.55, -0.75], thumbGun: [[0.1, 0.6, 0.8], [-0.05, 0.25, 0.97], [-0.1, 0.1, 1]], nailGun: [1, 0.3, 0], towardGun: [-1, 0, 0],
        pose: { cup: 0.55, fingers: OPEN, thumb: { close: true }, sleeve: 0.70 } },
      // a fresh magazine pinched at its base, pushed up into the grip
      mag: { side: 'l', solveObj: 'mag', anchor: [0, 0.075, -0.013], at: [0.0, -0.104, -0.034], fwd: [-0.15, -0.2, 0.97], back: [0.2, -1, 0],
        forearmGun: [0.35, -0.6, -0.7], thumbGun: [[0.4, 0.5, 0.75], [0.15, 0.5, 0.85], [0, 0.5, 0.87]], nailGun: [1, 0, 0], towardGun: [-1, 0, 0],
        pose: { cup: 0.4, fingers: OPEN, thumb: { close: true }, sleeve: 0.70 } },
      // over the top of the slide's rear, fingers on its far side, thumb on the near side
      slide: { side: 'l', part: 'bolt', anchor: [0, 0.06, -0.014], at: [0.006, 0.052, -0.055], fwd: [-1, -0.2, 0.1], back: [0.1, 1, 0],
        forearmGun: [0.3, -0.8, -0.5], thumbGun: [[0.3, -0.6, 0.6], [0.4, -0.7, 0.4], [0.3, -0.9, 0.2]], nailGun: [1, 0, 0], towardGun: [-1, 0, 0],
        pose: { cup: 0.5, fingers: OPEN, thumb: { close: true }, sleeve: 0.70 } }
    },
    rifleScoped: {
      // round the wrist of the stock: palm on its right side, fingers under it, thumb over the top
      grip: { side: 'r', anchor: [0, 0.086, -0.012], at: [-0.0155, -0.048, -0.038], fwd: [0, -0.6, 0.8], back: [-1, 0, 0],
        forearmGun: [-0.3, -0.5, -0.8], thumbGun: [[0.7, 0.55, 0.45], [0.7, 0.0, 0.7], [0.3, -0.2, 0.93]], nailGun: [0.3, 0.9, 0], towardGun: [-1, -0.3, 0],
        pose: { cup: 0.35, radial: 10, fingers: { index: { curl: [0.25, 0.15, 0.05], spread: -0.25, fixed: true }, middle: F4([0.5, 0.5, 0.3], 0.0), ring: F4([0.5, 0.5, 0.3], 0.05), little: F4([0.5, 0.5, 0.3], 0.1) }, thumb: { close: true }, sleeve: 0.25 } },
      gripPress: { like: 'grip', index: { curl: [0.55, 1.0, 0.45], spread: -0.1, fixed: true } },
      fore: { side: 'l', anchor: [0, 0.058, -0.0145], at: [0.025, -0.030, 0.28], fwd: [-0.55, -0.45, 0.7], back: [0.7, -0.7, 0],
        forearmGun: [-0.1, -0.85, -0.5], thumbGun: [[0.2, 0.45, 0.85], [0.02, 0.12, 0.99], [-0.06, 0.02, 1]], nailGun: [1, 0.2, 0], towardGun: [-1, 0, 0],
        pose: { cup: 0.55, fingers: OPEN, thumb: { close: true }, sleeve: 0.70 } },
      mag: { side: 'l', solveObj: 'mag', anchor: [0, 0.05, -0.014], at: [0.0105, -0.052, 0.078], fwd: [0, -0.1, 1], back: [1, 0, 0],
        forearmGun: [0.3, -0.45, -0.85], thumbGun: [[0.15, 0.75, 0.6], [0.05, 0.9, 0.4], [0, 0.95, 0.3]], nailGun: [1, 0, -0.3], towardGun: [-1, 0, 0],
        pose: { cup: 0.6, fingers: CLOSED, thumb: { close: true }, sleeve: 0.70 } },
      // reaching over to the bolt knob on the right side: knob pinched between thumb and the side of the bent index
      // the bolt knob pinched: fingers up past its outside and hooked over it, thumb up its front, ring and little tucked
      bolt: { side: 'l', part: 'bolt', solveObj: 'bolt', anchor: [0, 0.07, -0.013], at: [-0.047, -0.004, 0.064], fwd: [0.1, 1, 0.08], back: [-1, 0.1, 0],
        forearmGun: [-0.25, -0.75, -0.6], thumbGun: [[0.15, 0.55, 0.8], [0.35, 0.4, 0.85], [0.5, 0.2, 0.85]], nailGun: [-1, 0, 0], towardGun: [1, 0, 0],
        pose: { cup: 0.45, fingers: { index: HK([0.75, 1.1, 0.7], 0.03), middle: HK([0.95, 1.3, 0.85], 0.0), ring: HK([1.2, 1.5, 1.05], -0.03), little: HK([1.25, 1.5, 1.05], -0.06) }, thumb: { close: true }, sleeve: 0.70 } }   // fingers curled round the knob (straighter, they stood up over the gun like a claw)
    }
  };
  // hands round things that are not the gun, in the thing's own frame (weapons.glb models: grenade, binoculars, knife)
  const PROPGRIPS = VM.PROPGRIPS = {
    flat: { side: 'l', anchor: [0, 0.05, 0], at: [0, 0, 0], fwd: [0, 0, -1], back: [0, 1, 0], object: null,
      pose: { cup: 0.15, fingers: { index: F4([0.12, 0.18, 0.1], 0.05), middle: F4([0.12, 0.2, 0.1], 0.01), ring: F4([0.15, 0.22, 0.1], -0.03), little: F4([0.2, 0.25, 0.12], -0.08) }, thumb: { dirs: [[-0.6, 0.7, -0.35], [-0.45, 0.85, -0.2], [-0.35, 0.9, -0.15]] }, sleeve: 0.70 } },
    // a fist round the grenade's body, the lever under the palm, thumb over the top (the rock uses the same hand)
    grenade: { side: 'l', object: 'grenade', anchor: [0, 0.064, -0.014], at: [-0.0295, -0.004, 0.008], fwd: [0, 0, -1], back: [-1, 0, 0],
      thumbGun: [[0.2, 0.8, -0.3], [0.75, 0.6, -0.1], [1, 0.1, 0]], nailGun: [0, 1, 0], towardGun: [0, -1, 0], forearmGun: [-0.3, -0.9, 0.3],
      pose: { cup: 0.6, fingers: OPEN, thumb: { close: true }, sleeve: 0.70 } },
    // binoculars: each hand round the outside of its barrel, fingers over the top, thumb underneath
    binoL: { side: 'l', object: 'binoculars', anchor: [0, 0.05, -0.014], at: [0.064, -0.010, 0.022], fwd: [-0.6, 0.8, 0], back: [0.8, 0.6, 0], forearmGun: [0.4, -0.9, -0.2],
      thumbGun: [[0, -0.6, -0.8], [-0.3, -0.5, -0.8], [-0.5, -0.3, -0.8]], nailGun: [0, -1, 0], towardGun: [0, 1, 0], pose: { cup: 0.45, fingers: OPEN, thumb: { close: true }, sleeve: 0.70 } },
    binoR: { side: 'r', object: 'binoculars', anchor: [0, 0.05, -0.014], at: [-0.064, -0.010, 0.022], fwd: [0.6, 0.8, 0], back: [-0.8, 0.6, 0], forearmGun: [-0.4, -0.9, -0.2],
      thumbGun: [[0, -0.6, -0.8], [0.3, -0.5, -0.8], [0.5, -0.3, -0.8]], nailGun: [0, -1, 0], towardGun: [0, 1, 0], pose: { cup: 0.45, fingers: OPEN, thumb: { close: true }, sleeve: 0.55 } },
    // the knife in a hammer grip, blade out past the thumb
    knife: { side: 'r', object: 'knife', anchor: [0, 0.07, -0.013], at: [0.0135, -0.006, -0.07], fwd: [0, 1, 0], back: [1, 0, 0], forearmGun: [0.3, -0.5, -0.8],
      thumbGun: [[-0.3, 0.6, 0.75], [-0.6, 0.3, 0.75], [-0.7, 0, 0.7]], nailGun: [0, 1, 0], towardGun: [1, 0, 0], pose: { cup: 0.5, fingers: OPEN, thumb: { close: true }, sleeve: 0.55 } }
  };
  // a grip written as another plus changes ('like')
  for (const k in GRIPS) for (const n in GRIPS[k]) { const g = GRIPS[k][n]; if (g.like) { const b = GRIPS[k][g.like]; const pose = Object.assign({}, b.pose, { fingers: Object.assign({}, b.pose.fingers, g.index ? { index: g.index } : {}) }); GRIPS[k][n] = Object.assign({}, b, { pose, like: g.like }); } }
  const BAKED = VM.BAKED = {"smg":{"grip":{"curls":{"middle":[1.226,1.4,0.857],"ring":[1.183,1.387,0.847],"little":[0.6,1.387,0.847]},"thumb":[[-0.3791,0.1951,-0.9045],[-0.3659,0.8152,-0.449],[-0.3219,0.9391,-0.1203]]},"fore":{"curls":{"index":[0.76,0.95,0.7],"middle":[0.91,1.135,0.77],"ring":[1.018,1.273,0.866],"little":[1.08,1.32,0.9]},"thumb":[[-0.9441,0.2883,-0.1599],[-0.2474,0.8465,-0.4714],[0.0161,0.8424,-0.5386]]},"mag":{"curls":{"index":[1.126,1.411,0.962],"middle":[1.191,1.494,1.02],"ring":[0.953,1.549,1.058],"little":[0.182,1.452,0.991]},"thumb":[[-0.8291,0.5374,0.1543],[-0.9485,0.3128,-0.0493],[-0.9712,0.2032,-0.1247]]},"charge":{"curls":{"index":[0.35,0.6,0.4],"middle":[0.35,0.6,0.4],"ring":[0.4,0.6,0.4],"little":[0.5,0.6,0.4]},"thumb":[[-0.8644,0.4925,-0.101],[-0.5492,0.2358,-0.8017],[-0.4332,0.1345,-0.8912]]}},"props":{"grenade":{"curls":{"index":[0.824,1.025,0.693],"middle":[0.867,1.08,0.732],"ring":[0.867,1.08,0.732],"little":[0.938,1.107,0.751]},"thumb":[[-0.9117,0.3419,-0.2279],[0.208,0.1293,-0.9695],[0.8416,0,-0.54]]},"binoL":{"curls":{"index":[0.1,1.273,0.866],"middle":[0.1,1.425,0.972],"ring":[0.1,1.728,1.183],"little":[0.15,1.521,1.039]},"thumb":[[-0.8,-0.48,-0.36],[-0.8794,0.4726,-0.0578],[-0.5956,0.7928,0.1293]]},"binoR":{"curls":{"index":[0.1,1.273,0.866],"middle":[0.1,1.425,0.972],"ring":[0.1,1.728,1.183],"little":[0.15,1.521,1.039]},"thumb":[[-0.8,-0.48,-0.36],[-0.8794,0.4726,-0.0578],[-0.5956,0.7928,0.1293]]},"knife":{"curls":{"index":[1.18,1.48,1.01],"middle":[1.234,1.549,1.058],"ring":[1.256,1.577,1.077],"little":[0.55,1.563,1.068]},"thumb":[[-0.7454,0.5963,-0.2981],[-0.7454,0.2981,-0.5963],[-0.7071,0,-0.7071]]}},"pistol":{"grip":{"curls":{"middle":[0.6,0.6,1.25],"ring":[1.216,1.387,0.847],"little":[0.751,1.4,0.857]},"thumb":[[-0.3961,0.1755,-0.9013],[-0.2691,0.8505,-0.452],[-0.1984,0.9727,-0.1203]]},"cup":{"curls":{"index":[0.716,0.887,0.597],"middle":[0.888,1.107,0.751],"ring":[0.899,1.121,0.76],"little":[0.98,1.2,0.82]},"thumb":[[-0.843,0.5377,-0.018],[-0.3931,0.6818,-0.617],[-0.2145,0.6419,-0.7362]]},"mag":{"curls":{"index":[1.5,1.75,1.25],"middle":[0.888,1.107,0.751],"ring":[1.342,1.687,1.154],"little":[1.5,1.75,1.25]},"thumb":[[-0.6317,0.5745,-0.5205],[0.3186,0.693,-0.6467],[0.6129,0.565,-0.5524]]},"slide":{"curls":{"index":[0.932,1.163,0.789],"middle":[0.878,1.094,0.741],"ring":[0.748,0.928,0.626],"little":[0.668,0.762,0.511]},"thumb":[[0.7038,-0.1301,-0.6984],[0.4175,0.5964,-0.6856],[0.0878,0.8398,-0.5358]]}},"rifleScoped":{"grip":{"curls":{"middle":[0.5,0.5,1.25],"ring":[1.224,1.425,0.943],"little":[1.17,1.356,0.895]},"thumb":[[-0.7118,0.0301,-0.7018],[-0.4273,0.7745,-0.4664],[-0.3123,0.9467,0.0785]]},"fore":{"curls":{"index":[0.737,0.914,0.616],"middle":[0.91,1.135,0.77],"ring":[0.996,1.245,0.847],"little":[1.122,1.342,0.914]},"thumb":[[-0.9441,0.2883,-0.1599],[-0.1224,0.837,-0.5334],[0.1683,0.7821,-0.6]]},"mag":{"curls":{"index":[0.543,1.673,1.144],"middle":[0.597,1.75,1.25],"ring":[0.359,1.701,1.164],"little":[1.5,1.75,1.25]},"thumb":[[-0.9117,0.3419,-0.2279],[0.208,0.1293,-0.9695],[0.8416,0,-0.54]]},"bolt":{"curls":{"index":[0.613,0.9,0.578],"middle":[0.732,1.052,0.684]},"thumb":[[-0.7664,0.6351,-0.0962],[-0.2773,0.2558,-0.9261],[0.0547,0.0841,-0.995]]}}};   // BAKED-END

  const _x = new T.Vector3(), _y = new T.Vector3(), _z = new T.Vector3();
  // the hand-to-gun matrix of a grip
  VM.gripMatrix = function (g, out) {
    out = out || new T.Matrix4();
    _y.fromArray(g.fwd).normalize();
    _z.fromArray(g.back); _z.addScaledVector(_y, -_z.dot(_y)).normalize();
    _x.crossVectors(_y, _z).normalize();
    out.makeBasis(_x, _y, _z);
    const a = new T.Vector3().fromArray(g.anchor).applyMatrix4(out);
    out.setPosition(new T.Vector3().fromArray(g.at).sub(a));
    return out;
  };
  // a gun-frame direction in a grip's anatomical hand frame
  VM.gunDirToHand = function (g, d) {
    const M = VM.gripMatrix(g), X = new T.Vector3(), Y = new T.Vector3(), Z = new T.Vector3();
    M.extractBasis(X, Y, Z);
    const v = new T.Vector3().fromArray(d).normalize();
    return [(g.side === 'l' ? -1 : 1) * v.dot(X), v.dot(Y), v.dot(Z)];
  };
  // the hand pose of a grip (with its baked curls unless a solver surface is given)
  VM.gripPose = function (g, kind, name, gunSdf) {
    const pose = Object.assign({ side: g.side }, g.pose);
    if (g.forearmGun) pose.forearm = VM.gunDirToHand(g, g.forearmGun);
    if (g.thumbGun) pose.thumb = Object.assign({}, pose.thumb, { dirs: g.thumbGun.map(d => VM.gunDirToHand(g, d)), nail: g.nailGun ? VM.gunDirToHand(g, g.nailGun) : (pose.thumb || {}).nail, toward: g.towardGun ? VM.gunDirToHand(g, g.towardGun) : (pose.thumb || {}).toward });
    if (gunSdf) {
      const M = VM.gripMatrix(g), p = new T.Vector3();
      const mx = g.side === 'l' ? -1 : 1;   // the solver works in the right hand's frame; a left hand is its mirror
      pose.contact = { gap: 0.0004, sdf: q => gunSdf(p.set(q.x * mx, q.y, q.z).applyMatrix4(M)) };
    } else {
      const b = BAKED[kind] && (BAKED[kind][name] || (g.like && BAKED[kind][g.like]));
      if (b) {
        pose.fingers = Object.assign({}, pose.fingers);
        for (const f in b.curls) if (!(pose.fingers[f] && pose.fingers[f].fixed)) pose.fingers[f] = Object.assign({}, pose.fingers[f], { curl: b.curls[f], fixed: true });
        if (b.thumb) pose.thumb = Object.assign({}, pose.thumb, { dirs: b.thumb, close: false });
      }
    }
    return pose;
  };
  VM.buildGrip = function (g, gunSdf, kind, name) { return H.build(VM.gripPose(g, kind, name, gunSdf)); };

  // ------------------------------------------------------------------ framing (the gun in the eye's frame)
  // hip: the gun's origin (its grip) in the eye frame and its turn [pitch, yaw, roll] (yaw 0 = barrel straight
  // ahead; + turns the muzzle toward the screen centre; pitch - lifts the muzzle; roll - cants the top to the right). ads: how far in front of the eye the rear sight (rifle: the
  // scope's eye point) sits when aimed; the sight line is put exactly on the view axis. sprint: carried low and across
  // (an offset d and turn r [pitch +muzzle down, yaw, roll] of the hip pose, in the gun frame about the grip).
  // pivot: the gun-frame point the clips' turns are about. crouch / prone: small offsets of the hip pose.
  VM.FOV = 54;   // the viewmodel camera's vertical field of view (js/fp.js FP.vmTune.fov reads it)
  const FRAME = VM.FRAME = {
    // sprint: the reference's offsets (gun frame, about the bore point): across the body, muzzle left and down a little
    // scale: the whole viewmodel about the eye (rig units below). hip: fitted on screen (vm-test.html, 16:9, FOV 54) so
    // the muzzle sits about 55 % across and 60 % down and the gun covers about a fifth of the view (SMG about 20 %, rifle
    // about 17 %, pistol 10.9 %), its rear leaving through the bottom right; aimed (ads, rig units) is unchanged on screen
    smg:         { scale: 1.5, hip: { p: [0.0792, -0.0484, -0.19], r: [0.12, -0.02, 0.03] }, ads: 0.29, sprint: { d: [0.035, 0.004, 0.02], r: [0.04, 0.62, -0.26] }, pivot: [0, 0.022, 0.07], crouch: [0.0, 0.008, 0.01], prone: [-0.01, 0.02, -0.01] },
    pistol:      { scale: 1.3, hip: { p: [0.077, -0.0535, -0.25], r: [0.02, 0.22, -0.3] }, ads: 0.46, sprint: { d: [0.035, 0.004, 0.02], r: [0.04, 0.62, -0.26] }, pivot: [0, 0.019, 0.07], crouch: [0.0, 0.008, 0.01], prone: [-0.01, 0.02, -0.01] },
    rifleScoped: { scale: 1.7, hip: { p: [0.0978, -0.0532, -0.18], r: [0.16, -0.1, 0.15] }, ads: 0.10, sprint: { d: [0.035, 0.004, 0.02], r: [0.04, 0.62, -0.26] }, pivot: [0, 0.02, 0.07], crouch: [0.0, 0.008, 0.01], prone: [-0.01, 0.02, -0.01] }
  };

  // ------------------------------------------------------------------ timeline engine
  // A clip: { dur, ev: { name: t }, hold, loop, prop, ch: { channel: [[t, value, ease], ...] } }. Each key's ease
  // shapes the travel from the previous key to it. A channel a clip leaves out keeps the base pose's value; the
  // value 'base' in a key means the base pose's value at that moment. Channel kinds:
  //   vec  numbers lerped (gun offset [x,y,z, pitch,yaw,roll] in the gun frame about its pivot; the magazine's offset;
  //        bolt travel, bolt turn, hammer, trigger, charging handle, hand space, pin, magazine-in-hand)
  //   xf   a rigid place [x,y,z, qx,qy,qz,qw] (the support hand on the gun; the hands in the eye frame), slerped
  //   step a name held until the next key (which build a hand shows; the prop)
  const EASE = {
    lin: k => k,
    in: k => k * k,
    out: k => 1 - (1 - k) * (1 - k),
    io: k => k * k * (3 - 2 * k),
    fast: k => 1 - Math.pow(1 - k, 4),                                   // most of the travel early, a soft arrival
    back: k => { const s = 1.6, j = k - 1; return 1 + j * j * ((s + 1) * j + s); },   // overshoot and come back
    hit: k => k < 0.62 ? 1 - Math.pow(1 - k / 0.62, 3) : 1 - 0.07 * Math.sin(PI * (k - 0.62) / 0.38),   // arrive, a small bounce
    antic: k => k < 0.25 ? -0.12 * Math.sin(PI * k / 0.25) : EASE.fast((k - 0.25) / 0.75)              // a short pull the other way first
  };
  VM.EASE = EASE;
  const CH = {
    gun: { kind: 'vec', n: 6 }, mag: { kind: 'vec', n: 6 }, magHand: { kind: 'vec', n: 1 }, magVis: { kind: 'vec', n: 1 },
    bolt: { kind: 'vec', n: 1 }, boltTurn: { kind: 'vec', n: 1 }, hammer: { kind: 'vec', n: 1 }, trigger: { kind: 'vec', n: 1 }, charging: { kind: 'vec', n: 1 },
    hs: { kind: 'vec', n: 1 }, pin: { kind: 'vec', n: 1 }, pvis: { kind: 'vec', n: 1 }, ph: { kind: 'vec', n: 1 }, gunVis: { kind: 'vec', n: 1 },
    hand: { kind: 'xf', n: 10 }, handE: { kind: 'xf', n: 7 }, phE: { kind: 'xf', n: 7 },
    build: { kind: 'step' }, pbuild: { kind: 'step' }, prop: { kind: 'step' }
  };
  // ph (0..1): the support hand rides the moving part its grip closed on (bolt knob, cocking handle, slide); gunVis: the
  // gun and firing hand drawn (off while the knife or binoculars are up and the gun is out of view)
  const VEC_CH = Object.keys(CH).filter(k => CH[k].kind !== 'step');
  // a pose: one Float32Array per numeric channel and a name per step channel
  function newPose() { const p = {}; for (const k of VEC_CH) p[k] = new Float32Array(CH[k].n); p.build = null; p.pbuild = null; p.prop = null; return p; }
  function copyPose(d, s) { for (const k of VEC_CH) d[k].set(s[k]); d.build = s.build; d.pbuild = s.pbuild; d.prop = s.prop; }
  const _qa = new T.Quaternion(), _qb = new T.Quaternion();
  // A rigid place mixed from a to b. With a forearm direction (elements 7-9, the support hand's sleeve), the
  // forearm swings along the short arc between its two directions and the rest of the turn happens in the hand's own
  // frame, so a 70 cm sleeve never sweeps up through the view the way a plain slerp of the hand swings it.
  const _sw = new T.Quaternion(), _sk = new T.Quaternion(), _dq = new T.Quaternion(), _dk = new T.Quaternion(), _qid = new T.Quaternion(), _fa = new T.Vector3(), _fb = new T.Vector3();
  function mixXf(o, a, b, k, kp) {
    for (let i = 0; i < 3; i++) o[i] = a[i] + (b[i] - a[i]) * (kp == null ? k : kp);
    k = Math.max(0, Math.min(1, k));
    _qa.set(a[3], a[4], a[5], a[6]); _qb.set(b[3], b[4], b[5], b[6]);
    if (o.length >= 10 && a.length >= 10 && b.length >= 10) {
      _fa.set(a[7], a[8], a[9]); _fb.set(b[7], b[8], b[9]);
      _sw.setFromUnitVectors(_fa, _fb);
      _dq.copy(_sw).multiply(_qa).invert().multiply(_qb);            // what is left after the swing, in the hand's frame
      _sk.copy(_qid).slerp(_sw, k); _dk.copy(_qid).slerp(_dq, k);
      _qa.premultiply(_sk).multiply(_dk);
      _fa.applyQuaternion(_sk); o[7] = _fa.x; o[8] = _fa.y; o[9] = _fa.z;
    } else _qa.slerp(_qb, k);
    o[3] = _qa.x; o[4] = _qa.y; o[5] = _qa.z; o[6] = _qa.w;
  }
  function mixPose(o, a, b, k) {   // o = a..b by k (o may be a)
    for (const n of VEC_CH) { const A = a[n], B = b[n], O = o[n]; if (CH[n].kind === 'xf') mixXf(O, A, B, k); else for (let i = 0; i < O.length; i++) O[i] = A[i] + (B[i] - A[i]) * k; }
    if (k >= 0.5) { o.build = b.build; o.pbuild = b.pbuild; o.prop = b.prop; } else { o.build = a.build; o.pbuild = a.pbuild; o.prop = a.prop; }
  }
  // sample one channel's keys at t into out (base: the base pose's array for 'base' keys)
  function sampleCh(keys, t, out, base, kind) {
    let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
    const a = keys[i], va = a[1] === 'base' ? base : a[1];
    if (kind === 'step') return va;
    if (i === keys.length - 1 || t <= a[0]) { out.set(va); return out; }
    const b = keys[i + 1], vb = b[1] === 'base' ? base : b[1], k = (EASE[b[2] || 'io'])((t - a[0]) / Math.max(1e-6, b[0] - a[0]));
    if (kind === 'xf') mixXf(out, va, vb, k, k);
    else for (let j = 0; j < out.length; j++) out[j] = va[j] + (vb[j] - va[j]) * k;
    return out;
  }
  function sampleClip(clip, t, base, out) {
    for (const n of VEC_CH) { const keys = clip.ch[n]; if (keys) sampleCh(keys, t, out[n], base[n], CH[n].kind); else out[n].set(base[n]); }
    for (const n of ['build', 'pbuild', 'prop']) { const keys = clip.ch[n]; out[n] = keys ? sampleCh(keys, t, null, base[n], 'step') : base[n]; }
    return out;
  }
  VM.sampleClip = sampleClip; VM.newPose = newPose;

  // ------------------------------------------------------------------ key helpers (used by the clip tables)
  const _e = new T.Euler(), _m1 = new T.Matrix4(), _m2 = new T.Matrix4(), _p = new T.Vector3(), _q = new T.Quaternion(), _s = new T.Vector3(1, 1, 1);
  function xfOf(m) { m.decompose(_p, _q, _s); return [_p.x, _p.y, _p.z, _q.x, _q.y, _q.z, _q.w]; }
  // a support-hand place on the gun: grip g of this gun, moved by d (gun frame) and turned by r (hand frame, about the wrist)
  function G(grips, g, d, r) {
    const gr = grips[g], m0 = VM.gripMatrix(gr), m = m0.clone();
    if (r) m.multiply(_m1.makeRotationFromEuler(_e.set(r[0], r[1], r[2], 'YXZ')));
    if (d) m.premultiply(_m1.makeTranslation(d[0], d[1], d[2]));
    // the sleeve's direction on the gun (for mixXf): the grip's forearm in the hand's frame, turned with the hand
    const f = new T.Vector3();
    if (gr.forearmGun) f.fromArray(gr.forearmGun).normalize().transformDirection(_m2.copy(m0).invert());
    else { const fa = (gr.pose && gr.pose.forearm) || [0, -1, 0]; f.set(fa[0] * (gr.side === 'l' ? -1 : 1), fa[1], fa[2]).normalize(); }
    f.transformDirection(m);
    return xfOf(m).concat([f.x, f.y, f.z]);
  }
  // a place in the eye frame
  function E(p, r) { _q.setFromEuler(_e.set(r[0], r[1], r[2], 'YXZ')); return [p[0], p[1], p[2], _q.x, _q.y, _q.z, _q.w]; }
  VM.G = G; VM.E = E;


  // ------------------------------------------------------------------ clips
  // Durations and event times are the old arms rig's (js/weapons.js and js/fp.js wait for these events).
  // Gun offsets are [x, y, z, pitch, yaw, roll] in the gun frame (+x its left side, toward the screen centre; pitch
  // + is muzzle down; roll + lifts its left side) about FRAME[kind].pivot.
  const Z6 = [0, 0, 0, 0, 0, 0];
  const CLIPCACHE = {};
  function clipsFor(kind, grips) {
    if (CLIPCACHE[kind]) return CLIPCACHE[kind];
    const g = (n, d, r) => G(grips[n] ? grips : PROPGRIPS, n, d, r);
    const base = grips.base || 'fore';
    const C = {};
    // ---- shots
    const kick = kind === 'pistol' ? [0, 0.004, -0.02, -0.09, 0.01, 0.02] : kind === 'rifleScoped' ? [0, 0.006, -0.03, -0.07, 0.01, 0.02] : [0, 0.002, -0.012, -0.025, 0.004, 0.006];
    const fireLen = { smg: 0.11, pistol: 0.3, rifleScoped: 0.45 }[kind];
    function fire(scale) {
      const k = kick.map(v => v * scale), ch = {
        gun: [[0, Z6], [0.02, k, 'fast'], [fireLen, Z6, 'io']],
        trigger: [[0, [0]], [0.012, [1], 'fast'], [fireLen * 0.6, [1]], [fireLen, [0], 'io']]
      };
      if (kind === 'smg') ch.bolt = [[0, [0]], [0.03, [0.045], 'fast'], [0.075, [0], 'in']];
      if (kind === 'pistol') { ch.bolt = [[0, [0]], [0.035, [0.028], 'fast'], [0.09, [0], 'hit']]; ch.hammer = [[0, [0]], [0.03, [0.9], 'fast'], [0.09, [0.9]], [0.3, [0.9]]]; }
      return { dur: fireLen, ev: { shot: 0.02 }, ch };
    }
    C.fire = fire(1); C.fireAds = fire(0.6);
    // ---- draw / holster / sprint edges
    const low = [0.0, -0.22, -0.06, 0.65, 0.15, -0.35];
    C.draw = { dur: 0.65, ev: { ready: 0.6 }, ch: { gun: [[0, low], [0.42, [0, 0.005, 0, -0.035, 0, 0.02], 'fast'], [0.65, Z6, 'io']] } };
    C.holster = { dur: 0.5, ev: {}, ch: { gun: [[0, Z6], [0.08, [0, 0.008, 0, -0.04, 0, 0], 'out'], [0.5, low, 'in']] } };
    C.sprintIn = { dur: 0.3, ev: {}, ch: {} }; C.sprintOut = { dur: 0.3, ev: {}, ch: {} };
    // ---- reloads with a detachable magazine
    if (grips.mag) {
      // the reference's reload pose: up, muzzle up, rolled so the well faces the eye; the pistol its own: kept up and to
      // the right of the crosshair, muzzle up and turned in a little, rolled less
      const cant = (VM.RELOADCANT[kind] || VM.RELOADCANT.other).slice();
      const cantB = cant.slice(); cantB[1] += 0.008; cantB[3] -= 0.04; cantB[5] += 0.03;
      const away = kind === 'pistol' ? [0.05, -0.32, 0.05] : [0.05, -0.30, 0.08];   // where the hand goes for the fresh one: down and out of view
      const R = (dur, extra) => {
        const c = { dur, ev: { magOut: 0.6, magIn: 1.62, done: dur - 0.1 }, ch: {
          gun: [[0, Z6], [0.2, cant, 'antic'], [0.6, cant], [0.64, cantB, 'fast'], [0.75, cant, 'io'], [1.5, cant], [1.62, cantB, 'hit'], [1.74, cant, 'io']],
          hand: [[0, 'base'], [0.06, 'base'], [0.3, g('mag', [0, -0.012, 0]), 'fast'], [0.38, g('mag'), 'out'], [0.6, g('mag', [0, -0.11, 0]), 'fast'], [0.95, g('mag', away), 'in'],
            [1.2, g('mag', [away[0] * 0.8, away[1] * 0.9, away[2]])], [1.5, g('mag', [0, -0.07, 0]), 'fast'], [1.62, g('mag'), 'hit'], [1.72, g('mag', [0.004, -0.02, 0]), 'out']],
          build: [[0, base], [0.14, 'mag'], [0.97, 'grenade'], [1.13, 'mag']],   // a closed hand while it is away for the fresh one
          magHand: [[0, [0]], [0.38, [0]], [0.4, [1], 'lin'], [1.63, [1]], [1.66, [0], 'lin']],
          magVis: [[0, [1]], [0.97, [1]], [0.98, [0]], [1.15, [0]], [1.16, [1]]]
        } };
        if (kind === 'pistol') {   // the empty magazine drops free; the hand brings a fresh one
          c.ch.magHand = [[0, [0]], [1.15, [0]], [1.16, [1]], [1.63, [1]], [1.66, [0], 'lin']];
          c.ch.mag = [[0, Z6], [0.42, Z6], [0.6, [0, -0.06, 0, 0, 0, 0], 'in'], [0.9, [0, -0.5, 0.05, 0.5, 0, 0.3], 'in'], [0.91, Z6]];
          c.ch.magVis = [[0, [1]], [0.89, [1]], [0.9, [0]], [1.15, [0]], [1.16, [1]]];
          c.ch.hand = [[0, 'base'], [0.25, g('mag', away), 'fast'], [1.2, g('mag', [away[0] * 0.8, away[1] * 0.9, away[2]])], [1.5, g('mag', [0, -0.06, 0]), 'fast'], [1.62, g('mag'), 'hit'], [1.72, g('mag', [0, -0.02, 0]), 'out']];
          c.ch.build = [[0, base], [0.2, 'grenade'], [1.1, 'mag']];
        }
        extra(c);
        return c;
      };
      const back = (c, t0, t1) => { c.ch.gun.push([t0, cant], [t1 - 0.12, [0, 0, 0, 0.02, 0, -0.03], 'io'], [t1, Z6, 'io']); c.ch.hand.push([t0, c.ch.hand[c.ch.hand.length - 1][1]], [t1 - 0.1, 'base', 'fast']); c.ch.build.push([t0 + 0.08, base]); };
      C.reload = R(kind === 'pistol' ? 1.9 : 2.5, c => back(c, 1.75, c.dur - 0.12));
      if (kind === 'smg') C.reloadEmpty = R(3.05, c => {
        c.ev.boltBack = 2.8;
        const cr = [0.0, 0.0, 0.0, 0.16, 0.0, -0.62];
        c.ch.gun.push([2.0, cr, 'io'], [2.8, cr], [2.84, [0, 0.003, -0.004, 0.14, 0, -0.64], 'fast'], [3.0, Z6, 'io']);
        c.ch.hand.push([1.8, g('mag', [0.01, -0.04, 0])], [2.15, g('charge', [-0.01, -0.03, 0.012]), 'fast'], [2.24, g('charge'), 'out'], [2.55, g('charge', [0, 0, -0.065]), 'fast'], [2.8, g('charge', [0, 0.004, -0.065])], [2.86, g('charge', [-0.01, -0.04, -0.06]), 'fast'], [3.0, 'base', 'fast']);
        c.ch.build.push([1.85, 'charge'], [2.9, base]);
        c.ch.charging = [[0, [0]], [2.24, [0]], [2.55, [0.065], 'fast'], [2.8, [0.065]], [2.83, [0], 'fast']];
        c.ch.ph = [[0, [0]], [2.24, [0]], [2.25, [1], 'lin'], [2.79, [1]], [2.81, [0], 'lin']];
        c.ch.bolt = [[0, [0]], [2.24, [0]], [2.55, [0.06], 'fast'], [2.8, [0.06]], [2.83, [0], 'fast']];
      });
      if (kind === 'pistol') C.reloadEmpty = R(2.45, c => {
        // the slide was locked back: the support thumb drops the slide stop and it runs home (a hand reaching over the
        // slide this close to the eye drew a forearm across half the view); the gun tips with it, low and right
        c.ev.slide = 2.1;
        back(c, 1.75, 1.95);
        c.ch.gun.push([2.02, [-0.01, -0.01, 0.0, 0.05, 0.08, 0.1], 'io'], [2.1, [-0.01, -0.007, -0.004, 0.03, 0.08, 0.12], 'hit'], [2.35, Z6, 'io']);
        c.ch.bolt = [[0, [0.028]], [2.09, [0.028]], [2.11, [0], 'fast']];
      });
    }
    if (kind === 'rifleScoped') {
      // the bolt: lift, back (case out), forward, down; the support hand works it, the gun rolls the handle up a little
      const cr = [0.0, -0.04, 0.10, 0.16, 0.0, -0.62], crB = [0.0, -0.037, 0.096, 0.14, 0.0, -0.64], up = -1.05, tr = 0.075;   // bolt racking: rolled the handle up, and out and down a little so the hand over the top stays small
      const boltKeys = (t0, ev) => {
        const h = (d, tt, e) => [t0 + tt, g('bolt', d), e];
        return {
          gun: [[t0, Z6], [t0 + 0.2, cr, 'io'], [t0 + 0.84, cr], [t0 + 0.88, crB, 'hit'], [t0 + 1.02, Z6, 'io']],
          hand: [[t0, 'base'], [t0 + 0.07, g(base, [0.03, -0.16, -0.06]), 'in'], h([0.03, -0.17, 0.0], 0.15, 'io'), h([-0.01, -0.03, 0.01], 0.22, 'fast'), h([0, 0, 0], 0.27, 'out'), h([0, 0.022, 0], 0.32, 'fast'), h([0, 0.022, -tr], 0.5, 'fast'), h([0, 0.022, -tr], 0.56), h([0, 0.022, 0], 0.7, 'hit'), h([0, 0, 0], 0.84, 'fast'), h([-0.01, -0.04, 0.01], 0.9, 'fast'), [t0 + 1.04, 'base', 'fast']],
          build: [[t0, base], [t0 + 0.09, 'bolt'], [t0 + 0.9, base]],
          ph: [[t0, [0]], [t0 + 0.27, [0]], [t0 + 0.29, [1], 'lin'], [t0 + 0.84, [1]], [t0 + 0.86, [0], 'lin']],
          boltTurn: [[t0, [0]], [t0 + 0.27, [0]], [t0 + 0.32, [up], 'fast'], [t0 + 0.7, [up]], [t0 + 0.84, [0], 'hit']],
          bolt: [[t0, [0]], [t0 + 0.32, [0]], [t0 + 0.5, [tr], 'fast'], [t0 + 0.56, [tr]], [t0 + 0.7, [0], 'hit']]
        };
      };
      C.boltCycle = { dur: 1.05, ev: { boltUp: 0.3, boltBack: 0.5, eject: 0.52, boltForward: 0.7, boltDown: 0.84 }, ch: boltKeys(0) };
      if (C.reload) {
        const r = C.reload, bk = boltKeys(2.25), ch = {};
        // the empty reload: the magazine as in reload, then the bolt (back at 2.8)
        C.reloadEmpty = { dur: 3.35, ev: { magOut: 0.6, magIn: 1.62, boltBack: 2.8, done: 3.25 }, ch: {} };
        for (const n in r.ch) C.reloadEmpty.ch[n] = r.ch[n].filter(k => k[0] <= 1.8);
        for (const n in bk) C.reloadEmpty.ch[n] = (C.reloadEmpty.ch[n] || []).concat(bk[n].map(k => k));
        // the bolt's own events inside the empty reload (2.25 + 0.55 = 2.8 back)
        C.reloadEmpty.ch.bolt = [[0, [0]], [2.25 + 0.32, [0]], [2.8, [tr], 'fast'], [2.86, [tr]], [3.0, [0], 'hit']];
        C.reloadEmpty.ch.boltTurn = [[0, [0]], [2.25 + 0.27, [0]], [2.25 + 0.32, [up], 'fast'], [3.0, [up]], [3.12, [0], 'hit']];
        C.reloadEmpty.ch.hand = C.reloadEmpty.ch.hand.filter(k => k[0] < 2.25).concat([[1.95, g('mag', [0.01, -0.05, 0])], [2.2, g('mag', [0.03, -0.2, -0.05]), 'in'], [2.38, g('bolt', [0.03, -0.17, 0]), 'io'], [2.47, g('bolt', [-0.01, -0.03, 0.01]), 'fast'], [2.52, g('bolt'), 'out'], [2.57, g('bolt', [0, 0.022, 0]), 'fast'], [2.8, g('bolt', [0, 0.022, -tr]), 'fast'], [2.86, g('bolt', [0, 0.022, -tr])], [3.0, g('bolt', [0, 0.022, 0]), 'hit'], [3.12, g('bolt'), 'fast'], [3.18, g('bolt', [-0.01, -0.04, 0.01]), 'fast'], [3.32, 'base', 'fast']]);
        C.reloadEmpty.ch.gun = r.ch.gun.filter(k => k[0] <= 1.8).concat([[2.3, cr, 'io'], [3.12, cr], [3.16, crB, 'hit'], [3.33, Z6, 'io']]);
        C.reloadEmpty.ch.build = [[0, base], [0.14, 'mag'], [0.97, 'grenade'], [1.13, 'mag'], [2.28, 'bolt'], [3.2, base]];
        C.reloadEmpty.ch.ph = [[0, [0]], [2.52, [0]], [2.54, [1], 'lin'], [3.12, [1]], [3.14, [0], 'lin']];
      }
    }
    if (kind === 'smg') C.charge = { dur: 0.75, ev: { charge: 0.36 }, ch: {
      gun: [[0, Z6], [0.15, [0, 0, 0, 0.16, 0, -0.62], 'io'], [0.36, [0, 0, 0, 0.16, 0, -0.62]], [0.4, [0, 0.003, -0.004, 0.14, 0, -0.64], 'fast'], [0.72, Z6, 'io']],
      hand: [[0, 'base'], [0.18, g('charge', [-0.01, -0.03, 0.012]), 'fast'], [0.24, g('charge'), 'out'], [0.34, g('charge', [0, 0, -0.065]), 'fast'], [0.4, g('charge', [-0.01, -0.04, -0.06]), 'fast'], [0.68, 'base', 'fast']],
      build: [[0, base], [0.06, 'charge'], [0.5, base]],
      ph: [[0, [0]], [0.24, [0]], [0.25, [1], 'lin'], [0.37, [1]], [0.39, [0], 'lin']],
      charging: [[0, [0]], [0.24, [0]], [0.34, [0.065], 'fast'], [0.36, [0.065]], [0.39, [0], 'fast']],
      bolt: [[0, [0]], [0.24, [0]], [0.34, [0.06], 'fast'], [0.36, [0.06]], [0.39, [0], 'fast']] } };
    // ---- things in the support hand while the gun is lowered
    const down = [-0.02, -0.11, 0.0, 0.32, -0.12, -0.25];
    const gHold = E([0.03, -0.19, -0.40], [0.5, -0.4, 0.2]), gLow = E([0.0, -0.45, -0.3], [0.2, -0.3, 0.6]);
    C.grenadePull = { dur: 0.66, ev: { pin: 0.62 }, hold: true, prop: 'grenade', ch: {
      gun: [[0, Z6], [0.3, down, 'fast']], hs: [[0, [0]], [0.04, [0]], [0.3, [1], 'io']], handE: [[0, gLow], [0.3, gHold, 'fast'], [0.5, gHold], [0.6, E([0.04, -0.18, -0.41], [0.6, -0.35, 0.3]), 'fast'], [0.66, gHold, 'out']],
      build: [[0, 'grenade']], prop: [[0, 'grenade']], pin: [[0, [0]], [0.62, [1]]] } };
    C.grenadeCook = { dur: 1.0, ev: {}, loop: true, prop: 'grenade', ch: {
      gun: [[0, down]], hs: [[0, [1]]], handE: [[0, gHold], [0.5, E([0.03, -0.185, -0.40], [0.48, -0.4, 0.22])], [1.0, gHold]], build: [[0, 'grenade']], prop: [[0, 'grenade']], pin: [[0, [1]]] } };
    const wind = E([0.16, -0.15, -0.38], [0.8, -0.3, 0.6]), rel = E([0.1, -0.15, -0.5], [-0.3, -0.1, 0.1]);
    const throwCh = (t0) => ({
      gun: [[t0, down], [t0 + 0.55, down], [t0 + 0.85, Z6, 'io']],
      hs: [[t0, [1]], [t0 + 0.6, [1]], [t0 + 0.85, [0], 'io']],
      handE: [[t0, gHold], [t0 + 0.22, wind, 'io'], [t0 + 0.38, rel, 'fast'], [t0 + 0.6, E([0.02, -0.45, -0.4], [-0.8, 0, 0]), 'in']],
      build: [[t0, 'grenade'], [t0 + 0.4, 'flat'], [t0 + 0.62, base]], prop: [[t0, 'grenade'], [t0 + 0.38, null]], pin: [[t0, [1]]]
    });
    C.grenadeThrow = { dur: 0.89, ev: { release: 0.38, done: 0.8 }, prop: 'grenade', ch: throwCh(0) };
    {
      const p = C.grenadePull.ch, th = throwCh(0.66), ch = {};
      for (const n in th) ch[n] = (p[n] || []).concat(th[n]);
      C.grenade = { dur: 1.55, ev: { pin: 0.62, release: 1.04, done: 1.45 }, prop: 'grenade', ch };
    }
    // ---- the interact reach (flat hand forward), knife takedown, binoculars
    const reach = E([-0.04, -0.07, -0.46], [0.15, 0.15, -0.6]);
    C.interact = { dur: 0.9, ev: { touch: 0.45 }, ch: {
      gun: [[0, Z6], [0.25, [0, -0.05, 0, 0.22, -0.05, -0.1], 'io'], [0.62, [0, -0.05, 0, 0.22, -0.05, -0.1]], [0.9, Z6, 'io']],
      hs: [[0, [0]], [0.06, [0]], [0.3, [1], 'io'], [0.62, [1]], [0.85, [0], 'io']],
      handE: [[0, E([-0.06, -0.3, -0.3], [0, 0, 0])], [0.3, E([-0.05, -0.1, -0.36], [0.1, 0.1, -0.5]), 'fast'], [0.45, reach, 'hit'], [0.62, E([-0.05, -0.12, -0.38], [0.1, 0.1, -0.5])], [0.85, E([-0.06, -0.3, -0.3], [0, 0, 0]), 'in']],
      build: [[0, base], [0.12, 'flat'], [0.7, base]] } };
    const away = [0.02, -0.3, 0.0, 0.7, -0.3, -0.4];
    C.melee = { dur: 0.8, ev: { hit: 0.32 }, prop: 'knife', ch: {
      gun: [[0, Z6], [0.12, away, 'fast'], [0.6, away], [0.8, Z6, 'io']], gunVis: [[0, [1]], [0.13, [0]], [0.6, [1]]],
      hs: [[0, [0]], [0.1, [1], 'io'], [0.7, [1]], [0.8, [0]]], handE: [[0, E([-0.1, -0.4, -0.25], [0, 0, 0])]],
      pvis: [[0, [1]], [0.78, [1]], [0.79, [0]]], pbuild: [[0, 'knife']], prop: [[0, 'knife']],
      phE: [[0, E([0.14, -0.38, -0.22], [0.6, 0.3, -0.4])], [0.18, E([0.13, -0.14, -0.34], [0.9, 0.2, -0.9]), 'fast'], [0.32, E([0.05, -0.14, -0.55], [-0.2, 0.1, -1.2]), 'fast'], [0.5, E([0.06, -0.15, -0.53], [-0.15, 0.1, -1.2])], [0.78, E([0.12, -0.4, -0.3], [0.4, 0.2, -0.6]), 'in']] } };
    // binoculars: both hands raise them to the eyes; held there until binocularsLower
    if (PROPGRIPS.binoL) {
      const bAt = (p, r) => { const m = new T.Matrix4().compose(new T.Vector3().fromArray(p), new T.Quaternion().setFromEuler(_e.set(r[0], PI + r[1], r[2], 'YXZ')), new T.Vector3(1, 1, 1)); m.multiply(VM.gripMatrix(PROPGRIPS.binoL)); return xfOf(m); };
      const bEye = bAt([0, -0.012, 0.03], [0, 0, 0]), bLow = bAt([0.0, -0.38, -0.25], [0.8, 0, 0]), bMid = bAt([0.0, -0.1, -0.24], [0.3, 0, 0]), bNear = bAt([0.0, -0.065, -0.15], [0.2, 0, 0]);
      C.binoculars = { dur: 1.0, ev: { atEye: 0.85 }, hold: true, prop: 'binoculars', ch: {
        gun: [[0, Z6], [0.3, away, 'fast']], hs: [[0, [0]], [0.15, [1], 'io']], handE: [[0, bLow], [0.68, bLow], [0.85, bNear, 'fast'], [1.0, bEye, 'io']], gunVis: [[0, [1]], [0.3, [0]]],
        build: [[0, 'binoL']], prop: [[0, 'binoculars']], pvis: [[0, [1]]], pbuild: [[0, 'binoR']] } };
      C.binocularsLower = { dur: 1.0, ev: {}, prop: 'binoculars', ch: {
        gun: [[0, away], [0.6, away], [1.0, Z6, 'io']], hs: [[0, [1]], [0.75, [1]], [0.95, [0], 'io']], handE: [[0, bEye], [0.35, bMid, 'io'], [0.7, bLow, 'in']], gunVis: [[0, [0]], [0.6, [1]]],
        build: [[0, 'binoL'], [0.7, base]], prop: [[0, 'binoculars'], [0.72, null]], pvis: [[0, [1]], [0.72, [0]]], pbuild: [[0, 'binoR']] } };
    }
    // compile: key values to typed arrays; check every key's channel
    for (const n in C) {
      const c = C[n];
      for (const ch in c.ch) {
        if (!CH[ch]) throw new Error('vm clip ' + n + ': unknown channel ' + ch);
        c.ch[ch] = c.ch[ch].map(k => [k[0], k[1] === 'base' || k[1] == null || typeof k[1] === 'string' ? k[1] : Float32Array.from(k[1]), k[2]]);
        c.ch[ch].sort((a, b) => a[0] - b[0]);
      }
    }
    return (CLIPCACHE[kind] = C);
  }

  // ------------------------------------------------------------------ the vm object
  const CACHE = {};   // built hand geometries by key (shared by every vm)
  const MATCACHE = {};   // the viewmodel's weapon material copies, per gun
  function handGeo(key, mk) { return CACHE[key] || (CACHE[key] = mk()); }
  VM.clearCache = function () { for (const k in CACHE) delete CACHE[k]; for (const k in CLIPCACHE) delete CLIPCACHE[k]; };   // tests: after editing GRIPS / FRAME
  const _v = new T.Vector3(), _v2 = new T.Vector3(), _q2 = new T.Quaternion(), _mg = new T.Matrix4(), _mh = new T.Matrix4(), _mE = new T.Matrix4();
  const _pa = new T.Vector3(), _pb = new T.Vector3(), _qa2 = new T.Quaternion(), _qb2 = new T.Quaternion();
  function mixMatrix(out, a, b, k) {
    a.decompose(_pa, _qa2, _s); b.decompose(_pb, _qb2, _s);
    _pa.lerp(_pb, k); _qa2.slerp(_qb2, k);
    return out.compose(_pa, _qa2, _s.set(1, 1, 1));
  }
  // the aimed pose: rear sight (or scope eye) on the view axis at the eye relief, sight line along -Z, gun upright
  function adsPose(kind, gun, dist, outP, outQ) {
    const f = n => gun.getObjectByName(kind + '_' + n);
    const rear = f('scopeEye') || f('sightRear'), front = f('sightFront');
    const r = rear ? rear.position.clone() : new T.Vector3(0, 0.05, 0), d = new T.Vector3(0, 0, 1);
    if (!f('scopeEye') && front) d.copy(front.position).sub(r).normalize();
    const u = new T.Vector3(0, 1, 0); u.addScaledVector(d, -u.dot(d)).normalize();
    const x = new T.Vector3().crossVectors(u, d);
    const Mg = new T.Matrix4().makeBasis(x, u, d), Mt = new T.Matrix4().makeBasis(new T.Vector3(-1, 0, 0), new T.Vector3(0, 1, 0), new T.Vector3(0, 0, -1));
    outQ.setFromRotationMatrix(Mt.multiply(Mg.transpose()));
    outP.set(0, 0, -dist).sub(r.applyQuaternion(outQ));
  }
  function framePose(fr, outP, outQ) { outP.fromArray(fr.p); outQ.setFromEuler(_e.set(fr.r[0], PI + fr.r[1], fr.r[2], 'YXZ')); }

  // the viewmodel's copies of the gun materials: a light darkening (the models carry their own wear, dust and stamps,
  // which a heavier one crushed into a black mirror) and a little more of the arms' sky cube on steel; roughness as modelled
  // the reload pose, an offset of the hip pose in the gun frame [x, y, z, pitch, yaw, roll] (see the clips): up, muzzle
  // up, rolled so the magazine well faces the eye
  VM.RELOADCANT = { pistol: [-0.04, 0.08, 0.0, -0.85, 0.15, 0.6], other: [0.03, 0.04, 0.12, -0.46, 0.22, 0.80] };
  VM.HANDFADE = [2, 3];   // the ads progress over which the hands would fade out: never (an aimed gun with no hands on it read as
                         // floating); the aimed poses keep both hands below the sight line instead (vm-test checks handTopPx)
  VM.MATTUNE = { metal: 0.8, other: 0.85, env: 1.2 };
  VM.create = function (kind, opts) {
    opts = opts || {};
    const mkWeapon = opts.weapon || (k => window.IVChars && IVChars.weapon(k));
    const grips = GRIPS[kind], fr = FRAME[kind];
    if (!grips || !fr) return null;
    const gun = mkWeapon(kind); if (!gun) return null;
    // this vm's own copies of the glove and sleeve materials (shared maps): aimed, both hands fade out by opacity
    const M0 = H.materials(), M = { glove: M0.glove.clone(), sleeve: M0.sleeve.clone() };
    M.sleeve.alphaHash = false;
    const group = new T.Group(); group.name = 'vm_' + kind;
    // rig: everything below, scaled about the eye by FRAME[kind].scale. A scale about the eye alone changes nothing on
    // screen; with the hip pose given in the rig's own units it draws the gun and hands that much bigger at the same
    // place (the aimed view, whose sight sits on the axis, and the eye-frame props look exactly as unscaled)
    const rig = new T.Group(); rig.name = 'vm_rig'; rig.scale.setScalar(fr.scale || 1); group.add(rig);
    const gunNode = new T.Group(); gunNode.matrixAutoUpdate = false; rig.add(gunNode); gunNode.add(gun);
    gun.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } if (/_sling$/.test(o.name)) o.visible = false; });
    // the viewmodel's own copies of the gun's materials (made once per gun, cached, VM.MATTUNE): steel reflects the arms'
    // sky cube a little harder, so its edges catch light; the world
    // models keep theirs. copy() resets defines, so they are carried over.
    const mc = MATCACHE[kind] || (MATCACHE[kind] = new Map());   // (opts.rawMaterials: the gun's own, for comparison)
    gun.traverse(o => {
      if (!o.isMesh) return;
      const MT = VM.MATTUNE;
      const one = m0 => { if (opts.rawMaterials) return m0; if (!mc.has(m0)) { const m = m0.clone(); m.defines = Object.assign({}, m0.defines || {}, m.defines || {}); if (m.metalnessMap || m.metalness > 0.3) { m.envMapIntensity = MT.env; m.color.multiplyScalar(MT.metal); } else m.color.multiplyScalar(MT.other); mc.set(m0, m);  /* dark blued steel, dark walnut */ } return mc.get(m0); };
      o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
    });
    const find = n => gun.getObjectByName(kind + '_' + n) || null;
    // moving parts and their rest
    const parts = {};
    for (const n of ['bolt', 'mag', 'trigger', 'hammer', 'charging']) { const o = find(n); if (o) parts[n] = { o, p: o.position.clone(), q: o.quaternion.clone() }; }
    // the magazine is moved in the eye frame (it can leave with the hand): taken off the gun into the group
    let magRest = null;
    if (parts.mag) { const o = parts.mag.o; gun.updateMatrixWorld(true); magRest = o.matrix.clone(); o.parent.remove(o); rig.add(o); o.matrixAutoUpdate = false; }
    // --- hands
    const sideMesh = (geo) => { const m = new T.Mesh(geo.clone(), [M.glove, M.sleeve]); m.frustumCulled = false; m.matrixAutoUpdate = false; return m; };
    const gb = (name, src) => handGeo(kind + ':' + name, () => VM.buildGrip(src || grips[name], null, kind, name));
    // firing hand: fixed to the gun at its grip; trigger finger resting / pressed
    const fR = gb('grip'), fRp = grips.gripPress ? gb('gripPress') : fR;
    const handR = sideMesh(fR.geometry); handR.matrix.copy(VM.gripMatrix(grips.grip)); gunNode.add(handR); handR.name = 'vm_handR';
    // support hand: every build it can show (same topology), drawn at the 'hand' channel's place
    const sBuilds = {};
    for (const n in grips) if (grips[n].side === 'l') sBuilds[n] = gb(n);
    for (const n in PROPGRIPS) if (PROPGRIPS[n].side === 'l') sBuilds[n] = handGeo('prop:' + n, () => VM.buildGrip(PROPGRIPS[n], null, 'props', n));
    const baseB = grips.base || 'fore';
    const handL = sideMesh(sBuilds[baseB].geometry); rig.add(handL); handL.name = 'vm_handL';
    // right hand alone (knife, binoculars), only while the gun is away
    const pBuilds = {};
    for (const n in PROPGRIPS) if (PROPGRIPS[n].side === 'r') pBuilds[n] = handGeo('prop:' + n, () => VM.buildGrip(PROPGRIPS[n], null, 'props', n));
    const firstP = Object.keys(pBuilds)[0];
    const handP = firstP ? sideMesh(pBuilds[firstP].geometry) : null; if (handP) { handP.visible = false; rig.add(handP); handP.name = 'vm_handP'; }
    // props: grenade, rock, binoculars (in the support hand), knife (in the right hand)
    const props = {}, propIn = {};
    for (const k of ['grenade', 'binoculars', 'knife']) { const o = mkWeapon(k); if (!o) continue; o.matrixAutoUpdate = false; o.visible = false; o.traverse(m => { if (m.isMesh) m.frustumCulled = false; }); rig.add(o); props[k] = o; }
    props.rock = rockMesh(); props.rock.visible = false; rig.add(props.rock);
    for (const n in PROPGRIPS) propIn[n] = new T.Matrix4().copy(VM.gripMatrix(PROPGRIPS[n])).invert();   // object frame in the hand's frame
    const pin = props.grenade && props.grenade.getObjectByName('grenade_pin');
    const propSocket = new T.Object3D(); propSocket.matrixAutoUpdate = false; rig.add(propSocket);
    // magazine in the hand: its place relative to the hand's 'mag' build, from the grip
    const magInHand = grips.mag && magRest ? new T.Matrix4().copy(VM.gripMatrix(grips.mag)).invert().multiply(magRest) : null;
    // a grip that closes on a moving part: the hand's place relative to that part at rest
    const partGrip = {};
    for (const n in grips) { const g = grips[n]; if (g && g.part && parts[g.part]) { const po = parts[g.part].o; po.updateMatrix(); partGrip[g.part] = { o: po, inv: new T.Matrix4().copy(po.matrix).invert(), k: new T.Vector3().fromArray(g.at), kk: new T.Vector3(), grip: VM.gripMatrix(g) }; } }
    const partOf = { smg: 'charging', rifleScoped: 'bolt', pistol: 'bolt' }[kind];

    // --- poses
    const clips = clipsFor(kind, grips);
    const base = newPose(), out = newPose(), from = newPose(), smp = newPose();
    base.hand.set(G(grips, baseB)); base.handE.set(base.hand.subarray(0, 7)); base.phE.set(E([0.1, -0.4, -0.3], [0, 0, 0]));
    base.build = baseB; base.pbuild = firstP || null; base.magVis[0] = 1; base.gunVis[0] = 1;
    const hipP = new T.Vector3(), hipQ = new T.Quaternion(), adsP = new T.Vector3(), adsQ = new T.Quaternion(), sprP = new T.Vector3(), sprQ = new T.Quaternion();
    framePose(fr.hip, hipP, hipQ); adsPose(kind, gun, fr.ads, adsP, adsQ);
    const pivot = new T.Vector3().fromArray(fr.pivot);
    {   // sprint: the hip pose moved and turned in the gun's own frame about the pivot
      const sp = fr.sprint, Mh = new T.Matrix4().compose(hipP, hipQ, new T.Vector3(1, 1, 1));
      const Mo = new T.Matrix4().makeTranslation(sp.d[0] + pivot.x, sp.d[1] + pivot.y, sp.d[2] + pivot.z).multiply(new T.Matrix4().makeRotationFromEuler(new T.Euler(sp.r[0], sp.r[1], sp.r[2], 'YXZ'))).multiply(new T.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));   // about the bore point
      Mh.multiply(Mo).decompose(sprP, sprQ, new T.Vector3());
    }
    const bP = new T.Vector3(), bQ = new T.Quaternion();
    // --- state
    let handsOn = true, fadeK2 = -1, cur = null, curName = null, t = 0, speed = 1, loop = false, fadeIn = 1, fadeK = 1, outK = 0, outFade = 0.12, stopping = false, propKind = 'grenade';
    const st = { ads: 0, sprint: 0, crouch: 0, prone: 0 };
    // build blends
    const bl = { L: { cur: baseB, to: baseB, k: 1, from: null }, R: { press: 0, shown: 0 }, P: { cur: firstP, to: firstP, k: 1, from: null } };
    function setBuild(slot, mesh, builds, name) {
      const b = bl[slot]; if (!name || !builds[name] || name === b.to) return;
      // start from what is drawn now (mid-blend included)
      b.from = b.from || { p: new Float32Array(mesh.geometry.attributes.position.array.length), n: new Float32Array(mesh.geometry.attributes.normal.array.length) };
      b.from.p.set(mesh.geometry.attributes.position.array); b.from.n.set(mesh.geometry.attributes.normal.array);
      b.to = name; b.k = 0;
    }
    function stepBuild(slot, mesh, builds, dt) {
      const b = bl[slot]; if (b.k >= 1) return;
      b.k = Math.min(1, b.k + dt / 0.06);
      const P = mesh.geometry.attributes.position.array, N = mesh.geometry.attributes.normal.array, tp = builds[b.to].geometry.attributes.position.array, tn = builds[b.to].geometry.attributes.normal.array, fp = b.from.p, fn = b.from.n, k = b.k;
      for (let i = 0; i < P.length; i++) { P[i] = fp[i] + (tp[i] - fp[i]) * k; N[i] = fn[i] + (tn[i] - fn[i]) * k; }
      mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.attributes.normal.needsUpdate = true;
      if (k >= 1) b.cur = b.to;
    }
    function trigger(k) {   // the firing hand's index finger, resting .. pressed
      k = Math.max(0, Math.min(1, k)); if (Math.abs(k - bl.R.shown) < 0.02 || fRp === fR) return;
      bl.R.shown = k; H.blend(handR.geometry, fR.geometry, fRp.geometry, k);
    }
    const events = [];
    function fireEvents(t0, t1) {
      const ev = cur.ev; if (!ev) return;
      for (const n in ev) { const te = ev[n]; if (te > t0 && te <= t1 || (t0 === 0 && te === 0 && t1 > 0)) { const e = { clip: curName, name: n, time: te }; events.push(e); if (vm.onEvent) try { vm.onEvent(n, curName); } catch (x) {} } }
    }
    const vm = {
      kind, group, rig, weapon: gun, gunNode, clips: Object.keys(clips).concat(['idle', 'ads', 'sprint', 'adsRaise']),
      muzzle: find('muzzle'), ejection: find('ejection'), scopeEye: find('scopeEye'),
      sockets: { muzzle: find('muzzle'), ejection: find('ejection'), scopeEye: find('scopeEye'), sightRear: find('sightRear'), sightFront: find('sightFront'), handR, handL, prop: propSocket, weapon: gunNode },
      adsOffset: null, current: null, onEvent: null, hands: { handR, handL, handP }, props,
      clipLength: n => clips[n] ? clips[n].dur : ({ idle: 3, ads: 3, sprint: 0.7, adsRaise: 1 })[n] || 0,
      events: n => clips[n] ? Object.assign({}, clips[n].ev) : {},
      isPlaying: n => !!cur && curName === n && !stopping,
      setProp: k => { propKind = k === 'rock' ? 'rock' : 'grenade'; },
      play(name, o) {
        o = o || {};
        if (name === 'fire' && st.ads > 0.5 && clips.fireAds) name = 'fireAds';
        const c = clips[name]; if (!c) return 0;
        copyPose(from, out);
        cur = c; curName = name; t = 0; speed = o.speed || 1; loop = !!(o.loop || c.loop); stopping = false; outK = 0;
        fadeIn = o.fade != null ? o.fade : (/^fire/.test(name) ? 0.0 : 0.08); fadeK = fadeIn > 0 ? 0 : 1;
        vm.current = name;
        return c.dur / speed;
      },
      stop(fade) { if (cur) { stopping = true; outFade = fade != null ? fade : 0.15; } },
      drive(state, dt) {
        state = state || {}; dt = dt || 0;
        st.ads = clamp01(state.ads); st.sprint = clamp01(state.sprint); st.crouch = clamp01(state.crouch); st.prone = clamp01(state.prone);
        events.length = 0;
        // base gun pose: hip -> aimed -> sprint carry, plus stance offsets
        bP.copy(hipP).lerp(adsP, st.ads); bQ.copy(hipQ).slerp(adsQ, st.ads);
        const hipK = 1 - st.ads;
        bP.x += (fr.crouch[0] * st.crouch + fr.prone[0] * st.prone) * hipK; bP.y += (fr.crouch[1] * st.crouch + fr.prone[1] * st.prone) * hipK; bP.z += (fr.crouch[2] * st.crouch + fr.prone[2] * st.prone) * hipK;
        if (st.sprint > 0) { bP.lerp(sprP, st.sprint); bQ.slerp(sprQ, st.sprint); }
        // the clip
        let pose = base;
        if (cur) {
          const t0 = t, len = cur.dur;
          t += dt * speed;
          if (loop && t > len) { fireEvents(t0, len); t -= len; fireEvents(-1e-6, t); }
          else fireEvents(t0, Math.min(t, len + 1e-4));
          const tc = Math.min(t, len);
          sampleClip(cur, tc, base, smp);
          if (fadeK < 1) { fadeK = Math.min(1, fadeK + dt / Math.max(1e-3, fadeIn)); mixPose(smp, from, smp, EASE.io(fadeK)); }
          if (!loop && !cur.hold && t >= len) stopping = true;
          if (stopping) {
            outK = Math.min(1, outK + dt / Math.max(1e-3, outFade));
            mixPose(smp, smp, base, EASE.io(outK));
            if (outK >= 1) { cur = null; curName = null; vm.current = null; stopping = false; }
          }
          pose = smp;
        }
        copyPose(out, pose);
        apply(out, dt);
        return events;
      },
      setVisible(b) { group.visible = !!b; },
      tris() { let n = 0; group.traverse(o => { if (o.isMesh && o.visible) { let v = true; for (let p = o.parent; p; p = p.parent) if (!p.visible) v = false; if (v) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); return Math.round(n); },
      dispose() { if (group.parent) group.parent.remove(group); },
      // the open ends of the visible sleeves as points in the eye frame (tests: they must never be on screen)
      sleeveEnds(outPts) {
        outPts.length = 0;
        const add = (mesh, info) => { if (!mesh || !mesh.visible || !info || !info.sleeveEndVerts) return; const P = mesh.geometry.attributes.position, [a, n] = info.sleeveEndVerts; for (let i = a; i < a + n; i += 2) outPts.push(new T.Vector3().fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld)); };
        add(handR, fR); add(handL, sBuilds[baseB]); if (handP) add(handP, pBuilds[firstP]);
        return outPts;
      },
      pose: () => out, state: st,
      bones: { w_root: gunNode, hand_r: handR, hand_l: handL }   // names the old rig's tests read
    };
    function apply(o, dt) {
      // gun: base, then the clip's offset in the gun frame about the pivot
      const g = o.gun;
      _mg.compose(bP, bQ, _s.set(1, 1, 1));
      _m1.makeTranslation(g[0] + pivot.x, g[1] + pivot.y, g[2] + pivot.z);
      _m2.makeRotationFromEuler(_e.set(g[3], g[4], g[5], 'YXZ'));
      _m1.multiply(_m2); _m2.makeTranslation(-pivot.x, -pivot.y, -pivot.z); _m1.multiply(_m2);
      gunNode.matrix.multiplyMatrices(_mg, _m1);
      gunNode.matrixWorldNeedsUpdate = true;
      // parts
      const P = parts;
      if (P.bolt) { P.bolt.o.position.copy(P.bolt.p); P.bolt.o.position.z -= o.bolt[0]; P.bolt.o.quaternion.copy(P.bolt.q); if (o.boltTurn[0]) P.bolt.o.quaternion.multiply(_q.setFromAxisAngle(_v.set(0, 0, 1), o.boltTurn[0])); }
      if (P.charging) { P.charging.o.position.copy(P.charging.p); P.charging.o.position.z -= o.charging[0]; }
      if (P.hammer) { P.hammer.o.quaternion.copy(P.hammer.q).multiply(_q.setFromAxisAngle(_v.set(1, 0, 0), -o.hammer[0])); }
      if (P.trigger) { P.trigger.o.quaternion.copy(P.trigger.q).multiply(_q.setFromAxisAngle(_v.set(1, 0, 0), o.trigger[0] * 0.35)); }
      trigger(o.trigger[0]);
      // support hand: on the gun (hand) and/or in the eye frame (handE), mixed by hs
      _mh.compose(_v.set(o.hand[0], o.hand[1], o.hand[2]), _q.set(o.hand[3], o.hand[4], o.hand[5], o.hand[6]), _s.set(1, 1, 1)).premultiply(gunNode.matrix);
      if (o.hs[0] > 0) { _mE.compose(_v.set(o.handE[0], o.handE[1], o.handE[2]), _q.set(o.handE[3], o.handE[4], o.handE[5], o.handE[6]), _s.set(1, 1, 1)); if (o.hs[0] >= 1) _mh.copy(_mE); else mixMatrix(_mh, _mh, _mE, o.hs[0]); }
      if (o.ph[0] > 0 && partGrip[partOf]) {   // riding the part it holds
        // the hand follows the contact point (the grip's 'at') as the part moves, keeping its own turn: lifting a bolt
        // knob moves the hand up with the knob, it does not swing the wrist round the bolt's axis
        const pg = partGrip[partOf]; pg.o.updateMatrix();
        pg.kk.copy(pg.k).applyMatrix4(pg.inv).applyMatrix4(pg.o.matrix).sub(pg.k);
        _m2.makeTranslation(pg.kk.x, pg.kk.y, pg.kk.z).multiply(pg.grip).premultiply(gunNode.matrix);   // from the grip's own place
        if (o.ph[0] >= 1) _mh.copy(_m2); else mixMatrix(_mh, _mh, _m2, o.ph[0]);
      }
      handL.matrix.copy(_mh); handL.matrixWorldNeedsUpdate = true; handL.visible = handsOn || o.hs[0] > 0.5;
      // aimed: the hands used to fade out here (VM.HANDFADE); they now stay on the gun in every state
      const fk = Math.round(st.ads * 50) / 50;
      if (fk !== fadeK2) {
        fadeK2 = fk;
        const x = Math.min(1, Math.max(0, (fk - VM.HANDFADE[0]) / (VM.HANDFADE[1] - VM.HANDFADE[0]))), op = 1 - x * x * (3 - 2 * x);
        for (const m of [M.glove, M.sleeve]) { const tr = op < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = op; }
        handsOn = op > 0.01;
      }
      handR.visible = handsOn;
      gunNode.visible = o.gunVis[0] > 0.5;
      setBuild('L', handL, sBuilds, o.build); stepBuild('L', handL, sBuilds, dt);
      // magazine: at its seat (plus offset) or in the hand
      if (P.mag) {
        const mo = P.mag.o, m = o.mag;
        _m1.makeRotationFromEuler(_e.set(m[3], m[4], m[5], 'YXZ')).setPosition(m[0], m[1], m[2]);
        _mE.multiplyMatrices(gunNode.matrix, _m1).multiply(magRest);
        if (o.magHand[0] > 0 && magInHand) { _m2.multiplyMatrices(_mh, magInHand); if (o.magHand[0] >= 1) _mE.copy(_m2); else mixMatrix(_mE, _mE, _m2, o.magHand[0]); }
        mo.matrix.copy(_mE); mo.matrixWorldNeedsUpdate = true; mo.visible = o.magVis[0] > 0.5 && (o.gunVis[0] > 0.5 || o.magHand[0] > 0.5);
      }
      // props in the support hand (or the right hand for the knife)
      for (const k in props) props[k].visible = false;
      const pk = o.prop === 'grenade' ? propKind : o.prop;
      if (pk && props[pk]) {
        const holder = pk === 'knife' ? handP : handL, gname = pk === 'knife' ? 'knife' : pk === 'binoculars' ? 'binoL' : 'grenade';
        const pr = props[pk]; pr.matrix.multiplyMatrices(holder.matrix, propIn[gname] || _m1.identity()); pr.matrixWorldNeedsUpdate = true; pr.visible = true;
        propSocket.matrix.copy(pr.matrix); propSocket.matrixWorldNeedsUpdate = true;
        if (pin && pk === 'grenade') pin.visible = o.pin[0] < 0.5;
      } else { propSocket.matrix.copy(handL.matrix); propSocket.matrixWorldNeedsUpdate = true; }
      // the right hand alone: knife (its own place) or on the binoculars (follows them)
      if (handP) {
        handP.visible = o.pvis[0] > 0.5;
        if (handP.visible) {
          if (o.prop === 'binoculars' && props.binoculars) handP.matrix.multiplyMatrices(props.binoculars.matrix, VM.gripMatrix(PROPGRIPS.binoR, _m2));
          else handP.matrix.compose(_v.set(o.phE[0], o.phE[1], o.phE[2]), _q.set(o.phE[3], o.phE[4], o.phE[5], o.phE[6]), _s.set(1, 1, 1));
          handP.matrixWorldNeedsUpdate = true;
          setBuild('P', handP, pBuilds, o.pbuild); stepBuild('P', handP, pBuilds, dt);
        }
      }
      group.updateMatrixWorld(true);
    }
    vm.drive({}, 0);
    return vm;
  };
  function clamp01(x) { return x > 0 ? (x < 1 ? x : 1) : 0; }
  // a throwing stone: a lumpy, flattened ball
  function rockMesh() {
    const g = new T.IcosahedronGeometry(0.03, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.18 * Math.sin(x * 160 + y * 90) * Math.cos(z * 120); p.setXYZ(i, x * k * 1.15, y * k * 0.8, z * k); }
    g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: 0x4a4640, roughness: 1, metalness: 0 })); m.matrixAutoUpdate = false; m.frustumCulled = false;
    return m;
  }
})();
