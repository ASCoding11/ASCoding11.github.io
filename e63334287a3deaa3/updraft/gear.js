/*
 * Updraft: Gear. Skins, backpacks, height rewards, fall screams and plummet trails, all drawn and played in code.
 *
 * CAPTAINS ONLY FOR NOW. The page (index.html, GEAR_PUBLIC and gearOn()) asks ../captains.js whether this player may see
 * Gear; only then is this file fetched and the Gear button and screen made. Everyone else never downloads it unless a
 * captain wearing something is in their room, and then only to draw that captain (their own climber and menus stay as
 * before). Nothing is bought: captains wear every skin, pack, scream and trail free. The three height rewards are earned
 * from the player's own saved best height (updraft:best h): the 1,000 m Badge at the old summit (1000 m), the Space
 * Helmet at 2200 m, where Orbit Yard starts (the first zone that is really in space: low gravity over the curve of the
 * world; the "Edge of Space" zone below it is only the edge), and the Golden Crown at 3000 m, the Crown at the top,
 * which only a finished climb reaches (onSummit sets best.h to 3000).
 *
 * Saved in this browser as updraft:gear {s, p, r, x, t} (skin, pack, reward, scream, trail; 0 is the climber as before).
 * Online it is one field in the player's own node, `o`: "s.p.r.x.t" (e.g. "13.2.1.0.4"), sent only when Gear is open to
 * this player and something is worn. Older pages ignore it. A page that doesn't know a number draws the default for that
 * part, and a reward is drawn only if the sender's best height `b` has reached it.
 *
 * Looks only: the climber's collision is UpCore's (a fixed capsule) and never reads the figure. A dressed figure is the same
 * jointed figure with the same proportions, rebuilt as one vertex-coloured mesh per joint (11 draw calls, plus one for a
 * glowing bit and one for the helmet's glass where worn) instead of the plain figure's 30, so it costs less to draw.
 * The names here match the 'updraft' items in ../cosmetics.js: item numbers are permanent, add new ones at the end.
 */
(function () {
  'use strict';
  if (window.UpdraftGear) return;

  // ---------------- Names (the same as ../cosmetics.js) ----------------
  var NAMES = {
    skin: ['Classic Climber', 'Jungle Explorer', 'Mountaineer', 'Arctic Explorer', 'Safari Guide', 'Deep-Sea Diver', 'Aviator', 'Cave Explorer', 'Treasure Hunter', 'Dusty Archaeologist', 'Storm Chaser', 'Balloonist', 'Old-Timey Explorer', 'Pirate', 'Park Ranger', 'Astronaut', 'Tourist', 'Pizza Delivery', 'Window Washer', 'Grandma', 'Knight', 'Ninja', 'Chicken Suit'],
    pack: ['Climbing Pack', 'Parachute Pack', 'Teddy Bear', 'Picnic Basket', 'Giant Sandwich', 'Fake Jetpack', 'Rolled-Up Tent'],
    reward: ['None', '1,000 m Badge', 'Space Helmet', 'Golden Crown'],
    scream: ['None', 'Aaaah!', 'Yodel', 'Slide Whistle', 'Opera Note', 'Wheee!'],
    trail: ['None', 'Rainbow Streamer', 'Comet Tail', 'Smoke Trail', 'Gold Sparkles']
  };
  var ADVENTURERS = 15;                     // skins 1-15; 16-22 are the silly ones
  var REWARD_AT = [0, 1000, 2200, 3000];    // best height that earns each reward
  var REWARD_WHERE = ['', 'the old summit', 'Orbit Yard, where space starts', 'the Crown: finish the climb'];
  var MAX = { s: NAMES.skin.length - 1, p: NAMES.pack.length - 1, r: 3, x: NAMES.scream.length - 1, t: NAMES.trail.length - 1 };
  var KEYS = ['s', 'p', 'r', 'x', 't'];
  function earned(h) { var n = 0; for (var i = 1; i < REWARD_AT.length; i++) if (h >= REWARD_AT[i]) n = i; return n; }
  // a look from anywhere (storage, another player): whole numbers in range, anything else is the default
  function clean(o, h) {
    var L = {}; o = o && typeof o === 'object' ? o : {};
    KEYS.forEach(function (k) { var v = +o[k]; L[k] = v === Math.floor(v) && v >= 0 && v <= MAX[k] ? v : 0; });
    if (L.r > earned(h)) L.r = 0;
    return L;
  }
  function code(L) { return L && KEYS.some(function (k) { return L[k]; }) ? KEYS.map(function (k) { return L[k]; }).join('.') : ''; }
  function parse(s, h) {
    var m = /^(\d{1,2})\.(\d{1,2})\.(\d)\.(\d{1,2})\.(\d{1,2})$/.exec(typeof s === 'string' ? s : '');
    return m ? clean({ s: +m[1], p: +m[2], r: +m[3], x: +m[4], t: +m[5] }, h) : null;
  }

  // ---------------- The figures ----------------
  // Every look is a list of parts on the figure's joints (index.html's makeAvatar):
  //   hips   pelvis (at .88 m)        spine  torso, chest, back (front is +z, at z .12)    neck  head (centre y .14, top .30)
  //   arm    upper arm (shoulder at the origin, down to y -.27)    fore  forearm and hand (hand at y -.28)
  //   thigh  (down to y -.4)    shin  shin and foot (foot at y -.42)    body  the whole figure (only turns when tumbling)
  // arm/fore/thigh/shin are made for both sides (x mirrored); armL, foreR... for one side only (L is +x).
  // tag 'hat': taken off for the Space Helmet and the Crown; 'hair': only when no hat is on; 'helm': taken off for the Space Helmet; 'back': taken off when
  // a backpack is chosen. A colour starting with ! glows (drawn unlit); ~ is the helmet's glass.
  function figure(b, k) {
    b.k = k;   // the look's settings (crown height, chest front) for the rewards
    var skin = k.skin || '#efc6a2', sh = k.shirt;
    b.box('hips', [0, 0, 0], [.34, .17, .22], k.pants);
    b.box('spine', [0, .25, 0], [.4, .46, .24], sh);
    b.ball('spine', [0, .44, 0], [.2, .12, .13], k.chest || sh);
    b.ball2('neck', [0, .14, 0], [.15, .16, .15], skin);
    b.hemi('neck', [0, .16, -.005], [.158, .152, .16], k.hair || '#5a3c28', null, 'hair');
    b.ball('neck', [.05, .13, .14], [.018, .018, .018], k.eye || '#1d2230', null, k.eyeTag);
    b.ball('neck', [-.05, .13, .14], [.018, .018, .018], k.eye || '#1d2230', null, k.eyeTag);
    var sl = k.sleeve || sh, fo = k.fore || skin, ha = k.hand || skin, th = k.thigh || k.pants, sn = k.shin || k.pants;
    b.cyl8('arm', [0, -.135, 0], [.058, .27, .058], sl); b.ball('arm', [0, 0, 0], [.06264, .06264, .06264], sl);
    b.cyl8('fore', [0, -.125, 0], [.05, .25, .05], fo); b.ball('fore', [0, 0, 0], [.054, .054, .054], fo);
    b.ball('fore', [0, -.28, 0], [.06 * (k.handK || 1), .06 * (k.handK || 1), .06 * (k.handK || 1)], ha);
    b.cyl8('thigh', [0, -.2, 0], [.078, .4, .078], th); b.ball('thigh', [0, 0, 0], [.08424, .08424, .08424], th);
    b.cyl8('shin', [0, -.195, 0], [.066, .39, .066], sn); b.ball('shin', [0, 0, 0], [.07128, .07128, .07128], sn);
    b.box('shin', [0, -.42, .05], k.foot || [.12, .075, .25], k.shoe);
    // the climbing pack as it always was, in the look's own colour (a chosen backpack takes its place)
    if (!k.noPack) {
      b.box('spine', [0, .27, -.19], [.3, .34, .15], k.bag || '#3a3f4a', null, 'back');
      b.cyl('spine', [0, .47, -.2], [.07, .32, .07], k.roll || '#d8c9a6', [0, 0, Math.PI / 2], 'back');
    }
  }
  // little things many looks share
  function belt(b, col, buckle, y) { b.box('hips', [0, y || .06, 0], [.352, .05, .232], col); if (buckle) b.box('hips', [0, y || .06, .117], [.055, .04, .01], buckle); }
  function boots(b, col, h) { b.cyl('shin', [0, -.39 + h / 2, 0], [.074, h, .074], col); }
  function brimHat(b, o) {   // a hat with a round brim: o {y, brim, brimR, crown, crownR, crownH, band}
    var y = o.y || .225;
    b.cyl('neck', [0, y, 0], [o.brimR || .26, .016, o.brimR || .26], o.brim, null, 'hat');
    b.cyl('neck', [0, y + (o.crownH || .12) / 2, 0], [o.crownR || .15, o.crownH || .12, (o.crownR || .15) * .97], o.crown, null, 'hat');
    if (o.band) b.cyl('neck', [0, y + .025, 0], [(o.crownR || .15) + .004, .035, (o.crownR || .15) * .97 + .004], o.band, null, 'hat');
  }
  function goggles(b, y, z, lens, rim, tag, tilt) {
    for (var s = -1; s <= 1; s += 2) {
      b.cyl('neck', [s * .055, y, z], [.045, .03, .045], rim, [Math.PI / 2 - (tilt || 0), 0, 0], tag);
      b.cyl('neck', [s * .055, y + .01 * Math.sin(tilt || 0), z + .016], [.034, .01, .034], lens, [Math.PI / 2 - (tilt || 0), 0, 0], tag);
    }
    b.ring('neck', [0, y, 0], [.163, .163, .163], rim === '#2a2d34' ? '#2a2d34' : '#3a2a1a', [Math.PI / 2 - (tilt || 0) * .3, 0, 0], tag);
  }
  function straps(b, col, z) { for (var s = -1; s <= 1; s += 2) b.box('spine', [s * .1, .27, z || .124], [.04, .46, .012], col); }
  function glasses(b, col, r) { for (var s = -1; s <= 1; s += 2) b.ring('neck', [s * .052, .13, .152], [r || .036, r || .036, r || .036], col); b.box('neck', [0, .135, .156], [.03, .008, .008], col); }

  var SKIN = [];
  // 0: the climber everyone has, in the player's own colour (cap, visor, shirt and pack shade come from it)
  SKIN[0] = function (b, c) {
    figure(b, { shirt: c, pants: '#2b3346', shoe: '#f3f3f3', bag: shadeHex(c, .5) });
    b.hemi('neck', [0, .16, 0], [.158, .12, .158], c, null, 'hat');
    b.box('neck', [0, .17, .15], [.2, .025, .12], c, null, 'hat');
  };
  // ---- Adventurers ----
  SKIN[1] = function (b) {   // jungle explorer: fedora, leather jacket, satchel
    figure(b, { shirt: '#6b4428', sleeve: '#6b4428', fore: '#6b4428', pants: '#c8b48a', shoe: '#4a2f1c', hair: '#5a3c28', bag: '#5a4a32' });
    b.box('spine', [0, .25, .122], [.11, .42, .012], '#d9c9a0');
    for (var s = -1; s <= 1; s += 2) b.box('spine', [s * .085, .45, .125], [.1, .07, .02], '#7e5534', [0, 0, s * .5]);
    belt(b, '#3a2614', '#c9a227');
    b.box('spine', [0, .25, .13], [.045, .62, .012], '#4a3220', [0, 0, .62]);
    b.box('spine', [0, .25, -.128], [.045, .62, .012], '#4a3220', [0, 0, -.62]);
    b.box('hips', [-.205, -.03, .02], [.07, .17, .2], '#8a6a3c'); b.box('hips', [-.238, .02, .02], [.012, .09, .2], '#6e522c');
    boots(b, '#4a2f1c', .16);
    brimHat(b, { brim: '#6e4a2c', crown: '#7a5434', band: '#2a1a10', brimR: .27, crownH: .13 });
    b.box('neck', [0, .355, 0], [.035, .02, .2], '#6a4628', null, 'hat');
  };
  SKIN[2] = function (b) {   // mountaineer: puffy jacket, bobble hat, goggles, rope
    figure(b, { shirt: '#e0402f', sleeve: '#e0402f', fore: '#e0402f', hand: '#3a3f4a', handK: 1.15, pants: '#3b4252', shoe: '#6b3a1e', foot: [.135, .09, .27], hair: '#3a2a1a', bag: '#2a7fd1' });
    [.1, .2, .3, .4].forEach(function (y) { b.box('spine', [0, y, 0], [.418, .022, .256], '#b8301f'); });
    b.cyl('spine', [0, .52, 0], [.13, .07, .11], '#e0402f');
    b.box('spine', [0, .27, .123], [.02, .44, .01], '#2a2d34');
    for (var s = -1; s <= 1; s += 2) b.cyl('arm', [0, -.16, 0], [.066, .02, .066], '#b8301f');
    b.box('shin', [0, -.462, .05], [.14, .02, .28], '#222');
    b.hemi('neck', [0, .17, 0], [.165, .14, .165], '#2a7fd1', null, 'hat');
    b.cyl('neck', [0, .2, 0], [.168, .05, .168], '#1f5fa0', null, 'hat');
    b.ball('neck', [0, .32, 0], [.05, .05, .05], '#ffd23f', null, 'hat');
    goggles(b, .245, .135, '#ffb347', '#2a2d34', 'hat', .5);
    b.ring('spine', [0, .28, 0], [.15, .37, 1], '#e8c547', [0, Math.PI / 2, .7, 'ZYX']);
  };
  SKIN[3] = function (b) {   // arctic explorer: parka with a fur-trimmed hood, mittens
    figure(b, { shirt: '#2f7fb8', sleeve: '#2f7fb8', fore: '#2f7fb8', hand: '#e8e2d6', handK: 1.2, pants: '#2f3a4a', shin: '#e9e4da', shoe: '#5a4030', foot: [.14, .085, .26], hair: '#3a2a1a', bag: '#c8502a' });
    b.box('hips', [0, -.01, 0], [.43, .21, .27], '#2f7fb8');
    b.box('spine', [0, .2, .123], [.025, .5, .012], '#1f5f8a');
    for (var y = .12; y < .45; y += .1) b.box('spine', [.04, y, .126], [.03, .018, .012], '#e8dcc0');
    b.cyl('fore', [0, -.23, 0], [.062, .045, .062], '#f3efe6');
    b.cyl('hips', [0, -.105, 0], [.24, .03, .15], '#f3efe6');
    b.hemi('neck', [0, .15, -.01], [.19, .19, .19], '#2f7fb8', null, 'hat');
    b.box('neck', [0, .08, -.1], [.3, .2, .14], '#2f7fb8', null, 'hat');
    b.tor('neck', [0, .13, .1], [.16, .175, .16], '#f3efe6', null, 'hat');
  };
  SKIN[4] = function (b) {   // safari guide: pith helmet, khaki, binoculars, knee socks
    figure(b, { shirt: '#c9b07a', pants: '#a8905e', shin: '#efc6a2', shoe: '#5a3a22', hair: '#7a4a2a', bag: '#6a5a3a' });
    for (var s = -1; s <= 1; s += 2) { b.box('spine', [s * .1, .34, .124], [.09, .1, .01], '#b39a64'); b.box('spine', [s * .1, .39, .126], [.095, .025, .01], '#a08852'); }
    b.cyl('arm', [0, -.2, 0], [.064, .06, .064], '#b39a64');
    belt(b, '#5a3a22', '#c9a227');
    b.cyl('thigh', [0, -.33, 0], [.085, .14, .085], '#a8905e');
    b.cyl('shin', [0, -.27, 0], [.07, .22, .07], '#e8dcc0');
    for (s = -1; s <= 1; s += 2) b.cyl('spine', [s * .035, .36, .16], [.03, .09, .03], '#2a2d34', [Math.PI / 2, 0, 0]);
    b.ring('spine', [0, .47, .02], [.13, .13, .13], '#3a2a1a', [Math.PI / 2 - .5, 0, 0]);
    b.hemi('neck', [0, .2, 0], [.18, .15, .19], '#efe6cc', null, 'hat');
    b.cyl('neck', [0, .205, 0], [.25, .015, .27], '#e6dcc0', null, 'hat');
    b.cyl('neck', [0, .218, 0], [.183, .03, .193], '#7a6a4a', null, 'hat');
    b.ball('neck', [0, .352, 0], [.022, .015, .022], '#e6dcc0', null, 'hat');
  };
  SKIN[5] = function (b) {   // deep-sea diver: brass helmet with portholes, canvas suit, lead boots
    figure(b, { shirt: '#8a8f7a', sleeve: '#8a8f7a', fore: '#8a8f7a', hand: '#7a5a3a', handK: 1.15, pants: '#8a8f7a', shoe: '#3a3d44', foot: [.14, .1, .27], hair: '#3a2a1a', bag: '#e0b050', roll: '#3a3d44', crownY: .38, front: .13 });
    b.cyl('spine', [0, .52, 0], [.24, .08, .2], '#c9923a', null, 'helm');
    for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; b.ball('spine', [Math.sin(a) * .235, .56, Math.cos(a) * .195], [.018, .018, .018], '#7a5a2a', null, 'helm'); }
    b.ball2('neck', [0, .15, 0], [.22, .22, .22], '#c9923a', null, 'helm');
    b.cyl('neck', [0, .15, .2], [.1, .04, .1], '#2d4a5e', [Math.PI / 2, 0, 0], 'helm');
    b.ring('neck', [0, .15, .218], [.105, .105, .105], '#f0c060', null, 'helm');
    b.box('neck', [0, .15, .222], [.012, .19, .012], '#f0c060', null, 'helm'); b.box('neck', [0, .15, .222], [.19, .012, .012], '#f0c060', null, 'helm');
    for (var s = -1; s <= 1; s += 2) { b.cyl('neck', [s * .2, .16, 0], [.06, .04, .06], '#2d4a5e', [0, 0, Math.PI / 2], 'helm'); b.ring('neck', [s * .218, .16, 0], [.065, .065, .065], '#f0c060', [0, Math.PI / 2, 0], 'helm'); }
    b.cyl('neck', [0, .37, 0], [.05, .03, .05], '#e0b050', null, 'helm');
    b.tor('spine', [0, .5, -.16], [.12, .12, .12], '#3a3a3a', [0, Math.PI / 2, 0], 'helm');
    belt(b, '#4a4d55', '#9aa0aa', .04);
    for (s = -1; s <= 1; s += 2) b.box('shin', [0, -.36, .02], [.15, .06, .14], '#4a4d55');
  };
  SKIN[6] = function (b) {   // aviator: flying cap, goggles, scarf, fleece collar, tall boots
    figure(b, { shirt: '#7a4a2a', sleeve: '#7a4a2a', fore: '#7a4a2a', hand: '#4a2a1a', pants: '#c8b48a', shin: '#3a2414', shoe: '#3a2414', hair: '#5a3c28', bag: '#5a6a3a' });
    b.tor('spine', [0, .5, .01], [.16, .16, .13], '#efe4cc', [Math.PI / 2, 0, 0]);
    b.box('spine', [0, .24, .123], [.02, .44, .01], '#4a2a1a');
    b.tor('spine', [0, .55, .02], [.12, .12, .1], '#f6f2ea', [Math.PI / 2, 0, 0]);
    b.box('spine', [.08, .4, -.17], [.07, .2, .02], '#f6f2ea', [-.35, 0, .1]);
    b.box('spine', [.12, .24, -.23], [.07, .18, .02], '#f6f2ea', [-.6, 0, .2]);
    b.ball('thigh', [0, -.18, 0], [.105, .15, .1], '#c8b48a');
    b.hemi('neck', [0, .15, 0], [.165, .15, .165], '#6a3e22', null, 'hat');
    for (var s = -1; s <= 1; s += 2) b.box('neck', [s * .152, .085, 0], [.03, .11, .09], '#6a3e22', null, 'hat');
    goggles(b, .235, .135, '#5ec2ff', '#b08a3a', 'hat', .6);
  };
  SKIN[7] = function (b) {   // cave explorer: hard hat with a headlamp, overalls, harness
    figure(b, { shirt: '#e8742a', sleeve: '#e8742a', fore: '#e8742a', hand: '#4a4d55', handK: 1.1, pants: '#e8742a', shoe: '#3a3d44', hair: '#3a2a1a', bag: '#3a3f4a' });
    b.cyl('fore', [0, -.15, 0], [.054, .025, .054], '#e8eef2'); b.cyl('shin', [0, -.15, 0], [.07, .025, .07], '#e8eef2');
    straps(b, '#2a2d34'); b.box('spine', [0, .36, .128], [.24, .03, .01], '#2a2d34');
    belt(b, '#2a2d34', '#9aa0aa');
    b.cyl('thigh', [0, -.06, 0], [.084, .03, .084], '#2a2d34');
    b.ball('shin', [0, -.01, .05], [.065, .075, .05], '#3a3d44');
    b.hemi('neck', [0, .19, 0], [.17, .15, .18], '#f4c430', null, 'hat');
    b.cyl('neck', [0, .2, .01], [.19, .012, .21], '#e0b020', null, 'hat');
    b.box('neck', [0, .29, 0], [.03, .05, .3], '#f4c430', null, 'hat');
    b.cyl('neck', [0, .25, .17], [.045, .04, .045], '#3a3d44', [Math.PI / 2, 0, 0], 'hat');
    b.cyl('neck', [0, .25, .19], [.035, .01, .035], '!#fff7c8', [Math.PI / 2, 0, 0], 'hat');
  };
  SKIN[8] = function (b) {   // treasure hunter: bandana, vest, a map with an X
    figure(b, { shirt: '#5a3a22', sleeve: '#f2ede0', fore: '#f2ede0', pants: '#3a4a6a', shoe: '#5a3a22', hair: '#2a1a10', bag: '#8a6a3c' });
    b.box('spine', [0, .27, .122], [.13, .42, .012], '#f2ede0');
    b.cyl('fore', [0, -.21, 0], [.056, .04, .056], '#e2dccb');
    belt(b, '#2a1a10', '#e0b040');
    b.ball('hips', [.2, -.04, .05], [.06, .07, .06], '#8a6a3c'); b.cyl('hips', [.2, .025, .05], [.025, .02, .025], '#5a3a22');
    b.box('foreL', [0, -.33, .07], [.02, .16, .2], '#efe0b0');
    for (var s = -1; s <= 1; s += 2) b.box('foreL', [.012, -.33, .1], [.004, .07, .014], '#c8302e', [s * .785, 0, 0]);
    b.box('foreL', [.012, -.28, .02], [.004, .012, .06], '#8a6a3c');
    b.hemi('neck', [0, .165, 0], [.164, .125, .164], '#c8302e', null, 'hat');
    for (s = -1; s <= 1; s += 2) b.ball('neck', [s * .05, .2, .08], [.012, .012, .012], '#f2ede0', null, 'hat');
    b.ball('neck', [0, .17, -.16], [.035, .03, .03], '#c8302e', null, 'hat');
    b.box('neck', [.025, .1, -.16], [.03, .1, .015], '#c8302e', [0, 0, .3], 'hat'); b.box('neck', [-.025, .1, -.16], [.03, .09, .015], '#c8302e', [0, 0, -.3], 'hat');
  };
  SKIN[9] = function (b) {   // dusty archaeologist: bucket hat, round glasses, tool belt, a brush
    figure(b, { shirt: '#e2d3b0', sleeve: '#e2d3b0', pants: '#7a6a4e', shoe: '#6a4a2a', hair: '#8a8a8a', bag: '#6a5a3a' });
    b.cyl('arm', [0, -.25, 0], [.066, .045, .066], '#cdbd96');
    b.ball('spine', [.09, .12, .11], [.06, .05, .02], '#cdbd96'); b.ball('spine', [-.07, .3, .112], [.05, .04, .015], '#d6c8a2');
    b.ball('thigh', [0, -.25, .06], [.05, .06, .03], '#968566');
    b.box('spine', [.09, .34, .124], [.09, .09, .01], '#cdbd96');
    b.cyl('spine', [.09, .41, .126], [.012, .1, .012], '#a0703a'); b.box('spine', [.09, .47, .126], [.032, .035, .014], '#e8d8a8');
    belt(b, '#6a4a2a', '#b08a3a');
    for (var s = -1; s <= 1; s += 2) b.box('hips', [s * .14, -.05, .105], [.07, .09, .05], '#6a4a2a');
    b.box('hips', [.19, -.1, 0], [.012, .14, .05], '#9aa3ad');
    glasses(b, '#3a2a1a');
    b.cyl('neck', [0, .265, 0], [.162, .1, .162], '#d8c69a', null, 'hat');
    b.cyl('neck', [0, .215, 0], [.235, .02, .235], '#cbb98a', null, 'hat');
    b.cyl('neck', [0, .235, 0], [.165, .022, .165], '#8a6a3c', null, 'hat');
  };
  SKIN[10] = function (b) {   // storm chaser: rain slicker with the hood up, wellies, a wind gauge
    figure(b, { shirt: '#f2c81f', sleeve: '#f2c81f', fore: '#f2c81f', hand: '#2a3a5a', pants: '#2a3a5a', shin: '#2a7a3a', shoe: '#2a7a3a', foot: [.13, .08, .26], hair: '#3a2a1a', bag: '#2a3a5a' });
    b.box('spine', [0, .14, 0], [.414, .03, .254], '#d8e4ee'); b.cyl('arm', [0, -.2, 0], [.064, .03, .064], '#d8e4ee');
    b.box('hips', [0, -.02, 0], [.42, .2, .26], '#f2c81f');
    b.box('spine', [0, .25, .123], [.02, .46, .01], '#c8a210');
    b.hemi('neck', [0, .16, -.005], [.185, .175, .185], '#f2c81f', null, 'hat');
    b.box('neck', [0, .24, .16], [.24, .02, .09], '#f2c81f', [-.25, 0, 0], 'hat');
    b.box('neck', [0, .07, -.1], [.3, .2, .12], '#f2c81f', null, 'hat');
    b.cyl('foreR', [0, -.28, .12], [.012, .22, .012], '#9aa3ad', [Math.PI / 2, 0, 0]);
    for (var i = 0; i < 3; i++) { var a = i / 3 * Math.PI * 2; b.hemi('foreR', [Math.sin(a) * .07, -.28 + Math.cos(a) * .07, .24], [.03, .03, .03], '#e8452f', [0, 0, -a + Math.PI / 2]); }
  };
  SKIN[11] = function (b) {   // balloonist: striped jacket, sandbags, a tiny balloon hat
    figure(b, { shirt: '#e8452f', sleeve: '#e8452f', hand: '#f2ede0', pants: '#2f4a7a', shoe: '#5a3a22', hair: '#a0602a', bag: '#c9a46a' });
    for (var s = -1; s <= 1; s += 2) { b.box('spine', [s * .1, .25, .123], [.05, .44, .01], '#ffd23f'); b.box('spine', [s * .1, .25, -.123], [.05, .44, .01], '#ffd23f'); }
    b.box('spine', [0, .25, .123], [.05, .44, .01], '#ffd23f');
    b.cyl('arm', [0, -.1, 0], [.064, .05, .064], '#ffd23f');
    b.tor('spine', [0, .5, .02], [.12, .12, .1], '#5ec2ff', [Math.PI / 2, 0, 0]);
    belt(b, '#7a5a3a', '#c9a227');
    for (s = -1; s <= 1; s += 2) { b.ball('hips', [s * .2, -.09, .02], [.05, .065, .05], '#c9b07a'); b.cyl('hips', [s * .2, -.02, .02], [.012, .04, .012], '#7a5a3a'); }
    b.cyl('neck', [0, .23, 0], [.1, .055, .1], '#b07a3a', null, 'hat');
    b.cyl('neck', [0, .258, 0], [.104, .008, .104], '#8a5a2a', null, 'hat');
    for (var i = 0; i < 4; i++) { var a = i / 4 * Math.PI * 2 + .78; b.cyl('neck', [Math.sin(a) * .075, .29, Math.cos(a) * .075], [.005, .07, .005], '#5a3a1a', null, 'hat'); }
    b.ball2('neck', [0, .39, 0], [.1, .115, .1], '#ffd23f', null, 'hat');
    for (i = 0; i < 3; i++) b.box('neck', [0, .39, 0], [.202, .21, .03], '#e8452f', [0, i * Math.PI / 3, 0], 'hat');
    goggles(b, .1, .12, '#5ec2ff', '#b08a3a', null, -.2);
  };
  SKIN[12] = function (b) {   // old-timey explorer: bowler, monocle, moustache, waistcoat, a cane
    figure(b, { shirt: '#8a6a4a', sleeve: '#8a6a4a', fore: '#8a6a4a', hand: '#f2ede0', pants: '#cdb88e', shin: '#4a2a14', shoe: '#4a2a14', hair: '#d0c8b8', bag: '#5a4a32' });
    b.box('spine', [0, .24, .122], [.16, .42, .012], '#5a6a3a');
    for (var y = .12; y < .4; y += .08) b.ball('spine', [0, y, .13], [.012, .012, .008], '#e0b040');
    b.ring('spine', [.05, .2, .128], [.05, .05, .05], '#e0b040');
    b.box('spine', [0, .1, 0], [.41, .04, .25], '#5a4232');
    b.ball('thigh', [0, -.18, 0], [.105, .15, .1], '#cdb88e');
    b.box('neck', [0, .075, .148], [.11, .03, .03], '#e8e2d6'); for (var s = -1; s <= 1; s += 2) b.ball('neck', [s * .065, .08, .14], [.025, .02, .02], '#e8e2d6');
    b.ring('neck', [.05, .13, .153], [.038, .038, .038], '#e0b040');
    b.cyl('neck', [.05, .13, .153], [.03, .004, .03], '#cfe6f0', [Math.PI / 2, 0, 0]);
    b.box('neck', [.085, .05, .14], [.004, .14, .004], '#e0b040', [0, 0, .2]);
    b.hemi('neck', [0, .23, 0], [.155, .13, .155], '#3a2a1a', null, 'hat');
    b.cyl('neck', [0, .232, 0], [.21, .012, .21], '#3a2a1a', null, 'hat');
    b.cyl('neck', [0, .255, 0], [.157, .03, .157], '#1a1210', null, 'hat');
    b.cyl('foreR', [0, -.5, .03], [.013, .45, .013], '#5a3a1a'); b.ball('foreR', [0, -.29, .03], [.025, .025, .025], '#e0b040');
  };
  SKIN[13] = function (b) {   // pirate: three-cornered hat, eye patch, red coat, a spyglass
    figure(b, { shirt: '#a8232a', sleeve: '#a8232a', fore: '#a8232a', pants: '#e8e0cc', shin: '#1d1f24', shoe: '#1d1f24', hair: '#1d1f24', bag: '#6a4a2a' });
    for (var y = .1, i = 0; i < 6; i++, y += .065) b.box('spine', [0, y, .122], [.11, .033, .012], i % 2 ? '#f2ede0' : '#c8302e');
    for (var s = -1; s <= 1; s += 2) for (y = .14; y < .4; y += .1) b.ball('spine', [s * .085, y, .126], [.014, .014, .01], '#e0b040');
    b.box('hips', [0, -.12, -.07], [.42, .26, .1], '#a8232a');
    b.cyl('fore', [0, -.21, 0], [.058, .05, .058], '#e0b040');
    b.box('hips', [0, .07, 0], [.36, .07, .236], '#2a2a6a'); b.ball('hips', [.1, .05, .12], [.04, .04, .02], '#2a2a6a');
    b.box('neck', [.05, .13, .152], [.055, .05, .012], '#111');
    b.ring('neck', [0, .15, 0], [.16, .16, .16], '#111', [Math.PI / 2, 0, .35]);
    b.cyl('neck', [0, .25, 0], [.15, .1, .15], '#1d1f24', null, 'hat');
    for (i = 0; i < 3; i++) {   // three brims turned up, a corner at the front
      var a = i / 3 * Math.PI * 2 + Math.PI / 3;
      b.box('neck', [Math.sin(a) * .15, .275, Math.cos(a) * .15], [.31, .11, .025], '#1d1f24', [.45, a, 0, 'YXZ'], 'hat');
      b.box('neck', [Math.sin(a) * .175, .325, Math.cos(a) * .175], [.31, .014, .03], '#e0b040', [.45, a, 0, 'YXZ'], 'hat');
    }
    b.cyl('foreL', [0, -.29, .1], [.025, .2, .025], '#b08a3a', [Math.PI / 2, 0, 0]); b.cyl('foreL', [0, -.29, .2], [.03, .03, .03], '#2a2d34', [Math.PI / 2, 0, 0]);
  };
  SKIN[14] = function (b) {   // park ranger: flat-brimmed ranger hat, badge, radio
    figure(b, { shirt: '#9aa47a', pants: '#3f5a3a', shoe: '#4a3020', hair: '#5a3c28', bag: '#5a6a3a' });
    for (var s = -1; s <= 1; s += 2) b.box('spine', [s * .1, .34, .124], [.09, .1, .01], '#8a946a');
    b.oct('spine', [.1, .4, .13], [.03, .035, .01], '#e0b040');
    b.box('armL', [.06, -.08, 0], [.01, .07, .05], '#e8c870'); b.box('armR', [-.06, -.08, 0], [.01, .07, .05], '#e8c870');
    belt(b, '#4a3020', '#c9a227');
    b.box('spine', [-.12, .42, .12], [.06, .09, .04], '#2a2d34'); b.cyl('spine', [-.135, .5, .12], [.006, .08, .006], '#2a2d34');
    b.cyl('neck', [0, .228, 0], [.26, .014, .26], '#a07a4a', null, 'hat');
    b.cone4('neck', [0, .3, 0], [.15, .14, .15], '#a8824e', [0, Math.PI / 4, 0], 'hat');
    b.cyl('neck', [0, .25, 0], [.112, .03, .112], '#5a3a1a', null, 'hat');
  };
  SKIN[15] = function (b) {   // astronaut: white suit, gold-visored helmet, life support pack
    figure(b, { shirt: '#f2f2ee', sleeve: '#f2f2ee', fore: '#f2f2ee', hand: '#e2e2dc', handK: 1.2, pants: '#f2f2ee', shoe: '#d8d8d2', foot: [.14, .1, .27], hair: '#3a2a1a', noPack: true, crownY: .35, front: .175 });
    b.box('spine', [0, .3, .14], [.22, .14, .06], '#cfd3d8');
    b.box('spine', [-.05, .32, .172], [.04, .03, .01], '#e8452f'); b.box('spine', [.01, .32, .172], [.04, .03, .01], '#2f7fd6'); b.box('spine', [.065, .32, .172], [.03, .03, .01], '#ffd23f');
    b.box('armL', [.06, -.07, 0], [.01, .06, .07], '#2f7fd6'); b.ball('armL', [.066, -.07, 0], [.005, .015, .015], '#f6f6f2');
    b.cyl('fore', [0, -.2, 0], [.058, .04, .058], '#cfd3d8'); b.cyl('shin', [0, -.3, 0], [.074, .04, .074], '#cfd3d8');
    b.cyl('spine', [0, .53, 0], [.2, .07, .17], '#cfd3d8', null, 'helm');
    b.box('spine', [0, .27, -.2], [.36, .44, .17], '#e8e8e4', null, 'back');
    b.box('spine', [0, .4, -.29], [.24, .05, .01], '#9aa0aa', null, 'back'); b.box('spine', [0, .2, -.29], [.2, .12, .01], '#cfd3d8', null, 'back');
    b.ball2('neck', [0, .15, 0], [.21, .21, .21], '#f6f6f2', null, 'helm');
    b.ball2('neck', [0, .14, .075], [.165, .135, .15], '#d8a62e', null, 'helm');
    b.box('neck', [0, .33, .03], [.08, .03, .14], '#cfd3d8', null, 'helm');
  };
  // ---- Silly ----
  SKIN[16] = function (b) {   // tourist: flowery shirt, camera, sunglasses, socks with sandals
    figure(b, { shirt: '#2fb8a8', sleeve: '#2fb8a8', pants: '#e8d8b0', shin: '#efc6a2', shoe: '#f6f6f2', hair: '#c88a3a', bag: '#ff5d8f' });
    var F = [[.1, .1, 1, '#ffd23f'], [-.09, .2, 1, '#ff5d8f'], [.05, .33, 1, '#ffffff'], [-.12, .4, 1, '#ffd23f'], [.13, .44, 1, '#ff5d8f'], [-.02, .05, 1, '#ffffff'], [.08, .2, -1, '#ff5d8f'], [-.1, .3, -1, '#ffd23f'], [.05, .42, -1, '#ffffff']];
    F.forEach(function (f) { b.ball('spine', [f[0], f[1], .121 * f[2]], [.03, .03, .008], f[3]); });
    b.ball('arm', [0, -.1, .05], [.022, .022, .01], '#ffd23f');
    b.cyl('thigh', [0, -.3, 0], [.086, .16, .086], '#e8d8b0');
    b.cyl('shin', [0, -.28, 0], [.07, .21, .07], '#f6f6f2');
    b.box('shin', [0, -.462, .05], [.13, .022, .27], '#8a5a2a'); b.box('shin', [0, -.4, .11], [.13, .02, .035], '#8a5a2a');
    b.box('spine', [0, .3, .16], [.12, .08, .06], '#2a2d34'); b.cyl('spine', [0, .3, .2], [.03, .03, .03], '#5a6a7a', [Math.PI / 2, 0, 0]);
    for (var s = -1; s <= 1; s += 2) b.box('spine', [s * .085, .41, .14], [.015, .2, .01], '#2a2d34', [0, 0, s * .55]);
    b.box('neck', [0, .135, .152], [.15, .045, .012], '#1d1f24');
    b.ball('neck', [0, .095, .155], [.022, .02, .02], '#ff8a7a');
    b.cyl('neck', [0, .255, 0], [.16, .1, .16], '#e8d08a', null, 'hat');
    b.cyl('neck', [0, .21, 0], [.25, .012, .25], '#dcc27a', null, 'hat');
    b.cyl('neck', [0, .232, 0], [.163, .03, .163], '#ff5d8f', null, 'hat');
  };
  SKIN[17] = function (b) {   // pizza delivery: red cap and shirt, an insulated pizza bag
    figure(b, { shirt: '#d8302a', pants: '#2a2d34', shoe: '#f2f2f2', hair: '#3a2a1a', noPack: true });
    for (var s = -1; s <= 1; s += 2) b.box('spine', [s * .06, .47, .12], [.09, .04, .02], '#f6f6f2', [0, 0, s * .4]);
    b.box('spine', [-.09, .36, .124], [.1, .04, .01], '#f6f6f2');
    b.box('spine', [0, .28, -.2], [.38, .38, .13], '#c8302a', null, 'back');
    b.box('spine', [0, .47, -.2], [.39, .02, .14], '#2a2d34', null, 'back');
    b.cone3('spine', [0, .3, -.267], [.1, .01, .13], '#ffcf5a', [Math.PI / 2, 0, Math.PI], 'back');
    for (var i = 0; i < 3; i++) b.ball('spine', [[-.03, .03, 0][i], [.33, .3, .26][i], -.27], [.018, .018, .008], '#c23a2b', null, 'back');
    b.hemi('neck', [0, .16, 0], [.158, .12, .158], '#d8302a', null, 'hat');
    b.box('neck', [0, .17, .15], [.2, .025, .12], '#d8302a', null, 'hat');
    b.cone3('neck', [0, .22, .14], [.04, .01, .04], '#ffcf5a', [Math.PI / 2 - .5, 0, Math.PI], 'hat');
  };
  SKIN[18] = function (b) {   // window washer: overalls, harness, a squeegee and a bucket
    figure(b, { shirt: '#f2f2ee', pants: '#2f6fb8', shoe: '#3a3d44', hair: '#5a3c28', bag: '#3a3f4a' });
    b.box('spine', [0, .2, .124], [.26, .3, .012], '#2f6fb8'); straps(b, '#2f6fb8', .125);
    b.box('spine', [0, .2, -.124], [.26, .3, .012], '#2f6fb8');
    b.box('spine', [0, .25, .132], [.1, .06, .006], '#f6f6f2');
    b.cyl('thigh', [0, -.06, 0], [.086, .03, .086], '#f2c81f'); b.box('spine', [0, .1, 0], [.41, .03, .25], '#f2c81f');
    b.cyl('foreR', [0, -.37, 0], [.014, .2, .014], '#e8452f');
    b.box('foreR', [0, -.47, 0], [.24, .03, .035], '#2a2d34'); b.box('foreR', [0, -.49, 0], [.23, .012, .02], '#111');
    b.cyl('hips', [.22, -.09, 0], [.07, .11, .07], '#5ec2ff'); b.cyl('hips', [.22, -.035, 0], [.06, .006, .06], '#bfe8ff');
    b.ring('hips', [.22, -.04, 0], [.07, .06, .07], '#9aa3ad', [0, Math.PI / 2, 0]);
    b.hemi('neck', [0, .19, 0], [.17, .15, .18], '#f6f6f2', null, 'hat');
    b.cyl('neck', [0, .2, .01], [.19, .012, .21], '#e8e8e2', null, 'hat');
  };
  SKIN[19] = function (b) {   // grandma: bun, glasses, cardigan, pearls, and her walker
    figure(b, { shirt: '#a98bd6', sleeve: '#a98bd6', fore: '#a98bd6', pants: '#6a5a8a', shin: '#e8d2c0', shoe: '#6a3a3a', hair: '#cfcac2', bag: '#6a5a8a' });
    b.box('spine', [0, .25, .122], [.02, .44, .012], '#8a6cb8');
    for (var y = .12; y < .45; y += .1) b.ball('spine', [.035, y, .127], [.013, .013, .008], '#f6f2ea');
    for (var i = 0; i < 9; i++) { var a = (i / 8 - .5) * 2.2; b.ball('spine', [Math.sin(a) * .13, .49 - Math.cos(a) * .04, Math.cos(a) * .12], [.02, .02, .02], '#f6f2ea'); }
    b.frust('hips', [0, -.15, 0], [.25, .34, .19], '#6a5a8a', null, null, [.82, 1]);
    b.ball('neck', [0, .25, -.1], [.075, .07, .07], '#cfcac2');
    glasses(b, '#a07ab8', .038);
    var M = '#c8ccd2';
    for (var s = -1; s <= 1; s += 2) {
      for (var z = .28; z < .6; z += .26) { b.cyl('body', [s * .23, .43, z], [.015, .86, .015], M); b.ball('body', [s * .23, .02, z], [.03, .03, .03], z > .5 ? '#555' : '#c8e84a'); }
      b.cyl('body', [s * .23, .86, .41], [.016, .3, .016], M, [Math.PI / 2, 0, 0]);
      b.cyl('body', [s * .23, .87, .3], [.024, .1, .024], '#5a5a62', [Math.PI / 2, 0, 0]);
      b.cyl('body', [s * .23, .4, .41], [.012, .26, .012], M, [Math.PI / 2, 0, 0]);
    }
    b.cyl('body', [0, .86, .54], [.016, .46, .016], M, [0, 0, Math.PI / 2]);
  };
  SKIN[20] = function (b) {   // knight: great helm with a plume, armour, a blue tabard
    figure(b, { shirt: '#9aa3b0', sleeve: '#9aa3b0', fore: '#9aa3b0', hand: '#6a717c', handK: 1.15, pants: '#6a717c', shin: '#9aa3b0', shoe: '#6a717c', hair: '#5a3c28', bag: '#6a4a2a', crownY: .34, front: .132 });
    for (var z = -1; z <= 1; z += 2) b.box('spine', [0, .17, .126 * z], [.3, .42, .01], '#2a55c8');
    b.box('spine', [0, .22, .133], [.045, .24, .004], '#ffd23f'); b.box('spine', [0, .27, .133], [.17, .045, .004], '#ffd23f');
    b.ball('arm', [0, .01, 0], [.095, .075, .095], '#b8c0cc');
    b.cyl('fore', [0, -.2, 0], [.06, .07, .06], '#b8c0cc'); b.ball('shin', [0, -.01, .04], [.07, .08, .055], '#b8c0cc');
    belt(b, '#5a3a22', '#c9a227');
    b.cyl('neck', [0, .15, 0], [.175, .3, .175], '#a8b0bc', null, 'helm');
    b.hemi('neck', [0, .3, 0], [.175, .06, .175], '#b8c0cc', null, 'helm');
    b.cyl('neck', [0, .02, 0], [.178, .02, .178], '#e0b040', null, 'helm');
    b.box('neck', [0, .15, .17], [.2, .025, .012], '#1d1f24', null, 'helm');
    b.box('neck', [0, .1, .17], [.012, .09, .012], '#9aa0aa', null, 'helm');
    b.cone('neck', [0, .43, -.03], [.05, .16, .05], '#e8452f', null, 'hat'); b.ball('neck', [0, .38, -.03], [.045, .045, .045], '#e8452f', null, 'hat');
  };
  SKIN[21] = function (b) {   // ninja: dark suit, hood with an eye slit, red headband and sash
    figure(b, { shirt: '#2c2f45', sleeve: '#2c2f45', fore: '#2c2f45', hand: '#2c2f45', pants: '#2c2f45', shoe: '#2c2f45', hair: '#2c2f45', bag: '#3a3f58', eyeTag: 'eyes' });
    b.box('spine', [0, .3, .123], [.22, .2, .01], '#363a54', [0, 0, .8]);
    b.cyl('fore', [0, -.15, 0], [.054, .1, .054], '#4a4f6a'); b.cyl('shin', [0, -.28, 0], [.07, .14, .07], '#4a4f6a');
    b.box('hips', [0, .06, 0], [.36, .06, .24], '#e0342f'); b.ball('hips', [.12, .05, .12], [.04, .035, .02], '#e0342f');
    b.box('hips', [.15, -.03, .12], [.03, .1, .01], '#e0342f', [0, 0, .2]);
    b.ball2('neck', [0, .145, 0], [.163, .173, .163], '#2c2f45', null, 'helm');
    b.box('neck', [0, .13, .145], [.15, .045, .03], '#efc6a2', null, 'helm');
    for (var s = -1; s <= 1; s += 2) b.ball('neck', [s * .05, .13, .162], [.017, .017, .012], '#1d2230', null, 'helm');
    b.ring('neck', [0, .205, 0], [.167, .167, .167], '#e0342f', [Math.PI / 2, 0, 0], 'helm');
    for (s = -1; s <= 1; s += 2) b.box('neck', [s * .03, .15, -.19], [.03, .13, .01], '#e0342f', [.4, 0, s * .2], 'helm');
  };
  SKIN[22] = function (b) {   // chicken suit: the whole chicken
    figure(b, { shirt: '#f6f2e6', sleeve: '#f6f2e6', fore: '#f6f2e6', hand: '#f6f2e6', pants: '#f6f2e6', shin: '#f2a03a', shoe: '#f2a03a', foot: [.1, .04, .2], hair: '#f6f2e6', bag: '#e0b850', crownY: .4, front: .19 });
    b.ball2('spine', [0, .26, .02], [.25, .29, .19], '#f6f2e6');
    b.box('arm', [.035, -.15, -.03], [.03, .28, .17], '#efe8d6', [0, 0, .08]);
    for (var i = 0; i < 3; i++) b.box('arm', [.04, -.27 - i * .02, -.06 + i * .04], [.025, .1, .045], '#e2dac4', [.2, 0, .1]);
    b.ball('thigh', [0, -.13, 0], [.11, .17, .11], '#f6f2e6');
    for (i = -1; i <= 1; i++) b.box('shin', [i * .04, -.45, .13], [.025, .015, .13], '#f2a03a', [0, i * .45, 0]);
    for (i = -1; i <= 1; i++) b.box('hips', [i * .07, .12, -.16], [.06, .2, .025], '#efe8d6', [-.5, 0, i * .45]);
    b.ball2('neck', [0, .17, 0], [.18, .2, .18], '#f6f2e6', null, 'helm');
    b.cone('neck', [0, .13, .2], [.05, .1, .04], '#f2b42a', [Math.PI / 2, 0, 0], 'helm');
    b.ball('neck', [0, .06, .165], [.03, .05, .025], '#e0342f', null, 'helm');
    for (var s = -1; s <= 1; s += 2) b.ball('neck', [s * .08, .2, .15], [.022, .022, .015], '#1d2230', null, 'helm');
    for (i = 0; i < 3; i++) b.ball('neck', [0, .36 + (i === 1 ? .03 : 0), .06 - i * .07], [.025, .05, .035], '#e0342f', null, 'hat');
  };
  // ---- Backpacks ----
  var PACK = [];
  PACK[1] = function (b) {   // parachute pack: harness, ripcord handle
    b.box('spine', [0, .26, -.2], [.34, .42, .14], '#5a6a3a'); b.ball('spine', [0, .46, -.2], [.17, .05, .07], '#5a6a3a');
    b.box('spine', [0, .26, -.272], [.3, .02, .01], '#46542c'); b.box('spine', [0, .14, -.272], [.3, .02, .01], '#46542c');
    b.box('spine', [0, .36, -.272], [.06, .06, .01], '#e8c547');
    straps(b, '#2a2d34', .128); b.box('spine', [0, .36, .132], [.24, .03, .01], '#2a2d34');
    b.ring('spine', [-.1, .29, .14], [.03, .03, .03], '#e8452f');
  };
  PACK[2] = function (b) {   // a teddy bear hanging on for the climb
    var F = '#a8743a', L = '#e0b888';
    b.ball('spine', [0, .24, -.23], [.13, .15, .1], F); b.ball('spine', [0, .23, -.31], [.08, .09, .03], L);
    b.ball2('spine', [0, .44, -.25], [.1, .095, .09], F);
    for (var s = -1; s <= 1; s += 2) { b.ball('spine', [s * .07, .52, -.25], [.035, .035, .022], F); b.ball('spine', [s * .07, .52, -.27], [.02, .02, .01], L); b.ball('spine', [s * .035, .465, -.33], [.014, .014, .01], '#1d1f24'); }
    b.ball('spine', [0, .42, -.335], [.04, .032, .03], L); b.ball('spine', [0, .43, -.362], [.015, .012, .01], '#2a1a10');
    for (s = -1; s <= 1; s += 2) { b.ball('spine', [s * .14, .46, -.06], [.04, .04, .13], F, [.35, 0, 0]); b.ball('spine', [s * .15, .43, .08], [.045, .045, .04], L); b.ball('spine', [s * .08, .11, -.28], [.05, .05, .07], F); }
    b.box('spine', [0, .35, -.31], [.1, .04, .02], '#e8452f');
  };
  PACK[3] = function (b) {   // picnic basket with a checked cloth
    b.box('spine', [0, .26, -.21], [.34, .26, .18], '#c8995a');
    [.17, .23, .29, .35].forEach(function (y) { b.box('spine', [0, y, -.21], [.352, .018, .19], '#a8763a'); });
    b.box('spine', [0, .405, -.21], [.36, .03, .19], '#b8884a');
    b.ring('spine', [0, .42, -.21], [.12, .11, .12], '#8a5a2a');
    b.box('spine', [.12, .43, -.15], [.1, .025, .08], '#e8452f'); b.box('spine', [.12, .432, -.15], [.05, .025, .04], '#f6f2ea');
    straps(b, '#7a5a3a', .126);
  };
  PACK[4] = function (b) {   // a giant sandwich with a pick on top
    b.box('spine', [0, .27, -.165], [.36, .4, .05], '#d89a4a'); b.box('spine', [0, .27, -.315], [.36, .4, .05], '#d89a4a');
    b.box('spine', [0, .27, -.341], [.32, .36, .005], '#f2d8a0');
    b.box('spine', [0, .27, -.205], [.4, .44, .025], '#5ab83a');
    for (var s = -1; s <= 1; s += 2) b.cyl('spine', [s * .08, .3, -.23], [.08, .02, .08], '#e0342f', [Math.PI / 2, 0, 0]);
    b.box('spine', [0, .27, -.255], [.33, .33, .02], '#ffcf3a', [0, 0, Math.PI / 4]);
    b.box('spine', [0, .25, -.278], [.38, .37, .015], '#f2a0a0');
    b.cyl('spine', [0, .52, -.24], [.008, .2, .008], '#e8d8a8'); b.ball('spine', [0, .6, -.24], [.032, .032, .032], '#3a5a2a'); b.ball('spine', [0, .6, -.21], [.012, .012, .01], '#e0342f');
    straps(b, '#7a5a3a', .126);
  };
  PACK[5] = function (b) {   // fake jetpack: two cans and painted cardboard flames
    for (var s = -1; s <= 1; s += 2) {
      b.cyl('spine', [s * .09, .28, -.2], [.07, .38, .07], '#c8ccd4');
      b.cone('spine', [s * .09, .52, -.2], [.07, .1, .07], '#e8452f');
      b.frust('spine', [s * .09, .065, -.2], [.05, .05, .05], '#3a3d44', null, null, [.7, 1]);
      b.cone('spine', [s * .09, -.04, -.2], [.045, .14, .045], '#ff9a2a', [Math.PI, 0, 0]);
      b.cone('spine', [s * .09, -.015, -.2], [.025, .08, .025], '#ffd23f', [Math.PI, 0, 0]);
    }
    b.box('spine', [0, .3, -.2], [.3, .05, .1], '#3a3d44'); b.ball('spine', [0, .38, -.27], [.03, .03, .015], '#ffd23f');
    straps(b, '#3a3d44', .126);
  };
  PACK[6] = function (b) {   // a rolled-up tent and its bag
    b.box('spine', [0, .22, -.19], [.3, .3, .13], '#8a6a3a');
    b.cyl('spine', [0, .43, -.2], [.09, .46, .09], '#3a8a4a', [0, 0, Math.PI / 2]);
    for (var s = -1; s <= 1; s += 2) { b.tor('spine', [s * .14, .43, -.2], [.095, .095, .095], '#2a2d34', [0, Math.PI / 2, 0]); b.cyl('spine', [s * .25, .44, -.18], [.012, .06, .012], '#9aa3ad', [0, 0, Math.PI / 2]); }
    b.cyl('spine', [.26, .4, -.22], [.01, .05, .01], '#9aa3ad', [0, 0, Math.PI / 2]);
    straps(b, '#5a4a32', .126);
  };
  // ---- Height rewards ----
  var REWARD = [];
  REWARD[1] = function (b, k) {   // the 1,000 m Badge: a gold medal with a star, on a blue and white ribbon
    var z = k.front || .125;
    b.box('spine', [.087, .395, z + .002], [.022, .075, .006], '#2f7fd6', [0, 0, .25]); b.box('spine', [.113, .395, z + .002], [.022, .075, .006], '#f6f6f2', [0, 0, -.25]);
    b.cyl('spine', [.1, .335, z + .008], [.042, .012, .042], '#e8b830', [Math.PI / 2, 0, 0]);
    b.cone5('spine', [.1, .335, z + .016], [.028, .01, .028], '#fff2a8', [Math.PI / 2, 0, 0]);
  };
  REWARD[2] = function (b) {   // the Space Helmet: a glass bubble, a collar and an aerial with a blinking light
    b.ball2('neck', [0, .15, 0], [.26, .26, .26], '~#cfeaff');
    b.tor('neck', [0, -.06, 0], [.2, .2, .2], '#e8ecf2', [Math.PI / 2, 0, 0]);
    b.cyl('neck', [0, -.1, 0], [.21, .05, .21], '#c8ccd4');
    b.cyl('neck', [.13, .41, -.04], [.008, .12, .008], '#c8ccd4', [0, 0, -.35]);
    b.ball('neck', [.152, .47, -.04], [.022, .022, .022], '!#ff5a5a');
  };
  REWARD[3] = function (b, k) {   // the Golden Crown
    var y = k.crownY || .28, G = '#f2c443';
    b.cyl('neck', [0, y + .04, 0], [.14, .08, .14], G);
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2;
      b.cone('neck', [Math.sin(a) * .132, y + .115, Math.cos(a) * .132], [.035, .08, .035], G);
      b.ball('neck', [Math.sin(a) * .132, y + .16, Math.cos(a) * .132], [.016, .016, .016], '#fff2a8');
      b.ball('neck', [Math.sin(a) * .142, y + .04, Math.cos(a) * .142], [.02, .02, .012], ['#ff4d6a', '#4d8dff', '#3fdf8f'][i % 3], [0, a, 0]);
    }
  };
  function shadeHex(hex, k) { var c = parseInt(hex.slice(1), 16), r = Math.round(((c >> 16) & 255) * k), g = Math.round(((c >> 8) & 255) * k), bl = Math.round((c & 255) * k); return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1); }

  // ---------------- Init: everything below needs the page ----------------
  function init(X) {
    var THREE = X.THREE, GEO = X.GEO;
    var geos = {
      box: GEO.box, sph: GEO.sph, sph2: GEO.sph2, cyl8: X.cylG(8), cyl: X.cylG(12),
      cone: new THREE.ConeGeometry(1, 1, 12), cone4: new THREE.ConeGeometry(1, 1, 4), cone3: new THREE.ConeGeometry(1, 1, 3), cone5: new THREE.ConeGeometry(1, 1, 5),
      hemi: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), tor: new THREE.TorusGeometry(1, .28, 6, 18), ring: new THREE.TorusGeometry(1, .1, 5, 22),
      oct: new THREE.OctahedronGeometry(1, 0)
    };
    var frusts = {};
    function frustG(t, bt) { var k = t + '_' + bt; return frusts[k] || (frusts[k] = new THREE.CylinderGeometry(t, bt, 1, 16, 1)); }
    // one shared material for every dressed figure (vertex colours), one for glowing bits, one for the helmet glass
    var MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
    var GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
    var GLASS = new THREE.MeshPhongMaterial({ color: 0xcfeaff, transparent: true, opacity: .26, shininess: 90, specular: 0xffffff, depthWrite: false });

    function Builder() {
      var P = [];
      function add(geo) { return function (bone, p, s, col, r, tag, extra) { P.push({ bone: bone, geo: geo, p: p, s: s, col: col, r: r || null, tag: tag || '', extra: extra }); }; }
      var b = { P: P };
      ['box', 'cyl', 'cyl8', 'cone', 'cone3', 'cone4', 'cone5', 'hemi', 'tor', 'ring', 'oct'].forEach(function (g) { b[g] = add(g); });
      b.ball = add('sph'); b.ball2 = add('sph2'); b.frust = add('frust');
      return b;
    }
    var SIDE = { arm: ['aL', 'aR'], fore: ['eL', 'eR'], thigh: ['lL', 'lR'], shin: ['kL', 'kR'] };
    var ONE = { armL: 'aL', armR: 'aR', foreL: 'eL', foreR: 'eR', thighL: 'lL', thighR: 'lR', shinL: 'kL', shinR: 'kR', hips: 'hips', spine: 'spine', neck: 'neck', body: 'body' };
    var _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Matrix3(), _c = new THREE.Color(), _w = new THREE.Vector3();
    function put(B, geo, x, y, z, s, r, mir, col) {
      if (r) _e.set(r[0], mir ? -r[1] : r[1], mir ? -r[2] : r[2], r[3] || 'XYZ'); else _e.set(0, 0, 0, 'XYZ');
      _q.setFromEuler(_e); _m.compose(_v.set(x, y, z), _q, _s.set(s[0], s[1], s[2])); _n.getNormalMatrix(_m); _c.set(col);
      var P = geo.attributes.position, N = geo.attributes.normal, I = geo.index, o = B.p.length / 3, i;
      for (i = 0; i < P.count; i++) {
        _w.fromBufferAttribute(P, i).applyMatrix4(_m); B.p.push(_w.x, _w.y, _w.z);
        _w.fromBufferAttribute(N, i).applyMatrix3(_n).normalize(); B.n.push(_w.x, _w.y, _w.z);
        B.c.push(_c.r, _c.g, _c.b);
      }
      if (I) for (i = 0; i < I.count; i++) B.i.push(I.getX(i) + o); else for (i = 0; i < P.count; i++) B.i.push(o + i);
    }
    // build the meshes' geometries for a look (cached: the same look always gives the same shapes)
    var cache = new Map();
    function partsFor(L, color) {
      var key = code(L) + (L.s ? '' : '|' + color);
      if (cache.has(key)) return cache.get(key);
      var b = Builder();
      (SKIN[L.s] || SKIN[0])(b, color);
      var k = b.k || {};
      if (L.p && PACK[L.p]) PACK[L.p](b, k);
      if (L.r && REWARD[L.r]) REWARD[L.r](b, k);
      var out = {}, bare = L.r === 2 || L.r === 3 || !b.P.some(function (p) { return p.tag === 'hat'; });
      b.P.forEach(function (p) {
        var t = p.tag;
        if ((t === 'hat' && (L.r === 2 || L.r === 3)) || (t === 'hair' && !bare) || (t === 'helm' && L.r === 2) || (t === 'back' && L.p)) return;
        var kind = p.col.charAt(0) === '!' ? 'glow' : p.col.charAt(0) === '~' ? 'glass' : 'lam', col = kind === 'lam' ? p.col : p.col.slice(1);
        var geo = p.geo === 'frust' ? frustG(p.extra[0], p.extra[1]) : geos[p.geo];
        var bones = SIDE[p.bone] ? [[SIDE[p.bone][0], false], [SIDE[p.bone][1], true]] : [[ONE[p.bone], false]];
        bones.forEach(function (bm) {
          var bone = bm[0], mir = bm[1];
          var B = (out[bone] || (out[bone] = {}))[kind] || (out[bone][kind] = { p: [], n: [], c: [], i: [] });
          put(B, geo, mir ? -p.p[0] : p.p[0], p.p[1], p.p[2], p.s, p.r, mir, col);
        });
      });
      var res = {};
      Object.keys(out).forEach(function (bone) {
        res[bone] = {};
        Object.keys(out[bone]).forEach(function (kind) {
          var B = out[bone][kind], g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
          g.setIndex(B.i); g.computeBoundingSphere(); res[bone][kind] = g;
        });
      });
      cache.set(key, res);
      return res;
    }
    // Dress a figure (index.html's makeAvatar) in a look; null or the default look puts the plain figure back.
    function dress(A, L) {
      var key = L ? code(L) : '';
      if (key && !L.s) key += '|' + A.color;
      var cur = A.gear ? A.gear.key : '';
      if (cur === key) return;
      if (A.gear) A.gear.meshes.forEach(function (m) { if (m.parent) m.parent.remove(m); });
      if (!A.gearOrig) { A.gearOrig = []; A.root.traverse(function (o) { if (o.isMesh) A.gearOrig.push(o); }); }
      if (!key) { A.gearOrig.forEach(function (o) { o.visible = true; }); A.gear = null; return; }
      A.gearOrig.forEach(function (o) { o.visible = false; });
      var parts = partsFor(L, A.color), meshes = [];
      Object.keys(parts).forEach(function (bone) {
        Object.keys(parts[bone]).forEach(function (kind) {
          var m = new THREE.Mesh(parts[bone][kind], kind === 'glow' ? GLOW : kind === 'glass' ? GLASS : MAT);
          if (kind === 'glass') m.renderOrder = 4;
          A[bone].add(m); meshes.push(m);
        });
      });
      A.gear = { key: key, look: L, meshes: meshes };
    }

    // ---------------- My look ----------------
    var access = false, mine = clean(X.store.get('gear', null), X.best.h), lvl = earned(X.best.h);
    function myLook() { return access ? mine : null; }
    function apply() { dress(X.myAv, access ? mine : null); if (X.changed) X.changed(); }
    function save() { X.store.set('gear', { s: mine.s, p: mine.p, r: mine.r, x: mine.x, t: mine.t }); }

    // ---------------- Fall screams (made with Web Audio) ----------------
    var VOW = { a: [[800, 6, 1], [1150, 8, .55], [2900, 10, .25]], e: [[300, 6, 1], [2250, 10, .45], [3000, 10, .25]], o: [[460, 6, 1], [820, 8, .5], [2800, 10, .2]], u: [[330, 6, 1], [720, 8, .35], [2500, 10, .15]] };
    function voice(ac, out, t, dur, notes, vib, wave) {   // notes: [[time, pitch, vowel]], sung through three formant filters
      var o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain(), fs = [];
      o.type = wave || 'sawtooth'; lfo.frequency.value = vib ? vib[0] : 5.5; lg.gain.value = 0; lfo.connect(lg); lg.connect(o.frequency);
      for (var j = 0; j < 3; j++) { var f = ac.createBiquadFilter(), fg = ac.createGain(); f.type = 'bandpass'; o.connect(f); f.connect(fg); fg.connect(g); fs.push([f, fg]); }
      notes.forEach(function (n, i) {
        var at = t + n[0], V = VOW[n[2] || 'a'];
        if (i === 0) o.frequency.setValueAtTime(n[1], at); else o.frequency.exponentialRampToValueAtTime(n[1], at);
        lg.gain.setValueAtTime(n[1] * (vib ? vib[1] : .02), at);
        fs.forEach(function (F, j) { if (i === 0) { F[0].frequency.setValueAtTime(V[j][0], at); F[1].gain.setValueAtTime(V[j][2], at); } else { F[0].frequency.linearRampToValueAtTime(V[j][0], at); F[1].gain.linearRampToValueAtTime(V[j][2], at); } F[0].Q.value = V[j][1]; });
      });
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .05); g.gain.setValueAtTime(1, t + dur - .25); g.gain.linearRampToValueAtTime(0, t + dur);
      g.connect(out); o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
    }
    function scream(n, vol) {
      var A = X.audio(); if (!A || !n) return;
      var ac = A.ac, t = ac.currentTime + .01, out = ac.createGain(); out.gain.value = vol; out.connect(A.bus);
      if (n === 1) { out.gain.value = vol * 2.4; voice(ac, out, t, 1.5, [[0, 500, 'a'], [.12, 580, 'a'], [1.5, 300, 'a']], [6, .025]); }
      else if (n === 2) { out.gain.value = vol * 2.4; var syl = [[300, 'o'], [470, 'e'], [300, 'o'], [470, 'e'], [350, 'u'], [520, 'a'], [400, 'o']], N = []; syl.forEach(function (s, i) { N.push([i * .2, s[0], s[1]]); N.push([i * .2 + .17, s[0], s[1]]); }); voice(ac, out, t, 1.45, N, [6, .01]); }
      else if (n === 3) { var o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1700, t); o.frequency.exponentialRampToValueAtTime(320, t + 1.5); lfo.frequency.value = 7; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .04); g.gain.setValueAtTime(.55, t + 1.3); g.gain.linearRampToValueAtTime(0, t + 1.55); o.connect(g); g.connect(out); o.start(t); lfo.start(t); o.stop(t + 1.6); lfo.stop(t + 1.6); }
      else if (n === 4) { out.gain.value = vol * 2; voice(ac, out, t, 1.7, [[0, 620, 'a'], [.15, 660, 'a'], [1.3, 660, 'a'], [1.7, 440, 'o']], [5.5, .035]); voice(ac, out, t, 1.7, [[0, 1240, 'a'], [.15, 1320, 'a'], [1.3, 1320, 'a'], [1.7, 880, 'o']], [5.5, .035], 'triangle'); }
      else if (n === 5) { out.gain.value = vol * 2.4; voice(ac, out, t, 1.3, [[0, 380, 'e'], [.9, 880, 'e'], [1.3, 820, 'e']], [7, .02]); }
    }
    // ---------------- Plummet trails ----------------
    var TN = 22, TLIFE = .5;
    var fade = (function () {
      var c = document.createElement('canvas'); c.width = 64; c.height = 16; var x = c.getContext('2d'), d = x.createImageData(64, 16);
      for (var i = 0; i < 64; i++) for (var j = 0; j < 16; j++) { var u = i / 63, v = j / 15, a = Math.pow(1 - u, 1.3) * Math.sin(Math.PI * v); var q = (j * 64 + i) * 4; d.data[q] = d.data[q + 1] = d.data[q + 2] = 255; d.data[q + 3] = Math.round(255 * Math.min(1, a * 1.25)); }
      x.putImageData(d, 0, 0); return new THREE.CanvasTexture(c);
    })();
    var TMAT = new THREE.MeshBasicMaterial({ map: fade, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    var RAINBOW = ['#ff4d4d', '#ff9a2a', '#ffe14a', '#4ddf6a', '#4db8ff', '#8a6aff', '#ff6ad5'].map(function (h) { return new THREE.Color(h); });
    function trailColor(n, i, f, t, out) {   // f: 0 at the climber, 1 at the end
      if (n === 1) { var x = (f * 6 + t * 2) % 7, a = Math.floor(x), k = x - a; out.copy(RAINBOW[a]).lerp(RAINBOW[(a + 1) % 7], k); }
      else if (n === 2) out.setRGB(1, 1, 1).lerp(_c.set('#6fd0ff'), Math.min(1, f * 2)).lerp(_c.set('#3a4aff'), Math.max(0, f * 2 - 1));
      else if (n === 3) out.set('#f2f2f2').lerp(_c.set('#9aa0a8'), f);
      else { var s = .55 + .45 * Math.sin(t * 22 + i * 2.6); out.set('#ffd23f').lerp(_c.set('#fff8d0'), s > .9 ? 1 : s * .4).multiplyScalar(.75 + .25 * s); }
      return out;
    }
    function trailWidth(n, f) { return n === 2 ? .6 - .5 * f : n === 3 ? .3 + .8 * f : n === 4 ? .4 : .45; }
    function makeTrail() {
      var g = new THREE.BufferGeometry(), idx = [];
      for (var i = 0; i < TN - 1; i++) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TN * 6), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TN * 6), 3));
      var uv = new Float32Array(TN * 4); for (i = 0; i < TN; i++) { uv[i * 4] = uv[i * 4 + 2] = i / (TN - 1); uv[i * 4 + 1] = 0; uv[i * 4 + 3] = 1; }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
      var m = new THREE.Mesh(g, TMAT); m.frustumCulled = false; m.renderOrder = 3; m.visible = false; X.scene.add(m); return m;
    }
    var states = new Map(), stamp = 0, _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _sd = new THREE.Vector3(), _col = new THREE.Color();
    function drawTrail(S, n, now, demo, root) {
      var pts = S.pts;
      if (!S.mesh) S.mesh = makeTrail();
      var m = S.mesh, P = m.geometry.attributes.position.array, Cc = m.geometry.attributes.color.array, cam = X.camera.position, k = 0, last = null;
      if (demo) { pts.length = 0; for (var i = 0; i < TN; i++) pts.push({ x: root.x, y: root.y + 1 + i * .55, z: root.z, t: now - i * TLIFE / TN }); }
      var count = Math.min(pts.length, TN);
      if (count < 2) { m.visible = false; return; }
      for (i = 0; i < count; i++) {
        var p = pts[i], q = pts[Math.min(count - 1, i + 1)], r0 = pts[Math.max(0, i - 1)];
        _d.set(r0.x - q.x, r0.y - q.y, r0.z - q.z); if (_d.lengthSq() < 1e-6) _d.set(0, 1, 0);
        _a.set(p.x - cam.x, p.y - cam.y, p.z - cam.z); _sd.crossVectors(_d, _a); if (_sd.lengthSq() < 1e-8) _sd.set(1, 0, 0);
        var f = i / (count - 1), w = trailWidth(n, f) * .5; _sd.normalize().multiplyScalar(w);
        P[k] = p.x + _sd.x; P[k + 1] = p.y + _sd.y; P[k + 2] = p.z + _sd.z; P[k + 3] = p.x - _sd.x; P[k + 4] = p.y - _sd.y; P[k + 5] = p.z - _sd.z;
        trailColor(n, i, f, now, _col); Cc[k] = Cc[k + 3] = _col.r; Cc[k + 1] = Cc[k + 4] = _col.g; Cc[k + 2] = Cc[k + 5] = _col.b; k += 6;
      }
      // the unused end sits on the last point (stretched to nothing)
      for (i = count; i < TN; i++) { P[i * 6] = P[i * 6 + 3] = P[(count - 1) * 6]; P[i * 6 + 1] = P[i * 6 + 4] = P[(count - 1) * 6 + 1]; P[i * 6 + 2] = P[i * 6 + 5] = P[(count - 1) * 6 + 2]; }
      m.geometry.attributes.position.needsUpdate = true; m.geometry.attributes.color.needsUpdate = true; m.visible = true;
    }
    // each frame: everyone wearing a scream or a trail (the page calls this only while this file is loaded)
    var demo = { until: 0, x: 0, t: 0 };
    function frame(dt) {
      stamp++;
      var now = performance.now() / 1000;
      // a new height reward (captains only, while Gear is open to them)
      if (access) { var nl = earned(X.best.h); if (nl > lvl) { for (var r = lvl + 1; r <= nl; r++) X.feed('New in your Gear: ' + NAMES.reward[r]); X.sfx('best'); lvl = nl; if (ui && !ui.sec.hidden && ui.tab === 'reward') render(); } }
      X.eachClimber(function (A, falling, isMe, pos) {
        var L = A.gear && A.gear.look; if (!L || (!L.x && !L.t)) return;
        var S = states.get(A); if (!S) states.set(A, S = { pts: [], fallT: 0, screamed: false, lastPush: 0, mesh: null, A: A });
        S.stamp = stamp;
        var isDemo = isMe && demo.until > now;
        S.fallT = falling ? S.fallT + dt : 0;
        var go = isDemo || (isMe ? falling : S.fallT > .35);
        if (L.x) { if (go && !S.screamed && !isDemo) { S.screamed = true; var d = isMe ? 0 : X.camera.position.distanceTo(A.root.position); if (d < 45) scream(L.x, (isMe ? .5 : .4) * (1 - d / 45)); } if (!go && S.fallT === 0) S.screamed = false; }
        if (!L.t) { if (S.mesh) S.mesh.visible = false; return; }
        if (go && !isDemo && now - S.lastPush > 1 / 40 && A.root.visible) { S.lastPush = now; S.pts.unshift({ x: pos.x, y: pos.y + 1, z: pos.z, t: now }); if (S.pts.length > TN) S.pts.length = TN; }
        while (S.pts.length && now - S.pts[S.pts.length - 1].t > TLIFE) S.pts.pop();
        if (go && !isDemo && S.pts.length) { S.pts[0].x = pos.x; S.pts[0].y = pos.y + 1; S.pts[0].z = pos.z; }
        if (!A.root.visible && !isDemo) { if (S.mesh) S.mesh.visible = false; return; }
        if (isDemo) { if (demo.t) drawTrail(S, demo.t, now, true, pos); else if (S.mesh) S.mesh.visible = false; }
        else if (S.pts.length > 1) drawTrail(S, L.t, now, false); else if (S.mesh) S.mesh.visible = false;
      });
      states.forEach(function (S, A) { if (S.stamp !== stamp) { if (S.mesh) { S.mesh.visible = false; if (!A.root.parent) { X.scene.remove(S.mesh); S.mesh.geometry.dispose(); states.delete(A); } } } });
      if (demo.until > now && access) X.poseFall(X.myAv);
    }

    // ---------------- The Gear screen ----------------
    var ui = null;
    var CSS = '#gear{position:absolute;inset:0;touch-action:none;cursor:grab}' +
      '#gear .gp{position:absolute;right:calc(16px + env(safe-area-inset-right,0px));top:calc(16px + env(safe-area-inset-top,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));width:min(480px,46vw);display:flex;flex-direction:column;padding:18px;cursor:default;touch-action:pan-y}' +
      '#gear .gh{display:flex;align-items:center;gap:10px;margin-bottom:10px}#gear h2{margin:0;font-weight:900;font-size:28px;letter-spacing:-.01em;flex:1}' +
      '#gear .gcap{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--sun);border:1px solid rgba(255,179,71,.5);border-radius:999px;padding:3px 8px;white-space:nowrap}' +
      '#gear .gtabs{display:grid;grid-template-columns:repeat(4,1fr);width:100%;margin-bottom:10px}#gear .gtabs button{padding:8px 4px;font-size:14px}' +
      '#gear .gscroll{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;margin:0 -6px;padding:0 6px}' +
      '#gear .glab{font-weight:700;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:10px 0 6px}#gear .glab:first-child{margin-top:0}' +
      '#gear .ggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}' +
      '#gear .gt{position:relative;display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:5px 5px 7px;border-radius:14px;border:1px solid var(--line);background:var(--glass-2);font-weight:700;font-size:12px;line-height:1.15;text-align:center;min-width:0}' +
      '#gear .gt:hover{background:rgba(255,255,255,.12)}#gear .gt[aria-pressed="true"]{border-color:var(--sun);box-shadow:0 0 0 2px rgba(255,179,71,.55);background:rgba(255,179,71,.14)}' +
      '#gear .gt canvas{display:block;width:100%;height:auto;aspect-ratio:1;border-radius:10px;background:#1c2748}' +
      '#gear .gt.lock canvas{filter:grayscale(1) brightness(.45)}#gear .gt .lk{position:absolute;left:0;right:0;top:30%;font-size:12px;font-weight:800;color:#fff;text-shadow:0 1px 3px #000}' +
      '#gear .gdesc{min-height:2.7em;margin:10px 0 0;font-size:13.5px;font-weight:500;color:var(--ink-2);line-height:1.4}#gear .gdesc b{color:var(--ink)}' +
      '#gear .gfoot{display:flex;gap:10px;margin-top:10px}#gear .gfoot .btn{flex:1}' +
      '#gear .ghint{position:absolute;left:calc(18px + env(safe-area-inset-left,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));font-size:12.5px;font-weight:700;color:rgba(255,255,255,.75);text-shadow:0 1px 4px rgba(0,0,0,.6);pointer-events:none}' +
      '@media (orientation:portrait),(max-width:640px){#gear .gp{left:calc(10px + env(safe-area-inset-left,0px));right:calc(10px + env(safe-area-inset-right,0px));width:auto;top:auto;height:58%;bottom:calc(10px + env(safe-area-inset-bottom,0px));padding:14px}#gear h2{font-size:24px}#gear .ggrid{grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px}#gear .ghint{bottom:auto;top:calc(14px + env(safe-area-inset-top,0px))}}' +
      '@media (orientation:landscape) and (max-height:500px){#gear .gp{top:calc(8px + env(safe-area-inset-top,0px));bottom:calc(8px + env(safe-area-inset-bottom,0px));width:min(470px,54vw);padding:10px 12px}#gear h2{font-size:21px}#gear .gh{margin-bottom:6px}#gear .gtabs{margin-bottom:6px}#gear .gtabs button{padding:6px 4px;font-size:13px}#gear .ggrid{grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px}#gear .gt{font-size:11px}#gear .gdesc{min-height:0;margin-top:6px;font-size:12.5px}#gear .gfoot{margin-top:6px}#gear .gfoot .btn{padding:7px 12px;font-size:15px}}';
    var DESC = {
      skin: ['The climber as always, in your own colour.', 'Fedora, leather jacket and a satchel for the long way up.', 'A puffy jacket, a bobble hat, goggles and a coil of rope.', 'A parka with a fur-trimmed hood and big mittens.', 'Pith helmet, khaki pockets, binoculars and knee socks.', 'A brass helmet with portholes and lead boots. Not waterproof up here.', 'Leather flying cap, goggles and a long white scarf.', 'A hard hat with a headlamp, orange overalls and a harness.', 'A red bandana, a vest and a map with an X on it.', 'Bucket hat, round glasses, a tool belt and a brush for the dust.', 'A yellow slicker with the hood up, wellies and a wind gauge.', 'A striped jacket, sandbags and a very small balloon for a hat.', 'Bowler hat, monocle, moustache and a walking cane.', 'A three-cornered hat, an eye patch, a red coat and a spyglass.', 'A ranger hat with a pinched top, a badge and a radio.', 'A white suit, a gold visor and a life support pack.', 'Flowery shirt, a camera, sunglasses, and socks with sandals.', 'A red cap and an insulated pizza bag. Thirty minutes or less.', 'Overalls, a harness, a squeegee and a bucket.', 'A bun, pearls, a cardigan, and her trusty walker.', 'A great helm with a plume, armour and a blue tabard.', 'A dark suit, a red headband and a red sash.', 'The whole chicken: comb, beak, wings and orange feet.'],
      pack: ['The climbing pack and bedroll, in your look\'s colours.', 'A parachute pack with a harness and a red ripcord. Purely for show.', 'A teddy bear hanging on for the climb.', 'A wicker picnic basket with a checked cloth peeking out.', 'Bread, lettuce, tomato, cheese, ham, and a pick with an olive.', 'Two cans and painted cardboard flames. It does not fly.', 'A rolled-up tent, its poles and a bag.'],
      reward: ['Wear nothing for your height.', 'A gold medal for reaching the old summit, 1,000 m up.', 'A glass bubble helmet with a blinking aerial, for reaching Orbit Yard at 2,200 m, where space starts.', 'A golden crown for finishing the climb: the Crown at 3,000 m.'],
      scream: ['No scream: falls are quiet, apart from the wind.', 'A long, falling "Aaaah!"', 'Yo-de-lay-ee-oo, all the way down.', 'A cartoon slide whistle, high to low.', 'One grand, wobbling high note.', 'A happy "Wheee!" that rises as you drop.'],
      trail: ['No trail.', 'Every colour, streaming out above you.', 'A white-hot tail that cools to blue.', 'A puffy grey smoke trail that spreads out.', 'A ribbon of twinkling gold.']
    };
    var TABS = [['skin', 'Skins'], ['pack', 'Packs'], ['reward', 'Height'], ['extra', 'Extras']];
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function makeUI() {
      if (ui) return;
      var st = el('style'); st.id = 'gearCss'; st.textContent = CSS; document.head.appendChild(st);
      var sec = el('section'); sec.id = 'gear'; sec.hidden = true; sec.setAttribute('aria-label', 'Gear');
      sec.innerHTML = '<div class="ghint">Drag to turn</div><div class="gp card" role="dialog" aria-label="Gear"><div class="gh"><h2>Gear</h2><span class="gcap">Captains only</span></div><div class="seg gtabs" role="tablist"></div><div class="gscroll"></div><p class="gdesc"></p><div class="gfoot"><button class="btn go" type="button" data-done>Done</button></div></div>';
      X.$('app').appendChild(sec);
      var tabs = sec.querySelector('.gtabs');
      TABS.forEach(function (t) { var b = el('button', '', t[1]); b.type = 'button'; b.dataset.tab = t[0]; b.setAttribute('role', 'tab'); tabs.appendChild(b); });
      ui = { sec: sec, css: st, tab: 'skin', panel: sec.querySelector('.gp'), scroll: sec.querySelector('.gscroll'), desc: sec.querySelector('.gdesc'), thumbs: {}, yaw: .5, drag: null, btns: [] };
      tabs.onclick = function (e) { var t = e.target.dataset && e.target.dataset.tab; if (t) { ui.tab = t; ui.scroll.scrollTop = 0; render(); X.sfx('ui'); } };
      sec.querySelector('[data-done]').onclick = close;
      ui.scroll.onclick = function (e) {
        var b = e.target.closest && e.target.closest('.gt'); if (!b) return;
        var k = b.dataset.k, n = +b.dataset.n;
        if (k === 'r' && n > earned(X.best.h)) { showDesc('reward', n); X.sfx('bonk'); return; }
        mine[k] = n; save(); apply(); render(); X.sfx('ui');
        if (k === 'x' || k === 't') { demo.until = performance.now() / 1000 + 2.2; demo.t = mine.t; if (k === 'x' && n) { X.initAudio(); scream(n, .5); } }
      };
      // drag on the open part of the screen to turn the climber round
      sec.addEventListener('pointerdown', function (e) { if (ui.panel.contains(e.target)) return; ui.drag = { x: e.clientX, id: e.pointerId }; try { sec.setPointerCapture(e.pointerId); } catch (er) {} });
      sec.addEventListener('pointermove', function (e) { if (!ui.drag || ui.drag.id !== e.pointerId) return; ui.yaw -= (e.clientX - ui.drag.x) * .01; ui.drag.x = e.clientX; });
      var end = function (e) { if (ui.drag && ui.drag.id === e.pointerId) ui.drag = null; };
      sec.addEventListener('pointerup', end); sec.addEventListener('pointercancel', end);
      sec.addEventListener('wheel', function (e) { if (!ui.panel.contains(e.target)) e.preventDefault(); }, { passive: false });
      addEventListener('keydown', function (e) { if (ui && !ui.sec.hidden && e.code === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } }, true);
    }
    function addButtons() {
      [['menu', 'gearMenu'], ['pause', 'gearPause']].forEach(function (p) {
        if (X.$(p[1])) return;
        var row = X.$(p[0]).querySelector('.menu-btns'); if (!row) return;
        var b = el('button', 'btn', 'Gear'); b.id = p[1]; b.type = 'button'; b.style.gridColumn = '1/-1'; b.onclick = open; row.appendChild(b);
      });
    }
    function removeUI() {
      ['gearMenu', 'gearPause'].forEach(function (id) { var b = X.$(id); if (b) b.remove(); });
      if (ui) { if (!ui.sec.hidden) close(); ui.sec.remove(); ui.css.remove(); ui = null; }
    }
    function showDesc(k, n) {
      var txt = DESC[k][n], nm = NAMES[k][n];
      if (k === 'reward' && n) { var need = REWARD_AT[n], h = Math.floor(X.best.h); txt += n > earned(X.best.h) ? ' Reach ' + need.toLocaleString('en-US') + ' m (' + REWARD_WHERE[n] + ') to earn it. Your best: ' + h.toLocaleString('en-US') + ' m.' : ' Earned.'; }
      ui.desc.innerHTML = '<b>' + esc(nm) + '.</b> ' + esc(txt);
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function tile(k, n, label, lock) {
      var b = el('button', 'gt' + (lock ? ' lock' : '')); b.type = 'button'; b.dataset.k = k; b.dataset.n = n; b.setAttribute('aria-pressed', String(mine[k] === n));
      var c = thumb(k, n); b.appendChild(c); b.appendChild(document.createTextNode(label));
      if (lock) b.appendChild(el('span', 'lk', lock));
      return b;
    }
    function render() {
      if (!ui) return;
      Array.prototype.forEach.call(ui.sec.querySelectorAll('.gtabs button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.tab === ui.tab)); b.setAttribute('aria-selected', String(b.dataset.tab === ui.tab)); });
      var S = ui.scroll; S.textContent = '';
      var grid = function (label) { if (label) S.appendChild(el('div', 'glab', label)); var g = el('div', 'ggrid'); S.appendChild(g); return g; };
      var g, i, lv = earned(X.best.h);
      if (ui.tab === 'skin') {
        g = grid('Classic'); g.appendChild(tile('s', 0, NAMES.skin[0]));
        g = grid('Adventurers'); for (i = 1; i <= ADVENTURERS; i++) g.appendChild(tile('s', i, NAMES.skin[i]));
        g = grid('Silly'); for (i = ADVENTURERS + 1; i <= MAX.s; i++) g.appendChild(tile('s', i, NAMES.skin[i]));
        showDesc('skin', mine.s);
      } else if (ui.tab === 'pack') {
        g = grid(''); for (i = 0; i <= MAX.p; i++) g.appendChild(tile('p', i, NAMES.pack[i]));
        showDesc('pack', mine.p);
      } else if (ui.tab === 'reward') {
        S.appendChild(el('div', 'glab', 'Earned by your best height: ' + Math.floor(X.best.h).toLocaleString('en-US') + ' m'));
        g = grid(''); for (i = 0; i <= 3; i++) g.appendChild(tile('r', i, NAMES.reward[i], i > lv ? REWARD_AT[i].toLocaleString('en-US') + ' m' : ''));
        showDesc('reward', mine.r);
      } else {
        g = grid('Fall scream'); for (i = 0; i <= MAX.x; i++) g.appendChild(tile('x', i, NAMES.scream[i]));
        g = grid('Plummet trail'); for (i = 0; i <= MAX.t; i++) g.appendChild(tile('t', i, NAMES.trail[i]));
        ui.desc.innerHTML = '<b>' + esc(NAMES.scream[mine.x]) + '</b> and <b>' + esc(NAMES.trail[mine.t]) + '.</b> They happen when you drop a long way. Tap one to try it.';
      }
    }
    // ---- thumbnails: the real figure, drawn once each with the game's own renderer ----
    var TS = null, TC = null, MAN = null, pending = [];
    function thumb(k, n) {
      var key = tkey(k, n), c = document.createElement('canvas'); c.width = c.height = 128;
      var have = ui.thumbs[key];
      if (have) c.getContext('2d').drawImage(have, 0, 0);
      else if (k === 'x' || k === 't') { flatThumb(c, k, n); ui.thumbs[key] = c; }
      else pending.push([k, n, c]);
      return c;
    }
    function tkey(k, n) { return k + n + (k === 'p' || k === 'r' ? '_' + mine.s : ''); }   // packs and rewards are shown on the skin you wear
    function flatThumb(c, k, n) {
      var x = c.getContext('2d'); x.fillStyle = '#1c2748'; x.fillRect(0, 0, 128, 128);
      if (!n) { x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 26, 0, 7); x.moveTo(46, 82); x.lineTo(82, 46); x.stroke(); return; }
      if (k === 't') {
        for (var i = 0; i < 60; i++) { var f = i / 59; trailColor(n, i, f, 0, _col); var w = trailWidth(n, f) * 34; x.globalAlpha = Math.pow(1 - f, 1.2); x.fillStyle = '#' + _col.getHexString(); x.fillRect(64 - w / 2, 90 - f * 82, w, 2); }
        x.globalAlpha = 1; x.fillStyle = '#f4f6fb'; x.beginPath(); x.arc(64, 100, 9, 0, 7); x.fill(); x.fillRect(57, 104, 14, 14);
      } else {
        x.fillStyle = '#f4f6fb'; x.beginPath(); x.moveTo(30, 40); x.lineTo(46, 40); x.lineTo(62, 26); x.lineTo(62, 102); x.lineTo(46, 88); x.lineTo(30, 88); x.closePath(); x.fill();
        x.strokeStyle = '#ffb347'; x.lineWidth = 5; x.lineCap = 'round'; for (var r = 0; r < 3; r++) { x.beginPath(); x.arc(64, 64, 16 + r * 13, -.7, .7); x.stroke(); }
        x.fillStyle = '#ffb347'; x.font = '800 15px Outfit, Arial, sans-serif'; x.textAlign = 'center'; x.fillText(['', 'AAA!', 'YO-DE', 'WHEEW', 'LA~', 'WHEE'][n], 64, 122);
      }
    }
    function drawPending() {
      if (!pending.length) return;
      var R = X.renderer;
      if (!TS) {
        TS = new THREE.Scene(); TS.background = new THREE.Color('#1c2748');
        TS.add(new THREE.HemisphereLight(0xdcecff, 0x7d7468, .8)); var d = new THREE.DirectionalLight(0xfff2d8, 1); d.position.set(.6, 1, .9); TS.add(d);
        var d2 = new THREE.DirectionalLight(0xbfd8ff, .35); d2.position.set(-.8, .4, -.9); TS.add(d2);
        TC = new THREE.PerspectiveCamera(30, 1, .05, 30); MAN = X.makeAvatar(X.myColor()); TS.add(MAN.root);
        X.poseIdle(MAN);
      }
      var pr = R.getPixelRatio(), S = Math.min(128, Math.floor(Math.min(R.domElement.width, R.domElement.height) / pr)), px = Math.floor(S * pr), H = R.domElement.height;
      R.setScissorTest(true);
      var list = pending; pending = [];
      list.forEach(function (it) {
        var k = it[0], n = it[1], key = tkey(k, n), L = { s: 0, p: 0, r: 0, x: 0, t: 0 };
        if (ui.thumbs[key]) { it[2].getContext('2d').drawImage(ui.thumbs[key], 0, 0); return; }
        if (k === 's') L.s = n; else if (k === 'p') { L.s = mine.s; L.p = n; } else { L.s = mine.s; L.r = n; }
        dress(MAN, L);
        var ty = .95, dist = 4.6, yaw = .5, pitch = .08;
        if (k === 'p') { yaw = Math.PI - .55; ty = 1.2; dist = 3.2; }
        if (k === 'r') { if (n === 1) { ty = 1.32; dist = 1.5; yaw = .3; } else { ty = 1.58; dist = 1.6; yaw = .45; pitch = .12; } }
        if (k === 'r' && n === 0) { ty = 1.3; dist = 2.4; }
        TC.position.set(Math.sin(yaw) * dist * Math.cos(pitch), ty + Math.sin(pitch) * dist, Math.cos(yaw) * dist * Math.cos(pitch)); TC.lookAt(0, ty, 0);
        R.setViewport(0, 0, S, S); R.setScissor(0, 0, S, S); R.render(TS, TC);
        var c = document.createElement('canvas'); c.width = c.height = 128; c.getContext('2d').drawImage(R.domElement, 0, H - px, px, px, 0, 0, 128, 128);
        ui.thumbs[key] = c; it[2].getContext('2d').drawImage(c, 0, 0);
      });
      R.setScissorTest(false); X.resize(); X.renderAll();
    }

    // ---- open and close ----
    var was = null;
    function open() {
      if (!access) return;
      makeUI();
      was = { menu: X.$('menu').hidden, pause: X.$('pause').hidden, touch: X.$('touch').hidden };
      X.$('menu').hidden = true; X.$('pause').hidden = true; X.$('touch').hidden = true;
      ui.sec.hidden = false; ui.yaw = .5; X.G.gear = true; render(); drawPending(); X.sfx('ui');
    }
    function close() {
      if (!ui || ui.sec.hidden) return;
      ui.sec.hidden = true; X.G.gear = false; X.camera.clearViewOffset(); demo.until = 0;
      if (was) { X.$('menu').hidden = was.menu; X.$('pause').hidden = was.pause; X.$('touch').hidden = was.touch; }
      if (X.changed) X.changed();
    }
    // the camera while Gear is open: close in on the climber, turning slowly, framed in the open part of the screen
    function cam(dt) {
      if (!ui) return;
      if (pending.length) drawPending();
      var vw = innerWidth, vh = innerHeight, r = ui.panel.getBoundingClientRect(), fw = vw, fh = vh;
      if (r.left > vw * .25) fw = r.left; else fh = Math.max(vh * .3, r.top);
      var cx = fw / 2, cy = fh * .5, tanH = Math.tan(X.camera.fov * Math.PI / 360), asp = vw / vh;
      var d = Math.max(2.3 / (2 * tanH * (fh / vh) * .9), 1.3 / (2 * tanH * asp * (fw / vw) * .9));
      d = Math.min(9, Math.max(2.4, d));
      if (!ui.drag) ui.yaw += dt * .3;
      var A = X.myAv, p = A.root.position, a = A.root.rotation.y + ui.yaw, pt = .1;
      var tx = p.x, ty = p.y + .95, tz = p.z, dx = Math.sin(a) * Math.cos(pt), dy = Math.sin(pt), dz = Math.cos(a) * Math.cos(pt);
      var hit = X.rayHit(tx, ty, tz, dx, dy, dz, d + .3); var dd = Math.max(.8, Math.min(d, hit - .3));
      X.camera.position.set(tx + dx * dd, ty + dy * dd, tz + dz * dd); X.camera.lookAt(tx, ty, tz);
      X.camera.setViewOffset(vw, vh, vw / 2 - cx, vh / 2 - cy, vw, vh);
      A.root.visible = true;
    }

    function setAccess(on) {
      on = !!on;
      if (on === access) { if (on) addButtons(); return; }
      access = on;
      if (on) { mine = clean(X.store.get('gear', null), X.best.h); lvl = earned(X.best.h); addButtons(); }
      else removeUI();
      apply();
    }
    return {
      access: setAccess, dress: dress, parse: parse, frame: frame, cam: cam, open: open, close: close,
      code: function () { return access ? code(mine) : ''; },
      get look() { return myLook(); }, get isOpen() { return !!(ui && !ui.sec.hidden); },
      // tests (automated browsers): every item by slot and number, the screen, a look by hand
      NAMES: NAMES, REWARD_AT: REWARD_AT, earned: earned, clean: clean, codeOf: code, partsFor: partsFor, scream: scream,
      set: function (L) { mine = clean(L, X.best.h); save(); apply(); if (ui && !ui.sec.hidden) render(); },
      demo: function (t) { demo.until = performance.now() / 1000 + 2.2; demo.t = t; }
    };
  }
  window.UpdraftGear = { init: init, NAMES: NAMES, REWARD_AT: REWARD_AT, parse: parse, code: code, earned: earned };
})();
