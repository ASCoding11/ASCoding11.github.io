// Tidewick levels, written as rows of characters so they can be edited by hand. Each row is one tile (16 px) tall; every
// row of a map must be the same length. The view is 16 tiles wide and 15 tall, and the HUD covers the top two rows.
//
// LEGEND
//   .  open air
//   #  solid ground: wet cobbles on the quay, fortress stone in the Breakwater, brick in the cellar
//   X  stone crate (stair block, solid)
//   B  driftwood planks: small Pip bumps them, big Pip breaks them (50 points)
//   L  lantern crate with a brass button inside
//   P  lantern crate with a power-up: a loaf of bread if Pip is small, an ember pepper if big
//   M  planks hiding a run of buttons (keep hitting them for a few seconds, up to 10)
//   J  planks hiding a firefly jar (glow: about 12 s of invincibility)
//   H  hidden crate with a four-leaf clover (an extra life); invisible, solid only when hit from below
//   U  empty crate (what the crates and hiding planks turn into once used)
//   o  brass button floating in the air
//   T t  chimney pot lip, left and right half (solid);  I i  its shaft (solid)
//   E e  chimney lip you can go down (it smokes): press down standing on it to drop into the cellar
//   R r  chimney lip you come back up out of, after the cellar
//   x  the cellar's way out, a flue you walk into (press right standing against it);  v  its shaft (solid, drawn only)
//   ~  harbour water: touching it costs a life
//   =  plank bridge (solid). In the Breakwater, the drawbridge the winch drops
//   W  the winch at the end of the drawbridge (touch it)
//   F  stone base of the signal mast (the pole rises MAST_HEIGHT tiles above it); grab the pole to finish
//   h  the harbour-master's hut: its door, on the ground (the hut is drawn around it)
//   @  where Pip starts
//   g  Bilge, the walking puddle (walks left)
//   k  Whelk, the snail (walks left, walks off ledges)
//   K  wary Whelk, coral shell (walks left, turns round at ledges)
//   Z  the Tollkeeper (its bottom-left tile; it is 2 × 2 tiles)
// Enemies, Pip and the boss stand in the tile where their letter is; the tile itself counts as open air.

export const SOLID = new Set(['#', 'X', 'B', 'L', 'P', 'M', 'J', 'U', 'T', 't', 'I', 'i', 'E', 'e', 'R', 'r', 'x', 'v', '=', 'F']);
export const BUMPABLE = new Set(['B', 'L', 'P', 'M', 'J', 'H', 'U']);
export const ENTITY = new Set(['@', 'g', 'k', 'K', 'Z', 'o', 'W', 'h']);

export const STAGES = [
  {
    id: 1, name: 'HARBOR 1', title: '', theme: 'quay', music: 'main', cellar: true,
    rows: [
    '..................................................................................................................................................................................................................',
    '..................................................................................................................................................................................................................',
    '..................................................................................................................................................................................................................',
    '..................................................................................................................................................................................................................',
    '..................................................................................................................................................................................................................',
    '.....................................................................................................................g...................................L........................................................',
    '...........................L.L....................................................................................BPBB............................................................................................',
    '.................................................................................................................................................................................XXX..............................',
    '............................................................................................ooo..........H......k.................K.............................................XXXX..............................',
    '..................L............................................Tt..o.o.o......BMB.............................BBBBJBBB..........BBBBBB..................L.L............BB......XXXXX..............................',
    '.........ooo.............BBBPBBB.............Ee...........Tt...Ii........................................................oooo.................................................XXXXXX..............................',
    '...................................Tt........Ii...........Ii...Ii...................Rr..........g..g...............................................Tt........................XXXXXXX..............................',
    '...@.................g.............Ii...g....Ii....g.g....Ii.g.Ii................k..Ii..====..========.........g.g.....................k...g.g.g...Ii.........g........K....XXXXXXXX.........F.......h............',
    '#########################################################################..#############..............###########################################################...##############################################',
    '#########################################################################~~#############~~~~~~~~~~~~~~###########################################################~~~##############################################'
    ]
  },
  {
    id: 2, name: 'HARBOR 2', title: 'THE BREAKWATER', theme: 'fort', music: 'fort', cellar: false,
    rows: [
    '########################################################################################################',
    '########################################################################################################',
    '########################################################################################################',
    '########################################################################################################',
    '....................###############...........................#######.........##############............',
    '....................###############...........................#######.........##############............',
    '....................###############...........................#######...................................',
    '....................###############.......................K.............................................',
    '.......BPB..........###############.....................#####...L.L.....................................',
    '............................................##..........................................................',
    '........................................#...##...#....................................Z.................',
    '..@.......................g....g........#...##...#.............k...g.g......................W.....h.....',
    '#############....####################...#...##...#....##################..####==============############',
    '#############~~~~####################~~~~~~~~~~~~~~~~~##################~~####~~~~~~~~~~~~~~############',
    '#############~~~~####################~~~~~~~~~~~~~~~~~##################~~####~~~~~~~~~~~~~~############'
    ]
  }
];

// The cellar under the smoking chimney: Pip drops in at @ and leaves through the flue (x) on the right.
export const CELLAR = {
  id: 'cellar', name: 'HARBOR 1', title: '', theme: 'cellar', music: 'cellar',
  rows: [
    '#..............#',
    '#..............#',
    '#...############',
    '#.@..........vv#',
    '#............vv#',
    '#............vv#',
    '#............vv#',
    '#...oooooooo.vv#',
    '#............vv#',
    '#...oooooooo.vv#',
    '#............vv#',
    '#...ooooooo..xx#',
    '#............xx#',
    '################',
    '################'
  ]
};

// Turns a map into a mutable tile grid plus the things standing in it.
export function parseMap(def) {
  const rows = def.rows, h = rows.length, w = rows[0].length;
  for (const r of rows) if (r.length !== w) throw new Error('level rows must all be ' + w + ' long');
  const tiles = rows.map(r => r.split(''));
  const out = { def, w, h, tiles, spawns: [], start: null, mast: null, hut: null, enter: null, back: null, flue: null, winch: null, boss: null, buttons: [] };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = tiles[y][x];
    if (c === '@') out.start = { tx: x, ty: y };
    else if (c === 'g' || c === 'k' || c === 'K') out.spawns.push({ kind: c === 'g' ? 'bilge' : 'whelk', wary: c === 'K', tx: x, ty: y });
    else if (c === 'Z') out.boss = { tx: x, ty: y };
    else if (c === 'o') out.buttons.push({ tx: x, ty: y });
    else if (c === 'W') out.winch = { tx: x, ty: y };
    else if (c === 'h') out.hut = { tx: x, ty: y };
    else if (c === 'F') out.mast = { tx: x, ty: y };
    else if (c === 'E' && !out.enter) out.enter = { tx: x, ty: y };
    else if (c === 'R' && !out.back) out.back = { tx: x, ty: y };
    else if (c === 'x' && !out.flue) out.flue = { tx: x, ty: y };
    if (ENTITY.has(c)) tiles[y][x] = '.';
  }
  return out;
}
