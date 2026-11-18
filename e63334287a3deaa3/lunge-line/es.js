// Lokop in Spanish (see README and /e63334287a3deaa3/lang.js). English → Spanish, our own words.
// The big pixel-font words drawn on the duel canvas (WINS, STAGE 2 OF 5, NEXT GAME) stay English: the pixel font has
// no accented letters. Arena names stay English (they read as names).
(function () {
  var L = window.BackRoomLang; if (!L) return;
  window.LOKOP_HOW_ES = function (touch) {
    return '<ul class="rules">' +
      '<li><b>¿Primera vez?</b> Pulsa <b>Práctica</b> en el menú para probar todos los movimientos solo.</li>' +
      '<li><b>Un toque gana el duelo.</b> La espada elimina todo lo que alcanza: estocada, embestida, o simplemente caminar o saltar contra la punta del rival.</li>' +
      '<li><b>Tres alturas de espada.</b> Arriba y abajo mueven tu espada entre baja, media y alta. A la misma altura que la del rival, las espadas se bloquean. Cruza tu espada por la suya y se la sacas de la mano. Cambia de altura justo contra su estocada para un <b>desvío</b>: un destello blanco y se tambalea.</li>' +
      '<li><b>Moverse.</b> Miras hacia donde pulsaste último, así que alejarte te pone de espaldas. Toca una dirección para un paso, mantenla para correr. Atacar corriendo es una embestida. Abajo mientras corres rueda bajo una espada media o alta (una baja te atrapa). Salta sobre la gente y empuja contra un borde para trepar. Si caes por un borde te agarras y quedas colgado: arriba o saltar te sube, abajo te suelta (mantén abajo al caer para pasar de largo).</li>' +
      '<li><b>Agacharse.</b> Mantén abajo (o púlsalo con la espada ya baja) para agacharte: esquivas espadas medias y altas y puedes avanzar despacio; suelta para pararte. Mantén abajo y ataca para una <b>patada barrida</b> (sin esperar a agacharte): lo tira al piso y su espada sale volando, pero una espada baja la frena.</li>' +
      '<li><b>Lanzar.</b> Pulsa arriba otra vez estando alto para levantar la espada, y ataca para lanzarla. Una espada alta bloquea un lanzamiento; agacharse o rodar lo esquiva.</li>' +
      '<li><b>¿Sin espada?</b> Golpea, patea o haz una patada en el aire (atacar saltando) para derribar a alguien, y ataca otra vez para terminar. Una guardia alta frena las patadas en el aire. Agáchate sobre una espada caída para recogerla.</li>' +
      '<li><b>Las etapas.</b> Cada etapa es un tramo largo que puedes recorrer en los dos sentidos, y la cámara sigue la pelea. Hasta que alguien gane un duelo no pueden separarse más de una pantalla. Gana uno y solo tú puedes correr hacia tu lado (Tide corre a la derecha, Bloom a la izquierda); el perdedor vuelve enseguida, delante de ti, y si queda atrás de la pantalla también vuelve delante. Los bloques de arriba son las etapas: la tuya está encendida y una marca muestra dónde está la pelea. La última etapa termina en un pozo: salta adentro mientras tienes el paso y ganas. Quien caiga en otro pozo o hueco queda fuera hasta que vuelve.</li>' +
      (touch ? '<li><b>En pantalla táctil:</b> las flechas de la izquierda mueven. A la derecha: ▲ y ▼ suben y bajan la espada (mantén ▼ para agacharte; también rueda al correr y recoge espadas), la flecha salta y la espada ataca.</li>' : '') +
      '</ul>';
  };
  L.add({
    '‹ Back': '‹ Volver', '‹ Leave': '‹ Salir', 'Pause': 'Pausa', 'Pause (P)': 'Pausa (P)', 'Sound on': 'Sonido encendido', 'Sound off': 'Sonido apagado', 'Sound (M)': 'Sonido (M)',
    'Change keys': 'Cambiar teclas', 'How to play': 'Cómo jugar', 'The duel': 'El duelo', 'Practice moves': 'Movimientos de práctica', 'Practice': 'Práctica', 'Dummy': 'Muñeco',
    'Off': 'No', 'Stands still': 'Quieto', 'Fights back': 'Pelea', 'slowly': 'despacio', 'Left': 'Izquierda', 'Right': 'Derecha', 'Sword up': 'Espada arriba', 'Jump': 'Saltar',
    'Sword down, duck, roll': 'Espada abajo, agacharse, rodar', 'Attack': 'Atacar',
    'One-touch sword tug-of-war': 'Duelo de espadas a un toque', '1 to 8 players': 'De 1 a 8 jugadores',
    'One touch of the blade wins the duel. Win it and only you may run for your end of the line, while your rival comes back in front of you, again and again. Reach the pit at the very end and jump in to win.': 'Un toque de espada gana el duelo. Si lo ganas, solo tú puedes correr hacia tu lado, mientras tu rival reaparece delante de ti una y otra vez. Llega al pozo del final y salta adentro para ganar.',
    'Your name': 'Tu nombre', 'Player': 'Jugador', 'Vs bot': 'Contra bot', 'Duel a bot on this device': 'Duelo contra un bot en este dispositivo',
    'Duel an easy bot on this device': 'Duelo contra un bot fácil', 'Duel a normal bot on this device': 'Duelo contra un bot normal', 'Duel a hard bot on this device': 'Duelo contra un bot difícil', 'Duel an expert bot on this device': 'Duelo contra un bot experto',
    'On your own: try every move': 'Solo: prueba cada movimiento', 'Quick match': 'Partida rápida', 'Online 1v1 in a public room': '1 contra 1 online en sala pública',
    'Local 2 players': '2 jugadores locales', 'Two on one keyboard (or two gamepads)': 'Dos en un teclado (o dos mandos)', 'Two players need a keyboard or two gamepads': 'Dos jugadores necesitan teclado o dos mandos',
    'Tournament': 'Torneo', '3 to 8 players, knockout bracket': 'De 3 a 8 jugadores, eliminación directa', 'Bot': 'Bot', 'Bot level': 'Nivel del bot', 'Easy': 'Fácil', 'Normal': 'Normal',
    'Hard': 'Difícil', 'Expert': 'Experto', 'Room code': 'Código de sala', 'Play in room': 'Jugar en sala',
    'Make up a room code and send friends the invite link, or leave it blank for a random one. A third person in a room watches.': 'Inventa un código de sala y manda la invitación, o déjalo vacío para uno al azar. Una tercera persona en la sala mira.',
    'Match': 'Partida', 'Arena': 'Arena', 'Random': 'Al azar', 'Length': 'Largo', '3 stages': '3 etapas', '5 stages': '5 etapas', '7 stages': '7 etapas', 'Rules': 'Reglas',
    'Sword throwing': 'Lanzar espadas', 'Low gravity': 'Gravedad baja', 'Bouncing throws': 'Lanzamientos con rebote', 'Turbo': 'Turbo',
    'Online wins': 'Victorias online', 'Touches': 'Toques', 'Best streak': 'Mejor racha',
    'Made for the Back Room: characters, arenas, pixel art and music are all its own. ·': 'Hecho para el Back Room: personajes, arenas, pixel art y música son propios. ·', 'Privacy': 'Privacidad',
    'Rooftop stalls and a covered lane': 'Puestos en la azotea y un pasaje techado', 'Stone arches and low tunnels': 'Arcos de piedra y túneles bajos',
    'Steps, domes and a gap to jump': 'Escalones, cúpulas y un hueco para saltar', 'Freight cars and gantries at night': 'Vagones y grúas de noche',
    // lobby
    'Lobby': 'Sala', 'Tide · runs right': 'Tide · corre a la derecha', 'Bloom · runs left': 'Bloom · corre a la izquierda', 'Waiting…': 'Esperando…', 'Ready': 'Listo',
    'Not ready': 'No listo', 'Copy invite link': 'Copiar invitación', 'Leave': 'Salir', 'Public room': 'Sala pública', 'Room {r}': 'Sala {r}',
    'Watching: {n} (winner stays on; the loser swaps out).': 'Mirando: {n} (el ganador sigue; el perdedor cambia).',
    "You’re the host: {c}. Change it in the menu before you join.": 'Eres el anfitrión: {c}. Cámbialo en el menú antes de entrar.',
    'The Tide seat picks the arena and rules.': 'El lugar de Tide elige la arena y las reglas.',
    'Waiting for someone to join this public room…': 'Esperando a que alguien entre a esta sala pública…', 'Waiting for a friend. Send them the invite link.': 'Esperando a un amigo. Mándale la invitación.',
    'Two players are fencing; you’ll watch their next match.': 'Hay dos jugadores en duelo; mirarás su próxima partida.', 'Starting as soon as you’re both in…': 'Empieza en cuanto estén los dos…',
    'Press Ready when you’re set.': 'Pulsa Listo cuando estés preparado.', 'Waiting for someone to join this public room… Ping {p} ms.': 'Esperando a que alguien entre a esta sala pública… Ping {p} ms.',
    'Starting as soon as you’re both in… Ping {p} ms.': 'Empieza en cuanto estén los dos… Ping {p} ms.', 'Press Ready when you’re set. Ping {p} ms.': 'Pulsa Listo cuando estés preparado. Ping {p} ms.',
    'Two players are fencing; you’ll watch their next match. Ping {p} ms.': 'Hay dos jugadores en duelo; mirarás su próxima partida. Ping {p} ms.',
    'Waiting for {n}…': 'Esperando a {n}…', '{n} left the match.': '{n} dejó la partida.', 'Your opponent left the match.': 'Tu rival dejó la partida.',
    'Joining the match…': 'Entrando a la partida…', 'Catching up…': 'Sincronizando…', 'The players left.': 'Los jugadores se fueron.', 'Joining gd-{r}…': 'Entrando a gd-{r}…',
    'Invite link copied.': 'Invitación copiada.', 'Invite link: {u}': 'Invitación: {u}', 'You were invited to room gd-{c}. Press Play in room to join.': 'Te invitaron a la sala gd-{c}. Pulsa Jugar en sala para entrar.',
    // tournament
    'Knockout': 'Eliminación', '3 to 8 players': 'De 3 a 8 jugadores',
    "Everyone plays on this computer, two at a time: the first name in each match is Tide (player 1 keys), the second is Bloom (player 2 keys). Bots can fill places. Lose once and you're out.": 'Todos juegan en esta computadora, de a dos: el primer nombre de cada partida es Tide (teclas del jugador 1), el segundo es Bloom (teclas del jugador 2). Los bots pueden completar lugares. Si pierdes una vez, quedas fuera.',
    '+ Add a player': '+ Agregar jugador', 'Skip bot-vs-bot matches (decide them instantly)': 'Saltar partidas entre bots (se deciden al instante)', 'Draw the bracket': 'Sortear el cuadro',
    'Back': 'Volver', 'Bracket': 'Cuadro', 'Play next match': 'Jugar la próxima', 'End tournament': 'Terminar torneo', 'Name': 'Nombre', 'Player or bot': 'Jugador o bot', 'Person': 'Persona',
    'Bot: easy': 'Bot: fácil', 'Bot: normal': 'Bot: normal', 'Bot: hard': 'Bot: difícil', 'Bot: expert': 'Bot: experto', 'Remove': 'Quitar',
    'A tournament needs at least 3 players.': 'Un torneo necesita al menos 3 jugadores.', 'Final': 'Final', 'Semi-finals': 'Semifinales', '{n} (bot)': '{n} (bot)', 'bye': 'pasa directo',
    '{n} wins!': '¡Gana {n}!', 'Champion of the line. Start another from the menu.': 'Campeón de la línea. Empieza otro desde el menú.',
    // results, pause
    'Match over': 'Fin de la partida', 'Winner': 'Ganador', '{n} wins': 'Gana {n}', 'Dropped into the pit at the end of the line.': 'Saltó al pozo al final de la línea.',
    '{k} touch, best streak {b}': '{k} toque, mejor racha {b}', '{k} touches, best streak {b}': '{k} toques, mejor racha {b}', 'Next game': 'Siguiente juego', 'Next match': 'Siguiente partida',
    'Menu': 'Menú', 'Online duel': 'Duelo online', 'Watching': 'Mirando', 'Local duel': 'Duelo local',
    'Tap for the bracket.': 'Toca para ver el cuadro.', 'Press any key for the bracket.': 'Pulsa cualquier tecla para ver el cuadro.',
    'Tap for the next game (winner stays on).': 'Toca para el siguiente juego (el ganador sigue).', 'Press any key for the next game (winner stays on).': 'Pulsa cualquier tecla para el siguiente juego (el ganador sigue).',
    'Tap for the next game.': 'Toca para el siguiente juego.', 'Press any key for the next game.': 'Pulsa cualquier tecla para el siguiente juego.',
    'Paused': 'Pausa', 'Resume': 'Seguir', 'Quit match': 'Salir de la partida', 'The duel carries on while this is open.': 'El duelo sigue mientras esto está abierto.', 'Got it': 'Entendido',
    // keys and practice list
    'Player 1': 'Jugador 1', 'Player 2': 'Jugador 2', 'Move': 'Moverse', 'Sword up / down': 'Espada arriba / abajo',
    'Playing alone, both sets work at once: move with either hand and jump or attack with the other. Gamepads: stick or d-pad, A jumps, X or B attacks, Start pauses.': 'Jugando solo, los dos juegos de teclas sirven: muévete con una mano y salta o ataca con la otra. Mandos: palanca o cruceta, A salta, X o B atacan, Start pausa.',
    'Stab': 'Estocada', 'Lunge': 'Embestida', 'Crouch': 'Agacharse', 'Kick': 'Patada', 'Roll': 'Rodar', 'Dive kick': 'Patada aérea', 'Throw': 'Lanzar', 'Hang and climb': 'Colgarse y trepar',
    'run + blade': 'correr + espada', 'hold ▼': 'mantén ▼', 'hold ▼ + blade': 'mantén ▼ + espada', 'run + ▼': 'correr + ▼', 'jump + blade': 'saltar + espada', '▲▲ + blade': '▲▲ + espada',
    'drop by a ledge, ▲': 'cuélgate de un borde, ▲', 'blade': 'espada', 'jump': 'saltar',
    'run, then {k}': 'corre y luego {k}', 'hold {k}': 'mantén {k}', 'hold down, then {k}': 'mantén abajo y luego {k}', '{k} while running': '{k} mientras corres', '{k} in the air': '{k} en el aire',
    '{a} past high, then {b}': '{a} más allá de alto, luego {b}', 'drop by a ledge, then {k} or jump': 'cuélgate de un borde y luego {k} o salta',
    // keybinds panel
    'Player 1 (Tide), and you when playing alone': 'Jugador 1 (Tide), y tú cuando juegas solo', 'Player 2 (Bloom), and you when playing alone': 'Jugador 2 (Bloom), y tú cuando juegas solo',
    'Sword up (above high: ready to throw)': 'Espada arriba (más allá de alto: lista para lanzar)', 'Sword down, duck, roll, pick up': 'Espada abajo, agacharse, rodar, recoger',
    'Game': 'Juego', 'Sound on / off': 'Sonido sí / no', 'Pause, close': 'Pausa, cerrar',
    "Couldn’t reach the game database. A school or work network may be blocking it; try another network, or play the bot.": 'No se pudo llegar a la base de datos del juego. La red de la escuela o del trabajo puede estar bloqueándola; prueba otra red o juega contra el bot.',
    'Could not reach the game server. Check your connection, or play the bot.': 'No se pudo llegar al servidor del juego. Revisa tu conexión o juega contra el bot.',
    'Signing in to the game server timed out. Check your connection.': 'Se agotó el tiempo para entrar al servidor. Revisa tu conexión.', 'Language': 'Idioma', '{n} (you)': '{n} (tú)', '{n} stages': '{n} etapas', 'no throwing': 'sin lanzar', 'low gravity': 'gravedad baja', 'bouncing throws': 'lanzamientos con rebote', 'turbo': 'turbo', 'Random arenas': 'Arenas al azar', '{n} joined': '{n} entró', '{n} left': '{n} se fue'
  });
})();
