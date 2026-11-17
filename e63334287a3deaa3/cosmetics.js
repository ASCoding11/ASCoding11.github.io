/*
 * Back Room cosmetics: skins, accessories, skin draws and packs, and the player's locker.
 *
 *   <script src="/e63334287a3deaa3/cosmetics.js" defer></script>   (data-hub on hub pages: adds the wallet + Shop chip)
 *   <script src="/e63334287a3deaa3/wallet.js" defer></script>      (the coins: see that file)
 *
 * THE SWITCH: ENABLED, just below. While it is false nothing here is shown or saved anywhere: no Shop chip, no wallet,
 * no draws, no skin picker, no element added to any page, no network; the shop page (shop/) only says it isn't open yet.
 * Set it to true to open everything. For testing only, ?cosmetics=1 in the page address turns it on, and only when the
 * page is on localhost or driven by an automated browser (navigator.webdriver).
 *
 * What there is:
 *   SKINS        30 full looks in four rarities. Each has an avatar look (drawn over avatar.js's face: a background pattern,
 *                an outfit, something on the head, maybe a skin tone) and a colour set for 3D games:
 *                colors { body, accent, trim, emissive, pattern } (hex colours; pattern names a texture that texture()
 *                paints, so a game can use it as a THREE.CanvasTexture).
 *   ACCESSORIES  23 extras, each in one SLOT (hat, glasses, cape, trail, aura, pet): one per slot can be worn with any skin.
 *                Each also has `three`, a small description a 3D game can build it from (see "For 3D games" below).
 *   Skin draws   A draw costs DRAW_PRICE emeralds and gives one skin at the RARITY odds: common 70%, rare 22%, epic 7%,
 *                legendary exactly 1% (weights out of 10,000, picked with an unbiased whole-number roll: crypto in play,
 *                a seeded generator in tests). Every skin of a rarity is equally likely. A skin you already own gives back
 *                DUP_REFUND mangos (40% of a draw). Epic and legendary skins only come from draws.
 *   PACKS        Everything that can ever be bought: draw packs (1, 5, 10 draws), accessory packs, themed skin packs, and
 *                emerald packs (real money, later; they go through BackRoomWallet.PAYMENTS, which is switched off).
 *                Prices are whole emeralds. buy(packId) checks the wallet, takes the emeralds and fills the locker.
 *
 * Saved in this browser under localStorage 'cosmetics:v1' = { v: 1, s: [skin ids owned], a: [accessory ids owned],
 * e: { skin: id or '', hat: id or '', glasses, cape, trail, aura, pet } }. When signed in with Google, wallet.js mirrors the
 * locker into the player's stats node (w.s, w.a: bitmasks by item number `no`; w.e what is worn). Item numbers and ids are
 * permanent: never renumber or reuse one, only add new ones at the end.
 *
 * For games (window.BackRoomCosmetics):
 *   equipped()             { skin: id or null, accessories: { <slot>: id }, colors: { body, accent, trim, emissive, pattern } }
 *   avatarSvg(uid, size)   the player's avatar (avatar.js's face for uid) wearing what is equipped, as an <svg> string
 *                          (opts.look = { skin, accessories } draws another look, as the shop's previews do)
 *   texture(skinId, size)  a canvas painted with the skin's pattern and colours, for a 3D body
 *   on()                   whether cosmetics are switched on; everything else returns empty answers while they're off
 * Avatar drawing: avatar.js is not changed. avatarSvg draws avatar.js's face inside its own picture: the background and
 * anything behind (cape, trail, aura) first, then the face with its own background removed and the skin tone recoloured,
 * then the outfit, head piece, glasses, hat and pet on top. Without avatar.js it draws a plain face.
 * Other people's avatars elsewhere on the site (Online panel, Leaderboards) still show plain faces: showing their skins
 * needs the look published (w.e in their stats node already says what they wear) and a hook in avatar.js.
 *
 * For 3D games: read equipped().colors for the body, and for each worn accessory ACCESSORIES_BY_ID[id].three:
 *   { attach: 'head' | 'face' | 'back' | 'feet' | 'around' | 'follow', shape, color, color2, size }
 * attach says where it goes (top of the head, in front of the eyes, on the back, a ribbon behind the feet, a ring round
 * the body, a pet that follows a step behind). For example, in a Three.js game:
 *   var eq = BackRoomCosmetics.equipped(), hat = eq.accessories.hat && BackRoomCosmetics.ACCESSORIES_BY_ID[eq.accessories.hat];
 *   body.material.color.set(eq.colors.body);
 *   if (eq.skin) body.material.map = new THREE.CanvasTexture(BackRoomCosmetics.texture(eq.skin, 256));
 *   if (hat && hat.three.shape === 'cone') { var m = new THREE.Mesh(new THREE.ConeGeometry(.3 * hat.three.size, .7 * hat.three.size, 16),
 *     new THREE.MeshStandardMaterial({ color: hat.three.color })); m.position.y = headTop; head.add(m); }
 * All names and designs here are original.
 */
(function () {
  'use strict';
  if (window.BackRoomCosmetics) return;

  var ENABLED = false;   // THE SWITCH: false keeps every part of the cosmetics hidden; true opens the shop for everyone.

  var me0 = document.currentScript;
  var HUB = !!(me0 && me0.hasAttribute('data-hub'));
  var KEY = 'cosmetics:v1';
  var MPE = 13;                          // mangos per emerald (wallet.js)
  var DRAW_PRICE = 10;                   // emeralds for one skin draw
  var DUP_REFUND = DRAW_PRICE * MPE * 40 / 100;   // 52 mangos: 40% of a draw, back for a skin (or pack item) already owned
  var SLOTS = ['hat', 'glasses', 'cape', 'trail', 'aura', 'pet'];
  var SLOT_NAMES = { hat: 'Hat', glasses: 'Glasses', cape: 'Cape', trail: 'Trail', aura: 'Aura', pet: 'Pet' };
  var SLOT_LETTER = { skin: 's', hat: 'h', glasses: 'g', cape: 'c', trail: 't', aura: 'a', pet: 'p' };
  // Draw odds, as whole weights out of 10,000 (so legendary is exactly 1 in 100).
  var RARITY = [
    { id: 'legendary', name: 'Legendary', w: 100, color: '#F5A524' },
    { id: 'epic', name: 'Epic', w: 700, color: '#B26BFF' },
    { id: 'rare', name: 'Rare', w: 2200, color: '#3D8BFF' },
    { id: 'common', name: 'Common', w: 7000, color: '#8FA3B8' }
  ];
  var RARITY_TOTAL = 10000;
  var RARITY_BY_ID = {}; RARITY.forEach(function (r) { RARITY_BY_ID[r.id] = r; });

  function testFlag() {
    try {
      var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
      if (!navigator.webdriver && !local) return false;
      var q = location.search;
      try { if (window.parent !== window) q += '&' + window.parent.location.search; } catch (e) {}
      return /[?&]cosmetics=1(&|$)/.test(q);
    } catch (e) { return false; }
  }
  var FLAG = testFlag();
  function on() { return !!(api.ENABLED || FLAG); }

  // ---------------- Skins ----------------
  // look: bg / bg2 background colours, bgp background pattern, outfit, head (piece on the head), tone (skin colour, optional),
  // hair / hairc (avatar.js hair style / colour index, optional). colors: the 3D colour set.
  function S(no, id, name, rarity, theme, desc, look, colors) { return { no: no, id: id, name: name, rarity: rarity, theme: theme, desc: desc, look: look, colors: colors }; }
  var SKINS = [
    // Common
    S(1, 'moon-walker', 'Moon Walker', 'common', 'space', 'A puffy white suit for slow, bouncy steps across grey dust.',
      { bg: '#1B2440', bg2: '#C9D3EA', bgp: 'stars', outfit: 'suit', head: 'helmet' },
      { body: '#E8ECF4', accent: '#F28C28', trim: '#9AA7BD', emissive: '#7FD4FF', pattern: 'quilt' }),
    S(2, 'tide-pool', 'Tide Pool', 'common', 'ocean', 'Sea-blue stripes that smell faintly of sunscreen and salt.',
      { bg: '#2BA6C9', bg2: '#BDF0FF', bgp: 'waves', outfit: 'stripes' },
      { body: '#1F7FB8', accent: '#F4F9FF', trim: '#0E4C73', emissive: '#7FE7FF', pattern: 'stripes' }),
    S(3, 'neon-jogger', 'Neon Jogger', 'common', 'neon', 'A hoodie bright enough to jog home by after dark.',
      { bg: '#160F2E', bg2: '#38F2C8', bgp: 'grid', outfit: 'hoodie' },
      { body: '#2A1F5C', accent: '#38F2C8', trim: '#FF4FB4', emissive: '#38F2C8', pattern: 'grid' }),
    S(4, 'bubblegum', 'Bubblegum', 'common', 'candy', 'Pink, stretchy and always about to pop.',
      { bg: '#FFB8D9', bg2: '#FFFFFF', bgp: 'bubbles', outfit: 'puffer', hairc: 8 },
      { body: '#FF7EB9', accent: '#FFE0EF', trim: '#D6458D', emissive: '#FFC2DD', pattern: 'quilt' }),
    S(5, 'sprinkle-pop', 'Sprinkle Pop', 'common', 'candy', 'Rainbow sprinkles on top, cream filling underneath.',
      { bg: '#FFE6B8', bg2: '#FF6B8A', bgp: 'dots', outfit: 'overalls', head: 'sprinkle' },
      { body: '#F9D9A6', accent: '#FF6B8A', trim: '#6BC6FF', emissive: '#FFF2C2', pattern: 'sprinkles' }),
    S(6, 'tin-tinker', 'Tin Tinker', 'common', 'robot', 'Bolted together from spare cans and one good spring.',
      { bg: '#5A6B7C', bg2: '#8FA0B2', bgp: 'hex', outfit: 'armor', head: 'plate', tone: '#BCC6D1' },
      { body: '#9AA8B6', accent: '#D9822B', trim: '#56636F', emissive: '#FFD45C', pattern: 'plates' }),
    S(7, 'tabby', 'Tabby', 'common', 'animals', 'Orange stripes, soft ears and a nap scheduled for later.',
      { bg: '#FFCF8A', bg2: '#F2A04B', bgp: 'stripes', outfit: 'stripes', head: 'cat' },
      { body: '#E8913A', accent: '#FFE2B8', trim: '#A95A1C', emissive: '#FFD38A', pattern: 'stripes' }),
    S(8, 'cub', 'Cub', 'common', 'animals', 'A round little bear who would like some honey, please.',
      { bg: '#A7D88A', bg2: '#7DBE60', bgp: 'leaves', outfit: 'hoodie', head: 'bear' },
      { body: '#8A5A36', accent: '#E8C9A0', trim: '#5C3A20', emissive: '#FFD27A', pattern: 'spots' }),
    S(9, 'hopper', 'Hopper', 'common', 'animals', 'Tall ears, quick feet, carrots in every pocket.',
      { bg: '#C9E8FF', bg2: '#FFFFFF', bgp: 'dots', outfit: 'overalls', head: 'bunny' },
      { body: '#F2F2F5', accent: '#FFB3C7', trim: '#8E9BB0', emissive: '#FFE3EC', pattern: 'spots' }),
    S(10, 'spring-sprout', 'Spring Sprout', 'common', 'seasons', 'Fresh out of the ground and still growing.',
      { bg: '#C8F0B4', bg2: '#7CCB5A', bgp: 'leaves', outfit: 'robe', head: 'leaf' },
      { body: '#7CCB5A', accent: '#FFF0A8', trim: '#3E8A2E', emissive: '#E6FFB0', pattern: 'leaves' }),
    S(11, 'summer-sun', 'Summer Sun', 'common', 'seasons', 'Warm rays, cold lemonade, a very long afternoon.',
      { bg: '#FFC93C', bg2: '#FFE58A', bgp: 'rays', outfit: 'jersey' },
      { body: '#FF8A3D', accent: '#FFF4C2', trim: '#D94F1E', emissive: '#FFE066', pattern: 'rays' }),
    S(12, 'dune-rover', 'Dune Rover', 'common', 'desert', 'Wrapped up against the wind on a long walk over the sand.',
      { bg: '#F3C98B', bg2: '#E0A660', bgp: 'waves', outfit: 'robe', head: 'goggles' },
      { body: '#D9A066', accent: '#8B3A2E', trim: '#7A5530', emissive: '#FFD9A0', pattern: 'waves' }),
    // Rare
    S(13, 'comet-courier', 'Comet Courier', 'rare', 'space', 'Delivers parcels between planets, always slightly early.',
      { bg: '#0E1A3A', bg2: '#8FD6FF', bgp: 'sparkle', outfit: 'suit', head: 'antenna' },
      { body: '#2E5FD9', accent: '#8FD6FF', trim: '#F4F7FF', emissive: '#8FD6FF', pattern: 'stars' }),
    S(14, 'coral-diver', 'Coral Diver', 'rare', 'ocean', 'Mask on, flippers ready, off to count the reef fish.',
      { bg: '#0B6E8A', bg2: '#FF8A7A', bgp: 'bubbles', outfit: 'suit', head: 'goggles' },
      { body: '#14385C', accent: '#FF7A66', trim: '#FFD166', emissive: '#7FF0FF', pattern: 'waves' }),
    S(15, 'grid-runner', 'Grid Runner', 'rare', 'neon', 'Leaves a glowing line wherever it goes.',
      { bg: '#07061A', bg2: '#FF3FA4', bgp: 'grid', outfit: 'circuit', head: 'antenna' },
      { body: '#14123A', accent: '#FF3FA4', trim: '#3FE9FF', emissive: '#FF3FA4', pattern: 'circuit' }),
    S(16, 'gumdrop-knight', 'Gumdrop Knight', 'rare', 'candy', 'Sworn to protect the candy jar, mostly from itself.',
      { bg: '#B8F2E0', bg2: '#FF9AC8', bgp: 'checker', outfit: 'armor', head: 'gumdrop' },
      { body: '#5ED6B0', accent: '#FF9AC8', trim: '#FFFFFF', emissive: '#C8FFF0', pattern: 'sprinkles' }),
    S(17, 'circuit-scout', 'Circuit Scout', 'rare', 'robot', 'A small explorer robot that beeps when it finds something.',
      { bg: '#123B36', bg2: '#4FF0C0', bgp: 'hex', outfit: 'circuit', head: 'plate', tone: '#A9D9CF' },
      { body: '#2C6E62', accent: '#4FF0C0', trim: '#CFE8E2', emissive: '#4FF0C0', pattern: 'circuit' }),
    S(18, 'red-fox', 'Red Fox', 'rare', 'animals', 'Clever, quiet and very good at hide and seek.',
      { bg: '#2F5D3A', bg2: '#4E8A57', bgp: 'leaves', outfit: 'hoodie', head: 'fox' },
      { body: '#E0612B', accent: '#FFF3E6', trim: '#3A2418', emissive: '#FFB27A', pattern: 'spots' }),
    S(19, 'autumn-ember', 'Autumn Ember', 'rare', 'seasons', 'Crunchy leaves and the first cosy jumper of the year.',
      { bg: '#E07A2E', bg2: '#FFC46B', bgp: 'leaves', outfit: 'puffer', head: 'leaf' },
      { body: '#B8481F', accent: '#FFC46B', trim: '#6E2A12', emissive: '#FF9A3D', pattern: 'leaves' }),
    S(20, 'winter-frost', 'Winter Frost', 'rare', 'seasons', 'Ice in the hair and snowflakes that never melt.',
      { bg: '#BFE4FF', bg2: '#FFFFFF', bgp: 'snow', outfit: 'puffer', head: 'frost' },
      { body: '#6FB7F0', accent: '#FFFFFF', trim: '#2C6FB0', emissive: '#C8F0FF', pattern: 'snow' }),
    S(21, 'magma-walker', 'Magma Walker', 'rare', 'volcano', 'Walks on cooled lava and keeps the warm bits for later.',
      { bg: '#2A1410', bg2: '#FF5A1F', bgp: 'dots', outfit: 'armor', head: 'horns' },
      { body: '#3B2420', accent: '#FF5A1F', trim: '#1A0F0C', emissive: '#FF7A2E', pattern: 'flames' }),
    // Epic
    S(22, 'nebula-drifter', 'Nebula Drifter', 'epic', 'space', 'Made of the purple dust that new stars are born from.',
      { bg: '#2A0F4A', bg2: '#FF7AE0', bgp: 'swirl', outfit: 'robe', head: 'antenna', tone: '#D9C2FF' },
      { body: '#5B2A9E', accent: '#FF7AE0', trim: '#B8E1FF', emissive: '#FF9AF0', pattern: 'stars' }),
    S(23, 'abyss-lantern', 'Abyss Lantern', 'epic', 'ocean', 'From the deepest water, where the only light is your own.',
      { bg: '#03101F', bg2: '#5CFFE0', bgp: 'bubbles', outfit: 'scales', head: 'fins', tone: '#A6E6EE' },
      { body: '#0E2E4A', accent: '#5CFFE0', trim: '#1E6A8A', emissive: '#5CFFE0', pattern: 'scales' }),
    S(24, 'synthwave', 'Synthwave', 'epic', 'neon', 'A sunset on a screen, pink grid all the way to the horizon.',
      { bg: '#2B0A3D', bg2: '#FFB13D', bgp: 'rays', outfit: 'jersey', head: 'antenna', hairc: 8 },
      { body: '#FF3D8B', accent: '#FFB13D', trim: '#3DE0FF', emissive: '#FF6FB0', pattern: 'grid' }),
    S(25, 'rock-candy', 'Rock Candy', 'epic', 'candy', 'Sparkly sugar crystals, grown slowly on a string.',
      { bg: '#7A3DB8', bg2: '#FFD1F2', bgp: 'sparkle', outfit: 'scales', head: 'frost' },
      { body: '#C77DFF', accent: '#FFD1F2', trim: '#FFFFFF', emissive: '#F2C2FF', pattern: 'hex' }),
    S(26, 'chrome-unit', 'Chrome Unit', 'epic', 'robot', 'Polished so well you can see your own reflection in it.',
      { bg: '#1E2530', bg2: '#7FE7FF', bgp: 'hex', outfit: 'armor', head: 'plate', tone: '#E1E7EE' },
      { body: '#C8D2DC', accent: '#7FE7FF', trim: '#6B7785', emissive: '#7FE7FF', pattern: 'plates' }),
    S(27, 'storm-drake', 'Storm Drake', 'epic', 'mythic', 'A young dragon who naps in thunderclouds.',
      { bg: '#1D2B4F', bg2: '#FFE45C', bgp: 'swirl', outfit: 'scales', head: 'horns' },
      { body: '#3A7D5C', accent: '#FFE45C', trim: '#1F4535', emissive: '#FFE45C', pattern: 'scales' }),
    // Legendary
    S(28, 'star-sovereign', 'Star Sovereign', 'legendary', 'space', 'Rules a small galaxy, kindly, from a throne of comets.',
      { bg: '#0A0626', bg2: '#FFD86B', bgp: 'sparkle', outfit: 'robe', head: 'crown', tone: '#F3E6FF' },
      { body: '#2D1A6E', accent: '#FFD86B', trim: '#FFFFFF', emissive: '#FFE79A', pattern: 'stars' }),
    S(29, 'golden-automaton', 'Golden Automaton', 'legendary', 'robot', 'The first robot ever wound up, and still ticking perfectly.',
      { bg: '#3A2A0A', bg2: '#FFE08A', bgp: 'hex', outfit: 'circuit', head: 'plate', tone: '#EBC66B' },
      { body: '#D9A62E', accent: '#FFF2C2', trim: '#7A5410', emissive: '#FFE08A', pattern: 'circuit' }),
    S(30, 'four-seasons', 'Four Seasons', 'legendary', 'seasons', 'Spring, summer, autumn and winter, all at the same time.',
      { bg: '#7CCB5A', bg2: '#FFFFFF', bgp: 'quarters', outfit: 'robe', head: 'crownleaf' },
      { body: '#4E9E6A', accent: '#FFC93C', trim: '#E07A2E', emissive: '#BFE4FF', pattern: 'quarters' })
  ];

  // ---------------- Accessories ----------------
  function A(no, id, name, slot, rarity, desc, draw, three) { return { no: no, id: id, name: name, slot: slot, rarity: rarity, desc: desc, draw: draw, three: three }; }
  var ACCESSORIES = [
    A(1, 'pom-beanie', 'Pom Beanie', 'hat', 'common', 'Knitted, warm, with a bobble that wobbles.', 'beanie', { attach: 'head', shape: 'dome', color: '#E5484D', color2: '#FFFFFF', size: 1 }),
    A(2, 'wizard-cone', 'Wizard Cone', 'hat', 'rare', 'Tall, floppy and dotted with tiny stars.', 'wizard', { attach: 'head', shape: 'cone', color: '#3B3FB8', color2: '#FFD86B', size: 1.4 }),
    A(3, 'propeller-cap', 'Propeller Cap', 'hat', 'common', 'Spins in the wind. Does not actually fly.', 'propeller', { attach: 'head', shape: 'cap', color: '#2E9BE6', color2: '#FFD23F', size: 1 }),
    A(4, 'tall-topper', 'Tall Topper', 'hat', 'rare', 'A very tall hat for very important occasions.', 'tophat', { attach: 'head', shape: 'cylinder', color: '#22232B', color2: '#C2384A', size: 1.2 }),
    A(5, 'daisy-crown', 'Daisy Crown', 'hat', 'common', 'A ring of white flowers picked from the meadow.', 'flowers', { attach: 'head', shape: 'torus', color: '#FFFFFF', color2: '#FFD23F', size: 1 }),
    A(6, 'star-shades', 'Star Shades', 'glasses', 'rare', 'Sunglasses shaped like stars, for star-like people.', 'stars', { attach: 'face', shape: 'star-lens', color: '#1C1C28', color2: '#FFD23F', size: 1 }),
    A(7, 'heart-specs', 'Heart Specs', 'glasses', 'common', 'Pink heart-shaped lenses that make everything rosy.', 'hearts', { attach: 'face', shape: 'heart-lens', color: '#FF5C9A', color2: '#FFFFFF', size: 1 }),
    A(8, 'monocle', 'Monocle', 'glasses', 'rare', 'One round lens on a gold chain. Very distinguished.', 'monocle', { attach: 'face', shape: 'ring', color: '#D9A62E', color2: '#DDF4FF', size: .6 }),
    A(9, 'glow-visor', 'Glow Visor', 'glasses', 'epic', 'A glowing band across the eyes, straight from the arcade.', 'visor', { attach: 'face', shape: 'band', color: '#38F2C8', color2: '#FF4FB4', size: 1, glow: true }),
    A(10, 'hero-cape', 'Hero Cape', 'cape', 'common', 'Bright red and flappy. Saving the day is optional.', 'hero', { attach: 'back', shape: 'cloth', color: '#D93636', color2: '#FFD23F', size: 1 }),
    A(11, 'galaxy-cape', 'Galaxy Cape', 'cape', 'epic', 'A night sky to wear, stars included.', 'galaxy', { attach: 'back', shape: 'cloth', color: '#1E1352', color2: '#FFFFFF', size: 1.1, glow: true }),
    A(12, 'leaf-cloak', 'Leaf Cloak', 'cape', 'rare', 'Stitched from big green leaves, good for hiding in hedges.', 'leaf', { attach: 'back', shape: 'cloth', color: '#3E8A2E', color2: '#9BD86F', size: 1 }),
    A(13, 'sparkle-trail', 'Sparkle Trail', 'trail', 'rare', 'Leaves a little line of twinkles behind you.', 'sparkle', { attach: 'feet', shape: 'particles', color: '#FFE45C', color2: '#FFFFFF', size: 1, glow: true }),
    A(14, 'bubble-trail', 'Bubble Trail', 'trail', 'common', 'Soap bubbles that float up and pop as you go.', 'bubbles', { attach: 'feet', shape: 'particles', color: '#BDF0FF', color2: '#FFFFFF', size: 1 }),
    A(15, 'rainbow-streak', 'Rainbow Streak', 'trail', 'epic', 'A stripe of every colour stretching out behind you.', 'rainbow', { attach: 'feet', shape: 'ribbon', color: '#FF5C5C', color2: '#5CC8FF', size: 1, glow: true }),
    A(16, 'halo-glow', 'Halo Glow', 'aura', 'rare', 'A soft golden ring that floats just above your head.', 'halo', { attach: 'head', shape: 'ring', color: '#FFD86B', color2: '#FFF6D6', size: 1, glow: true }),
    A(17, 'ember-aura', 'Ember Aura', 'aura', 'epic', 'Warm sparks that drift up around you.', 'ember', { attach: 'around', shape: 'particles', color: '#FF7A2E', color2: '#FFD23F', size: 1.2, glow: true }),
    A(18, 'frost-ring', 'Frost Ring', 'aura', 'rare', 'A circle of cold air with snowflakes caught in it.', 'frost', { attach: 'around', shape: 'ring', color: '#BFE4FF', color2: '#FFFFFF', size: 1.2, glow: true }),
    A(19, 'pocket-slime', 'Pocket Slime', 'pet', 'common', 'A friendly green blob that bounces after you.', 'slime', { attach: 'follow', shape: 'blob', color: '#6EDB5A', color2: '#1B1513', size: .4 }),
    A(20, 'mini-bot', 'Mini Bot', 'pet', 'rare', 'A tiny robot helper with one antenna and lots of opinions.', 'bot', { attach: 'follow', shape: 'box', color: '#9AA8B6', color2: '#38F2C8', size: .4 }),
    A(21, 'star-buddy', 'Star Buddy', 'pet', 'common', 'A smiling sea star who came out of a rock pool to see the world.', 'starfish', { attach: 'follow', shape: 'star', color: '#FF8A5C', color2: '#FFD2B8', size: .35 }),
    A(22, 'ghost-pup', 'Ghost Pup', 'pet', 'epic', 'A see-through puppy who is not scary at all.', 'ghost', { attach: 'follow', shape: 'blob', color: '#EEF2FF', color2: '#8EA0FF', size: .4, glow: true }),
    A(23, 'baby-drake', 'Baby Drake', 'pet', 'legendary', 'A pocket-sized dragon who sneezes little sparks.', 'dragon', { attach: 'follow', shape: 'creature', color: '#8A5CF0', color2: '#FFD23F', size: .45, glow: true })
  ];
  var SKINS_BY_ID = {}, ACC_BY_ID = {}, SKIN_BY_NO = {}, ACC_BY_NO = {};
  SKINS.forEach(function (s) { SKINS_BY_ID[s.id] = s; SKIN_BY_NO[s.no] = s; });
  ACCESSORIES.forEach(function (a) { ACC_BY_ID[a.id] = a; ACC_BY_NO[a.no] = a; });
  var BY_RARITY = {}; RARITY.forEach(function (r) { BY_RARITY[r.id] = SKINS.filter(function (s) { return s.rarity === r.id; }); });

  // ---------------- Game items ----------------
  // Looks worn inside one game instead of on the avatar. Each belongs to a game (its folder name, as in stats.js's data-game)
  // and to one of that game's slots; one per slot can be worn. `no` is permanent within its game and slot and is what the
  // game sends to other players, so never renumber or reuse one: add new ones at the end of their slot. The game draws them
  // itself (Boostball: boostball/kit.js; Slipstream: slipstream/garage.js; by slot and number); here each has a name, a rarity
  // (which sets its price, ITEM_PRICE emeralds, and so its pack's), two colours for the small picture itemSvg() draws in the shop,
  // and a line of text. Ids are '<game prefix>-<slot>-<name>'. They are saved in the locker beside skins (g: owned, ge: worn per
  // 'game:slot') and, unlike skins and accessories, are not mirrored into the Google account yet (w.a holds at most 128 item numbers).
  // One GAMES entry per game: its name, the prefix of its ids, and its slots in the order the shop lists them.
  var GAMES = {
    boostball: { name: 'Boostball', prefix: 'bb', slots: [['decal', 'Decals'], ['trail', 'Boost trails'], ['goal', 'Goal explosions'], ['topper', 'Antenna toppers'], ['hat', 'Roof hats'], ['wheels', 'Wheels'], ['engine', 'Engine sounds']] },
    slipstream: { name: 'Slipstream', prefix: 'ss', slots: [['sponsor', 'Sponsors'], ['livery', 'Liveries'], ['helmet', 'Helmets'], ['effect', 'Boost effects'], ['smoke', 'Tyre smoke'], ['podium', 'Podium celebrations']] }
  };
  var ITEM_PRICE = { common: 6, rare: 10, epic: 16, legendary: 40 };
  var GAME_ITEMS = [], ITEM_BY_ID = {};
  function I(game, slot, no, name, rarity, c1, c2, desc) {
    var it = { game: game, slot: slot, no: no, id: GAMES[game].prefix + '-' + slot + '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name: name, rarity: rarity, c1: c1, c2: c2, desc: desc };
    GAME_ITEMS.push(it); ITEM_BY_ID[it.id] = it;
  }
  // Boostball decals: a pattern over the car's paint. The team colour stays the base; c1 and c2 here are only the shop picture.
  I('boostball', 'decal', 1, 'Flames', 'common', '#FFB020', '#FF4A1C', 'Hot-rod flames licking back from the nose.');
  I('boostball', 'decal', 2, 'Racing Stripes', 'common', '#FFFFFF', '#1B2233', 'Two stripes, nose to tail, in your accent colour.');
  I('boostball', 'decal', 3, 'Lightning Bolts', 'common', '#FFE45C', '#FFFFFF', 'Jagged bolts down each side.');
  I('boostball', 'decal', 4, 'Checkered Flag', 'common', '#FFFFFF', '#14161F', 'Finish-line checks sweeping over the tail.');
  I('boostball', 'decal', 5, 'Shark Mouth', 'rare', '#FFFFFF', '#D93636', 'Teeth on the nose and one beady eye a side.');
  I('boostball', 'decal', 6, 'Tiger Stripes', 'rare', '#14161F', '#FF9A3D', 'Dark stripes that taper to points.');
  I('boostball', 'decal', 7, 'Dragon Scales', 'rare', '#3A7D5C', '#FFE45C', 'Rows of overlapping scales with a bright edge.');
  I('boostball', 'decal', 8, 'Carbon Fiber', 'common', '#2A2F3A', '#4A5160', 'A dark weave over the bonnet, roof and sills.');
  I('boostball', 'decal', 9, 'Pixel Camo', 'common', '#5C6B4A', '#2E3A2A', 'Blocky camouflage in shades of your team colour.');
  I('boostball', 'decal', 10, 'Galaxy', 'epic', '#5B2A9E', '#FF7AE0', 'Purple clouds and far-off stars.');
  I('boostball', 'decal', 11, 'Constellations', 'rare', '#FFFFFF', '#8FD6FF', 'Made-up star signs joined with thin lines.');
  I('boostball', 'decal', 12, 'Circuit Board', 'rare', '#4FF0C0', '#123B36', 'Traces, pads and one very important chip.');
  I('boostball', 'decal', 13, 'Graffiti Drips', 'rare', '#FF4FB4', '#38F2C8', 'Bright paint that ran before it dried.');
  I('boostball', 'decal', 14, 'Honeycomb', 'common', '#FFC93C', '#7A5410', 'Six-sided cells, a few of them full.');
  I('boostball', 'decal', 15, 'Lava Cracks', 'epic', '#FF5A1F', '#2A1410', 'Glowing cracks in a cooling crust.');
  I('boostball', 'decal', 16, 'Frost', 'rare', '#DDF4FF', '#6FB7F0', 'Ice ferns creeping in from the edges.');
  I('boostball', 'decal', 17, 'Comic Book Dots', 'common', '#FFFFFF', '#FFD23F', 'Printed dots, a burst and a thick outline.');
  I('boostball', 'decal', 18, 'Topographic Lines', 'common', '#FFFFFF', '#8FA3B8', 'Contour lines from a map of nowhere.');
  I('boostball', 'decal', 19, 'Stained Glass', 'epic', '#FF5C5C', '#5CC8FF', 'Coloured panes held in dark lead.');
  I('boostball', 'decal', 20, 'Wireframe', 'rare', '#3EE6FF', '#0B1222', 'A glowing grid, as if the car was never finished.');
  I('boostball', 'decal', 21, 'Skeleton Ribs', 'rare', '#F4F6FF', '#14161F', 'A spine on top and ribs down the sides.');
  I('boostball', 'decal', 22, 'Duct Tape Patches', 'common', '#AEB6C2', '#6B7785', 'Held together with silver tape and hope.');
  I('boostball', 'decal', 23, 'Rust Bucket', 'common', '#A5521E', '#5C2E12', 'Brown blooms round every edge.');
  I('boostball', 'decal', 24, 'Wood Paneling', 'rare', '#B98A52', '#6E4A26', 'Planks along the doors, like an old estate car.');
  I('boostball', 'decal', 25, 'Cow Print', 'common', '#FFFFFF', '#14161F', 'Big friendly blotches.');
  I('boostball', 'decal', 26, 'Donut Sprinkles', 'rare', '#FF9AC8', '#FFE08A', 'Icing dripping over the top, sprinkles included.');
  I('boostball', 'decal', 27, 'Bubble Wrap', 'common', '#E6F2FF', '#9FC4E8', 'Rows of bubbles. A few already popped.');
  I('boostball', 'decal', 28, 'Taxi', 'rare', '#FFD21F', '#14161F', 'A checker band and a roof light. Fares not included.');
  I('boostball', 'decal', 29, 'Police Cruiser', 'rare', '#FFFFFF', '#14161F', 'Light doors, dark ends and a made-up badge.');
  I('boostball', 'decal', 30, 'Ice Cream Truck', 'epic', '#FFE9C9', '#FF9AC8', 'Cream top, pink awning stripes and a cone on the door.');
  I('boostball', 'decal', 31, 'Autumn Leaves', 'common', '#E07A2E', '#B8481F', 'Leaves blown along the sides.');
  // Boostball boost trails: what comes out of the back instead of the flame.
  I('boostball', 'trail', 1, 'Classic Flame', 'common', '#FFD23F', '#FF5A1F', 'Orange fire, the way rockets were meant to be.');
  I('boostball', 'trail', 2, 'Blue Plasma', 'common', '#8FD6FF', '#2E5FD9', 'Cold blue fire with a white-hot middle.');
  I('boostball', 'trail', 3, 'Rainbow', 'epic', '#FF5C5C', '#5CC8FF', 'Six stripes, every colour, straight out the back.');
  I('boostball', 'trail', 4, 'Lightning', 'rare', '#FFE45C', '#FFFFFF', 'Crackling sparks that jump about.');
  I('boostball', 'trail', 5, 'Bubbles', 'common', '#BDF0FF', '#FFFFFF', 'Soap bubbles that wobble up and pop.');
  I('boostball', 'trail', 6, 'Confetti', 'common', '#FF4FB4', '#FFD23F', 'A party every time you boost.');
  I('boostball', 'trail', 7, 'Snowflakes', 'common', '#FFFFFF', '#BFE4FF', 'A flurry that drifts down behind you.');
  I('boostball', 'trail', 8, 'Autumn Leaves', 'common', '#E07A2E', '#FFC46B', 'Leaves that tumble in your wake.');
  I('boostball', 'trail', 9, 'Sparkles', 'rare', '#FFE45C', '#FFFFFF', 'Little four-point twinkles.');
  I('boostball', 'trail', 10, 'Hearts', 'rare', '#FF5C9A', '#FFC2DD', 'Pink hearts that float away.');
  I('boostball', 'trail', 11, 'Music Notes', 'rare', '#B46CFF', '#3EE6FF', 'A tune nobody can quite hear.');
  I('boostball', 'trail', 12, 'Pixel Blocks', 'common', '#46E39A', '#3EE6FF', 'Square blocks from an older sort of game.');
  I('boostball', 'trail', 13, 'Smoke Rings', 'rare', '#DADFEA', '#8FA3B8', 'Neat grey rings, one after another.');
  I('boostball', 'trail', 14, 'Slime', 'common', '#6EDB5A', '#2E8A2E', 'Green goo that drips to the floor.');
  I('boostball', 'trail', 15, 'Lava', 'rare', '#FF7A2E', '#FFD23F', 'Molten blobs that cool as they fall.');
  I('boostball', 'trail', 16, 'Stardust', 'epic', '#B8A6FF', '#FFFFFF', 'A slow shimmer of tiny stars.');
  I('boostball', 'trail', 17, 'Popcorn', 'rare', '#FFF2C2', '#FFD23F', 'Freshly popped and all over the pitch.');
  I('boostball', 'trail', 18, 'Rubber Ducks', 'epic', '#FFD23F', '#FF8A3D', 'A line of bath ducks bobbing along behind.');
  I('boostball', 'trail', 19, 'Feathers', 'common', '#FFFFFF', '#DADFEA', 'White feathers swaying down.');
  I('boostball', 'trail', 20, 'Soap Suds', 'common', '#FFFFFF', '#CFE6FF', 'Foam from a very soapy car wash.');
  I('boostball', 'trail', 21, 'Ink', 'rare', '#3B2A6E', '#8A6CFF', 'Dark ink blots with a purple edge.');
  I('boostball', 'trail', 22, 'Ones and Zeros', 'rare', '#46E39A', '#C8FFE0', 'Green digits spilling out of the engine.');
  I('boostball', 'trail', 23, 'Bats', 'rare', '#5A3A8A', '#B46CFF', 'A few small bats flapping out of the exhaust.');
  I('boostball', 'trail', 24, 'Toast Slices', 'epic', '#E8B96A', '#8A5A2A', 'Breakfast, launched.');
  I('boostball', 'trail', 25, 'Dollar Bills', 'epic', '#6EDB8A', '#1F7A4A', 'Play money fluttering away.');
  I('boostball', 'trail', 26, 'Water Jet', 'common', '#5CC8FF', '#FFFFFF', 'A hose on full blast.');
  I('boostball', 'trail', 27, 'Laser Beam', 'legendary', '#FF3048', '#FFFFFF', 'One straight red line. Very serious.');
  // Boostball goal explosions: what happens in the goal when you score.
  I('boostball', 'goal', 1, 'Fireworks', 'rare', '#FF5C9A', '#FFE45C', 'Rockets up from the goal line, then a sky full of stars.');
  I('boostball', 'goal', 2, 'Confetti Cannon', 'rare', '#3EE6FF', '#FF4FB4', 'Two cannons, one loud pop, paper everywhere.');
  I('boostball', 'goal', 3, 'Black Hole', 'epic', '#1B1030', '#B46CFF', 'The ball spirals in and does not come back out.');
  I('boostball', 'goal', 4, 'Supernova', 'epic', '#FFFFFF', '#8FD6FF', 'A star goes off in the goal mouth.');
  I('boostball', 'goal', 5, 'Lightning Strike', 'rare', '#FFE45C', '#FFFFFF', 'Three bolts from a clear sky.');
  I('boostball', 'goal', 6, 'Tornado', 'epic', '#AEB6C2', '#6B7785', 'A twister carries the ball, and a cow, away.');
  I('boostball', 'goal', 7, 'Volcano', 'epic', '#FF5A1F', '#5C3A2A', 'A small volcano grows out of the pitch and goes off.');
  I('boostball', 'goal', 8, 'Meteor', 'epic', '#FF8A3D', '#5C4A4A', 'A rock from space lands exactly on the spot.');
  I('boostball', 'goal', 9, 'Freeze and Shatter', 'rare', '#BFE4FF', '#FFFFFF', 'The ball freezes solid, then breaks to bits.');
  I('boostball', 'goal', 10, 'Pixel Shatter', 'rare', '#46E39A', '#3EE6FF', 'The ball falls apart into square blocks.');
  I('boostball', 'goal', 11, 'Disco Ball Drop', 'epic', '#DADFEA', '#FF4FB4', 'A mirror ball comes down and the lights come on.');
  I('boostball', 'goal', 12, 'Giant Foot Stomp', 'legendary', '#F2B58A', '#D93636', 'A very large foot in a stripy sock. Squish.');
  I('boostball', 'goal', 13, 'Pinata Burst', 'epic', '#FF4FB4', '#FFD23F', 'A paper donkey swings in and showers sweets.');
  I('boostball', 'goal', 14, 'Popcorn Pop', 'rare', '#FFF2C2', '#D93636', 'A striped tub that will not stop popping.');
  I('boostball', 'goal', 15, 'UFO Abduction', 'legendary', '#9AA8B6', '#6EDB5A', 'A saucer beams the ball up and leaves in a hurry.');
  I('boostball', 'goal', 16, 'Shark Attack', 'legendary', '#7A8CA6', '#FFFFFF', 'A shark jumps out of the floor and swallows the ball.');
  I('boostball', 'goal', 17, 'Giant Airhorn', 'epic', '#D93636', '#FFFFFF', 'HOOONK. Three times.');
  I('boostball', 'goal', 18, 'Money Rain', 'epic', '#6EDB8A', '#FFD23F', 'Play money and gold coins from the roof.');
  I('boostball', 'goal', 19, 'Pumpkin Splat', 'rare', '#FF8A1F', '#3E8A2E', 'A giant pumpkin lands and does what pumpkins do.');
  I('boostball', 'goal', 20, 'Goal Letters', 'legendary', '#FFFFFF', '#FFD23F', 'G, O, A and L fall from the ceiling, one by one.');
  I('boostball', 'goal', 21, 'Flock of Birds', 'epic', '#FFFFFF', '#5CC8FF', 'The ball turns into birds and flies off.');
  // Boostball extras: antenna toppers, roof hats, wheels and engine sounds (the sound is heard by its driver only).
  I('boostball', 'topper', 1, 'Tennis Ball', 'common', '#D8FF3F', '#FFFFFF', 'A fuzzy yellow ball on the end of the aerial.');
  I('boostball', 'topper', 2, 'Gold Star', 'rare', '#FFD23F', '#FFF2A8', 'A little star to follow.');
  I('boostball', 'topper', 3, 'Bath Duck', 'rare', '#FFD23F', '#FF8A1F', 'It bobs. It does not quack.');
  I('boostball', 'topper', 4, 'Mini Pumpkin', 'common', '#FF8A1F', '#5F7A2A', 'A very small pumpkin, stem and all.');
  I('boostball', 'topper', 5, 'Pennant', 'common', '#FF4D6D', '#FFFFFF', 'A small flag in your accent colour.');
  I('boostball', 'topper', 6, 'Eyeball', 'epic', '#FFFFFF', '#2E7BFF', 'It is watching the ball. Probably.');
  I('boostball', 'hat', 1, 'Traffic Cone', 'common', '#FF7A1F', '#FFFFFF', 'Borrowed from some roadworks.');
  I('boostball', 'hat', 2, 'Top Hat', 'rare', '#22232B', '#C2384A', 'For cars with somewhere smart to be.');
  I('boostball', 'hat', 3, 'Crown', 'epic', '#FFD23F', '#D93636', 'Gold, with points and red jewels.');
  I('boostball', 'hat', 4, 'Propeller Beanie', 'rare', '#D93636', '#FFD23F', 'The propeller is only for show.');
  I('boostball', 'hat', 5, 'Cowboy Hat', 'rare', '#8A5A36', '#E8C9A0', 'Wide brim, tall crown, yee-haw.');
  I('boostball', 'hat', 6, 'Chef Hat', 'common', '#FFFFFF', '#DADFEA', 'Tall, white and puffy on top.');
  I('boostball', 'wheels', 1, 'Five Spoke', 'common', '#9AA7C2', '#14161F', 'Five clean spokes.');
  I('boostball', 'wheels', 2, 'Discs', 'common', '#F4F6FF', '#9AA7C2', 'Smooth covers in your accent colour.');
  I('boostball', 'wheels', 3, 'Cross', 'rare', '#14161F', '#9AA7C2', 'Four chunky spokes in an X.');
  I('boostball', 'wheels', 4, 'Gold Rims', 'epic', '#FFD23F', '#C98A12', 'Shiny gold, five spokes.');
  I('boostball', 'engine', 1, 'Purr', 'common', '#8FA3B8', '#FFFFFF', 'A soft, low hum.');
  I('boostball', 'engine', 2, 'Buzz', 'rare', '#FFD23F', '#FF8A1F', 'High and angry, like a go-kart.');
  I('boostball', 'engine', 3, 'Rumble', 'rare', '#7A5230', '#FF4D6D', 'A big lazy burble.');
  I('boostball', 'engine', 4, 'Whirr', 'epic', '#3EE6FF', '#FFFFFF', 'Electric: it sings as it speeds up.');
  // Slipstream sponsors (all made up): signing with one is free, and its sticker goes on the car. c1 and c2 are its colours.
  I('slipstream', 'sponsor', 1, 'Zoomi Cola', 'common', '#12B5A6', '#FFF3D6', 'Fizzy, fast and slightly too sweet.');
  I('slipstream', 'sponsor', 2, 'Burnout Coffee', 'common', '#3B2416', '#FFB347', 'Roasted until the tyres smoke.');
  I('slipstream', 'sponsor', 3, 'Apex Tires', 'common', '#1D2026', '#FF6A1F', 'Round, black and very keen on corners.');
  I('slipstream', 'sponsor', 4, 'Turbo Taco', 'common', '#1F8A4C', '#FFD23F', 'Lunch that arrives before you order it.');
  I('slipstream', 'sponsor', 5, "Grandma's Motor Oil", 'common', '#7A1F3D', '#FFE9C9', 'Made with love, and a secret recipe.');
  I('slipstream', 'sponsor', 6, 'Pit Stop Pizza', 'common', '#E8543A', '#FFF1CF', 'Four slices changed in under two seconds.');
  I('slipstream', 'sponsor', 7, "Slick's Hair Gel", 'common', '#0D2440', '#39D5FF', 'Holds your hair still at 300 km/h.');
  I('slipstream', 'sponsor', 8, 'Late Brake Insurance', 'common', '#2A55D9', '#F2F5FA', 'For drivers who see the corner afterwards.');
  I('slipstream', 'sponsor', 9, 'Draft Punk Records', 'common', '#15131C', '#FF3FA8', 'Loud music from the back of the pack.');
  I('slipstream', 'sponsor', 10, 'Gravel Trap Granola', 'common', '#E9D3A3', '#5A3D22', 'Crunchy. Extremely crunchy.');
  I('slipstream', 'sponsor', 11, 'Blue Flag Bottled Water', 'common', '#1F8FE0', '#FFFFFF', 'Kindly lets faster drinks through.');
  I('slipstream', 'sponsor', 12, 'Honk Energy', 'common', '#FFE01F', '#17191E', 'One can and you hear it all day.');
  I('slipstream', 'sponsor', 13, 'Chicane Chicken', 'common', '#FF8A1F', '#FFF7E0', 'Left, right, then straight to the table.');
  I('slipstream', 'sponsor', 14, 'Podium Pickles', 'common', '#2F7D32', '#F3FFD2', 'Always in the top three jars.');
  I('slipstream', 'sponsor', 15, 'Lap Nap Mattresses', 'common', '#34388F', '#FFE9A8', 'Fall asleep before the formation lap ends.');
  // Slipstream liveries: a pattern and accents over the team's colours (1-8), then each sponsor's own livery (9-23, in the
  // sponsors' order), which is not sold: the game grants it when that sponsor's challenges are finished.
  I('slipstream', 'livery', 1, 'Two-Tone Classic', 'common', '#D61F2C', '#FFD21F', 'Team colour on top, second colour below, a pinstripe between.');
  I('slipstream', 'livery', 2, 'Retro Stripes', 'common', '#2A6BFF', '#FFFFFF', 'Three long stripes from nose to tail, like the old posters.');
  I('slipstream', 'livery', 3, 'Matte Black with Neon', 'rare', '#15171B', '#39FF88', 'A black car with glowing lines in the team colour.');
  I('slipstream', 'livery', 4, 'Chrome', 'epic', '#DDE6F0', '#6B7785', 'A mirror with wheels. Mind the sun.');
  I('slipstream', 'livery', 5, 'Carbon', 'rare', '#22262C', '#6B7785', 'Bare weave, no paint, a little lighter in spirit.');
  I('slipstream', 'livery', 6, 'Pastel', 'common', '#FFC2DD', '#BDF0FF', 'The team colour after a very gentle wash.');
  I('slipstream', 'livery', 7, 'Flames', 'rare', '#D61F2C', '#FFD84A', 'Fire painted from the nose back. Not real fire.');
  I('slipstream', 'livery', 8, 'Checkered', 'common', '#F4F4F4', '#15171B', 'The flag, worn before the race is over.');
  gameItems('slipstream', 'sponsor').forEach(function (sp) { I('slipstream', 'livery', 8 + sp.no, sp.name + ' livery', 'epic', sp.c1, sp.c2, 'The whole car in ' + sp.name + ' colours. Earned by finishing its challenges.'); });
  // Slipstream helmets: eight plain ones anyone may wear (1-8), then the painted ones.
  I('slipstream', 'helmet', 1, 'Red helmet', 'common', '#E02A2A', '#10131A', 'A plain red helmet.');
  I('slipstream', 'helmet', 2, 'Blue helmet', 'common', '#2A6BFF', '#10131A', 'A plain blue helmet.');
  I('slipstream', 'helmet', 3, 'Yellow helmet', 'common', '#FFD21F', '#10131A', 'A plain yellow helmet.');
  I('slipstream', 'helmet', 4, 'Green helmet', 'common', '#2FB85A', '#10131A', 'A plain green helmet.');
  I('slipstream', 'helmet', 5, 'Orange helmet', 'common', '#FF7A1A', '#10131A', 'A plain orange helmet.');
  I('slipstream', 'helmet', 6, 'Pink helmet', 'common', '#FF5FA8', '#10131A', 'A plain pink helmet.');
  I('slipstream', 'helmet', 7, 'Black helmet', 'common', '#1A1C21', '#5B6B7C', 'A plain black helmet.');
  I('slipstream', 'helmet', 8, 'White helmet', 'common', '#F4F6F8', '#10131A', 'A plain white helmet.');
  I('slipstream', 'helmet', 9, 'Flames helmet', 'common', '#15161A', '#FF7A1A', 'Fire up the sides.');
  I('slipstream', 'helmet', 10, 'Checkered helmet', 'common', '#F4F4F4', '#B3141F', 'Black and white squares all round.');
  I('slipstream', 'helmet', 11, 'Lightning helmet', 'common', '#2450D0', '#FFD21F', 'A yellow bolt on each side.');
  I('slipstream', 'helmet', 12, 'Chrome Visor', 'rare', '#F4F6F8', '#FF86C0', 'A mirror visor nobody can see through.');
  I('slipstream', 'helmet', 13, 'Shark helmet', 'rare', '#7D93A8', '#7A1420', 'Teeth at the front, fin on top in spirit.');
  I('slipstream', 'helmet', 14, 'Skull helmet', 'rare', '#EFE9DA', '#15161A', 'A friendly cartoon skull.');
  I('slipstream', 'helmet', 15, 'Tiger helmet', 'rare', '#FF8A1F', '#1B1612', 'Orange with black stripes.');
  I('slipstream', 'helmet', 16, 'Galaxy helmet', 'epic', '#3A1A6E', '#FF5ABE', 'Deep purple space and a lot of stars.');
  I('slipstream', 'helmet', 17, 'Disco Ball', 'legendary', '#C8D2DC', '#FFFFFF', 'Hundreds of little mirrors.');
  I('slipstream', 'helmet', 18, 'Watermelon helmet', 'rare', '#2F9E44', '#FF5A6E', 'Green rind outside, summer inside.');
  I('slipstream', 'helmet', 19, 'Eight Ball', 'rare', '#101114', '#F4F4F4', 'Black, shiny, with an 8 in a white circle.');
  I('slipstream', 'helmet', 20, 'Eyeball', 'epic', '#F6F3EE', '#1F6AD9', 'It is always looking at the apex.');
  I('slipstream', 'helmet', 21, 'Pumpkin helmet', 'rare', '#F08A1C', '#2A1206', 'Carved with a grin.');
  I('slipstream', 'helmet', 22, 'Cat Ears', 'epic', '#8E99A6', '#FF8FB0', 'A helmet with two pointy ears.');
  I('slipstream', 'helmet', 23, 'Pizza helmet', 'epic', '#FFCF5A', '#C23A2B', 'Cheese, tomato and pepperoni.');
  // Slipstream boost and slipstream effects, tyre smoke colours, and podium celebrations (seen by their driver only).
  I('slipstream', 'effect', 1, 'White Air Streaks', 'common', '#FFFFFF', '#C8D2DC', 'White lines of air off the car when boosting or in a slipstream.');
  I('slipstream', 'effect', 2, 'Flames', 'common', '#FFD24A', '#FF5A14', 'A long orange flame behind the car.');
  I('slipstream', 'effect', 3, 'Sparks', 'rare', '#FFF0B0', '#FFA020', 'A shower of sparks from under the floor.');
  I('slipstream', 'effect', 4, 'Electric Arcs', 'rare', '#D8F6FF', '#2A8BFF', 'Blue crackles around the rear wing.');
  I('slipstream', 'effect', 5, 'Rainbow', 'epic', '#FF5C5C', '#5CC8FF', 'Every colour, one after another.');
  I('slipstream', 'effect', 6, 'Vapor Trail', 'common', '#FFFFFF', '#DFE9F5', 'Two thin white trails from the wing tips.');
  I('slipstream', 'effect', 7, 'Confetti', 'rare', '#FF4FA3', '#FFD23F', 'A party out of the exhaust.');
  I('slipstream', 'effect', 8, 'Purple Plasma', 'epic', '#FF8AFF', '#7A2BFF', 'A purple glow that looks faster than it is.');
  I('slipstream', 'smoke', 1, 'Pink tyre smoke', 'common', '#FF6BB8', '#FFC2DD', 'Pink smoke from the tyres.');
  I('slipstream', 'smoke', 2, 'Blue tyre smoke', 'common', '#5294FF', '#BDD8FF', 'Blue smoke from the tyres.');
  I('slipstream', 'smoke', 3, 'Green tyre smoke', 'common', '#61EB7A', '#C8FFD2', 'Green smoke from the tyres.');
  I('slipstream', 'smoke', 4, 'Purple tyre smoke', 'common', '#AD66FF', '#E0C8FF', 'Purple smoke from the tyres.');
  I('slipstream', 'smoke', 5, 'Gold tyre smoke', 'common', '#FFCC47', '#FFF0B0', 'Gold smoke from the tyres.');
  I('slipstream', 'podium', 1, 'Confetti Podium', 'common', '#FF4FA3', '#3FD2FF', 'Confetti over the results when you finish in the top three.');
  I('slipstream', 'podium', 2, 'Fireworks Podium', 'rare', '#FFD21F', '#B06BFF', 'Fireworks over the results when you finish in the top three.');
  // Items a game hands over itself are in no pack: give is 'free' (anyone may wear it; the game grants it the first time it
  // is worn) or 'earned' (the game grants it when it is won). grant(id), below, only adds these.
  GAME_ITEMS.forEach(function (it) { if (it.game !== 'slipstream') return; if (it.slot === 'sponsor' || (it.slot === 'helmet' && it.no <= 8)) it.give = 'free'; else if (it.slot === 'livery' && it.no > 8) it.give = 'earned'; });
  function gameItems(game, slot) { return GAME_ITEMS.filter(function (it) { return it.game === game && (!slot || it.slot === slot); }); }
  function itemIds(names) { return names.map(function (n) { if (!ITEM_BY_ID[n]) throw new Error('cosmetics: no item ' + n); return n; }); }
  function itemsPrice(ids) { return ids.reduce(function (t, id) { return t + ITEM_PRICE[ITEM_BY_ID[id].rarity]; }, 0); }
  function itemPack(id, game, name, desc, ids) { ids = itemIds(ids); return { id: id, kind: 'items', game: game, name: name, desc: desc, price: itemsPrice(ids), contents: { items: ids } }; }

  // ---------------- Packs ----------------
  // kind: 'draws' (contents.draws), 'skins' (contents.skins), 'accessories' (contents.acc), 'items' (contents.items: game
  // items, see above; game says which game; the price is the sum of the items' ITEM_PRICE), 'emeralds' (contents.mangos,
  // bought with money through BackRoomWallet.PAYMENTS: usd is the price; switched off). price: whole emeralds.
  function skinIds(theme, rarities) { return SKINS.filter(function (s) { return s.theme === theme && rarities.indexOf(s.rarity) >= 0; }).map(function (s) { return s.id; }); }
  function accIds(slot) { return ACCESSORIES.filter(function (a) { return a.slot === slot && a.rarity !== 'legendary'; }).map(function (a) { return a.id; }); }
  var CR = ['common', 'rare'];
  var PACKS = [
    { id: 'draw-1', kind: 'draws', name: 'One draw', desc: 'One skin at the draw odds.', price: 10, contents: { draws: 1 } },
    { id: 'draw-5', kind: 'draws', name: 'Five draws', desc: 'Five skins at the draw odds. Saves 5 emeralds.', price: 45, contents: { draws: 5 } },
    { id: 'draw-10', kind: 'draws', name: 'Ten draws', desc: 'Ten skins at the draw odds. Saves 15 emeralds.', price: 85, contents: { draws: 10 } },
    { id: 'skins-space', kind: 'skins', name: 'Launch Bay', desc: 'Two space suits for the trip up.', price: 24, contents: { skins: skinIds('space', CR) } },
    { id: 'skins-ocean', kind: 'skins', name: 'Deep End', desc: 'Two looks for the beach and the reef.', price: 24, contents: { skins: skinIds('ocean', CR) } },
    { id: 'skins-neon', kind: 'skins', name: 'After Dark', desc: 'Two glowing looks for the night.', price: 24, contents: { skins: skinIds('neon', CR) } },
    { id: 'skins-candy', kind: 'skins', name: 'Sweet Tooth', desc: 'Three sugary looks.', price: 32, contents: { skins: skinIds('candy', CR) } },
    { id: 'skins-robot', kind: 'skins', name: 'Workshop', desc: 'Two robots, freshly oiled.', price: 24, contents: { skins: skinIds('robot', CR) } },
    { id: 'skins-animals', kind: 'skins', name: 'Wild Things', desc: 'A cat, a bear, a bunny and a fox.', price: 40, contents: { skins: skinIds('animals', CR) } },
    { id: 'skins-seasons', kind: 'skins', name: 'All Year Round', desc: 'One look for every season.', price: 48, contents: { skins: skinIds('seasons', CR) } },
    { id: 'skins-wild', kind: 'skins', name: 'Far Lands', desc: 'Desert wanderer and lava walker.', price: 24, contents: { skins: SKINS.filter(function (s) { return s.theme === 'desert' || s.theme === 'volcano'; }).map(function (s) { return s.id; }) } },
    { id: 'acc-hats', kind: 'accessories', name: 'Hat Box', desc: 'Five hats for any head.', price: 40, contents: { acc: accIds('hat') } },
    { id: 'acc-glasses', kind: 'accessories', name: 'Eyewear Case', desc: 'Four ways to look at things.', price: 34, contents: { acc: accIds('glasses') } },
    { id: 'acc-capes', kind: 'accessories', name: 'Cape Rack', desc: 'Three capes that flap nicely.', price: 32, contents: { acc: accIds('cape') } },
    { id: 'acc-trails', kind: 'accessories', name: 'Trail Kit', desc: 'Three things to leave behind you.', price: 32, contents: { acc: accIds('trail') } },
    { id: 'acc-auras', kind: 'accessories', name: 'Glow Jar', desc: 'Three auras to float around you.', price: 34, contents: { acc: accIds('aura') } },
    { id: 'acc-pets', kind: 'accessories', name: 'Pet Carrier', desc: 'Four little friends to follow you about.', price: 44, contents: { acc: accIds('pet') } },
    { id: 'acc-drake', kind: 'accessories', name: 'Dragon Egg', desc: 'Hatches into the Baby Drake. Legendary.', price: 150, contents: { acc: ['baby-drake'] } },
    itemPack('bb-decals-speed', 'boostball', 'Speed Shop', 'Five decals for going fast.', ['bb-decal-flames', 'bb-decal-racing-stripes', 'bb-decal-lightning-bolts', 'bb-decal-checkered-flag', 'bb-decal-carbon-fiber']),
    itemPack('bb-decals-wild', 'boostball', 'Wild Side', 'Five decals with teeth, stripes or spots.', ['bb-decal-shark-mouth', 'bb-decal-tiger-stripes', 'bb-decal-dragon-scales', 'bb-decal-cow-print', 'bb-decal-skeleton-ribs']),
    itemPack('bb-decals-tech', 'boostball', 'Late Night', 'Five decals from space and the workshop.', ['bb-decal-galaxy', 'bb-decal-constellations', 'bb-decal-circuit-board', 'bb-decal-wireframe', 'bb-decal-pixel-camo']),
    itemPack('bb-decals-art', 'boostball', 'Art Class', 'Five decals in loud colours.', ['bb-decal-graffiti-drips', 'bb-decal-comic-book-dots', 'bb-decal-topographic-lines', 'bb-decal-stained-glass', 'bb-decal-honeycomb']),
    itemPack('bb-decals-weather', 'boostball', 'Hot and Cold', 'Five decals the weather made.', ['bb-decal-lava-cracks', 'bb-decal-frost', 'bb-decal-autumn-leaves', 'bb-decal-rust-bucket', 'bb-decal-wood-paneling']),
    itemPack('bb-decals-jobs', 'boostball', 'Odd Jobs', 'Six decals for cars with something to do.', ['bb-decal-duct-tape-patches', 'bb-decal-donut-sprinkles', 'bb-decal-bubble-wrap', 'bb-decal-taxi', 'bb-decal-police-cruiser', 'bb-decal-ice-cream-truck']),
    itemPack('bb-trails-burn', 'boostball', 'Afterburners', 'Six trails that mean business.', ['bb-trail-classic-flame', 'bb-trail-blue-plasma', 'bb-trail-lightning', 'bb-trail-lava', 'bb-trail-water-jet', 'bb-trail-laser-beam']),
    itemPack('bb-trails-party', 'boostball', 'Party Bag', 'Five trails for a celebration.', ['bb-trail-rainbow', 'bb-trail-confetti', 'bb-trail-hearts', 'bb-trail-music-notes', 'bb-trail-sparkles']),
    itemPack('bb-trails-weather', 'boostball', 'Light and Fluffy', 'Six trails that float.', ['bb-trail-bubbles', 'bb-trail-snowflakes', 'bb-trail-autumn-leaves', 'bb-trail-feathers', 'bb-trail-soap-suds', 'bb-trail-smoke-rings']),
    itemPack('bb-trails-odd', 'boostball', 'Odds and Ends', 'Five trails nobody asked for.', ['bb-trail-popcorn', 'bb-trail-rubber-ducks', 'bb-trail-toast-slices', 'bb-trail-dollar-bills', 'bb-trail-slime']),
    itemPack('bb-trails-night', 'boostball', 'Night Shift', 'Five trails for after dark.', ['bb-trail-stardust', 'bb-trail-pixel-blocks', 'bb-trail-ink', 'bb-trail-ones-and-zeros', 'bb-trail-bats']),
    itemPack('bb-goals-bang', 'boostball', 'Big Bangs', 'Five loud ways to score.', ['bb-goal-fireworks', 'bb-goal-supernova', 'bb-goal-lightning-strike', 'bb-goal-meteor', 'bb-goal-volcano']),
    itemPack('bb-goals-party', 'boostball', 'Party Time', 'Five goal parties.', ['bb-goal-confetti-cannon', 'bb-goal-disco-ball-drop', 'bb-goal-pinata-burst', 'bb-goal-popcorn-pop', 'bb-goal-money-rain']),
    itemPack('bb-goals-science', 'boostball', 'Strange Science', 'Five things that should not happen to a ball.', ['bb-goal-black-hole', 'bb-goal-tornado', 'bb-goal-freeze-and-shatter', 'bb-goal-pixel-shatter', 'bb-goal-flock-of-birds']),
    itemPack('bb-goals-giant', 'boostball', 'Giant Trouble', 'Six very big surprises.', ['bb-goal-giant-foot-stomp', 'bb-goal-ufo-abduction', 'bb-goal-shark-attack', 'bb-goal-giant-airhorn', 'bb-goal-pumpkin-splat', 'bb-goal-goal-letters']),
    itemPack('bb-toppers', 'boostball', 'Aerial Shop', 'Six things to stick on your aerial.', ['bb-topper-tennis-ball', 'bb-topper-gold-star', 'bb-topper-bath-duck', 'bb-topper-mini-pumpkin', 'bb-topper-pennant', 'bb-topper-eyeball']),
    itemPack('bb-hats', 'boostball', 'Roof Rack', 'Six hats for a car.', ['bb-hat-traffic-cone', 'bb-hat-top-hat', 'bb-hat-crown', 'bb-hat-propeller-beanie', 'bb-hat-cowboy-hat', 'bb-hat-chef-hat']),
    itemPack('bb-wheels', 'boostball', 'Tyre Fitter', 'Four sets of wheels.', ['bb-wheels-five-spoke', 'bb-wheels-discs', 'bb-wheels-cross', 'bb-wheels-gold-rims']),
    itemPack('bb-engines', 'boostball', 'Under the Bonnet', 'Four engine sounds. Only you hear yours.', ['bb-engine-purr', 'bb-engine-buzz', 'bb-engine-rumble', 'bb-engine-whirr']),
    itemPack('ss-liveries-classic', 'slipstream', 'Paint Shop', 'Four liveries in your team colours.', ['ss-livery-two-tone-classic', 'ss-livery-retro-stripes', 'ss-livery-pastel', 'ss-livery-checkered']),
    itemPack('ss-liveries-loud', 'slipstream', 'Show Car', 'Four liveries that get looked at.', ['ss-livery-matte-black-with-neon', 'ss-livery-chrome', 'ss-livery-carbon', 'ss-livery-flames']),
    itemPack('ss-helmets-fast', 'slipstream', 'Helmet Rack', 'Four helmets that look quick.', ['ss-helmet-flames-helmet', 'ss-helmet-checkered-helmet', 'ss-helmet-lightning-helmet', 'ss-helmet-chrome-visor']),
    itemPack('ss-helmets-wild', 'slipstream', 'Wild Lids', 'Five helmets with a face.', ['ss-helmet-shark-helmet', 'ss-helmet-skull-helmet', 'ss-helmet-tiger-helmet', 'ss-helmet-eyeball', 'ss-helmet-cat-ears']),
    itemPack('ss-helmets-odd', 'slipstream', 'Odd Lids', 'Six helmets that are really something else.', ['ss-helmet-galaxy-helmet', 'ss-helmet-disco-ball', 'ss-helmet-watermelon-helmet', 'ss-helmet-eight-ball', 'ss-helmet-pumpkin-helmet', 'ss-helmet-pizza-helmet']),
    itemPack('ss-effects-air', 'slipstream', 'Clean Air', 'Four boost effects.', ['ss-effect-white-air-streaks', 'ss-effect-vapor-trail', 'ss-effect-flames', 'ss-effect-sparks']),
    itemPack('ss-effects-show', 'slipstream', 'Light Show', 'Four brighter boost effects.', ['ss-effect-electric-arcs', 'ss-effect-rainbow', 'ss-effect-confetti', 'ss-effect-purple-plasma']),
    itemPack('ss-extras', 'slipstream', 'Pit Wall Party', 'Five tyre smoke colours and two podium celebrations.', ['ss-smoke-pink-tyre-smoke', 'ss-smoke-blue-tyre-smoke', 'ss-smoke-green-tyre-smoke', 'ss-smoke-purple-tyre-smoke', 'ss-smoke-gold-tyre-smoke', 'ss-podium-confetti-podium', 'ss-podium-fireworks-podium']),
    { id: 'emeralds-1', kind: 'emeralds', name: 'Emerald Pouch', desc: 'About 563 emeralds. Not available yet.', usd: 1, contents: { mangos: 7321 } },
    { id: 'emeralds-5', kind: 'emeralds', name: 'Emerald Chest', desc: 'About 2,815 emeralds. Not available yet.', usd: 5, contents: { mangos: 5 * 7321 } },
    { id: 'emeralds-10', kind: 'emeralds', name: 'Emerald Vault', desc: 'About 5,631 emeralds. Not available yet.', usd: 10, contents: { mangos: 10 * 7321 } }
  ];
  var PACKS_BY_ID = {}; PACKS.forEach(function (p) { PACKS_BY_ID[p.id] = p; });

  // ---------------- Random numbers ----------------
  // next() gives a whole number 0 to 2^32 - 1. Play uses crypto; tests pass seeded(n) for the same answers every time.
  function cryptoNext() {
    var buf = new Uint32Array(64), i = 64;
    return function () { if (i >= 64) { crypto.getRandomValues(buf); i = 0; } return buf[i++]; };
  }
  var sharedCrypto = null;
  function seeded(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; };
  }
  // A fair whole number below n: numbers above the last full multiple of n are thrown away and drawn again (no modulo bias).
  function below(next, n) {
    var lim = Math.floor(4294967296 / n) * n, x;
    do { x = next(); } while (x >= lim);
    return x % n;
  }
  // One draw: { rarity, skin } at the RARITY weights, then one skin of that rarity, all equally likely.
  function roll(next) {
    next = next || sharedCrypto || (sharedCrypto = cryptoNext());
    var r = below(next, RARITY_TOTAL), acc = 0, rar = RARITY[RARITY.length - 1];
    for (var i = 0; i < RARITY.length; i++) { acc += RARITY[i].w; if (r < acc) { rar = RARITY[i]; break; } }
    var list = BY_RARITY[rar.id];
    return { rarity: rar.id, skin: list[below(next, list.length)].id };
  }

  // ---------------- Locker ----------------
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function json(s) { try { return JSON.parse(s); } catch (e) { return null; } }
  function obj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function load() {
    var o = json(ls(KEY)), L = { v: 1, s: [], a: [], g: [], e: { skin: '' }, ge: {} };
    SLOTS.forEach(function (k) { L.e[k] = ''; });
    if (!obj(o) || o.v !== 1) return L;
    if (Array.isArray(o.s)) o.s.forEach(function (id) { if (SKINS_BY_ID[id] && L.s.indexOf(id) < 0) L.s.push(id); });
    if (Array.isArray(o.a)) o.a.forEach(function (id) { if (ACC_BY_ID[id] && L.a.indexOf(id) < 0) L.a.push(id); });
    if (Array.isArray(o.g)) o.g.forEach(function (id) { if (ITEM_BY_ID[id] && L.g.indexOf(id) < 0) L.g.push(id); });
    if (obj(o.ge)) Object.keys(o.ge).forEach(function (k) { var it = ITEM_BY_ID[o.ge[k]]; if (it && it.game + ':' + it.slot === k && L.g.indexOf(it.id) >= 0) L.ge[k] = it.id; });
    if (obj(o.e)) {
      if (L.s.indexOf(o.e.skin) >= 0) L.e.skin = o.e.skin;
      SLOTS.forEach(function (k) { var a = ACC_BY_ID[o.e[k]]; if (a && a.slot === k && L.a.indexOf(a.id) >= 0) L.e[k] = a.id; });
    }
    return L;
  }
  function save(L) {
    if (!L.g.length) { delete L.g; delete L.ge; }      // no game items: the saved locker is exactly what it was before they existed
    ls(KEY, JSON.stringify(L)); try { document.dispatchEvent(new CustomEvent('backroom:cosmetics', { detail: { equipped: equipped() } })); } catch (e) {} }
  function equip(id) {
    if (!on()) return false;
    var L = load();
    if (SKINS_BY_ID[id]) { if (L.s.indexOf(id) < 0) return false; L.e.skin = id; save(L); return true; }
    var a = ACC_BY_ID[id];
    if (a) { if (L.a.indexOf(id) < 0) return false; L.e[a.slot] = id; save(L); return true; }
    var it = ITEM_BY_ID[id];
    if (it) { if (L.g.indexOf(id) < 0) return false; L.ge[it.game + ':' + it.slot] = id; save(L); return true; }
    return false;
  }
  function unequip(slotOrId) {
    if (!on()) return false;
    var L = load(), k = slotOrId;
    if (SKINS_BY_ID[k]) k = 'skin'; else if (ACC_BY_ID[k]) k = ACC_BY_ID[k].slot;
    else if (ITEM_BY_ID[k]) k = ITEM_BY_ID[k].game + ':' + ITEM_BY_ID[k].slot;
    if (String(k).indexOf(':') > 0) { if (!L.ge[k]) return false; delete L.ge[k]; save(L); return true; }   // a game slot, as 'boostball:decal'
    if (k !== 'skin' && SLOTS.indexOf(k) < 0) return false;
    L.e[k] = ''; save(L); return true;
  }
  var DEFAULT_COLORS = { body: '#5B6B7C', accent: '#F5A524', trim: '#2E3742', emissive: '#7FD4FF', pattern: 'plain' };
  function equipped() {
    var out = { skin: null, accessories: {}, colors: Object.assign({}, DEFAULT_COLORS) };
    if (!on()) return out;
    var L = load();
    if (L.e.skin) { out.skin = L.e.skin; out.colors = Object.assign({}, SKINS_BY_ID[L.e.skin].colors); }
    SLOTS.forEach(function (k) { if (L.e[k]) out.accessories[k] = L.e[k]; });
    return out;
  }
  // grant(id): a game hands over an item it gives itself (give: 'free' or 'earned'; see Game items). True when it is new.
  function grant(id) {
    var it = ITEM_BY_ID[id];
    if (!on() || !it || !it.give) return false;
    var L = load(); if (L.g.indexOf(id) >= 0) return false;
    L.g.push(id); save(L); return true;
  }
  // What is worn in one game: { slot: item } (the item objects, so the game has the number to send). Empty while switched off.
  function gameEquipped(game) {
    var out = {};
    if (!on()) return out;
    var L = load();
    Object.keys(L.ge).forEach(function (k) { var it = ITEM_BY_ID[L.ge[k]]; if (it && it.game === game) out[it.slot] = it; });
    return out;
  }
  // Mirror helpers for wallet.js: bitmasks by item number (hex, item 1 is the lowest bit of the first digit).
  function toMask(nos) {
    var d = [];
    nos.forEach(function (n) { var i = (n - 1) >> 2; while (d.length <= i) d.push(0); d[i] |= 1 << ((n - 1) & 3); });
    while (d.length && !d[d.length - 1]) d.pop();
    return d.map(function (x) { return x.toString(16); }).join('');
  }
  function fromMask(s) {
    var out = [];
    String(s || '').split('').forEach(function (ch, i) { var x = parseInt(ch, 16); if (!(x >= 0)) return; for (var b = 0; b < 4; b++) if (x & (1 << b)) out.push(i * 4 + b + 1); });
    return out;
  }
  function eqString(e) {
    var parts = [];
    if (e.skin && SKINS_BY_ID[e.skin]) parts.push('s' + SKINS_BY_ID[e.skin].no);
    SLOTS.forEach(function (k) { if (e[k] && ACC_BY_ID[e[k]]) parts.push(SLOT_LETTER[k] + ACC_BY_ID[e[k]].no); });
    return parts.join(',');
  }
  function parseEq(s) {
    var e = { skin: '' }; SLOTS.forEach(function (k) { e[k] = ''; });
    String(s || '').split(',').forEach(function (p) {
      var m = /^([a-z])(\d{1,3})$/.exec(p); if (!m) return;
      var n = +m[2];
      if (m[1] === 's') { if (SKIN_BY_NO[n]) e.skin = SKIN_BY_NO[n].id; return; }
      SLOTS.forEach(function (k) { if (SLOT_LETTER[k] === m[1] && ACC_BY_NO[n] && ACC_BY_NO[n].slot === k) e[k] = ACC_BY_NO[n].id; });
    });
    return e;
  }
  function mirror() {
    var L = load();
    return { s: toMask(L.s.map(function (id) { return SKINS_BY_ID[id].no; })), a: toMask(L.a.map(function (id) { return ACC_BY_ID[id].no; })), e: eqString(L.e) };
  }
  function join(mine, remote) {
    if (!remote) return mine;
    var s = fromMask(mine.s).concat(fromMask(remote.s)).filter(function (n) { return SKIN_BY_NO[n]; });
    var a = fromMask(mine.a).concat(fromMask(remote.a)).filter(function (n) { return ACC_BY_NO[n]; });
    return { s: toMask(s), a: toMask(a), e: mine.e || remote.e || '' };
  }
  function adopt(remote) {
    if (!on() || !remote) return;
    var L = load(), changed = false;
    fromMask(remote.s).forEach(function (n) { var x = SKIN_BY_NO[n]; if (x && L.s.indexOf(x.id) < 0) { L.s.push(x.id); changed = true; } });
    fromMask(remote.a).forEach(function (n) { var x = ACC_BY_NO[n]; if (x && L.a.indexOf(x.id) < 0) { L.a.push(x.id); changed = true; } });
    if (!eqString(L.e) && remote.e) {
      var e = parseEq(remote.e);
      if (e.skin && L.s.indexOf(e.skin) >= 0) { L.e.skin = e.skin; changed = true; }
      SLOTS.forEach(function (k) { if (e[k] && L.a.indexOf(e[k]) >= 0) { L.e[k] = e[k]; changed = true; } });
    }
    if (changed) save(L);
  }

  // ---------------- Buying ----------------
  function W() { return window.BackRoomWallet && window.BackRoomWallet.spend ? window.BackRoomWallet : null; }
  // What buying a pack would give, before paying: how many of its items are already owned (skin and accessory packs).
  function preview(packId) {
    var p = PACKS_BY_ID[packId]; if (!p) return null;
    var L = load(), items = (p.contents.skins || []).concat(p.contents.acc || [], p.contents.items || []);
    var have = items.filter(function (id) { return L.s.indexOf(id) >= 0 || L.a.indexOf(id) >= 0 || L.g.indexOf(id) >= 0; }).length;
    return { pack: p, items: items.length, have: have, all: items.length > 0 && have === items.length };
  }
  // buy(packId, opts) → { ok, reason?, spent (emeralds), got: { skins: [], acc: [], draws: [{ rarity, skin, dup }] }, refund (mangos), balance }
  // opts.next: a random-number source for the draws (tests). Reasons: off, unknown, money (emerald packs: see PAYMENTS),
  // owned (you already own everything in it), wallet (no wallet.js), funds (not enough emeralds).
  function buy(packId, opts) {
    var p = PACKS_BY_ID[packId];
    if (!on()) return { ok: false, reason: 'off' };
    if (!p) return { ok: false, reason: 'unknown' };
    if (p.kind === 'emeralds') return { ok: false, reason: 'money', checkout: W() ? W().PAYMENTS.checkout(packId) : null };
    var pv = preview(packId);
    if (pv.all) return { ok: false, reason: 'owned' };
    var w = W(); if (!w) return { ok: false, reason: 'wallet' };
    if (w.balance() < p.price * MPE) return { ok: false, reason: 'funds', need: p.price * MPE - w.balance() };
    if (w.spend(p.price, 'Bought ' + p.name) === false) return { ok: false, reason: 'funds' };
    var L = load(), got = { skins: [], acc: [], items: [], draws: [] }, dups = 0, next = opts && opts.next;
    (p.contents.items || []).forEach(function (id) { if (L.g.indexOf(id) < 0) { L.g.push(id); got.items.push(id); } else dups++; });
    (p.contents.skins || []).forEach(function (id) { if (L.s.indexOf(id) < 0) { L.s.push(id); got.skins.push(id); } else dups++; });
    (p.contents.acc || []).forEach(function (id) { if (L.a.indexOf(id) < 0) { L.a.push(id); got.acc.push(id); } else dups++; });
    for (var i = 0; i < (p.contents.draws || 0); i++) {
      var r = roll(next), dup = L.s.indexOf(r.skin) >= 0;
      if (dup) dups++; else L.s.push(r.skin);
      got.draws.push({ rarity: r.rarity, skin: r.skin, dup: dup });
    }
    if (!L.e.skin && L.s.length) L.e.skin = (got.skins[0] || (got.draws[0] && got.draws[0].skin) || L.s[0]);
    save(L);
    var refund = dups * DUP_REFUND;
    if (refund) w.earn(refund, dups === 1 ? 'Back for a duplicate' : 'Back for ' + dups + ' duplicates');
    return { ok: true, pack: p.id, spent: p.price, got: got, refund: refund, balance: w.balance() };
  }

  // ---------------- Drawing (64 × 64 units, avatar.js's grid) ----------------
  var INK = '#1B1513', WH = '#FFFFFF';
  var AV_SKIN = ['#F8D9BC', '#EBB98F', '#D09A6C', '#AE7247', '#86502C', '#6B4428'];   // avatar.js's skin tones, to recolour
  var SH = 'M8 68 C8 58 18 54 32 54 C46 54 56 58 56 68 Z';   // avatar.js's shoulders
  var nid = 0;
  function P(d, fill, stroke, w, extra) { return '<path d="' + d + '" fill="' + (fill || 'none') + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round"' : '') + (extra || '') + '/>'; }
  function C(cx, cy, r, fill, extra) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function E(cx, cy, rx, ry, fill, extra) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function R(x, y, w, h, rx, fill, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function star(cx, cy, r, fill, pts, inner, extra) {
    pts = pts || 4; inner = inner || 0.42; var d = '';
    for (var i = 0; i < pts * 2; i++) { var a = Math.PI * i / pts - Math.PI / 2, rr = i % 2 ? r * inner : r; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2) + ' '; }
    return P(d + 'Z', fill, null, 0, extra);
  }
  function heart(cx, cy, s, fill, extra) { return P('M' + cx + ' ' + (cy + 3.2 * s) + ' C' + (cx - 5 * s) + ' ' + (cy - 0.5 * s) + ' ' + (cx - 3 * s) + ' ' + (cy - 4 * s) + ' ' + cx + ' ' + (cy - 1.6 * s) + ' C' + (cx + 3 * s) + ' ' + (cy - 4 * s) + ' ' + (cx + 5 * s) + ' ' + (cy - 0.5 * s) + ' ' + cx + ' ' + (cy + 3.2 * s) + ' Z', fill, null, 0, extra); }
  function mirrorX(d) { return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, function (m, x, y) { return (64 - +x) + ' ' + y; }); }

  function background(lk, id) {
    var b2 = lk.bg2, o = ' opacity=".35"', s = C(32, 32, 32, lk.bg);
    switch (lk.bgp) {
      case 'stars': return s + star(10, 14, 2.6, b2, 4, .35, o) + star(52, 10, 2, b2, 4, .35, o) + star(55, 30, 1.6, b2, 4, .35, o) + star(7, 34, 1.4, b2, 4, .35, o) + C(46, 20, .9, b2, o) + C(14, 24, .8, b2, o);
      case 'sparkle': return s + star(10, 16, 3.4, b2, 4, .3, ' opacity=".7"') + star(54, 12, 2.4, b2, 4, .3, ' opacity=".7"') + star(55, 34, 2, b2, 4, .3, ' opacity=".55"') + star(8, 36, 1.6, b2, 4, .3, ' opacity=".55"') + C(46, 6, 1, b2) + C(20, 6, .8, b2);
      case 'waves': return s + P('M-2 14 Q6 10 14 14 T30 14 T46 14 T62 14 T78 14', null, b2, 2.2, o) + P('M-2 24 Q6 20 14 24 T30 24 T46 24 T62 24', null, b2, 2.2, o) + P('M-2 4 Q6 0 14 4 T30 4 T46 4 T62 4', null, b2, 2.2, o);
      case 'grid': var g = ''; for (var i = 4; i < 64; i += 8) g += P('M' + i + ' 0 L' + i + ' 64 M0 ' + i + ' L64 ' + i, null, b2, .7, ' opacity=".45"'); return s + g;
      case 'bubbles': return s + C(10, 18, 4, 'none', ' stroke="' + b2 + '" stroke-width="1.2" opacity=".6"') + C(54, 14, 3, 'none', ' stroke="' + b2 + '" stroke-width="1.2" opacity=".6"') + C(50, 30, 2, 'none', ' stroke="' + b2 + '" stroke-width="1" opacity=".6"') + C(7, 32, 2.2, 'none', ' stroke="' + b2 + '" stroke-width="1" opacity=".6"') + C(16, 8, 1.6, 'none', ' stroke="' + b2 + '" stroke-width="1" opacity=".6"');
      case 'dots': var d = ''; for (var y = 4; y < 64; y += 9) for (var x = (y % 18 ? 8 : 3); x < 64; x += 10) d += C(x, y, 1.3, b2, o); return s + d;
      case 'stripes': var st = ''; for (var k = -64; k < 64; k += 9) st += P('M' + k + ' 64 L' + (k + 64) + ' 0', null, b2, 3, ' opacity=".3"'); return s + st;
      case 'leaves': return s + E(10, 16, 4, 2, b2, ' transform="rotate(-30 10 16)" opacity=".55"') + E(54, 12, 3.6, 1.8, b2, ' transform="rotate(35 54 12)" opacity=".55"') + E(56, 32, 3, 1.5, b2, ' transform="rotate(-20 56 32)" opacity=".55"') + E(7, 34, 3, 1.5, b2, ' transform="rotate(25 7 34)" opacity=".55"') + E(24, 5, 2.6, 1.3, b2, ' transform="rotate(10 24 5)" opacity=".55"');
      case 'rays': var r = ''; for (var a = 0; a < 12; a++) { var t0 = a * Math.PI / 6, t1 = t0 + Math.PI / 12; r += P('M32 34 L' + (32 + 60 * Math.cos(t0)).toFixed(1) + ' ' + (34 + 60 * Math.sin(t0)).toFixed(1) + ' L' + (32 + 60 * Math.cos(t1)).toFixed(1) + ' ' + (34 + 60 * Math.sin(t1)).toFixed(1) + ' Z', b2, null, 0, ' opacity=".35"'); } return s + r;
      case 'snow': return s + star(10, 15, 3, b2, 6, .25, ' opacity=".8"') + star(54, 12, 2.4, b2, 6, .25, ' opacity=".8"') + star(55, 33, 2, b2, 6, .25, ' opacity=".7"') + star(8, 35, 1.8, b2, 6, .25, ' opacity=".7"') + C(22, 6, 1, b2) + C(44, 4, 1, b2) + C(4, 24, .9, b2) + C(60, 22, .9, b2);
      case 'hex': var h = '', hx = function (cx, cy) { var p = ''; for (var i = 0; i < 6; i++) { var t = Math.PI / 3 * i; p += (i ? 'L' : 'M') + (cx + 5 * Math.cos(t)).toFixed(1) + ' ' + (cy + 5 * Math.sin(t)).toFixed(1) + ' '; } return P(p + 'Z', null, b2, .9, ' opacity=".45"'); };
        for (var yy = 0; yy < 70; yy += 8.66) for (var xx = 0; xx < 70; xx += 15) h += hx(xx + ((yy / 8.66) % 2 ? 7.5 : 0), yy); return s + h;
      case 'checker': var c = ''; for (var cy = 0; cy < 64; cy += 8) for (var cx = ((cy / 8) % 2) * 8; cx < 64; cx += 16) c += R(cx, cy, 8, 8, 0, b2, ' opacity=".3"'); return s + c;
      case 'swirl': return s + P('M32 32 m-24 0 a24 24 0 1 1 48 0 a20 20 0 1 1 -40 0 a16 16 0 1 1 32 0 a12 12 0 1 1 -24 0', null, b2, 2.4, ' opacity=".35"') + star(12, 12, 2.6, WH, 4, .3, ' opacity=".8"') + star(52, 16, 2, WH, 4, .3, ' opacity=".7"');
      case 'quarters': return '<g>' + P('M32 32 L32 -4 A36 36 0 0 0 -4 32 Z', '#9BE07A') + P('M32 32 L68 32 A36 36 0 0 0 32 -4 Z', '#FFC93C') + P('M32 32 L32 68 A36 36 0 0 0 68 32 Z', '#E07A2E') + P('M32 32 L-4 32 A36 36 0 0 0 32 68 Z', '#9FD3FF') + '</g>' + star(10, 14, 2, WH, 6, .25, ' opacity=".8"') + E(52, 12, 3, 1.5, '#3E8A2E', ' transform="rotate(30 52 12)"');
      default: return s;
    }
  }
  function outfit(lk, c, id) {
    var b = c.body, a = c.accent, t = c.trim, em = c.emissive, cl = ' clip-path="url(#' + id + 's)"', base = P(SH, b), deco = '';
    switch (lk.outfit) {
      case 'suit': deco = P('M32 55 L32 66', null, t, 1.6) + C(43, 60, 2.6, a) + P('M23 55.5 Q32 61 41 55.5', null, t, 2) + R(17, 60, 7, 4, 1.2, t, ' opacity=".7"'); break;
      case 'hoodie': deco = P('M19 57 Q32 49 45 57', null, a, 3.2) + P('M29 57 L28.5 63 M35 57 L35.5 63', null, t, 1.3) + C(28.5, 63.5, 1, t) + C(35.5, 63.5, 1, t) + R(24, 63, 16, 6, 2, t, ' opacity=".45"'); break;
      case 'armor': deco = E(15, 61, 8, 5, a) + E(49, 61, 8, 5, a) + P('M24 57 L40 57 L38 66 L26 66 Z', t) + C(28, 60, .9, a) + C(36, 60, .9, a) + P('M29 63 L35 63', null, em, 1.3); break;
      case 'scales': for (var x = 6; x < 60; x += 6) deco += P('M' + (x - 3) + ' 60 Q' + x + ' 64 ' + (x + 3) + ' 60', null, a, 1.2) + P('M' + x + ' 64.5 Q' + (x + 3) + ' 68.5 ' + (x + 6) + ' 64.5', null, a, 1.2); deco += P('M23 55.5 Q32 59 41 55.5', null, t, 1.6); break;
      case 'stripes': deco = R(0, 58, 64, 2.4, 0, a) + R(0, 62.6, 64, 2.4, 0, a) + P('M24 55 Q32 59 40 55', null, t, 1.8); break;
      case 'robe': deco = P('M25 54.5 L32 62 L39 54.5', t, null, 0) + P('M14 58 L50 66', null, a, 3) + C(32, 62, 1.6, em); break;
      case 'jersey': deco = P('M26 54.5 L32 59 L38 54.5', null, a, 2.4) + R(9, 60, 6, 2, 1, a) + R(49, 60, 6, 2, 1, a) + R(30, 61, 4, 4, 1, t, ' opacity=".7"'); break;
      case 'puffer': deco = P('M10 59 Q32 56 54 59 M8 63 Q32 60 56 63', null, t, 1.1, ' opacity=".8"') + P('M32 55 L32 66', null, a, 1.8) + P('M24 54.5 Q32 57 40 54.5', null, a, 3); break;
      case 'overalls': base = P(SH, t); deco = R(24, 58, 16, 12, 2, b) + P('M24 59 L17 55 M40 59 L47 55', null, b, 3) + C(26.5, 60.5, 1.1, a) + C(37.5, 60.5, 1.1, a) + R(29, 62, 6, 3, 1, a, ' opacity=".7"'); break;
      case 'circuit': deco = P('M12 60 L20 60 L23 63 L30 63 M52 60 L44 60 L41 63 L34 63 M32 55 L32 61', null, a, 1.1) + C(12, 60, 1.2, em) + C(52, 60, 1.2, em) + C(32, 61.5, 1.5, em) + C(30, 63, .8, em) + C(34, 63, .8, em); break;
      default: deco = '';
    }
    return base + '<g' + cl + '>' + deco + '</g>';
  }
  function headPiece(lk, c) {
    var b = c.body, a = c.accent, t = c.trim, em = c.emissive, i;
    switch (lk.head) {
      case 'helmet': return C(32, 34, 21.5, 'none', ' stroke="' + t + '" stroke-width="3.4"') + C(32, 34, 19.8, a, ' opacity=".08"') + P('M17 26 Q22 16 32 14.5', null, WH, 2.2, ' opacity=".55"') + R(29, 9.5, 6, 3.4, 1.4, t) + C(32, 9, 1.4, em);
      case 'cat': return P('M15 24 L18 7 L28 16 Z', b) + P(mirrorX('M15 24 L18 7 L28 16 Z'), b) + P('M17.5 19 L19 11 L24 15.5 Z', a) + P(mirrorX('M17.5 19 L19 11 L24 15.5 Z'), a);
      case 'bear': return C(18, 17, 6.5, b) + C(46, 17, 6.5, b) + C(18, 17, 3.2, a) + C(46, 17, 3.2, a);
      case 'bunny': return P('M22 19 C17 5 21 -4 25 0 C28.5 4 28 13 27.5 18 Z', b) + P(mirrorX('M22 19 C17 5 21 -4 25 0 C28.5 4 28 13 27.5 18 Z'), b) + P('M23.3 16 C21 7 22.5 1.5 24.6 3 C26.2 6 26 12 25.8 16 Z', a) + P(mirrorX('M23.3 16 C21 7 22.5 1.5 24.6 3 C26.2 6 26 12 25.8 16 Z'), a);
      case 'fox': return P('M13 26 L15 4 L29 15 Z', b) + P(mirrorX('M13 26 L15 4 L29 15 Z'), b) + P('M15.5 20 L16.5 9 L24 15 Z', a) + P(mirrorX('M15.5 20 L16.5 9 L24 15 Z'), a) + P('M14.6 8 L15 4 L18.2 6.6 Z', t) + P(mirrorX('M14.6 8 L15 4 L18.2 6.6 Z'), t);
      case 'antenna': return P('M25 16 L20 5 M39 16 L44 5', null, t, 1.6) + C(20, 5, 2.6, em) + C(44, 5, 2.6, em) + C(20, 5, 4.2, em, ' opacity=".25"') + C(44, 5, 4.2, em, ' opacity=".25"');
      case 'horns': return P('M21 19 Q11 12 15 1 Q18 10 26 15 Z', t) + P(mirrorX('M21 19 Q11 12 15 1 Q18 10 26 15 Z'), t) + P('M15.4 4 Q15 7 17 9', null, a, 1.2) + P(mirrorX('M15.4 4 Q15 7 17 9'), null, a, 1.2);
      case 'leaf': return P('M32 15 Q32 9 33 5', null, t, 1.8) + P('M33 7 C37 2 44 3 45 6 C41 9 36 9 33 7 Z', a) + P('M32.5 9 C29 4 22 4 21 7 C25 10 29 10 32.5 9 Z', b);
      case 'plate': return R(19, 17.5, 26, 6.5, 2.5, t) + C(22.5, 20.7, 1, a) + C(41.5, 20.7, 1, a) + R(29, 19, 6, 3.4, 1.2, em) + C(15, 36, 4.2, t) + C(49, 36, 4.2, t) + C(15, 36, 1.6, em) + C(49, 36, 1.6, em);
      case 'goggles': return P('M16 25 L48 25', null, t, 2.4) + R(18, 20, 28, 9.5, 4.5, b, ' stroke="' + t + '" stroke-width="1.6"') + R(20.5, 22, 10.5, 5.5, 2.6, a, ' opacity=".85"') + R(33, 22, 10.5, 5.5, 2.6, a, ' opacity=".85"') + P('M22 23.5 L25 23.5', null, WH, 1, ' opacity=".8"');
      case 'frost': var f = ''; [[18, 18, 8], [24, 13, 10], [32, 10, 12], [40, 13, 10], [46, 18, 8]].forEach(function (p) { f += P('M' + (p[0] - 3) + ' ' + (p[1] + 6) + ' L' + p[0] + ' ' + (p[1] - p[2] + 6) + ' L' + (p[0] + 3) + ' ' + (p[1] + 6) + ' Z', a, t, .8, ' opacity=".92"'); }); return f + star(32, 4, 2, WH, 6, .3);
      case 'sprinkle': var sp = '', cols = ['#FF6B8A', '#6BC6FF', '#FFD23F', '#7CE38B', '#B98BFF'], pos = [[20, 20, 30], [26, 15, -20], [33, 13, 60], [40, 16, 10], [45, 21, -40], [23, 24, 80], [37, 19, -70], [30, 18, 15]];
        pos.forEach(function (p, i) { sp += R(p[0] - 2, p[1] - .7, 4, 1.4, .7, cols[i % cols.length], ' transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')"'); }); return sp;
      case 'gumdrop': return P('M14.5 31 C14 12 50 12 49.5 31 Z', a, null, 0, ' opacity=".95"') + C(22, 22, 1.1, WH) + C(30, 17, 1.1, WH) + C(39, 19, 1.1, WH) + C(44, 26, 1.1, WH) + C(26, 27, 1, WH) + P('M19 22 Q22 16 28 15', null, WH, 1.6, ' opacity=".6"');
      case 'fins': return P('M16 33 L6 26 L8 40 Z', a, null, 0, ' opacity=".9"') + P(mirrorX('M16 33 L6 26 L8 40 Z'), a, null, 0, ' opacity=".9"') + P('M28 15 Q32 2 38 6 Q35 10 36 15 Z', a) + C(32, 6, 2, em) + C(32, 6, 4, em, ' opacity=".25"');
      case 'crown': return P('M19 19 L20.5 6 L26.5 12.5 L32 3.5 L37.5 12.5 L43.5 6 L45 19 Z', a, t, .8) + C(32, 9.5, 1.8, em) + C(23, 13.5, 1.2, '#FF7AE0') + C(41, 13.5, 1.2, '#7FD4FF') + star(50, 6, 2.2, WH, 4, .3) + star(13, 9, 1.6, WH, 4, .3);
      case 'crownleaf': var cl = ''; [[20, 16, -40, '#9BE07A'], [26, 11, -15, '#FFC93C'], [32, 9, 0, '#E07A2E'], [38, 11, 15, '#9FD3FF'], [44, 16, 40, '#9BE07A']].forEach(function (p) { cl += E(p[0], p[1], 2.4, 5, p[3], ' transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')" stroke="' + t + '" stroke-width=".6"'); }); return cl + star(32, 3, 2.2, WH, 6, .3);
      default: return '';
    }
  }
  // Accessory layers: 'back' (behind the face: capes, trails, auras), 'front' (glasses, hats, halos, pets).
  function accBack(a, id) {
    var c = a.three.color, c2 = a.three.color2;
    switch (a.draw) {
      case 'hero': return P('M1 68 L7 46 Q32 38 57 46 L63 68 Z', c) + P('M7 46 Q32 38 57 46', null, c2, 1.4, ' opacity=".7"');
      case 'galaxy': return P('M1 68 L7 46 Q32 38 57 46 L63 68 Z', c) + star(10, 60, 1.6, c2, 4, .3) + star(54, 58, 1.3, c2, 4, .3) + C(15, 54, .7, c2) + C(50, 53, .7, c2) + C(7, 64, .6, c2);
      case 'leaf': return P('M1 68 L7 46 Q32 38 57 46 L63 68 Z', c) + E(9, 47, 4, 2.2, c2, ' transform="rotate(-30 9 47)"') + E(55, 47, 4, 2.2, c2, ' transform="rotate(30 55 47)"') + P('M8 48 L4 62 M56 48 L60 62', null, c2, 1, ' opacity=".7"');
      case 'sparkle': return star(6, 52, 2.6, c, 4, .3) + star(12, 44, 1.8, c2, 4, .3) + star(4, 38, 1.4, c, 4, .3) + C(10, 58, .9, c2) + C(16, 50, .8, c);
      case 'bubbles': return C(7, 50, 3, 'none', ' stroke="' + c + '" stroke-width="1.3"') + C(12, 42, 2.2, 'none', ' stroke="' + c + '" stroke-width="1.1"') + C(5, 36, 1.6, 'none', ' stroke="' + c + '" stroke-width="1"') + C(6.2, 49, .8, c2);
      case 'rainbow': var cols = ['#FF5C5C', '#FFA63D', '#FFE45C', '#5CE07A', '#5CC8FF', '#9A7CFF'], r = ''; cols.forEach(function (k, i) { r += P('M-4 ' + (40 + i * 2.6) + ' Q10 ' + (36 + i * 2.6) + ' 18 ' + (46 + i * 2.6), null, k, 2.6); }); return r;
      case 'ember': return '<defs><radialGradient id="' + id + 'em"><stop offset="0" stop-color="' + c + '" stop-opacity=".75"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient></defs>' + C(32, 34, 28, 'url(#' + id + 'em)') + P('M10 30 Q8 24 11 20 Q12 25 10 30 Z M54 28 Q56 22 53 18 Q52 23 54 28 Z M18 12 Q17 8 19 6 Q20 9 18 12 Z', c2);
      case 'frost': return C(32, 34, 26, 'none', ' stroke="' + c + '" stroke-width="2.2" stroke-dasharray="3 3" opacity=".9"') + star(8, 30, 2.2, c2, 6, .25) + star(56, 30, 2.2, c2, 6, .25) + star(32, 7, 1.8, c2, 6, .25);
      default: return '';
    }
  }
  function accFront(a) {
    var c = a.three.color, c2 = a.three.color2;
    switch (a.draw) {
      case 'beanie': return P('M15 29 C15 13 23 9 32 9 C41 9 49 13 49 29 Z', c) + R(14, 25, 36, 6.5, 3.2, c2) + P('M20 25 L20 13 M26 25 L26 10 M32 25 L32 9.5 M38 25 L38 10 M44 25 L44 13', null, INK, .8, ' opacity=".15"') + C(32, 7, 4.2, c2);
      case 'wizard': return P('M14 27 Q31 23 50 27 L46 30 Q31 27 18 30 Z', c) + P('M18 27 Q24 14 31 3 Q34 -1 40 4 Q36 3 35 7 Q40 16 46 27 Z', c) + star(28, 16, 2, c2, 5, .45) + star(38, 21, 1.5, c2, 5, .45) + C(33, 10, .9, c2);
      case 'propeller': return P('M16 26 C16 14 24 11 32 11 C40 11 48 14 48 26 Z', c) + P('M16 26 L52 26 Q52 29 46 29 L16 29 Z', c) + P('M17 18 L47 18', null, c2, 1.6) + R(31, 5, 2, 6, 1, INK) + E(25, 5, 7, 1.8, c2) + E(39, 5, 7, 1.8, '#FF5C5C') + C(32, 5, 1.5, INK);
      case 'tophat': return R(12, 22, 40, 5, 2.5, c) + R(19, 1, 26, 23, 2, c) + R(19, 17, 26, 4, 0, c2);
      case 'flowers': var f = ''; [[17, 21], [23, 15.5], [32, 13.5], [41, 15.5], [47, 21]].forEach(function (p) { for (var k = 0; k < 5; k++) { var t = k * 2 * Math.PI / 5; f += C((p[0] + 2.2 * Math.cos(t)).toFixed(2), (p[1] + 2.2 * Math.sin(t)).toFixed(2), 1.7, c); } f += C(p[0], p[1], 1.4, c2); }); return P('M15 23 Q32 10 49 23', null, '#5CA040', 1.4) + f;
      case 'stars': return star(25, 34, 7.2, c, 5, .5) + star(39, 34, 7.2, c, 5, .5) + P('M30.5 33 L33.5 33', null, c, 1.8) + P('M19 33 L14 31 M45 33 L50 31', null, c, 1.6) + star(23, 32, 1.3, c2, 4, .3);
      case 'hearts': return heart(25, 34, 1.55, c, ' opacity=".9"') + heart(39, 34, 1.55, c, ' opacity=".9"') + P('M31.6 33 L32.4 33', null, c, 1.6) + P('M18 33 L15 31.5 M46 33 L49 31.5', null, c, 1.4) + C(23, 31.5, .9, c2, ' opacity=".8"') + C(37, 31.5, .9, c2, ' opacity=".8"');
      case 'monocle': return C(39, 34, 6, c2, ' opacity=".3"') + C(39, 34, 6, 'none', ' stroke="' + c + '" stroke-width="1.6"') + P('M44 38 Q48 46 44 54', null, c, .9);
      case 'visor': return R(14, 29, 36, 9, 4.5, c, ' opacity=".75"') + R(14, 29, 36, 9, 4.5, 'none', ' stroke="' + c2 + '" stroke-width="1"') + P('M17 31.5 L30 31.5', null, WH, 1.1, ' opacity=".8"');
      case 'hero': return C(21, 56, 2.2, c2) + C(43, 56, 2.2, c2);
      case 'galaxy': return C(21, 56, 2.2, '#C9B6FF') + C(43, 56, 2.2, '#C9B6FF');
      case 'leaf': return E(21, 56, 2.6, 1.6, c2) + E(43, 56, 2.6, 1.6, c2);
      case 'halo': return E(32, 7, 12, 3.2, 'none', ' stroke="' + c + '" stroke-width="2.4"') + E(32, 7, 12, 3.2, 'none', ' stroke="' + c2 + '" stroke-width=".8" opacity=".9"');
      case 'slime': return P('M45 62 Q44 50 52 49 Q60 50 59 62 Z', c) + C(50, 55, 1.2, c2) + C(55, 55, 1.2, c2) + P('M50.5 58 Q52.5 59.5 54.5 58', null, c2, .9) + C(49, 52, 1, WH, ' opacity=".6"');
      case 'bot': return P('M52 44 L52 47', null, INK, .9) + C(52, 43.5, 1.2, c2) + R(46, 47, 12, 10, 2.5, c) + R(48, 50, 8, 4, 1.5, INK) + C(50.5, 52, .9, c2) + C(53.5, 52, .9, c2) + R(47, 57, 3, 3, 1, c) + R(54, 57, 3, 3, 1, c);
      case 'starfish': return star(52, 54, 8, c, 5, .48) + C(50.5, 53, .9, INK) + C(53.5, 53, .9, INK) + P('M50.5 55.6 Q52 56.8 53.5 55.6', null, INK, .8) + C(52, 54, 2.4, c2, ' opacity=".35"');
      case 'ghost': return P('M45 62 L45 52 Q45 45 52 45 Q59 45 59 52 L59 62 L56.7 60 L54.3 62 L52 60 L49.7 62 L47.3 60 Z', c, null, 0, ' opacity=".92"') + P('M45.5 49 L43.5 45.5 L47.5 47 Z M58.5 49 L60.5 45.5 L56.5 47 Z', c2) + C(49.8, 52, 1.1, INK) + C(54.2, 52, 1.1, INK) + E(52, 55, 1.4, 1, c2);
      case 'dragon': return P('M47 52 L41 46 L45 54 Z M57 52 L63 46 L59 54 Z', c2, null, 0, ' opacity=".9"') + E(52, 56, 7, 6.5, c) + P('M48 50.5 L47 46 L50.5 49.5 Z M56 50.5 L57 46 L53.5 49.5 Z', c2) + C(49.5, 55, 1.1, WH) + C(54.5, 55, 1.1, WH) + C(49.7, 55.2, .55, INK) + C(54.7, 55.2, .55, INK) + C(51, 59, .5, INK) + C(53, 59, .5, INK) + star(58, 60, 1.4, c2, 4, .3);
      default: return '';
    }
  }

  // A plain face, for pages without avatar.js.
  function plainFace(tone) {
    return R(27, 46, 10, 10, 2.5, tone) + E(32, 35, 16, 17, tone) + P('M16 34 C15 20 22 15 32 15 C42 15 49 20 48 34 C46 27 40 24 32 25 C24 24 18 27 16 34 Z', '#2B1B12') + C(25, 34, 2.5, INK) + C(39, 34, 2.5, INK) + P('M26 43 Q32 49.5 38 43', null, INK, 2.4);
  }
  // look: { skin: id, accessories: { slot: id } }; null or omitted means what is equipped.
  function avatarSvg(uid, size, opts) {
    size = Math.max(8, Math.min(512, Math.round(Number(size) || 32)));
    var look = opts && opts.look ? opts.look : null, eq = look || (on() ? (function () { var e = equipped(); return { skin: e.skin, accessories: e.accessories }; })() : { skin: null, accessories: {} });
    var sk = eq.skin && SKINS_BY_ID[eq.skin], ac = {}, id = 'brc' + (++nid).toString(36);
    SLOTS.forEach(function (k) { var a = eq.accessories && ACC_BY_ID[eq.accessories[k]]; if (a && a.slot === k) ac[k] = a; });
    var lk = sk ? sk.look : null, col = sk ? sk.colors : DEFAULT_COLORS;
    // The face: avatar.js's drawing for this uid, without its background, its hat or glasses under ours, recoloured.
    var face = '', BA = window.BackRoomAvatar, bgHex = '';
    if (BA && BA.seed && BA.svg) {
      var s = BA.seed(uid);
      if (lk && lk.hair != null) s.hair = lk.hair;
      if (lk && lk.hairc != null) s.hairc = lk.hairc;
      if (ac.hat || (lk && lk.head)) s.hat = 0;
      if (ac.glasses) s.glasses = 0;
      if (lk && (lk.head === 'cat' || lk.head === 'bear' || lk.head === 'bunny' || lk.head === 'fox' || lk.head === 'horns') && (s.hair === 4 || s.hair === 5)) s.hair = 0;
      var raw = BA.svg(uid, 64, { seed: s });
      bgHex = (BA.PALETTE || [])[s.bg] || '';
      var inner = raw.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      inner = inner.replace(/<circle cx="32" cy="32" r="32" fill="#[0-9A-Fa-f]{6}"\/>/, '');
      if (lk && lk.tone) { var tone = AV_SKIN[s.skin]; if (tone) inner = inner.split('"' + tone + '"').join('"' + lk.tone + '"'); }
      face = inner;
    } else {
      face = plainFace(lk && lk.tone ? lk.tone : '#EBB98F');
    }
    var bg = lk ? background(lk, id) : C(32, 32, 32, bgHex || '#3B82F6');
    var back = '', front = '';
    ['aura', 'trail', 'cape'].forEach(function (k) { if (ac[k]) back += accBack(ac[k], id); });
    ['cape', 'aura', 'glasses', 'hat', 'pet'].forEach(function (k) { if (ac[k]) front += k === 'pet' ? '<g transform="translate(-5 -4)">' + accFront(ac[k]) + '</g>' : accFront(ac[k]); });
    var body = lk ? outfit(lk, col, id) + headPiece(lk, col) : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">' +
      '<defs><clipPath id="' + id + '"><circle cx="32" cy="32" r="32"/></clipPath><clipPath id="' + id + 's"><path d="' + SH + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')">' + bg + back + '<g>' + face + '</g>' + body + front + '</g></svg>';
  }

  // A small picture of a game item for the shop and pickers: one simple shape per slot, in the item's two colours.
  function itemSvg(id, size) {
    var it = ITEM_BY_ID[id], a = it ? it.c1 : '#8FA3B8', b = it ? it.c2 : '#5B6B7C', d = '';
    switch (it ? it.slot : '') {
      case 'decal': d = P('M6 40 L8 31 L20 28 L27 19 L42 19 L50 28 L58 31 L58 40 Z', '#3B4A66', INK, 2) + P('M12 34 L20 30 L28 21 L36 21 L30 30 L44 30 L40 36 L14 37 Z', a) + P('M40 22 L44 22 L48 29 L44 29 Z', b) + C(19, 41, 6, INK) + C(47, 41, 6, INK) + C(19, 41, 2.4, '#C8D2DC') + C(47, 41, 2.4, '#C8D2DC'); break;
      case 'trail': d = C(50, 32, 9, a) + C(36, 32, 7, a, ' opacity=".8"') + C(24, 32, 5.5, b, ' opacity=".8"') + C(14, 32, 4, b, ' opacity=".6"') + C(7, 32, 2.6, b, ' opacity=".4"') + C(50, 32, 4, WH, ' opacity=".7"'); break;
      case 'goal': d = star(32, 32, 27, a, 10, .55) + star(32, 32, 17, b, 8, .5) + C(32, 32, 6, WH); break;
      case 'topper': d = P('M32 58 L32 30', null, '#C8D2DC', 3) + C(32, 21, 12, a, ' stroke="' + INK + '" stroke-width="2"') + C(28, 17, 4, b); break;
      case 'hat': d = P('M8 46 C8 40 56 40 56 46 C56 51 8 51 8 46 Z', b, INK, 2) + P('M18 44 C18 18 46 18 46 44 Z', a, INK, 2); break;
      case 'wheels': d = C(32, 32, 24, INK) + C(32, 32, 15, a) + star(32, 32, 14, b, 5, .35) + C(32, 32, 4, INK); break;
      case 'sponsor': d = R(4, 18, 56, 28, 7, a, ' stroke="' + INK + '" stroke-width="2"') + C(18, 32, 7, b) + R(29, 26, 24, 4, 2, b) + R(29, 34, 16, 3, 1.5, b, ' opacity=".7"'); break;
      case 'livery': d = P('M4 40 L10 38 L30 26 L38 26 L42 32 L60 38 L60 42 L4 42 Z', a, INK, 2) + P('M22 40 L34 29 L40 32 L52 40 Z', b) + C(16, 43, 6, INK) + C(48, 43, 6, INK) + C(16, 43, 2.4, '#C8D2DC') + C(48, 43, 2.4, '#C8D2DC'); break;
      case 'helmet': d = P('M10 38 C10 14 54 14 54 38 L54 46 L10 46 Z', a, INK, 2) + R(30, 28, 24, 10, 4, b, ' stroke="' + INK + '" stroke-width="1.5"'); break;
      case 'effect': case 'smoke': d = C(50, 32, 9, a) + C(36, 32, 7, a, ' opacity=".8"') + C(24, 32, 5.5, b, ' opacity=".8"') + C(14, 32, 4, b, ' opacity=".6"') + C(7, 32, 2.6, b, ' opacity=".4"') + C(50, 32, 4, WH, ' opacity=".7"'); break;
      case 'podium': d = star(32, 32, 27, a, 10, .55) + star(32, 32, 17, b, 8, .5) + C(32, 32, 6, WH); break;
      default: d = P('M10 26 L22 26 L34 14 L34 50 L22 38 L10 38 Z', a, INK, 2) + P('M41 22 C47 28 47 36 41 42 M47 16 C57 26 57 38 47 48', null, b, 3);
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="' + (size || 64) + '" height="' + (size || 64) + '" aria-hidden="true" focusable="false">' + d + '</svg>';
  }

  // ---------------- Textures for 3D games ----------------
  function texture(skinId, size) {
    size = Math.max(16, Math.min(1024, Math.round(Number(size) || 256)));
    var sk = SKINS_BY_ID[skinId], c = sk ? sk.colors : DEFAULT_COLORS, cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var g = cv.getContext('2d'), u = size / 16, i, j, nx = seeded(sk ? sk.no * 7919 : 1), rnd = function () { return nx() / 4294967296; };   // the same marks every time
    if (!g) return cv;
    g.fillStyle = c.body; g.fillRect(0, 0, size, size);
    g.fillStyle = c.accent; g.strokeStyle = c.accent; g.lineWidth = u * .5;
    switch (c.pattern) {
      case 'stripes': for (i = 0; i < 16; i += 4) g.fillRect(0, i * u, size, u * 1.5); break;
      case 'grid': case 'circuit': g.strokeStyle = c.pattern === 'grid' ? c.accent : c.emissive; for (i = 0; i <= 16; i += 4) { g.beginPath(); g.moveTo(i * u, 0); g.lineTo(i * u, size); g.moveTo(0, i * u); g.lineTo(size, i * u); g.stroke(); } if (c.pattern === 'circuit') { g.fillStyle = c.emissive; for (i = 0; i <= 16; i += 4) for (j = 0; j <= 16; j += 8) { g.beginPath(); g.arc(i * u, (j + (i % 8 ? 4 : 0)) * u, u * .8, 0, 7); g.fill(); } } break;
      case 'quilt': g.strokeStyle = c.trim; for (i = 2; i < 16; i += 4) { g.beginPath(); g.moveTo(0, i * u); g.lineTo(size, i * u); g.stroke(); } break;
      case 'scales': for (j = 0; j < 17; j += 2) for (i = 0; i < 17; i += 2) { g.beginPath(); g.arc((i + (j % 4 ? 1 : 0)) * u, j * u, u, 0, Math.PI); g.stroke(); } break;
      case 'stars': g.fillStyle = c.emissive; for (i = 0; i < 28; i++) { g.fillRect(rnd() * size, rnd() * size, u * .5, u * .5); } break;
      case 'hex': case 'plates': g.strokeStyle = c.trim; for (j = 0; j < 16; j += 4) for (i = 0; i < 16; i += 4) g.strokeRect((i + (j % 8 ? 2 : 0)) * u, j * u, 4 * u, 4 * u); break;
      case 'leaves': case 'spots': case 'sprinkles': case 'snow': for (i = 0; i < 26; i++) { g.fillStyle = i % 3 === 0 ? c.trim : (i % 3 === 1 ? c.accent : c.emissive); g.beginPath(); g.ellipse(rnd() * size, rnd() * size, u * .9, u * .55, rnd() * 3.2, 0, 7); g.fill(); } break;
      case 'waves': for (j = 2; j < 16; j += 4) { g.beginPath(); for (i = 0; i <= 16; i += .5) g.lineTo(i * u, (j + Math.sin(i) * .7) * u); g.stroke(); } break;
      case 'rays': case 'flames': g.fillStyle = c.pattern === 'flames' ? c.emissive : c.accent; for (i = 0; i < 16; i += 2) { g.beginPath(); g.moveTo(i * u, size); g.lineTo((i + 1) * u, size * .55); g.lineTo((i + 2) * u, size); g.fill(); } break;
      case 'quarters': ['#9BE07A', '#FFC93C', '#E07A2E', '#9FD3FF'].forEach(function (k, n) { g.fillStyle = k; g.fillRect((n % 2) * size / 2, Math.floor(n / 2) * size / 2, size / 2, size / 2); }); break;
      default: break;
    }
    return cv;
  }

  // ---------------- The Shop chip on hub pages (only when switched on) ----------------
  function hubChip() {
    if (!on() || !HUB || document.getElementById('brc-chip')) return;
    var slot = document.querySelector('[data-cosmetics-slot]') || document.querySelector('.topbar');
    if (!slot) return;
    var css = document.createElement('style');
    css.textContent = '#brc-chip{display:inline-flex;align-items:center;gap:6px;font:600 13px/1 system-ui,sans-serif;color:inherit;text-decoration:none;border:1px solid rgba(127,127,127,.4);border-radius:999px;padding:6px 10px;margin:0 8px;white-space:nowrap}#brc-chip:hover{border-color:currentColor}#brc-chip svg{width:14px;height:14px;flex:none}';
    document.head.appendChild(css);
    var a = document.createElement('a');
    a.id = 'brc-chip'; a.href = '/e63334287a3deaa3/shop/' + (FLAG ? '?cosmetics=1' : '');
    var draw = function () {
      var w = window.BackRoomWallet;
      a.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1 L14 6 L8 15 L2 6 Z" fill="#2FBF71"/><path d="M8 1 L10.5 6 L8 15 L5.5 6 Z" fill="#7CF0B0" opacity=".7"/></svg>';
      a.appendChild(document.createTextNode((w ? w.format(w.balance(), true) : '0') + ' · Shop'));
      a.title = w ? w.format(w.balance()) : '';
    };
    draw();
    document.addEventListener('backroom:wallet', draw);
    var acct = slot.querySelector('#acct');
    if (acct) slot.insertBefore(a, acct); else slot.appendChild(a);
  }

  // ---------------- API ----------------
  var api = {
    ENABLED: ENABLED,
    on: on,
    SKINS: SKINS, ACCESSORIES: ACCESSORIES, SKINS_BY_ID: SKINS_BY_ID, ACCESSORIES_BY_ID: ACC_BY_ID, SLOTS: SLOTS, SLOT_NAMES: SLOT_NAMES,
    RARITY: RARITY, RARITY_BY_ID: RARITY_BY_ID, RARITY_TOTAL: RARITY_TOTAL, PACKS: PACKS, PACKS_BY_ID: PACKS_BY_ID,
    DRAW_PRICE: DRAW_PRICE, DUP_REFUND: DUP_REFUND,
    roll: roll, seeded: seeded, below: below,
    owned: function () { if (!on()) return { skins: [], accessories: [], items: [] }; var L = load(); return { skins: L.s.slice(), accessories: L.a.slice(), items: L.g.slice() }; },
    GAMES: GAMES, GAME_ITEMS: GAME_ITEMS, GAME_ITEMS_BY_ID: ITEM_BY_ID, ITEM_PRICE: ITEM_PRICE, gameItems: gameItems, gameEquipped: gameEquipped, itemSvg: itemSvg,
    grant: grant,
    equip: equip, unequip: unequip, equipped: equipped,
    preview: preview, buy: buy, draw: function (n, opts) { return buy('draw-' + (n === 5 || n === 10 ? n : 1), opts); },
    avatarSvg: avatarSvg, texture: texture,
    _mirror: function () { return on() ? mirror() : null; }, _join: join, _adopt: adopt
  };
  window.BackRoomCosmetics = api;
  if (navigator.webdriver) window.__cos = { load: load, toMask: toMask, fromMask: fromMask, parseEq: parseEq, eqString: eqString, reset: function () { ls(KEY, null); } };
  if (HUB) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hubChip); else hubChip(); }
})();
