/*
 * Back Room parties: group up (up to 8 people), then the leader moves everyone into the same game room.
 *
 * Loaded two ways:
 *   - by the home page right after the secret code reveals the Back Room (its reveal() adds this script and
 *     sets window.BackRoom = { openGame, isOpen, invite } so games open in its full-screen layer), and
 *   - by a <script> tag on e63334287a3deaa3/index.html, for anyone who opens that page directly
 *     (then games open in a small layer of our own).
 *
 * Storage: Firebase Realtime Database (same project and rules as Rumble Karts), one room per party at
 * rooms/pt-<code>. The shared rules only let a browser write its own node, rooms/pt-<code>/players/<uid>,
 * and that node needs the same fields the games write (n, c, x, z, h, ts), so everything lives there:
 *   n  name (14 chars)       c  colour (#rrggbb)     x, z, h  always 0 (required by the rules)
 *   ts last heartbeat         j  when they joined (server time)
 *   pk game the leader has picked (leader only)
 *   go { id, g, r, t }        the leader's latest launch: game key, room code, server time
 *   kick [{ u, t }]           people the leader removed (uid, server time), up to 8, kept for 10 minutes
 *   av the player's edited avatar as a short code (avatar.js; 'a0' after a reset, absent if never edited)
 *   pub 1, pn size            leader only, while the leader's party is Public. Parties are Public unless the leader
 *                             switches them to Private; that choice is remembered in this browser (localStorage
 *                             party:pub, '1' or '0', saved with the account by account-nudge.js)
 * Public means anyone in the Back Room can see the party and join it: the leader's Online node (social.js) carries the
 * party code while the party is Public, so the Online panel shows a Join party button, and Playing now (playingnow.js)
 * lists the game the party is in. A join from that button is checked against the party itself first (the leader's node
 * must still say pub: 1), so a party switched to Private can't be joined that way. Private means invite only: the invite
 * link or code, an invite from a member, or a request the leader accepts.
 * The leader is whoever has been in the party longest (smallest j), so when the leader leaves the next
 * person takes over with nothing to hand over. Closing the tab removes your node (onDisconnect).
 *
 * Kicking: the leader can't delete anyone else's node, so it lists them in kick in its own node. Every member
 * watches the current leader's list (only the leader's counts), and one that finds its own uid there with a
 * time in the last 10 minutes leaves by removing its own node and says who removed it. Joining checks the
 * leader's list first, so a kicked person can't come back for 10 minutes (as long as the same leader is there).
 *
 * "Play together" writes go, and every member's browser opens that game with #<prefix>-<room>, then puts the
 * party name in the game's name box and the room in its room box, and presses its own "Play in room" button for
 * them (the game's menu ids are in GAMES). The game's own saved name is put back afterwards (nk in GAMES).
 * To add a game: add a row to GAMES. If its menu uses other ids than name / room / joinRoom, give them in ids,
 * and give the localStorage key it saves its name under in nk.
 * Names: one name everywhere. The Online name (localStorage ol:name, social.js) is the player's name, then the signed-in
 * account's first name, then the party name (party:name), then any name a game saved: the same order social.js uses, so
 * both panels and the leaderboard say the same thing. Typing in the name box here saves ol:name and party:name and tells
 * social.js (a `backroom:name` event with from: 'party'); a rename there or in another tab (`backroom:name` / storage)
 * is written to our party node at once, so the rest of the party sees it within a second or so.
 * Members show with their avatar (avatar.js) and status tier badge (miles.js) when those scripts are here; without
 * them, a coloured initial and no badge.
 */
(function () {
  'use strict';
  if (document.getElementById('party')) return;

  var MAX = 8, STALE = 120000, BEAT = 15000, KICK_TTL = 10 * 60000;
  var T = function (s, v) { return window.BackRoomLang ? BackRoomLang.t(s, v) : String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); };
  // Spanish (lang.js): this script's words.
  (function es(n) {
    if (!window.BackRoomLang) { if (n < 100) setTimeout(function () { es(n + 1); }, 100); return; }
    BackRoomLang.add({
      // The Party panel is "Grupo" (a group of friends); "Fiesta" is kept for the party-games button.
      'Party': 'Grupo', 'Group up with up to {n} friends, then the leader picks a game and everyone lands in the same room.':
        'Arma un grupo de hasta {n} amigos; el líder elige un juego y todos caen en la misma sala.',
      'Your name': 'Tu nombre', 'Create party': 'Crear grupo', 'or': 'o', 'Party code': 'Código de grupo', 'Join party': 'Unirse al grupo', 'e.g. k7m2q': 'ej. k7m2q',
      'Couldn’t reach the game database. If you’re on a school or work network it may be blocking it; try another network.':
        'No se pudo llegar a la base de datos del juego. Si estás en la red de la escuela o del trabajo, puede que la bloquee; prueba otra red.',
      'Could not reach the game server. Check your connection.': 'No se pudo llegar al servidor del juego. Revisa tu conexión.', 'Sign-in failed: {e}': 'Falló el inicio de sesión: {e}',
      'You were removed from the party by {n}. You can join it again in {m} min.': '{n} te sacó del grupo. Puedes volver a entrar en {m} min.',
      'Rejoining party {c}…': 'Volviendo al grupo {c}…', 'Connecting…': 'Conectando…', 'Type a party code first.': 'Primero escribe un código de grupo.',
      'That party has ended.': 'Ese grupo terminó.', 'No party is using the code {c} right now. Check the code, or create a party.': 'Ningún grupo usa el código {c} ahora. Revisa el código o crea un grupo.',
      'That party is private now. Ask its leader for an invite.': 'Ese grupo ahora es privado. Pídele una invitación a su líder.',
      'That party is full ({a} of {b}). Ask them to make room, or create your own party.': 'Ese grupo está lleno ({a} de {b}). Pídeles que hagan lugar o crea tu propio grupo.',
      'Creating a party…': 'Creando un grupo…', 'Couldn’t find a free party code. Try again.': 'No se encontró un código libre. Vuelve a intentarlo.',
      'Party created. It’s public: anyone in the Back Room can join it. Friends can also use the invite link or the code {c}.':
        'Grupo creado. Es público: cualquiera en The Back Room puede unirse. Tus amigos también pueden usar el enlace de invitación o el código {c}.',
      'Party created. It’s private: send your friends the invite link or the code {c}.': 'Grupo creado. Es privado: mándales a tus amigos el enlace de invitación o el código {c}.',
      'The database rules blocked the party ({e}).': 'Las reglas de la base de datos bloquearon el grupo ({e}).', 'You left the party.': 'Saliste del grupo.',
      '{n} joined the party.': '{n} se unió al grupo.', 'You’re the party leader now. Pick a game.': 'Ahora eres el líder del grupo. Elige un juego.',
      'You’re the party leader now. Pick a game. The party is still private.': 'Ahora eres el líder del grupo. Elige un juego. El grupo sigue siendo privado.',
      '{n} is the party leader now.': '{n} ahora es el líder del grupo.', '{n} started a game this page doesn’t know yet. Reload to update.': '{n} empezó un juego que esta página todavía no conoce. Recarga para actualizar.',
      'Pick a game first.': 'Primero elige un juego.', '{g} rooms hold {a} players, and the party has {b}.': 'Las salas de {g} son para {a} jugadores, y el grupo tiene {b}.',
      '{g} rooms hold {a} players': 'Las salas de {g} son para {a} jugadores', 'Couldn’t tell the party ({e}).': 'No se pudo avisar al grupo ({e}).',
      'Starting {g} in room {r}…': 'Empezando {g} en la sala {r}…', 'Remove {n} from the party? They can’t join it again for 10 minutes.': '¿Sacar a {n} del grupo? No podrá volver a entrar por 10 minutos.',
      'Removed {n} from the party.': 'Sacaste a {n} del grupo.', 'Removed {n} from the party. Set the party to Private to stop other people joining.': 'Sacaste a {n} del grupo. Pon el grupo en Privado para que no entre más gente.',
      'Couldn’t remove them ({e}).': 'No se pudo sacarlo ({e}).', '← Back': '← Volver',
      'Couldn’t start the vote ({e}).': 'No se pudo empezar la votación ({e}).', 'Vote started: everyone has {n} seconds to pick the next game.': 'Empezó la votación: todos tienen {n} segundos para elegir el próximo juego.',
      'Couldn’t send your vote ({e}).': 'No se pudo enviar tu voto ({e}).', 'Vote on next game': 'Votar el próximo juego', 'Vote over': 'Votación terminada', 'Cancel vote': 'Cancelar votación',
      'You started this vote': 'Empezaste esta votación', '{n} started this vote': '{n} empezó esta votación', '· tap a game to vote': '· toca un juego para votar',
      'Choose 2 to 4 games, or none for a surprise mix. Random is always an option too.': 'Elige de 2 a 4 juegos, o ninguno para una mezcla sorpresa. Al azar siempre es una opción.',
      'Games to vote on': 'Juegos para votar', 'Start vote ({n} games + Random)': 'Empezar votación ({n} juegos + Al azar)', 'Choose one more': 'Elige uno más',
      'Start with a surprise mix': 'Empezar con una mezcla sorpresa', 'Random': 'Al azar', 'You cancelled the vote.': 'Cancelaste la votación.',
      'Once someone joins, anyone in the party can start a vote on the next game.': 'Cuando alguien se una, cualquiera del grupo puede empezar una votación para el próximo juego.',
      'Anyone can start one: {n} seconds, most votes wins.': 'Cualquiera puede empezar una: {n} segundos, gana el más votado.',
      '1 vote': '1 voto', '{c} votes': '{c} votos', ' · {a} of {b} voted': ' · votaron {a} de {b}', ' · tap a game to vote': ' · toca un juego para votar',
      '. Most votes wins; a tie is picked at random.': '. Gana el más votado; un empate se decide al azar.',
      'Random won, so the leader’s browser picked {g}.': 'Ganó Al azar, así que el navegador del líder eligió {g}.',
      '{g} tied with 1 vote and was picked at random.': '{g} empató con 1 voto y salió elegido al azar.', '{g} tied with {n} votes and was picked at random.': '{g} empató con {n} votos y salió elegido al azar.',
      '{g} won with 1 vote.': '{g} ganó con 1 voto.', '{g} won with {n} votes.': '{g} ganó con {n} votos.', ' Everyone’s joining it now.': ' Todos están entrando.',
      'Waiting for your browser to start the winner…': 'Esperando que tu navegador empiece el ganador…', 'Waiting for {n}’s browser to start the winner…': 'Esperando que el navegador de {n} empiece el ganador…',
      'Waiting for the leader to start the winner…': 'Esperando que el líder empiece el ganador…', '{n} started a vote on the next game.': '{n} empezó una votación para el próximo juego.',
      '{n} started a vote first, so that one counts.': '{n} empezó una votación antes, así que cuenta esa.', 'No game fits a party of {n}.': 'Ningún juego entra para un grupo de {n}.',
      'You’re the leader: pick a game and press Play together to bring everyone in.': 'Eres el líder: elige un juego y toca Jugar juntos para traer a todos.',
      'Waiting for the leader to pick a game. When they start, you’ll join them automatically.': 'Esperando a que el líder elija un juego. Cuando empiece, entrarás automáticamente.',
      'Party chat': 'Chat del grupo', 'Copy invite link': 'Copiar enlace de invitación', 'Leave party': 'Salir del grupo', 'Who can join': 'Quién puede unirse',
      'Public': 'Público', 'Private': 'Privado', 'Party members': 'Miembros del grupo', 'Leader': 'Líder', 'Removing…': 'Sacando…', 'Remove from the party': 'Sacar del grupo',
      'Remove {n} from the party': 'Sacar a {n} del grupo',
      'Public: anyone in the Back Room can see this party and join it. Private: invite only, with your link or code.':
        'Público: cualquiera en The Back Room puede ver este grupo y unirse. Privado: solo con invitación, con tu enlace o código.',
      'Public: anyone in the Back Room can see this party and join it. Private: invite only, with your link or code. You’re hidden in Online, so nobody sees it until you show yourself there.':
        'Público: cualquiera en The Back Room puede ver este grupo y unirse. Privado: solo con invitación, con tu enlace o código. Estás oculto en En línea, así que nadie lo ve hasta que te muestres ahí.',
      'Pick a game': 'Elige un juego', 'Game': 'Juego', '· up to {n}': '· hasta {n}', '▶ Play together': '▶ Jugar juntos',
      'Everyone joins {g} in a new room.': 'Todos entran a {g} en una sala nueva.', 'Choose one of the games above.': 'Elige uno de los juegos de arriba.',
      '{n} has picked {g}.': '{n} eligió {g}.', '{n} hasn’t picked a game yet.': '{n} todavía no eligió un juego.', 'Room {r}': 'Sala {r}',
      ' This party is public: anyone in the Back Room can join it.': ' Este grupo es público: cualquiera en The Back Room puede unirse.', ' This party is private: invite only.': ' Este grupo es privado: solo con invitación.',
      '. This party is public: anyone in the Back Room can join it.': '. Este grupo es público: cualquiera en The Back Room puede unirse.', '. This party is private: invite only.': '. Este grupo es privado: solo con invitación.',
      '{n} hasn’t picked a game yet. This party is public: anyone in the Back Room can join it.': '{n} todavía no eligió un juego. Este grupo es público: cualquiera en The Back Room puede unirse.',
      '{n} hasn’t picked a game yet. This party is private: invite only.': '{n} todavía no eligió un juego. Este grupo es privado: solo con invitación.',
      'Join them in {g}': 'Unirte en {g}', 'Type your name first, so your party knows who you are.': 'Primero escribe tu nombre, así tu grupo sabe quién eres.',
      'Type the party code your friend sent you.': 'Escribe el código de grupo que te mandó tu amigo.',
      'Invite link copied. Friends open it, enter the Back Room code, and join the party.': 'Enlace copiado. Tus amigos lo abren, ponen el código de The Back Room y se unen al grupo.',
      'Invite link: {u}': 'Enlace de invitación: {u}', 'Couldn’t save that ({e}).': 'No se pudo guardar eso ({e}).',
      'Your party is public. Anyone in the Back Room can see it and join.': 'Tu grupo es público. Cualquiera en The Back Room puede verlo y unirse.',
      'Your party is private. Only people with your invite link or code can join, or people you let in.': 'Tu grupo es privado. Solo pueden unirse quienes tengan tu enlace o código, o a quienes dejes entrar.'
    });
  })(0);
  var CFG = {
    apiKey: 'AIzaSyDZD_Ku8cixteXfwkDYzGv3GKiZFF8sRSM',
    authDomain: 'rumblekarts.firebaseapp.com',
    databaseURL: 'https://rumblekarts-default-rtdb.firebaseio.com',
    projectId: 'rumblekarts',
    storageBucket: 'rumblekarts.firebasestorage.app',
    messagingSenderId: '910009166464',
    appId: '1:910009166464:web:cb0f8872c8f06749fc9465'
  };
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

  // Party-ready games. pre: what goes before the room code in the game's address (default k + '-').
  // max: most people one of its rooms holds. ids: the game's menu fields, if not name / room / joinRoom.
  // nk: the localStorage key where the game saves its own name (Hail Mary's is a team name), put back after a party launch.
  var GAMES = [
    { k: 'sc', n: 'Shell Crackers', d: 'shell-crackers', max: 8, nk: 'shellcr-name' },
    { k: 'rk', n: 'Rumble Karts', d: 'rumble-karts', max: 8, pre: '', nk: 'rk_name', ids: { name: 'inName', room: 'inRoom', join: 'bOnline' } },
    { k: 'ss', n: 'Slipstream', d: 'slipstream', max: 8, nk: 'ss:name' },
    { k: 'bb', n: 'Boostball', d: 'boostball', max: 6, nk: 'boostball-name', prep: function (doc, n) {
      // Room size comes from whoever opens the room first, so everyone picks the size that fits the party.
      var b = doc.querySelector('#sizeSeg [data-s="' + Math.min(3, Math.max(1, Math.ceil(n / 2))) + '"]'); if (b) b.click();
    } },
    { k: 'cl', n: 'Coil', d: 'coil', max: 8, nk: 'coil:name' },
    { k: 'sd', n: 'Showdown', d: 'showdown', max: 8, nk: 'sd:name' },
    { k: 'br', n: 'Backrooms 1v1–4v4', d: 'backrooms-1v1', max: 8, nk: 'br1v1-name' },
    { k: 'cf', n: 'Chromaflage', d: 'chromaflage', max: 8, nk: 'chroma-name' },
    { k: 'tw', n: 'Spire', d: 'spire', max: 12, nk: 'spire:name' },
    { k: 'sr', n: 'Turbo Trail', d: 'turbo-trail', max: 12, nk: 'turbotrail:name' },
    { k: 'er', n: 'Escapade', d: 'escapade', max: 12, nk: 'escapade:name' },
    { k: 'up', n: 'Updraft', d: 'updraft', max: 12, nk: 'updraft:name' },
    { k: 'ph', n: 'Odd One Out', d: 'odd-one-out', max: 16, nk: 'oddone-name' },
    { k: 'ko', n: 'Tumble Trials', d: 'tumble-trials', max: 16, nk: 'tumble-name' },
    { k: 'dz', n: 'Driftfall', d: 'drop-zone', max: 30, nk: 'driftfall:name' },
    { k: 'bs', n: 'Blockstorm', d: 'blockstorm', max: 12, nk: 'blockstorm:name' },
    { k: 'lh', n: 'Lanternhold', d: 'lanternhold', max: 4, nk: 'lanternhold:name' },
    { k: 'vq', n: 'Sky Duel', d: 'sky-duel', max: 8, nk: 'skyduel-name' },
    { k: 'gd', n: 'Lokop', d: 'lunge-line', max: 8, nk: 'lungeline:name' },
    { k: 'dw', n: 'Deepword', d: 'deepword', max: 12, nk: 'deepword-name' },
    { k: 'pf', n: 'Puffer Party', d: 'puffer-party', max: 12, nk: 'pufferparty:name' }
  ];
  var COLORS = ['#1D6A4B', '#C0562F', '#3E5BA9', '#9A3F8F', '#B07A12', '#2A8A8A', '#B42318', '#5B6B2E'];

  var me0 = document.currentScript && document.currentScript.src;
  var BASE = (me0 ? new URL(me0, location.href).pathname : location.pathname).replace(/[^/]*$/, '');
  var BR = window.BackRoom || null;

  function byKey(k) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].k === k) return GAMES[i]; return null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function sess(k, v) {
    try {
      if (v === undefined) return sessionStorage.getItem(k);
      if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  // Rude words in names are masked by the shared name filter (/namefilter.js) when the page has loaded it.
  function byFilter(v) { return window.NameFilter ? window.NameFilter.clean(v) : v; }
  function cleanName(s) { return byFilter(String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14)); }
  function cleanCode(s) { return String(s || '').toLowerCase().replace(/^.*#?pt-/, '').replace(/[^a-z0-9]/g, '').slice(0, 8); }
  function rand(n) { var a = 'abcdefghjkmnpqrstuvwxyz23456789', s = ''; for (var i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function colorOf(uid) { var h = 0; for (var i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length]; }
  function timeout(p, ms, msg) { var t; return Promise.race([p, new Promise(function (_, rej) { t = setTimeout(function () { rej(new Error(msg)); }, ms); })]).finally(function () { clearTimeout(t); }); }
  var NET = 'Couldn’t reach the game database. If you’re on a school or work network it may be blocking it; try another network.';

  // A name to start from (after the Online name): the signed-in account, then the one used for parties before, then any
  // name a game saved. The same order as social.js's guessName.
  function guessName() {
    var u = window.SiteAccount && SiteAccount.user && SiteAccount.user();
    if (u && (u.displayName || u.email)) return cleanName((u.displayName || u.email).split(/[\s@]/)[0]);
    var s = store('party:name'); if (s) return cleanName(s);
    var keys = ['coil:name', 'ss:name', 'sd:name', 'spire:name', 'updraft:name', 'boostball-name', 'shellcr-name', 'br1v1-name', 'rk_name', 'chroma-name', 'oddone-name', 'tumble-name', 'kw:name', 'quarry:name'];
    for (var i = 0; i < keys.length; i++) {
      var v = store(keys[i]); if (!v) continue;
      try { if (v.charAt(0) === '"') v = JSON.parse(v); } catch (e) {}
      v = cleanName(v); if (v) return v;
    }
    return '';
  }

  // ---------------- Styles ----------------
  var css = document.createElement('style');
  css.textContent =
    '#party{padding-top:32px}' +
    '.pty{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px 16px;display:grid;gap:14px;min-width:0}' +
    '.pty-main{display:grid;gap:14px;min-width:0}' +
    '.pty-top{display:flex;align-items:center;gap:10px 14px;flex-wrap:wrap}' +
    '.pty h2{margin:0;font-size:28px;line-height:1}' +
    '.pty-sub{margin:0;color:var(--ink-2);font-size:15px;flex:1 1 260px}' +
    '.pty-row{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}' +
    '.pty-row.split{justify-content:space-between}' +
    '.pty label{display:grid;gap:4px;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);flex:1 1 150px;max-width:260px}' +
    '.pty input{font:inherit;font-family:var(--body);font-size:16px;font-weight:400;letter-spacing:0;text-transform:none;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:9px 12px;min-height:44px;width:100%;min-width:0}' +
    '.pty input:focus{border-color:var(--accent);outline:none}' +
    '.pty .btn{font:inherit;font-weight:600;color:var(--ink);cursor:pointer}' +
    '.pty .btn.primary{color:var(--accent-ink)}' +
    '.pty .btn[disabled]{opacity:.55;cursor:default;filter:none}' +
    '.pty .btn.sm{min-height:36px;padding:6px 12px;font-size:14px}' +
    '.pty-or{font-family:var(--mono);font-size:12px;color:var(--ink-2);text-transform:uppercase;letter-spacing:.08em;align-self:center;padding:0 2px}' +
    '.pty-code{font-family:var(--mono);font-weight:600;font-size:15px;letter-spacing:.12em;background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:4px 10px}' +
    '.pty-count{font-family:var(--mono);font-size:13px;color:var(--ink-2)}' +
    '.pty-acts{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}' +
    '.pty-mem{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}' +
    '.pty-mem.pty-lead{grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))}' +
    '.pty-mem li{display:flex;align-items:center;gap:10px;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:8px 10px;min-width:0}' +
    '.pty-av{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;color:#fff;flex:none}' +
    '.pty-who{display:grid;min-width:0;line-height:1.25;gap:2px}' +
    '.pty-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}' +
    '.pty-tag{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.pty-tl{display:flex;min-width:0;line-height:1}' +
    '.pty-tag b{color:var(--accent);font-weight:600}' +
    '.pty-kick{margin-left:auto;flex:none;width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:none;color:var(--ink-2);font:inherit;font-size:16px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0}' +
    '.pty-kick:hover{color:var(--down);border-color:var(--down)}.bra-nt .pty-kick:hover{color:var(--nt-ink);border-color:var(--nt-ink)}' +
    '.pty-h{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);margin:0 0 8px}' +
    '.pty-games{display:flex;flex-wrap:wrap;gap:8px}' +
    '.pty-games button{font:inherit;font-size:14px;font-weight:600;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:999px;padding:7px 14px;cursor:pointer;min-height:36px}' +
    '.pty-games button:hover{border-color:var(--ink-2)}' +
    '.pty-games button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent);color:var(--accent-ink)}' +
    '.pty-games button[disabled]{opacity:.45;cursor:default;border-color:var(--line)}' +
    '.pty-games small{font-weight:400;opacity:.8}' +
    '.pty-go{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px}' +
    '.pty-pick[data-mode="member"] .pty-go{margin-top:8px}' +
    '.pty-wait{margin:0;color:var(--ink-2);font-size:15px}' +
    '.pty-msg{margin:0;font-size:14px;color:var(--ink-2);overflow-wrap:anywhere}' +
    '.pty-msg:empty{display:none}' +
    '.pty-pub{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}' +
    '.pty-pub[hidden]{display:none}' +
    '.pty-pub .pty-h{margin:0}' +
    '.pty-seg{display:inline-flex;gap:2px;padding:3px;background:var(--panel-2);border:1px solid var(--line);border-radius:999px;flex:none}' +
    '.pty-seg button{font:inherit;font-size:14px;font-weight:600;color:var(--ink-2);background:none;border:0;border-radius:999px;padding:6px 16px;min-height:40px;cursor:pointer}' +
    '.pty-seg button:hover{color:var(--ink)}' +
    '.pty-seg button[aria-checked="true"]{background:var(--accent);color:var(--accent-ink)}' +
    '.pty-pub .pty-wait{font-size:14px;flex:1 1 260px}' +
    '.pty-msg.err{color:var(--down)}' +
    '@media (max-width:600px){.pty{padding:16px 14px 14px}.pty-or{display:none}.pty label{max-width:none}.pty-acts{margin-left:0;width:100%}.pty-acts .btn{flex:1;justify-content:center}.pty-row > .btn{flex:1 1 auto;justify-content:center}.pty-mem{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}' +
    '@media (max-width:360px){.pty-mem{grid-template-columns:minmax(0,1fr)}}';
  document.head.appendChild(css);

  // ---------------- Panel ----------------
  var sec = document.createElement('section');
  sec.id = 'party'; sec.setAttribute('aria-label', 'Party');
  sec.innerHTML = '<div class="pty"><div class="pty-top"><h2>Party</h2><p class="pty-sub"></p></div><div class="pty-main"></div><p class="pty-msg" role="status" aria-live="polite"></p></div>';
  var head = document.querySelector('header');
  if (head && head.parentNode) head.parentNode.insertBefore(sec, head.nextSibling); else document.body.appendChild(sec);
  var $sub = sec.querySelector('.pty-sub'), $main = sec.querySelector('.pty-main'), $msg = sec.querySelector('.pty-msg');

  function say(t, err) { $msg.textContent = t || ''; $msg.classList.toggle('err', !!err); }

  // ---------------- State ----------------
  var app = null, auth = null, db = null, uid = null, offset = 0, booting = null;
  var code = '', refs = null, myJ = 0, members = [], picked = '', goId = 0, beat = 0, busy = false;
  var handled = {}, wasConnected = false, connRef = null, lastLeader = '', kicked = [];
  // Public party: other Back Room visitors can see the game it's in and join (playingnow.js). pub is this browser's choice
  // (Public unless it was switched to Private), pubOn whether our node says so right now: only while we lead.
  // A party that was Private under its last leader stays Private when the lead passes to us, until we choose: that is
  // kept for the tab (sessionStorage party:keep, the party's code), not as this browser's choice.
  var pub = store('party:pub') !== '0', pubOn = false, pubN = 0;
  function now() { return Date.now() + offset; }

  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error('Could not reach the game server. Check your connection.')); };
      document.head.appendChild(s);
    });
  }
  // Same project as the games. If account.js already started Firebase (and maybe a Google sign-in), reuse it.
  function boot() {
    if (booting) return booting;
    booting = (async function () {
      if (window.SiteAccount && SiteAccount.boot) { try { await timeout(SiteAccount.boot(), 12000, NET); } catch (e) {} }
      if (!window.firebase || !firebase.auth) { await load(SDK + 'firebase-app-compat.js'); await load(SDK + 'firebase-auth-compat.js'); }
      if (!firebase.database) await load(SDK + 'firebase-database-compat.js');
      app = firebase.apps.filter(function (a) { return a.options.apiKey === CFG.apiKey; })[0] ||
        firebase.initializeApp(CFG, firebase.apps.length ? 'party' : undefined);
      auth = app.auth();
      // Signing in can take 10-20 s on a slow phone on school Wi-Fi: give it 25 s, like the games.
      await timeout(new Promise(function (r) { var s = auth.onAuthStateChanged(function () { s(); r(); }); }), 25000, NET);
      if (!auth.currentUser) {
        try { await timeout(auth.signInAnonymously(), 25000, NET); }
        catch (err) { if (err.message === NET) throw err; throw new Error('Sign-in failed: ' + (err.message || err.code)); }
      }
      uid = auth.currentUser.uid;
      db = app.database(CFG.databaseURL);
      await new Promise(function (res) { setTimeout(res, 3000); db.ref('.info/serverTimeOffset').once('value', function (s) { offset = s.val() || 0; res(); }); });
      db.ref('.info/serverTimeOffset').on('value', function (s) { offset = s.val() || 0; });
      // Signing in with Google in the middle of a party changes who we are: rejoin as the new account.
      auth.onAuthStateChanged(function (u) {
        if (!u || u.uid === uid) return;
        var c = code; uid = u.uid;
        if (c) { teardown(false); join(c, true); }
      });
    })();
    booting.catch(function () { booting = null; });
    return booting;
  }

  function live(val) {
    var out = [], t = now();
    Object.keys(val || {}).forEach(function (k) {
      var v = val[k];
      if (!v || typeof v !== 'object' || t - (+v.ts || 0) > STALE) return;
      if (k !== uid) { learnAv(k, v.av); learnNt(k, v.nt); }
      out.push({ uid: k, n: cleanName(v.n) || 'Player', c: /^#[0-9a-f]{6}$/i.test(v.c) ? v.c : '#4A5751', j: +v.j || +v.ts || 0, pk: typeof v.pk === 'string' ? v.pk : '', go: v.go && typeof v.go === 'object' ? v.go : null, kick: kickList(v.kick, t), pub: v.pub === 1 });
      voteRead(out[out.length - 1], v, t);
    });
    out.sort(function (a, b) { return a.j - b.j || (a.uid < b.uid ? -1 : 1); });
    return out;
  }
  // Someone else's kick list: at most MAX entries of { u: uid, t: time } from the last KICK_TTL; anything else is dropped.
  function kickList(v, t) {
    var a = Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.keys(v).map(function (k) { return v[k]; }) : []), out = [];
    for (var i = 0; i < a.length && i < 16 && out.length < MAX; i++) {
      var e = a[i]; if (!e || typeof e !== 'object' || typeof e.u !== 'string' || !/^[A-Za-z0-9_-]{6,64}$/.test(e.u)) continue;
      var kt = +e.t || 0; if (kt > t - KICK_TTL && kt < t + 30000) out.push({ u: e.u, t: kt });
    }
    return out;
  }
  // When the leader L removed u, or 0. Only the current leader's list counts.
  function kickedBy(L, u) {
    if (!L || L.uid === u || !L.kick) return 0;
    for (var i = 0; i < L.kick.length; i++) if (L.kick[i].u === u) return L.kick[i].t;
    return 0;
  }
  function kickMsg(L, kt) { return 'You were removed from the party by ' + L.n + '. You can join it again in ' + Math.max(1, Math.ceil((kt + KICK_TTL - now()) / 60000)) + ' min.'; }
  function myState() {
    var s = { n: myName(), c: colorOf(uid), x: 0, z: 0, h: 0, ts: Math.round(now()), j: myJ };
    if (picked) s.pk = picked;
    if (goId && lastGo) s.go = lastGo;
    if (kicked.length) s.kick = kicked;
    if (pubOn) { s.pub = 1; s.pn = pubN = members.length || 1; }
    var a = myAv(), t = myNt(); if (a) s.av = a; if (t) s.nt = t;
    voteState(s);
    avSent = uid + '|' + a + '|' + t;
    return s;
  }
  // Avatars (avatar.js): our own edit goes in our node as av; other members' av is checked there before it is drawn.
  // The colour of a name tile travels the same way, as nt ('t1:<index>' or 't0'); only a Google account has one to send.
  var avSent = '';
  function myNt() { try { return uid && window.BackRoomAvatar && BackRoomAvatar.tileMine ? BackRoomAvatar.tileMine(uid) || '' : ''; } catch (e) { return ''; } }
  function learnNt(u, t) { if (typeof t === 'string' && t.length <= 5 && window.BackRoomAvatar && BackRoomAvatar.learnTile) { try { BackRoomAvatar.learnTile(u, t); } catch (e) {} } }
  function myAv() { try { return uid && window.BackRoomAvatar && BackRoomAvatar.mine ? BackRoomAvatar.mine(uid) || '' : ''; } catch (e) { return ''; } }
  function learnAv(u, a) { if (typeof a === 'string' && a.length <= 47 && window.BackRoomAvatar && BackRoomAvatar.learn) { try { BackRoomAvatar.learn(u, a); } catch (e) {} } }
  function syncAvatar() {
    if (!refs || !uid) return;
    var a = myAv(), t = myNt(), k = uid + '|' + a + '|' + t;
    if (avSent === k) return;
    avSent = k;
    refs.me.update({ av: a || null, nt: t || null, ts: Math.round(now()) }).catch(function () { if (avSent === k) avSent = ''; });
  }
  var lastGo = null;
  function typedName() { return cleanName(store('ol:name')) || guessName(); }
  function myName() { return typedName() || 'Player'; }
  // Our name changed somewhere else (the Online panel, another tab): put it in our node and the name box now.
  function nameChanged() {
    var n = myName();
    if (refs && code) {
      members.forEach(function (m) { if (m.uid === uid) m.n = n; });
      refs.me.update({ n: n, ts: Math.round(now()) }).catch(function () {});
      drawParty();
    } else {
      var box = $main.querySelector('#ptyName');
      if (box && document.activeElement !== box) box.value = typedName();
    }
  }
  // Typed in our own name box: save it as the one name and tell the Online panel.
  function setName(n) {
    store('party:name', n || null);
    if (n) store('ol:name', n);
    try { document.dispatchEvent(new CustomEvent('backroom:name', { detail: { uid: uid, n: myName(), mine: true, from: 'party' } })); } catch (e) {}
  }

  // ---------------- Join / leave ----------------
  // needPub: a join from the Online panel's Join party button (no invite), only allowed while the party is Public.
  async function join(c, rejoin, needPub) {
    if (busy) return; busy = true; drawIdle(); say(rejoin ? 'Rejoining party ' + c + '…' : 'Connecting…');
    try {
      await boot();
      c = cleanCode(c);
      if (!c) throw new Error('Type a party code first.');
      var players = db.ref('rooms/pt-' + c + '/players');
      var cur = live((await timeout(players.once('value'), 10000, NET)).val()).filter(function (m) { return m.uid !== uid; });
      if (!cur.length && !rejoin) throw new Error(needPub ? 'That party has ended.' : 'No party is using the code ' + c + ' right now. Check the code, or create a party.');
      if (needPub && !cur[0].pub) throw new Error('That party is private now. Ask its leader for an invite.');
      if (cur.length >= MAX) throw new Error('That party is full (' + MAX + ' of ' + MAX + '). Ask them to make room, or create your own party.');
      var kt = kickedBy(cur[0], uid); if (kt) throw new Error(kickMsg(cur[0], kt));
      await enter(c);
      say('');
    } catch (err) {
      teardown(false);
      say(err.message || String(err), true);
    } finally {
      busy = false; render();
      var box = !code && $main.querySelector('#ptyCode'); if (box && !box.value) box.value = cleanCode(c);
    }
  }
  async function create() {
    if (busy) return; busy = true; drawIdle(); say('Creating a party…');
    try {
      await boot();
      var c = '';
      for (var i = 0; i < 5 && !c; i++) {
        var t = rand(5);
        var s = await timeout(db.ref('rooms/pt-' + t + '/players').once('value'), 10000, NET);
        if (!live(s.val()).length) c = t;
      }
      if (!c) throw new Error('Couldn’t find a free party code. Try again.');
      await enter(c);
      say(pub ? 'Party created. It’s public: anyone in the Back Room can join it. Friends can also use the invite link or the code ' + c + '.' : 'Party created. It’s private: send your friends the invite link or the code ' + c + '.');
    } catch (err) {
      teardown(false);
      say(err.message || String(err), true);
    } finally { busy = false; render(); }
  }
  async function enter(c) {
    code = c; myJ = Math.round(now()); picked = ''; goId = 0; lastGo = null; handled = {}; pubOn = false;
    pub = store('party:pub') !== '0' && sess('party:keep') !== c;
    var room = db.ref('rooms/pt-' + c);
    refs = { players: room.child('players'), me: room.child('players/' + uid) };
    try { await timeout(refs.me.set(myState()), 10000, NET); }
    catch (e) { refs = null; code = ''; throw new Error(e.message === NET ? NET : 'The database rules blocked the party (' + (e.code || e.message || 'denied') + ').'); }
    refs.me.onDisconnect().remove();
    // Two people can squeeze in at once; whoever arrived ninth steps back out.
    var all = live((await timeout(refs.players.once('value'), 10000, NET)).val());
    var idx = all.map(function (m) { return m.uid; }).indexOf(uid);
    if (idx >= MAX) { var r = refs; refs = null; code = ''; try { r.me.onDisconnect().cancel(); await r.me.remove(); } catch (e) {} throw new Error('That party is full (' + MAX + ' of ' + MAX + '). Ask them to make room, or create your own party.'); }
    sess('party:code', c);
    members = all;
    refs.players.on('value', onPlayers);
    connRef = db.ref('.info/connected'); wasConnected = true;
    connRef.on('value', onConnected);
    clearInterval(beat);
    beat = setInterval(function () {
      if (!refs) return;
      var patch = { ts: Math.round(now()) }, fresh = kicked.filter(function (e) { return e.t > now() - KICK_TTL; });
      if (fresh.length !== kicked.length) { kicked = fresh; patch.kick = kicked.length ? kicked : null; }
      refs.me.update(patch).catch(function () {});
    }, BEAT);
    drawParty();
  }
  function onConnected(s) {
    if (!refs) return;
    if (s.val() === true && !wasConnected) { refs.me.onDisconnect().remove(); refs.me.set(myState()).catch(function () {}); }
    wasConnected = s.val() === true;
  }
  function teardown(clear) {
    clearInterval(beat);
    if (connRef) { connRef.off('value', onConnected); connRef = null; }
    if (refs) { var r = refs; try { r.players.off('value', onPlayers); r.me.onDisconnect().cancel(); r.me.remove().catch(function () {}); } catch (e) {} }
    refs = null; code = ''; members = []; picked = ''; lastGo = null; goId = 0; lastLeader = ''; kicked = []; pubOn = false;
    voteReset();
    if (clear) { sess('party:code', null); sess('party:keep', null); }
  }
  function leave() { teardown(true); say('You left the party.'); render(); }

  // ---------------- Live updates ----------------
  function leader() { return members[0] || null; }
  function onPlayers(s) {
    if (!refs) return;
    var all = live(s.val());
    var L0 = all[0], kt = L0 ? kickedBy(L0, uid) : 0;
    if (kt) { var msg = kickMsg(L0, kt); teardown(true); say(msg, true); render(); return; }
    if (!all.some(function (m) { return m.uid === uid; })) {
      // Our node went missing (a dropped connection removes it); put it back.
      refs.me.set(myState()).catch(function () {});
      all.push({ uid: uid, n: myName(), c: colorOf(uid), j: myJ, pk: picked, go: lastGo });
      all.sort(function (a, b) { return a.j - b.j || (a.uid < b.uid ? -1 : 1); });
    }
    var had = members.map(function (m) { return m.uid; }), came = all.filter(function (m) { return m.uid !== uid && had.indexOf(m.uid) < 0; });
    var was = members.filter(function (m) { return m.uid === lastLeader; })[0];
    members = all;
    var L = leader();
    if (had.length && came.length) say(came.map(function (m) { return m.n; }).join(', ') + ' joined the party.');
    // The lead passed to us from a leader who had the party Private: it stays Private until we choose.
    var keep = !!(L && L.uid === uid && lastLeader && lastLeader !== uid && was && !was.pub && pub);
    if (keep) { pub = false; sess('party:keep', code); }
    if (L && lastLeader && L.uid !== lastLeader) say(L.uid === uid ? 'You’re the party leader now. Pick a game.' + (keep ? ' The party is still private.' : '') : L.n + ' is the party leader now.');
    lastLeader = L ? L.uid : '';
    syncPub();
    // A new launch from the leader that happened while we were in the party: go there too.
    if (L && L.uid !== uid && L.go && okRoom(L.go.r)) {
      var key = L.uid + ':' + L.go.id + ':' + L.go.t;
      if (!handled[key] && (+L.go.t || 0) >= myJ - 2000 && now() - (+L.go.t || 0) < 120000) {
        handled[key] = 1;
        var g = byKey(L.go.g);
        if (g) { say(L.n + ' started ' + g.n + '. Joining room ' + L.go.r + '…'); launch(g, L.go.r); }
        else say(L.n + ' started a game this page doesn’t know yet. Reload to update.', true);
      }
    }
    drawParty();
  }

  // Only the leader's setting counts: our node says pub while we lead and want it Public (pn: the party's size).
  function syncPub(onErr) {
    if (!refs) return;
    var L = leader(), want = !!(pub && L && L.uid === uid);
    if (want === pubOn && (!want || members.length === pubN)) return;
    pubOn = want; pubN = members.length;
    refs.me.update({ pub: want ? 1 : null, pn: want ? pubN : null, ts: Math.round(now()) }).catch(onErr || function () {});
  }

  // ---------------- Games ----------------
  function playTogether() {
    var L = leader(); if (!refs || !L || L.uid !== uid) return;
    var g = byKey(picked);
    if (!g) return say('Pick a game first.', true);
    if (members.length > g.max) return say(g.n + ' rooms hold ' + g.max + ' players, and the party has ' + members.length + '.', true);
    var r = 'p' + rand(6);
    goId += 1; lastGo = { id: goId, g: g.k, r: r, t: Math.round(now()) };
    handled[uid + ':' + goId + ':' + lastGo.t] = 1;
    refs.me.update({ go: lastGo, ts: Math.round(now()) }).catch(function (e) { say('Couldn’t tell the party (' + (e.code || e.message) + ').', true); });
    say('Starting ' + g.n + ' in room ' + r + '…');
    launch(g, r);
  }
  // The leader removes a member: list them in our own node (we can't delete theirs); their browser leaves when it sees it.
  function kick(u) {
    var L = leader(); if (!refs || !L || L.uid !== uid || u === uid) return;
    var m = members.filter(function (x) { return x.uid === u; })[0]; if (!m) return;
    if (!confirm(window.BackRoomLang ? BackRoomLang.t('Remove {n} from the party? They can’t join it again for 10 minutes.', { n: m.n }) : 'Remove ' + m.n + ' from the party? They can\u2019t join it again for 10 minutes.')) return;
    var t = Math.round(now());
    kicked = kicked.filter(function (e) { return e.u !== u && e.t > t - KICK_TTL; }).concat({ u: u, t: t }).slice(-MAX);
    refs.me.update({ kick: kicked, ts: t }).then(function () { say('Removed ' + m.n + ' from the party.' + (pub ? ' Set the party to Private to stop other people joining.' : '')); }, function (e) { say('Couldn\u2019t remove them (' + (e.code || e.message) + ').', true); });
    drawParty();
  }
  // Room codes come from another member's node, so only accept the characters the games' invite links allow.
  function okRoom(r) { return typeof r === 'string' && /^[a-z0-9]{1,17}$/.test(r); }
  function hashFor(g, r) { return '#' + (g.pre != null ? g.pre : g.k + '-') + r; }
  var lastRoom = null;
  function launch(g, r) {
    var path = BASE + g.d + '/' + hashFor(g, r);
    lastRoom = { k: g.k, r: r };
    var go = function () {
      var fr = BR ? BR.openGame(path, g.n) : ownOverlay(path, g.n);
      if (fr) autoJoin(fr, g, r);
    };
    if (isOpen()) {
      // Already in a game: close it the usual way (Back), then open the new one.
      var once = function () { removeEventListener('popstate', once); setTimeout(go, 60); };
      addEventListener('popstate', once);
      history.back();
    } else go();
  }
  function isOpen() { return BR ? BR.isOpen() : !!own; }

  // Fill in the game's room box and press its own join button, once its menu is ready.
  function autoJoin(fr, g, r) {
    var ids = g.ids || { name: 'name', room: 'room', join: 'joinRoom' };
    var tries = 0, n = members.length;
    function fire(el, t) { el.dispatchEvent(new Event(t, { bubbles: true })); }
    function tick() {
      if (!fr.isConnected) return;
      var d; try { d = fr.contentDocument; } catch (e) { return; }
      var btn = d && d.getElementById(ids.join), room = d && d.getElementById(ids.room);
      if (!btn || !room || btn.disabled) { if (++tries < 60) setTimeout(tick, 250); return; }
      // Party launches always play under the party name, even over a name the game saved or made up
      // (Egg123, Driver123, Wanderer123, a random Hail Mary team), so the party sees the names it knows.
      var nm = d.getElementById(ids.name), before = g.nk ? store(g.nk) : null, set = '';
      if (nm) { nm.value = set = myName().slice(0, nm.maxLength > 0 ? nm.maxLength : 14); fire(nm, 'input'); fire(nm, 'change'); }
      room.value = r; fire(room, 'input');
      if (g.prep) try { g.prep(d, n); } catch (e) {}
      btn.click();
      // The game saves whatever is in its name box, so give it back the name it had saved before (if it had one):
      // now, once its join has gone through, and when the game closes, unless the player has typed another since.
      if (set && before != null) {
        var put = function () {
          var cur = store(g.nk); if (cur == null || cur === before) return;
          try { if (cur.charAt(0) === '"') cur = JSON.parse(cur); } catch (e) {}
          if (cleanName(cur) === cleanName(set)) store(g.nk, before);
        };
        put(); setTimeout(put, 3000); setTimeout(put, 15000);
        try { fr.contentWindow.addEventListener('pagehide', put); } catch (e) {}
      }
    }
    fr.addEventListener('load', function () { setTimeout(tick, 200); }, { once: true });
  }

  // Direct visits to the Back Room page have no home-page layer, so games open in this one.
  var own = null;
  function ownOverlay(path, name) {
    if (own) return null;
    own = document.createElement('div');
    own.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;background:var(--ground)';
    var bar = document.createElement('div');
    bar.style.cssText = 'flex:0 0 40px;display:flex;align-items:center;gap:12px;padding:0 12px;border-bottom:1px solid var(--line);background:var(--panel);font-family:var(--mono);font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase';
    var back = document.createElement('button'); back.type = 'button'; back.textContent = '← Back';
    back.style.cssText = 'font:inherit;letter-spacing:inherit;text-transform:inherit;color:var(--accent);background:none;border:1px solid var(--line);border-radius:6px;padding:4px 10px;cursor:pointer';
    back.onclick = function () { history.back(); };
    var lbl = document.createElement('span'); lbl.textContent = name; lbl.style.color = 'var(--ink-2)';
    bar.append(back, lbl);
    var fr = document.createElement('iframe'); fr.src = path; fr.title = name;
    fr.setAttribute('allow', 'fullscreen; autoplay; gamepad; clipboard-write'); fr.setAttribute('allowfullscreen', '');
    fr.style.cssText = 'flex:1;width:100%;border:0;display:block;background:#000';
    fr.addEventListener('load', function () { try { fr.contentWindow.focus(); } catch (e) {} });
    own.append(bar, fr); document.body.appendChild(own); document.body.style.overflow = 'hidden';
    history.pushState({ pty: 1 }, '', location.href);
    return fr;
  }
  if (!BR) addEventListener('popstate', function () { if (own) { own.remove(); own = null; document.body.style.overflow = ''; } });
  // On the Back Room page itself, the Play links of the games above open in this layer too (not in place of the page), so
  // the Online and Playing now panels keep running: you stay online, and people can join the game you're in (social.js).
  // A click with a modifier key (new tab or window) still follows the link.
  if (!BR) document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.closest('#party,#online,#playingnow')) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || u.search) return;
    var g = GAMES.filter(function (x) { return u.pathname === BASE + x.d + '/' || u.pathname === BASE + x.d + '/index.html'; })[0];
    if (!g || own) return;
    e.preventDefault();
    ownOverlay(u.pathname + u.hash, g.n);
  });

  // ================ Vote on next game ================
  // Any member can start a short vote on the next game; everyone votes from the Party panel, and when time is up the
  // leader's browser counts and launches the winner exactly like Play together (pk + go). Most votes wins; a tie (or no
  // votes at all) is picked at random, and "Random" picks any game that fits the party. The leader's own pick still works:
  // a Play together during the vote wins over it. One vote at a time: if two start at once, the earlier one counts.
  // Stored in each member's own party node, like everything else here:
  //   vt { t, e, o }      a vote this member started: start and end (server time), 3-5 options (game keys, 'rnd' = Random)
  //   vv { v, c }         this member's vote: the vote's key ('<starter uid>:<t>') and the option chosen
  //   vw { v, w, n, tie, r } leader only: the result it launched (game key, its votes, 1 if a tie was broken at random,
  //                       1 if Random won); all three are removed about 10 s after the vote ends.
  var VOTE_MS = 20000, VOTE_KEEP = 10000;
  var vote = { mine: null, ballot: null, won: null, setup: null, done: {}, seen: '', timer: 0, sig: '' };
  var vcss = document.createElement('style');
  vcss.textContent =
    '.pty-vote{display:grid;gap:8px;border-top:1px solid var(--line);padding-top:12px}' +
    '.pty-vote .pty-h{margin:0}.pty-vote .pty-go{margin-top:0}' +
    '.pty-vt-s{color:var(--accent)}' +
    '.pty-vopts{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,170px),1fr));gap:8px}' +
    '.pty-vopts button{--p:0%;font:inherit;font-size:15px;font-weight:600;color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:8px 12px;min-height:44px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;' +
      'background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 22%,transparent) var(--p),var(--panel-2) var(--p))}' +
    '.pty-vopts button:hover{border-color:var(--ink-2)}' +
    '.pty-vopts button[aria-pressed="true"]{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}' +
    '.pty-vopts button[disabled]{cursor:default}.pty-vopts button.win{border-color:var(--accent);box-shadow:inset 0 0 0 2px var(--accent)}' +
    '.pty-vopts b{font-family:var(--mono);font-size:14px;flex:none}' +
    '.pty-vote .pty-wait{font-size:14px}';
  document.head.appendChild(vcss);

  function voteFit() { var n = members.length; return GAMES.filter(function (g) { return g.max >= n; }).map(function (g) { return g.k; }); }
  function voteName(k) { return k === 'rnd' ? 'Random' : (byKey(k) || {}).n || k; }
  // Someone's vote fields, checked before use (live() calls this for every node).
  function voteRead(m, v, t) {
    var a = v.vt, b = v.vv, w = v.vw;
    if (a && typeof a === 'object' && Array.isArray(a.o)) {
      var st = +a.t || 0, en = +a.e || 0;
      var o = a.o.filter(function (k, i) { return typeof k === 'string' && (k === 'rnd' || byKey(k)) && a.o.indexOf(k) === i; });
      if (o.length >= 3 && o.length <= 5 && o.length === a.o.length && en - st >= 5000 && en - st <= 30000 && st < t + 30000 && en > t - 60000) m.vt = { t: st, e: en, o: o };
    }
    if (b && typeof b === 'object' && typeof b.v === 'string' && b.v.length <= 80 && typeof b.c === 'string' && b.c.length <= 4) m.vv = { v: b.v, c: b.c };
    if (w && typeof w === 'object' && typeof w.v === 'string' && w.v.length <= 80 && byKey(w.w)) m.vw = { v: w.v, w: w.w, n: Math.max(0, Math.min(MAX, +w.n || 0)), tie: w.tie === 1, r: w.r === 1 };
  }
  function voteState(s) { if (vote.mine) s.vt = vote.mine; if (vote.ballot) s.vv = vote.ballot; if (vote.won) s.vw = vote.won; }
  function voteReset() { vote.mine = vote.ballot = vote.won = vote.setup = null; vote.sig = ''; voteTimer(false); }
  // The members, with our own vote fields from this tab (our node can lag a moment behind).
  function voteMembers() { return members.map(function (m) { return m.uid === uid ? { uid: uid, n: m.n, vt: vote.mine, vv: vote.ballot, vw: vote.won } : m; }); }
  // The vote that counts: the earliest one started by someone still in the party, until VOTE_KEEP after it ends.
  function curVote() {
    var best = null, t = now();
    voteMembers().forEach(function (m) {
      var a = m.vt; if (!a || t > a.e + VOTE_KEEP) return;
      if (!best || a.t < best.t || (a.t === best.t && m.uid < best.by)) best = { key: m.uid + ':' + a.t, by: m.uid, n: m.n, t: a.t, e: a.e, o: a.o };
    });
    return best;
  }
  function voteCount(V) {
    var c = {}, voted = 0; V.o.forEach(function (k) { c[k] = 0; });
    voteMembers().forEach(function (m) { if (m.vv && m.vv.v === V.key && Object.prototype.hasOwnProperty.call(c, m.vv.c)) { c[m.vv.c]++; voted++; } });
    return { c: c, voted: voted };
  }
  function voteStart(list) {
    if (!refs || curVote()) return;
    var fit = voteFit(), o = (list || []).filter(function (k) { return fit.indexOf(k) >= 0; }).slice(0, 4);
    if (o.length < 2) { o = fit.slice(); for (var i = o.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = o[i]; o[i] = o[j]; o[j] = x; } o = o.slice(0, 4); }
    o.push('rnd');
    var t = Math.round(now());
    vote.mine = { t: t, e: t + VOTE_MS, o: o }; vote.setup = null; vote.seen = uid + ':' + t;
    refs.me.update({ vt: vote.mine, ts: t }).catch(function (e) { vote.mine = null; say('Couldn’t start the vote (' + (e.code || e.message) + ').', true); drawVote(); });
    say('Vote started: everyone has ' + Math.round(VOTE_MS / 1000) + ' seconds to pick the next game.');
    drawVote();
  }
  function voteCast(k) {
    var V = curVote(); if (!refs || !V || now() >= V.e || V.o.indexOf(k) < 0) return;
    vote.ballot = { v: V.key, c: k };
    refs.me.update({ vv: vote.ballot, ts: Math.round(now()) }).catch(function (e) { say('Couldn’t send your vote (' + (e.code || e.message) + ').', true); });
    drawVote();
  }
  // Time's up: the leader's browser counts and launches the winner, once per vote.
  function voteFinish(V) {
    var L = leader(); if (!refs || !L || L.uid !== uid || now() < V.e || vote.done[V.key]) return;
    vote.done[V.key] = 1;
    if (now() > V.e + VOTE_KEEP - 2000) return;   // we only just became leader, long after it ended
    if (lastGo && lastGo.t >= V.t) return;        // the leader started a game by hand during the vote
    var fit = voteFit(), C = voteCount(V).c, top = -1, best = [];
    V.o.forEach(function (k) {
      if (k !== 'rnd' && fit.indexOf(k) < 0) return;   // the party grew past that game's room size
      if (C[k] > top) { top = C[k]; best = [k]; } else if (C[k] === top) best.push(k);
    });
    if (!best.length) best = ['rnd'];
    var w = best[Math.floor(Math.random() * best.length)], r = w === 'rnd';
    if (r) w = fit[Math.floor(Math.random() * fit.length)];
    if (!w) return say('No game fits a party of ' + members.length + '.', true);
    vote.won = { v: V.key, w: w, n: Math.max(0, top), tie: best.length > 1 ? 1 : 0, r: r ? 1 : 0 };
    picked = w;
    refs.me.update({ vw: vote.won, pk: w, ts: Math.round(now()) }).catch(function () {});
    playTogether();
  }
  // Take our own fields down once their vote is over (or lost to an earlier one).
  function voteClean() {
    if (!refs) return;
    var V = curVote(), t = now(), p = {};
    if (vote.mine && (t > vote.mine.e + VOTE_KEEP || (V && V.by !== uid))) {
      if (V && V.by !== uid && t < vote.mine.e) say(V.n + ' started a vote first, so that one counts.');
      vote.mine = null; p.vt = null;
    }
    if (vote.ballot && (!V || V.key !== vote.ballot.v)) { vote.ballot = null; p.vv = null; }
    if (vote.won && (!V || V.key !== vote.won.v)) { vote.won = null; p.vw = null; }
    if (Object.keys(p).length) { p.ts = Math.round(t); refs.me.update(p).catch(function () {}); }
  }
  function voteTimer(on) {
    if (on && !vote.timer) vote.timer = setInterval(function () { if (refs) drawVote(); else voteTimer(false); }, 500);
    else if (!on && vote.timer) { clearInterval(vote.timer); vote.timer = 0; }
  }
  function drawVote() {
    if (!refs) return voteTimer(false);
    var box = $main.querySelector('.pty-vote');
    if (!box) {
      var pick = $main.querySelector('.pty-pick'); if (!pick) return;
      box = document.createElement('div'); box.className = 'pty-vote'; pick.parentNode.insertBefore(box, pick.nextSibling); vote.sig = '';
    }
    voteClean();
    var V = curVote(); if (V) { vote.setup = null; voteFinish(V); }
    voteTimer(!!(V || vote.mine || vote.ballot || vote.won));
    var t = now(), n = members.length, html, left = 0;
    if (V && vote.seen !== V.key) { vote.seen = V.key; if (V.by !== uid && t < V.e) say(V.n + ' started a vote on the next game.'); }
    if (V) {
      var cnt = voteCount(V), open = t < V.e, L = leader(), res = null, most = 0;
      voteMembers().forEach(function (m) { if (L && m.uid === L.uid && m.vw && m.vw.v === V.key) res = m.vw; });
      V.o.forEach(function (k) { most = Math.max(most, cnt.c[k]); });
      left = Math.max(0, Math.ceil((V.e - t) / 1000));
      var mineC = vote.ballot && vote.ballot.v === V.key ? vote.ballot.c : '';
      html = '<p class="pty-h">' + (open ? 'Vote on next game · <span class="pty-vt-s"></span>' : 'Vote over') + '</p>' +
        '<div class="pty-vopts" role="group" aria-label="Vote on next game">' + V.o.map(function (k) {
          var c = cnt.c[k], win = res && (res.r ? k === 'rnd' : k === res.w);
          return '<button type="button" data-vo="' + esc(k) + '" aria-pressed="' + (k === mineC) + '"' + (open ? '' : ' disabled') + (win ? ' class="win"' : '') +
            ' style="--p:' + (cnt.voted ? Math.round(c * 100 / cnt.voted) : 0) + '%" aria-label="' + esc(voteName(k)) + ', ' + T(c === 1 ? '1 vote' : '{c} votes', { c: c }) + '"><span>' + esc(voteName(k)) + '</span><b>' + c + '</b></button>';
        }).join('') + '</div><div class="pty-go"><span class="pty-wait">';
      // (built with T(), so the names stay as they are and the words follow the language; redrawn when it changes)
      if (open) html += (V.by === uid ? T('You started this vote') : T('{n} started this vote', { n: esc(V.n) })) + T(' · {a} of {b} voted', { a: cnt.voted, b: n }) +
        (mineC ? '' : T(' · tap a game to vote')) + T('. Most votes wins; a tie is picked at random.');
      else if (res) {
        var wg = '<b>' + esc(voteName(res.w)) + '</b>';
        html += (res.r ? T('Random won, so the leader’s browser picked {g}.', { g: wg })
          : res.tie ? T(res.n === 1 ? '{g} tied with 1 vote and was picked at random.' : '{g} tied with {n} votes and was picked at random.', { g: wg, n: res.n })
          : T(res.n === 1 ? '{g} won with 1 vote.' : '{g} won with {n} votes.', { g: wg, n: res.n })) + T(' Everyone’s joining it now.');
      }
      else html += L && L.uid === uid ? T('Waiting for your browser to start the winner…') : L ? T('Waiting for {n}’s browser to start the winner…', { n: esc(L.n) }) : T('Waiting for the leader to start the winner…');
      html += '</span>' + (open && V.by === uid ? '<button type="button" class="btn sm" data-a="vote-cancel">Cancel vote</button>' : '') + '</div>';
    } else if (vote.setup) {
      var s = vote.setup, fit = voteFit();
      html = '<p class="pty-h">Vote on next game</p><p class="pty-wait">Choose 2 to 4 games, or none for a surprise mix. Random is always an option too.</p>' +
        '<div class="pty-games" role="group" aria-label="Games to vote on">' + GAMES.filter(function (g) { return fit.indexOf(g.k) >= 0; }).map(function (g) {
          var on = s.indexOf(g.k) >= 0;
          return '<button type="button" data-vg="' + g.k + '" aria-pressed="' + on + '"' + (!on && s.length >= 4 ? ' disabled' : '') + '>' + esc(g.n) + '</button>';
        }).join('') + '</div><div class="pty-go"><button type="button" class="btn primary" data-a="vote-go"' + (s.length === 1 ? ' disabled' : '') + '>' +
        (s.length >= 2 ? 'Start vote (' + s.length + ' games + Random)' : s.length ? 'Choose one more' : 'Start with a surprise mix') + '</button><button type="button" class="btn" data-a="vote-x">Cancel</button></div>';
    } else {
      html = '<div class="pty-go"><button type="button" class="btn sm" data-a="vote-new"' + (n < 2 ? ' disabled' : '') + '>Vote on next game</button><span class="pty-wait">' +
        (n < 2 ? 'Once someone joins, anyone in the party can start a vote on the next game.' : 'Anyone can start one: ' + Math.round(VOTE_MS / 1000) + ' seconds, most votes wins.') + '</span></div>';
    }
    // Only rebuild when something changed (keeps keyboard focus); the countdown is updated on its own.
    if (vote.sig !== html) { vote.sig = html; box.innerHTML = html; }
    var cd = box.querySelector('.pty-vt-s'); if (cd) cd.textContent = left + ' s';
  }
  function voteClick(b) {
    var a = b.getAttribute('data-a') || '', vg = b.getAttribute('data-vg'), vo = b.getAttribute('data-vo');
    if (vo) voteCast(vo);
    else if (vg) { var s = vote.setup || [], i = s.indexOf(vg); if (i >= 0) s.splice(i, 1); else if (s.length < 4) s.push(vg); vote.setup = s; drawVote(); }
    else if (a === 'vote-new') { vote.setup = []; drawVote(); }
    else if (a === 'vote-x') { vote.setup = null; drawVote(); }
    else if (a === 'vote-go') voteStart(vote.setup);
    else if (a === 'vote-cancel') {
      if (refs && vote.mine) { vote.mine = null; refs.me.update({ vt: null, ts: Math.round(now()) }).catch(function () {}); say('You cancelled the vote.'); }
      drawVote();
    } else return false;
    return true;
  }
  // ================ end of Vote on next game ================

  // ---------------- Drawing ----------------
  var drawn = '';
  function render() { if (code && refs) drawParty(); else drawIdle(); }

  // A change of language redraws the panel: the lines put together with T() are rebuilt in the new language.
  document.addEventListener('backroom:lang', function () { drawn = ''; if (vote) vote.sig = ''; try { render(); } catch (e) {} });
  function drawIdle() {
    $sub.textContent = 'Group up with up to ' + MAX + ' friends, then the leader picks a game and everyone lands in the same room.';
    if (drawn !== 'idle') {
      drawn = 'idle';
      $main.innerHTML =
        '<div class="pty-row">' +
          '<label>Your name<input id="ptyName" maxlength="14" autocomplete="nickname" spellcheck="false" placeholder="Name"></label>' +
          '<button type="button" class="btn primary" data-a="create">Create party</button>' +
          '<span class="pty-or">or</span>' +
          '<label>Party code<input id="ptyCode" maxlength="20" autocomplete="off" spellcheck="false" autocapitalize="off" placeholder="e.g. k7m2q"></label>' +
          '<button type="button" class="btn" data-a="join">Join party</button>' +
        '</div>';
      $main.querySelector('#ptyName').value = typedName();
    }
    $main.querySelectorAll('button').forEach(function (b) { b.disabled = busy; });
  }

  function drawParty() {
    if (!refs) return drawIdle();
    var L = leader(), lead = L && L.uid === uid, n = members.length;
    $sub.textContent = lead ? 'You’re the leader: pick a game and press Play together to bring everyone in.' : 'Waiting for the leader to pick a game. When they start, you’ll join them automatically.';
    if (drawn !== 'party:' + code) {
      drawn = 'party:' + code;
      $main.innerHTML =
        '<div class="pty-row split" style="align-items:center">' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="pty-h" style="margin:0">Code</span><span class="pty-code"></span><span class="pty-count"></span></div>' +
          '<div class="pty-acts"><button type="button" class="btn sm" data-a="chat" style="display:none">Party chat<span class="onl-n"></span></button><button type="button" class="btn sm" data-a="copy">Copy invite link</button><button type="button" class="btn sm" data-a="leave">Leave party</button></div>' +
        '</div>' +
        '<div class="pty-pub" hidden><span class="pty-h" id="ptyWho">Who can join</span>' +
          '<div class="pty-seg" role="radiogroup" aria-labelledby="ptyWho"><button type="button" role="radio" data-a="pub" data-v="1">Public</button><button type="button" role="radio" data-a="pub" data-v="0">Private</button></div>' +
          '<span class="pty-wait"></span></div>' +
        '<ul class="pty-mem" aria-label="Party members"></ul>' +
        '<div class="pty-pick"></div>';
      $main.querySelector('.pty-code').textContent = code;
    }
    $main.querySelector('.pty-count').textContent = n + ' of ' + MAX;
    // Party chat lives in the Online panel (social.js); this button opens it once there's someone to talk to.
    var chatB = $main.querySelector('[data-a="chat"]'); if (chatB) chatB.style.display = n > 1 && window.BackRoomChat ? '' : 'none';
    var t0 = now(); kicked = kicked.filter(function (e) { return e.t > t0 - KICK_TTL; });
    var mem = $main.querySelector('.pty-mem');
    mem.classList.toggle('pty-lead', !!lead);   // wider cards for the leader: the kick button and the tier badge both need room
    mem.innerHTML = members.map(function (m, i) {
      var going = lead && kicked.some(function (e) { return e.u === m.uid; });
      return '<li><span class="pty-av" style="background:' + esc(m.c) + '" aria-hidden="true">' + esc(m.n.charAt(0).toUpperCase()) + '</span>' +
        '<span class="pty-who"><span class="pty-nm" data-aisle-u="' + esc(m.uid) + '">' + esc(m.n) + '</span><span class="pty-tag">' +
        [i === 0 ? '<b>Leader</b>' : 'Member', m.uid === uid ? 'You' : '', going ? 'Removing…' : ''].filter(Boolean).join(' · ') + '</span></span>' +
        (lead && m.uid !== uid && !going ? '<button type="button" class="pty-kick" data-k="' + esc(m.uid) + '" title="Remove from the party" aria-label="Remove ' + esc(m.n) + ' from the party">✕</button>' : '') + '</li>';
    }).join('');
    // The avatar (avatar.js) in place of the initial, and the status tier badge (miles.js) on its own line above Leader / Member.
    Array.prototype.forEach.call(mem.children, function (li, i) {
      var m = members[i]; if (!m) return;
      // Your own avatar is a button that opens the editor (avatar.js).
      if (window.BackRoomAvatar) { try { li.replaceChild(m.uid === uid && BackRoomAvatar.editButton ? BackRoomAvatar.editButton(m.uid, 32) : BackRoomAvatar.el(m.uid, 32), li.firstChild); } catch (e) {} }
      // The card takes the colour of that member's name tile (avatar.js), if they chose one.
      if (window.BackRoomAvatar && BackRoomAvatar.paint) { try { BackRoomAvatar.paint(li, m.uid); } catch (e) {} }
      if (window.BackRoomMiles) { try { var t = BackRoomMiles.peek(m.uid), tag = li.querySelector('.pty-tag'); if (t) { var tl = document.createElement('span'); tl.className = 'pty-tl'; tl.appendChild(BackRoomMiles.badge(t)); tag.parentNode.insertBefore(tl, tag); } } catch (e) {} }
    });

    // Who can join: the leader's Public / Private choice, right under the party code.
    var pubRow = $main.querySelector('.pty-pub');
    pubRow.hidden = !lead;
    if (lead) {
      pubRow.querySelectorAll('[data-a="pub"]').forEach(function (b) { b.setAttribute('aria-checked', String((b.getAttribute('data-v') === '1') === pub)); });
      pubRow.lastChild.textContent = 'Public: anyone in the Back Room can see this party and join it. Private: invite only, with your link or code.' +
        (pub && store('ol:hidden') === '1' ? ' You’re hidden in Online, so nobody sees it until you show yourself there.' : '');
    }
    var box = $main.querySelector('.pty-pick');
    if (lead) {
      if (box.getAttribute('data-mode') !== 'lead') {
        box.setAttribute('data-mode', 'lead');
        box.innerHTML = '<p class="pty-h">Pick a game</p><div class="pty-games" role="group" aria-label="Game">' +
          GAMES.map(function (g) { return '<button type="button" data-g="' + g.k + '" aria-pressed="false">' + esc(g.n) + (g.max < MAX ? ' <small>· up to ' + g.max + '</small>' : '') + '</button>'; }).join('') +
          '</div><div class="pty-go"><button type="button" class="btn primary" data-a="play">▶ Play together</button><span class="pty-wait"></span></div>';
      }
      if (picked && byKey(picked) && byKey(picked).max < n) picked = '';
      box.querySelectorAll('[data-g]').forEach(function (b) {
        var g = byKey(b.getAttribute('data-g'));
        b.disabled = g.max < n; b.title = g.max < n ? g.n + ' rooms hold ' + g.max + ' players' : '';
        b.setAttribute('aria-pressed', String(b.getAttribute('data-g') === picked));
      });
      box.querySelector('[data-a="play"]').disabled = !picked;
      box.querySelector('.pty-wait').textContent = picked ? 'Everyone joins ' + byKey(picked).n + ' in a new room.' : 'Choose one of the games above.';
    } else {
      box.setAttribute('data-mode', 'member');
      var g = L && byKey(L.pk), go = L && L.go, gg = go && byKey(go.g);
      var html = '<p class="pty-wait">' + (L ? (g ? T('{n} has picked {g}.', { n: esc(L.n), g: '<b>' + esc(g.n) + '</b>' }) : T('{n} hasn’t picked a game yet.', { n: esc(L.n) })) : '') +
        (L ? T(L.pub ? ' This party is public: anyone in the Back Room can join it.' : ' This party is private: invite only.') : '') + '</p>';
      if (gg && okRoom(go.r) && now() - (+go.t || 0) < 3 * 3600000)
        html += '<div class="pty-go"><button type="button" class="btn" data-a="rejoin">' + T('Join them in {g}', { g: esc(gg.n) }) + '</button><span class="pty-wait">' + T('Room {r}', { r: esc(go.r) }) + '</span></div>';
      box.innerHTML = html;
    }
    drawVote();
  }

  // ---------------- Events ----------------
  sec.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t || t.disabled) return;
    if (voteClick(t)) return;
    var a = t.getAttribute('data-a'), gk = t.getAttribute('data-g'), ku = t.getAttribute('data-k');
    if (ku) kick(ku);
    else if (a === 'create' || a === 'join') {
      var nm = cleanName($main.querySelector('#ptyName').value);
      if (!nm) { say('Type your name first, so your party knows who you are.', true); $main.querySelector('#ptyName').focus(); return; }
      if (nm !== typedName()) setName(nm); else store('party:name', nm);
      if (a === 'create') create();
      else {
        var c = cleanCode($main.querySelector('#ptyCode').value);
        if (!c) { say('Type the party code your friend sent you.', true); $main.querySelector('#ptyCode').focus(); return; }
        join(c, false);
      }
    } else if (a === 'leave') leave();
    else if (a === 'chat') { if (window.BackRoomChat) window.BackRoomChat.open(); }
    else if (a === 'copy') {
      var url = location.origin + '/#pt-' + code;
      var done = function (ok) { say(ok ? 'Invite link copied. Friends open it, enter the Back Room code, and join the party.' : 'Invite link: ' + url); };
      try { navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); } catch (err) { done(false); }
    } else if (a === 'play') playTogether();
    else if (a === 'pub') {
      var L0 = leader(); if (!refs || !L0 || L0.uid !== uid) return;
      var v = t.getAttribute('data-v') === '1'; if (v === pub) return;
      pub = v; store('party:pub', pub ? '1' : '0'); sess('party:keep', null);
      syncPub(function (e) { say('Couldn’t save that (' + (e.code || e.message) + ').', true); });
      say(pub ? 'Your party is public. Anyone in the Back Room can see it and join.' : 'Your party is private. Only people with your invite link or code can join, or people you let in.');
      drawParty();
    }
    else if (a === 'rejoin') {
      var L = leader(), g = L && L.go && byKey(L.go.g);
      if (g && okRoom(L.go.r)) launch(g, L.go.r);
    } else if (gk) {
      picked = gk;
      if (refs) refs.me.update({ pk: picked, ts: Math.round(now()) }).catch(function () {});
      drawParty();
    }
  });
  sec.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !e.target.matches('input')) return;
    var b = $main.querySelector(e.target.id === 'ptyCode' ? '[data-a="join"]' : '[data-a="create"]');
    if (b) b.click();
  });
  var nameT = 0;
  sec.addEventListener('input', function (e) {
    if (e.target.id !== 'ptyName') return;
    clearTimeout(nameT); var v = cleanName(e.target.value);
    nameT = setTimeout(function () { setName(v); }, 400);
  });
  document.addEventListener('backroom:name', function (e) { if (e.detail && e.detail.mine && e.detail.from !== 'party') nameChanged(); });
  addEventListener('storage', function (e) { if (e.key === 'ol:name' || e.key === 'party:name') nameChanged(); });
  // avatar.js and miles.js may load after the list was drawn, and every finished tier read is a redraw.
  document.addEventListener('backroom:avatar', function () { if (refs) { syncAvatar(); drawParty(); } });
  document.addEventListener('backroom:miles', function () { if (refs) drawParty(); });
  if (window.SiteAccount && SiteAccount.onChange) SiteAccount.onChange(function () { if (!code && !store('party:name') && !store('ol:name')) { drawn = ''; drawIdle(); } });

  // ---------------- Start ----------------
  drawIdle();
  // An invite link (#pt-<code>), or a party this tab was in before the page reloaded.
  var inv = BR && BR.invite ? BR.invite : '';
  if (!BR) { var m = /^#pt-([a-z0-9]{1,8})$/.exec(location.hash); if (m) { inv = m[1]; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} } }
  inv = cleanCode(inv);
  var again = cleanCode(sess('party:code'));
  if (inv) {
    if (!typedName()) {
      $main.querySelector('#ptyCode').value = inv;
      say('You were invited to party ' + inv + '. Type your name and press Join party.');
      $main.querySelector('#ptyName').focus();
    } else join(inv, inv === again);
  } else if (again) join(again, true);

  // For social.js (the Online panel under this one): it signs in through boot(), shows whether you're in a party,
  // and creates, joins or opens games through these, so both panels share one sign-in and one party.
  function openPath(path, name) {
    var go = function () { if (BR) BR.openGame(path, name); else ownOverlay(path, name); };
    if (isOpen()) { var once = function () { removeEventListener('popstate', once); setTimeout(go, 60); }; addEventListener('popstate', once); history.back(); }
    else go();
  }
  window.Party = {
    boot: function () { return boot().then(function () { return { app: app, db: db, uid: uid }; }); },
    now: now,
    get code() { return refs ? code : ''; },
    get size() { return refs ? members.length : 0; },
    get leader() { var L = refs && leader(); return L ? { uid: L.uid, n: L.n } : null; },
    get members() { return refs ? members.map(function (m) { return m.uid; }) : []; },
    // Members with their party names, and the people the current leader has removed (still listed until they go).
    get roster() { return refs ? members.map(function (m) { return { uid: m.uid, n: m.n }; }) : []; },
    get out() {
      var L = refs && leader(); if (!L) return [];
      var t = now(), list = L.uid === uid ? kicked : (L.kick || []);
      return list.filter(function (e) { return e.t > t - KICK_TTL; }).map(function (e) { return e.u; });
    },
    max: MAX,
    get room() { return lastRoom; },
    // A public party's game, for the Online node (social.js) to show in Playing now (playingnow.js): only while we lead,
    // the party is public, and the room we're in is the one we launched the party into.
    get pub() {
      var L = refs && leader();
      if (!pubOn || !L || L.uid !== uid || !lastGo || !lastRoom || lastRoom.k !== lastGo.g || lastRoom.r !== lastGo.r) return null;
      return { pp: code, pg: lastGo.g, pr: lastGo.r, pn: members.length, pt: lastGo.t };
    },
    // A public party we lead, whether or not it's in a game: its code and size, for the Online node (social.js), so
    // people in the Back Room get a Join party button.
    get openParty() { var L = refs && leader(); return pubOn && L && L.uid === uid ? { pp: code, pn: members.length } : null; },
    // In a party its leader has set to Private: then nobody in it shows their game as joinable (social.js).
    get priv() { var L = refs && leader(); return !!(L && !(L.uid === uid ? pub : L.pub)); },
    games: GAMES.map(function (g) { return { k: g.k, n: g.n, d: g.d, pre: g.pre != null ? g.pre : g.k + '-', max: g.max }; }),
    create: function () { return (refs || busy ? Promise.resolve() : create()).then(function () { return refs ? code : ''; }); },
    // pubOnly: joining a public party without an invite (the Online panel's Join party button); refused once it's Private.
    join: function (c, pubOnly) {
      c = cleanCode(c);
      if (!c || busy || (refs && c === code)) return Promise.resolve(refs ? code : '');
      if (refs) teardown(true);
      return join(c, false, !!pubOnly).then(function () { return refs ? code : ''; });
    },
    // Open a party game in room r and press its Play in room button, as a party launch does.
    launch: function (k, r) {
      var g = byKey(k);
      if (!g || typeof r !== 'string' || !/^[a-z0-9][a-z0-9-]{0,16}$/.test(r)) return false;
      launch(g, r); return true;
    },
    open: function (path, name) { if (typeof path === 'string' && path.indexOf(BASE) === 0) openPath(path, name || ''); }
  };

  // Test hook for the automated checks; harmless in normal play.
  if (navigator.webdriver) window.__party = { get code() { return code; }, get uid() { return uid; }, get members() { return members; }, get kicked() { return kicked; }, get pub() { return pub; }, get pubOn() { return pubOn; }, leader: leader, GAMES: GAMES, MAX: MAX, db: function () { return db; } };
})();
