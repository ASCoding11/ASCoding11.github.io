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
 * THE REAL SWITCH is wallet.js's PAYMENTS.enabled: true opens the shop for everyone with the server wallet (server()
 * below; functions/_wallet.js): balance, locker and every purchase, chest and gift come from and go to the server. The
 * browser-only locker and wallet (the old local mode) are kept only for the ?cosmetics=1 test switch. ENABLED, if set,
 * also opens the shop with the server wallet.
 * CAPTAINS' PREVIEW (CAPTAIN_PREVIEW, below): while PAYMENTS.enabled is false, a captain who opens the shop page gets the
 * real shop with the server wallet in that browser tab (sessionStorage 'cosmetics:preview', set by shop/ once
 * captains.js confirms the captain), so the owners can try the whole flow on the live site; everyone else still sees
 * "not open yet", and the server refuses everyone but captains until PAYMENTS.enabled is true. Turn the preview off
 * by setting CAPTAIN_PREVIEW to false (?preview=0 on the shop page also ends it for that tab).
 * Apart from that preview, the site's captains are NOT let in here early. captains.js lets them see the games' own screens (Driftfall's Locker,
 * Boostball's garage and Kit, Slipstream's Garage), where every item is free to wear while this file is off; the
 * shop, the wallet, earning and buying stay shut for them like everyone else, so on() asks captains.js's open(), which
 * leaves captains out, not may().
 *
 * What there is:
 *   SKINS        100 full looks in five rarities (31-100 added 19 Nov 2026: sports, pirates, suits, robots and more). Each has an avatar look (drawn over avatar.js's face: a background pattern,
 *                an outfit, something on the head, maybe a skin tone) and a colour set for 3D games:
 *                colors { body, accent, trim, emissive, pattern } (hex colours; pattern names a texture that texture()
 *                paints, so a game can use it as a THREE.CanvasTexture).
 *   ACCESSORIES  59 extras (24-59 added 19 Nov 2026), each in one SLOT (hat, glasses, cape, trail, aura, pet): one per slot can be worn with any skin.
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
 *   { attach: 'head' | 'face' | 'back' | 'neck' | 'feet' | 'around' | 'follow', shape, color, color2, size }
 * ('neck': a bow tie or chain, worn in the cape slot; wave 2 items may add trim, num or opts for the 2D drawing.)
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

  var ENABLED = false;   // false keeps every part of the cosmetics hidden (see THE REAL SWITCH above: wallet.js PAYMENTS.enabled)
  var CAPTAIN_PREVIEW = true;   // the captains' preview of the real shop (see above); false turns it off for everyone
  var PREVIEW_KEY = 'cosmetics:preview';

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
  function on() { return server() || FLAG; }
  // The server wallet is in use: PAYMENTS.enabled (wallet.js), ENABLED, or the captains' preview on the shop page.
  // Otherwise, with the test switch alone, the old browser-only mode.
  function payments() { try { var w = window.BackRoomWallet; return !!(w && w.PAYMENTS && w.PAYMENTS.enabled); } catch (e) { return false; } }
  function shopPage() { try { return /^\/e63334287a3deaa3\/shop(\/(index\.html)?)?$/.test(location.pathname); } catch (e) { return false; } }
  function previewOn() { if (!CAPTAIN_PREVIEW || !shopPage()) return false; try { return sessionStorage.getItem(PREVIEW_KEY) === '1'; } catch (e) { return false; } }
  function server() { return !!(api.ENABLED || payments() || previewOn()); }
  // shop/ calls these: start the preview once captains.js has confirmed a captain; stop it when that changes.
  function previewAllowed() { return CAPTAIN_PREVIEW && shopPage() && !payments() && !api.ENABLED; }
  function startPreview() {
    if (!previewAllowed() || !(SHARED && SHARED.captain && SHARED.captain())) return false;
    try { sessionStorage.setItem(PREVIEW_KEY, '1'); } catch (e) { return false; }
    return previewOn();
  }
  function stopPreview() { try { sessionStorage.removeItem(PREVIEW_KEY); } catch (e) {} }
  try { if (/[?&]preview=0(&|$)/.test(location.search)) stopPreview(); } catch (e) {}

  // ---------------- Skins ----------------
  // look: bg / bg2 background colours, bgp background pattern, outfit, head (piece on the head), tone (skin colour, optional),
  // (wave 2 looks may also have face, fx, num, h1 / h2, nohat and a few part options: see "Wave 2 parts" below),
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
      { body: '#4E9E6A', accent: '#FFC93C', trim: '#E07A2E', emissive: '#BFE4FF', pattern: 'quarters' }),
    // ---- Wave 2 (19 Nov 2026): sports, pirates, suits, robots and more. Numbers 31 onwards. ----
    // Sports
    S(31, 'striker', 'Striker', 'common', 'sports', 'Shin pads on, laces tied, aiming for the top corner.',
      { nohat: true, bg: '#2E9E4F', bg2: '#7BD88F', bgp: 'pitch', outfit: 'kit', num: 9, band: true },
      { body: '#E5484D', accent: '#FFFFFF', trim: '#9E1F25', emissive: '#FFD23F', pattern: 'stripes' }),
    S(32, 'point-guard', 'Point Guard', 'common', 'sports', 'Calls the play, dribbles low, passes before anyone sees it.',
      { bg: '#D9873A', bg2: '#A85A1E', bgp: 'court', outfit: 'tank', num: 3, head: 'band', h1: '#FFFFFF', h2: '#2E5FD9' },
      { body: '#2E5FD9', accent: '#FFFFFF', trim: '#173A8C', emissive: '#FFD23F', pattern: 'plain' }),
    S(33, 'lineman', 'Lineman', 'common', 'sports', 'Big pads, bigger heart, never lets anyone through.',
      { bg: '#2E7D3E', bg2: '#FFFFFF', bgp: 'stripes', outfit: 'pads', num: 72, head: 'fbhelm', h1: '#7A1F2B', h2: '#F5C542', face: 'eyeblack' },
      { body: '#7A1F2B', accent: '#9E2A38', trim: '#F5C542', emissive: '#DDE3EA', pattern: 'plain' }),
    S(34, 'slugger', 'Slugger', 'common', 'sports', 'Steps up to the plate and points at the far fence.',
      { bg: '#4FA8E0', bg2: '#FFFFFF', bgp: 'dots', outfit: 'kit', num: 24, head: 'cap', h1: '#1F3A6E', h2: '#E5484D' },
      { body: '#F4F1EA', accent: '#1F3A6E', trim: '#E5484D', emissive: '#FFFFFF', pattern: 'pinstripes' }),
    S(35, 'puck-chaser', 'Puck Chaser', 'common', 'sports', 'Fast skates, a quick stick and ice in the eyebrows.',
      { bg: '#DDEFFF', bg2: '#9CC8EE', bgp: 'rink', outfit: 'kit', num: 19, band: true, head: 'hockey', h1: '#1B1513', h2: '#F28C28' },
      { body: '#F28C28', accent: '#1B1513', trim: '#FFFFFF', emissive: '#FFE0B8', pattern: 'stripes' }),
    S(36, 'baseline-ace', 'Baseline Ace', 'common', 'sports', 'Crisp whites and a serve nobody has returned yet.',
      { bg: '#4FAE5A', bg2: '#FFFFFF', bgp: 'pitch', outfit: 'polo', head: 'visorcap', h1: '#FFFFFF', h2: '#2EC4B6' },
      { body: '#FFFFFF', accent: '#2EC4B6', trim: '#D9DEE6', emissive: '#E8FF6B', pattern: 'plain' }),
    S(37, 'sprinter', 'Sprinter', 'common', 'sports', 'On your marks, get set, already at the finish line.',
      { bg: '#D9583B', bg2: '#FFFFFF', bgp: 'track', outfit: 'tank', num: 1, head: 'band', h1: '#FFD23F', h2: '#1B1513' },
      { body: '#FFD23F', accent: '#1B1513', trim: '#E59A0B', emissive: '#FFF6C2', pattern: 'plain' }),
    S(38, 'lap-swimmer', 'Lap Swimmer', 'common', 'sports', 'Fifty lengths before breakfast, and still smiling.',
      { bg: '#1E9FD9', bg2: '#BDF0FF', bgp: 'waves', outfit: 'wetsuit', head: 'swim', h1: '#E5484D', h2: '#FFFFFF', face: 'goggles', gl: '#7FE7FF', gc: '#E5484D' },
      { body: '#14385C', accent: '#1E9FD9', trim: '#0B2238', emissive: '#7FE7FF', pattern: 'waves' }),
    S(39, 'fairway-pro', 'Fairway Pro', 'common', 'sports', 'A tidy swing, a tidy collar, and a lucky tee behind one ear.',
      { bg: '#8CCB6E', bg2: '#C9EBAE', bgp: 'pitch', outfit: 'polo', head: 'flatcap', h1: '#C9A46B', h2: '#8A6A3A' },
      { body: '#F7B2C4', accent: '#3E8A2E', trim: '#D98AA0', emissive: '#FFFFFF', pattern: 'checker' }),
    S(40, 'skate-rat', 'Skate Rat', 'common', 'sports', 'Scuffed shoes, a backwards cap and one more try at the trick.',
      { bg: '#6B6F7A', bg2: '#A9ADB8', bgp: 'bricks', outfit: 'hoodie', head: 'capback', h1: '#2EC4B6', h2: '#1B1513' },
      { body: '#3A3F4B', accent: '#FF7A2E', trim: '#1B1F27', emissive: '#2EC4B6', pattern: 'plain' }),
    S(41, 'surf-rider', 'Surf Rider', 'common', 'sports', 'Waits all morning for the one perfect wave.',
      { nohat: true, bg: '#2BB3D9', bg2: '#FFFFFF', bgp: 'waves', outfit: 'wetsuit', hairc: 4 },
      { body: '#1B1F27', accent: '#2EC4B6', trim: '#0E1116', emissive: '#FFD23F', pattern: 'waves' }),
    S(42, 'slope-racer', 'Slope Racer', 'common', 'sports', 'Tucked low between the gates, down the mountain in a blur.',
      { bg: '#BFE4FF', bg2: '#FFFFFF', bgp: 'snow', outfit: 'racesuit', head: 'skihelm', h1: '#E5484D', h2: '#FFFFFF' },
      { body: '#E5484D', accent: '#FFFFFF', trim: '#1B1513', emissive: '#FFB13D', pattern: 'stripes' }),
    S(43, 'referee', 'Referee', 'uncommon', 'sports', 'Fair to both sides, and the loudest whistle in the building.',
      { bg: '#3F8F4F', bg2: '#7BD88F', bgp: 'pitch', outfit: 'vstripes', head: 'cap', h1: '#1B1513', h2: '#1B1513', logo: 'none' },
      { body: '#FFFFFF', accent: '#1B1513', trim: '#1B1513', emissive: '#FFFFFF', pattern: 'vstripes' }),
    S(44, 'coach', 'Coach', 'uncommon', 'sports', 'Clipboard, whistle and a speech that wins the second half.',
      { bg: '#33415C', bg2: '#5A6B8C', bgp: 'grid', outfit: 'polo', whistle: true, head: 'cap', h1: '#1F3A6E', h2: '#FFD23F', face: 'stache' },
      { body: '#1F3A6E', accent: '#E5484D', trim: '#FFD23F', emissive: '#FFFFFF', pattern: 'plain' }),
    S(45, 'prizefighter', 'Prizefighter', 'uncommon', 'sports', 'A shiny robe, padded headgear and very quick feet.',
      { bg: '#2A1E3A', bg2: '#FFFFFF', bgp: 'spot', outfit: 'boxrobe', num: 1, head: 'boxhead', h1: '#D93636', h2: '#FFFFFF' },
      { body: '#D93636', accent: '#F5C542', trim: '#7A1414', emissive: '#FFE79A', pattern: 'plain' }),
    S(46, 'black-belt', 'Black Belt', 'uncommon', 'sports', 'Years of practice, a calm mind and a very loud kiai.',
      { bg: '#F2E6CF', bg2: '#C9A46B', bgp: 'checker', outfit: 'gi', head: 'hachimaki', h1: '#D93636', h2: '#FFFFFF' },
      { body: '#FFFFFF', accent: '#1B1513', trim: '#D9DEE6', emissive: '#D93636', pattern: 'plain' }),
    S(47, 'fencer', 'Fencer', 'uncommon', 'sports', 'En garde! A mesh mask, a white jacket and perfect footwork.',
      { bg: '#2E3A55', bg2: '#8FA3B8', bgp: 'stripes', outfit: 'polo', head: 'fencing', h1: '#FFFFFF' },
      { body: '#FFFFFF', accent: '#3D8BFF', trim: '#C8D2DC', emissive: '#E8ECF2', pattern: 'plain' }),
    S(48, 'cheer-captain', 'Cheer Captain', 'uncommon', 'sports', 'Leads every chant, and the bow is not optional.',
      { bg: '#FF7EB9', bg2: '#FFFFFF', bgp: 'confetti', outfit: 'kit', head: 'bow', h1: '#FFD23F', h2: '#FFFFFF', hair: 10 },
      { body: '#7A3DB8', accent: '#FFD23F', trim: '#FFFFFF', emissive: '#FFB3E6', pattern: 'stripes' }),
    S(49, 'pole-position', 'Pole Position', 'rare', 'sports', 'Fastest in qualifying and first into the first corner.',
      { bg: '#1B1F27', bg2: '#FFFFFF', bgp: 'checker', outfit: 'racesuit', head: 'race', h1: '#E5484D', h2: '#FFFFFF', num: 7 },
      { body: '#E5484D', accent: '#FFFFFF', trim: '#1B1513', emissive: '#3DE0FF', pattern: 'stripes' }),
    S(50, 'hawk-mascot', 'Hawk Mascot', 'rare', 'sports', 'The team\'s big feathery friend, flapping on the touchline.',
      { bg: '#1F3A6E', bg2: '#FFD23F', bgp: 'confetti', outfit: 'feathers', head: 'hood', h1: '#8A5A36', h2: '#FFFFFF', crest: true, eyes2: true, beak: '#F5B82E' },
      { body: '#8A5A36', accent: '#6B4428', trim: '#4A2E18', emissive: '#C9A07A', pattern: 'scales' }),
    S(51, 'safe-hands', 'Safe Hands', 'rare', 'sports', 'A goalkeeper who dives the right way every single time.',
      { bg: '#2E9E4F', bg2: '#7BD88F', bgp: 'pitch', outfit: 'kit', num: 1, stars: true, head: 'cap', h1: '#7CE38B', h2: '#1B1513', logo: 'none' },
      { body: '#7CE38B', accent: '#1B1513', trim: '#3E8A2E', emissive: '#E6FFB0', pattern: 'grid' }),
    S(52, 'title-belt', 'Title Belt', 'rare', 'sports', 'A wrestling champ in a glittery cape, belt held high.',
      { bg: '#3A1450', bg2: '#FF4FB4', bgp: 'spot', outfit: 'hero', emblem: 'star', head: 'band', h1: '#FF4FB4', h2: '#F5C542' },
      { body: '#7A2BB8', accent: '#F5C542', trim: '#3A1450', emissive: '#FF4FB4', pattern: 'stars' }),
    S(53, 'gold-medalist', 'Gold Medalist', 'epic', 'sports', 'A personal best on the biggest day, with the medal to prove it.',
      { bg: '#1F3A6E', bg2: '#FFE79A', bgp: 'rays', outfit: 'kit', medal: true, head: 'laurel', h1: '#7CB342', h2: '#3E6B1F', fx: 'twinkle' },
      { body: '#FFFFFF', accent: '#1F3A6E', trim: '#3D8BFF', emissive: '#FFE79A', pattern: 'plain' }),
    S(54, 'all-star', 'All-Star', 'epic', 'sports', 'Voted in by everyone, cameras flashing on every play.',
      { bg: '#0E1A3A', bg2: '#5CC8FF', bgp: 'flash', outfit: 'kit', num: 23, stars: true, numc: '#FFD23F', head: 'band', h1: '#FFD23F', h2: '#E5484D', fx: 'twinkle' },
      { body: '#1F3A6E', accent: '#FFD23F', trim: '#E5484D', emissive: '#5CC8FF', pattern: 'stars' }),
    S(55, 'hall-of-famer', 'Hall of Famer', 'legendary', 'sports', 'A golden kit for a career nobody will ever forget.',
      { bg: '#2A1A05', bg2: '#FFE08A', bgp: 'spot', outfit: 'kit', num: 99, medal: true, numc: '#2A1A05', head: 'laurel', h1: '#F5C542', h2: '#B8860B', gem: true, fx: 'shine frame twinkle' },
      { body: '#E8B92E', accent: '#FFF2C2', trim: '#8A6410', emissive: '#FFE08A', pattern: 'stars' }),
    // Pirates
    S(56, 'deckhand', 'Deckhand', 'common', 'pirates', 'Swabs the deck, ties the knots, sings the loudest shanty.',
      { bg: '#C49A6C', bg2: '#8A6A3A', bgp: 'deck', outfit: 'stripes', head: 'bandana', h1: '#D93636', h2: '#FFFFFF' },
      { body: '#FFFFFF', accent: '#1F3A6E', trim: '#1F3A6E', emissive: '#FFD23F', pattern: 'stripes' }),
    S(57, 'sea-dog', 'Sea Dog', 'common', 'pirates', 'One eye patch, one big moustache, a hundred sea stories.',
      { bg: '#2B6E8A', bg2: '#BDF0FF', bgp: 'waves', outfit: 'stripes', head: 'bandana', h1: '#1F3A6E', h2: '#FFFFFF', face: 'patch stache' },
      { body: '#F4F1EA', accent: '#D93636', trim: '#7A1414', emissive: '#FFD23F', pattern: 'stripes' }),
    S(58, 'lookout', 'Lookout', 'common', 'pirates', 'Up in the crow\'s nest, first to shout "Land ho!".',
      { bg: '#7EC8E3', bg2: '#FFFFFF', bgp: 'map', outfit: 'pirate', head: 'bandana', h1: '#2EA36B', h2: '#FFE45C', face: 'patch' },
      { body: '#5C3A20', accent: '#C9A46B', trim: '#3A2418', emissive: '#FFD23F', pattern: 'plain' }),
    S(59, 'first-mate', 'First Mate', 'uncommon', 'pirates', 'The captain\'s right hand. The left one is a shiny hook.',
      { bg: '#1E4E6B', bg2: '#7EC8E3', bgp: 'waves', outfit: 'pirate', hook: true, sash: '#D93636', head: 'bandana', h1: '#1B1513', h2: '#D93636', face: 'patch stache' },
      { body: '#1F3A6E', accent: '#F5C542', trim: '#0E1E3A', emissive: '#FFD23F', pattern: 'plain' }),
    S(60, 'buccaneer', 'Buccaneer', 'uncommon', 'pirates', 'A three-cornered hat, an eye patch and a map with an X on it.',
      { bg: '#E8D5A8', bg2: '#A0522D', bgp: 'map', outfit: 'pirate', head: 'tricorn', h1: '#1B1513', h2: '#F5C542', face: 'patch' },
      { body: '#7A1F2B', accent: '#F5C542', trim: '#4A0F18', emissive: '#FFD23F', pattern: 'plain' }),
    S(61, 'pirate-captain', 'Pirate Captain', 'rare', 'pirates', 'Commands the fastest ship on the seven seas, feather first.',
      { bg: '#123B5A', bg2: '#FFE79A', bgp: 'moon', outfit: 'pirate', sash: '#F5C542', head: 'tricorn', h1: '#1B1513', h2: '#F5C542', feather: '#D93636', face: 'patch stache', sc: '#1B1513' },
      { body: '#B3261E', accent: '#F5C542', trim: '#5C0F0B', emissive: '#FFE79A', pattern: 'plain' }),
    S(62, 'ghost-pirate', 'Ghost Pirate', 'epic', 'pirates', 'Sailed off the map long ago and never quite came back.',
      { bg: '#0B2233', bg2: '#7FFFD4', bgp: 'fog', outfit: 'pirate', head: 'tricorn', h1: '#2A5C66', h2: '#7FFFD4', ragged: true, skullc: '#CFFFF2', face: 'patch', fc: '#1E4450', tone: '#BFF0E6', fx: 'twinkle' },
      { body: '#2A5C66', accent: '#7FFFD4', trim: '#163840', emissive: '#7FFFD4', pattern: 'waves' }),
    S(63, 'pirate-king', 'Pirate King', 'legendary', 'pirates', 'Every pirate on every ocean answers to this crown.',
      { bg: '#2A0A0A', bg2: '#F5C542', bgp: 'map', outfit: 'pirate', sash: '#F5C542', head: 'tricornking', h1: '#3A0F2B', h2: '#F5C542', feather: '#FFFFFF', face: 'patch stache', sc: '#1B1513', fc: '#1B1513', fx: 'shine frame' },
      { body: '#7A0F2B', accent: '#F5C542', trim: '#3A0612', emissive: '#FFE79A', pattern: 'stars' }),
    // Suits and mobsters (costume-party style)
    S(64, 'nine-to-five', 'Nine to Five', 'common', 'suits', 'A sharp suit, a straight tie and a very full inbox.',
      { nohat: true, bg: '#8FA3B8', bg2: '#C9D3EA', bgp: 'skyline', outfit: 'business' },
      { body: '#33415C', accent: '#3D8BFF', trim: '#1E2738', emissive: '#FFFFFF', pattern: 'plain' }),
    S(65, 'tracksuit-tough', 'Tracksuit Tough', 'common', 'suits', 'Shiny tracksuit, flat cap and the chunkiest gold chain in town.',
      { bg: '#4A4E58', bg2: '#8A8F9C', bgp: 'bricks', outfit: 'track', chain: true, head: 'flatcap', h1: '#3A3F4B', h2: '#1B1F27' },
      { body: '#1F3A6E', accent: '#FFFFFF', trim: '#0E1E3A', emissive: '#F5C542', pattern: 'stripes' }),
    S(66, 'banker', 'Banker', 'common', 'suits', 'Counts every coin twice, wears a bowler hat once a day.',
      { bg: '#2E5E4E', bg2: '#7FBFA0', bgp: 'grid', outfit: 'business', pin: '#C8D2DC', head: 'bowler', h1: '#1B1513', h2: '#3A2E2A' },
      { body: '#3A3F4B', accent: '#7A1F2B', trim: '#22262E', emissive: '#C8D2DC', pattern: 'pinstripes' }),
    S(67, 'roaring-twenties', 'Roaring Twenties', 'uncommon', 'suits', 'Pinstripes, a fedora and a jazz band playing somewhere.',
      { bg: '#3A2A1A', bg2: '#C9A46B', bgp: 'bricks', outfit: 'business', pin: '#D9DEE6', head: 'fedora', h1: '#3A3F4B', h2: '#1B1513' },
      { body: '#2B2F3A', accent: '#D93636', trim: '#16181E', emissive: '#F5C542', pattern: 'pinstripes' }),
    S(68, 'gumshoe', 'Gumshoe', 'uncommon', 'suits', 'A private detective in a trench coat, following every clue.',
      { bg: '#2B2F3A', bg2: '#8FA3B8', bgp: 'skyline', outfit: 'trench', head: 'fedora', h1: '#6B5236', h2: '#2B1B12' },
      { body: '#C9A46B', accent: '#7A1F2B', trim: '#8A6A3A', emissive: '#FFE79A', pattern: 'plain' }),
    S(69, 'bodyguard', 'Bodyguard', 'uncommon', 'suits', 'Dark suit, dark shades, and a wire in one ear. Says nothing.',
      { bg: '#1B1F27', bg2: '#5A6273', bgp: 'grid', outfit: 'business', head: 'slick earpiece', h1: '#17110E', face: 'shades' },
      { body: '#1B1F27', accent: '#1B1513', trim: '#0E1116', emissive: '#FFFFFF', pattern: 'plain' }),
    S(70, 'black-tie', 'Black Tie', 'rare', 'suits', 'A perfect tuxedo for the fanciest party of the year.',
      { bg: '#2A1A40', bg2: '#F5C542', bgp: 'sparkle', outfit: 'tux', head: 'slick', h1: '#17110E', pocket: '#F5C542' },
      { body: '#16181E', accent: '#16181E', trim: '#0B0C10', emissive: '#3A3F4B', pattern: 'plain' }),
    S(71, 'secret-agent', 'Secret Agent', 'rare', 'suits', 'Tuxedo, shades and a gadget hidden in the cufflinks.',
      { bg: '#0B1026', bg2: '#E5484D', bgp: 'spot', outfit: 'tux', head: 'slick earpiece', h1: '#2B1B12', face: 'shades' },
      { body: '#16181E', accent: '#16181E', trim: '#0B0C10', emissive: '#3A3F4B', pattern: 'plain' }),
    S(72, 'the-don', 'The Don', 'epic', 'suits', 'Pinstripes, a red rose and an offer you would happily accept.',
      { bg: '#1A1210', bg2: '#8A6A3A', bgp: 'bricks', outfit: 'business', pin: '#C8D2DC', rose: true, chain: false, head: 'fedora', h1: '#E8E2D4', h2: '#1B1513', face: 'stache', sc: '#3A2A20', fx: 'flicker', gc: '#F5C542' },
      { body: '#22262E', accent: '#7A1F2B', trim: '#121418', emissive: '#F5C542', pattern: 'pinstripes' }),
    S(73, 'the-boss', 'The Boss', 'legendary', 'suits', 'Long coat, fur collar, a tall fur hat and gold on everything.',
      { bg: '#0E0C14', bg2: '#5A4A7A', bgp: 'skyline', outfit: 'longcoat', chain: true, head: 'furhat', h1: '#3A2A20', h2: '#F5C542', gem: true, face: 'stache', sc: '#2B1B12', fx: 'shine frame' },
      { body: '#1B1513', accent: '#5C4636', trim: '#7A1F2B', emissive: '#F5C542', pattern: 'plain' }),
    // Robots
    S(74, 'retro-tin-bot', 'Retro Tin Bot', 'common', 'robot', 'Wind the key on its back and it marches off beeping.',
      { bg: '#D9583B', bg2: '#FFD23F', bgp: 'rays', outfit: 'tinbody', head: 'dome', h1: '#B8C2CC', h2: '#E5484D', tone: '#C8D2DC' },
      { body: '#9AA8B6', accent: '#E5484D', trim: '#5A6878', emissive: '#FFD23F', pattern: 'plates' }),
    S(75, 'vacuum-bot', 'Vacuum Bot', 'common', 'robot', 'Hums round the room, bumps into the sofa, tries again.',
      { bg: '#E8ECF2', bg2: '#B8C2CC', bgp: 'checker', outfit: 'tinbody', head: 'vacuum', h1: '#3A3F4B', h2: '#2EC4B6', tone: '#D9DEE6' },
      { body: '#3A3F4B', accent: '#2EC4B6', trim: '#22262E', emissive: '#2EC4B6', pattern: 'circuit' }),
    S(76, 'junkyard-bot', 'Junkyard Bot', 'uncommon', 'robot', 'Built from bits nobody wanted, and proud of every dent.',
      { bg: '#6B5236', bg2: '#C9A46B', bgp: 'gears', outfit: 'tinbody', head: 'junk', h1: '#A0522D', h2: '#7A8A6A', tone: '#B9A68A' },
      { body: '#8A6A4A', accent: '#D9822B', trim: '#4A3828', emissive: '#7CE38B', pattern: 'plates' }),
    S(77, 'sleek-android', 'Sleek Android', 'rare', 'robot', 'Smooth white panels and a calm blue glow. Very polite.',
      { bg: '#0E1A2A', bg2: '#5CC8FF', bgp: 'grid', outfit: 'circuit', head: 'android', h1: '#F4F7FA', h2: '#5CC8FF', tone: '#EEF2F6', face: 'visor', vc: '#5CC8FF' },
      { body: '#E8ECF2', accent: '#5CC8FF', trim: '#9AA8B6', emissive: '#5CC8FF', pattern: 'circuit' }),
    S(78, 'mech-pilot', 'Mech Pilot', 'epic', 'robot', 'Straps into a robot ten storeys tall, visor up, ready.',
      { bg: '#1A2230', bg2: '#FF7A2E', bgp: 'gears', outfit: 'mech', head: 'pilot', h1: '#E8ECF2', h2: '#FF7A2E', fx: 'flicker', gc: '#FF7A2E' },
      { body: '#3A4A5C', accent: '#FF7A2E', trim: '#1B2430', emissive: '#7FE7FF', pattern: 'plates' }),
    // Variety
    S(79, 'mission-specialist', 'Mission Specialist', 'common', 'space', 'Orange suit, big helmet, a checklist for every button.',
      { bg: '#0E1A3A', bg2: '#C9D3EA', bgp: 'stars', outfit: 'suit', head: 'helmet' },
      { body: '#F28C28', accent: '#FFFFFF', trim: '#C8D2DC', emissive: '#7FD4FF', pattern: 'quilt' }),
    S(80, 'head-chef', 'Head Chef', 'common', 'jobs', 'Tall hat, clean whites, and the soup is perfect today.',
      { bg: '#E8ECF2', bg2: '#2E5FD9', bgp: 'kitchen', outfit: 'apron', head: 'toque', face: 'stache', sc: '#2B1B12' },
      { body: '#FFFFFF', accent: '#E5484D', trim: '#9AA8B6', emissive: '#FFFFFF', pattern: 'checker' }),
    S(81, 'firefighter', 'Firefighter', 'common', 'jobs', 'First up the ladder, last to leave, always helps the cat down.',
      { bg: '#B3261E', bg2: '#FF7A2E', bgp: 'flames', outfit: 'fire', head: 'firehelm', h1: '#D93636', h2: '#F5C542' },
      { body: '#3A3428', accent: '#F5C542', trim: '#1B1513', emissive: '#DDE3EA', pattern: 'stripes' }),
    S(82, 'panda', 'Panda', 'common', 'animals', 'Black, white and only slightly interested in bamboo.',
      { bg: '#9BD86F', bg2: '#5CA040', bgp: 'leaves', outfit: 'hoodie', head: 'bear' },
      { body: '#1B1513', accent: '#FFFFFF', trim: '#1B1513', emissive: '#FFFFFF', pattern: 'spots' }),
    S(83, 'penguin', 'Penguin', 'common', 'animals', 'Dressed for dinner every day, waddles everywhere.',
      { bg: '#BFE4FF', bg2: '#FFFFFF', bgp: 'snow', outfit: 'belly', head: 'hood', h1: '#22262E', h2: '#FFFFFF', beak: '#F5A524' },
      { body: '#22262E', accent: '#F5A524', trim: '#11131A', emissive: '#FFFFFF', pattern: 'plain' }),
    S(84, 'pizza-slice', 'Pizza Slice', 'common', 'food', 'Extra cheese, extra pepperoni, extra everything.',
      { bg: '#FFE6B8', bg2: '#D9483B', bgp: 'dots', outfit: 'overalls', head: 'pizza' },
      { body: '#D9483B', accent: '#FFD45C', trim: '#F4F1EA', emissive: '#FFD45C', pattern: 'spots' }),
    S(85, 'pumpkin-patch', 'Pumpkin Patch', 'common', 'seasons', 'A round orange hat picked fresh from the field.',
      { bg: '#4A2E5C', bg2: '#FF9A3D', bgp: 'moon', outfit: 'puffer', head: 'pumpkin', h1: '#F28C28', h2: '#B8481F' },
      { body: '#5C3A7A', accent: '#F28C28', trim: '#2E1A40', emissive: '#FF9A3D', pattern: 'leaves' }),
    S(86, 'snow-day', 'Snow Day', 'common', 'seasons', 'School is closed, the sled is waxed, the earmuffs are on.',
      { bg: '#9FD3FF', bg2: '#FFFFFF', bgp: 'snow', outfit: 'puffer', head: 'earmuffs', h1: '#FF7EB9', h2: '#FFFFFF' },
      { body: '#4FA8E0', accent: '#FFFFFF', trim: '#2C6FB0', emissive: '#C8F0FF', pattern: 'snow' }),
    S(87, 'apprentice-wizard', 'Apprentice Wizard', 'uncommon', 'fantasy', 'Still learning the spells. Mostly turns things blue.',
      { bg: '#2A1F5C', bg2: '#B98BFF', bgp: 'stars', outfit: 'robe', head: 'wizhat', h1: '#3D5FD9', h2: '#FFD86B' },
      { body: '#3D5FD9', accent: '#FFD86B', trim: '#1E2F7A', emissive: '#B98BFF', pattern: 'stars' }),
    S(88, 'night-ninja', 'Night Ninja', 'uncommon', 'fantasy', 'Quiet as a cat on a roof. You did not see this one.',
      { bg: '#1A1530', bg2: '#5A4A8A', bgp: 'moon', outfit: 'gi', head: 'ninja', h1: '#2B2F3A', h2: '#D93636', face: 'mask', mc: '#2B2F3A' },
      { body: '#2B2F3A', accent: '#D93636', trim: '#16181E', emissive: '#8EA0FF', pattern: 'plain' }),
    S(89, 'turntable-dj', 'Turntable DJ', 'uncommon', 'music', 'Big headphones, bigger beats, the whole room dancing.',
      { bg: '#160F2E', bg2: '#FF4FB4', bgp: 'notes', outfit: 'hoodie', head: 'phones', h1: '#1B1F27', h2: '#FF4FB4', face: 'shades', fc: '#1B1F27' },
      { body: '#3A2A6E', accent: '#FF4FB4', trim: '#1B1530', emissive: '#38F2C8', pattern: 'grid' }),
    S(90, 'tiger', 'Tiger', 'uncommon', 'animals', 'Big stripes, soft paws and a very proud roar.',
      { bg: '#2F5D3A', bg2: '#5CA040', bgp: 'leaves', outfit: 'stripes', head: 'hood', h1: '#F28C28', h2: '#FFF3E6', ears: 'round', stripes: true },
      { body: '#F28C28', accent: '#1B1513', trim: '#1B1513', emissive: '#FFD38A', pattern: 'stripes' }),
    S(91, 'rock-star', 'Rock Star', 'rare', 'music', 'A leather jacket, a tall mohawk and one very loud guitar.',
      { bg: '#1B1513', bg2: '#E5484D', bgp: 'spot', outfit: 'leather', head: 'mohawk', h1: '#FF3FA4', h2: '#FFB3E6' },
      { body: '#22262E', accent: '#E5484D', trim: '#0E1116', emissive: '#FF3FA4', pattern: 'plain' }),
    S(92, 'bolt-guardian', 'Bolt Guardian', 'rare', 'hero', 'A hero of our own making, faster than a thunderclap.',
      { nohat: true, bg: '#1F3A6E', bg2: '#FFE45C', bgp: 'rays', outfit: 'hero', emblem: 'bolt', face: 'domino', mc: '#1B1513' },
      { body: '#2E5FD9', accent: '#FFE45C', trim: '#E5484D', emissive: '#E5484D', pattern: 'rays' }),
    S(93, 'wrapped-up', 'Wrapped Up', 'rare', 'spooky', 'A friendly mummy who just woke up from a very long nap.',
      { bg: '#C9A46B', bg2: '#8A6A3A', bgp: 'bricks', outfit: 'wrap', head: 'mummy', h1: '#EDE4CC', h2: '#B5A27A', tone: '#E8DCC0' },
      { body: '#EDE4CC', accent: '#B5A27A', trim: '#8A7A5A', emissive: '#7CE38B', pattern: 'stripes' }),
    S(94, 'wise-wizard', 'Wise Wizard', 'rare', 'fantasy', 'A long white beard and a hat full of old, kind spells.',
      { bg: '#1A2A5C', bg2: '#8FD6FF', bgp: 'swirl', outfit: 'robe', head: 'wizhat', h1: '#6B3DB8', h2: '#FFD86B', face: 'beard' },
      { body: '#6B3DB8', accent: '#FFD86B', trim: '#3A1F70', emissive: '#8FD6FF', pattern: 'stars' }),
    S(95, 'vampire-count', 'Vampire Count', 'epic', 'spooky', 'A tall collar, a red-lined cape and very good manners.',
      { bg: '#1A0A14', bg2: '#E5484D', bgp: 'moon', outfit: 'vamp', head: 'vampslick', h1: '#120C10', face: 'collar fangs', tone: '#E8E0F0', fx: 'twinkle' },
      { body: '#16121A', accent: '#B3261E', trim: '#0B080C', emissive: '#FF5C5C', pattern: 'plain' }),
    S(96, 'samurai', 'Samurai', 'epic', 'fantasy', 'Costume armour in red lacquer with a golden crest.',
      { bg: '#F2E6CF', bg2: '#D93636', bgp: 'rays', outfit: 'samurai', head: 'kabuto', h1: '#2B1B12', h2: '#D93636' },
      { body: '#B3261E', accent: '#2B1B12', trim: '#1B1513', emissive: '#F5C542', pattern: 'plates' }),
    S(97, 'royal-knight', 'Royal Knight', 'epic', 'fantasy', 'Polished armour, a crown on the helmet and a tall plume.',
      { bg: '#1F3A6E', bg2: '#F5C542', bgp: 'checker', outfit: 'tabard', head: 'royalknight', h1: '#C8D2DC', h2: '#8FA3B8' },
      { body: '#8A95A3', accent: '#1F3A6E', trim: '#5A6878', emissive: '#E5484D', pattern: 'plates' }),
    S(98, 'cosmic-hero', 'Cosmic Hero', 'epic', 'hero', 'Got super powers from a passing comet. Uses them nicely.',
      { nohat: true, bg: '#1E1352', bg2: '#FF7AE0', bgp: 'sparkle', outfit: 'hero', emblem: 'star', face: 'domino', mc: '#FF7AE0', fx: 'orbit', oc: '#FF9AF0' },
      { body: '#3A1F8A', accent: '#FFE45C', trim: '#FF7AE0', emissive: '#FF7AE0', pattern: 'stars' }),
    S(99, 'archmage', 'Archmage', 'legendary', 'fantasy', 'The oldest wizard of all, with stars that circle the hat.',
      { bg: '#0A0626', bg2: '#8FD6FF', bgp: 'swirl', outfit: 'robe', head: 'archhat', h1: '#1E1352', h2: '#F5C542', face: 'beard', fx: 'orbit shine frame' },
      { body: '#1E1352', accent: '#F5C542', trim: '#0A0626', emissive: '#8FD6FF', pattern: 'stars' }),
    S(100, 'phoenix', 'Phoenix', 'legendary', 'mythic', 'Rises from the sparks with wings of fire and gold.',
      { bg: '#2A0A05', bg2: '#FF5A1F', bgp: 'wings', outfit: 'feathers', head: 'flame', h1: '#FF5A1F', h2: '#FFD23F', tone: '#FFE2C2', fx: 'flicker shine frame' },
      { body: '#D9381E', accent: '#FF7A2E', trim: '#7A1414', emissive: '#FFD23F', pattern: 'flames' })
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
    A(23, 'baby-drake', 'Baby Drake', 'pet', 'legendary', 'A pocket-sized dragon who sneezes little sparks.', 'dragon', { attach: 'follow', shape: 'creature', color: '#8A5CF0', color2: '#FFD23F', size: .45, glow: true }),
    // ---- Wave 2 (19 Nov 2026). Numbers 24 onwards. ----
    A(24, 'ball-cap', 'Ball Cap', 'hat', 'common', 'A team-style cap with a star on the front.', 'cap', { attach: 'head', shape: 'cap', color: '#2E5FD9', color2: '#FFFFFF', size: 1 }),
    A(25, 'sweatband', 'Sweatband', 'hat', 'common', 'Keeps the sweat out of your eyes in overtime.', 'band', { attach: 'head', shape: 'band', color: '#FFFFFF', color2: '#E5484D', size: 1 }),
    A(26, 'hockey-helmet', 'Hockey Helmet', 'hat', 'common', 'Hard shell, chin strap, ready for the rink.', 'hockey', { attach: 'head', shape: 'dome', color: '#1F3A6E', color2: '#FFFFFF', size: 1.05 }),
    A(27, 'bandana', 'Bandana', 'hat', 'common', 'A spotty pirate bandana, knotted at the side.', 'bandana', { attach: 'head', shape: 'dome', color: '#D93636', color2: '#FFFFFF', size: 1 }),
    A(28, 'flat-cap', 'Flat Cap', 'hat', 'common', 'A soft tweed cap for the golf course or the street corner.', 'flatcap', { attach: 'head', shape: 'cap', color: '#7A6A58', color2: '#4A3E32', size: 1 }),
    A(29, 'chef-toque', 'Chef Toque', 'hat', 'common', 'A tall white chef\'s hat. Cooking skills not included.', 'toque', { attach: 'head', shape: 'cylinder', color: '#FFFFFF', color2: '#D3D8E0', size: 1.3 }),
    A(30, 'fedora', 'Fedora', 'hat', 'uncommon', 'A pinched felt hat with a dark band, very 1920s.', 'fedora', { attach: 'head', shape: 'fedora', color: '#3A3F4B', color2: '#1B1513', size: 1.1 }),
    A(31, 'tricorn', 'Tricorn', 'hat', 'uncommon', 'A three-cornered pirate hat with gold trim.', 'tricorn', { attach: 'head', shape: 'tricorn', color: '#1B1513', color2: '#F5C542', size: 1.2, opts: { feather: '#D93636' } }),
    A(32, 'bowler', 'Bowler', 'hat', 'uncommon', 'A round hard hat for bankers and butlers.', 'bowler', { attach: 'head', shape: 'dome', color: '#1B1513', color2: '#3A2E2A', size: 1 }),
    A(33, 'dj-headphones', 'DJ Headphones', 'hat', 'uncommon', 'Big cushioned headphones with a glow on each side.', 'phones', { attach: 'head', shape: 'band', color: '#1B1F27', color2: '#FF4FB4', size: 1, trim: '#1B1513', glowc: '#38F2C8' }),
    A(34, 'football-helmet', 'Football Helmet', 'hat', 'rare', 'A shiny helmet with a stripe down the middle and a face mask.', 'fbhelm', { attach: 'head', shape: 'helmet', color: '#7A1F2B', color2: '#F5C542', size: 1.15, glowc: '#DDE3EA' }),
    A(35, 'racing-helmet', 'Racing Helmet', 'hat', 'rare', 'A full racing helmet with the visor flipped up.', 'race', { attach: 'head', shape: 'helmet', color: '#FFFFFF', color2: '#E5484D', size: 1.2, glowc: '#3DE0FF', opts: { num: 1 } }),
    A(36, 'fur-hat', 'Fur Hat', 'hat', 'rare', 'A tall, warm fur hat for the coldest boss in town.', 'furhat', { attach: 'head', shape: 'cylinder', color: '#5C4636', color2: '#F5C542', size: 1.2 }),
    A(37, 'golden-laurel', 'Golden Laurel', 'hat', 'epic', 'A wreath of golden leaves for winners only.', 'laurel', { attach: 'head', shape: 'torus', color: '#F5C542', color2: '#FFF2C2', size: 1, trim: '#B8860B', glow: true }),
    A(38, 'eye-patch', 'Eye Patch', 'glasses', 'common', 'A pirate\'s patch on a thin strap. Arr.', 'patch', { attach: 'face', shape: 'patch', color: '#1B1513', color2: '#1B1513', size: .5 }),
    A(39, 'dark-shades', 'Dark Shades', 'glasses', 'common', 'Flat black sunglasses. Bodyguard approved.', 'shades', { attach: 'face', shape: 'band', color: '#16181E', color2: '#FFFFFF', size: 1 }),
    A(40, 'eye-black', 'Eye Black', 'glasses', 'common', 'Two stripes under the eyes, game-day style.', 'eyeblack', { attach: 'face', shape: 'stripes', color: '#1B1513', color2: '#1B1513', size: .6 }),
    A(41, 'aviators', 'Aviators', 'glasses', 'uncommon', 'Teardrop lenses in a thin gold frame.', 'aviators', { attach: 'face', shape: 'lens', color: '#3A4A5C', color2: '#F5C542', size: 1 }),
    A(42, 'cyborg-eye', 'Cyborg Eye', 'glasses', 'rare', 'One glowing robot eye with a little scanner inside.', 'cyborg', { attach: 'face', shape: 'ring', color: '#E5484D', color2: '#FFD2D2', size: .6, glow: true }),
    A(43, 'bow-tie', 'Bow Tie', 'cape', 'common', 'A neat bow tie for the neck. Worn in the cape spot.', 'bowtie', { attach: 'neck', shape: 'bowtie', color: '#B3261E', color2: '#7A1414', size: .5 }),
    A(44, 'number-cape', 'Number Cape', 'cape', 'uncommon', 'A team cape with a big number 1 on the back.', 'numcape', { attach: 'back', shape: 'cloth', color: '#1F3A6E', color2: '#FFD23F', size: 1, num: 1 }),
    A(45, 'gold-chain', 'Gold Chain', 'cape', 'uncommon', 'A chunky gold chain with a star on the end.', 'chain', { attach: 'neck', shape: 'chain', color: '#F5C542', color2: '#FFF2C2', size: .6 }),
    A(46, 'royal-ermine', 'Royal Ermine', 'cape', 'epic', 'A velvet cape with a fluffy white collar, fit for a ruler.', 'ermine', { attach: 'back', shape: 'cloth', color: '#7A1F8A', color2: '#FFFFFF', size: 1.1 }),
    A(47, 'soccer-trail', 'Soccer Ball Trail', 'trail', 'common', 'A ball that bounces along behind you.', 'soccer', { attach: 'feet', shape: 'ball', color: '#FFFFFF', color2: '#7BD88F', size: 1 }),
    A(48, 'football-trail', 'Football Trail', 'trail', 'common', 'A spinning football that follows your every step.', 'football', { attach: 'feet', shape: 'ball', color: '#8A4A22', color2: '#FFFFFF', size: 1 }),
    A(49, 'doubloon-trail', 'Doubloon Trail', 'trail', 'uncommon', 'Gold pirate coins that spill out behind you.', 'coins', { attach: 'feet', shape: 'particles', color: '#F5C542', color2: '#FFF2C2', size: 1, glow: true }),
    A(50, 'music-trail', 'Music Trail', 'trail', 'rare', 'Little musical notes float up wherever you go.', 'notes', { attach: 'feet', shape: 'particles', color: '#FF4FB4', color2: '#38F2C8', size: 1, glow: true }),
    A(51, 'confetti-pop', 'Confetti Pop', 'aura', 'uncommon', 'Party confetti hanging in the air around you.', 'confetti', { attach: 'around', shape: 'particles', color: '#FF5C5C', color2: '#FFD23F', size: 1.2 }),
    A(52, 'spotlight', 'Spotlight', 'aura', 'rare', 'A bright stage light that follows you everywhere.', 'spot', { attach: 'head', shape: 'cone', color: '#FFE79A', color2: '#FFFFFF', size: 1.4, glow: true }),
    A(53, 'camera-flash', 'Camera Flash', 'aura', 'epic', 'Flashes go off all around you, like on a red carpet.', 'flash', { attach: 'around', shape: 'particles', color: '#FFFFFF', color2: '#BFE4FF', size: 1.2, glow: true }),
    A(54, 'champion-glow', 'Champion Glow', 'aura', 'legendary', 'Slowly turning golden rays for a true champion.', 'trophy', { attach: 'around', shape: 'rays', color: '#F5C542', color2: '#FFF2C2', size: 1.4, glow: true }),
    A(55, 'parrot', 'Parrot', 'pet', 'uncommon', 'A chatty red parrot who repeats everything you say.', 'parrot', { attach: 'follow', shape: 'creature', color: '#E5484D', color2: '#2EA36B', size: .4 }),
    A(56, 'penguin-chick', 'Penguin Chick', 'pet', 'uncommon', 'A fluffy grey chick who waddles after you.', 'chick', { attach: 'follow', shape: 'creature', color: '#5A6273', color2: '#F5A524', size: .35 }),
    A(57, 'robo-pup', 'Robo Pup', 'pet', 'rare', 'A metal puppy with glowing eyes and a wagging antenna.', 'robopup', { attach: 'follow', shape: 'box', color: '#9AA8B6', color2: '#38F2C8', size: .4, trim: '#3A4A5C' }),
    A(58, 'drone-buddy', 'Drone Buddy', 'pet', 'epic', 'A tiny hovering drone that keeps an eye on you.', 'drone', { attach: 'follow', shape: 'box', color: '#3A3F4B', color2: '#5CC8FF', size: .35, trim: '#1B1F27', glow: true }),
    A(59, 'pocket-kraken', 'Pocket Kraken', 'pet', 'legendary', 'A small purple sea monster with a crown and a big grin.', 'kraken', { attach: 'follow', shape: 'creature', color: '#8A5CF0', color2: '#FFB3E6', size: .45, glow: true })
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
  GAME_ITEMS.forEach(function (it) { if (it.game !== 'slipstream') return; if (it.slot === 'sponsor' || (it.slot === 'helmet' && it.no <= 8)) it.give = 'free'; else if (it.slot === 'livery' && it.no > 8) it.give = 'earned'; });
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
  // Both list only the first wave (skins 1-30, accessories 1-23), so the packs from before 19 Nov 2026 keep exactly what they held;
  // the wave 2 packs below name their items.
  function skinIds(theme, rarities) { return SKINS.filter(function (s) { return s.no <= 30 && s.theme === theme && rarities.indexOf(s.rarity) >= 0; }).map(function (s) { return s.id; }); }
  function accIds(slot) { return ACCESSORIES.filter(function (a) { return a.no <= 23 && a.slot === slot && a.rarity !== 'legendary'; }).map(function (a) { return a.id; }); }
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
    itemPack('ss-extras', 'slipstream', 'Pit Wall Party', 'Five tyre smoke colours and two podium celebrations.', ['ss-smoke-pink-tyre-smoke', 'ss-smoke-blue-tyre-smoke', 'ss-smoke-green-tyre-smoke', 'ss-smoke-purple-tyre-smoke', 'ss-smoke-gold-tyre-smoke', 'ss-podium-confetti-podium', 'ss-podium-fireworks-podium']),
    // Wave 2 packs (19 Nov 2026): skins of the new themes (common to rare; epic and legendary come from chests) and accessories.
    { id: 'skins-team', kind: 'skins', name: 'Kickoff', desc: 'Six team-sport kits: soccer, hoops, gridiron, baseball, hockey and tennis.', price: 0, contents: { skins: ['striker', 'point-guard', 'lineman', 'slugger', 'puck-chaser', 'baseline-ace'] } },
    { id: 'skins-solo', kind: 'skins', name: 'Personal Best', desc: 'Six looks for track, pool, golf, skatepark, surf and snow.', price: 0, contents: { skins: ['sprinter', 'lap-swimmer', 'fairway-pro', 'skate-rat', 'surf-rider', 'slope-racer'] } },
    { id: 'skins-sideline', kind: 'skins', name: 'Sideline', desc: 'The referee, the coach, the cheer captain and the hawk mascot.', price: 0, contents: { skins: ['referee', 'coach', 'cheer-captain', 'hawk-mascot'] } },
    { id: 'skins-ring', kind: 'skins', name: 'Ring and Mat', desc: 'A boxer, a black belt, a fencer and a wrestling champ.', price: 0, contents: { skins: ['prizefighter', 'black-belt', 'fencer', 'title-belt'] } },
    { id: 'skins-pros', kind: 'skins', name: 'Pro Tour', desc: 'A racing driver and a goalkeeper.', price: 0, contents: { skins: ['pole-position', 'safe-hands'] } },
    { id: 'skins-pirates', kind: 'skins', name: 'Jolly Crew', desc: 'Six pirates, from the deckhand to the captain. Eye patches included.', price: 0, contents: { skins: ['deckhand', 'sea-dog', 'lookout', 'first-mate', 'buccaneer', 'pirate-captain'] } },
    { id: 'skins-office', kind: 'skins', name: 'Corner Office', desc: 'A suit and tie, a banker and a tracksuit tough guy.', price: 0, contents: { skins: ['nine-to-five', 'banker', 'tracksuit-tough'] } },
    { id: 'skins-speakeasy', kind: 'skins', name: 'Speakeasy', desc: 'Pinstripes, a detective, a bodyguard, a tuxedo and a secret agent.', price: 0, contents: { skins: ['roaring-twenties', 'gumshoe', 'bodyguard', 'black-tie', 'secret-agent'] } },
    { id: 'skins-scrap', kind: 'skins', name: 'Scrap Heap', desc: 'Four new robots, from tin toy to android.', price: 0, contents: { skins: ['retro-tin-bot', 'vacuum-bot', 'junkyard-bot', 'sleek-android'] } },
    { id: 'skins-tales', kind: 'skins', name: 'Tall Tales', desc: 'Two wizards, a ninja, a mummy, a hero and a rock star.', price: 0, contents: { skins: ['apprentice-wizard', 'wise-wizard', 'night-ninja', 'wrapped-up', 'bolt-guardian', 'rock-star'] } },
    { id: 'skins-everyday', kind: 'skins', name: 'Day Job', desc: 'An astronaut, a chef, a firefighter and a DJ.', price: 0, contents: { skins: ['mission-specialist', 'head-chef', 'firefighter', 'turntable-dj'] } },
    { id: 'skins-critters', kind: 'skins', name: 'Critters and Snacks', desc: 'A panda, a penguin, a tiger, a pizza slice, a pumpkin and a snow day.', price: 0, contents: { skins: ['panda', 'penguin', 'tiger', 'pizza-slice', 'pumpkin-patch', 'snow-day'] } },
    { id: 'acc-kitbag', kind: 'accessories', name: 'Kit Bag', desc: 'Sports headgear, eye black and two ball trails.', price: 0, contents: { acc: ['ball-cap', 'sweatband', 'hockey-helmet', 'football-helmet', 'racing-helmet', 'eye-black', 'soccer-trail', 'football-trail', 'number-cape'] } },
    { id: 'acc-pirate', kind: 'accessories', name: 'Pirate Kit', desc: 'Eye patch, bandana, tricorn, a parrot and a trail of gold coins.', price: 0, contents: { acc: ['eye-patch', 'bandana', 'tricorn', 'parrot', 'doubloon-trail'] } },
    { id: 'acc-sharp', kind: 'accessories', name: 'Sharp Dresser', desc: 'Fedora, bowler, flat cap, fur hat, bow tie, gold chain and shades.', price: 0, contents: { acc: ['fedora', 'bowler', 'flat-cap', 'fur-hat', 'bow-tie', 'gold-chain', 'dark-shades', 'aviators'] } },
    { id: 'acc-stage', kind: 'accessories', name: 'Showtime', desc: 'Spotlight, confetti, camera flashes, headphones and a music trail.', price: 0, contents: { acc: ['spotlight', 'confetti-pop', 'camera-flash', 'dj-headphones', 'music-trail'] } },
    { id: 'acc-gadgets', kind: 'accessories', name: 'Gadget Box', desc: 'A cyborg eye, a robot pup, a drone and a penguin chick who came along anyway.', price: 0, contents: { acc: ['cyborg-eye', 'robo-pup', 'drone-buddy', 'penguin-chick'] } },
    { id: 'acc-kraken', kind: 'accessories', name: 'Message in a Bottle', desc: 'Uncorks the Pocket Kraken. Legendary.', price: 0, contents: { acc: ['pocket-kraken'] } }
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
  function cap() {
    try { if (on() && server() && window.BackRoomWallet && window.BackRoomWallet.unlimited && window.BackRoomWallet.unlimited()) return true; } catch (e) {}
    try { return !!(on() && SHARED && SHARED.captain && SHARED.captain()); } catch (e) { return false; }
  }
  function load(raw) {
    var o = json(ls(KEY)), L = { v: 1, s: [], a: [], g: [], e: { skin: '' }, ge: {} };
    SLOTS.forEach(function (k) { L.e[k] = ''; });
    if (!obj(o) || o.v !== 1) o = {};
    if (server()) {
      // The server wallet: what's owned is the server's answer (wallet.js), plus the game items a game hands over
      // itself (give: free to everyone, so kept in this browser). Only what is worn (e, ge) is read from here.
      var w = window.BackRoomWallet, mine = w && w._owned ? w._owned() : [];
      mine.forEach(function (id) { if (SKINS_BY_ID[id]) L.s.push(id); else if (ACC_BY_ID[id]) L.a.push(id); else if (ITEM_BY_ID[id]) L.g.push(id); });
      if (Array.isArray(o.g)) o.g.forEach(function (id) { var it = ITEM_BY_ID[id]; if (it && it.give && L.g.indexOf(id) < 0) L.g.push(id); });
    } else {
    if (Array.isArray(o.s)) o.s.forEach(function (id) { if (SKINS_BY_ID[id] && L.s.indexOf(id) < 0) L.s.push(id); });
    if (Array.isArray(o.a)) o.a.forEach(function (id) { if (ACC_BY_ID[id] && L.a.indexOf(id) < 0) L.a.push(id); });
    if (Array.isArray(o.g)) o.g.forEach(function (id) { if (ITEM_BY_ID[id] && L.g.indexOf(id) < 0) L.g.push(id); });
    }
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
    if (server()) {
      // The server wallet: ownership is never saved here (the server holds it). What was saved before is left as it
      // was; only what is worn and the game-given items change.
      var o = json(ls(KEY)); o = obj(o) && o.v === 1 ? o : {};
      var keep = Array.isArray(o.g) ? o.g.filter(function (id) { return ITEM_BY_ID[id]; }) : [];
      L.g.forEach(function (id) { if (ITEM_BY_ID[id] && ITEM_BY_ID[id].give && keep.indexOf(id) < 0) keep.push(id); });
      L = { v: 1, s: Array.isArray(o.s) ? o.s : [], a: Array.isArray(o.a) ? o.a : [], g: keep, e: L.e, ge: L.ge };
    }
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
  // With the server wallet buy() returns a PROMISE of the same answer (the server buys, rolls and fills the locker;
  // extra reasons: signin, closed, server, duplicate, with a message). Callers: Promise.resolve(buy(id)).then(...).
  function buy(packId, opts) {
    var p = pack(packId);
    if (!on()) return { ok: false, reason: 'off' };
    if (server()) return serverBuy(p, packId);
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
  function serverBuy(p, packId) {
    if (!p && emeraldPack(packId)) return Promise.resolve({ ok: false, reason: 'money' });
    if (!p) return Promise.resolve({ ok: false, reason: 'unknown' });
    if (preview(packId).all) return Promise.resolve({ ok: false, reason: 'owned' });
    var w = W(); if (!w || !w._buy) return Promise.resolve({ ok: false, reason: 'wallet' });
    var dm = /^draw-(\d+)$/.exec(p.id);
    return (dm ? w._chest(+dm[1]) : w._buy(p.id)).then(function (r) {
      if (!r || !r.ok) return r || { ok: false, reason: 'server' };
      var got = { skins: (r.got && r.got.skins) || [], acc: (r.got && r.got.acc) || [], items: (r.got && r.got.items) || [], draws: (r.got && r.got.draws) || [] };
      var L = load(), first = got.skins[0] || (got.draws[0] && got.draws[0].skin);
      if (!L.e.skin && first && L.s.indexOf(first) >= 0) { L.e.skin = first; save(L); }
      return { ok: true, pack: p.id, spent: r.spent, got: got, refund: r.refund || 0, balance: r.balance };
    });
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
  function receive(packId, opts) { var p = pack(packId); if (!on() || server() || !p) return null; var f = fill(p, opts); f.pack = p; return f; }

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
      default: return s + bgMore(lk, b2, id);
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
      default: deco = outfitMore(lk, c, id);
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
      default: return headMore(lk, c);
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
      default: return accBackMore(a, id);
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
      default: return accFrontMore(a);
    }
  }

  // ---- Wave 2 parts (19 Nov 2026): sports kits, pirates, suits, robots and more. Only skins and accessories that name
  // these parts reach this code (the switches above fall through to it), so every older look draws exactly as before.
  // A look may also have: face (space-separated: patch, shades, stache, beard, mask, domino, eyeblack, goggles, fangs,
  // visor), fx (space-separated: shine, frame, orbit, twinkle, flicker; animated SVG, for the special ones), num (a
  // number on a kit), h1 / h2 (the head piece's own colours) and a few options named where they are used.
  var GOLD = '#F5C542', STEEL = '#C8D2DC', SHIRT = '#F4F1EA';
  var SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  // A number in chunky sporty segments, centred on x, top at y, h tall.
  function digits(str, x, y, h, col, w) {
    str = String(str || '').replace(/\D/g, '').slice(0, 2); if (!str) return '';
    var W = h * .5, gap = h * .32, tot = str.length * W + (str.length - 1) * gap, d = '';
    str.split('').forEach(function (ch, i) {
      var x0 = x - tot / 2 + i * (W + gap), m = h / 2, s = SEG[ch];
      var L = { a: [0, 0, W, 0], b: [W, 0, W, m], c: [W, m, W, h], d: [0, h, W, h], e: [0, m, 0, h], f: [0, 0, 0, m], g: [0, m, W, m] };
      s.split('').forEach(function (k) { var q = L[k]; d += 'M' + (x0 + q[0]).toFixed(2) + ' ' + (y + q[1]).toFixed(2) + ' L' + (x0 + q[2]).toFixed(2) + ' ' + (y + q[3]).toFixed(2) + ' '; });
    });
    return P(d, null, col, w || h * .22);
  }
  function skull(cx, cy, s, col) { return C(cx, cy, 2.6 * s, col) + R(cx - 1.7 * s, cy + 1, 3.4 * s, 2.4 * s, .7 * s, col) + C(cx - .95 * s, cy - .1 * s, .7 * s, INK) + C(cx + .95 * s, cy - .1 * s, .7 * s, INK); }
  function bgMore(lk, b2, id) {
    var o = ' opacity=".35"', s = '', i, x, y;
    switch (lk.bgp) {
      case 'pitch': for (y = 0; y < 64; y += 8) s += R(0, y, 64, 4, 0, b2, ' opacity=".28"'); return s + C(32, 66, 16, 'none', ' stroke="#FFFFFF" stroke-width="1.2" opacity=".55"') + P('M0 50 L64 50', null, WH, 1.2, ' opacity=".55"');
      case 'court': for (x = 3; x < 64; x += 6) s += P('M' + x + ' 0 L' + x + ' 64', null, b2, .8, o); return s + P('M8 64 Q32 30 56 64', null, WH, 1.4, ' opacity=".6"') + R(0, 10, 64, 1.4, 0, WH, ' opacity=".45"');
      case 'rink': return R(0, 18, 64, 1.8, 0, '#E5484D', ' opacity=".55"') + R(0, 46, 64, 1.8, 0, '#3D8BFF', ' opacity=".55"') + C(32, 32, 9, 'none', ' stroke="#E5484D" stroke-width="1.1" opacity=".45"') + C(10, 10, 4, b2, o) + C(54, 56, 4, b2, o);
      case 'track': for (i = 0; i < 4; i++) s += P('M-4 ' + (8 + i * 14) + ' Q32 ' + (-4 + i * 14) + ' 68 ' + (8 + i * 14), null, WH, 1.1, ' opacity=".5"'); return R(0, 0, 64, 64, 0, b2, ' opacity=".2"') + s;
      case 'bricks': for (y = 0; y < 64; y += 6) for (x = (y / 6) % 2 ? -6 : 0; x < 64; x += 12) s += R(x + .6, y + .6, 10.8, 4.8, .6, b2, ' opacity=".3"'); return s;
      case 'spot': return P('M24 -2 L40 -2 L62 64 L2 64 Z', b2, null, 0, ' opacity=".28"') + E(32, 60, 26, 6, b2, ' opacity=".35"');
      case 'skyline': [[0, 40, 8], [8, 32, 7], [15, 44, 6], [44, 36, 7], [51, 28, 6], [57, 42, 8]].forEach(function (q) { s += R(q[0], q[1], q[2], 64 - q[1], 0, b2, ' opacity=".35"'); for (y = q[1] + 3; y < 60; y += 5) s += R(q[0] + 1.6, y, 1.4, 1.6, 0, GOLD, ' opacity=".7"'); }); return C(50, 12, 5, b2, ' opacity=".7"') + s;
      case 'flash': [[10, 14, 4], [54, 12, 3.2], [56, 36, 2.6], [7, 38, 2.4], [22, 5, 2]].forEach(function (q) { s += star(q[0], q[1], q[2], WH, 4, .25, ' opacity=".85"') + C(q[0], q[1], q[2] * .9, b2, ' opacity=".3"'); }); return s;
      case 'confetti': var cc = ['#FF5C5C', '#FFD23F', '#5CC8FF', '#7CE38B', '#B98BFF'];
        [[8, 12, 30], [16, 4, -20], [52, 8, 50], [57, 22, -35], [6, 30, 70], [58, 40, 15], [46, 3, -60], [12, 46, 40]].forEach(function (q, k) { s += R(q[0] - 1.8, q[1] - .8, 3.6, 1.6, .5, cc[k % 5], ' transform="rotate(' + q[2] + ' ' + q[0] + ' ' + q[1] + ')"'); }); return s;
      case 'wings': return P('M32 40 Q8 34 -2 12 Q8 18 12 14 Q14 22 20 22 Q18 30 32 34 Z', b2, null, 0, ' opacity=".85"') + P(mirrorX('M32 40 Q8 34 -2 12 Q8 18 12 14 Q14 22 20 22 Q18 30 32 34 Z'), b2, null, 0, ' opacity=".85"') + P('M28 36 Q14 30 6 18 M28 38 Q16 36 4 28', null, GOLD, 1, ' opacity=".7"') + P(mirrorX('M28 36 Q14 30 6 18 M28 38 Q16 36 4 28'), null, GOLD, 1, ' opacity=".7"');
      case 'fog': return E(12, 18, 14, 4, b2, ' opacity=".3"') + E(52, 10, 12, 3.4, b2, ' opacity=".3"') + E(56, 40, 12, 3.6, b2, ' opacity=".25"') + E(6, 44, 10, 3, b2, ' opacity=".25"');
      case 'notes': [[10, 16], [52, 12], [55, 36], [8, 38]].forEach(function (q) { s += C(q[0], q[1] + 4, 1.9, b2, ' opacity=".55"') + P('M' + (q[0] + 1.7) + ' ' + (q[1] + 4) + ' L' + (q[0] + 1.7) + ' ' + (q[1] - 3) + ' L' + (q[0] + 5) + ' ' + (q[1] - 2), null, b2, 1, ' opacity=".55"'); }); return s;
      case 'gears': [[10, 14, 7], [54, 12, 6], [56, 40, 5], [6, 40, 5]].forEach(function (q) { s += star(q[0], q[1], q[2], b2, 8, .78, o) + C(q[0], q[1], q[2] * .35, lk.bg); }); return s;
      case 'deck': for (y = 2; y < 64; y += 7) s += P('M0 ' + y + ' L64 ' + y, null, b2, .9, o); for (y = 2; y < 64; y += 7) s += C(((y * 7) % 50) + 6, y + 3.5, .6, b2, ' opacity=".5"'); return s;
      case 'map': return R(4, 4, 56, 56, 4, b2, ' opacity=".25"') + P('M8 50 Q16 40 12 30 Q8 20 20 16 Q30 13 30 6', null, '#A0522D', 1.2, ' stroke-dasharray="2 2" opacity=".7"') + P('M50 8 L56 14 M56 8 L50 14', null, '#D9483B', 1.6) + C(54, 44, 3, 'none', ' stroke="' + b2 + '" stroke-width="1" opacity=".6"');
      case 'moon': return C(50, 13, 6.5, b2, ' opacity=".9"') + C(47.5, 11.5, 5.5, lk.bg) + star(12, 12, 1.8, WH, 4, .3, ' opacity=".8"') + star(56, 34, 1.4, WH, 4, .3, ' opacity=".7"') + star(8, 34, 1.2, WH, 4, .3, ' opacity=".7"');
      case 'kitchen': for (y = 0; y < 64; y += 8) for (x = 0; x < 64; x += 8) s += R(x + .5, y + .5, 7, 7, 1, b2, ((x + y) / 8) % 2 ? ' opacity=".18"' : ' opacity=".35"'); return s;
      case 'flames': return P('M-2 64 Q2 46 8 50 Q8 36 16 42 Q18 30 24 40 L24 64 Z', b2, null, 0, ' opacity=".55"') + P(mirrorX('M-2 64 Q2 46 8 50 Q8 36 16 42 Q18 30 24 40 L24 64 Z'), b2, null, 0, ' opacity=".55"');
      default: return '';
    }
  }
  function outfitMore(lk, c, id) {
    var b = c.body, a = c.accent, t = c.trim, em = c.emissive, d = '', x, y;
    var num = lk.num != null ? digits(lk.num, 41.5, 56.6, 4.6, lk.numc || a, 1.2) : '';
    switch (lk.outfit) {
      case 'kit': d = P('M26 54.5 L32 59.5 L38 54.5', null, a, 2.2) + P('M8 61 L15 56.5 M56 61 L49 56.5', null, a, 2) + C(23, 59, 1.6, t) + num;
        if (lk.band) d = R(0, 59.6, 64, 2.4, 0, t, ' opacity=".85"') + d;
        if (lk.stars) d += star(14, 60, 1.8, a, 5, .45) + star(50, 60, 1.8, a, 5, .45) + star(19, 63, 1.4, a, 5, .45);
        if (lk.medal) d += P('M27 54.8 L32 60 L37 54.8', null, '#3D8BFF', 1.6) + C(32, 61.2, 2.7, GOLD, ' stroke="#B8860B" stroke-width=".5"') + star(32, 61.2, 1.5, '#FFF2C2', 5, .45);
        return d;
      case 'tank': return P('M25 54.6 Q32 61 39 54.6', null, a, 2.2) + P('M20.5 55.2 Q19.5 60 14 64.5', null, a, 2) + P(mirrorX('M20.5 55.2 Q19.5 60 14 64.5'), null, a, 2) + (lk.num != null ? digits(lk.num, 32, 59.2, 4.4, lk.numc || a, 1.15) : '');
      case 'pads': return E(14, 57.5, 9.5, 5, a) + E(50, 57.5, 9.5, 5, a) + P('M7 56 Q14 52 21 55.5', null, WH, 1, ' opacity=".55"') + P(mirrorX('M7 56 Q14 52 21 55.5'), null, WH, 1, ' opacity=".55"') + P('M26 54.6 L32 58.6 L38 54.6', null, t, 2) + (lk.num != null ? digits(lk.num, 32, 59.4, 4.4, lk.numc || WH, 1.15) : '');
      case 'vstripes': for (x = 8; x < 58; x += 6) d += R(x, 50, 2.8, 18, 0, INK); return d + P('M25 54.6 L32 58.6 L39 54.6', null, INK, 2.4) + P('M27 55.5 Q29.5 60 33 61', null, a, .9) + R(32.5, 59.8, 4.4, 2.4, 1, STEEL, ' stroke="' + INK + '" stroke-width=".4"');
      case 'polo': d = P('M25.5 54.4 L29.2 59.4 L32 56.4 Z', t) + P(mirrorX('M25.5 54.4 L29.2 59.4 L32 56.4 Z'), t) + R(31.2, 56, 1.6, 6.5, .8, t, ' opacity=".7"') + C(32, 58.3, .55, WH) + C(32, 60.7, .55, WH) + C(42, 60, 1.4, a);
        if (lk.whistle) d += P('M27 55.5 Q28 61 33.5 62', null, a, .9) + R(33, 61, 4.4, 2.4, 1, STEEL, ' stroke="' + INK + '" stroke-width=".4"');
        return d;
      case 'gi': return P('M25 54.6 L35.5 66', null, t, 2.6) + P('M39 54.6 L33.4 60.6', null, t, 2.6) + R(26, 62.6, 12, 3, .8, a) + P('M30 64 L28 67 M34 64 L36 67', null, a, 1.6);
      case 'boxrobe': return P('M23.5 54.6 Q27 61 30.5 66', null, a, 3.2) + P(mirrorX('M23.5 54.6 Q27 61 30.5 66'), null, a, 3.2) + P('M12 59 Q16 57 20 58', null, WH, 1, ' opacity=".45"') + (lk.num != null ? digits(lk.num, 47, 58.4, 3.6, a, 1) : '');
      case 'racesuit': return P('M25 54.6 Q32 57.6 39 54.6', null, a, 2.6) + P('M11.5 58 L19 66', null, a, 2.2) + P(mirrorX('M11.5 58 L19 66'), null, a, 2.2) + R(19.5, 59.2, 5.4, 3, 1, WH) + R(39.5, 59.2, 5.4, 3, 1, em) + P('M32 57.6 L32 66', null, t, .8);
      case 'wetsuit': return P('M8 60 Q32 64 56 60 L56 70 L8 70 Z', a) + P('M24.5 54.8 Q32 57.4 39.5 54.8', null, t, 1.8) + P('M32 56.6 L32 66', null, t, 1) + P('M12 58 L20 56', null, em, 1.2);
      case 'pirate': d = P('M26 54.4 L32 66 L38 54.4 Z', SHIRT) + P('M27.5 56 Q32 58.4 36.5 56 M28.6 58.6 Q32 61 35.4 58.6', null, '#D9D3C4', .9) + P('M26 54.4 L30 66', null, a, 1.8) + P('M38 54.4 L34 66', null, a, 1.8) + C(24, 60, 1, a) + C(40, 60, 1, a) + C(23.4, 63.4, 1, a) + C(40.6, 63.4, 1, a);
        if (lk.sash) d += P('M14 57 L50 66', null, lk.sash, 3);
        if (lk.hook) d += P('M51 67 L51 61 Q51 56.6 47 57 Q44 57.6 45.4 60', null, STEEL, 1.6) + R(48.6, 63, 5, 4, 1, t);
        return d;
      case 'business': case 'tux': case 'trench':
        var tie = lk.tie || (lk.outfit === 'tux' ? 'bow' : 'tie'), shirt = lk.shirt || (lk.outfit === 'tux' ? WH : SHIRT);
        if (lk.pin) for (x = 9.5; x < 56; x += 3.2) d += P('M' + x + ' 52 L' + x + ' 66', null, lk.pin, .45, ' opacity=".7"');
        if (lk.outfit === 'trench') d += C(26, 61, .9, t) + C(38, 61, .9, t) + C(26, 64.2, .9, t) + C(38, 64.2, .9, t);
        d += P('M27 54.5 L32 63.5 L37 54.5 Z', shirt);
        if (tie === 'tie') d += P('M31.1 56.6 L32.9 56.6 L33.8 62.6 L32 64.8 L30.2 62.6 Z', a) + R(30.6, 55, 2.8, 2, .6, a);
        if (tie === 'bow') d += P('M32 56.3 L28.4 54.5 L28.4 58.1 Z M32 56.3 L35.6 54.5 L35.6 58.1 Z', a) + C(32, 56.3, .95, a);
        var lap = lk.outfit === 'tux' ? em : t, lw = lk.outfit === 'trench' ? 'M26.4 54.4 L30.4 62.8 L21.6 59.2 Z' : 'M26.8 54.4 L30.2 62 L25.4 58.6 Z';
        d += P(lw, lap) + P(mirrorX(lw), lap);
        if (lk.rose) d += C(41.5, 58.6, 1.5, '#D9483B') + C(41.5, 58.6, .6, '#8E1F1F') + P('M41.5 60 L41 62', null, '#3E8A2E', .7);
        else if (lk.outfit !== 'trench') d += R(40, 58.4, 3.4, 1.4, .4, lk.pocket || WH);
        if (lk.chain) d += P('M26.8 55.6 Q32 62 37.2 55.6', null, GOLD, 1.3, ' stroke-dasharray="1.1 .7"');
        return d;
      case 'track': d = P('M25 54.6 Q32 57.4 39 54.6', null, t, 2.4) + P('M32 56.4 L32 66', null, t, 1.2) + R(31.3, 57, 1.4, 2.4, .5, STEEL) + P('M8 61.6 L17.4 55.8 M9.4 63.6 L18.8 57.8', null, a, 1.1) + P(mirrorX('M8 61.6 L17.4 55.8 M9.4 63.6 L18.8 57.8'), null, a, 1.1);
        if (lk.chain) d += P('M26 55.4 Q32 63.4 38 55.4', null, GOLD, 1.9, ' stroke-dasharray="1.3 .7"') + C(32, 61.6, 1.7, GOLD, ' stroke="#B8860B" stroke-width=".4"');
        return d;
      case 'longcoat': d = P('M27.5 54.5 L32 63 L36.5 54.5 Z', t) + P('M12 59.5 Q16 52.6 25 54 Q29 58.6 32 59.6 Q35 58.6 39 54 Q48 52.6 52 59.5 Q46 61.4 41 59.6 Q36 63 32 62 Q28 63 23 59.6 Q18 61.4 12 59.5 Z', a) + P('M15 58.6 Q17 56.6 19 57.6 M45 58.6 Q47 56.6 49 57.6 M27 58 Q28 56.8 29.4 57.6 M37 58 Q36 56.8 34.6 57.6', null, INK, .5, ' opacity=".25"') + C(28, 63.4, .9, GOLD) + C(36, 63.4, .9, GOLD);
        if (lk.chain) d += P('M27.4 57.6 Q32 64.6 36.6 57.6', null, GOLD, 1.9, ' stroke-dasharray="1.3 .7"');
        return d;
      case 'apron': return C(27.4, 58.4, .9, t) + C(36.6, 58.4, .9, t) + C(27.4, 61.6, .9, t) + C(36.6, 61.6, .9, t) + P('M26.6 54.4 Q32 58.4 37.4 54.4 L35.6 57.4 Q32 59.2 28.4 57.4 Z', a) + P('M24 55 Q32 52.6 40 55', null, t, .7, ' opacity=".5"');
      case 'fire': return R(0, 59, 64, 2, 0, a) + R(0, 61, 64, .8, 0, em) + R(0, 58.2, 64, .8, 0, em) + P('M25 54.6 Q32 57.6 39 54.6', null, t, 2.6) + R(30.4, 56.6, 3.2, 9, .8, t, ' opacity=".7"');
      case 'hero': d = P('M7 61 Q11 54.6 20.4 55.6 L18.4 58.6 Z', em) + P(mirrorX('M7 61 Q11 54.6 20.4 55.6 L18.4 58.6 Z'), em) + C(32, 60.4, 3.9, a, ' stroke="' + t + '" stroke-width=".7"');
        d += lk.emblem === 'star' ? star(32, 60.4, 2.8, t, 5, .45) : P('M33 57.2 L30.2 60.8 L32.2 60.8 L31 63.6 L34 59.8 L32 59.8 Z', t);
        return d + P('M25 54.6 Q32 57 39 54.6', null, t, 1.4);
      case 'vamp': return P('M27 54.5 L32 64 L37 54.5 Z', a) + P('M28.6 55.4 L32 57.4 L35.4 55.4', null, WH, 1.2) + C(32, 60.6, 1.7, GOLD, ' stroke="#8E1F1F" stroke-width=".5"') + P('M26.6 54.4 L29.8 64 M37.4 54.4 L34.2 64', null, em, 1);
      case 'samurai': for (y = 58; y < 66; y += 3.2) d += P('M8 ' + y + ' L56 ' + y, null, t, 1) + C(20, y + 1.6, .45, GOLD) + C(32, y + 1.6, .45, GOLD) + C(44, y + 1.6, .45, GOLD);
        return d + E(12.5, 58.6, 8.4, 4.6, a) + E(51.5, 58.6, 8.4, 4.6, a) + P('M6 58 L19 58 M6 60.6 L19 60.6 M45 58 L58 58 M45 60.6 L58 60.6', null, t, .6) + P('M25 54.6 Q32 57.6 39 54.6', null, GOLD, 1.4);
      case 'tabard': for (y = 56; y < 66; y += 2.2) for (x = 8 + (y % 4.4 ? 1.1 : 0); x < 58; x += 2.2) d += C(x, y, .55, t, ' opacity=".55"');
        return d + P('M24.4 54.6 L39.6 54.6 L39.6 66 L24.4 66 Z', a) + star(32, 60.6, 2.8, em, 5, .45) + E(13, 58.2, 8.4, 4.2, STEEL) + E(51, 58.2, 8.4, 4.2, STEEL) + P('M7 57 Q13 54 19 56.6', null, WH, .8, ' opacity=".6"') + P(mirrorX('M7 57 Q13 54 19 56.6'), null, WH, .8, ' opacity=".6"');
      case 'wrap': for (y = 53; y < 68; y += 3) d += P('M4 ' + (y + 2) + ' L60 ' + (y - 1.5), null, t, .7, ' opacity=".55"'); return d + P('M14 56 L30 64', null, t, .6, ' opacity=".45"') + P('M40 55 L52 60', null, t, .6, ' opacity=".45"');
      case 'leather': return P('M27.6 54.5 L32 59 L36.4 54.5 Z', a) + P('M26.6 54.4 L30 64 L23 59 Z', t) + P(mirrorX('M26.6 54.4 L30 64 L23 59 Z'), t) + C(24.4, 57.2, .5, STEEL) + C(39.6, 57.2, .5, STEEL) + C(25.6, 60, .5, STEEL) + C(38.4, 60, .5, STEEL) + P('M33.4 60 L36.6 66', null, STEEL, .9) + P('M10 58 L18 58', null, STEEL, .6, ' opacity=".6"');
      case 'mech': return P('M22.6 55 L26.4 66 M41.4 55 L37.6 66', null, t, 2.4) + P('M24 61.4 L40 61.4', null, t, 1.8) + R(29.6, 59.6, 4.8, 3.6, 1, em) + R(10, 58.4, 6, 3, .8, a) + P('M25.4 54.6 Q32 57 38.6 54.6', null, a, 1.6);
      case 'feathers': for (x = 4; x < 62; x += 5) d += P('M' + (x - 2.6) + ' 56 Q' + x + ' 63 ' + (x + 2.6) + ' 56 Z', (x / 5) % 2 < 1 ? a : em) + P('M' + (x - 2.6) + ' 61 Q' + (x + 2.5) + ' 68 ' + (x + 5) + ' 61 Z', (x / 5) % 2 < 1 ? em : a, null, 0, ' opacity=".9"');
        return d + P('M25 54.6 Q32 58 39 54.6', null, t, 1.6) + C(32, 60.4, 1.6, WH, ' opacity=".9"');
      case 'tinbody': return R(22.6, 56, 18.8, 10, 2, t) + C(27.6, 59.6, 1.7, em) + C(36.4, 59.6, 1.7, a) + P('M26 63.4 L38 63.4', null, a, .8) + P('M36.4 59.6 L37.4 58.6', null, INK, .6) + C(12, 60, .8, t) + C(52, 60, .8, t) + C(16, 57.4, .8, t) + C(48, 57.4, .8, t);
      case 'belly': return E(32, 66, 11, 10, lk.belly || WH) + P('M24.4 54.8 Q32 57 39.6 54.8', null, a, 1.4);
      default: return '';
    }
  }
  // Head pieces by name, shared by the new skins (look.head, space-separated) and the new hat accessories.
  // h1: main colour, h2: second colour, t: dark trim, em: glow / light colour.
  function hatPart(n, h1, h2, t, em, lk) {
    lk = lk || {};
    var d = '', i;
    switch (n) {
      case 'cap': return P('M15 27 C15 13 23 9 32 9 C41 9 49 13 49 27 Z', h1) + P('M24 10.6 Q22 18 22.4 27 M40 10.6 Q42 18 41.6 27', null, INK, .6, ' opacity=".18"') + C(32, 9.6, 1.6, h2) + (lk.logo === 'none' ? '' : star(32, 18.4, 3.2, h2, 5, .45)) + P('M14 26 Q32 22 50 26 Q52.4 30.6 46 31 Q32 28.6 18 31 Q11.6 30.6 14 26 Z', h2);
      case 'capback': return P('M43 14 Q50 8 56 10.6 Q53 15 47 17.6 Z', h2) + P('M15 27 C15 13 23 9 32 9 C41 9 49 13 49 27 Z', h1) + R(15, 25, 34, 3.4, 1.7, h2) + R(28, 22.6, 8, 3, 1.4, t, ' opacity=".5"') + C(32, 9.6, 1.6, h2);
      case 'band': return R(15.6, 21, 32.8, 5, 2.5, h1) + R(15.6, 22.8, 32.8, 1.4, .7, h2);
      case 'hachimaki': return R(15.6, 21.4, 32.8, 4.4, 2.2, h1) + P('M47 23.6 L56.6 19.4 L55.2 24 Z M47 24.6 L55.6 29.6 L52.8 31.2 Z', h1) + C(48, 23.8, 2.2, h1) + C(32, 23.6, 1.6, h2);
      case 'fbhelm': return P('M13 34 C12 15 22 8 32 8 C42 8 52 15 51 34 L51 40 Q48.4 42.6 46 40 L46 30 Q32 25 18 30 L18 40 Q15.6 42.6 13 40 Z', h1) + P('M32 8.2 L32 26.4', null, h2, 3) + P('M19 13 Q24 9.6 30 9', null, WH, 1.4, ' opacity=".45"') + C(15.6, 35, 1.5, INK, ' opacity=".35"') + C(48.4, 35, 1.5, INK, ' opacity=".35"') + P('M17 39.4 Q32 46 47 39.4 M18 44.6 Q32 52 46 44.6 M24 41.8 L24 49.4 M40 41.8 L40 49.4', null, lk.mask || em, 1.6);
      case 'hockey': return P('M14 32 C13 15 22 9 32 9 C42 9 51 15 50 32 L46.6 32 L46.6 28 Q32 23 17.4 28 L17.4 32 Z', h1) + R(25, 11.4, 3, 6, 1.5, INK, ' opacity=".28"') + R(36, 11.4, 3, 6, 1.5, INK, ' opacity=".28"') + P('M17.4 27.4 Q32 22.6 46.6 27.4', null, h2, 1.6) + P('M17.4 32 Q19.6 50 32 52.4 Q44.4 50 46.6 32', null, t, 1, ' opacity=".55"');
      case 'swim': return P('M15 30 C14 13 23 8.6 32 8.6 C41 8.6 50 13 49 30 Q32 24.6 15 30 Z', h1) + P('M20 20 Q24 13 31 11.6', null, WH, 1.6, ' opacity=".5"') + (lk.logo === 'none' ? '' : star(39, 17, 2.4, h2, 5, .45));
      case 'flatcap': return P('M15 26 C15 16 24 12.6 34 12.6 C44 12.6 50 16.6 50 23.6 Q52.6 27 49 28 Q32 25 15 28 Z', h1) + P('M18 18 L46 18 M17 22 L48 22', null, h2, .6, ' opacity=".55"') + P('M15 26 Q32 23 49 26 L48 29 Q32 26.6 16 29 Z', h2) + C(33.4, 13.2, 1.2, h2);
      case 'visorcap': return R(15.6, 21.6, 32.8, 4.2, 2.1, h1) + P('M17 25 Q32 21.6 47 25 Q49.4 30.2 43 29.8 Q32 27.6 21 29.8 Q14.6 30.2 17 25 Z', h2);
      case 'skihelm': return P('M14 31 C13 14 22 8.6 32 8.6 C42 8.6 51 14 50 31 L46.4 31 Q46 22 32 21 Q18 22 17.6 31 Z', h1) + P('M16 20.6 L48 20.6', null, INK, 2) + R(18, 15.4, 28, 8, 4, em, ' stroke="' + INK + '" stroke-width="1.2"') + P('M21 17.6 L26 17.6', null, WH, 1, ' opacity=".8"');
      case 'boxhead': return P('M15 31 C14 13 23 8.6 32 8.6 C41 8.6 50 13 49 31 L45 31 Q44.4 18.6 32 18.6 Q19.6 18.6 19 31 Z', h1) + P('M14 30 L19.4 30 L20.4 45 Q17 47.4 14 44 Z', h1) + P(mirrorX('M14 30 L19.4 30 L20.4 45 Q17 47.4 14 44 Z'), h1) + P('M21 13 Q32 9 43 13', null, h2, 1.6) + P('M19 13.6 Q24 10.4 29 10', null, WH, 1.2, ' opacity=".45"');
      case 'fencing': for (i = 0; i < 5; i++) d += P('M' + (20 + i * 6) + ' 6.6 L' + (20 + i * 6) + ' 21.4', null, INK, .5, ' opacity=".5"'); return E(32, 14, 14.6, 8.4, '#5B6573') + d + P('M18 11 L46 11 M17.6 15 L46.4 15 M19 19 L45 19', null, INK, .5, ' opacity=".5"') + E(32, 14, 14.6, 8.4, 'none', ' stroke="' + h1 + '" stroke-width="1.6"') + R(23, 20.6, 18, 3, 1.4, h1);
      case 'bow': return P('M32 14 L21.6 7.6 Q18.6 13 21.6 19.4 Z M32 14 L42.4 7.6 Q45.4 13 42.4 19.4 Z', h1) + P('M30 14 L23.4 10.6 M34 14 L40.6 10.6', null, h2, .9) + C(32, 14, 2.6, h1, ' stroke="' + h2 + '" stroke-width=".7"');
      case 'race': return P('M10 38 C10 16 20 7 32 7 C44 7 54 16 54 38 C54 48 50 54 44 56 L20 56 C14 54 10 48 10 38 Z M18.6 34 C18.6 26 24.4 21.6 32 21.6 C39.6 21.6 45.4 26 45.4 34 L45.4 44 C45.4 50 39.6 53 32 53 C24.4 53 18.6 50 18.6 44 Z', h1, null, 0, ' fill-rule="evenodd"') +
          P('M13.6 22 Q32 2 50.4 22', null, h2, 2.6) + R(17.6, 16.4, 28.8, 5.6, 2.8, em, ' opacity=".9"') + P('M21 18.4 L27 18.4', null, WH, 1, ' opacity=".8"') + (lk.num != null ? digits(lk.num, 13.6, 40, 5, h2, 1.3) : '');
      case 'hood': d = P('M7 36 C7 18 18 8 32 8 C46 8 57 18 57 36 C57 50 50 60 32 60 C14 60 7 50 7 36 Z M16.4 36 C16.4 26 23 19.4 32 19.4 C41 19.4 47.6 26 47.6 36 C47.6 46 41 52.6 32 52.6 C23 52.6 16.4 46 16.4 36 Z', h1, null, 0, ' fill-rule="evenodd"');
        if (lk.ears === 'round') d = C(13, 12, 6.4, h1) + C(51, 12, 6.4, h1) + C(13, 12, 3.2, h2) + C(51, 12, 3.2, h2) + d;
        if (lk.ears === 'point') d = P('M8 20 L10 0 L24 10 Z', h1) + P(mirrorX('M8 20 L10 0 L24 10 Z'), h1) + P('M10.6 15 L11.6 4.6 L19 10 Z', h2) + P(mirrorX('M10.6 15 L11.6 4.6 L19 10 Z'), h2) + d;
        if (lk.crest) d = P('M24 10 L26 -2 L30 7 L32 -4 L34 7 L38 -2 L40 10 Z', h2) + d;
        if (lk.stripes) d += P('M9 28 L14 30 M8.4 36 L14.6 36.4 M9.4 44 L14.8 42 M55 28 L50 30 M55.6 36 L49.4 36.4 M54.6 44 L49.2 42 M28 9.6 L29.4 15 M36 9.6 L34.6 15', null, t, 1.6);
        if (lk.eyes2) d += C(25.4, 12.6, 3.6, WH) + C(38.6, 12.6, 3.6, WH) + C(26, 13.4, 1.7, INK) + C(38, 13.4, 1.7, INK) + C(26.6, 12.6, .6, WH) + C(38.6, 12.6, .6, WH);
        if (lk.beak) d += P('M27.4 15.6 L36.6 15.6 Q36 19.6 32 23.4 Q28 19.6 27.4 15.6 Z', lk.beak) + P('M28.4 17.4 Q32 18.8 35.6 17.4', null, INK, .6, ' opacity=".4"');
        return d;
      case 'laurel': var lv = [[16.6, 30, -10], [16.8, 25, -30], [18.8, 20.6, -45], [22, 17, -60], [26, 14.4, -75]];
        lv.forEach(function (p) { d += E(p[0], p[1], 3.4, 1.6, h1, ' transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')" stroke="' + t + '" stroke-width=".5"'); d += E(64 - p[0], p[1], 3.4, 1.6, h1, ' transform="rotate(' + (-p[2]) + ' ' + (64 - p[0]) + ' ' + p[1] + ')" stroke="' + t + '" stroke-width=".5"'); });
        return P('M17.4 32 Q17 18 28 13.6 M46.6 32 Q47 18 36 13.6', null, t, .8) + d + (lk.gem ? C(32, 13.4, 1.8, em) : '');
      case 'starcrown': [[18.4, 19, 3.4], [24.6, 13, 3.8], [32, 10.4, 4.4], [39.4, 13, 3.8], [45.6, 19, 3.4]].forEach(function (p) { d += star(p[0], p[1], p[2], h1, 5, .45, ' stroke="' + t + '" stroke-width=".6"'); }); return d + C(32, 10.6, 1, em);
      case 'bandana': return P('M15 27 C15 13 23 9.4 32 9.4 C41 9.4 49 13 49 27 Q32 22 15 27 Z', h1) + C(22, 17, 1.2, h2) + C(29, 13, 1.2, h2) + C(36, 16, 1.2, h2) + C(43, 19, 1.2, h2) + C(27, 21, 1.2, h2) + C(38, 22, 1.1, h2) + C(33, 10.6, 1, h2) +
          P('M48 23.6 L56.6 21.4 L54.4 27 Z M48 25 L55.2 31.4 L51 31.6 Z', h1) + C(48.6, 25, 2.2, h1);
      case 'tricorn': case 'tricornking':
        d = P('M7 25 Q11 16.6 19.6 19.6 Q23.6 7.6 32 7.6 Q40.4 7.6 44.4 19.6 Q53 16.6 57 25 Q46 27.6 32 30.4 Q18 27.6 7 25 Z', h1) + P('M7 25 Q18 27.6 32 30.4 Q46 27.6 57 25', null, h2, 1.4) + P('M19.6 19.6 Q32 15.6 44.4 19.6', null, INK, .7, ' opacity=".3"');
        if (lk.feather) d = P('M41 15 Q49 1 60 2.6 Q53 7.6 45.4 17 Z', lk.feather) + P('M44 14 Q51 6 58 3.6', null, WH, .6, ' opacity=".5"') + d;
        if (lk.ragged) d += P('M12 24 L13.6 26.6 L15 24.6 M50 24.6 L51.4 26.6 L52.6 24', null, INK, .8, ' opacity=".5"');
        if (n === 'tricornking') d += P('M23.4 10.6 L24.6 2.4 L28.6 6.6 L32 0 L35.4 6.6 L39.4 2.4 L40.6 10.6 Z', GOLD, '#B8860B', .5) + C(32, 6.4, 1.2, '#D9483B') + C(26.4, 8, .8, '#5CC8FF') + C(37.6, 8, .8, '#7CE38B');
        else if (lk.skull !== false) d += skull(32, 17, 1, lk.skullc || WH);
        return d;
      case 'fedora': return P('M9 26 Q32 19.6 55 26 Q51 30.4 32 28.6 Q13 30.4 9 26 Z', h1) + P('M18 25 Q17 11.6 24 10 Q28 13 32 11 Q36 13 40 10 Q47 11.6 46 25 Z', h1) + P('M18 21.4 Q32 19.6 46 21.4 L46 25 Q32 23 18 25 Z', h2) + P('M32 11.4 L32 20', null, INK, .8, ' opacity=".2"') + P('M20 14 Q22 11.6 25 11.4', null, WH, .8, ' opacity=".3"');
      case 'bowler': return P('M18 25 C18 10.6 46 10.6 46 25 Z', h1) + E(32, 25.4, 17.4, 3, h1) + R(18, 21.4, 28, 3, 0, h2) + P('M22 15 Q25 12.6 29 12.4', null, WH, .9, ' opacity=".35"');
      case 'furhat': for (i = 16; i <= 48; i += 4) d += C(i, 25, 2.8, h1) + P('M' + (i - 1.4) + ' 24 Q' + i + ' 26.6 ' + (i + 1.4) + ' 24', null, INK, .45, ' opacity=".3"');
        return R(16, 4.4, 32, 21, 8, h1) + P('M20 9 Q22 7 24 9 M28 7 Q30 5 32 7 M36 8 Q38 6 40 8 M22 15 Q24 13 26 15 M32 13 Q34 11 36 15 M40 16 Q42 14 44 16', null, INK, .5, ' opacity=".28"') + d + (lk.gem ? C(32, 14, 1.8, em, ' stroke="' + GOLD + '" stroke-width=".8"') : '');
      case 'earpiece': return P('M48.6 37.4 Q51.6 42 49.4 47 Q47.4 52 44 56', null, '#E8ECF2', .7, ' opacity=".85"') + C(48.2, 36.6, 1.3, INK);
      case 'slick': case 'vampslick': return P('M16 31 C15 16 23 11 32 11 C41 11 49 16 48 31 C45 22.6 39 19.6 32 20 C25 19.6 19 22.6 16 31 Z', h1) + (n === 'vampslick' ? P('M27 19.6 L32 25 L37 19.6 Z', h1) : '') + P('M22 16 Q30 12 40 14 M20 21 Q26 16.6 34 16', null, WH, .8, ' opacity=".3"');
      case 'mohawk': return P('M26 21 L23.4 1.6 L29 10 L31 -1.4 L34 9 L38.6 0.4 L39 12 L42.6 4 L40.4 21 Z', h1) + P('M29 18 L28 6 M35 17 L37 6', null, h2, .9, ' opacity=".7"');
      case 'dome': return P('M32 10.6 L32 3', null, t, 1.4) + C(32, 3, 2, em) + C(32, 3, 3.6, em, ' opacity=".3"') + R(17, 10, 30, 12.6, 4, h1) + C(20, 13, .8, t) + C(44, 13, .8, t) + C(20, 19.6, .8, t) + C(44, 19.6, .8, t) + R(26, 13.6, 12, 4, 2, t) + C(29, 15.6, 1, em) + C(35, 15.6, 1, h2) + C(15, 36, 4, t) + C(49, 36, 4, t) + P('M13.4 34.4 L16.6 37.6 M47.4 34.4 L50.6 37.6', null, em, 1.2);
      case 'vacuum': return E(32, 18, 17, 9.4, h1) + R(14, 20.6, 36, 4.2, 2.1, t) + C(32, 11.4, 2, em) + C(32, 11.4, 3.6, em, ' opacity=".3"') + P('M20 16 Q25 11 31 10', null, WH, 1, ' opacity=".5"') + C(15, 36, 3.4, t) + C(49, 36, 3.4, t);
      case 'junk': return P('M40 15.6 L42 8 L47 6', null, t, 1.4) + C(47, 6, 1.7, em) + R(18, 14.6, 28, 8.4, 1.4, h1) + R(20, 15.6, 7, 4.6, .6, h2, ' opacity=".85"') + P('M34 16 L36 21 M38 15.6 L36.6 21.6', null, t, .7) + C(21, 21, .7, t) + C(43, 16.6, .7, t) + C(15, 36, 4.2, h2) + R(45.4, 32.6, 7, 7, 1.4, t) + C(15, 36, 1.4, em) + C(49, 36, 1.3, em);
      case 'android': return P('M15 36 C14 18 22 11 32 11 C42 11 50 18 49 36 L46 36 C46 24 40 19 32 19 C24 19 18 24 18 36 Z', h1) + P('M32 11.4 L32 19', null, em, 1) + C(15.6, 36, 2.6, h1) + C(48.4, 36, 2.6, h1) + C(15.6, 36, 1.2, em) + C(48.4, 36, 1.2, em) + P('M20 16.6 Q25 12.6 31 12', null, WH, 1, ' opacity=".6"');
      case 'pilot': return P('M14 33 C13 15 22 9 32 9 C42 9 51 15 50 33 L46.6 33 L46.6 28 Q32 23 17.4 28 L17.4 33 Z', h1) + R(18, 17, 28, 6.6, 3.3, em, ' opacity=".85" stroke="' + t + '" stroke-width="1"') + P('M21 19 L27 19', null, WH, 1, ' opacity=".8"') + R(29, 9.4, 6, 3, 1, h2) + P('M47 38 Q47 46.6 39 48', null, INK, 1) + C(38.6, 48, 1.3, INK);
      case 'toque': return P('M19 26 L19 18 C13 17 12 8 19 7 C21 2 28 1 32 4 C36 1 43 2 45 7 C52 8 51 17 45 18 L45 26 Z', WH, '#D3D8E0', .8) + R(19, 21.4, 26, 5, 1, '#EEF1F5', ' stroke="#D3D8E0" stroke-width=".6"') + P('M25 9 L25.6 18 M32 6 L32 18 M39 9 L38.4 18', null, '#D3D8E0', .7);
      case 'firehelm': return P('M14 26 C14 12 23 8 32 8 C41 8 50 12 50 26 Z', h1) + P('M7 27 Q32 21 57 27 L55 30.6 Q32 25.4 9 30.6 Z', h1, INK, .6) + P('M32 8 L32 13', null, t, 1.8) + P('M28 13 L36 13 L36 19 Q32 22.4 28 19 Z', h2, t, .6) + C(32, 16.6, 1.2, t) + P('M18 15 Q22 10.6 28 9.6', null, WH, 1.1, ' opacity=".4"');
      case 'pizza': return P('M15.6 25 Q32 17 48.4 25 L32 -1 Z', '#FFD45C') + P('M14 25 Q32 16.6 50 25 L49 29 Q32 21.4 15 29 Z', '#D9973A') + C(27.6, 15.6, 2.4, '#D9483B') + C(35, 9.4, 1.9, '#D9483B') + C(37, 18, 2.2, '#D9483B') + C(31, 5, 1.2, '#7CB342') + P('M22 20.6 Q22.6 24 21.6 25 M40.4 20.4 L41 24', null, '#FFD45C', 1.4);
      case 'pumpkin': return R(30.6, 2.6, 3.4, 5.4, 1, '#5C8A2E') + E(37, 4.4, 4, 1.8, '#7CB342', ' transform="rotate(-20 37 4.4)"') + E(32, 15, 15.6, 9, h1) + P('M24 7.6 Q21 15 24 22.4 M32 6.4 L32 23.6 M40 7.6 Q43 15 40 22.4', null, h2, 1, ' opacity=".6"') + P('M19 13 Q21 9.4 25 8.6', null, WH, .9, ' opacity=".4"');
      case 'earmuffs': return P('M15.4 31 C15 9.6 49 9.6 48.6 31', null, h2, 2.4) + C(15.4, 35, 5.6, h1) + C(48.6, 35, 5.6, h1) + C(14, 33.4, 1.6, WH, ' opacity=".5"') + C(47.2, 33.4, 1.6, WH, ' opacity=".5"');
      case 'wizhat': case 'archhat':
        d = P('M14 27 Q31 23 50 27 L46 30 Q31 27 18 30 Z', h1) + P('M18 27 Q24 14 31 3 Q34 -1 40 4 Q36 3 35 7 Q40 16 46 27 Z', h1) + P('M18.6 25.4 Q32 21.6 45.4 25.4', null, h2, 1.6) + star(28, 16, 2, h2, 5, .45) + star(38, 21, 1.5, h2, 5, .45) + C(33, 10, .9, h2);
        if (n === 'archhat') d += C(37, 6, 3.4, GOLD) + C(38.6, 5, 2.9, h1) + star(40, 4, 1.8, em, 4, .3, ' opacity=".9"') + star(13, 14, 1.6, em, 4, .3);
        return d;
      case 'ninja': return P('M15 31 C15 13 23 9 32 9 C41 9 49 13 49 31 Q32 26.6 15 31 Z', h1) + P('M47.4 22 L57.4 28 L55.4 21.4 Z M47.6 24 L54.6 33.6 L50.6 33 Z', h1) + P('M16 28.4 Q32 24 48 28.4', null, h2, 1.2);
      case 'phones': return P('M15 33 C14 8 50 8 49 33', null, h1, 3) + R(9.6, 29, 8.4, 13, 3.4, h1) + R(46, 29, 8.4, 13, 3.4, h1) + R(15.6, 31, 2.6, 9, 1.3, em) + R(45.8, 31, 2.6, 9, 1.3, em) + C(13.8, 35.4, 1.6, h2) + C(50.2, 35.4, 1.6, h2);
      case 'mummy': return P('M15.6 26 C15 13 49 13 48.4 26', null, h1, 4.4) + P('M16.6 20 Q32 14 47.6 21', null, h1, 3.4) + P('M18 28.6 Q32 24.6 46 29', null, h1, 3) + P('M16.6 20 Q32 14 47.6 21 M18 28.6 Q32 24.6 46 29', null, t, .5, ' opacity=".55"') + P('M20 11 L44 17', null, h1, 3) + P('M44 26 L47.6 33', null, h1, 2.4);
      case 'kabuto': return P('M12 26 L9.4 40.6 L18 38.6 L18 28 Z', h1) + P(mirrorX('M12 26 L9.4 40.6 L18 38.6 L18 28 Z'), h1) + P('M10.6 31 L17.6 30.4 M10 35.4 L17.8 34.4', null, h2, .8) + P('M53.4 31 L46.4 30.4 M54 35.4 L46.2 34.4', null, h2, .8) +
          P('M14 28 C14 12 23 8 32 8 C41 8 50 12 50 28 Z', h1) + P('M14.6 26 Q32 21.6 49.4 26', null, h2, 1.6) + P('M32 13 Q22 7 19 -2.4 Q26 4 32 7.6 Q38 4 45 -2.4 Q42 7 32 13 Z', GOLD, '#B8860B', .5) + C(32, 13.4, 2, em) + P('M20 14 Q24 10.6 29 10', null, WH, .9, ' opacity=".35"');
      case 'knight': case 'royalknight':
        d = P('M32 7 Q40 -4 53 1.6 Q45 2 38.6 8.6 Z', em) + P('M11 38 C11 16 20 7 32 7 C44 7 53 16 53 38 L53 50 L46 52 L46 34 C46 26 40 21.6 32 21.6 C24 21.6 18 26 18 34 L18 52 L11 50 Z', h1) + P('M14 22 Q32 6 50 22', null, h2, 1.4) + P('M18 16 Q23 11 29 10', null, WH, 1.2, ' opacity=".55"') + C(14.4, 44, .8, h2) + C(49.6, 44, .8, h2);
        if (n === 'royalknight') d += P('M22 10.6 L23.4 3 L27.4 7 L32 1 L36.6 7 L40.6 3 L42 10.6 Q32 8 22 10.6 Z', GOLD, '#B8860B', .5) + C(32, 6.4, 1.1, '#D9483B');
        return d;
      case 'flame': return '<g>' + P('M19 23 Q12 12 21 3 Q21 11 26.6 13.6 Q25 3 32 -3 Q35.4 7.6 37.4 13.6 Q42 6 44.4 3 Q51 12 45 23 Q32 18 19 23 Z', h1) + P('M24 21 Q21 14 25 9 Q27 15 30.6 16 Q30 9 32.6 4.6 Q35.6 11 36.4 16 Q39 12 40.4 10 Q43 15 40 21 Q32 18.6 24 21 Z', h2) + C(32, 17, 1.8, WH, ' opacity=".8"') +
          '<animateTransform attributeName="transform" type="scale" values="1 1;1 1.05;1 .97;1 1" dur="1.1s" repeatCount="indefinite" additive="sum"/></g>';
      default: return '';
    }
  }
  function headMore(lk, c) {
    if (!lk.head) return '';
    var h1 = lk.h1 || c.accent, h2 = lk.h2 || c.trim;
    return String(lk.head).split(' ').map(function (n) { return hatPart(n, h1, h2, c.trim, c.emissive, lk); }).join('');
  }
  // Things on the face, over the face and outfit, under the head piece.
  function facePiece(lk, c) {
    var out = '';
    String(lk.face || '').split(' ').forEach(function (n) {
      var pc = lk.fc || INK;
      switch (n) {
        case 'patch': out += P('M16.4 26.6 L35 31.6 M43.4 34.6 L49 37', null, INK, 1.1) + P('M33.6 30 Q39 27.6 44.4 30 Q45.4 36 39 39.6 Q32.6 36 33.6 30 Z', pc) + P('M35.4 30.6 Q38 29.6 40.6 30', null, WH, .6, ' opacity=".35"'); break;
        case 'shades': out += P('M17.4 31 L30.4 31 L29.6 36.6 Q24 39 18.4 36.6 Z', pc) + P(mirrorX('M17.4 31 L30.4 31 L29.6 36.6 Q24 39 18.4 36.6 Z'), pc) + P('M30.4 31.6 L33.6 31.6 M17.4 31.4 L15 30.6 M46.6 31.4 L49 30.6', null, pc, 1.1) + P('M20 32.6 L24 32.6 M36 32.6 L40 32.6', null, WH, .8, ' opacity=".5"'); break;
        case 'stache': out += P('M32 40.2 Q28 38.4 24.4 40.6 Q22.6 42 21 41 Q22.4 44.2 26.4 43.2 Q30 42.4 32 41.4 Q34 42.4 37.6 43.2 Q41.6 44.2 43 41 Q41.4 42 39.6 40.6 Q36 38.4 32 40.2 Z', lk.sc || '#2B1B12'); break;
        case 'beard': out += P('M17 38 Q18 52 32 60 Q46 52 47 38 Q44 46 38 44 Q32 41 26 44 Q20 46 17 38 Z', lk.sc || '#E8ECF2') + P('M24 47 Q26 53 30 56 M40 47 Q38 53 34 56 M32 50 L32 58', null, INK, .5, ' opacity=".2"') + P('M32 40.6 Q27.6 39 24 41 Q22.4 43.6 25.6 43.4 Q30 42.4 32 41.6 Q34 42.4 38.4 43.4 Q41.6 43.6 40 41 Q36.4 39 32 40.6 Z', lk.sc || '#E8ECF2'); break;
        case 'mask': out += P('M16.4 38 Q32 35.6 47.6 38 L46.6 46 Q43.6 52.6 32 53.4 Q20.4 52.6 17.4 46 Z', lk.mc || c.accent) + P('M19 41 Q32 39 45 41', null, INK, .5, ' opacity=".25"'); break;
        case 'domino': out += P('M17 30.4 Q24 27.4 32 31 Q40 27.4 47 30.4 L46 37 Q40 39.6 34 36.4 L32 35.4 L30 36.4 Q24 39.6 18 37 Z M21.2 34 a3.8 3 0 1 0 7.6 0 a3.8 3 0 1 0 -7.6 0 Z M35.2 34 a3.8 3 0 1 0 7.6 0 a3.8 3 0 1 0 -7.6 0 Z', lk.mc || c.accent, null, 0, ' fill-rule="evenodd"'); break;
        case 'eyeblack': out += R(20.4, 38.4, 8.6, 2.2, 1, INK) + R(35, 38.4, 8.6, 2.2, 1, INK); break;
        case 'goggles': out += P('M16 33.6 L48 33.6', null, lk.gc || c.trim, 1.6) + E(25, 34, 5.4, 4, lk.gl || c.emissive, ' opacity=".8" stroke="' + INK + '" stroke-width="1"') + E(39, 34, 5.4, 4, lk.gl || c.emissive, ' opacity=".8" stroke="' + INK + '" stroke-width="1"') + P('M22 32.6 L25 32 M36 32.6 L39 32', null, WH, .8, ' opacity=".8"'); break;
        case 'fangs': out += P('M28.6 43.6 L29.6 46.6 L30.6 43.8 Z M33.4 43.8 L34.4 46.6 L35.4 43.6 Z', WH, INK, .3); break;
        case 'visor': out += R(17, 30.6, 30, 7, 3.5, lk.vc || c.emissive, ' opacity=".55"') + P('M19 32.6 L28 32.6', null, WH, 1, ' opacity=".8"'); break;
        case 'collar': out += P('M23 55 L12 41 L17 54 Z', c.accent) + P(mirrorX('M23 55 L12 41 L17 54 Z'), c.accent) + P('M22.4 55 L14.4 44.6', null, '#8E1F1F', .8); break;
      }
    });
    return out;
  }
  // Animated extras for the special skins (SVG animation: no script, nothing to run).
  function fxPart(lk, id) {
    var out = '';
    String(lk.fx || '').split(' ').forEach(function (n) {
      switch (n) {
        case 'shine': out += '<defs><linearGradient id="' + id + 'sh" x1="0" x2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".75"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>' +
          '<rect x="-30" y="-16" width="12" height="96" fill="url(#' + id + 'sh)" transform="rotate(24 32 32)"><animate attributeName="x" values="-30;84;84" keyTimes="0;.42;1" dur="3.4s" repeatCount="indefinite"/></rect>'; break;
        case 'frame': out += C(32, 32, 30.8, 'none', ' stroke="' + GOLD + '" stroke-width="2.4"') + C(32, 32, 28.8, 'none', ' stroke="#FFF2C2" stroke-width=".6" opacity=".8"') + star(32, 1.6, 2.6, '#FFF2C2', 4, .35) + star(2.4, 32, 2, GOLD, 4, .35) + star(61.6, 32, 2, GOLD, 4, .35); break;
        case 'orbit': out += '<g>' + star(32, 5, 2.4, lk.oc || '#FFE79A', 5, .45) + star(8.6, 45.6, 1.8, lk.oc || '#FFE79A', 5, .45) + C(55.4, 45.6, 1.3, lk.oc || '#FFE79A') + '<animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="10s" repeatCount="indefinite"/></g>'; break;
        case 'twinkle': [[9, 12, 0], [55, 16, .7], [54, 42, 1.4], [10, 44, 2.1]].forEach(function (q) { out += star(q[0], q[1], 2.4, '#FFFFFF', 4, .3, ' opacity="0"').replace('/>', '><animate attributeName="opacity" values="0;1;0" dur="2.8s" begin="' + q[2] + 's" repeatCount="indefinite"/></path>'); }); break;
        case 'flicker': out += C(32, 20, 22, lk.gc || '#FF7A2E', ' opacity=".12"').replace('/>', '><animate attributeName="opacity" values=".08;.22;.1;.18;.08" dur="1.6s" repeatCount="indefinite"/></circle>'); break;
      }
    });
    return out;
  }
  // Accessories (wave 2): behind the face, then in front.
  function accBackMore(a, id) {
    var c = a.three.color, c2 = a.three.color2, s = '';
    switch (a.draw) {
      case 'numcape': return P('M0 68 L5 44 Q32 37 59 44 L64 68 Z', c) + P('M5 44 Q32 37 59 44', null, c2, 1.4) + digits(a.three.num, 6.6, 50, 7, c2, 1.6) + digits(a.three.num, 57.4, 50, 7, c2, 1.6);
      case 'ermine': return P('M0 68 L5 44 Q32 37 59 44 L64 68 Z', c) + P('M2 62 Q4 54 7 48', null, GOLD, 1, ' opacity=".8"') + P(mirrorX('M2 62 Q4 54 7 48'), null, GOLD, 1, ' opacity=".8"');
      case 'soccer': return '<g transform="translate(4 -3)">' + P('M14 52 L22 50 M15 46 L22 46.6 M15 57 L21 55', null, c2, 1, ' opacity=".5"') + C(8.4, 52, 4.6, c, ' stroke="' + INK + '" stroke-width=".7"') + star(8.4, 52, 1.9, INK, 5, .9) + P('M8.4 50.1 L8.4 47.4 M10.2 51.4 L12.6 50.4 M9.5 53.6 L11 55.8 M7.3 53.6 L5.8 55.8 M6.6 51.4 L4.2 50.4', null, INK, .5) + C(12.6, 41, 2.6, c, ' stroke="' + INK + '" stroke-width=".5" opacity=".6"') + C(6, 35, 1.7, c, ' opacity=".4"') + '</g>';
      case 'football': return '<g transform="translate(4 -3)">' + P('M15 52 L22 50.6 M15 47 L21 47 M15 57 L20 55.4', null, c2, 1, ' opacity=".5"') + E(8.6, 52, 5.6, 3.6, c, ' transform="rotate(-30 8.6 52)" stroke="' + INK + '" stroke-width=".5"') + P('M6.6 53.6 L10.6 50.4 M7.2 51.6 L8.2 52.8 M8.4 50.8 L9.4 52 M9.6 49.8 L10.4 51', null, WH, .6) + E(12.8, 41, 3, 2, c, ' transform="rotate(-30 12.8 41)" opacity=".6"') + E(6.4, 35, 2, 1.3, c, ' transform="rotate(-30 6.4 35)" opacity=".4"') + '</g>';
      case 'coins': [[7, 52, 3.4, 1], [13, 44, 2.6, .8], [5, 38, 2.2, .7], [15, 54, 1.8, .6], [10, 33, 1.5, .5]].forEach(function (q) { s += '<g opacity="' + q[3] + '">' + C(q[0], q[1], q[2], c, ' stroke="#B8860B" stroke-width=".5"') + star(q[0], q[1], q[2] * .5, c2, 5, .45) + '</g>'; }); return s;
      case 'notes': [[6, 50, 1], [13, 42, .8], [5, 36, .6]].forEach(function (q) { s += '<g opacity="' + q[2] + '">' + E(q[0], q[1] + 4, 2.2, 1.6, c, ' transform="rotate(-20 ' + q[0] + ' ' + (q[1] + 4) + ')"') + P('M' + (q[0] + 2) + ' ' + (q[1] + 3.6) + ' L' + (q[0] + 2) + ' ' + (q[1] - 3) + ' Q' + (q[0] + 5) + ' ' + (q[1] - 1) + ' ' + (q[0] + 5) + ' ' + (q[1] + 1.6), null, c, 1) + '</g>'; }); return s + C(16, 52, .9, c2) + C(9, 30, .8, c2);
      case 'spot': return '<defs><linearGradient id="' + id + 'sp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c2 + '" stop-opacity=".85"/><stop offset="1" stop-color="' + c + '" stop-opacity=".25"/></linearGradient></defs>' + P('M24 -4 L40 -4 L62 66 L2 66 Z', 'url(#' + id + 'sp)') + E(32, 62, 26, 6, c2, ' opacity=".45"') + E(32, -2, 10, 4, WH, ' opacity=".9"');
      case 'confetti': var cc = [c, c2, '#5CC8FF', '#7CE38B', '#B98BFF'];
        [[7, 18, 30], [14, 9, -20], [50, 7, 50], [57, 20, -35], [5, 32, 70], [59, 34, 15], [44, 3, -60], [10, 44, 40], [55, 47, -15], [22, 3, 20]].forEach(function (q, k) { s += R(q[0] - 1.8, q[1] - .8, 3.6, 1.6, .5, cc[k % 5], ' transform="rotate(' + q[2] + ' ' + q[0] + ' ' + q[1] + ')"'); }); return s;
      case 'flash': [[9, 14, 3.6, 0], [55, 11, 3, .5], [57, 36, 2.6, 1], [6, 38, 2.4, 1.5], [24, 4, 2.2, 2]].forEach(function (q) { s += '<g opacity=".3">' + star(q[0], q[1], q[2] * 1.6, c, 8, .2) + C(q[0], q[1], q[2] * .6, c2) + '<animate attributeName="opacity" values=".15;1;.15" dur="2.4s" begin="' + q[3] + 's" repeatCount="indefinite"/></g>'; }); return s;
      case 'trophy': for (var i = 0; i < 12; i++) { var t0 = i * Math.PI / 6, t1 = t0 + Math.PI / 14; s += P('M32 34 L' + (32 + 60 * Math.cos(t0)).toFixed(1) + ' ' + (34 + 60 * Math.sin(t0)).toFixed(1) + ' L' + (32 + 60 * Math.cos(t1)).toFixed(1) + ' ' + (34 + 60 * Math.sin(t1)).toFixed(1) + ' Z', c, null, 0, ' opacity=".4"'); }
        return '<g>' + s + '<animateTransform attributeName="transform" type="rotate" from="0 32 34" to="360 32 34" dur="24s" repeatCount="indefinite"/></g>' + C(32, 34, 24, c2, ' opacity=".18"') + star(9, 14, 2, WH, 4, .3) + star(55, 14, 1.6, WH, 4, .3);
      default: return '';
    }
  }
  function accFrontMore(a) {
    var c = a.three.color, c2 = a.three.color2, T = a.three.trim || INK, E2 = a.three.glowc || c2;
    switch (a.draw) {
      case 'patch': return facePiece({ face: 'patch', fc: c }, {});
      case 'shades': return facePiece({ face: 'shades', fc: c }, {});
      case 'eyeblack': return facePiece({ face: 'eyeblack' }, {});
      case 'aviators': return P('M17.6 31 L30 31 Q31 39 25 40 Q18 40 17.6 31 Z', c, c2, .9, ' opacity=".9"') + P(mirrorX('M17.6 31 L30 31 Q31 39 25 40 Q18 40 17.6 31 Z'), c, c2, .9, ' opacity=".9"') + P('M30 31.6 Q32 30.4 34 31.6 M30.6 33.4 L33.4 33.4 M17.6 31.4 L15 30.6 M46.4 31.4 L49 30.6', null, c2, .9) + P('M20 33 L24 33 M36 33 L40 33', null, WH, .8, ' opacity=".6"');
      case 'cyborg': return P('M44.6 32.6 L48.6 30.4 M44.6 35.6 L48.6 37.8', null, STEEL, 1.2) + C(39, 34, 5.6, '#2E3742') + C(39, 34, 3.6, c) + C(39, 34, 5.8, c, ' opacity=".2"') + C(39, 34, 1.4, c2) + C(37.6, 32.6, .7, WH);
      case 'bowtie': return P('M32 55.8 L26.6 53.2 L26.6 58.4 Z M32 55.8 L37.4 53.2 L37.4 58.4 Z', c) + C(32, 55.8, 1.3, c2 === WH ? c : c2) + P('M27.6 54.6 L30 55.6 M36.4 54.6 L34 55.6', null, WH, .5, ' opacity=".4"');
      case 'numcape': return C(43, 56, 2.2, c2) + R(14.4, 56.4, 9.4, 7.6, 2, c, ' stroke="' + c2 + '" stroke-width=".8"') + digits(a.three.num, 19.1, 57.8, 4.6, c2, 1.1);
      case 'chain': return P('M24.4 54.6 Q32 64.4 39.6 54.6', null, c, 2, ' stroke-dasharray="1.4 .8"') + C(32, 61.4, 2.4, c, ' stroke="#B8860B" stroke-width=".5"') + star(32, 61.4, 1.3, c2, 5, .45);
      case 'ermine': return P('M8 60 Q12 53 22 53.6 Q32 57 42 53.6 Q52 53 56 60 Q50 59 44 57.6 Q32 61 20 57.6 Q14 59 8 60 Z', c2) + C(14, 57.6, .6, INK) + C(22, 56, .6, INK) + C(42, 56, .6, INK) + C(50, 57.6, .6, INK) + C(32, 58.6, 1.4, GOLD);
      case 'parrot': return P('M50 60 L48 66 L51 62 L53 66 L52 60 Z', '#3D8BFF') + E(52, 54, 5, 7, c) + P('M48 52 Q44 58 49 61 Q51 57 50 53 Z', c2) + C(53, 48.6, 4, c) + P('M55.6 48 Q59.6 48.6 58 52.6 Q57 50.6 55.4 50.6 Z', '#F5C542', INK, .4) + C(54, 47.6, 1.4, WH) + C(54.2, 47.6, .7, INK) + P('M51 45 Q51 42 53.4 41.6', null, c, 1.2);
      case 'chick': return E(52, 56, 6, 7, c) + E(52, 57.6, 3.6, 4.6, WH) + C(52, 49, 4.4, c) + E(52, 49.6, 3, 2.6, WH) + C(50.8, 49, .7, INK) + C(53.2, 49, .7, INK) + P('M51 50.6 L53 50.6 L52 52.2 Z', c2) + P('M49 63 L50.6 62 M55 63 L53.4 62', null, c2, 1.2) + P('M46.4 54 Q45.4 58 47 60 M57.6 54 Q58.6 58 57 60', null, c, 1.6);
      case 'robopup': return P('M47 55 L43.6 52.6', null, T, 1.2) + R(45.6, 53, 12, 7, 2, c) + R(52, 46.6, 9, 7.4, 2, c) + R(52.4, 45, 2, 3, .6, T) + R(58.4, 45, 2, 3, .6, T) + C(55, 50, .9, c2) + C(58.4, 50, .9, c2) + R(55, 52, 4, 1, .4, T) + R(46.6, 60, 2.4, 3, .6, T) + R(54, 60, 2.4, 3, .6, T) + C(49.6, 56.4, 1.1, c2);
      case 'drone': return '<g>' + R(46, 51.6, 12, 5, 2, c) + P('M46 53 L42 50 M58 53 L62 50', null, T, 1) + E(42, 49.6, 4, 1, c2, ' opacity=".8"') + E(62, 49.6, 4, 1, c2, ' opacity=".8"') + C(52, 54, 1.4, c2) + C(52, 54, 2.6, c2, ' opacity=".3"') + P('M49 56.6 L48 59 M55 56.6 L56 59', null, T, .8) +
          '<animateTransform attributeName="transform" type="translate" values="0 0;0 -1.4;0 0" dur="1.8s" repeatCount="indefinite"/></g>';
      case 'kraken': return '<g>' + P('M45.6 56 Q43 62 46 64 Q46 60 48 58 M49 58 Q48 64 51 65 Q50.6 61 51.6 59 M53.6 59 Q55 64 57.4 64 Q55.6 61 55.6 58.6 M57 57 Q61 61 61 64 Q59.4 59.6 58 56', null, c, 2) + E(52, 52, 7.4, 6.6, c) + C(49.4, 51.6, 1.6, WH) + C(54.6, 51.6, 1.6, WH) + C(49.6, 52, .8, INK) + C(54.8, 52, .8, INK) + P('M50.6 55 Q52 56 53.4 55', null, INK, .6) + C(47.4, 49, 1, c2, ' opacity=".7"') + C(56.6, 48.4, .8, c2, ' opacity=".7"') +
          P('M48.6 45.6 L49.4 42.4 L51 44.4 L52 41.6 L53 44.4 L54.6 42.4 L55.4 45.6 Z', GOLD) + '<animateTransform attributeName="transform" type="rotate" values="0 52 58;4 52 58;0 52 58;-4 52 58;0 52 58" dur="2.6s" repeatCount="indefinite"/></g>';
      default: return hatPart(a.draw, c, c2, T, E2, a.three.opts);
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
    var sk = eq.skin && SKINS_BY_ID[eq.skin], ac = {}, id = 'brc' + (++nid).toString(36) + '_';   // the _ keeps 'brc1' + 's' (shoulders) apart from avatar 64's 'brc1s'
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
      if (lk && lk.nohat) s.hat = 0;   // wave 2: a bare-headed look (kits, suits) hides avatar.js's own hat
      if (lk && lk.face && /patch|shades|domino|goggles|visor/.test(lk.face)) s.glasses = 0;   // wave 2 faces: no avatar.js glasses under them
      if ((s.hair === 4 || s.hair === 5) && ((lk && lk.head && headMore(lk, col)) || (ac.hat && accFrontMore(ac.hat)))) s.hair = 0;   // wave 2 hats tuck a bun or spikes in
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
    var body = lk ? outfit(lk, col, id) + (lk.face ? facePiece(lk, col) : '') + headPiece(lk, col) : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">' +
      '<defs><clipPath id="' + id + '"><circle cx="32" cy="32" r="32"/></clipPath><clipPath id="' + id + 's"><path d="' + SH + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')">' + bg + back + '<g>' + face + '</g>' + body + front + (lk && lk.fx ? fxPart(lk, id) : '') + '</g></svg>';
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
      case 'pinstripes': g.strokeStyle = c.accent; g.lineWidth = u * .18; for (i = 1; i < 16; i += 1.5) { g.beginPath(); g.moveTo(i * u, 0); g.lineTo(i * u, size); g.stroke(); } break;
      case 'vstripes': g.fillStyle = c.accent; for (i = 0; i < 16; i += 4) g.fillRect(i * u, 0, u * 2, size); break;
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
    on: on, server: server, previewAllowed: previewAllowed, startPreview: startPreview, stopPreview: stopPreview,
    previewing: function () { return previewOn() && !payments() && !api.ENABLED; },
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
