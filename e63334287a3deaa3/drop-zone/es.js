/* Driftfall's Spanish words for ../lang.js (English → Spanish, our own wording; see lang.js's comment for how it works).
   The menus, lobby, pause, results, Creative tools, Face and Locker screens are translated by lang.js as they appear;
   the HUD, banner and kill feed are data-noi18n and put their words through T() in index.html (they change many times a
   second). Player names, room codes and place names are never translated. Nothing here is sent to other players. */
(function () {
  if (!window.BackRoomLang) return;
  var d = {
    // ---- menu ----
    'Gullrock Isle · up to 30 players': 'Isla Gullrock · hasta 30 jugadores',
    'Ride the Drifter, a big blue cargo plane, over the island, jump off its ramp and glide down wherever you like. Grab what the chests hold, build cover, and be the last one standing as the storm closes in.':
      'Súbete al Drifter, un gran avión de carga azul, cruza la isla, salta por su rampa y planea hasta donde quieras. Toma lo que hay en los cofres, construye para cubrirte y sé el último en pie mientras la tormenta se cierra.',
    'Face': 'Cara', 'Mode': 'Modo', 'Online': 'En línea', 'Offline': 'Sin conexión',
    'Joins a public room, always Classic. People only: a match starts once there are 2.': 'Entra a una sala pública, siempre en Clásico. Solo personas: la partida empieza cuando hay 2.',
    'Play in room': 'Jugar en la sala',
    'Pick a room code and send friends the invite link: up to 30 players. A room you make starts in the mode picked above.':
      'Elige un código de sala y manda el enlace a tus amigos: hasta 30 jugadores. Una sala que creas empieza en el modo elegido arriba.',
    'Practice (offline)': 'Práctica (sin conexión)',
    'Look sensitivity': 'Sensibilidad de la cámara', 'Graphics': 'Gráficos',
    'Pretty (eases off by itself if frames drop)': 'Bonitos (se aligeran solos si baja la fluidez)', 'Fast': 'Rápidos',
    'Show other players’ drawn faces': 'Mostrar las caras dibujadas de los demás',
    'Edit on release: hold Edit, sweep over the tiles, let go to confirm (off: tap Edit, pick tiles, Edit again)':
      'Editar al soltar: mantén Editar, pasa por las casillas y suelta para confirmar (apagado: toca Editar, elige casillas y Editar otra vez)',
    'Edit on release': 'Editar al soltar',
    'Move (and steer the glider)': 'Moverte (y dirigir el planeador)',
    'Jump, bail out of the Drifter, open the glider': 'Saltar, tirarte del Drifter, abrir el planeador',
    'Shoot, place a build, use a heal': 'Disparar, colocar una construcción, usar una cura',
    'Hold to aim / scope': 'Mantén para apuntar / usar la mira',
    'Item slots (or the mouse wheel)': 'Casillas de objetos (o la rueda del mouse)',
    'Crowbar: hit trees, rocks and walls for scrap': 'Palanca: golpea árboles, rocas y paredes para sacar chatarra',
    'Build mode on and off (shows the build pieces)': 'Modo construcción sí o no (muestra las piezas)',
    'Wall, floor, ramp (10 scrap each)': 'Pared, piso, rampa (10 de chatarra cada una)',
    'Edit a build of yours (free): hold, look across the tiles, let go; R while editing resets it':
      'Editar una construcción tuya (gratis): mantén, mira las casillas y suelta; R mientras editas la deja entera',
    'Open a chest, pick up or swap': 'Abrir un cofre, recoger o cambiar',
    'Creative: fly on and off (or tap Jump twice)': 'Creativo: volar sí o no (o toca Saltar dos veces)',
    'Creative, flying: go down (Jump goes up)': 'Creativo, volando: bajar (Saltar sube)',
    'Creative: tools (loadout, targets, clear builds)': 'Creativo: herramientas (equipo, blancos, borrar construcciones)',
    'Creative: back to spawn': 'Creativo: volver al punto de inicio',
    'Reload': 'Recargar', 'Big map': 'Mapa grande', 'Menu and invite link': 'Menú y enlace de invitación',
    'When out: watch the next player': 'Si quedas fuera: mira al siguiente jugador',
    'Change keys': 'Cambiar teclas',
    'On a phone? Turn it sideways for the best view. Tap the slots at the top to switch items, tap the scrap count to build, and tap the map to make it big. Aim at something you built and an Edit button appears: hold it, drag another finger over the tiles and let go to cut a door or a window.':
      '¿En un celular? Ponlo de costado para ver mejor. Toca las casillas de arriba para cambiar de objeto, toca la chatarra para construir y toca el mapa para agrandarlo. Apunta a algo que construiste y aparece el botón Editar: mantenlo, pasa otro dedo por las casillas y suelta para abrir una puerta o una ventana.',
    'SPACE': 'ESPACIO', 'Space': 'Espacio', 'CLICK': 'CLIC', 'LEFT CLICK': 'CLIC IZQ.', 'RIGHT CLICK': 'CLIC DER.', 'Left click': 'Clic izquierdo', 'Right click': 'Clic derecho',
    'MIDDLE CLICK': 'CLIC CENTRAL', 'Middle click': 'Clic central',
    'Language · Idioma': 'Idioma · Language', 'Map': 'Mapa', 'Island map': 'Mapa de la isla',

    // ---- modes ----
    'Classic': 'Clásico', 'Duos': 'Dúos', 'Trios': 'Tríos', 'Creative': 'Creativo', 'Box Fights': 'Box Fights', 'Zone Wars': 'Zone Wars',
    'The battle royale: ride the Drifter, loot, build and be the last one standing as the storm closes in.':
      'El battle royale: viaja en el Drifter, busca botín, construye y sé el último en pie mientras la tormenta se cierra.',
    'The battle royale in teams of two: no friendly fire, a knocked-down team-mate can be picked up, last team standing wins.':
      'El battle royale en equipos de dos: sin fuego amigo, puedes levantar a un compañero derribado y gana el último equipo en pie.',
    'The battle royale in teams of three: no friendly fire, a knocked-down team-mate can be picked up, last team standing wins.':
      'El battle royale en equipos de tres: sin fuego amigo, puedes levantar a un compañero derribado y gana el último equipo en pie.',
    'A build sandbox on a flat grid island: unlimited scrap and ammo, no storm, flying, any weapon, practice targets. Friends in the room build with you.':
      'Un espacio libre para construir en una isla plana con cuadrícula: chatarra y munición sin límite, sin tormenta, puedes volar, cualquier arma y blancos de práctica. Tus amigos de la sala construyen contigo.',
    'Each team starts in its own box of real builds, a few metres from the other team’s, on a small flat arena. Last team standing takes the round.':
      'Cada equipo empieza en su propia caja de construcciones, a pocos metros de la del otro, en una arena chica y plana. El último equipo en pie gana la ronda.',
    'A small hilly arena and a fast storm whose circles jump about and shrink quickly: rotate, build, be the last one standing.':
      'Una arena chica con colinas y una tormenta rápida cuyos círculos saltan y se achican enseguida: muévete, construye y sé el último en pie.',
    'A full match against 11 practice bots, just in this browser. Bots are only in Practice.':
      'Una partida completa contra 11 bots de práctica, solo en este navegador. Los bots están solo en Práctica.',
    'You and a bot team-mate against 5 bot teams, just in this browser.': 'Tú y un bot compañero contra 5 equipos de bots, solo en este navegador.',
    'You and two bot team-mates against 3 bot teams, just in this browser.': 'Tú y dos bots compañeros contra 3 equipos de bots, solo en este navegador.',
    'Just you on the grid island, in this browser. Add practice targets from Creative tools.': 'Solo tú en la isla con cuadrícula, en este navegador. Agrega blancos de práctica desde Herramientas de Creativo.',
    'Teams against practice bots, just in this browser.': 'Equipos contra bots de práctica, solo en este navegador.',
    'You against 7 practice bots, just in this browser.': 'Tú contra 7 bots de práctica, solo en este navegador.',
    '{a}v{b} against practice bots, first to {c}, just in this browser.': '{a} contra {b} con bots de práctica, gana el primero en llegar a {c}, solo en este navegador.',
    'Teams': 'Equipos', 'First to': 'Gana con', 'Fill in': 'Completan', 'Off': 'No',
    'Practice Duos': 'Práctica de Dúos', 'Practice Trios': 'Práctica de Tríos', 'Practice Creative': 'Práctica de Creativo',
    'Practice Box Fights': 'Práctica de Box Fights', 'Practice Zone Wars': 'Práctica de Zone Wars',
    'Start match': 'Empezar partida', 'Start Duos': 'Empezar Dúos', 'Start Trios': 'Empezar Tríos', 'Start Creative': 'Empezar Creativo',
    'Start Box Fights': 'Empezar Box Fights', 'Start Zone Wars': 'Empezar Zone Wars',
    'BOARDING': 'EMBARQUE', 'SOON': 'PRONTO', 'DUOS': 'DÚOS', 'TRIOS': 'TRÍOS', 'CREATIVE': 'CREATIVO',

    // ---- lobby ----
    'Room': 'Sala', 'Connecting to the room…': 'Conectando con la sala…',
    'players in the room': 'jugadores en la sala', 'player in the room': 'jugador en la sala', 'host': 'anfitrión', 'you': 'tú',
    'Watch the match': 'Mirar la partida', 'Copy invite link': 'Copiar enlace de invitación', 'Leave room': 'Salir de la sala',
    'You\'re the host.': 'Eres el anfitrión.', 'You’re the host.': 'Eres el anfitrión.',
    'Online matches are people only, so a match needs at least 2. Practice (offline) has bots.': 'Las partidas en línea son solo de personas, así que hacen falta al menos 2. Práctica (sin conexión) tiene bots.',
    'This match uses a newer version of the game, reload to join.': 'Esta partida usa una versión más nueva del juego: recarga la página para entrar.',
    'A match is on. You\'ll drop in with everyone at the next one.': 'Hay una partida en curso. Saltarás con todos en la próxima.',
    'A match is on ({n} left). You\'ll drop in with everyone at the next one.': 'Hay una partida en curso (quedan {n}). Saltarás con todos en la próxima.',
    'A match is just finishing. The next one boards soon.': 'Una partida está terminando. La próxima embarca pronto.',
    'The Drifter boards in {n} s, or start now.': 'El Drifter embarca en {n} s, o empieza ya.',
    'The Drifter boards in {n} s.': 'El Drifter embarca en {n} s.',
    'Waiting for one more person: a match starts with 2 or more, and the countdown begins when the second one joins.':
      'Falta una persona más: la partida empieza con 2 o más, y la cuenta regresiva arranca cuando entra la segunda.',
    '1 person here has an older copy of the game. They can join once they reload.': '1 persona tiene una versión vieja del juego. Podrá entrar cuando recargue.',
    '{n} people here have an older copy of the game. They can join once they reload.': '{n} personas tienen una versión vieja del juego. Podrán entrar cuando recarguen.',
    ' You’re the host: pick the mode for everyone.': ' Eres el anfitrión: elige el modo para todos.',
    'Everyone here builds together.': 'Aquí todos construyen juntos.',
    'Bots fill the empty places.': 'Los bots ocupan los lugares vacíos.', 'No bots: people only.': 'Sin bots: solo personas.',
    'The match is just finishing.': 'La partida está terminando.', 'Press Start when everyone’s here.': 'Pulsa Empezar cuando estén todos.',
    'Creative is on.': 'Creativo está en curso.', 'The last round is just finishing.': 'La última ronda está terminando.',
    'Box Fights needs someone on each team: another person, or bots.': 'Box Fights necesita a alguien en cada equipo: otra persona o bots.',
    'Zone Wars needs 2 or more: another person, or bots.': 'Zone Wars necesita 2 o más: otra persona o bots.',

    // ---- face ----
    'Your character': 'Tu personaje', 'FA': 'CA', 'CE': 'RA',
    'Draw your own eyes and mouth. Players in your matches see it. Clear it to get the usual face back.': 'Dibuja tus propios ojos y boca. Los jugadores de tus partidas la ven. Bórrala para volver a la cara de siempre.',
    'Face drawing grid, 12 squares wide and 10 high. Arrow keys move, Space fills or empties a square.': 'Cuadrícula para dibujar la cara, de 12 cuadros de ancho y 10 de alto. Las flechas mueven y Espacio pinta o borra un cuadro.',
    'Tool': 'Herramienta', 'Pencil': 'Lápiz', 'Eraser': 'Goma', 'Undo': 'Deshacer', 'Clear': 'Borrar', 'Start from': 'Empezar desde',
    'Keep it friendly. Keys: arrows move, Space fills or empties a square, P pencil, E eraser, Z undo.': 'Que sea amigable. Teclas: flechas para moverte, Espacio pinta o borra un cuadro, P lápiz, E goma, Z deshacer.',
    'Smile': 'Sonrisa', 'Sleepy': 'Con sueño', 'Surprised': 'Sorpresa', 'Grumpy': 'Enojado', 'Wink': 'Guiño', 'Shades': 'Lentes de sol',
    'Smile face': 'Cara: sonrisa', 'Sleepy face': 'Cara: con sueño', 'Surprised face': 'Cara: sorpresa', 'Grumpy face': 'Cara: enojado', 'Wink face': 'Cara: guiño', 'Shades face': 'Cara: lentes de sol',

    // ---- pause ----
    'Paused': 'En pausa', 'The storm keeps moving while you\'re away.': 'La tormenta sigue avanzando mientras no estás.',
    'Creative tools': 'Herramientas de Creativo', 'End for everyone': 'Terminar para todos',
    'Practice · paused': 'Práctica · en pausa',
    'Everyone carries on building while this is open.': 'Todos siguen construyendo mientras esto está abierto.',
    'The island waits for you.': 'La isla te espera.', 'The round carries on while this is open.': 'La ronda sigue mientras esto está abierto.',
    'The round waits for you.': 'La ronda te espera.', 'The match carries on while this is open.': 'La partida sigue mientras esto está abierto.',
    'The storm waits for you.': 'La tormenta te espera.',
    'Invite link copied. Friends open it and press Play in room to join.': 'Enlace copiado. Tus amigos lo abren y pulsan Jugar en la sala para entrar.',
    'Your browser needs a second before it gives the mouse back. Click Resume again.': 'Tu navegador necesita un segundo para devolverte el mouse. Haz clic en Seguir otra vez.',

    // ---- Creative tools ----
    'TOO': 'HERRA', 'LS': 'MIENTAS', 'Your four slots · pick one, then what goes in it': 'Tus cuatro casillas · elige una y luego qué va en ella',
    'Rarity': 'Rareza', 'Practice targets and bots': 'Blancos y bots de práctica', 'Add a target': 'Agregar un blanco',
    'Add a bot that fights': 'Agregar un bot que pelea', 'Clear them all': 'Quitar todos', 'Builds': 'Construcciones',
    'Clear my builds': 'Borrar mis construcciones', 'Clear every build': 'Borrar todas las construcciones', 'Moving': 'Moverse',
    'Fly: off': 'Volar: no', 'Fly: on': 'Volar: sí', 'Back to spawn': 'Volver al inicio',
    'That’s the most targets ({n}). Clear some first.': 'Ese es el máximo de blancos ({n}). Quita algunos primero.',
    'A target stands 6 m in front of you.': 'Hay un blanco 6 m delante de ti.',
    'That’s the most sparring bots ({n}). Clear them first.': 'Ese es el máximo de bots de práctica ({n}). Quítalos primero.',
    'A bot that fights back is 14 m in front of you. It comes back 3 s after a knockout.': 'Hay un bot que se defiende 14 m delante de ti. Vuelve 3 s después de quedar fuera.',
    'Targets and bots cleared.': 'Blancos y bots quitados.', 'Your builds are gone.': 'Tus construcciones ya no están.', 'Every build is gone.': 'Ya no queda ninguna construcción.',

    // ---- results ----
    'Match over': 'Fin de la partida', 'Knockouts': 'KO', 'Damage': 'Daño', 'Survived': 'Sobreviviste', 'Next match': 'Próxima partida',
    'Watch': 'Mirar', 'Menu': 'Menú', 'MATCH OVER': 'FIN DE LA PARTIDA', 'VICTORY': 'VICTORIA', 'Knocked out': 'Fuera de combate',
    'Practice · Match over': 'Práctica · Fin de la partida', 'Practice · Knocked out': 'Práctica · Fuera de combate',
    'Rounds won': 'Rondas ganadas', 'Back to the lobby': 'Volver a la sala',
    'BOT': 'BOT', 'round': 'ronda', 'rounds': 'rondas',
    'Could not reach the game server. Check your connection, or play Practice.': 'No se pudo conectar con el servidor del juego. Revisa tu conexión o juega Práctica.',
    'Sign-in failed': 'No se pudo iniciar sesión', 'Connecting…': 'Conectando…', 'Finding a room…': 'Buscando una sala…',
    'That room is full ({n} players). Pick another code.': 'Esa sala está llena ({n} jugadores). Elige otro código.',

    // ---- controls panel (Change keys): Driftfall's own actions ----
    'Move forward': 'Avanzar', 'Move back': 'Retroceder', 'Move left': 'Ir a la izquierda', 'Move right': 'Ir a la derecha',
    'Jump, drop, open the glider': 'Saltar, tirarte, abrir el planeador', 'Shoot / place build / use': 'Disparar / colocar / usar',
    'Aim / scope': 'Apuntar / mira', 'Hold. Aim keys on the keyboard also leave build mode': 'Mantén. Las teclas de apuntar también salen del modo construcción',
    'Slot 1': 'Casilla 1', 'Slot 2': 'Casilla 2', 'Slot 3': 'Casilla 3', 'Slot 4': 'Casilla 4',
    'The mouse wheel goes through the slots too': 'La rueda del mouse también pasa por las casillas',
    'Crowbar (gather scrap)': 'Palanca (juntar chatarra)', 'Open chest / pick up / swap': 'Abrir cofre / recoger / cambiar',
    'Build mode on / off': 'Modo construcción sí / no', 'Shows the build pieces. A piece\'s own key also starts building': 'Muestra las piezas. La tecla de cada pieza también empieza a construir',
    'Build a wall': 'Construir una pared', 'Build a floor': 'Construir un piso', 'Build a ramp': 'Construir una rampa',
    'Edit a build of yours': 'Editar una construcción tuya', 'Fly on / off': 'Volar sí / no',
    'Creative only. Tapping Jump twice does it too; while flying, Jump goes up': 'Solo en Creativo. Tocar Saltar dos veces también sirve; volando, Saltar sube',
    'Fly down': 'Bajar volando', 'Creative, while flying': 'Creativo, mientras vuelas', 'Loadout, practice targets, clearing builds': 'Equipo, blancos de práctica, borrar construcciones',
    'Creative only': 'Solo en Creativo', 'Look up': 'Mirar arriba', 'Look down': 'Mirar abajo', 'Look left': 'Mirar a la izquierda', 'Look right': 'Mirar a la derecha',
    'Pause, menu and invite link': 'Pausa, menú y enlace de invitación', 'When out': 'Si quedas fuera', 'Look, if the mouse can’t be locked': 'Mirar, si no se puede fijar el mouse',
    'Move': 'Moverse', 'Fight': 'Pelear', 'Build': 'Construir', 'Match': 'Partida'
  };

  // ---- items: weapons, heals, ammo, rarity (gendered in Spanish, so a weapon's rarity is written out for each) ----
  var W = [ // English name, Spanish name, feminine?
    ['Pistol', 'Pistola', 1], ['Heavy Pistol', 'Pistola pesada', 1], ['SMG', 'Subfusil', 0], ['Drum SMG', 'Subfusil de tambor', 0],
    ['Pump Shotgun', 'Escopeta de bombeo', 1], ['Auto Shotgun', 'Escopeta automática', 1], ['AR', 'Rifle', 0], ['Heavy AR', 'Rifle pesado', 0],
    ['Bolt Sniper', 'Sniper de cerrojo', 0], ['Scout Sniper', 'Sniper ligero', 0]
  ];
  var R = [['Common', 'común', 'común'], ['Uncommon', 'poco común', 'poco común'], ['Rare', 'raro', 'rara'], ['Epic', 'épico', 'épica'], ['Legendary', 'legendario', 'legendaria']];
  W.forEach(function (w) { d[w[0]] = w[1]; R.forEach(function (r) { d[r[0] + ' ' + w[0]] = w[1] + ' ' + r[w[2] ? 2 : 1]; }); });
  ['Common', 'Común', 'Uncommon', 'Poco común', 'Rare', 'Raro', 'Epic', 'Épico', 'Legendary', 'Legendario'].forEach(function (x, i, a) { if (i % 2 === 0) d[x] = a[i + 1]; });
  var more = {
    'Shotgun': 'Escopeta', 'Shotgun (tight)': 'Escop.', 'SMG (tight)': 'Subfus.', 'Sniper': 'Sniper', 'Crowbar': 'Palanca', 'Bar': 'Barra',
    'Bandage': 'Venda', 'Band.': 'Venda', 'Medkit': 'Botiquín', 'Shield Fizz': 'Gaseosa escudo', 'Fizz': 'Gaseosa', 'Sh. Fizz': 'Gaseosa',
    'Shield Jug': 'Bidón escudo', 'Jug': 'Bidón', 'Sh. Jug': 'Bidón',
    'Light ammo': 'Munición liviana', 'Rifle ammo': 'Munición de rifle', 'Shells': 'Cartuchos', 'Heavy ammo': 'Munición pesada',
    'Scrap': 'Chatarra', 'Item': 'Objeto', 'Empty': 'Vacía', 'Wall': 'Pared', 'Floor': 'Piso', 'Ramp': 'Rampa', 'Target': 'Blanco'
  };
  for (var k in more) d[k] = more[k];

  // ---- the Locker (captains only for now): tabs, cards, item names ----
  var lk = {
    'Outfits': 'Trajes', 'Locker': 'Casillero', 'OUT': 'TRA', 'FITS': 'JES', 'Wearing: {n}': 'Llevas: {n}',
    'Pick what you wear. Every outfit is the same size and just as easy to hit as the standard one.': 'Elige qué te pones. Todos los trajes tienen el mismo tamaño y son igual de fáciles de acertar que el estándar.',
    'Turkey Week: everyone wears the pilgrim hat until {d}. Each outfit’s own headwear comes back after.': 'Semana del Pavo: todos llevan el sombrero de peregrino hasta el {d}. Después vuelve el gorro de cada traje.',
    'Backpacks': 'Mochilas', 'Emotes': 'Gestos', 'Victory': 'Victoria', 'Gliders': 'Planeadores', 'Trails': 'Estelas', 'Gun skins': 'Pinturas', 'Locker sections': 'Secciones del casillero',
    'BACK': 'MOCHI', 'PACKS': 'LAS', 'EMO': 'GES', 'TES': 'TOS', 'VIC': 'VIC', 'TORY': 'TORIA', 'GLI': 'VUE', 'DERS': 'LO', 'TRA': 'ESTE', 'ILS': 'LAS',
    'GUN': 'TUS', 'SKINS': 'ARMAS', 'BUI': 'PIE', 'LDS': 'ZAS',
    'Pick how you glide down. Every glider is held its own way, but you are the same size and fall at the same speed.': 'Elige cómo bajas planeando. Cada planeador se sostiene a su manera, pero tienes el mismo tamaño y caes a la misma velocidad.',
    'A trail follows you while you skydive and glide. It never hides anyone: it fades out close to the camera.': 'Una estela te sigue mientras caes y planeas. Nunca tapa a nadie: se desvanece cerca de la cámara.',
    'Pick the emote to play in a match: T on a keyboard, the Emote button on a touch screen. Standing still only; moving stops it.': 'Elige el gesto para hacer en una partida: T en el teclado o el botón Gesto en una pantalla táctil. Solo quieto; si te mueves, se corta.',
    'Pick what you do when you win: everyone watching you sees it.': 'Elige qué haces cuando ganas: todos los que te miran lo ven.',
    'A backpack goes on over any outfit. It keeps your colour on it, so you can still be told apart.': 'La mochila va sobre cualquier traje. Lleva tu color, así se te sigue reconociendo.',
    'Your weapons in a pattern. The orange tip, the muzzle flash, the rarity band and the crosshair stay the same.': 'Tus armas con un diseño. La punta naranja, el fogonazo, la franja de rareza y la mira no cambian.',
    'What your walls, floors and ramps look like to everyone. They are just as strong, and just as hard to see through.': 'Cómo ven todos tus paredes, pisos y rampas. Son igual de fuertes e igual de difíciles de ver a través.',
    'None': 'Ninguno', 'Standard': 'Estándar', 'No skin': 'Sin pintura', 'No trail': 'Sin estela', 'Plywood': 'Madera', 'Outfit\'s own': 'La del traje',
    'The outfit\'s own': 'La del traje', 'No victory pose': 'Sin pose de victoria', 'Standard glider': 'Planeador estándar', 'EMOTE': 'GESTO',
    // outfits
    'Pilgrim': 'Peregrino', 'Turkey Person': 'Persona pavo', 'Noob': 'Novato', 'Feathercap': 'Gorro de pluma', 'Pilot': 'Piloto', 'Golden': 'Dorado',
    'Fishface': 'Cara de pez', 'Army Soldier': 'Soldado', 'Airline Pilot': 'Piloto de avión', 'Soccer Player (Red/Blue)': 'Futbolista (rojo y azul)',
    'Soccer Player (All Red)': 'Futbolista (todo rojo)', 'Clown': 'Payaso', 'Hooded Jacket': 'Campera con capucha', 'Racing Suit': 'Traje de carreras',
    'Overalls': 'Overol', 'Toy Knight': 'Caballero de juguete', 'Space Suit': 'Traje espacial', 'Raincoat': 'Impermeable', 'Chef': 'Chef', 'Diver': 'Buzo',
    'Robot': 'Robot', 'Varsity Jacket': 'Campera universitaria', 'Builder': 'Constructor', 'Wizard': 'Mago', 'Jet Pilot': 'Piloto de jet',
    'Lumberjack': 'Leñador', 'Park Ranger': 'Guardaparques', 'Scuba Diver': 'Submarinista', 'Head Chef': 'Jefe de cocina', 'Hazmat Suit': 'Traje de protección',
    'Castle Knight': 'Caballero del castillo', 'Astronaut': 'Astronauta', 'Farmer': 'Granjero', 'Mail Carrier': 'Cartero', 'Lifeguard': 'Guardavidas',
    'Ninja': 'Ninja', 'Scarecrow': 'Espantapájaros', 'Skeleton': 'Esqueleto', 'Banana Suit': 'Traje de banana', 'Cardboard Box Robot': 'Robot de caja de cartón',
    // wave two outfits
    'Goalkeeper': 'Arquero', 'Basketball Player': 'Basquetbolista', 'Linebacker': 'Apoyador', 'Baseball Batter': 'Bateador', 'Hockey Player': 'Jugador de hockey',
    'Tennis Pro': 'Tenista', 'Boxer': 'Boxeador', 'Cyclist': 'Ciclista', 'Swim Team': 'Equipo de natación', 'Golfer': 'Golfista',
    'Skateboarder': 'Skater', 'Surfer': 'Surfista', 'Skier': 'Esquiador', 'Pit Crew': 'Mecánico de boxes', 'Referee': 'Árbitro',
    'Coach': 'Entrenador', 'Team Mascot': 'Mascota del equipo', 'Fencer': 'Esgrimista', 'Karate': 'Karateca', 'Cheer Captain': 'Capitana de porristas',
    'Jockey': 'Jockey',
    'Pirate Captain': 'Capitán pirata', 'Pirate Deckhand': 'Grumete pirata', 'Pirate First Mate': 'Segundo de a bordo', 'Ghost Pirate': 'Pirata fantasma', 'Pinstripe Suit': 'Traje a rayas',
    'The Boss': 'El Jefe', 'Tracksuit and Chain': 'Chándal y cadena', 'Bodyguard': 'Guardaespaldas', 'White Tuxedo': 'Esmoquin blanco', 'Business Suit': 'Traje de oficina',
    'Secret Agent': 'Agente secreto', 'Detective': 'Detective', 'Android': 'Androide', 'Mech Pilot': 'Piloto de robot gigante', 'Junkyard Bot': 'Robot de chatarra',
    'Vacuum Bot': 'Robot aspiradora', 'Firefighter': 'Bombero', 'Rock Star': 'Estrella de rock', 'DJ': 'DJ', 'Superhero': 'Superhéroe',
    'Masked Wrestler': 'Luchador enmascarado', 'Samurai Armour': 'Armadura de samurái',
    // gliders
    'Umbrella': 'Paraguas', 'Paper Airplane': 'Avión de papel', 'Hang Glider': 'Ala delta', 'Kite': 'Barrilete', 'Bedsheet Parachute': 'Paracaídas de sábana',
    'Trash Bag Parachute': 'Paracaídas de bolsa', 'Cardboard Wings': 'Alas de cartón', 'Dragon Wings': 'Alas de dragón', 'Bat Wings': 'Alas de murciélago',
    'Bunch of Balloons': 'Racimo de globos', 'Lawn Chair with Balloons': 'Silla con globos', 'Magic Carpet': 'Alfombra mágica', 'Picnic Blanket': 'Mantel de pícnic',
    'Surfboard': 'Tabla de surf', 'Pizza Slice': 'Porción de pizza', 'Broomstick': 'Escoba', 'Giant Leaf': 'Hoja gigante', 'Spinning Maple Seed': 'Semilla de arce',
    'Rubber Duck Float': 'Patito inflable', 'Giant Pigeon': 'Paloma gigante', 'Pterodactyl': 'Pterodáctilo', 'Flying Squirrel Suit': 'Traje de ardilla voladora',
    'UFO Disc': 'Platillo volador', 'Small Cloud': 'Nubecita',
    // trails
    'Smoke': 'Humo', 'Sparkles': 'Destellos', 'Rainbow': 'Arcoíris', 'Feathers': 'Plumas', 'Leaves': 'Hojas', 'Bubbles': 'Burbujas',
    // gun skins
    'Gold': 'Oro', 'Chrome': 'Cromo', 'Wood Grain': 'Madera veteada', 'Forest Camo': 'Camuflaje de bosque', 'Desert Camo': 'Camuflaje de desierto',
    'Arctic Camo': 'Camuflaje ártico', 'Pixel Camo': 'Camuflaje pixelado', 'Neon Outline': 'Contorno neón', 'Toy Blaster': 'Pistola de juguete', 'Cardboard': 'Cartón',
    'Candy Cane': 'Bastón de caramelo', 'Lava': 'Lava', 'Ice': 'Hielo', 'Galaxy': 'Galaxia', 'Rust': 'Óxido', 'Graffiti': 'Grafiti', 'Bubblegum Pink': 'Rosa chicle',
    'Hazard Stripes': 'Rayas de peligro', 'Plastic Brick': 'Ladrillo de plástico',
    // build skins
    'Frosted Glass': 'Vidrio esmerilado', 'Candy': 'Caramelo', 'Stone': 'Piedra', 'Scrap Metal': 'Chapa vieja',
    // backpacks
    'Rucksack': 'Mochila de campamento', 'Jetpack': 'Mochila cohete', 'Teddy Bear': 'Osito de peluche', 'Tortoise Shell': 'Caparazón de tortuga',
    'Treasure Chest': 'Cofre del tesoro', 'Lunchbox': 'Lonchera', 'Guitar Case': 'Estuche de guitarra', 'Fishbowl': 'Pecera',
    // emotes and victory poses
    'Wave': 'Saludo', 'Dance': 'Baile', 'Clap': 'Aplauso', 'Jumping Jacks': 'Saltos de tijera', 'Twirl': 'Giro', 'Champion': 'Campeón', 'Flex': 'Músculos',
    'Take a Bow': 'Reverencia', 'Jump for Joy': 'Salto de alegría',
    // wave two extras
    'Sports Bag': 'Bolso deportivo', 'Briefcase': 'Maletín', 'Robot Power Pack': 'Batería de robot', 'Bag of Balls': 'Bolsa de pelotas',
    'Spyglass and Map': 'Catalejo y mapa', 'Lucky Mascot': 'Mascota de la suerte', 'Pirate Sail': 'Vela pirata', 'Giant Football': 'Pelota de fútbol americano gigante',
    'Soccer Goal': 'Arco de fútbol', 'Hockey Stick': 'Palo de hockey', 'Robot Rotor': 'Rotor de robot', 'Briefcase Parachute': 'Paracaídas de maletín',
    'Team Stripes': 'Rayas de equipo', 'Pinstripe': 'Raya diplomática', 'Treasure Map': 'Mapa del tesoro', 'Circuit Board': 'Placa de circuitos',
    'Basketball': 'Pelota de básquet', 'Goal Celebration': 'Festejo de gol', 'Tip the Hat': 'Saludo con el sombrero', 'Pirate Arr': '¡Arrr pirata!',
    'Power Down': 'Apagón'
  };
  for (var k2 in lk) d[k2] = lk[k2];

  // ---- words only put together in code (T() in index.html): the HUD, banners, kill feed, and lines with names in them.
  // Kept out of lang.js's page-wide list, so their {patterns} never touch anything else on the page. ----
  var code = {
    'Practice': 'Práctica', 'Done': 'Listo', 'Room {c}': 'Sala {c}', 'Blue': 'Azul', 'Orange': 'Naranja',
    ' The host picks the mode.': ' El anfitrión elige el modo.',
    '1 person here has an older copy of the game and will sit this out until they reload. ': '1 persona tiene una versión vieja del juego y no jugará hasta que recargue. ',
    '{n} people here have an older copy of the game and will sit this out until they reload. ': '{n} personas tienen una versión vieja del juego y no jugarán hasta que recarguen. ',
    'Teams of {n} in the order people joined; bots fill the teams, and make up bot teams if there are few of you.': 'Equipos de {n} en el orden en que entraron; los bots completan los equipos y forman equipos de bots si son pocos.',
    'Teams of {n} in the order people joined. No bots: people only.': 'Equipos de {n} en el orden en que entraron. Sin bots: solo personas.',
    '{m} is on. You’ll be in the next match.': '{m} está en curso. Jugarás en la próxima partida.',
    '{m} needs two teams: more people, or bots.': '{m} necesita dos equipos: más personas o bots.',
    'Waiting for the host to start {m}.': 'Esperando a que el anfitrión empiece {m}.',
    'Box Fights is on: round {r}, Blue {a} – {b} Orange. You’ll join at the next round if there’s room.': 'Box Fights está en curso: ronda {r}, Azul {a} – {b} Naranja. Entrarás en la próxima ronda si hay lugar.',
    'Zone Wars is on: round {r}. You’ll join at the next round.': 'Zone Wars está en curso: ronda {r}. Entrarás en la próxima ronda.',
    'Team {t} ({names}) was the last team standing.': 'El equipo {t} ({names}) fue el último en pie.',
    '{n} was the last one standing.': '{n} fue el último en pie.',
    'Last team standing out of {n}.': 'Último equipo en pie de {n}.', 'Last one standing out of {n}.': 'Último en pie de {n}.',
    '{p}{s} of {n}': 'Puesto {p} de {n}', ' · {n} got you': ' · te sacó {n}', ' · the storm got you': ' · te atrapó la tormenta',
    'DRAW': 'EMPATE', 'DEFEAT': 'DERROTA', '{t} WINS': '¡GANA {t}!', '{n} WINS': '¡GANA {n}!', 'BLUE': 'AZUL', 'ORANGE': 'NARANJA',
    'Blue {a} – {b} Orange · first to {n}': 'Azul {a} – {b} Naranja · gana con {n}', ' (bot)': ' (bot)',
    'First to {n} round wins': 'Gana quien llegue a {n} rondas',
    '{n} target': '{n} blanco', '{n} targets': '{n} blancos', '{n} bot': '{n} bot', '{n} bots': '{n} bots',
    'You were invited to room dz-{c}. Press Play in room to join.': 'Te invitaron a la sala dz-{c}. Pulsa Jugar en la sala para entrar.',
    // the HUD and the kill feed
    'Storm': 'Tormenta', 'left': 'quedan', 'here': 'aquí', 'team': 'equipo', 'teams': 'equipos', 'reload': 'recarga',
    'Wall': 'Pared', 'Floor': 'Piso', 'Ramp': 'Rampa', 'wall': 'pared', 'floor': 'piso', 'ramp': 'rampa', 'Build': 'Construir', 'Scrap': 'Chatarra', 'Empty': 'Vacía',
    'JUMP': 'SALTO', 'NEXT ▸': 'SIGUIENTE ▸', 'FLY': 'VOLAR', 'DOWN (fly)': 'BAJAR', 'DOWN': 'CAÍDO', 'OPEN': 'ABRIR', 'TAKE': 'TOMAR', 'SWAP': 'CAMBIO', 'REVIVE': 'REVIVIR',
    'TILE': 'MARCAR', 'PLACE': 'PONER', 'USE': 'USAR', 'HIT': 'GOLPE', 'FIRE': 'FUEGO', 'DONE': 'LISTO', 'EDIT': 'EDITAR', 'RESET': 'BORRAR', 'RELOAD': 'RECARGA',
    'CANCEL': 'SALIR', 'AIM': 'MIRA', 'Pause': 'Pausa', 'Map': 'Mapa', 'N NE E SE S SW W NW': 'N NE E SE S SO O NO',
    'Boarding · {n}': 'Embarque · {n}', 'Closing · {t}': 'Se cierra · {t}', 'Closing {t}': 'Se cierra {t}', 'Storm closing · {t}': 'Se cierra · {t}',
    'Storm in {t}': 'Tormenta en {t}', 'Storm moves in {t}': 'Tormenta en {t}', 'Final storm': 'Tormenta final', 'Round clock {t}': 'Reloj de la ronda {t}',
    'Round over': 'Fin de la ronda', 'Get ready': 'Prepárate',
    'STORM CLOSING': 'LA TORMENTA SE CIERRA', 'Follow the marker on the compass to the safe zone': 'Sigue la marca de la brújula hasta la zona segura',
    'You\'re inside the next circle': 'Estás dentro del próximo círculo', 'IN THE STORM': 'EN LA TORMENTA',
    '−{d} health a second · safe zone {m} m': '−{d} de vida por segundo · zona segura a {m} m', 'STORM MOVES IN {t}': 'LA TORMENTA AVANZA EN {t}', 'safe zone {m} m': 'zona segura a {m} m',
    'Build · {b}': 'Construir · {b}', ' · needs {n} scrap': ' · hacen falta {n} de chatarra', ' · hold Place': ' · mantén Poner', ' · hold to place': ' · mantén para colocar',
    'Picking up {n}': 'Levantando a {n}', 'Using {n}': 'Usando {n}', 'Down · {n} left · crawl to a team-mate': 'Caído · {n} de vida · ve hacia un compañero',
    'Hold to pick up {n}': 'Mantén para levantar a {n}', 'Open chest': 'Abrir cofre', 'Take {x}': 'Tomar {x}', 'Swap for {x}': 'Cambiar por {x}',
    'Hold to edit': 'Mantén para editar', 'Edit': 'Editar', 'Fire': 'Disparar', 'Aim': 'Apuntar', 'Reload': 'Recargar', 'click': 'clic', 'Click': 'clic',
    'Watching {n}': 'Mirando a {n}', ' · tap Next': ' · toca Siguiente', ' · click for the next': ' · clic para el siguiente',
    'Watching · you\'ll drop in the next match': 'Mirando · saltarás en la próxima partida', 'Watching · you\'ll join at the next round': 'Mirando · entrarás en la próxima ronda',
    'Red light · green over the island in {n}': 'Luz roja · verde sobre la isla en {n}', 'Green light · {k} · auto-drop in {n}': 'Luz verde · {k} · caída automática en {n}',
    'tap Jump': 'toca Salto', '{k} to jump': '{k} para saltar', '{k} opens the glider': '{k} abre el planeador', 'Jump': 'Salto', 'Click to play': 'Haz clic para jugar',
    'Whole': 'Entera', 'Door': 'Puerta', 'Wide door': 'Puerta ancha', 'Tall door': 'Puerta alta', 'Side gap': 'Hueco lateral', 'Arch': 'Arco', 'Window': 'Ventana',
    'Wide window': 'Ventana ancha', 'Half wall': 'Media pared', 'Low wall': 'Pared baja', 'Gap underneath': 'Hueco abajo', 'High wall': 'Pared alta', 'Gone': 'Sin pared',
    'Windows': 'Ventanas', '{n} tiles open': '{n} casillas abiertas', 'Hole': 'Agujero', 'Corner': 'Esquina', 'Half floor': 'Medio piso', 'Two holes': 'Dos agujeros',
    'Top half': 'Mitad de arriba', 'Bottom half': 'Mitad de abajo', 'Narrow ramp': 'Rampa angosta', 'Ramp with a gap': 'Rampa con hueco', 'Ramp corner': 'Rampa en esquina', 'Two gaps': 'Dos huecos',
    '{s} · drag over the tiles · let go of Edit': '{s} · pasa por las casillas · suelta Editar',
    'Keep holding Edit and drag a finger over the tiles you want open, then let go of Edit. Reset makes it whole.': 'Sigue manteniendo Editar y pasa un dedo por las casillas que quieras abrir; luego suelta Editar. Borrar la deja entera.',
    '{s} · tap tiles · Done · Reset': '{s} · toca casillas · Listo · Borrar',
    'Tap the tiles you want open (or aim and press Tile), then Done. Reset makes it whole, Cancel leaves it.': 'Toca las casillas que quieras abrir (o apunta y pulsa Marcar) y luego Listo. Borrar la deja entera, Salir la deja como estaba.',
    '{s} · sweep the tiles · let go of {e} · {r} reset': '{s} · pasa por las casillas · suelta {e} · {r} la deja entera',
    'Keep holding {e} and look across the tiles you want open, then let go to confirm. {r} resets it to whole.': 'Sigue manteniendo {e} y mira las casillas que quieras abrir; luego suelta para confirmar. {r} la deja entera.',
    '{s} · {f} tiles · {e} done · {r} reset · {a} cancel': '{s} · {f} casillas · {e} listo · {r} entera · {a} salir',
    '{F} the tiles you want open (hold and sweep for several), then {e} to confirm. {r} resets it to whole, {a} cancels.': 'Con {F}, marca las casillas que quieras abrir (mantén y pasa por varias); luego {e} para confirmar. {r} la deja entera, {a} cancela.',
    'Aim at a build of yours, up close': 'Apunta de cerca a una construcción tuya', 'That build is someone else’s': 'Esa construcción es de otra persona',
    'Leave at least one tile': 'Deja al menos una casilla', 'Someone is standing in the way': 'Hay alguien en el medio',
    '+{n} scrap': '+{n} de chatarra', '{n} DOWN': '¡{n} QUEDÓ FUERA!', 'Someone': 'Alguien', 'someone': 'alguien', '{n} knockout': '{n} KO', '{n} knockouts': '{n} KO',
    'You': 'Tú', ' · storm': ' · tormenta', ' · fell': ' · caída', ' · down': ' · caído', 'JUMP!': '¡SALTA!', 'Steer with {k}': 'Dirige con {k}', 'the stick': 'la palanca', 'WASD': 'WASD',
    'KNOCKED OUT': 'FUERA DE COMBATE', '{n} got you': 'Te sacó {n}', 'The storm got you': 'Te atrapó la tormenta', ' · watch your team': ' · mira a tu equipo',
    'WHEELS UP': '¡DESPEGUE!', 'with {n}': 'con {n}', ' and ': ' y ', 'on your own': 'solo', ' · jump on the green light': ' · salta con la luz verde',
    'Practice · you and {n} bots · jump on the green light': 'Práctica · tú y {n} bots · salta con la luz verde', '{n} players · jump on the green light': '{n} jugadores · salta con la luz verde',
    'WATCHING': 'MIRANDO', 'You\'ll drop in the next match': 'Saltarás en la próxima partida', 'You knocked {n} down': 'Derribaste a {n}',
    'You picked up {b}': 'Levantaste a {b}', '{a} picked up you': '{a} te levantó', '{a} picked up {b}': '{a} levantó a {b}',
    'YOU’RE DOWN': 'TE DERRIBARON', 'Crawl to cover · a team-mate can pick you up': 'Arrástrate a cubierto · un compañero puede levantarte',
    'Crawl to cover · a team-mate holds {k} to pick you up': 'Arrástrate a cubierto · un compañero mantiene {k} para levantarte', 'BACK UP': '¡DE PIE!',
    '{n} joined': '{n} entró', '{n} left': '{n} salió', 'Last team standing': 'Último equipo en pie', 'TEAM {n} WINS': '¡GANA EL EQUIPO {n}!', 'Nobody made it': 'Nadie sobrevivió',
    'Last one standing': 'Último en pie', 'CREATIVE': 'CREATIVO', 'Tap FLY to fly · Creative tools are in the pause menu': 'Toca VOLAR para volar · Las herramientas de Creativo están en el menú de pausa',
    '{a} or Jump twice to fly · {b} tools · {c} back to spawn': '{a} o Saltar dos veces para volar · {b} herramientas · {c} volver al inicio',
    'ROUND {n}': 'RONDA {n}', 'You’re {t}': 'Eres {t}', 'Last one standing · first to {n} round wins': 'Último en pie · gana quien llegue a {n} rondas',
    'Flying · JUMP goes up, DOWN goes down': 'Volando · SALTO sube, BAJAR baja', 'Flying · {a} up, {b} down': 'Volando · {a} sube, {b} baja', 'Flying off': 'Ya no vuelas',
    'Back at the spawn pad': 'De vuelta en el punto de inicio', 'BACK IN': '¡DE VUELTA!', 'back in 3 s': 'vuelves en 3 s', 'Out': 'Fuera',
    'watch your team': 'mira a tu equipo', 'next round soon': 'pronto la próxima ronda', 'FIGHT!': '¡A PELEAR!',
    'Blue {a} – {b} Orange': 'Azul {a} – {b} Naranja', '{n} TAKES IT': '¡{n} SE LLEVA LA RONDA!', ' · next round in 3 s': ' · próxima ronda en 3 s',
    'Nobody takes the round · {s}': 'Nadie gana la ronda · {s}', 'YOU TAKE IT': '¡GANASTE LA RONDA!', 'Round {n}': 'Ronda {n}', 'You {a} · first to {n}': 'Tú {a} · gana con {n}',
    'NOBODY LEFT': 'NO QUEDA NADIE', 'No round win · next round soon': 'Nadie gana la ronda · pronto la próxima',
    'You\'re the host now': 'Ahora eres el anfitrión', '{n} is the host now': 'Ahora {n} es el anfitrión',
    '{a} fly · {b} tools · {c} spawn · {n} here': '{a} volar · {b} herramientas · {c} inicio · {n} aquí', 'Round {r} · first to {n}': 'Ronda {r} · gana con {n}',
    ' · you’re {t}': ' · eres {t}', 'first to {n} · you {m}': 'gana con {n} · tú {m}',
    'Wearing: {n}': 'Llevas: {n}'
  };
  window.BackRoomLang.add(d);
  var all = {};
  for (k in d) all[k] = d[k];
  for (k in code) all[k] = code[k];
  window.DriftfallES = all;   // T()'s quick lookup by the exact English, in index.html
})();
