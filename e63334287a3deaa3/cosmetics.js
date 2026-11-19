/*
 * Back Room cosmetics: skins, accessories, chests and packs, and the player's locker.
 *
 *   <script src="/e63334287a3deaa3/captains.js" defer></script>    (before this file: the shared "who may see it" answer)
 *   <script src="/e63334287a3deaa3/cosmetics.js" defer></script>   (data-hub on hub pages: adds the wallet + Shop chip)
 *   <script src="/e63334287a3deaa3/wallet.js" defer></script>      (the coins: see that file)
 *
 * THE SWITCH: ENABLED, just below. While it is false nothing here is shown or saved anywhere: no Shop chip, no wallet,
 * no chests, no skin picker, no element added to any page, no network; the shop page (shop/) only says it isn't open yet.
 * Set it to true to open everything. For testing only, ?cosmetics=1 in the page address turns it on, and only when the
 * page is on localhost or driven by an automated browser (navigator.webdriver): that check is captains.js's, the one
 * file every hidden cosmetic asks (without it on the page the address does nothing).
 * The site's captains are NOT let in here early. captains.js lets them see the games' own screens (Driftfall's Locker,
 * Boostball's garage and Kit, Slipstream's Garage), where every item is free to wear while this file is off; the
 * shop, the wallet, earning and buying stay shut for them like everyone else, so on() asks captains.js's open(), which
 * leaves captains out, not may().
 *
 * What there is:
 *   SKINS        30 full looks in five rarities. Each has an avatar look (drawn over avatar.js's face: a background pattern,
 *                an outfit, something on the head, maybe a skin tone) and a colour set for 3D games:
 *                colors { body, accent, trim, emissive, pattern } (hex colours; pattern names a texture that texture()
 *                paints, so a game can use it as a THREE.CanvasTexture).
 *   ACCESSORIES  23 extras, each in one SLOT (hat, glasses, cape, trail, aura, pet): one per slot can be worn with any skin.
 *                Each also has `three`, a small description a 3D game can build it from (see "For 3D games" below).
 *   Prices       By rarity, the same for skins, accessories and game items (PRICE, whole mangos; 17 mangos = 1 emerald):
 *                common 60 ($0.50), uncommon 119 (7 emeralds, $0.99), rare 420 ($3.49), epic 600 ($4.99), legendary 1,200
 *                ($9.99). Every item can
 *                be bought on its own (buy('item:<id>')), and packs cost the sum of their items' prices.
 *   Chests       (the internal names still say draw: pack ids draw-1/5/10, kind 'draws', draw(), got.draws.) A chest costs
 *                CHEST_PRICE mangos (7 emeralds) and gives one skin at the RARITY odds: common 60%, uncommon 20%, rare 12.5%,
 *                epic 5%, legendary 2.5% (weights out of 10,000, picked with an unbiased whole-number roll: crypto in play,
 *                a seeded generator in tests). Every skin of a rarity is equally likely. A skin you already own gives back
 *                DUP_REFUND mangos (40% of a chest, rounded: 48). Chests are bought with emeralds only, never with money.
 *   PACKS        Everything bought with emeralds: chests (1, 5, 10; no discount), accessory packs, themed skin packs and
 *                game item packs. Prices are whole mangos. buy(packId) checks the wallet, takes the mangos and fills the
 *                locker. Emerald packs (real money) are wallet.js's EMERALD_PACKS, not here.
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
  var MPE = 17;                          // mangos per emerald (wallet.js)
  // Prices by rarity, in whole mangos, for skins, accessories and game items alike (the owners' table, 19 Nov 2026):
  // $0.50, $0.99, $3.49, $4.99, $9.99 at 7 emeralds (119 mangos) for $0.99.
  var PRICE = { common: 60, uncommon: 119, rare: 420, epic: 600, legendary: 1200 };
  var CHEST_PRICE = 7 * MPE;             // 119 mangos (7 emeralds) for one chest
  var DUP_REFUND = Math.round(CHEST_PRICE * 40 / 100);   // 48 mangos: 40% of a chest, back for a skin (or pack item) already owned
  var SLOTS = ['hat', 'glasses', 'cape', 'trail', 'aura', 'pet'];
  var SLOT_NAMES = { hat: 'Hat', glasses: 'Glasses', cape: 'Cape', trail: 'Trail', aura: 'Aura', pet: 'Pet' };
  var SLOT_LETTER = { skin: 's', hat: 'h', glasses: 'g', cape: 'c', trail: 't', aura: 'a', pet: 'p' };
  // Chest odds, as whole weights out of 10,000: 2.5%, 5%, 12.5%, 20%, 60%.
  // Which items are uncommon (added 19 Nov 2026): of the items that were rare, within each group in file order (skins by
  // theme, accessories by slot, game items by game and slot) the first half, rounded up, became uncommon; the rest stayed
  // rare. Common, epic and legendary were not changed. Move items freely; keep at least one skin in every rarity.
  var RARITY = [
    { id: 'legendary', name: 'Legendary', w: 250, color: '#F5A524' },
    { id: 'epic', name: 'Epic', w: 500, color: '#B26BFF' },
    { id: 'rare', name: 'Rare', w: 1250, color: '#3D8BFF' },
    { id: 'uncommon', name: 'Uncommon', w: 2000, color: '#4FCB6A' },
    { id: 'common', name: 'Common', w: 6000, color: '#8FA3B8' }
  ];
  var RARITY_TOTAL = 10000;
  var RARITY_BY_ID = {}; RARITY.forEach(function (r) { RARITY_BY_ID[r.id] = r; });

  var SHARED = window.BackRoomCaptains || null;      // captains.js: the test switch lives there, with the others
  var FLAG = !!(SHARED && SHARED.open(false, 'cosmetics'));
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
    S(13, 'comet-courier', 'Comet Courier', 'uncommon', 'space', 'Delivers parcels between planets, always slightly early.',
      { bg: '#0E1A3A', bg2: '#8FD6FF', bgp: 'sparkle', outfit: 'suit', head: 'antenna' },
      { body: '#2E5FD9', accent: '#8FD6FF', trim: '#F4F7FF', emissive: '#8FD6FF', pattern: 'stars' }),
    S(14, 'coral-diver', 'Coral Diver', 'uncommon', 'ocean', 'Mask on, flippers ready, off to count the reef fish.',
      { bg: '#0B6E8A', bg2: '#FF8A7A', bgp: 'bubbles', outfit: 'suit', head: 'goggles' },
      { body: '#14385C', accent: '#FF7A66', trim: '#FFD166', emissive: '#7FF0FF', pattern: 'waves' }),
    S(15, 'grid-runner', 'Grid Runner', 'uncommon', 'neon', 'Leaves a glowing line wherever it goes.',
      { bg: '#07061A', bg2: '#FF3FA4', bgp: 'grid', outfit: 'circuit', head: 'antenna' },
      { body: '#14123A', accent: '#FF3FA4', trim: '#3FE9FF', emissive: '#FF3FA4', pattern: 'circuit' }),
    S(16, 'gumdrop-knight', 'Gumdrop Knight', 'uncommon', 'candy', 'Sworn to protect the candy jar, mostly from itself.',
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
    A(2, 'wizard-cone', 'Wizard Cone', 'hat', 'uncommon', 'Tall, floppy and dotted with tiny stars.', 'wizard', { attach: 'head', shape: 'cone', color: '#3B3FB8', color2: '#FFD86B', size: 1.4 }),
    A(3, 'propeller-cap', 'Propeller Cap', 'hat', 'common', 'Spins in the wind. Does not actually fly.', 'propeller', { attach: 'head', shape: 'cap', color: '#2E9BE6', color2: '#FFD23F', size: 1 }),
    A(4, 'tall-topper', 'Tall Topper', 'hat', 'rare', 'A very tall hat for very important occasions.', 'tophat', { attach: 'head', shape: 'cylinder', color: '#22232B', color2: '#C2384A', size: 1.2 }),
    A(5, 'daisy-crown', 'Daisy Crown', 'hat', 'common', 'A ring of white flowers picked from the meadow.', 'flowers', { attach: 'head', shape: 'torus', color: '#FFFFFF', color2: '#FFD23F', size: 1 }),
    A(6, 'star-shades', 'Star Shades', 'glasses', 'uncommon', 'Sunglasses shaped like stars, for star-like people.', 'stars', { attach: 'face', shape: 'star-lens', color: '#1C1C28', color2: '#FFD23F', size: 1 }),
    A(7, 'heart-specs', 'Heart Specs', 'glasses', 'common', 'Pink heart-shaped lenses that make everything rosy.', 'hearts', { attach: 'face', shape: 'heart-lens', color: '#FF5C9A', color2: '#FFFFFF', size: 1 }),
    A(8, 'monocle', 'Monocle', 'glasses', 'rare', 'One round lens on a gold chain. Very distinguished.', 'monocle', { attach: 'face', shape: 'ring', color: '#D9A62E', color2: '#DDF4FF', size: .6 }),
    A(9, 'glow-visor', 'Glow Visor', 'glasses', 'epic', 'A glowing band across the eyes, straight from the arcade.', 'visor', { attach: 'face', shape: 'band', color: '#38F2C8', color2: '#FF4FB4', size: 1, glow: true }),
    A(10, 'hero-cape', 'Hero Cape', 'cape', 'common', 'Bright red and flappy. Saving the day is optional.', 'hero', { attach: 'back', shape: 'cloth', color: '#D93636', color2: '#FFD23F', size: 1 }),
    A(11, 'galaxy-cape', 'Galaxy Cape', 'cape', 'epic', 'A night sky to wear, stars included.', 'galaxy', { attach: 'back', shape: 'cloth', color: '#1E1352', color2: '#FFFFFF', size: 1.1, glow: true }),
    A(12, 'leaf-cloak', 'Leaf Cloak', 'cape', 'uncommon', 'Stitched from big green leaves, good for hiding in hedges.', 'leaf', { attach: 'back', shape: 'cloth', color: '#3E8A2E', color2: '#9BD86F', size: 1 }),
    A(13, 'sparkle-trail', 'Sparkle Trail', 'trail', 'uncommon', 'Leaves a little line of twinkles behind you.', 'sparkle', { attach: 'feet', shape: 'particles', color: '#FFE45C', color2: '#FFFFFF', size: 1, glow: true }),
    A(14, 'bubble-trail', 'Bubble Trail', 'trail', 'common', 'Soap bubbles that float up and pop as you go.', 'bubbles', { attach: 'feet', shape: 'particles', color: '#BDF0FF', color2: '#FFFFFF', size: 1 }),
    A(15, 'rainbow-streak', 'Rainbow Streak', 'trail', 'epic', 'A stripe of every colour stretching out behind you.', 'rainbow', { attach: 'feet', shape: 'ribbon', color: '#FF5C5C', color2: '#5CC8FF', size: 1, glow: true }),
    A(16, 'halo-glow', 'Halo Glow', 'aura', 'uncommon', 'A soft golden ring that floats just above your head.', 'halo', { attach: 'head', shape: 'ring', color: '#FFD86B', color2: '#FFF6D6', size: 1, glow: true }),
    A(17, 'ember-aura', 'Ember Aura', 'aura', 'epic', 'Warm sparks that drift up around you.', 'ember', { attach: 'around', shape: 'particles', color: '#FF7A2E', color2: '#FFD23F', size: 1.2, glow: true }),
    A(18, 'frost-ring', 'Frost Ring', 'aura', 'rare', 'A circle of cold air with snowflakes caught in it.', 'frost', { attach: 'around', shape: 'ring', color: '#BFE4FF', color2: '#FFFFFF', size: 1.2, glow: true }),
    A(19, 'pocket-slime', 'Pocket Slime', 'pet', 'common', 'A friendly green blob that bounces after you.', 'slime', { attach: 'follow', shape: 'blob', color: '#6EDB5A', color2: '#1B1513', size: .4 }),
    A(20, 'mini-bot', 'Mini Bot', 'pet', 'uncommon', 'A tiny robot helper with one antenna and lots of opinions.', 'bot', { attach: 'follow', shape: 'box', color: '#9AA8B6', color2: '#38F2C8', size: .4 }),
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
  // (which sets its price, PRICE mangos, and so its pack's), two colours for the small picture itemSvg() draws in the shop,
  // and a line of text. Ids are '<game prefix>-<slot>-<name>'. They are saved in the locker beside skins (g: owned, ge: worn per
  // 'game:slot') and, unlike skins and accessories, are not mirrored into the Google account yet (w.a holds at most 128 item numbers).
  // One GAMES entry per game: its name, the prefix of its ids, and its slots in the order the shop lists them.
  var GAMES = {
    boostball: { name: 'Boostball', prefix: 'bb', slots: [['decal', 'Decals'], ['trail', 'Boost trails'], ['goal', 'Goal explosions'], ['topper', 'Antenna toppers'], ['hat', 'Roof hats'], ['wheels', 'Wheels'], ['engine', 'Engine sounds']] },
    slipstream: { name: 'Slipstream', prefix: 'ss', slots: [['sponsor', 'Sponsors'], ['livery', 'Liveries'], ['helmet', 'Helmets'], ['effect', 'Boost effects'], ['smoke', 'Tyre smoke'], ['podium', 'Podium celebrations']] },
    coil: { name: 'Coil', prefix: 'cl', slots: [['color', 'Colours'], ['animal', 'Animal patterns'], ['design', 'Design patterns'], ['object', 'Object snakes'], ['head', 'Heads'], ['trail', 'Trails'], ['burst', 'Death bursts']] },
    updraft: { name: 'Updraft', prefix: 'up', slots: [['skin', 'Skins'], ['pack', 'Backpacks'], ['reward', 'Height rewards'], ['scream', 'Fall screams'], ['trail', 'Plummet trails']] },
    'rumble-karts': { name: 'Rumble Karts', prefix: 'rk', slots: [['driver', 'Drivers'], ['kart', 'Karts'], ['wheels', 'Wheels'], ['horn', 'Horns'], ['wreck', 'Wreck effects']] },
    'tumble-trials': { name: 'Tumble Trials', prefix: 'tt', slots: [['colour', 'Colours'], ['premium', 'Premium colours'], ['pattern', 'Patterns'], ['pants', 'Underpants'], ['hat', 'Hats'], ['face', 'Faces'], ['costume', 'Costumes'], ['dance', 'Victory dances'], ['scream', 'Fall screams'], ['splash', 'Knockout splashes']] },
    'shell-crackers': { name: 'Shell Crackers', prefix: 'sc', slots: [['egg', 'Egg types'], ['hat', 'Hats'], ['gun', 'Gun skins'], ['crack', 'Crack effects']] },
    'asteroid-run': { name: 'Asteroid Run', prefix: 'ar', slots: [['alien', 'Aliens'], ['trail', 'Run trails'], ['tunnel', 'Tunnel colours']] },
    rampline: { name: 'Rampline', prefix: 'rl', slots: [['car', 'Cars'], ['paint', 'Paints'], ['wheels', 'Wheels'], ['smoke', 'Tyre smoke'], ['horn', 'Horns']] },
    chromaflage: { name: 'Chromaflage', prefix: 'cf', slots: [['hat', 'Seeker hats'], ['tool', 'Seeker tools'], ['splash', 'Catch splashes'], ['caught', 'Caught animations']] },
    'odd-one-out': { name: 'Odd One Out', prefix: 'oo', slots: [['outfit', 'Hunter outfits'], ['tool', 'Hunter tools'], ['taunt', 'Prop taunts'], ['poof', 'Catch poofs']] },
    'drop-zone': { name: 'Driftfall', prefix: 'dz', slots: [['outfit', 'Outfits'], ['pack', 'Backpacks'], ['glider', 'Gliders'], ['trail', 'Glider trails'], ['wrap', 'Gun skins'], ['build', 'Build skins'], ['emote', 'Emotes'], ['victory', 'Victory poses']] },
  };
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
  I('boostball', 'decal', 5, 'Shark Mouth', 'uncommon', '#FFFFFF', '#D93636', 'Teeth on the nose and one beady eye a side.');
  I('boostball', 'decal', 6, 'Tiger Stripes', 'uncommon', '#14161F', '#FF9A3D', 'Dark stripes that taper to points.');
  I('boostball', 'decal', 7, 'Dragon Scales', 'uncommon', '#3A7D5C', '#FFE45C', 'Rows of overlapping scales with a bright edge.');
  I('boostball', 'decal', 8, 'Carbon Fiber', 'common', '#2A2F3A', '#4A5160', 'A dark weave over the bonnet, roof and sills.');
  I('boostball', 'decal', 9, 'Pixel Camo', 'common', '#5C6B4A', '#2E3A2A', 'Blocky camouflage in shades of your team colour.');
  I('boostball', 'decal', 10, 'Galaxy', 'epic', '#5B2A9E', '#FF7AE0', 'Purple clouds and far-off stars.');
  I('boostball', 'decal', 11, 'Constellations', 'uncommon', '#FFFFFF', '#8FD6FF', 'Made-up star signs joined with thin lines.');
  I('boostball', 'decal', 12, 'Circuit Board', 'uncommon', '#4FF0C0', '#123B36', 'Traces, pads and one very important chip.');
  I('boostball', 'decal', 13, 'Graffiti Drips', 'uncommon', '#FF4FB4', '#38F2C8', 'Bright paint that ran before it dried.');
  I('boostball', 'decal', 14, 'Honeycomb', 'common', '#FFC93C', '#7A5410', 'Six-sided cells, a few of them full.');
  I('boostball', 'decal', 15, 'Lava Cracks', 'epic', '#FF5A1F', '#2A1410', 'Glowing cracks in a cooling crust.');
  I('boostball', 'decal', 16, 'Frost', 'uncommon', '#DDF4FF', '#6FB7F0', 'Ice ferns creeping in from the edges.');
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
  I('boostball', 'trail', 4, 'Lightning', 'uncommon', '#FFE45C', '#FFFFFF', 'Crackling sparks that jump about.');
  I('boostball', 'trail', 5, 'Bubbles', 'common', '#BDF0FF', '#FFFFFF', 'Soap bubbles that wobble up and pop.');
  I('boostball', 'trail', 6, 'Confetti', 'common', '#FF4FB4', '#FFD23F', 'A party every time you boost.');
  I('boostball', 'trail', 7, 'Snowflakes', 'common', '#FFFFFF', '#BFE4FF', 'A flurry that drifts down behind you.');
  I('boostball', 'trail', 8, 'Autumn Leaves', 'common', '#E07A2E', '#FFC46B', 'Leaves that tumble in your wake.');
  I('boostball', 'trail', 9, 'Sparkles', 'uncommon', '#FFE45C', '#FFFFFF', 'Little four-point twinkles.');
  I('boostball', 'trail', 10, 'Hearts', 'uncommon', '#FF5C9A', '#FFC2DD', 'Pink hearts that float away.');
  I('boostball', 'trail', 11, 'Music Notes', 'uncommon', '#B46CFF', '#3EE6FF', 'A tune nobody can quite hear.');
  I('boostball', 'trail', 12, 'Pixel Blocks', 'common', '#46E39A', '#3EE6FF', 'Square blocks from an older sort of game.');
  I('boostball', 'trail', 13, 'Smoke Rings', 'uncommon', '#DADFEA', '#8FA3B8', 'Neat grey rings, one after another.');
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
  I('boostball', 'goal', 1, 'Fireworks', 'uncommon', '#FF5C9A', '#FFE45C', 'Rockets up from the goal line, then a sky full of stars.');
  I('boostball', 'goal', 2, 'Confetti Cannon', 'uncommon', '#3EE6FF', '#FF4FB4', 'Two cannons, one loud pop, paper everywhere.');
  I('boostball', 'goal', 3, 'Black Hole', 'epic', '#1B1030', '#B46CFF', 'The ball spirals in and does not come back out.');
  I('boostball', 'goal', 4, 'Supernova', 'epic', '#FFFFFF', '#8FD6FF', 'A star goes off in the goal mouth.');
  I('boostball', 'goal', 5, 'Lightning Strike', 'uncommon', '#FFE45C', '#FFFFFF', 'Three bolts from a clear sky.');
  I('boostball', 'goal', 6, 'Tornado', 'epic', '#AEB6C2', '#6B7785', 'A twister carries the ball, and a cow, away.');
  I('boostball', 'goal', 7, 'Volcano', 'epic', '#FF5A1F', '#5C3A2A', 'A small volcano grows out of the pitch and goes off.');
  I('boostball', 'goal', 8, 'Meteor', 'epic', '#FF8A3D', '#5C4A4A', 'A rock from space lands exactly on the spot.');
  I('boostball', 'goal', 9, 'Freeze and Shatter', 'uncommon', '#BFE4FF', '#FFFFFF', 'The ball freezes solid, then breaks to bits.');
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
  I('boostball', 'topper', 2, 'Gold Star', 'uncommon', '#FFD23F', '#FFF2A8', 'A little star to follow.');
  I('boostball', 'topper', 3, 'Bath Duck', 'rare', '#FFD23F', '#FF8A1F', 'It bobs. It does not quack.');
  I('boostball', 'topper', 4, 'Mini Pumpkin', 'common', '#FF8A1F', '#5F7A2A', 'A very small pumpkin, stem and all.');
  I('boostball', 'topper', 5, 'Pennant', 'common', '#FF4D6D', '#FFFFFF', 'A small flag in your accent colour.');
  I('boostball', 'topper', 6, 'Eyeball', 'epic', '#FFFFFF', '#2E7BFF', 'It is watching the ball. Probably.');
  I('boostball', 'hat', 1, 'Traffic Cone', 'common', '#FF7A1F', '#FFFFFF', 'Borrowed from some roadworks.');
  I('boostball', 'hat', 2, 'Top Hat', 'uncommon', '#22232B', '#C2384A', 'For cars with somewhere smart to be.');
  I('boostball', 'hat', 3, 'Crown', 'epic', '#FFD23F', '#D93636', 'Gold, with points and red jewels.');
  I('boostball', 'hat', 4, 'Propeller Beanie', 'uncommon', '#D93636', '#FFD23F', 'The propeller is only for show.');
  I('boostball', 'hat', 5, 'Cowboy Hat', 'rare', '#8A5A36', '#E8C9A0', 'Wide brim, tall crown, yee-haw.');
  I('boostball', 'hat', 6, 'Chef Hat', 'common', '#FFFFFF', '#DADFEA', 'Tall, white and puffy on top.');
  I('boostball', 'wheels', 1, 'Five Spoke', 'common', '#9AA7C2', '#14161F', 'Five clean spokes.');
  I('boostball', 'wheels', 2, 'Discs', 'common', '#F4F6FF', '#9AA7C2', 'Smooth covers in your accent colour.');
  I('boostball', 'wheels', 3, 'Cross', 'uncommon', '#14161F', '#9AA7C2', 'Four chunky spokes in an X.');
  I('boostball', 'wheels', 4, 'Gold Rims', 'epic', '#FFD23F', '#C98A12', 'Shiny gold, five spokes.');
  I('boostball', 'engine', 1, 'Purr', 'common', '#8FA3B8', '#FFFFFF', 'A soft, low hum.');
  I('boostball', 'engine', 2, 'Buzz', 'uncommon', '#FFD23F', '#FF8A1F', 'High and angry, like a go-kart.');
  I('boostball', 'engine', 3, 'Rumble', 'rare', '#7A5230', '#FF4D6D', 'A big lazy burble.');
  I('boostball', 'engine', 4, 'Whirr', 'epic', '#3EE6FF', '#FFFFFF', 'Electric: it sings as it speeds up.');
  I('boostball', 'goal', 22, 'Carbon Star', 'legendary', '#2A1048', '#FF6A2E', 'Made for Carbon: a red giant flares in the goal and the whole arena drifts into deep space.'); ITEM_BY_ID['bb-goal-carbon-star'].give = 'exclusive';   // an exclusive gift (../captains.js GIFTS): in no pack or chest, never sold or gifted on
  // second wave (Nov 2026): sports, pirates, suits and robots. (Goal explosion 22 is Carbon Star, an exclusive gift from another branch.)
  I('boostball', 'decal', 32, 'Team Hoops', 'common', '#3F8CFF', '#FFFFFF', 'Wide bands round the car in your accent colour.');
  I('boostball', 'decal', 33, 'Varsity', 'uncommon', '#7A1F3D', '#FFFFFF', 'A chunky stripe and a big star, like a letter jacket.');
  I('boostball', 'decal', 34, 'Pinstripe Suit', 'uncommon', '#2F3140', '#B4B8CC', 'Chalk pinstripes over your paint and a pocket square.');
  I('boostball', 'decal', 35, 'Tuxedo', 'epic', '#15161C', '#F6F6F6', 'Black lapels, a white shirt front and a bow tie in your accent colour.');
  I('boostball', 'decal', 36, 'Gold Circuit', 'rare', '#1D8A4E', '#E0B54A', 'Gold traces, pads and little chips.');
  I('boostball', 'decal', 37, 'Robot Plating', 'rare', '#B8BCCF', '#3FD2FF', 'Panel seams, rivets and a glowing visor line.');
  I('boostball', 'decal', 38, 'Jolly Oars', 'epic', '#1D1F27', '#E9DCC0', 'Two crossed oars and gold rope trim. A pirate flag with no skull.');
  I('boostball', 'trail', 28, 'Gold Coins', 'legendary', '#FFD23F', '#C98A12', 'Coins bounce out behind you.');
  I('boostball', 'trail', 29, 'Sea Spray', 'uncommon', '#5CC8FF', '#FFFFFF', 'Spray off the back like a speedboat.');
  I('boostball', 'trail', 30, 'Circuit Sparks', 'rare', '#46E39A', '#FFD23F', 'Green and gold bits of light.');
  I('boostball', 'trail', 31, 'Ticker Tape', 'common', '#FFFFFF', '#FFE9A8', 'A parade behind you.');
  I('boostball', 'trail', 32, 'Camera Flashes', 'rare', '#FFFFFF', '#FFF6C8', 'Pop, pop, pop, like a crowd taking pictures.');
  I('boostball', 'goal', 23, 'Ticker Tape Parade', 'rare', '#FFFFFF', '#FFE9A8', 'White and gold paper pours over the goal while the crowd roars.');
  I('boostball', 'goal', 24, 'Treasure Chest', 'legendary', '#8A5A2B', '#FFD23F', 'A chest rises, opens and spills gold coins and gems.');
  I('boostball', 'goal', 25, 'Floodlights', 'epic', '#FFF6C8', '#3F8CFF', 'The stadium lights flash on, then stars burst in your team colour.');
  I('boostball', 'topper', 7, 'Soccer Ball', 'common', '#F6F6F6', '#14161F', 'A tiny football on your aerial.');
  I('boostball', 'topper', 8, 'Basketball', 'common', '#E8742A', '#2A1810', 'A tiny basketball on your aerial.');
  I('boostball', 'topper', 9, 'Baseball', 'common', '#F6F4EA', '#D8262F', 'A tiny baseball with red stitches.');
  I('boostball', 'topper', 10, 'Anchor', 'uncommon', '#5A6170', '#C8D2DC', 'A little steel anchor.');
  I('boostball', 'topper', 11, 'Robot Head', 'rare', '#B8BCCF', '#3FD2FF', 'A boxy robot with glowing eyes.');
  I('boostball', 'topper', 12, 'Parrot', 'epic', '#2ECC5A', '#D8262F', 'A pirate\'s parrot riding along.');
  I('boostball', 'hat', 7, 'Pirate Tricorn', 'epic', '#2A2440', '#E0B040', 'A three-cornered hat with gold trim and a red feather.');
  I('boostball', 'hat', 8, 'Fedora', 'rare', '#3A3550', '#15161C', 'A wide brim, a pinched crown and a black band.');
  I('boostball', 'hat', 9, 'Football Helmet', 'uncommon', '#3F8CFF', '#FFFFFF', 'In your accent colour, with a stripe and a face cage.');
  I('boostball', 'hat', 10, "Captain's Cap", 'uncommon', '#FFFFFF', '#15161C', 'A white sailor\'s cap with a black peak.');
  I('boostball', 'hat', 11, 'Robot Dome', 'rare', '#B8BCCF', '#3FD2FF', 'A steel dome with a visor and two antennas.');
  I('boostball', 'hat', 12, 'Ref Cap', 'common', '#14161F', '#F6F6F6', 'Black with white stripes.');
  I('boostball', 'wheels', 5, 'Black Chrome', 'rare', '#2A2C34', '#C8D2DC', 'Five spokes in dark, shiny chrome.');
  // third wave (Nov 2026): decals 39 to 62, trails 33 to 49, goal explosions 26 to 43, toppers 13 to 36
  I('boostball', 'decal', 39, 'Number Eight', 'common', '#FFFFFF', '#3F8CFF', 'A big jersey eight and striped sleeves in your accent colour.');
  I('boostball', 'decal', 40, 'Speed Slashes', 'common', '#FFFFFF', '#FF8A3D', 'Three slanted bars by the nose.');
  I('boostball', 'decal', 41, 'Baseball Stitches', 'common', '#F6F4EA', '#D8262F', 'Red stitched seams curving over the car.');
  I('boostball', 'decal', 42, 'Pitch Lines', 'uncommon', '#FFFFFF', '#2E8A4A', 'Mown stripes, a centre circle on the roof and both boxes.');
  I('boostball', 'decal', 43, 'Vintage Racer', 'rare', '#F4F1E6', '#14161F', 'A white number disc and a thin pinstripe, like an old race car.');
  I('boostball', 'decal', 44, 'Pinstriping', 'uncommon', '#FFFFFF', '#FFD23F', 'Thin hand-painted curls over the bonnet.');
  I('boostball', 'decal', 45, 'Low Poly', 'uncommon', '#8FB8FF', '#2E5FD9', 'Your paint broken into big flat facets.');
  I('boostball', 'decal', 46, 'Chevrons', 'common', '#FFFFFF', '#FF4FB4', 'Big arrowheads pointing the way.');
  I('boostball', 'decal', 47, 'Leopard Spots', 'rare', '#1B140E', '#E0A050', 'Broken dark rings, very fast cat.');
  I('boostball', 'decal', 48, 'Paw Prints', 'common', '#FFFFFF', '#8FA3B8', 'Someone walked all over your car.');
  I('boostball', 'decal', 49, 'Big Waves', 'rare', '#FFFFFF', '#5CC8FF', 'Rolling waves with curls of foam along the bottom.');
  I('boostball', 'decal', 50, 'Sunburst', 'uncommon', '#FFE45C', '#FF8A3D', 'Pale rays fanning out from the nose.');
  I('boostball', 'decal', 51, 'Treasure Map', 'epic', '#ECDCAA', '#B0302A', 'A scrap of old map on each door and a compass rose on the roof.');
  I('boostball', 'decal', 52, 'Eye Patch', 'rare', '#121318', '#FFFFFF', 'A black patch over one headlight. Arr.');
  I('boostball', 'decal', 53, 'Tracksuit and Chain', 'common', '#FFFFFF', '#E9B93A', 'Two white stripes a side and a gold chain over the nose.');
  I('boostball', 'decal', 54, 'Suit and Tie', 'uncommon', '#2F3140', '#F6F6F6', 'Dark lapels, a white shirt and a long tie in your accent colour.');
  I('boostball', 'decal', 55, 'Hazard Stripes', 'common', '#FFD21F', '#14161F', 'Yellow and black bands round the doors, the nose and the tail.');
  I('boostball', 'decal', 56, 'Barcode', 'common', '#F4F6FF', '#14161F', 'Scan before use.');
  I('boostball', 'decal', 57, 'Synthwave Sunset', 'epic', '#FF3FA4', '#FFE45C', 'A striped sun setting behind a glowing pink grid.');
  I('boostball', 'decal', 58, 'Polka Dots', 'common', '#FFFFFF', '#FF5C9A', 'White dots, evenly spaced.');
  I('boostball', 'decal', 59, 'Music Staff', 'uncommon', '#FFFFFF', '#B46CFF', 'Five lines and a run of notes along each side.');
  I('boostball', 'decal', 60, 'Paisley', 'rare', '#FF8A3D', '#FFFFFF', 'Curled teardrops and dots, like a bandana.');
  I('boostball', 'decal', 61, 'Golf Argyle', 'uncommon', '#3F8CFF', '#FFFFFF', 'Diamonds in two shades with thin crossing lines.');
  I('boostball', 'decal', 62, 'Title Belt', 'legendary', '#E9B93A', '#17151B', 'A black strap round the car with a big gold plate and gems.');
  I('boostball', 'trail', 33, 'Green Flame', 'common', '#46E39A', '#D8FF8A', 'Fire, but green.');
  I('boostball', 'trail', 34, 'Violet Flame', 'uncommon', '#B46CFF', '#FFB0F8', 'Flickering purple fire with white sparks.');
  I('boostball', 'trail', 35, 'Afterburner', 'rare', '#8FD6FF', '#FFFFFF', 'A tight blue-white jet with rings, like a fighter plane.');
  I('boostball', 'trail', 36, 'Sports Balls', 'epic', '#FFFFFF', '#E8742A', 'Footballs, basketballs and tennis balls bouncing out behind.');
  I('boostball', 'trail', 37, 'Cannon Smoke', 'uncommon', '#C8CCD6', '#FFA040', 'Grey puffs with a flash of fire, like a ship firing.');
  I('boostball', 'trail', 38, 'Gems', 'rare', '#FF5C9A', '#5CC8FF', 'Rubies, sapphires and emeralds spilling out.');
  I('boostball', 'trail', 39, 'Paw Prints', 'common', '#FFFFFF', '#FFF1E0', 'Little white paws hanging in the air behind you.');
  I('boostball', 'trail', 40, 'Paper Planes', 'uncommon', '#FFFFFF', '#C8D0DC', 'Folded planes gliding off the back.');
  I('boostball', 'trail', 41, 'Spare Parts', 'rare', '#C8D2DC', '#FFD23F', 'Gears and nuts rattling loose.');
  I('boostball', 'trail', 42, 'Pizza Slices', 'uncommon', '#FFD25A', '#C0392B', 'Lunch, launched.');
  I('boostball', 'trail', 43, 'Comet Tail', 'epic', '#FFF2C2', '#8FD6FF', 'A tight bright streak with stars falling out of it.');
  I('boostball', 'trail', 44, 'Cherry Blossoms', 'common', '#FFC2DD', '#FFFFFF', 'Pink petals drifting behind you.');
  I('boostball', 'trail', 45, 'Ghosts', 'rare', '#FFFFFF', '#E6F0FF', 'Small friendly ghosts floating away.');
  I('boostball', 'trail', 46, 'Pixel Fire', 'uncommon', '#FF8A1F', '#FFD23F', 'Fire made of square blocks.');
  I('boostball', 'trail', 47, 'Ice Shards', 'common', '#BFE4FF', '#FFFFFF', 'Splinters of ice skittering behind.');
  I('boostball', 'trail', 48, 'Hockey Pucks', 'common', '#1D2027', '#5A6070', 'Pucks sliding out across the floor.');
  I('boostball', 'trail', 49, 'Fire and Ice', 'legendary', '#FF8A1F', '#8FD6FF', 'An orange and a blue strand twisting round each other.');
  I('boostball', 'goal', 26, 'Giant Trophy', 'epic', '#FFC83A', '#C98A12', 'A gold cup rises out of the pitch and fires streamers in your colour.');
  I('boostball', 'goal', 27, 'Stadium Wave', 'legendary', '#FFFFFF', '#3F8CFF', 'Cards in your team colour leap up all round the stands in a wave.');
  I('boostball', 'goal', 28, 'Robot Salute', 'epic', '#B8BCCF', '#3FD2FF', 'Parts fly in, bolt together into a robot, it salutes and jets off.');
  I('boostball', 'goal', 29, 'Tidal Wave', 'legendary', '#2E7BFF', '#BFE9FF', 'A wall of water rolls out over half the pitch and crashes down.');
  I('boostball', 'goal', 30, 'Aurora', 'rare', '#46E39A', '#B46CFF', 'The ball melts into curtains of green and violet light.');
  I('boostball', 'goal', 31, 'Light Dragon', 'legendary', '#FFB347', '#FF5C6A', 'A dragon made of light loops out over the pitch and dives back in.');
  I('boostball', 'goal', 32, 'Disco Floor', 'legendary', '#FF3FA4', '#38E6FF', 'The pitch lights up in coloured tiles and pulses to a beat.');
  I('boostball', 'goal', 33, 'Piano Keys', 'rare', '#F4F4F0', '#17181D', 'A giant keyboard rises and the ball hops along it playing a tune.');
  I('boostball', 'goal', 34, 'Bubble Pop', 'common', '#BFE9FF', '#FFD9F5', 'A giant soap bubble swallows the ball and pops.');
  I('boostball', 'goal', 35, 'Balloon Release', 'common', '#FF5C5C', '#FFFFFF', 'A bunch of balloons in your colour floats out of the goal.');
  I('boostball', 'goal', 36, 'Paint Splash', 'common', '#3F8CFF', '#FFFFFF', 'Your team colour splatted over the net and the floor.');
  I('boostball', 'goal', 37, 'Thunderclap', 'common', '#DFF3FF', '#D8D2C4', 'A clap of air throws rings and dust along the floor.');
  I('boostball', 'goal', 38, 'Kraken', 'epic', '#8A2F6A', '#08262E', 'Tentacles rise from a dark pool, grab the ball and drag it under.');
  I('boostball', 'goal', 39, 'Rocket Launch', 'rare', '#F4F6FF', '#D8262F', 'Countdown, lift-off, and a burst of stars high above.');
  I('boostball', 'goal', 40, 'Red Carpet', 'rare', '#B3122A', '#E0B040', 'A red carpet unrolls and the ball rolls out to camera flashes.');
  I('boostball', 'goal', 41, 'Snow Globe', 'epic', '#CFE8FF', '#6B3E1E', 'A glass globe drops over the goal, gets a shake, and it snows.');
  I('boostball', 'goal', 42, 'Slam Dunk', 'uncommon', '#FF5A1F', '#FFFFFF', 'A hoop swings out and the ball drops through with a swish.');
  I('boostball', 'goal', 43, 'High Striker', 'uncommon', '#D8262F', '#FFC83A', 'The puck shoots up the tower and rings the bell.');
  I('boostball', 'topper', 13, 'Foam Finger', 'common', '#3F8CFF', '#FFFFFF', 'Number one, in your accent colour.');
  I('boostball', 'topper', 14, 'Trophy', 'epic', '#FFC83A', '#3A2A1A', 'A tiny gold cup with two handles.');
  I('boostball', 'topper', 15, 'Whistle', 'common', '#C8D2DC', '#D8262F', 'A referee\'s whistle on a red loop.');
  I('boostball', 'topper', 16, 'Tricorn', 'epic', '#2A2440', '#E0B040', 'A little pirate hat with three arched sides and gold trim.');
  I('boostball', 'topper', 17, 'Eye Patch Flag', 'rare', '#15161C', '#F2EAD0', 'A black flag with an eye patch on it. No skull.');
  I('boostball', 'topper', 18, 'Halo', 'rare', '#FFE680', '#FFFFFF', 'Floating just above. Innocent, honest.');
  I('boostball', 'topper', 19, 'Pizza Slice', 'uncommon', '#FFD25A', '#C0392B', 'Extra cheese, two pepperoni a side.');
  I('boostball', 'topper', 20, 'Flying Saucer', 'epic', '#B8C0CC', '#8FE6FF', 'A tiny saucer with a tiny green pilot.');
  I('boostball', 'topper', 21, 'Cactus', 'common', '#3E9A4A', '#C0643A', 'In a pot, with a pink flower.');
  I('boostball', 'topper', 22, 'Wizard Hat', 'rare', '#2A2A7A', '#FFE23F', 'Pointy, bent, with gold stars.');
  I('boostball', 'topper', 23, 'Smiley Ball', 'common', '#FFE23F', '#14161F', 'The classic happy aerial ball.');
  I('boostball', 'topper', 24, 'Racing Helmet', 'uncommon', '#3F8CFF', '#15171B', 'In your accent colour, with a dark visor.');
  I('boostball', 'topper', 25, 'Baseball Cap', 'common', '#3F8CFF', '#FFFFFF', 'A little cap in your accent colour.');
  I('boostball', 'topper', 26, 'Boxing Glove', 'uncommon', '#D8262F', '#FFFFFF', 'Red leather, white cuff.');
  I('boostball', 'topper', 27, 'Golf Ball', 'common', '#FFFFFF', '#E8C9A0', 'On a wooden tee.');
  I('boostball', 'topper', 28, 'Mini Fedora', 'uncommon', '#6B6F7C', '#15161C', 'Grey felt with a black band.');
  I('boostball', 'topper', 29, 'Mini Top Hat', 'uncommon', '#22232B', '#3F8CFF', 'Black silk with a band in your accent colour.');
  I('boostball', 'topper', 30, 'Mini Cone', 'common', '#FF7A1F', '#FFFFFF', 'A traffic cone, but tiny.');
  I('boostball', 'topper', 31, 'Propeller Cap', 'uncommon', '#D93636', '#FFD23F', 'Four colours and a propeller that does not spin you anywhere.');
  I('boostball', 'topper', 32, 'Little Chef Hat', 'common', '#FFFFFF', '#E6E8EE', 'Puffed up and spotless.');
  I('boostball', 'topper', 33, 'Royal Crown', 'legendary', '#FFC83A', '#8A1030', 'Gold points, red velvet and a gem of every colour.');
  I('boostball', 'topper', 34, 'American Football', 'common', '#8A4A22', '#FFFFFF', 'A tiny ball with white laces.');
  I('boostball', 'topper', 35, 'Bowling Pin', 'common', '#FFFFFF', '#D8262F', 'Still standing.');
  I('boostball', 'topper', 36, 'Satellite Dish', 'rare', '#E6E9EF', '#D8262F', 'Picks up every match on the planet.');
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
  I('slipstream', 'livery', 3, 'Matte Black with Neon', 'uncommon', '#15171B', '#39FF88', 'A black car with glowing lines in the team colour.');
  I('slipstream', 'livery', 4, 'Chrome', 'epic', '#DDE6F0', '#6B7785', 'A mirror with wheels. Mind the sun.');
  I('slipstream', 'livery', 5, 'Carbon', 'uncommon', '#22262C', '#6B7785', 'Bare weave, no paint, a little lighter in spirit.');
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
  I('slipstream', 'helmet', 12, 'Chrome Visor', 'uncommon', '#F4F6F8', '#FF86C0', 'A mirror visor nobody can see through.');
  I('slipstream', 'helmet', 13, 'Shark helmet', 'uncommon', '#7D93A8', '#7A1420', 'Teeth at the front, fin on top in spirit.');
  I('slipstream', 'helmet', 14, 'Skull helmet', 'uncommon', '#EFE9DA', '#15161A', 'A friendly cartoon skull.');
  I('slipstream', 'helmet', 15, 'Tiger helmet', 'uncommon', '#FF8A1F', '#1B1612', 'Orange with black stripes.');
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
  I('slipstream', 'effect', 3, 'Sparks', 'uncommon', '#FFF0B0', '#FFA020', 'A shower of sparks from under the floor.');
  I('slipstream', 'effect', 4, 'Electric Arcs', 'uncommon', '#D8F6FF', '#2A8BFF', 'Blue crackles around the rear wing.');
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
  I('slipstream', 'podium', 2, 'Fireworks Podium', 'uncommon', '#FFD21F', '#B06BFF', 'Fireworks over the results when you finish in the top three.');
  // second wave (Nov 2026): more made-up sponsors, sports, pirate, suit and robot liveries and helmets, three boost effects, two podiums.
  // Liveries 24 to 35 are designs; 36 on are the new sponsors' liveries (8 + 20 + the sponsor's number), earned like the first fifteen.
  I('slipstream', 'sponsor', 16, "Polly's Crackers", 'common', '#16614F', '#FFE36B', 'A parrot recommends them. Repeatedly.');
  I('slipstream', 'sponsor', 17, 'Fancy Pants Dry Cleaning', 'common', '#16171D', '#F4F4F4', 'Your race suit, pressed with a crease.');
  I('slipstream', 'sponsor', 18, 'Dust Bunny Robot Vacuums', 'common', '#E9EDF3', '#34456B', 'Cleans the pit lane while you sleep.');
  I('slipstream', 'sponsor', 19, 'Foam Finger Sports Drinks', 'common', '#FF3B6B', '#FFFFFF', 'Number one in the stands, number one in the bottle.');
  I('slipstream', 'livery', 24, 'Home Jersey', 'common', '#2A6BFF', '#FFFFFF', 'Wide hoops in your team colours, like a match-day shirt.');
  I('slipstream', 'livery', 25, 'Varsity', 'uncommon', '#7A1F3D', '#FFFFFF', 'A letter-jacket stripe and a big star.');
  I('slipstream', 'livery', 26, 'Courtside', 'common', '#E8742A', '#1E1410', 'Orange with the seams of a basketball.');
  I('slipstream', 'livery', 27, 'Pitch', 'common', '#3AA64A', '#F4FFF4', 'Mowed stripes and white lines. Kick-off at the nose.');
  I('slipstream', 'livery', 28, 'Ice Rink', 'uncommon', '#EEF6FB', '#D8262F', 'Fresh ice, red and blue lines, boards in your team colour.');
  I('slipstream', 'livery', 29, 'Centre Court', 'common', '#D6EC3A', '#FFFFFF', 'Fuzzy tennis-ball yellow with a white seam.');
  I('slipstream', 'livery', 30, 'Black Sails', 'epic', '#1D1F27', '#C89A3C', 'Black sailcloth, gold rope trim and two crossed oars.');
  I('slipstream', 'livery', 31, "Ship's Hull", 'rare', '#8A5A2B', '#D9A441', 'Wooden planks, brass portholes and an anchor.');
  I('slipstream', 'livery', 32, 'Pinstripe Suit', 'rare', '#2A2C38', '#8C90A4', 'Charcoal with chalk stripes and a pocket square.');
  I('slipstream', 'livery', 33, 'Tuxedo', 'epic', '#15161C', '#F6F6F6', 'Black tie, white shirt, and the bow tie in your team colour.');
  I('slipstream', 'livery', 34, 'Circuit Board', 'rare', '#0F5A3A', '#E0B54A', 'Gold traces, little chips and blinking lights.');
  I('slipstream', 'livery', 35, 'Robot Plating', 'uncommon', '#C9CED8', '#3FD2FF', 'Riveted steel panels and a glowing visor line.');
  gameItems('slipstream', 'sponsor').forEach(function (sp) { if (sp.no > 15) I('slipstream', 'livery', 20 + sp.no, sp.name + ' livery', 'epic', sp.c1, sp.c2, 'The whole car in ' + sp.name + ' colours. Earned by finishing its challenges.'); });
  I('slipstream', 'helmet', 24, 'Eye Patch helmet', 'rare', '#3D5FB0', '#101216', 'A pirate patch over one side of the visor.');
  I('slipstream', 'helmet', 25, 'Bandana helmet', 'uncommon', '#D8262F', '#FFFFFF', 'Red with white spots, knotted at the back.');
  I('slipstream', 'helmet', 26, 'Gridiron helmet', 'common', '#1F4FBF', '#FFD21F', 'A centre stripe and a face cage.');
  I('slipstream', 'helmet', 27, 'Baseball helmet', 'common', '#F4F2EA', '#D8262F', 'White with red stitches.');
  I('slipstream', 'helmet', 28, 'Football helmet', 'common', '#F6F6F6', '#17191E', 'Black patches on white.');
  I('slipstream', 'helmet', 29, 'Pinstripe helmet', 'uncommon', '#2A2C38', '#D9A441', 'Chalk stripes and a hatband.');
  I('slipstream', 'helmet', 30, 'Robot helmet', 'rare', '#C9CED8', '#3FD2FF', 'Rivets, steel and two glowing eyes.');
  I('slipstream', 'effect', 9, 'Coin Shower', 'legendary', '#FFC93C', '#FFF0A0', 'Gold coins spill out of the back when you boost.');
  I('slipstream', 'effect', 10, 'Sea Spray', 'uncommon', '#DFF6FF', '#2A8BFF', 'Spray off the rear tyres, like a speedboat.');
  I('slipstream', 'effect', 11, 'Data Stream', 'epic', '#18C060', '#B0FFD0', 'Lines of green light left hanging behind you.');
  I('slipstream', 'podium', 3, 'Ticker Tape Podium', 'common', '#FFFFFF', '#FFD21F', 'Ticker tape over the results when you finish in the top three.');
  I('slipstream', 'podium', 4, 'Balloons Podium', 'rare', '#FF2A36', '#3FD2FF', 'Balloons float up over the results when you finish in the top three.');
  // ---- Coil items ----
  // Coil: colours, patterns (one pattern at a time from animals, designs and object snakes), heads, a trail and death bursts,
  // drawn by coil/wardrobe.js by slot and number. Captains wear them free in the game's Wardrobe; none is sold yet.
  I('coil', 'color', 1, 'Cherry', 'common', '#FF4D5E', '#FF4D5E', 'A bright cherry red.');
  I('coil', 'color', 2, 'Tangerine', 'common', '#FF8C2E', '#FF8C2E', 'Orange, like the fruit.');
  I('coil', 'color', 3, 'Lemon', 'common', '#FFE14D', '#FFE14D', 'Sunny yellow from nose to tail.');
  I('coil', 'color', 4, 'Grass', 'common', '#5FD65A', '#5FD65A', 'Fresh green.');
  I('coil', 'color', 5, 'Aqua', 'common', '#3FE0D0', '#3FE0D0', 'Swimming-pool blue-green.');
  I('coil', 'color', 6, 'Ocean', 'common', '#3F8CFF', '#3F8CFF', 'Deep, friendly blue.');
  I('coil', 'color', 7, 'Violet', 'common', '#9A6BFF', '#9A6BFF', 'A soft purple.');
  I('coil', 'color', 8, 'Bubblegum', 'common', '#FF7CC8', '#FF7CC8', 'Pink and a little bit chewy.');
  I('coil', 'color', 9, 'Snow', 'common', '#EEF4FF', '#EEF4FF', 'Almost white, with a cool tint.');
  I('coil', 'color', 10, 'Cocoa', 'common', '#C48452', '#C48452', 'Warm milk-chocolate brown.');
  I('coil', 'color', 11, 'Gold', 'uncommon', '#FFC531', '#FFC531', 'Shiny and rich-looking.');
  I('coil', 'color', 12, 'Slate', 'common', '#9AA8C4', '#9AA8C4', 'A calm blue-grey.');
  I('coil', 'color', 13, 'Neon Green', 'uncommon', '#39FF6A', '#B8FFC8', 'Glows green, with a bright edge.');
  I('coil', 'color', 14, 'Neon Pink', 'uncommon', '#FF3FD2', '#FFB8F0', 'Glows hot pink.');
  I('coil', 'color', 15, 'Neon Blue', 'uncommon', '#2FD8FF', '#B8F2FF', 'Glows electric blue.');
  I('coil', 'color', 16, 'Neon Orange', 'uncommon', '#FF7A1A', '#FFC89A', 'Glows like a traffic cone at night.');
  I('coil', 'color', 17, 'Neon Yellow', 'uncommon', '#F4FF3A', '#FBFFB8', 'Glows highlighter yellow.');
  I('coil', 'color', 18, 'Sunrise', 'rare', '#FFD84A', '#FF4D6D', 'Yellow at the head fading to pink at the tail.');
  I('coil', 'color', 19, 'Deep Sea', 'rare', '#3FE6FF', '#4450E8', 'Shallow blue at the head, deep blue at the tail.');
  I('coil', 'color', 20, 'Mint Grape', 'rare', '#3FF0B6', '#9B5BFF', 'Mint fading into grape.');
  I('coil', 'color', 21, 'Fireball', 'rare', '#FFE14D', '#E8281E', 'Yellow-hot at the head, red at the tail.');
  I('coil', 'color', 22, 'Cotton Candy', 'rare', '#FF9AD5', '#8FD8FF', 'Pink fading to sky blue.');
  I('coil', 'color', 23, 'Forest', 'rare', '#C6F04A', '#1F9A5E', 'Lime at the head, pine at the tail.');
  I('coil', 'color', 24, 'Rainbow', 'epic', '#FF5F5F', '#5FC8FF', 'Every colour in bands down the body.');
  I('coil', 'color', 25, 'Rainbow Flow', 'epic', '#FFE45F', '#A77BFF', 'A rainbow that keeps flowing down to the tail.');
  I('coil', 'animal', 1, 'Python', 'uncommon', '#D9B97A', '#7D5130', 'Tan with brown saddles down the back.');
  I('coil', 'animal', 2, 'Rattlesnake', 'uncommon', '#C7AE82', '#5A3D24', 'A chain of diamonds, and a rattle at the end.');
  I('coil', 'animal', 3, 'Coral Snake', 'uncommon', '#E8382F', '#FFD93A', 'Red, yellow and black bands.');
  I('coil', 'animal', 4, 'Tiger', 'uncommon', '#FF8A1F', '#231A14', 'Orange with bold black stripes.');
  I('coil', 'animal', 5, 'Zebra', 'rare', '#F6F4EE', '#1C1C24', 'Black and white chevrons.');
  I('coil', 'animal', 6, 'Leopard', 'rare', '#E8B04A', '#3A2614', 'Gold with dark rosettes.');
  I('coil', 'animal', 7, 'Cow', 'common', '#F7F7F3', '#22222A', 'White with black patches. Moo.');
  I('coil', 'animal', 8, 'Bee', 'rare', '#FFD23F', '#2D2433', 'Fuzzy stripes and two tiny wings.');
  I('coil', 'animal', 9, 'Caterpillar', 'epic', '#9BE04A', '#FFE14A', 'Round green segments and lots of little feet.');
  I('coil', 'animal', 10, 'Centipede', 'epic', '#C85A34', '#FFB36B', 'Plates down the back and a pair of legs on every one.');
  I('coil', 'animal', 11, 'Dragon', 'legendary', '#33B46C', '#FFB02E', 'Green scales and gold spines.');
  I('coil', 'design', 1, 'Stripes', 'common', '#3FF0B6', '#FFFFFF', 'Your colour with white bands.');
  I('coil', 'design', 2, 'Candy Cane', 'uncommon', '#E8283C', '#FFF4F4', 'Red twisting round white.');
  I('coil', 'design', 3, 'Barber Pole', 'uncommon', '#E02A36', '#2A56D8', 'Red and blue spiralling round white.');
  I('coil', 'design', 4, 'Checker', 'common', '#3FF0B6', '#1A1D2E', 'Your colour in squares, four across.');
  I('coil', 'design', 5, 'Polka Dots', 'common', '#FF7CC8', '#FFFFFF', 'Your colour with white dots.');
  I('coil', 'design', 6, 'Zigzag', 'common', '#3F8CFF', '#FFFFFF', 'A bright zigzag down the middle.');
  I('coil', 'design', 7, 'Galaxy', 'epic', '#4B2AA0', '#FF6EDC', 'Deep space, nebula glow and twinkling stars.');
  I('coil', 'design', 8, 'Lava', 'epic', '#CC3A18', '#FFD04A', 'Dark rock, glowing cracks, flowing heat.');
  I('coil', 'design', 9, 'Ice', 'rare', '#BFE9FF', '#FFFFFF', 'Pale blue with cracks and frost.');
  I('coil', 'design', 10, 'Circuit Board', 'epic', '#1D8A4E', '#FFD04A', 'Gold traces, pads and little chips.');
  I('coil', 'design', 11, 'Pixel', 'rare', '#3FF0B6', '#2A8A6A', 'Your colour in chunky square pixels.');
  I('coil', 'design', 12, 'Camo', 'common', '#6F7D3C', '#3F5228', 'Greens and browns in soft patches.');
  I('coil', 'object', 1, 'Train Cars', 'epic', '#FF4D5E', '#FFF2B0', 'Cars in your colour with lit windows. The head is the engine.');
  I('coil', 'object', 2, 'Sausage Links', 'uncommon', '#C2552E', '#FF9A6A', 'Plump sausages twisted together.');
  I('coil', 'object', 3, 'Spaghetti Noodle', 'uncommon', '#F2CF74', '#D6342A', 'One very long noodle, a little saucy.');
  I('coil', 'object', 4, 'Gummy Worm', 'epic', '#FF3F5F', '#5FE05A', 'Red to orange to green jelly, sugar on top.');
  I('coil', 'object', 5, 'Licorice', 'uncommon', '#D41E2C', '#8A0F1A', 'A twisted red licorice rope.');
  I('coil', 'object', 6, 'Garden Hose', 'uncommon', '#2FA84A', '#FFE14A', 'Green, a yellow stripe, brass couplings and a nozzle.');
  I('coil', 'object', 7, 'Rope', 'common', '#C9A46A', '#7D5F34', 'Tan strands twisted together.');
  I('coil', 'object', 8, 'Chain', 'rare', '#C4CCD8', '#3D4452', 'Steel links, one flat and the next on its edge.');
  I('coil', 'object', 9, 'Measuring Tape', 'rare', '#FFD23F', '#1F1F26', 'Tick marks, numbers and a metal hook.');
  I('coil', 'object', 10, 'Pencil', 'epic', '#FFD23F', '#FF8FA8', 'Sharpened at the head, eraser at the tail.');
  I('coil', 'object', 11, 'Twinkling Lights', 'legendary', '#2E7D46', '#FFD84A', 'A string of bulbs in five colours that twinkle.');
  I('coil', 'object', 12, 'Bead Necklace', 'rare', '#FF7AA8', '#7FE3FF', 'Round shiny beads in six colours.');
  I('coil', 'object', 13, 'Piano Keys', 'epic', '#F7F7F2', '#1D1D26', 'White keys and black keys, in the right pattern.');
  I('coil', 'object', 14, 'Film Strip', 'epic', '#26262F', '#8FD3FF', 'Frames with little pictures between the sprocket holes.');
  I('coil', 'object', 15, 'Dominoes', 'epic', '#F6F1E2', '#1D1D26', 'Ivory dominoes end to end, each with its own pips.');
  I('coil', 'object', 16, 'Scarf', 'rare', '#FF4D5E', '#FFF3D6', 'Knitted stripes in your colour, with a fringe.');
  I('coil', 'object', 17, 'Skeleton Spine', 'legendary', '#F1EAD6', '#4A4F7A', 'Bone vertebrae and ribs. Spooky, but friendly.');
  I('coil', 'head', 1, 'Sunglasses', 'uncommon', '#14182A', '#FF5FA2', 'Dark lenses in pink frames.');
  I('coil', 'head', 2, 'Crown', 'epic', '#FFCF3A', '#C2283C', 'Gold points, red velvet and three jewels.');
  I('coil', 'head', 3, 'Party Hat', 'uncommon', '#FF5FA2', '#FFD84A', 'A striped cone with a pompom on top.');
  I('coil', 'head', 4, 'Googly Eyes', 'rare', '#FFFFFF', '#10131F', 'Big eyes that wobble round every turn.');
  I('coil', 'head', 5, 'Tongue Out', 'common', '#FF5F7E', '#FFFFFF', 'The tongue stays out and wiggles.');
  I('coil', 'head', 6, 'Tiny Cowboy Hat', 'rare', '#9A6634', '#2E1C10', 'Wide brim, creased crown, very small.');
  I('coil', 'trail', 1, 'Sparkle Trail', 'epic', '#FFE27A', '#8FE8FF', 'Stars and sparkles drift off the tail.');
  I('coil', 'burst', 1, 'Candy Burst', 'epic', '#FF5FA2', '#3FF0B6', 'Crash into a shower of wrapped sweets.');
  I('coil', 'burst', 2, 'Coin Burst', 'legendary', '#FFCF3A', '#A8740A', 'Crash into a shower of spinning gold coins.');
  // second wave (Nov 2026): sports, pirates, suits and robots
  I('coil', 'color', 26, 'Jersey Blue', 'common', '#1F5FD6', '#1F5FD6', 'A strong team blue.');
  I('coil', 'color', 27, 'Turf Green', 'common', '#2F9E44', '#2F9E44', 'The green of a freshly cut pitch.');
  I('coil', 'color', 28, 'Varsity Red', 'common', '#C8344E', '#C8344E', 'A deep letter-jacket red.');
  I('coil', 'color', 29, 'Gold Chain', 'rare', '#FFE27A', '#B8860B', 'Bright gold at the head, old gold at the tail.');
  I('coil', 'design', 13, 'Tennis Ball', 'common', '#D6EC3A', '#FFFFFF', 'Fuzzy yellow with a white seam winding along.');
  I('coil', 'design', 14, 'Jersey Stripes', 'common', '#3F8CFF', '#FFFFFF', 'Your colour with two white stripes down the length.');
  I('coil', 'design', 15, 'Racing Checker', 'uncommon', '#F4F4F4', '#1B1D26', 'The chequered flag, three squares across.');
  I('coil', 'design', 16, 'Medal Ribbon', 'rare', '#D8262F', '#FFCF3A', 'A striped ribbon with a gold medal on the tail.');
  I('coil', 'design', 17, 'Pinstripe', 'uncommon', '#2F3140', '#B4B8CC', 'Charcoal suit cloth with chalk stripes.');
  I('coil', 'design', 18, 'Necktie', 'uncommon', '#22305E', '#FF4D5E', 'Navy with diagonal stripes in your colour.');
  I('coil', 'design', 19, 'LED Strip', 'epic', '#1C2030', '#3FD2FF', 'Lights in your colour chasing down a dark strip.');
  I('coil', 'design', 20, 'Basketball', 'common', '#E8742A', '#2A1810', 'Orange with black seams.');
  I('coil', 'design', 21, 'Football', 'common', '#F6F6F6', '#1D1D26', 'White with black patches.');
  I('coil', 'object', 18, 'Tennis Balls', 'uncommon', '#D6EC3A', '#FFFFFF', 'A chain of fuzzy tennis balls.');
  I('coil', 'object', 19, 'Rope and Anchors', 'rare', '#C9A46A', '#4A505E', 'A ship\'s rope with a steel anchor every so often.');
  I('coil', 'object', 20, 'Robot Segments', 'rare', '#B8BCCF', '#3FD2FF', 'Riveted steel plates with joints and little screens.');
  I('coil', 'object', 21, 'Cable', 'common', '#2A2D36', '#FF4D5E', 'A braided cable with a plug on the tail.');
  I('coil', 'object', 22, 'Gold Chain', 'legendary', '#FFCF3A', '#7A5606', 'Heavy gold links, flat then on edge.');
  I('coil', 'head', 7, 'Eye Patch', 'uncommon', '#15161C', '#FFFFFF', 'A pirate patch over one eye.');
  I('coil', 'head', 8, 'Tricorn', 'epic', '#2A2440', '#E0B040', 'A three-cornered captain\'s hat with gold trim and a red feather.');
  I('coil', 'head', 9, 'Fedora', 'rare', '#4A4560', '#15161C', 'A wide brim, a pinched crown and a black band.');
  I('coil', 'head', 10, 'Bandana', 'common', '#D8262F', '#FFFFFF', 'Red with white spots, knotted at the back.');
  I('coil', 'head', 11, 'Sweatband', 'common', '#F4F6FA', '#3F8CFF', 'Ready for the fifth set.');
  I('coil', 'head', 12, 'Bow Tie', 'uncommon', '#D8262F', '#8A1018', 'A red bow tie at the neck.');
  I('coil', 'head', 13, 'Robot Visor', 'epic', '#1C2030', '#3FD2FF', 'A glowing visor across both eyes, and an antenna.');
  // ---- Updraft items ----
  // Drawn by updraft/gear.js (by slot and number; 0 there is the climber as before). Captains only for now and nothing is
  // sold: the game's Gear screen lets them wear everything, except the height rewards, which carry give 'earned' and come
  // from the player's own best height (1,000 m, 2,200 m where Orbit Yard and space start, and 3,000 m, the Crown).
  I('updraft', 'skin', 1, 'Jungle Explorer', 'common', '#6B4428', '#C8B48A', 'Fedora, leather jacket and a satchel for the long way up.');
  I('updraft', 'skin', 2, 'Mountaineer', 'common', '#E0402F', '#2A7FD1', 'A puffy jacket, a bobble hat, goggles and a coil of rope.');
  I('updraft', 'skin', 3, 'Arctic Explorer', 'common', '#2F7FB8', '#F3EFE6', 'A parka with a fur-trimmed hood and big mittens.');
  I('updraft', 'skin', 4, 'Safari Guide', 'common', '#C9B07A', '#EFE6CC', 'Pith helmet, khaki pockets, binoculars and knee socks.');
  I('updraft', 'skin', 5, 'Deep-Sea Diver', 'uncommon', '#C9923A', '#2D4A5E', 'A brass helmet with portholes and lead boots. Not waterproof up here.');
  I('updraft', 'skin', 6, 'Aviator', 'uncommon', '#7A4A2A', '#F6F2EA', 'Leather flying cap, goggles and a long white scarf.');
  I('updraft', 'skin', 7, 'Cave Explorer', 'common', '#E8742A', '#F4C430', 'A hard hat with a headlamp, orange overalls and a harness.');
  I('updraft', 'skin', 8, 'Treasure Hunter', 'uncommon', '#C8302E', '#EFE0B0', 'A red bandana, a vest and a map with an X on it.');
  I('updraft', 'skin', 9, 'Dusty Archaeologist', 'common', '#E2D3B0', '#7A6A4E', 'Bucket hat, round glasses, a tool belt and a brush for the dust.');
  I('updraft', 'skin', 10, 'Storm Chaser', 'uncommon', '#F2C81F', '#2A7A3A', 'A yellow slicker with the hood up, wellies and a wind gauge.');
  I('updraft', 'skin', 11, 'Balloonist', 'uncommon', '#E8452F', '#FFD23F', 'A striped jacket, sandbags and a very small balloon for a hat.');
  I('updraft', 'skin', 12, 'Old-Timey Explorer', 'epic', '#8A6A4A', '#E0B040', 'Bowler hat, monocle, moustache and a walking cane.');
  I('updraft', 'skin', 13, 'Pirate', 'epic', '#A8232A', '#1D1F24', 'A three-cornered hat, an eye patch, a red coat and a spyglass.');
  I('updraft', 'skin', 14, 'Park Ranger', 'common', '#9AA47A', '#A07A4A', 'A ranger hat with a pinched top, a badge and a radio.');
  I('updraft', 'skin', 15, 'Astronaut', 'epic', '#F2F2EE', '#D8A62E', 'A white suit, a gold visor and a life support pack.');
  I('updraft', 'skin', 16, 'Tourist', 'rare', '#2FB8A8', '#FFD23F', 'Flowery shirt, a camera, sunglasses, and socks with sandals.');
  I('updraft', 'skin', 17, 'Pizza Delivery', 'rare', '#D8302A', '#FFCF5A', 'A red cap and an insulated pizza bag. Thirty minutes or less.');
  I('updraft', 'skin', 18, 'Window Washer', 'rare', '#2F6FB8', '#F2C81F', 'Overalls, a harness, a squeegee and a bucket.');
  I('updraft', 'skin', 19, 'Grandma', 'epic', '#A98BD6', '#C8CCD2', 'A bun, pearls, a cardigan, and her trusty walker.');
  I('updraft', 'skin', 20, 'Knight', 'epic', '#C8CCD4', '#2A55C8', 'A great helm with a plume, armour and a blue tabard.');
  I('updraft', 'skin', 21, 'Ninja', 'rare', '#2C2F45', '#E0342F', 'A dark suit, a red headband and a red sash.');
  I('updraft', 'skin', 22, 'Chicken Suit', 'legendary', '#F6F2E6', '#E0342F', 'The whole chicken: comb, beak, wings and orange feet.');
  I('updraft', 'pack', 1, 'Parachute Pack', 'common', '#5A6A3A', '#E8452F', 'A parachute pack with a harness and a red ripcord. Purely for show.');
  I('updraft', 'pack', 2, 'Teddy Bear', 'uncommon', '#A8743A', '#E0B888', 'A teddy bear hanging on for the climb.');
  I('updraft', 'pack', 3, 'Picnic Basket', 'common', '#C8995A', '#E8452F', 'A wicker picnic basket with a checked cloth peeking out.');
  I('updraft', 'pack', 4, 'Giant Sandwich', 'rare', '#D89A4A', '#5AB83A', 'Bread, lettuce, tomato, cheese, ham, and a pick with an olive.');
  I('updraft', 'pack', 5, 'Fake Jetpack', 'epic', '#C8CCD4', '#FF9A2A', 'Two cans and painted cardboard flames. It does not fly.');
  I('updraft', 'pack', 6, 'Rolled-Up Tent', 'common', '#3A8A4A', '#8A6A3A', 'A rolled-up tent, its poles and a bag.');
  I('updraft', 'reward', 1, '1,000 m Badge', 'uncommon', '#E8B830', '#2F7FD6', 'A gold medal for reaching the old summit, 1,000 m up.');
  I('updraft', 'reward', 2, 'Space Helmet', 'epic', '#CFEAFF', '#FF5A5A', 'A glass bubble helmet for reaching Orbit Yard at 2,200 m, where space starts.');
  I('updraft', 'reward', 3, 'Golden Crown', 'legendary', '#F2C443', '#FF4D6A', 'A golden crown for finishing the climb: the Crown at 3,000 m.');
  I('updraft', 'scream', 1, 'Aaaah!', 'common', '#FFB347', '#F4F6FB', 'A long, falling "Aaaah!" when you drop a long way.');
  I('updraft', 'scream', 2, 'Yodel', 'uncommon', '#5BE0A8', '#F4F6FB', 'Yo-de-lay-ee-oo, all the way down.');
  I('updraft', 'scream', 3, 'Slide Whistle', 'common', '#5EC2FF', '#F4F6FB', 'A cartoon slide whistle, high to low.');
  I('updraft', 'scream', 4, 'Opera Note', 'epic', '#A98BFF', '#F4F6FB', 'One grand, wobbling high note.');
  I('updraft', 'scream', 5, 'Wheee!', 'common', '#FF5D8F', '#F4F6FB', 'A happy "Wheee!" that rises as you drop.');
  I('updraft', 'trail', 1, 'Rainbow Streamer', 'uncommon', '#FF4D4D', '#4DB8FF', 'Every colour, streaming out above you as you plummet.');
  I('updraft', 'trail', 2, 'Comet Tail', 'rare', '#FFFFFF', '#3A4AFF', 'A white-hot tail that cools to blue.');
  I('updraft', 'trail', 3, 'Smoke Trail', 'common', '#F2F2F2', '#9AA0A8', 'A puffy grey smoke trail that spreads out.');
  I('updraft', 'trail', 4, 'Gold Sparkles', 'epic', '#FFD23F', '#FFF8D0', 'A ribbon of twinkling gold.');
  GAME_ITEMS.forEach(function (it) { if (it.game === 'updraft' && it.slot === 'reward') it.give = 'earned'; });
  // ---- Rumble Karts items ----
  // Rumble Karts: the Garage's drivers, karts, wheels, horns and wreck effects (rumble-karts/garage.js draws them by these numbers; each driver has its own knockout taunt).
  I('rumble-karts', 'driver', 1, 'Sir Honksalot', 'epic', '#FFFFFF', '#C9CBD8', 'A goose in knight armour. Taunt: a proud HONK.');
  I('rumble-karts', 'driver', 2, 'Captain Crumb', 'uncommon', '#F0C27A', '#B5763A', 'A slice of pirate toast with an eye patch.');
  I('rumble-karts', 'driver', 3, 'Granny Vroom', 'uncommon', '#E8E6F0', '#8A6AD0', 'Cardigan, pearls and no patience for slowcoaches.');
  I('rumble-karts', 'driver', 4, 'Bolt', 'common', '#B8BCCF', '#5EE8FF', 'A boxy robot that dances in right angles.');
  I('rumble-karts', 'driver', 5, 'Wasabi', 'uncommon', '#5CCF5A', '#4A4563', 'A ninja frog who flips after every knockout.');
  I('rumble-karts', 'driver', 6, 'Professor Pickle', 'common', '#6DBB3C', '#F6F4FF', 'A very clever pickle in a lab coat.');
  I('rumble-karts', 'driver', 7, 'DJ Raccoon', 'epic', '#9A96A8', '#A66BFF', 'Headphones on, tail up, always on the beat.');
  I('rumble-karts', 'driver', 8, 'Chef Meatball', 'common', '#8A4A2B', '#FFFFFF', 'A meatball in a tall chef hat.');
  I('rumble-karts', 'driver', 9, 'Yeti Betty', 'uncommon', '#F2F4FF', '#9FB6D8', 'Fluffy, friendly and very hard to cool down.');
  I('rumble-karts', 'driver', 10, 'Count Dracoola', 'epic', '#3A3550', '#D8392B', 'A vampire in sunglasses and a big collared cape.');
  I('rumble-karts', 'driver', 11, 'Tiny Rex', 'legendary', '#4FBF6A', '#FFC93C', 'A T. rex on two cushions who can barely reach the wheel.');
  I('rumble-karts', 'driver', 12, 'Sergeant Sprinkles', 'rare', '#FF8FC0', '#E0A35A', 'A donut on patrol, cap and badge included.');
  I('rumble-karts', 'driver', 13, 'Moolissa', 'common', '#F6F4FF', '#3A3550', 'A cow with a flower and a cow bell.');
  I('rumble-karts', 'driver', 14, 'Astro Hamster', 'epic', '#F2A65A', '#D6ECFF', 'A hamster in a spacesuit and bubble helmet.');
  I('rumble-karts', 'driver', 15, 'Cactus Jack', 'rare', '#3FA35A', '#A4733D', 'A cactus in a cowboy hat. Do not hug.');
  I('rumble-karts', 'driver', 16, 'Waddles', 'rare', '#3A3552', '#FFFFFF', 'A penguin in a top hat and monocle.');
  I('rumble-karts', 'driver', 17, 'Turkey Tom', 'common', '#8A5A2B', '#FFC93C', 'A turkey with a fanned-out tail.');
  I('rumble-karts', 'kart', 1, 'Bathtub', 'uncommon', '#F6F4FF', '#BFE8FF', 'A tub full of bubbles, with a tap at the front.');
  I('rumble-karts', 'kart', 2, 'Shopping Cart', 'common', '#D4D8E6', '#FF4D6D', 'Wire basket, plastic handle, one wobbly ride.');
  I('rumble-karts', 'kart', 3, 'Lawnmower', 'common', '#5CCF5A', '#4A4563', 'A ride-on mower with a grass bag.');
  I('rumble-karts', 'kart', 4, 'Hot Dog Cart', 'uncommon', '#C8553D', '#FFD23F', 'A hot dog stand with a striped umbrella.');
  I('rumble-karts', 'kart', 5, 'Bumper Car', 'common', '#FF4D6D', '#3A3550', 'A fairground bumper car with its pole.');
  I('rumble-karts', 'kart', 6, 'Giant Shoe', 'uncommon', '#3FB8FF', '#FFFFFF', 'One very big sneaker.');
  I('rumble-karts', 'kart', 7, 'Banana', 'epic', '#FFD84A', '#6B4423', 'A banana with a saddle and handlebars.');
  I('rumble-karts', 'kart', 8, 'Rubber Duck', 'epic', '#FFD23F', '#F4A41C', 'A giant bath duck in a sailor cap.');
  I('rumble-karts', 'kart', 9, 'Couch', 'rare', '#A66BFF', '#FFC93C', 'The comfiest seat in the arena.');
  I('rumble-karts', 'kart', 10, 'Bed', 'rare', '#A4733D', '#FFFFFF', 'Headboard, pillow, blanket and a teddy.');
  I('rumble-karts', 'kart', 11, 'Toilet', 'rare', '#F6F4FF', '#D4D8E6', 'A spotless porcelain throne.');
  I('rumble-karts', 'kart', 12, 'Pumpkin Carriage', 'legendary', '#FF8A1F', '#FFC93C', 'A pumpkin with golden doors.');
  I('rumble-karts', 'kart', 13, 'Ice Cream Truck', 'epic', '#FFFFFF', '#FF9FC0', 'With a giant cone on the roof.');
  I('rumble-karts', 'kart', 14, 'Rocket Sled', 'legendary', '#C8874A', '#FF6A2B', 'A wooden sled with a rocket strapped on.');
  I('rumble-karts', 'kart', 15, 'Cardboard Box', 'common', '#C8955A', '#E8C48A', 'Flaps open, racing stripes drawn on in marker.');
  I('rumble-karts', 'wheels', 1, 'Chrome Spokes', 'common', '#D4D8E6', '#23202E', 'Shiny rims with thin spokes.');
  I('rumble-karts', 'wheels', 2, 'Monster Treads', 'uncommon', '#2A2638', '#FFC93C', 'Chunky knobbly tyres.');
  I('rumble-karts', 'wheels', 3, 'Wagon Wheels', 'common', '#A4733D', '#6B4423', 'Wooden wheels with spokes.');
  I('rumble-karts', 'wheels', 4, 'Donut Wheels', 'epic', '#E0A35A', '#FF8FC0', 'Iced donuts with sprinkles.');
  I('rumble-karts', 'wheels', 5, 'Whitewalls', 'common', '#FFFFFF', '#D8392B', 'Old-school white sidewalls.');
  I('rumble-karts', 'wheels', 6, 'Golden Stars', 'uncommon', '#FFC93C', '#FFF3B0', 'Gold rims with a star on each.');
  I('rumble-karts', 'wheels', 7, 'Peppermint Swirls', 'rare', '#FF4D6D', '#FFFFFF', 'Red and white candy wheels.');
  I('rumble-karts', 'wheels', 8, 'Button Wheels', 'common', '#2ED19A', '#FFFFFF', 'Giant sewing buttons.');
  I('rumble-karts', 'horn', 1, 'Goose Honk', 'uncommon', '#FFFFFF', '#F4A41C', 'Two loud honks.');
  I('rumble-karts', 'horn', 2, 'Clown Horn', 'common', '#FF4D6D', '#FFC93C', 'A squeezy honk-honk.');
  I('rumble-karts', 'horn', 3, 'Air Horn', 'epic', '#FF4D6D', '#F6F4FF', 'One big long blast.');
  I('rumble-karts', 'horn', 4, 'Kazoo', 'rare', '#FFC93C', '#FF8A3D', 'A buzzy little tune.');
  I('rumble-karts', 'horn', 5, 'Bike Bell', 'common', '#D4D8E6', '#FFC93C', 'Ring ring.');
  I('rumble-karts', 'wreck', 1, 'Confetti Pop', 'uncommon', '#FF4D6D', '#3FB8FF', 'Your kart bursts into confetti.');
  I('rumble-karts', 'wreck', 2, 'Feather Poof', 'uncommon', '#FFFFFF', '#E8E0D0', 'A pillow fight of feathers, and a honk.');
  I('rumble-karts', 'wreck', 3, 'Bubble Burst', 'common', '#BFE8FF', '#E4D4FF', 'Soap bubbles float up.');
  I('rumble-karts', 'wreck', 4, 'Jelly Splat', 'rare', '#5EE88A', '#FF7AB8', 'Wobbly jelly everywhere.');
  I('rumble-karts', 'wreck', 5, 'Nuts and Bolts', 'common', '#FFC93C', '#8D8AA0', 'Gears, springs and bolts fly off.');
  I('rumble-karts', 'wreck', 6, 'Fireworks', 'epic', '#FFE45C', '#A66BFF', 'A rocket goes up and bursts.');
  I('rumble-karts', 'wreck', 7, 'Popcorn', 'rare', '#FFFAF0', '#FFE08A', 'Pop, pop, pop.');
  I('rumble-karts', 'wreck', 8, 'Snow Globe', 'epic', '#BFE8FF', '#FFFFFF', 'Snow drifts down where you were.');
  I('rumble-karts', 'driver', 18, 'Striker', 'common', '#3FB8FF', '#FFFFFF', 'A footballer with a headband and the ball at his side. Taunt: GOOOAL!');
  I('rumble-karts', 'driver', 19, 'Stretch', 'uncommon', '#F5C45A', '#B06A2A', 'A giraffe who plays basketball. Taunt: Swish!');
  I('rumble-karts', 'driver', 20, 'Linebacker', 'common', '#2ED19A', '#8D8AA0', 'Shoulder pads, helmet and face cage. Taunt: Touchdown!');
  I('rumble-karts', 'driver', 21, 'Slugger', 'common', '#FFFFFF', '#8A5A2B', 'Pinstripe shirt, batting helmet and a big mitt. Taunt: Home run!');
  I('rumble-karts', 'driver', 22, 'Ref Reggie', 'uncommon', '#FFFFFF', '#1B1733', 'A referee in stripes with a whistle. Taunt: FOUL!');
  I('rumble-karts', 'driver', 23, 'Champ', 'rare', '#C98A52', '#FFC93C', 'A boxing kangaroo with a champion\'s belt. Taunt: Ding ding!');
  I('rumble-karts', 'driver', 24, 'Rally Bear', 'epic', '#9A6A3C', '#3FB8FF', 'The team mascot, foam finger up. Taunt: Go team!');
  I('rumble-karts', 'driver', 25, 'Captain Patch', 'legendary', '#2A2440', '#2ECC5A', 'A bearded pirate captain with an eye patch and a parrot. Taunt: Arrr!');
  I('rumble-karts', 'driver', 26, 'The Boss', 'epic', '#3A3550', '#8C92A8', 'A big cat in a pinstripe suit and fedora. Taunt: Nothing personal.');
  I('rumble-karts', 'driver', 27, 'Pemberton', 'rare', '#262238', '#D4D8E6', 'A butler in a tailcoat, tray held high. Taunt: Your wreck, sir.');
  I('rumble-karts', 'driver', 28, 'Clockwork', 'uncommon', '#C8CCD8', '#FFC93C', 'A wind-up tin robot with a key in its back. Taunt: Clank clank!');
  I('rumble-karts', 'driver', 29, 'Dusty', 'common', '#E8E6F0', '#5EE8FF', 'A robot vacuum with a smiley screen. Taunt: All tidy!');
  I('rumble-karts', 'driver', 30, 'Agent Shades', 'rare', '#2E2A44', '#1B1733', 'A bodyguard in a black suit, shades and an earpiece. Taunt: Area secure.');
  I('rumble-karts', 'kart', 16, 'Rowboat', 'rare', '#C08A4A', '#FFC93C', 'A painted rowboat with oars, a ship\'s wheel, a treasure chest and an anchor flag.');
  I('rumble-karts', 'kart', 17, 'Long Sedan', 'epic', '#2E2A40', '#D4D8E6', 'A long black sedan with a chrome grille and leather seats.');
  I('rumble-karts', 'kart', 18, 'Soccer Ball', 'uncommon', '#FFFFFF', '#2E2942', 'Ride a giant football.');
  I('rumble-karts', 'kart', 19, 'Basketball', 'common', '#E8742A', '#2E2942', 'Ride a giant basketball.');
  I('rumble-karts', 'kart', 20, 'Grandstand', 'legendary', '#4FBF6A', '#FFF3B0', 'A little pitch with a goal, a cheering crowd and floodlights.');
  I('rumble-karts', 'kart', 21, 'Ice Groomer', 'uncommon', '#FFFFFF', '#8FDCFF', 'The machine that makes the ice smooth between periods.');
  I('rumble-karts', 'kart', 22, 'Robo Racer', 'rare', '#B8BCCF', '#5EE8FF', 'A robot face with headlamp eyes and a gear on the back.');
  I('rumble-karts', 'kart', 23, 'Tea Trolley', 'uncommon', '#D9A441', '#FF9FC0', 'Teapot, cups and cakes. Do mind the corners.');
  I('rumble-karts', 'kart', 24, 'Football Helmet', 'common', '#3FB8FF', '#FFFFFF', 'A giant helmet with a stripe and a face cage.');
  I('rumble-karts', 'kart', 25, 'Boxing Ring', 'common', '#F3F1FB', '#D8392B', 'Ropes, corner pads and a bell.');
  I('rumble-karts', 'horn', 6, 'Stadium Horn', 'common', '#8D8AA0', '#FFC93C', 'A deep, long blast like the start of a match.');
  I('rumble-karts', 'horn', 7, 'Ship\'s Bell', 'uncommon', '#FFC93C', '#A4733D', 'Ding-ding, all hands on deck.');
  I('rumble-karts', 'horn', 8, 'Ref Whistle', 'common', '#F6F4FF', '#1B1733', 'A long trill and a short peep.');
  I('rumble-karts', 'horn', 9, 'Rally Organ', 'rare', '#A66BFF', '#FFC93C', 'A rising little tune from the stadium organ.');
  // ---- Tumble Trials items ----
  // Worn on the bean in Tumble Trials (tumble-trials/closet.js draws them, by slot and number). Captains only for now and in no
  // pack: the game's Closet gives captains every one free to wear, and nothing is sold.
  I('tumble-trials', 'colour', 1, 'Red', 'common', '#ff3b3b', '#ffd0d0', 'A bright tomato red.');
  I('tumble-trials', 'colour', 2, 'Orange', 'common', '#ff8a1f', '#ffe0bf', 'Orange, like a traffic cone on a sunny day.');
  I('tumble-trials', 'colour', 3, 'Yellow', 'common', '#ffd93d', '#fff6c9', 'Sunshine yellow.');
  I('tumble-trials', 'colour', 4, 'Lime', 'common', '#9be84a', '#e5ffc9', 'A zingy lime green.');
  I('tumble-trials', 'colour', 5, 'Teal', 'common', '#19b3a6', '#c4f3ee', 'Teal, somewhere between the sea and a swimming pool.');
  I('tumble-trials', 'colour', 6, 'Sky Blue', 'common', '#6cc8ff', '#dff3ff', 'A clear sky blue.');
  I('tumble-trials', 'colour', 7, 'Purple', 'common', '#9b5cff', '#e6d8ff', 'A rich grape purple.');
  I('tumble-trials', 'colour', 8, 'Pink', 'common', '#ff7ac3', '#ffe0f1', 'Bubblegum pink.');
  I('tumble-trials', 'colour', 9, 'White', 'common', '#f7f7fb', '#c9c6d8', 'Fresh-snow white.');
  I('tumble-trials', 'colour', 10, 'Black', 'common', '#34323c', '#8a8798', 'A soft charcoal black, so your face still pops.');
  I('tumble-trials', 'premium', 1, 'Gold', 'epic', '#f5c43a', '#fff0a0', 'Shiny gold from top to toes.');
  I('tumble-trials', 'premium', 2, 'Chrome', 'epic', '#c9d1da', '#ffffff', 'A mirror finish with the sky in it.');
  I('tumble-trials', 'premium', 3, 'Glow in the Dark', 'uncommon', '#b8ffc4', '#3cff7a', 'A pale green bean that glows a little.');
  I('tumble-trials', 'premium', 4, 'See-through Jelly', 'uncommon', '#ff9ad5', '#ffffff', 'A wobbly see-through jelly bean.');
  I('tumble-trials', 'premium', 5, 'Rainbow Shift', 'legendary', '#ff5c5c', '#5cc8ff', 'Every colour, slowly, one after another.');
  I('tumble-trials', 'premium', 6, 'Bubblegum Sprinkles', 'rare', '#ff9ccc', '#ffe14d', 'Pink bubblegum covered in sprinkles.');
  I('tumble-trials', 'pattern', 1, 'Polka Dots', 'common', '#ff4f9a', '#ffffff', 'Big round dots in your pattern colour.');
  I('tumble-trials', 'pattern', 2, 'Stripes', 'common', '#2ec5ff', '#ffffff', 'Candy stripes that wind round the bean.');
  I('tumble-trials', 'pattern', 3, 'Cow Print', 'uncommon', '#fbfaf5', '#1c1a20', 'Black patches on white, with a pink bottom.');
  I('tumble-trials', 'pattern', 4, 'Tie-Dye', 'uncommon', '#ff5cc8', '#4fd8ff', 'A swirly tie-dye bullseye front and back.');
  I('tumble-trials', 'pattern', 5, 'Checkerboard', 'common', '#ffffff', '#24163f', 'A checkerboard in your two colours.');
  I('tumble-trials', 'pattern', 6, 'Leopard', 'rare', '#e9b35c', '#3b2416', 'Spotty rosettes on tan.');
  I('tumble-trials', 'pattern', 7, 'Camo', 'common', '#6f7f45', '#2f3a1f', 'Woodland camouflage. You can still be seen.');
  I('tumble-trials', 'pattern', 8, 'Plaid', 'common', '#d9312b', '#1f3b73', 'A tartan of your two colours.');
  I('tumble-trials', 'pattern', 9, 'Watermelon', 'rare', '#ff5d6c', '#3f9a3a', 'Red with seeds on top, green rind below.');
  I('tumble-trials', 'pants', 1, 'Heart Boxers', 'common', '#fff4f7', '#ff3b5c', 'White boxers covered in little red hearts.');
  I('tumble-trials', 'pants', 2, 'Tighty Whities', 'common', '#fbfbf8', '#6b8bd6', 'Classic white briefs with a blue waistband.');
  I('tumble-trials', 'pants', 3, 'Polka Dot Briefs', 'common', '#7cc8ff', '#ffffff', 'Sky blue briefs with white dots.');
  I('tumble-trials', 'pants', 4, 'Banana Boxers', 'uncommon', '#9fe8c4', '#ffd84a', 'Mint boxers with a pattern of bananas.');
  I('tumble-trials', 'pants', 5, 'Leopard Print', 'uncommon', '#e9b35c', '#3b2416', 'Leopard print briefs, very bold.');
  I('tumble-trials', 'pants', 6, 'Long Johns', 'rare', '#d9312b', '#f2e6c9', 'Red long johns with buttons and a back flap.');
  I('tumble-trials', 'pants', 7, 'Diaper', 'rare', '#ffffff', '#9fd8ff', 'A puffy diaper with tiny stars and side tabs.');
  I('tumble-trials', 'pants', 8, 'Super Undies', 'epic', '#e8282b', '#ffd23f', 'Red undies over the top, with a gold star.');
  I('tumble-trials', 'pants', 9, 'Undies on Head', 'epic', '#fbfbf8', '#6b8bd6', 'A clean pair of briefs worn on the head. Do not ask.');
  I('tumble-trials', 'hat', 1, 'Traffic Cone', 'common', '#ff7a1a', '#ffffff', 'An orange cone with white stripes.');
  I('tumble-trials', 'hat', 2, 'Propeller Beanie', 'uncommon', '#ff3b3b', '#ffd23f', 'A four-colour cap with a spinning propeller.');
  I('tumble-trials', 'hat', 3, 'Chef Hat', 'common', '#ffffff', '#e6e6ee', 'A tall puffy white chef hat.');
  I('tumble-trials', 'hat', 4, 'Crown', 'epic', '#c9d1da', '#7a3cff', 'A silver crown with gems and a velvet top.');
  I('tumble-trials', 'hat', 5, 'Pirate Hat', 'uncommon', '#1e1b24', '#e8b923', 'A black pirate hat with gold trim.');
  I('tumble-trials', 'hat', 6, 'Viking Helmet', 'uncommon', '#9aa4b0', '#f2e6c9', 'A dome helmet with two curly horns.');
  I('tumble-trials', 'hat', 7, 'Cowboy Hat', 'common', '#a8652e', '#5a3416', 'A wide brown hat with a curled brim.');
  I('tumble-trials', 'hat', 8, 'Plunger', 'rare', '#d9312b', '#c9925a', 'A rubber plunger stuck to the top of the head.');
  I('tumble-trials', 'hat', 9, 'Fishbowl', 'epic', '#bfe6ff', '#ff8a1f', 'A bowl of water with a goldfish, balanced on top.');
  I('tumble-trials', 'hat', 10, 'Cooking Pot', 'common', '#a9b3bf', '#2a2a33', 'An upside-down cooking pot with handles.');
  I('tumble-trials', 'hat', 11, 'Birthday Cone', 'common', '#ff4f9a', '#ffd23f', 'A striped party cone with a pom-pom.');
  I('tumble-trials', 'hat', 12, 'Rubber Duck', 'rare', '#ffd93d', '#ff8a1f', 'A rubber duck sitting on your head.');
  I('tumble-trials', 'hat', 13, 'Toilet Paper Roll', 'rare', '#fbfbf8', '#c9a46a', 'A whole roll of toilet paper, one sheet hanging.');
  I('tumble-trials', 'hat', 14, 'Tiny Top Hat', 'common', '#1e1b24', '#d9312b', 'A very small top hat, worn at an angle.');
  I('tumble-trials', 'face', 1, 'Mustache', 'common', '#5a3a22', '#fff8ee', 'A curly brown mustache.');
  I('tumble-trials', 'face', 2, 'Monocle', 'uncommon', '#e8b923', '#cfe9ff', 'A gold monocle on a chain.');
  I('tumble-trials', 'face', 3, 'Googly Eyes', 'common', '#ffffff', '#1b1430', 'Big wobbly googly eyes.');
  I('tumble-trials', 'face', 4, 'Unibrow', 'common', '#2a1a12', '#fff8ee', 'One long eyebrow across both eyes.');
  I('tumble-trials', 'face', 5, 'Braces', 'common', '#ffffff', '#b8c2cc', 'A big grin full of braces.');
  I('tumble-trials', 'face', 6, 'Sunglasses', 'rare', '#ff4f9a', '#2a1850', 'Round pink sunglasses.');
  I('tumble-trials', 'costume', 1, 'Hot Dog', 'epic', '#c4553a', '#e7a85a', 'A sausage in a bun with a mustard squiggle.');
  I('tumble-trials', 'costume', 2, 'Banana', 'epic', '#ffd84a', '#6b4a1f', 'A banana, peel half down.');
  I('tumble-trials', 'costume', 3, 'Pickle', 'epic', '#5f9e2f', '#7dbb45', 'A bumpy green pickle.');
  I('tumble-trials', 'costume', 4, 'Chicken', 'epic', '#fbf8f0', '#e8282b', 'A chicken with a comb, a beak and wings.');
  I('tumble-trials', 'costume', 5, 'Dinosaur Onesie', 'epic', '#58c46a', '#ffb03a', 'A green onesie with spikes, a tail and hood eyes.');
  I('tumble-trials', 'costume', 6, 'Shark', 'epic', '#7d93a8', '#f2f4f6', 'A shark, with your face in its toothy mouth.');
  I('tumble-trials', 'costume', 7, 'Cactus', 'epic', '#3f9a4a', '#ff7ac3', 'A cactus with two arms and a pink flower.');
  I('tumble-trials', 'costume', 8, 'Sushi Roll', 'epic', '#fbfaf2', '#1f2e22', 'A sushi roll in seaweed, salmon on top.');
  I('tumble-trials', 'costume', 9, 'Astronaut', 'epic', '#f2f4f7', '#2e8bff', 'A space suit, a bubble helmet and a backpack.');
  I('tumble-trials', 'costume', 10, 'Knight', 'epic', '#c3cad3', '#2e5ad9', 'Armour, a raised visor and a red plume.');
  I('tumble-trials', 'costume', 11, 'Toilet Paper Mummy', 'epic', '#f7f5ee', '#d9d3c3', 'Wrapped head to toe in toilet paper.');
  I('tumble-trials', 'costume', 12, 'Turkey', 'epic', '#8a5a34', '#ff8a1f', 'A turkey with a big tail fan.');
  I('tumble-trials', 'dance', 1, 'Wiggle Wobble', 'uncommon', '#ff4f9a', '#ffd23f', 'A side-to-side wiggle with flappy arms.');
  I('tumble-trials', 'dance', 2, 'Robot', 'uncommon', '#9aa4b0', '#2ec5ff', 'Stiff robot arm moves.');
  I('tumble-trials', 'dance', 3, 'Spin Cycle', 'uncommon', '#2ec5ff', '#ffffff', 'Spin round and round.');
  I('tumble-trials', 'dance', 4, 'Chicken Flap', 'rare', '#ffa23a', '#fbf8f0', 'Flap and peck like a chicken.');
  I('tumble-trials', 'dance', 5, 'Jelly Jump', 'epic', '#6fdc4a', '#ff9ad5', 'Big squashy jelly jumps.');
  I('tumble-trials', 'dance', 6, 'Disco Point', 'rare', '#8a5cff', '#ffd23f', 'Point up, point down, repeat.');
  I('tumble-trials', 'scream', 1, 'Wheee!', 'common', '#ffd23f', '#ff4f9a', 'A rising "wheee!"');
  I('tumble-trials', 'scream', 2, 'Aaaah!', 'common', '#ff6b3d', '#ffffff', 'A long falling "aaaah!"');
  I('tumble-trials', 'scream', 3, 'Yodel Drop', 'common', '#46d37a', '#fff8ee', 'A wobbly yodel all the way down.');
  I('tumble-trials', 'scream', 4, 'Slide Whistle', 'common', '#2ec5ff', '#ffffff', 'A slide whistle from high to low.');
  I('tumble-trials', 'scream', 5, 'Kazoo Wail', 'common', '#8a5cff', '#ffd23f', 'A buzzy kazoo wail.');
  I('tumble-trials', 'scream', 6, 'Squeaky Toy', 'common', '#ff9ad5', '#ffffff', 'Three squeaks and a slow deflate.');
  I('tumble-trials', 'splash', 1, 'Confetti Pop', 'uncommon', '#ff4f9a', '#ffd23f', 'A pop of confetti when you are knocked out.');
  I('tumble-trials', 'splash', 2, 'Bubble Burst', 'uncommon', '#bfe6ff', '#ffffff', 'A cloud of bubbles.');
  I('tumble-trials', 'splash', 3, 'Rainbow Splat', 'rare', '#ff5c5c', '#5cc8ff', 'A ring of rainbow splats.');
  I('tumble-trials', 'splash', 4, 'Star Shower', 'rare', '#ffd23f', '#ffffff', 'A fountain of stars.');
  I('tumble-trials', 'splash', 5, 'Glitter Geyser', 'epic', '#ffcf3d', '#ff7ac3', 'A tall geyser of glitter.');
  // ---- Shell Crackers items ----
  // Looks only (shell-crackers/kit.js draws them by number): every egg type is the same size and the same hit box as a
  // plain egg, and a hat or a gun skin never changes what can be hit or how a gun shoots. Crack effects play where an
  // egg was cracked by whoever wears one.
  I('shell-crackers', 'egg', 1, 'White Egg', 'common', '#FBF8F0', '#E2DACB', 'Plain, clean and ready for anything.');
  I('shell-crackers', 'egg', 2, 'Brown Egg', 'common', '#C07E4E', '#8A5232', 'Farmhouse brown with a few freckles.');
  I('shell-crackers', 'egg', 3, 'Speckled Quail', 'common', '#EADCC0', '#4A3A2C', 'A small bird with very big spots.');
  I('shell-crackers', 'egg', 4, 'Robin Blue', 'common', '#8ED2D6', '#5FB5BC', 'The blue of a spring morning.');
  I('shell-crackers', 'egg', 5, 'Ostrich Egg', 'uncommon', '#F3E7C8', '#C9B48A', 'Ivory and pitted all over. The same size as everyone else, honest.');
  I('shell-crackers', 'egg', 6, 'Emu Egg', 'uncommon', '#3E8A6E', '#2C6A54', 'Deep forest green with a pebbly shell.');
  I('shell-crackers', 'egg', 7, 'Rotten Egg', 'uncommon', '#A3B85E', '#6B7D2E', 'Green, whiffy and followed by flies. Smells worse than it shoots.');
  I('shell-crackers', 'egg', 8, 'Golden Egg', 'epic', '#FFD04A', '#FFF2B0', 'From a goose with very expensive taste.');
  I('shell-crackers', 'egg', 9, 'Painted Easter Egg', 'rare', '#FF8AC0', '#6FD3FF', 'Zigzags, dots and bands in spring colours.');
  I('shell-crackers', 'egg', 10, 'Chocolate Egg', 'epic', '#8E5A36', '#F2CF5B', 'Milk chocolate with the foil half peeled off.');
  I('shell-crackers', 'egg', 11, 'Hard-Boiled', 'rare', '#FFFFFF', '#FFC93C', 'Half peeled, firm all the way through.');
  I('shell-crackers', 'egg', 12, 'Century Egg', 'epic', '#C9A877', '#8A5A2A', 'A coat of clay and rice husks over an amber middle.');
  I('shell-crackers', 'egg', 13, 'Dinosaur Egg', 'epic', '#D9C49A', '#7A5C3A', 'Big blotches from a very long time ago.');
  I('shell-crackers', 'egg', 14, 'Dragon Egg', 'legendary', '#D8433A', '#FFB02E', 'Overlapping scales, warm to the touch.');
  I('shell-crackers', 'egg', 15, 'Alien Egg', 'legendary', '#8BE08B', '#B46CFF', 'Glowing veins. It hums a little.');
  I('shell-crackers', 'egg', 16, 'Jeweled Egg', 'legendary', '#3A6FE0', '#FFD04A', 'Gold bands set with gems.');
  I('shell-crackers', 'egg', 17, 'Disco Ball', 'legendary', '#D8DEE8', '#FFFFFF', 'A thousand tiny mirrors.');
  I('shell-crackers', 'egg', 18, 'Pixel Egg', 'epic', '#FFD04A', '#36B37E', 'Drawn in big square pixels.');
  I('shell-crackers', 'egg', 19, 'Bandaged Egg', 'rare', '#FBF6EA', '#F2C49A', 'Cracked once, patched up, still fighting.');
  I('shell-crackers', 'hat', 1, 'Eggcup Crown', 'epic', '#FFD04A', '#E2503F', 'A golden eggcup with points and jewels.');
  I('shell-crackers', 'hat', 2, 'Frying Pan', 'common', '#3A3836', '#FFC93C', 'Worn at an angle, with breakfast still in it.');
  I('shell-crackers', 'hat', 3, 'Nest', 'uncommon', '#9A6A3A', '#8FD3D0', 'Twigs, straw and three tiny eggs.');
  I('shell-crackers', 'hat', 4, 'Chef Hat', 'common', '#FFFFFF', '#E6E1D6', 'Tall, white and puffy on top.');
  I('shell-crackers', 'hat', 5, 'Bacon Headband', 'uncommon', '#D8564A', '#F6D2B8', 'A crispy strip tied round the middle.');
  I('shell-crackers', 'hat', 6, 'Baby Chick', 'epic', '#FFD84A', '#F4A41C', 'A fluffy chick taking a ride.');
  I('shell-crackers', 'hat', 7, 'Sunny-Side-Up Beret', 'rare', '#FFFFFF', '#FFC93C', 'A floppy beret with the yolk on top.');
  I('shell-crackers', 'gun', 1, 'Cast Iron', 'common', '#3C3A38', '#6A6560', 'Heavy-looking, like a good old skillet.');
  I('shell-crackers', 'gun', 2, 'Gold Plated', 'epic', '#FFD04A', '#B8860B', 'Shiny gold from muzzle to stock.');
  I('shell-crackers', 'gun', 3, 'Egg Carton', 'common', '#CDBFA6', '#A89A82', 'Moulded cardboard, cups and all.');
  I('shell-crackers', 'gun', 4, 'Yolk Drip', 'uncommon', '#FFF6E2', '#FFC93C', 'Shell white with runny yolk dripping off.');
  I('shell-crackers', 'gun', 5, 'Bacon Wrap', 'uncommon', '#D8564A', '#F6D2B8', 'Strips of bacon wrapped round the body.');
  I('shell-crackers', 'gun', 6, 'Ketchup and Mustard', 'common', '#D62C2C', '#FFD23F', 'Red and yellow, with a squiggle down each side.');
  I('shell-crackers', 'gun', 7, 'Hot Sauce', 'uncommon', '#C2261C', '#FF9A2E', 'Deep red with flames up the sides.');
  I('shell-crackers', 'gun', 8, 'Toaster Chrome', 'epic', '#DCE3EA', '#5A6068', 'Polished like a kitchen toaster, slots and lever included.');
  I('shell-crackers', 'gun', 9, 'Candy Stripe', 'common', '#FFFFFF', '#E2343F', 'Red and white stripes all the way round.');
  I('shell-crackers', 'gun', 10, 'Whisk Barrel', 'rare', '#C9D1D9', '#8A939C', 'Wire loops round the barrel, ready to beat.');
  I('shell-crackers', 'gun', 11, 'Wooden Spoon Stock', 'rare', '#D9B07A', '#9A6A3A', 'A pale wooden stock that ends in a spoon.');
  I('shell-crackers', 'gun', 12, 'Rubber Chicken', 'legendary', '#FFD23F', '#E2343F', 'Squeaky yellow, with a head, feet and a tail.');
  I('shell-crackers', 'crack', 1, 'Fried Egg', 'common', '#FFFFFF', '#FFC93C', 'The cracked egg flips over and lands sunny side up.');
  I('shell-crackers', 'crack', 2, 'Scrambled', 'uncommon', '#FFD84A', '#FFF3C4', 'A quick whirl of fluffy scrambled egg.');
  I('shell-crackers', 'crack', 3, 'Chick Hatches', 'epic', '#FFD84A', '#F4A41C', 'A chick hops out and runs off.');
  I('shell-crackers', 'crack', 4, 'Shell Confetti', 'rare', '#FF5C8A', '#58B4FF', 'The shell bursts into bright confetti.');
  I('shell-crackers', 'crack', 5, 'Stink Puff', 'common', '#A3B85E', '#5A6B2A', 'A green whiff and two very happy flies.');
  // ---- Asteroid Run items ----
  // Asteroid Run: aliens to run as (a new picture on the runner's own plane, same size and hit area), run trails and
  // tunnel colours, drawn by asteroid-run/wardrobe.js by slot and number. In no pack: captains wear them free in the
  // game's Wardrobe. Tunnel colours are checked there so holes and special tiles stay as easy to see as with the zone colours.
  I('asteroid-run', 'alien', 1, 'Little Green', 'common', '#8BE35A', '#1A1D2E', 'The classic: green, big-headed and nearly all eyes.');
  I('asteroid-run', 'alien', 2, 'One-Eyed Blob', 'common', '#C77DFF', '#FFFFFF', 'One eye, no bones and a lot of wobble.');
  I('asteroid-run', 'alien', 3, 'Three-Eyed Guy', 'common', '#39C6B0', '#FFE45C', 'Watches left, right and straight ahead at once.');
  I('asteroid-run', 'alien', 4, 'Tentacle Squid', 'uncommon', '#FF6F91', '#7A2A4A', 'Runs on its tentacles and hardly ever trips.');
  I('asteroid-run', 'alien', 5, 'Slime Cube', 'uncommon', '#7CF29A', '#2E9E5A', 'A wobbly green cube. Something is floating inside.');
  I('asteroid-run', 'alien', 6, 'Fuzzy Furball', 'common', '#FFB0E0', '#B04A9A', 'Mostly fluff. The rest is also fluff.');
  I('asteroid-run', 'alien', 7, 'Crystal Alien', 'epic', '#8FF3FF', '#7A5CFF', 'Grown, not born, in the deepest caves of the asteroid.');
  I('asteroid-run', 'alien', 8, 'Mushroom Alien', 'uncommon', '#5BD6C8', '#F4E7C8', 'A glowing cap from a damp corner of space.');
  I('asteroid-run', 'alien', 9, 'Jellyfish', 'rare', '#9FD8FF', '#FF8FD0', 'Floats through space and only runs when it has to.');
  I('asteroid-run', 'alien', 10, 'Cat Alien', 'epic', '#B9A2FF', '#FF9AD5', 'Always lands on its feet, whichever wall that is.');
  I('asteroid-run', 'alien', 11, 'Potato Alien', 'common', '#C99A5B', '#7A5A30', 'Came all the way from the stars. Still a potato.');
  I('asteroid-run', 'alien', 12, 'Star Alien', 'rare', '#FFD84A', '#FF8A3D', 'Five points, and two of them are legs.');
  I('asteroid-run', 'alien', 13, 'Eyeball with Legs', 'epic', '#F6F3EE', '#3FA9F5', 'Never blinks, so it never misses a hole.');
  I('asteroid-run', 'alien', 14, 'Brain in a Jar', 'epic', '#FF9EC4', '#9FE8FF', 'Very clever, a little sloshy.');
  I('asteroid-run', 'alien', 15, 'Robot Suit Pilot', 'legendary', '#B8C2D6', '#7DFF6A', 'A tiny alien driving a very big robot.');
  I('asteroid-run', 'alien', 16, 'Mustache Disguise', 'legendary', '#C9A26B', '#8BE35A', 'Definitely a normal human. Please stop looking.');
  I('asteroid-run', 'alien', 17, 'Escaped Cow', 'legendary', '#FFFFFF', '#1A1D2E', 'Beamed up, broke out, still running.');
  I('asteroid-run', 'alien', 18, 'Astronaut Hamster', 'epic', '#F2C48D', '#EAF2FF', 'Small paws, big helmet, one giant leap.');
  I('asteroid-run', 'alien', 19, 'Retro Robot', 'rare', '#C8D2DC', '#FF5A5A', 'Wind it up and point it down the tunnel.');
  I('asteroid-run', 'trail', 1, 'Stardust', 'common', '#FFE9A0', '#FFFFFF', 'Tiny twinkling stars in your footsteps.');
  I('asteroid-run', 'trail', 2, 'Slime Drips', 'common', '#7CF29A', '#2E9E5A', 'Green drips. Somebody will have to mop that.');
  I('asteroid-run', 'trail', 3, 'Bubbles', 'common', '#BDF4FF', '#FFFFFF', 'Bubbles that drift up and wobble away.');
  I('asteroid-run', 'trail', 4, 'Hearts', 'uncommon', '#FF6FA8', '#FFC2DD', 'Little pink hearts floating behind you.');
  I('asteroid-run', 'trail', 5, 'Confetti', 'uncommon', '#FF4FA3', '#FFD23F', 'Every run is a party.');
  I('asteroid-run', 'trail', 6, 'Pixels', 'rare', '#3FE0FF', '#FF4FA0', 'Square blocks in a neat line, like an old arcade game.');
  I('asteroid-run', 'trail', 7, 'Snowflakes', 'common', '#FFFFFF', '#BDE6FF', 'Six-armed flakes that spin as they fall.');
  I('asteroid-run', 'trail', 8, 'Petals', 'rare', '#FFB7D5', '#FFFFFF', 'Pink petals tumbling in the air.');
  I('asteroid-run', 'trail', 9, 'Zaps', 'epic', '#D8F6FF', '#3FA9FF', 'Quick blue sparks that crackle and vanish.');
  I('asteroid-run', 'trail', 10, 'Tractor Rings', 'epic', '#7DFF6A', '#C8FFD2', 'Green rings that grow and fade, like a beam from a saucer.');
  I('asteroid-run', 'tunnel', 1, 'Deep Blue', 'common', '#3D6BFF', '#2A7FD0', 'Every zone in shades of deep blue.');
  I('asteroid-run', 'tunnel', 2, 'Silver', 'common', '#A0A6C0', '#6D7DA0', 'Cool metal greys from end to end.');
  I('asteroid-run', 'tunnel', 3, 'Bubblegum', 'uncommon', '#FF6FB5', '#E0559A', 'Pink tunnels, chewed and stretched.');
  I('asteroid-run', 'tunnel', 4, 'Ultraviolet', 'uncommon', '#8A70FF', '#9A88FF', 'Glowing violet all the way down.');
  I('asteroid-run', 'tunnel', 5, 'Ocean', 'common', '#2A7FD0', '#4B8CF0', 'Sea blues, a very long way from any sea.');
  I('asteroid-run', 'tunnel', 6, 'Moon Dust', 'rare', '#C0C4D8', '#9AA3BD', 'Pale grey, like running on the Moon.');
  I('asteroid-run', 'tunnel', 7, 'Treasure', 'epic', '#E0B040', '#A0A6C0', 'Gold and silver tiles. Do not stop to dig.');
  I('asteroid-run', 'tunnel', 8, 'Checkerboard', 'epic', '#3F7FFF', '#8FA8FF', 'Two blues in a checker pattern.');
  I('asteroid-run', 'tunnel', 9, 'Candy Checker', 'epic', '#FF6FB5', '#8FA8FF', 'Pink and lilac squares, like a sweet shop floor.');
  I('asteroid-run', 'tunnel', 10, 'Prism', 'legendary', '#FF6FB5', '#4F68FF', 'The tunnel changes colour every few rows.');
  // ---- Rampline items ----
  // Rampline: cars (31: normal, work, toy and silly), paints, wheels, tyre smoke and horns. rampline/garage.js draws them by
  // slot and number (Captain's garage, captains only while it is not public; everything free to wear while the shop is shut).
  I('rampline', 'car', 1, 'Muscle Car', 'common', '#FF5A4E', '#1D2333', 'A long bonnet with a scoop, a fastback roof and chrome bumpers.');
  I('rampline', 'car', 2, 'Rally Hatch', 'common', '#FF5A4E', '#FFF6C8', 'A boxy hatch with a roof wing, mud flaps and four lamps on the bumper.');
  I('rampline', 'car', 3, 'Hot Rod', 'uncommon', '#FF5A4E', '#D5DCE6', 'A chopped cab, big back wheels and a shiny engine out front.');
  I('rampline', 'car', 4, 'Pickup', 'common', '#FF5A4E', '#1D2333', 'A cab, an open bed and a roll bar with two lamps.');
  I('rampline', 'car', 5, 'Dune Buggy', 'common', '#FF5A4E', '#D5DCE6', 'An open tub with a roll hoop and the engine on show at the back.');
  I('rampline', 'car', 6, 'Monster Truck', 'epic', '#FF5A4E', '#24262E', 'A pickup on giant knobbly tyres, with a light bar on the roof.');
  I('rampline', 'car', 7, 'Retro Wedge', 'uncommon', '#FF5A4E', '#9FD8FF', 'A flat doorstop of a sports car with pop-up lamps and louvres.');
  I('rampline', 'car', 8, 'Go-Kart', 'common', '#FF5A4E', '#F6F7F9', 'A tiny frame, side pods and a driver in a white helmet.');
  I('rampline', 'car', 9, 'Limo', 'uncommon', '#FF5A4E', '#D5DCE6', 'A very long car with a lot of windows and chrome trim.');
  I('rampline', 'car', 10, 'School Bus', 'uncommon', '#F7B500', '#1D2333', 'Yellow, rows of windows and a stop sign that folds out.');
  I('rampline', 'car', 11, 'Taxi', 'common', '#FFC21A', '#1D2333', 'A checker band down each side and a sign on the roof.');
  I('rampline', 'car', 12, 'Police Cruiser', 'uncommon', '#232A3D', '#F6F7F9', 'Dark ends, light doors, a made-up star and a red and blue light bar.');
  I('rampline', 'car', 13, 'Fire Truck', 'epic', '#D7262B', '#D5DCE6', 'A ladder on top, shiny lockers and six wheels.');
  I('rampline', 'car', 14, 'Ice Cream Truck', 'epic', '#FFF0DC', '#FF7FB8', 'A striped awning over the serving hatch and a cone on the roof.');
  I('rampline', 'car', 15, 'Garbage Truck', 'rare', '#2F8F4E', '#F6F7F9', 'A ribbed body, a hopper at the back and a bin on the lifter.');
  I('rampline', 'car', 16, 'Tractor', 'rare', '#2E8B3A', '#FFC21A', 'Huge back wheels, little front ones and a sun roof on poles.');
  I('rampline', 'car', 17, 'Golf Cart', 'common', '#2F8F4E', '#F6F7F9', 'A canopy on four poles and a golf bag strapped on the back.');
  I('rampline', 'car', 18, 'Lunar Rover', 'epic', '#D9DDE4', '#E0B23A', 'Mesh wheels, gold foil and a dish antenna for calling home.');
  I('rampline', 'car', 19, 'Wooden Toy', 'rare', '#D9A86C', '#E0453C', 'A block of wood on wooden wheels with a peg driver.');
  I('rampline', 'car', 20, 'Wind-Up Car', 'epic', '#4AA3DF', '#E8BF4A', 'A tin toy with a bubble roof and a big key in the back.');
  I('rampline', 'car', 21, 'RC Car', 'rare', '#FF5A1F', '#1D2333', 'A buggy shell, springy shocks and a whippy antenna.');
  I('rampline', 'car', 22, 'Soapbox Crate', 'rare', '#C8945A', '#E0453C', 'A fruit crate on pram wheels with a painted number seven.');
  I('rampline', 'car', 23, 'Cardboard Box', 'common', '#C89B68', '#E0453C', 'A box with its flaps open, paper plate wheels and a door drawn in marker.');
  I('rampline', 'car', 24, 'Shopping Cart', 'epic', '#D5DCE6', '#E0453C', 'A wire basket on squeaky casters. Please return it after use.');
  I('rampline', 'car', 25, 'Bathtub', 'epic', '#F4F2EC', '#7CC8FF', 'A claw-foot tub full to the brim, with bubbles and a duck.');
  I('rampline', 'car', 26, 'Couch', 'epic', '#5B7FC7', '#8B5A2B', 'A comfy sofa with a footstool and a lamp, on wheels.');
  I('rampline', 'car', 27, 'Hot Dog', 'epic', '#E0A85A', '#B5462F', 'A bun, a sausage and a zigzag of mustard on top.');
  I('rampline', 'car', 28, 'Banana', 'epic', '#FFD84A', '#6B4A22', 'A big curved banana with a seat in the middle.');
  I('rampline', 'car', 29, 'Rubber Duck', 'legendary', '#FFD21F', '#FF8A1F', 'A bath duck the size of a car. Squeak not included.');
  I('rampline', 'car', 30, 'Giant Shoe', 'legendary', '#E0453C', '#F6F7F9', 'A trainer with a thick white sole and its laces done up.');
  I('rampline', 'car', 31, 'Rocket Car', 'legendary', '#F2F4F8', '#E0453C', 'A rocket on wheels with fins, a bubble cockpit and a big nozzle.');
  I('rampline', 'paint', 1, 'Candy Apple Paint', 'common', '#D8202F', '#D8202F', 'Repaints the car\'s own paintwork candy apple.');
  I('rampline', 'paint', 2, 'Tangerine Paint', 'common', '#FF8A1F', '#FF8A1F', 'Repaints the car\'s own paintwork tangerine.');
  I('rampline', 'paint', 3, 'Lemon Drop Paint', 'common', '#FFF04A', '#FFF04A', 'Repaints the car\'s own paintwork lemon drop.');
  I('rampline', 'paint', 4, 'Lime Fizz Paint', 'common', '#9BE22D', '#9BE22D', 'Repaints the car\'s own paintwork lime fizz.');
  I('rampline', 'paint', 5, 'Mint Paint', 'common', '#7FE8C4', '#7FE8C4', 'Repaints the car\'s own paintwork mint.');
  I('rampline', 'paint', 6, 'Teal Paint', 'common', '#14A3A3', '#14A3A3', 'Repaints the car\'s own paintwork teal.');
  I('rampline', 'paint', 7, 'Sky Paint', 'common', '#7CC8FF', '#7CC8FF', 'Repaints the car\'s own paintwork sky.');
  I('rampline', 'paint', 8, 'Midnight Paint', 'common', '#23408F', '#23408F', 'Repaints the car\'s own paintwork midnight.');
  I('rampline', 'paint', 9, 'Lavender Paint', 'common', '#B9A3FF', '#B9A3FF', 'Repaints the car\'s own paintwork lavender.');
  I('rampline', 'paint', 10, 'Grape Paint', 'common', '#7339D9', '#7339D9', 'Repaints the car\'s own paintwork grape.');
  I('rampline', 'paint', 11, 'Bubblegum Paint', 'common', '#FF9ED1', '#FF9ED1', 'Repaints the car\'s own paintwork bubblegum.');
  I('rampline', 'paint', 12, 'Magenta Paint', 'common', '#E0279A', '#E0279A', 'Repaints the car\'s own paintwork magenta.');
  I('rampline', 'paint', 13, 'Copper Paint', 'uncommon', '#C8743C', '#C8743C', 'Repaints the car\'s own paintwork copper.');
  I('rampline', 'paint', 14, 'Sand Paint', 'common', '#E8CF9A', '#E8CF9A', 'Repaints the car\'s own paintwork sand.');
  I('rampline', 'paint', 15, 'Gold Paint', 'uncommon', '#E8B93A', '#E8B93A', 'Repaints the car\'s own paintwork gold.');
  I('rampline', 'paint', 16, 'Silver Paint', 'rare', '#C5CCD6', '#C5CCD6', 'Repaints the car\'s own paintwork silver.');
  I('rampline', 'wheels', 1, 'Whitewalls', 'common', '#F4F4F0', '#24262E', 'A white ring round a shiny hub.');
  I('rampline', 'wheels', 2, 'Wire Spokes', 'uncommon', '#D5DCE6', '#33384A', 'Twelve thin chrome spokes.');
  I('rampline', 'wheels', 3, 'Gold Star', 'uncommon', '#FFC61A', '#3A3F50', 'Five gold arms on a dark wheel.');
  I('rampline', 'wheels', 4, 'Off-Road', 'common', '#24262E', '#BFC6D2', 'Chunky tread blocks for rough ground.');
  I('rampline', 'wheels', 5, 'Neon Rings', 'epic', '#3DFFB0', '#15172A', 'Glowing green rings on a dark wheel.');
  I('rampline', 'wheels', 6, 'Wooden', 'uncommon', '#C8945A', '#8B5A2B', 'Turned wood, like a toy.');
  I('rampline', 'wheels', 7, 'Red Steelies', 'common', '#D8202F', '#5A0D14', 'Plain red steel with five holes.');
  I('rampline', 'wheels', 8, 'Turbine', 'rare', '#D5DCE6', '#2A2F3C', 'A ring of fan blades.');
  I('rampline', 'wheels', 9, 'Candy Swirl', 'rare', '#FF5FA8', '#FFFFFF', 'Pink and white like a sweet.');
  I('rampline', 'wheels', 10, 'Flower Caps', 'rare', '#FF7AB8', '#FFD21F', 'Petals round a yellow middle.');
  I('rampline', 'wheels', 11, 'Race Slicks', 'common', '#FFD21F', '#30343F', 'Yellow sidewall lettering band and gold centre locks.');
  I('rampline', 'wheels', 12, 'Rainbow Rings', 'epic', '#FF4D4D', '#3B82F6', 'Every colour, ring inside ring.');
  I('rampline', 'smoke', 1, 'Pink Tyre Smoke', 'common', '#FF7AB8', '#ECEBE8', 'Pink smoke from the back wheels in a slide.');
  I('rampline', 'smoke', 2, 'Sky Blue Tyre Smoke', 'common', '#6CC4FF', '#ECEBE8', 'Sky Blue smoke from the back wheels in a slide.');
  I('rampline', 'smoke', 3, 'Lime Tyre Smoke', 'common', '#A3F05A', '#ECEBE8', 'Lime smoke from the back wheels in a slide.');
  I('rampline', 'smoke', 4, 'Purple Tyre Smoke', 'common', '#B07AFF', '#ECEBE8', 'Purple smoke from the back wheels in a slide.');
  I('rampline', 'smoke', 5, 'Gold Tyre Smoke', 'common', '#FFCF4A', '#ECEBE8', 'Gold smoke from the back wheels in a slide.');
  I('rampline', 'smoke', 6, 'Orange Tyre Smoke', 'common', '#FF9442', '#ECEBE8', 'Orange smoke from the back wheels in a slide.');
  I('rampline', 'smoke', 7, 'Red Tyre Smoke', 'common', '#FF5A5A', '#ECEBE8', 'Red smoke from the back wheels in a slide.');
  I('rampline', 'smoke', 8, 'Mint Tyre Smoke', 'common', '#7FE8C4', '#ECEBE8', 'Mint smoke from the back wheels in a slide.');
  I('rampline', 'smoke', 9, 'Rainbow Tyre Smoke', 'epic', '#FF5A5A', '#ECEBE8', 'A different colour every moment.');
  I('rampline', 'smoke', 10, 'Confetti Tyre Smoke', 'epic', '#FF5FA8', '#ECEBE8', 'Every puff a different colour.');
  I('rampline', 'horn', 1, 'Beep Beep', 'common', '#FFCF33', '#16213A', 'Two quick friendly beeps.');
  I('rampline', 'horn', 2, 'Clown Honk', 'uncommon', '#FFCF33', '#16213A', 'A squashy rubber honk.');
  I('rampline', 'horn', 3, 'Air Horn', 'uncommon', '#FFCF33', '#16213A', 'A big three-note blast.');
  I('rampline', 'horn', 4, 'Little Tune', 'uncommon', '#FFCF33', '#16213A', 'Five notes that go up.');
  I('rampline', 'horn', 5, 'Duck Quack', 'epic', '#FFCF33', '#16213A', 'Quack quack.');
  I('rampline', 'horn', 6, 'Bike Bell', 'common', '#FFCF33', '#16213A', 'Ring ring.');
  I('rampline', 'horn', 7, 'Squeaky Toy', 'rare', '#FFCF33', '#16213A', 'Squeak, then squeak back.');
  I('rampline', 'horn', 8, 'Space Zap', 'epic', '#FFCF33', '#16213A', 'A falling laser sound.');
  I('rampline', 'horn', 9, 'Foghorn', 'rare', '#FFCF33', '#16213A', 'Low and long, like a ship in the mist.');
  I('rampline', 'horn', 10, 'Ice Cream Jingle', 'epic', '#FFCF33', '#16213A', 'A made-up jingle for the ice cream van.');
  I('rampline', 'horn', 11, 'Train Whistle', 'rare', '#FFCF33', '#16213A', 'Three notes at once, like a little steam train.');
  // second wave (Nov 2026): sports cars and pirates, suits and robots, more paints and two horns
  I('rampline', 'car', 32, 'Team Bus', 'uncommon', '#1F5FD6', '#FFFFFF', 'The team coach: tinted windows, a stripe and a star.');
  I('rampline', 'car', 33, 'Ice Resurfacer', 'rare', '#F4F6F8', '#2350C8', 'The ice machine, snow tank and all.');
  I('rampline', 'car', 34, 'Golf Cart Racer', 'common', '#D8202F', '#FFFFFF', 'A golf cart with stripes, a roll bar and a spoiler.');
  I('rampline', 'car', 35, 'Football Helmet', 'rare', '#1F5FD6', '#FFFFFF', 'A giant helmet with a stripe and a face cage.');
  I('rampline', 'car', 36, 'Soccer Ball', 'uncommon', '#F6F7F9', '#1D2333', 'A football on four wheels.');
  I('rampline', 'car', 37, 'Pirate Ship', 'legendary', '#8A5A2B', '#23252E', 'A wooden hull, a black sail with crossed oars and a ship\'s wheel.');
  I('rampline', 'car', 38, 'Black Sedan', 'epic', '#1D2130', '#D5DCE6', 'An old-time sedan with round fenders, a tall grille and whitewalls.');
  I('rampline', 'car', 39, 'VIP Limo', 'epic', '#15161C', '#D9A441', 'Dark tinted windows, gold trim and two little flags.');
  I('rampline', 'car', 40, 'Armoured Van', 'common', '#6B7468', '#D9A441', 'Rivets, slit windows and a gold stripe.');
  I('rampline', 'car', 41, 'Robo Walker', 'rare', '#B8BCCF', '#3FD2FF', 'A robot on wheels with its legs folded up.');
  I('rampline', 'car', 42, 'Lowrider', 'uncommon', '#7339D9', '#D9A441', 'Long, low, wire wheels and a gold chain pinstripe.');
  I('rampline', 'paint', 17, 'Jersey Blue Paint', 'common', '#1F5FD6', '#1F5FD6', 'Repaints the car\'s own paintwork jersey blue.');
  I('rampline', 'paint', 18, 'Turf Green Paint', 'common', '#2F9E44', '#2F9E44', 'Repaints the car\'s own paintwork turf green.');
  I('rampline', 'paint', 19, 'Ice White Paint', 'common', '#EEF4F8', '#EEF4F8', 'Repaints the car\'s own paintwork ice white.');
  I('rampline', 'paint', 20, 'Varsity Maroon Paint', 'uncommon', '#7A1F3D', '#7A1F3D', 'Repaints the car\'s own paintwork varsity maroon.');
  I('rampline', 'paint', 21, 'Gunmetal Paint', 'uncommon', '#5A6170', '#5A6170', 'Repaints the car\'s own paintwork gunmetal.');
  I('rampline', 'paint', 22, 'Tuxedo Black Paint', 'rare', '#1B1D26', '#1B1D26', 'Repaints the car\'s own paintwork tuxedo black.');
  I('rampline', 'paint', 23, 'Parrot Green Paint', 'common', '#22C35A', '#22C35A', 'Repaints the car\'s own paintwork parrot green.');
  I('rampline', 'paint', 24, 'Plank Brown Paint', 'common', '#8A5A2B', '#8A5A2B', 'Repaints the car\'s own paintwork plank brown.');
  I('rampline', 'paint', 25, 'Circuit Green Paint', 'uncommon', '#0F7A4A', '#0F7A4A', 'Repaints the car\'s own paintwork circuit green.');
  I('rampline', 'horn', 12, "Ship's Bell", 'common', '#FFCF33', '#16213A', 'Ding-ding, like a ship\'s bell.');
  I('rampline', 'horn', 13, 'Ref Whistle', 'common', '#FFCF33', '#16213A', 'A long trill and a short peep.');
  // ---- Chromaflage items ----
  // Chromaflage: for seekers only (hiders' paint is the whole game, so they never wear any of it). Drawn by
  // chromaflage/kit.js by slot and number; captains wear them free in the game's Seeker kit; none is sold yet.
  I('chromaflage', 'hat', 1, 'Detective Deerstalker', 'uncommon', '#9A6B3F', '#5C3B22', 'A checked cap with a peak at both ends, for following clues in two directions.');
  I('chromaflage', 'hat', 2, 'Safari Hat', 'common', '#D8C08A', '#8A6A3A', 'A khaki helmet for tracking rare painted creatures through the living room.');
  I('chromaflage', 'hat', 3, "Painter's Beret", 'common', '#2E2A4A', '#FF4F8B', "A floppy beret already splattered with everyone else's paint.");
  I('chromaflage', 'hat', 4, 'Museum Guard Cap', 'common', '#1E2B4A', '#E2B33C', 'A peaked cap with a gold badge. Please do not touch the exhibits.');
  I('chromaflage', 'hat', 5, 'Hard Hat', 'common', '#FFC21A', '#FFFFFF', 'Safety first, even when the danger is a sofa that blinks.');
  I('chromaflage', 'hat', 6, 'Exterminator Cap', 'rare', '#3E7D3A', '#E23B3B', 'A green cap with a no-bugs badge. Hiders are not bugs, but still.');
  I('chromaflage', 'hat', 7, 'Goggles', 'common', '#3A3A46', '#5FD0E6', 'Big round lenses pushed up on the forehead, ready for a closer look.');
  I('chromaflage', 'tool', 1, 'Magnifying Glass', 'uncommon', '#C9962E', '#BFEFFF', 'A brass-rimmed lens on a wooden handle. Very detective.');
  I('chromaflage', 'tool', 2, 'Paint Scraper', 'common', '#14B8A6', '#C9D1DA', 'A wide blade for scraping the camouflage off a suspicious wall.');
  I('chromaflage', 'tool', 3, 'Spray Bottle', 'common', '#7FE3D6', '#FF4F8B', 'A trigger spray for misting anything that looks too much like the wallpaper.');
  I('chromaflage', 'tool', 4, 'Feather Duster', 'rare', '#A0673C', '#FF4F8B', 'Fluffy rainbow feathers for dusting off whoever is hiding on the shelf.');
  I('chromaflage', 'splash', 1, 'Paint Splash', 'epic', '#FF4F8B', '#FFC83D', 'A ring of paint droplets in every colour, and a little SPLAT! over their head, when you catch someone.');
  I('chromaflage', 'caught', 1, 'Surprise Spin', 'epic', '#FF4F8B', '#3F7CFF', 'The hider you catch jumps in surprise, spins round and pops in a puff of paint.');
  // ---- Odd One Out items ----
  // Drawn and played by odd-one-out/wardrobe.js (by slot and number). Outfits and tools are worn by hunters only (a prop
  // always looks exactly like the real object); a taunt plays only when a prop presses its key; a poof plays where a prop
  // was caught, chosen by the hunter who caught it.
  I('odd-one-out', 'outfit', 1, 'Police Officer', 'common', '#7FA6DC', '#26325E', 'Light blue shirt, navy peaked cap and a shiny badge.');
  I('odd-one-out', 'outfit', 2, 'Sheriff', 'uncommon', '#D7B06E', '#FFCF3F', 'A big gold star, a cream hat and a serious moustache.');
  I('odd-one-out', 'outfit', 3, 'Mall Cop', 'common', '#F3F1EA', '#2C3550', 'Sunglasses indoors and a whistle for the food court.');
  I('odd-one-out', 'outfit', 4, 'Security Guard', 'common', '#E8F13A', '#1F2128', 'Bright vest, black cap and an earpiece that hears everything.');
  I('odd-one-out', 'outfit', 5, 'Detective', 'uncommon', '#C49A5C', '#5B4A3C', 'Trench coat, collar up, hat down. Something is out of place.');
  I('odd-one-out', 'outfit', 6, 'Store Manager', 'common', '#3A7BD5', '#CDB88F', 'Name tag, headset, and a very close eye on the shelves.');
  I('odd-one-out', 'outfit', 7, 'Janitor', 'common', '#5C7D9C', '#F2CF2E', 'Coveralls, rubber gloves and a key for every door.');
  I('odd-one-out', 'outfit', 8, 'Park Ranger', 'uncommon', '#C9B27C', '#5D6B3B', 'A flat-brimmed hat for spotting what does not belong.');
  I('odd-one-out', 'outfit', 9, 'Exterminator', 'rare', '#E9E6DA', '#C84A3A', 'Goggles, a mask and a red spray tank. Pests beware.');
  I('odd-one-out', 'outfit', 10, 'Construction Worker', 'common', '#FFCC1A', '#C6EC2F', 'Hard hat, hi-vis vest and a belt full of pouches.');
  I('odd-one-out', 'outfit', 11, 'Cowboy', 'rare', '#C9443A', '#7B4D2A', 'Waistcoat, bandana and a hat with the sides turned up.');
  I('odd-one-out', 'outfit', 12, 'Pirate', 'epic', '#B8323A', '#F0C445', 'Red coat, gold trim, a three-cornered hat and an eye patch.');
  I('odd-one-out', 'outfit', 13, 'Top Hat', 'epic', '#1F1D24', '#FF7A1A', 'The usual hunter, very tall and very fancy, with a monocle.');
  I('odd-one-out', 'outfit', 14, 'Traffic Cone', 'legendary', '#FF6A1A', '#F6F6F2', 'The usual hunter with a traffic cone for a hat.');
  I('odd-one-out', 'tool', 1, 'Flashlight', 'common', '#FFD23F', '#23252C', 'A yellow torch with a glowing lens. Shoots like the rifle.');
  I('odd-one-out', 'tool', 2, 'Price Scanner', 'uncommon', '#E4E7EC', '#FF4A3A', 'Beep. That item is not in the system.');
  I('odd-one-out', 'tool', 3, 'Flyswatter', 'common', '#3FBF6A', '#FF5A4A', 'For anything that buzzes, or anything that moves.');
  I('odd-one-out', 'tool', 4, 'Butterfly Net', 'rare', '#C9955A', '#F4F4F0', 'Catch them gently.');
  I('odd-one-out', 'tool', 5, 'Broom', 'common', '#B5834A', '#E8C766', 'Sweep the room, one prop at a time.');
  I('odd-one-out', 'tool', 6, 'Rubber Chicken', 'epic', '#FFD23F', '#E23B3B', 'Nobody knows why. It works just the same.');
  I('odd-one-out', 'taunt', 1, 'Bike Horn', 'common', '#FF7A1A', '#171A2E', 'Honk honk. Over here.');
  I('odd-one-out', 'taunt', 2, 'Squeaky Duck', 'common', '#FFD23F', '#FF8A1A', 'Two squeaks from somewhere nearby.');
  I('odd-one-out', 'taunt', 3, 'Slide Whistle', 'common', '#3F7CFF', '#FFFFFF', 'All the way up, and back down.');
  I('odd-one-out', 'taunt', 4, 'Boing', 'common', '#14B89A', '#FFFFFF', 'A spring that has had enough of sitting still.');
  I('odd-one-out', 'taunt', 5, 'Cuckoo', 'uncommon', '#8A5A33', '#FFD23F', 'It is time. It is always time.');
  I('odd-one-out', 'taunt', 6, 'Kazoo', 'uncommon', '#EC4899', '#FFD23F', 'A short, buzzy tune of victory.');
  I('odd-one-out', 'taunt', 7, 'Doorbell', 'rare', '#C9D0D8', '#3A3F4A', 'Ding dong. Is anybody home?');
  I('odd-one-out', 'taunt', 8, 'Party Blower', 'epic', '#FF5A4A', '#3FD2FF', 'Brrrt. Somebody is having fun.');
  I('odd-one-out', 'poof', 1, 'Cloud Poof', 'common', '#FFFFFF', '#C8D2DC', 'A big soft cloud where the prop was.');
  I('odd-one-out', 'poof', 2, 'Feather Poof', 'uncommon', '#FFFFFF', '#FFE1EC', 'Feathers that drift down slowly.');
  I('odd-one-out', 'poof', 3, 'Bubble Poof', 'rare', '#BFE9FF', '#D8C8FF', 'Bubbles that float up and pop.');
  I('odd-one-out', 'poof', 4, 'Star Poof', 'epic', '#FFD23F', '#FFFFFF', 'A ring of spinning gold stars.');
  I('odd-one-out', 'poof', 5, 'Price Tag Poof', 'epic', '#FFE24A', '#FF5A4A', 'Clearance. Everything must go.');
  // ---- Driftfall items ----
  // Driftfall (drop-zone/locker-extra.js draws them by number, the outfits are in drop-zone/index.html): outfits, backpacks, gliders, glider trails, gun skins,
  // build skins, emotes and victory poses. Hidden: worn from the game's Locker by captains only.
  // Driftfall outfits: no is the outfit's place in the game's OUTFITS (sent as sk), so the first is 25.
  I('drop-zone', 'outfit', 25, 'Jet Pilot', 'uncommon', '#F28C28', '#FFFFFF', 'An orange flight suit, a white helmet and a parachute pack.');
  I('drop-zone', 'outfit', 26, 'Lumberjack', 'common', '#E0463A', '#A8382E', 'A plaid shirt, a bobble hat and a frame of logs.');
  I('drop-zone', 'outfit', 27, 'Park Ranger', 'common', '#D9C48A', '#E8742A', 'A wide hat, a star badge and an orange pack.');
  I('drop-zone', 'outfit', 28, 'Scuba Diver', 'uncommon', '#FFD23F', '#2FB8B0', 'A bright wetsuit, a mask and twin tanks.');
  I('drop-zone', 'outfit', 29, 'Head Chef', 'uncommon', '#FFFFFF', '#E8453C', 'A tall pleated hat and a bag of fresh loaves.');
  I('drop-zone', 'outfit', 30, 'Hazmat Suit', 'uncommon', '#F6D32A', '#3A7AD0', 'Yellow from head to toe, with a wide visor.');
  I('drop-zone', 'outfit', 31, 'Castle Knight', 'epic', '#DDE3EA', '#E8453C', 'A great helm with a plume and a cape in your colour.');
  I('drop-zone', 'outfit', 32, 'Astronaut', 'epic', '#F4F6F8', '#FFC93C', 'A round helmet with a gold visor and a life-support pack.');
  I('drop-zone', 'outfit', 33, 'Farmer', 'common', '#5A9AD6', '#4A78C2', 'Overalls, a straw hat and a basket of carrots.');
  I('drop-zone', 'outfit', 34, 'Mail Carrier', 'common', '#8EC0EC', '#2A4F8A', 'A cap, shorts and a satchel full of letters.');
  I('drop-zone', 'outfit', 35, 'Lifeguard', 'common', '#E8453C', '#FFD23F', 'A whistle, a sun visor and a rescue float.');
  I('drop-zone', 'outfit', 36, 'Ninja', 'rare', '#3A9BDC', '#FFFFFF', 'A hooded suit in your colour, a sash and a scroll case.');
  I('drop-zone', 'outfit', 37, 'Scarecrow', 'rare', '#C98A4A', '#FFD95A', 'A sack head, patches and straw poking out.');
  I('drop-zone', 'outfit', 38, 'Skeleton', 'rare', '#8A84B0', '#F2EFE8', 'Bones on a lavender suit, and a grinning skull.');
  I('drop-zone', 'outfit', 39, 'Banana Suit', 'epic', '#FFE14A', '#6A4A22', 'A whole banana, with a hole for your face.');
  I('drop-zone', 'outfit', 40, 'Cardboard Box Robot', 'epic', '#C6955A', '#FF6FB5', 'Boxes, tape and a bendy-straw aerial.');
  I('drop-zone', 'pack', 1, 'Rucksack', 'common', '#3A9BDC', '#3FA9F5', 'A roomy pack with two water bottles.');
  I('drop-zone', 'pack', 2, 'Jetpack', 'epic', '#DFE4EA', '#E8453C', 'Two shiny tanks and fins. For looks only.');
  I('drop-zone', 'pack', 3, 'Teddy Bear', 'uncommon', '#C48A52', '#F2DFC0', 'A bear that hugs you from behind.');
  I('drop-zone', 'pack', 4, 'Tortoise Shell', 'uncommon', '#C98A3A', '#8A5A22', 'A shell with plates, carried like a pack.');
  I('drop-zone', 'pack', 5, 'Treasure Chest', 'epic', '#A0663A', '#FFC93C', 'Banded in gold, lock and all.');
  I('drop-zone', 'pack', 6, 'Lunchbox', 'common', '#E8453C', '#F2F2F2', 'A metal lunchbox and a flask.');
  I('drop-zone', 'pack', 7, 'Guitar Case', 'rare', '#E8453C', '#FFC93C', 'A red case with gold catches.');
  I('drop-zone', 'pack', 8, 'Fishbowl', 'epic', '#9FDCFF', '#FF8A1F', 'A goldfish comes along for the drop.');
  I('drop-zone', 'glider', 1, 'Umbrella', 'common', '#E23D3D', '#FFFFFF', 'Red and white panels, held up in one hand. It pops open.');
  I('drop-zone', 'glider', 2, 'Paper Airplane', 'common', '#FBFBF6', '#9CC3EA', 'Folded from a page of ruled notebook paper.');
  I('drop-zone', 'glider', 3, 'Hang Glider', 'uncommon', '#E8453C', '#FFCC33', 'A striped delta sail; you hang flat under it.');
  I('drop-zone', 'glider', 4, 'Kite', 'common', '#2F8FD6', '#FFCC33', 'A four-colour diamond with a tail of bows, flown on two lines.');
  I('drop-zone', 'glider', 5, 'Bedsheet Parachute', 'common', '#9FD0F0', '#FFFFFF', 'Someone is missing a sheet. Little flowers included.');
  I('drop-zone', 'glider', 6, 'Trash Bag Parachute', 'common', '#3A3E45', '#FFD23F', 'A black bag with a yellow drawstring. Probably clean.');
  I('drop-zone', 'glider', 7, 'Cardboard Wings', 'common', '#C69A62', '#D8C79A', 'Cut out of a box and taped to your arms.');
  I('drop-zone', 'glider', 8, 'Dragon Wings', 'epic', '#2F9E6A', '#E8D8A8', 'Green wings on ivory bones, with a claw at each wrist.');
  I('drop-zone', 'glider', 9, 'Bat Wings', 'uncommon', '#5B3F86', '#241A33', 'Purple wings with scalloped edges and quick little flaps.');
  I('drop-zone', 'glider', 10, 'Bunch of Balloons', 'uncommon', '#FF4F5E', '#3FA9F5', 'Eleven balloons, strings gathered in your hands.');
  I('drop-zone', 'glider', 11, 'Lawn Chair with Balloons', 'epic', '#3FAA5C', '#FFC93C', 'Sit back in a folding chair and let the balloons do the work.');
  I('drop-zone', 'glider', 12, 'Magic Carpet', 'epic', '#B3263A', '#F2C14E', 'A red carpet with a gold border and tassels. Ride it crouched.');
  I('drop-zone', 'glider', 13, 'Picnic Blanket', 'uncommon', '#D93B3B', '#FFFFFF', 'Gingham, with the basket still on it.');
  I('drop-zone', 'glider', 14, 'Surfboard', 'rare', '#1AA7A0', '#FFFFFF', 'Surf the sky, arms out for balance.');
  I('drop-zone', 'glider', 15, 'Pizza Slice', 'rare', '#FFCF4D', '#C0392B', 'Cheese, pepperoni and a crust to stand on.');
  I('drop-zone', 'glider', 16, 'Broomstick', 'epic', '#8A5A2E', '#D9B45A', 'Sit astride and hold on with both hands.');
  I('drop-zone', 'glider', 17, 'Giant Leaf', 'common', '#46A64A', '#B5DF7A', 'A big green leaf, held up by its stalk like a parasol.');
  I('drop-zone', 'glider', 18, 'Spinning Maple Seed', 'rare', '#D8A65A', '#8B3A2A', 'Its wing whirls round, and you turn slowly with it.');
  I('drop-zone', 'glider', 19, 'Rubber Duck Float', 'rare', '#FFD23F', '#FF8A1F', 'A bath duck ring round your middle.');
  I('drop-zone', 'glider', 20, 'Giant Pigeon', 'legendary', '#8D96A3', '#5D8A6E', 'A city pigeon that carries you by the shoulders.');
  I('drop-zone', 'glider', 21, 'Pterodactyl', 'legendary', '#B8743A', '#C0392B', 'Leathery wings, a long beak and a firm grip.');
  I('drop-zone', 'glider', 22, 'Flying Squirrel Suit', 'epic', '#B07040', '#F2DFC0', 'Spread your arms and legs; the suit does the gliding.');
  I('drop-zone', 'glider', 23, 'UFO Disc', 'legendary', '#C8D0D8', '#9DFF9D', 'Stand on a silver saucer with lights going round.');
  I('drop-zone', 'glider', 24, 'Small Cloud', 'epic', '#F6F9FF', '#C9D6E6', 'A puffy little cloud to stand in.');
  I('drop-zone', 'trail', 1, 'Smoke', 'common', '#E2E4E8', '#9AA3AD', 'Soft grey puffs behind you.');
  I('drop-zone', 'trail', 2, 'Sparkles', 'uncommon', '#FFE45C', '#FFFFFF', 'Twinkling stars as you fall.');
  I('drop-zone', 'trail', 3, 'Rainbow', 'epic', '#FF4F4F', '#3FA9F5', 'A band of six colours, from both wing tips.');
  I('drop-zone', 'trail', 4, 'Feathers', 'common', '#FFFFFF', '#E6E8EE', 'White feathers that float down slowly.');
  I('drop-zone', 'trail', 5, 'Leaves', 'common', '#E8782E', '#8BB04A', 'Autumn leaves tumbling in your wake.');
  I('drop-zone', 'trail', 6, 'Bubbles', 'rare', '#CFF6FF', '#FFFFFF', 'Soap bubbles that drift up and pop.');
  I('drop-zone', 'wrap', 1, 'Gold', 'legendary', '#FFC93C', '#C98A12', 'Shiny gold all over. The orange tip stays orange.');
  I('drop-zone', 'wrap', 2, 'Chrome', 'epic', '#DDE6F0', '#6B7785', 'A mirror finish that catches the sky.');
  I('drop-zone', 'wrap', 3, 'Wood Grain', 'common', '#9A6A3C', '#6E4A26', 'Polished wood, grain and all.');
  I('drop-zone', 'wrap', 4, 'Forest Camo', 'common', '#33421F', '#6B4D2E', 'Greens and browns in big blotches.');
  I('drop-zone', 'wrap', 5, 'Desert Camo', 'common', '#D6B784', '#8C6842', 'Sand, tan and brown.');
  I('drop-zone', 'wrap', 6, 'Arctic Camo', 'common', '#F4F6FF', '#8FA3B8', 'White and cold greys.');
  I('drop-zone', 'wrap', 7, 'Pixel Camo', 'uncommon', '#5C6B4A', '#2E3A2A', 'Blocky camouflage in small squares.');
  I('drop-zone', 'wrap', 8, 'Neon Outline', 'epic', '#0D0F1C', '#3EE6FF', 'Dark with glowing edges.');
  I('drop-zone', 'wrap', 9, 'Toy Blaster', 'uncommon', '#2470F5', '#FF8A1F', 'Bright blue and orange, like a toy from a shop window.');
  I('drop-zone', 'wrap', 10, 'Cardboard', 'common', '#BF915C', '#E0D1AB', 'Made from a box, with a strip of tape.');
  I('drop-zone', 'wrap', 11, 'Candy Cane', 'uncommon', '#DB1A1F', '#F8F4EC', 'Red and white stripes with a thin green line.');
  I('drop-zone', 'wrap', 12, 'Lava', 'epic', '#2A1410', '#FF7A1F', 'Dark rock with glowing cracks.');
  I('drop-zone', 'wrap', 13, 'Ice', 'rare', '#BDE6F7', '#FFFFFF', 'Frosty blue with white streaks.');
  I('drop-zone', 'wrap', 14, 'Galaxy', 'epic', '#2A0F5C', '#FF7AE0', 'Deep space with twinkling stars.');
  I('drop-zone', 'wrap', 15, 'Rust', 'common', '#A5521E', '#878A8F', 'Old metal going orange.');
  I('drop-zone', 'wrap', 16, 'Graffiti', 'rare', '#FF4FB4', '#38F2C8', 'Bright paint splashes with dark outlines.');
  I('drop-zone', 'wrap', 17, 'Bubblegum Pink', 'common', '#FF80B8', '#FFC2DD', 'Pink and shiny.');
  I('drop-zone', 'wrap', 18, 'Hazard Stripes', 'rare', '#FFCC14', '#121214', 'Yellow and black, keep clear.');
  I('drop-zone', 'wrap', 19, 'Plastic Brick', 'epic', '#DB1F1A', '#1A5CDB', 'Coloured toy bricks with studs on top.');
  I('drop-zone', 'build', 1, 'Cardboard', 'common', '#B98B56', '#DECEA0', 'Box card with packing tape and a this-way-up mark.');
  I('drop-zone', 'build', 2, 'Frosted Glass', 'uncommon', '#D4EAF3', '#94ADB8', 'Frosted panes in a frame. You still cannot see through it.');
  I('drop-zone', 'build', 3, 'Ice', 'uncommon', '#A6D9EE', '#FFFFFF', 'Blocks of ice with cracks and bubbles.');
  I('drop-zone', 'build', 4, 'Candy', 'epic', '#FF9FC7', '#9FF0D0', 'Pastel stripes with sprinkles.');
  I('drop-zone', 'build', 5, 'Stone', 'common', '#8D8F94', '#6B6E73', 'Grey blocks and mortar.');
  I('drop-zone', 'build', 6, 'Scrap Metal', 'rare', '#8E9499', '#9A5A32', 'Patched plates, rivets and a little rust.');
  I('drop-zone', 'emote', 1, 'Wave', 'common', '#FFD23F', '#3A9BDC', 'A big friendly wave.');
  I('drop-zone', 'emote', 2, 'Dance', 'uncommon', '#FF6FB5', '#3EE6D0', 'Side to side with the arms going.');
  I('drop-zone', 'emote', 3, 'Clap', 'common', '#FFC93C', '#FFFFFF', 'A round of applause.');
  I('drop-zone', 'emote', 4, 'Jumping Jacks', 'common', '#5FD068', '#FFFFFF', 'Arms up, feet apart, again.');
  I('drop-zone', 'emote', 5, 'Robot', 'uncommon', '#B9C2CC', '#3A7AD0', 'Stiff arms, sharp turns.');
  I('drop-zone', 'emote', 6, 'Twirl', 'rare', '#B46CFF', '#FFD23F', 'Arms out, spin round, one foot up.');
  I('drop-zone', 'victory', 1, 'Champion', 'epic', '#FFC93C', '#E8453C', 'Both fists up, bouncing.');
  I('drop-zone', 'victory', 2, 'Flex', 'uncommon', '#E8742A', '#FFFFFF', 'Show those arms.');
  I('drop-zone', 'victory', 3, 'Take a Bow', 'rare', '#8A5A2B', '#F2EFE8', 'A deep, slow bow to the crowd.');
  I('drop-zone', 'victory', 4, 'Jump for Joy', 'epic', '#5FD068', '#FFD23F', 'Jumping up and down with arms wide.');
  // Items a game hands over itself are in no pack: give is 'free' (anyone may wear it; the game grants it the first time it
  // is worn) or 'earned' (the game grants it when it is won). grant(id), below, only adds these.
  GAME_ITEMS.forEach(function (it) { if (it.game !== 'slipstream') return; if (it.slot === 'sponsor' || (it.slot === 'helmet' && it.no <= 8)) it.give = 'free'; else if (it.slot === 'livery' && it.no > 8 && / colours\. Earned by finishing its challenges\.$/.test(it.desc)) it.give = 'earned'; });   // only sponsors' liveries are earned
  function gameItems(game, slot) { return GAME_ITEMS.filter(function (it) { return it.game === game && (!slot || it.slot === slot); }); }
  function itemIds(names) { return names.map(function (n) { if (!ITEM_BY_ID[n]) throw new Error('cosmetics: no item ' + n); return n; }); }
  function itemPack(id, game, name, desc, ids) { ids = itemIds(ids); return { id: id, kind: 'items', game: game, name: name, desc: desc, price: sumPrice(ids), contents: { items: ids } }; }
  // Any skin, accessory or game item by id, and the sum of their prices (whole mangos).
  function anyItem(id) { return SKINS_BY_ID[id] || ACC_BY_ID[id] || ITEM_BY_ID[id] || null; }
  function sumPrice(ids) { return ids.reduce(function (t, id) { return t + PRICE[anyItem(id).rarity]; }, 0); }

  // ---------------- Packs ----------------
  // kind: 'draws' (chests: contents.draws), 'skins' (contents.skins), 'accessories' (contents.acc), 'items' (contents.items:
  // game items, see above; game says which game). price: whole mangos; for skin, accessory and item packs it is the sum of
  // the items' PRICE. Emerald packs (real money) are wallet.js's EMERALD_PACKS. One item on its own is offered as
  // 'item:<id>' (pack(), below), kind 'one'.
  function skinIds(theme, rarities) { return SKINS.filter(function (s) { return s.theme === theme && rarities.indexOf(s.rarity) >= 0; }).map(function (s) { return s.id; }); }
  function accIds(slot) { return ACCESSORIES.filter(function (a) { return a.slot === slot && a.rarity !== 'legendary'; }).map(function (a) { return a.id; }); }
  var CR = ['common', 'uncommon', 'rare'];
  var PACKS = [
    { id: 'draw-1', kind: 'draws', name: 'One chest', desc: 'One skin at the chest odds.', price: CHEST_PRICE, contents: { draws: 1 } },
    { id: 'draw-5', kind: 'draws', name: 'Five chests', desc: 'Five skins at the chest odds.', price: 5 * CHEST_PRICE, contents: { draws: 5 } },
    { id: 'draw-10', kind: 'draws', name: 'Ten chests', desc: 'Ten skins at the chest odds.', price: 10 * CHEST_PRICE, contents: { draws: 10 } },
    { id: 'skins-space', kind: 'skins', name: 'Launch Bay', desc: 'Two space suits for the trip up.', price: 0, contents: { skins: skinIds('space', CR) } },
    { id: 'skins-ocean', kind: 'skins', name: 'Deep End', desc: 'Two looks for the beach and the reef.', price: 0, contents: { skins: skinIds('ocean', CR) } },
    { id: 'skins-neon', kind: 'skins', name: 'After Dark', desc: 'Two glowing looks for the night.', price: 0, contents: { skins: skinIds('neon', CR) } },
    { id: 'skins-candy', kind: 'skins', name: 'Sweet Tooth', desc: 'Three sugary looks.', price: 0, contents: { skins: skinIds('candy', CR) } },
    { id: 'skins-robot', kind: 'skins', name: 'Workshop', desc: 'Two robots, freshly oiled.', price: 0, contents: { skins: skinIds('robot', CR) } },
    { id: 'skins-animals', kind: 'skins', name: 'Wild Things', desc: 'A cat, a bear, a bunny and a fox.', price: 0, contents: { skins: skinIds('animals', CR) } },
    { id: 'skins-seasons', kind: 'skins', name: 'All Year Round', desc: 'One look for every season.', price: 0, contents: { skins: skinIds('seasons', CR) } },
    { id: 'skins-wild', kind: 'skins', name: 'Far Lands', desc: 'Desert wanderer and lava walker.', price: 0, contents: { skins: SKINS.filter(function (s) { return s.theme === 'desert' || s.theme === 'volcano'; }).map(function (s) { return s.id; }) } },
    { id: 'acc-hats', kind: 'accessories', name: 'Hat Box', desc: 'Five hats for any head.', price: 0, contents: { acc: accIds('hat') } },
    { id: 'acc-glasses', kind: 'accessories', name: 'Eyewear Case', desc: 'Four ways to look at things.', price: 0, contents: { acc: accIds('glasses') } },
    { id: 'acc-capes', kind: 'accessories', name: 'Cape Rack', desc: 'Three capes that flap nicely.', price: 0, contents: { acc: accIds('cape') } },
    { id: 'acc-trails', kind: 'accessories', name: 'Trail Kit', desc: 'Three things to leave behind you.', price: 0, contents: { acc: accIds('trail') } },
    { id: 'acc-auras', kind: 'accessories', name: 'Glow Jar', desc: 'Three auras to float around you.', price: 0, contents: { acc: accIds('aura') } },
    { id: 'acc-pets', kind: 'accessories', name: 'Pet Carrier', desc: 'Four little friends to follow you about.', price: 0, contents: { acc: accIds('pet') } },
    { id: 'acc-drake', kind: 'accessories', name: 'Dragon Egg', desc: 'Hatches into the Baby Drake. Legendary.', price: 0, contents: { acc: ['baby-drake'] } },
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
    itemPack('ss-extras', 'slipstream', 'Pit Wall Party', 'Five tyre smoke colours and two podium celebrations.', ['ss-smoke-pink-tyre-smoke', 'ss-smoke-blue-tyre-smoke', 'ss-smoke-green-tyre-smoke', 'ss-smoke-purple-tyre-smoke', 'ss-smoke-gold-tyre-smoke', 'ss-podium-confetti-podium', 'ss-podium-fireworks-podium'])
  ];
  // Skin and accessory packs cost the sum of their items' prices, like the game item packs.
  PACKS.forEach(function (p) { if (p.kind === 'skins' || p.kind === 'accessories') p.price = sumPrice(p.contents.skins || p.contents.acc); });
  var PACKS_BY_ID = {}; PACKS.forEach(function (p) { PACKS_BY_ID[p.id] = p; });
  // A pack by id, or one item on its own as 'item:<id>' (at its rarity's PRICE). Items a game hands over itself (give) are
  // not sold. Emerald pack ids (wallet.js) give null here.
  var ONE = {};
  function pack(id) {
    if (PACKS_BY_ID[id]) return PACKS_BY_ID[id];
    var m = /^item:(.+)$/.exec(String(id || '')), it = m && anyItem(m[1]);
    if (!it || it.give) return null;
    if (!ONE[id]) {
      var c = SKINS_BY_ID[it.id] ? { skins: [it.id] } : ACC_BY_ID[it.id] ? { acc: [it.id] } : { items: [it.id] };
      ONE[id] = { id: id, kind: 'one', game: it.game, name: it.name, desc: it.desc, price: PRICE[it.rarity], contents: c };
    }
    return ONE[id];
  }

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
  // Captains (captains.js: miles.js's OWNERS, not Vice Captains) own everything while the cosmetics are on: load() then
  // lists every skin, accessory and game item as owned, and save() writes back only what they really own (L.raw), so
  // nothing they didn't buy is ever saved, mirrored into their account or kept after they sign out. load(true) is the
  // real locker alone (the account mirror and buying use it).
  function cap() { try { return !!(on() && SHARED && SHARED.captain && SHARED.captain()); } catch (e) { return false; } }
  function load(raw) {
    var o = json(ls(KEY)), L = { v: 1, s: [], a: [], g: [], e: { skin: '' }, ge: {} };
    SLOTS.forEach(function (k) { L.e[k] = ''; });
    if (!obj(o) || o.v !== 1) o = {};
    if (Array.isArray(o.s)) o.s.forEach(function (id) { if (SKINS_BY_ID[id] && L.s.indexOf(id) < 0) L.s.push(id); });
    if (Array.isArray(o.a)) o.a.forEach(function (id) { if (ACC_BY_ID[id] && L.a.indexOf(id) < 0) L.a.push(id); });
    if (Array.isArray(o.g)) o.g.forEach(function (id) { if (ITEM_BY_ID[id] && L.g.indexOf(id) < 0) L.g.push(id); });
    if (!raw && cap()) {
      Object.defineProperty(L, 'raw', { value: { s: L.s, a: L.a, g: L.g }, enumerable: false });
      L.s = SKINS.map(function (x) { return x.id; }); L.a = ACCESSORIES.map(function (x) { return x.id; }); L.g = GAME_ITEMS.map(function (x) { return x.id; });
    }
    if (obj(o.ge)) Object.keys(o.ge).forEach(function (k) { var it = ITEM_BY_ID[o.ge[k]]; if (it && it.game + ':' + it.slot === k && L.g.indexOf(it.id) >= 0) L.ge[k] = it.id; });
    if (obj(o.e)) {
      if (L.s.indexOf(o.e.skin) >= 0) L.e.skin = o.e.skin;
      SLOTS.forEach(function (k) { var a = ACC_BY_ID[o.e[k]]; if (a && a.slot === k && L.a.indexOf(a.id) >= 0) L.e[k] = a.id; });
    }
    return L;
  }
  function save(L) {
    if (L.raw) { var r = L.raw; L = { v: 1, s: r.s, a: r.a, g: r.g, e: L.e, ge: L.ge }; }   // a captain: only what they really own
    if (!L.g.length && !Object.keys(L.ge || {}).length) { delete L.g; delete L.ge; }      // no game items: the saved locker is exactly what it was before they existed
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
    var L = load(true); if (L.g.indexOf(id) >= 0) return false;
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
    var L = load(true);
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
    var L = load(true), changed = false;
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
    var p = pack(packId); if (!p) return null;
    var L = load(), items = (p.contents.skins || []).concat(p.contents.acc || [], p.contents.items || []);
    var have = items.filter(function (id) { return L.s.indexOf(id) >= 0 || L.a.indexOf(id) >= 0 || L.g.indexOf(id) >= 0; }).length;
    return { pack: p, items: items.length, have: have, all: items.length > 0 && have === items.length };
  }
  // buy(packId, opts) → { ok, reason?, spent (mangos), got: { skins: [], acc: [], items: [], draws: [{ rarity, skin, dup }] }, refund (mangos), balance }
  // packId: a PACKS id, or 'item:<id>' for one item. opts.next: a random-number source for chests (tests). Reasons: off,
  // unknown, money (emerald packs: wallet.js EMERALD_PACKS and PAYMENTS), owned (you already own everything in it),
  // wallet (no wallet.js), funds (not enough mangos).
  function emeraldPack(id) { var w = W(); return w && w.EMERALD_PACKS ? w.EMERALD_PACKS.filter(function (e) { return e.id === id; })[0] : null; }
  function buy(packId, opts) {
    var p = pack(packId);
    if (!on()) return { ok: false, reason: 'off' };
    if (!p && emeraldPack(packId)) return { ok: false, reason: 'money', checkout: W().PAYMENTS.checkout(packId) };
    if (!p) return { ok: false, reason: 'unknown' };
    var pv = preview(packId);
    if (pv.all) return { ok: false, reason: 'owned' };
    var w = W(); if (!w) return { ok: false, reason: 'wallet' };
    var free = !!(w.unlimited && w.unlimited());     // a captain: never charged (wallet.js spend() takes nothing)
    if (!free && w.balance() < p.price) return { ok: false, reason: 'funds', need: p.price - w.balance() };
    if (w.spend(p.price, 'Bought ' + p.name) === false) return { ok: false, reason: 'funds' };
    var f = fill(p, opts);
    if (f.refund) w.earn(f.refund, f.dups === 1 ? 'Back for a duplicate' : 'Back for ' + f.dups + ' duplicates');
    return { ok: true, pack: p.id, spent: free ? 0 : p.price, got: f.got, refund: f.refund, balance: w.balance() };
  }
  // Put what a pack (or one item, or chests) holds into the real locker, opening chests here. Pays nothing: the caller
  // pays the refund for duplicates (buy() above, or wallet.js's grant() for a gift). -> { got, dups, refund }
  function fill(p, opts) {
    var L = load(true), got = { skins: [], acc: [], items: [], draws: [] }, dups = 0, next = opts && opts.next;
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
    return { got: got, dups: dups, refund: dups * DUP_REFUND };
  }
  // A gift arriving (wallet.js's grant('gift'), the only caller): fill the locker with what packId holds, free.
  function receive(packId, opts) { var p = pack(packId); if (!on() || !p) return null; var f = fill(p, opts); f.pack = p; return f; }

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
      a.appendChild(document.createTextNode((w ? w.format(null, true) : '0') + ' · Shop'));   // null: the balance, or ∞ for a captain
      a.title = w ? w.format() : '';
    };
    draw();
    document.addEventListener('backroom:wallet', draw);
    document.addEventListener('backroom:captain', draw);
    var acct = slot.querySelector('#acct');
    if (acct) slot.insertBefore(a, acct); else slot.appendChild(a);
  }

  // ---------------- API ----------------
  var api = {
    ENABLED: ENABLED,
    on: on,
    SKINS: SKINS, ACCESSORIES: ACCESSORIES, SKINS_BY_ID: SKINS_BY_ID, ACCESSORIES_BY_ID: ACC_BY_ID, SLOTS: SLOTS, SLOT_NAMES: SLOT_NAMES,
    RARITY: RARITY, RARITY_BY_ID: RARITY_BY_ID, RARITY_TOTAL: RARITY_TOTAL, PACKS: PACKS, PACKS_BY_ID: PACKS_BY_ID,
    PRICE: PRICE, CHEST_PRICE: CHEST_PRICE, DUP_REFUND: DUP_REFUND, pack: pack,
    roll: roll, seeded: seeded, below: below,
    owned: function () { if (!on()) return { skins: [], accessories: [], items: [] }; var L = load(); return { skins: L.s.slice(), accessories: L.a.slice(), items: L.g.slice() }; },
    GAMES: GAMES, GAME_ITEMS: GAME_ITEMS, GAME_ITEMS_BY_ID: ITEM_BY_ID, ITEM_PRICE: PRICE, gameItems: gameItems, gameEquipped: gameEquipped, itemSvg: itemSvg,
    grant: grant,
    equip: equip, unequip: unequip, equipped: equipped,
    preview: preview, buy: buy, _receive: receive, captain: cap,
    // The skin and accessory ids an account's mirrored locker (wallet.js's cleaned w: s and a bitmasks) holds.
    _owns: function (r) { return fromMask(r && r.s).map(function (n) { return SKIN_BY_NO[n]; }).concat(fromMask(r && r.a).map(function (n) { return ACC_BY_NO[n]; })).filter(Boolean).map(function (x) { return x.id; }); }, draw: function (n, opts) { return buy('draw-' + (n === 5 || n === 10 ? n : 1), opts); },
    avatarSvg: avatarSvg, texture: texture,
    _mirror: function () { return on() ? mirror() : null; }, _join: join, _adopt: adopt
  };
  window.BackRoomCosmetics = api;
  if (navigator.webdriver) window.__cos = { load: load, toMask: toMask, fromMask: fromMask, parseEq: parseEq, eqString: eqString, reset: function () { ls(KEY, null); } };
  if (HUB) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hubChip); else hubChip(); }
})();
