// Boostball in Spanish (see the comment at the top of ../lang.js). English → Spanish, in our own words.
// Bot names, car body names and team colour names that are invented stay as they are.
(function () {
  if (!window.BackRoomLang) return;
  BackRoomLang.add({
    // menu
    "Rocket-powered car soccer. Drive, jump, flip and fly to knock a giant ball into the other team's net.": 'Fútbol con autos a cohete. Maneja, salta, haz piruetas y vuela para meter una pelota gigante en el arco rival.',
    'Quick match': 'Partida rápida', 'Play in room': 'Jugar en la sala', 'room code': 'código de sala', 'Practice vs bots': 'Práctica contra bots',
    'Teams': 'Equipos', 'Bots fill in': 'Completar con bots', 'No bots': 'Sin bots', 'Free play': 'Juego libre', 'Rookie': 'Novato', 'Pro': 'Pro', 'All-Star': 'Estrella',
    'Your car': 'Tu auto', 'Car body': 'Carrocería', 'Team colours': 'Colores del equipo', 'Accent colour': 'Color de detalle', 'Blue · Orange': 'Azul · Naranja',
    "Your car takes your team's colour in a match. Every body has the same hitbox.": 'En un partido tu auto lleva el color de tu equipo. Todas las carrocerías tienen la misma hitbox.',
    "Online, everyone sees the colours picked by the room's host.": 'En línea, todos ven los colores que eligió el anfitrión de la sala.',
    'Graphics': 'Gráficos', 'Language': 'Idioma', 'Graphics quality': 'Calidad gráfica', 'Fast': 'Rápido', 'Pretty': 'Lindo', 'Volume': 'Volumen', 'Camera shake': 'Temblor de cámara',
    'Landing marker': 'Marca de caída', 'Show where the ball will land': 'Mostrar dónde caerá la pelota', 'Off': 'No', 'On': 'Sí',
    'Bot difficulty': 'Dificultad de los bots', 'Fill empty spots with bots': 'Completar los lugares vacíos con bots', 'Team size': 'Tamaño del equipo',
    'Boostball game view': 'Vista del juego Boostball', 'Change keys': 'Cambiar teclas', 'Advertisement': 'Publicidad', 'Garage': 'Garaje',
    'Drive · reverse (pitch in air)': 'Avanzar · retroceder (inclinar en el aire)', 'Steer (turn in air)': 'Girar (rotar en el aire)',
    'Jump, again to double jump': 'Saltar, otra vez para doble salto', 'Flip into the ball': 'Pirueta contra la pelota',
    'Drift; in the air, air roll with': 'Derrapar; en el aire, giro aéreo con', 'Air roll left · right': 'Giro aéreo izquierda · derecha',
    'Ball cam on/off': 'Cámara de pelota sí/no', 'Pause, switch team, invite': 'Pausa, cambiar de equipo, invitar', 'Scoreboard': 'Marcador',
    'Free play: reset ball': 'Juego libre: reiniciar pelota', 'Quick chat': 'Chat rápido',
    'Gamepads work too: RT/LT drive, A jump, B boost, X powerslide, Y ball cam.': 'También funciona con control: RT/LT manejar, A saltar, B turbo, X derrape, Y cámara de pelota.',
    'SPACE': 'ESPACIO', 'Space': 'Espacio', 'SHIFT · L-CLICK': 'SHIFT · CLIC IZQ.', 'Y · M-CLICK': 'Y · CLIC CENTRAL',
    'SHIFT · LEFT CLICK': 'SHIFT · CLIC IZQUIERDO', 'Long and low': 'Largo y bajo', 'Tall and boxy': 'Alto y cuadrado', 'Flat wedge': 'Cuña plana',
    'Blue and orange': 'Azul y naranja', 'Green and purple': 'Verde y violeta', 'Red and teal': 'Rojo y verde azulado', 'Yellow and violet': 'Amarillo y morado', 'Pink and cyan': 'Rosa y cian',
    'BALL CAM · {k}': 'CÁM. PELOTA · {k}', 'CAR CAM · {k}': 'CÁM. AUTO · {k}', 'drive ·': 'manejar ·', 'jump, again with a direction to flip ·': 'saltar, otra vez con una dirección para pirueta ·',
    'boost · hold': 'turbo · mantén', 'and steer to drift ·': 'y gira para derrapar ·', 'ball cam': 'cámara de pelota',
    'Push the stick up to drive ·': 'Empuja el stick para avanzar ·', 'twice with the stick tilted to flip · hold': 'dos veces con el stick inclinado para pirueta · mantén',
    '· hold': '· mantén', 'and steer': 'y gira',
    // match
    'BOOST': 'TURBO', 'JUMP': 'SALTO', 'DRIFT': 'DERRAPE', 'CAM': 'CÁM', 'BALL CAM ·': 'CÁM. PELOTA ·', 'CAR CAM ·': 'CÁM. AUTO ·',
    'Boost': 'Turbo', 'Jump': 'Saltar', 'Drift': 'Derrapar', 'Drive': 'Manejo', 'Reverse': 'Retroceder', 'Steer left': 'Girar a la izquierda', 'Steer right': 'Girar a la derecha',
    'Air roll left': 'Giro aéreo a la izquierda', 'Air roll right': 'Giro aéreo a la derecha', 'Pitch nose up in the air': 'Subir la trompa en el aire',
    'Pitch nose down in the air': 'Bajar la trompa en el aire', 'Match': 'Partido', 'Hold': 'Mantener', 'Mouse': 'Mouse',
    'GO!': '¡YA!', 'GOAL!': '¡GOL!', 'SAVE!': '¡ATAJADA!', 'Own goal': 'Gol en contra', 'Next goal wins': 'El próximo gol gana', 'Victory!': '¡Victoria!', 'Defeat': 'Derrota',
    'Paused': 'Pausa', 'Switch team': 'Cambiar de equipo', 'Leave match': 'Salir del partido', 'Copy invite link': 'Copiar invitación', 'Menu': 'Menú',
    'Nice shot!': '¡Buen tiro!', 'Great pass!': '¡Gran pase!', 'What a save!': '¡Qué atajada!', 'Thanks!': '¡Gracias!',
    'Quick chat 1': 'Chat rápido 1', 'Quick chat 2': 'Chat rápido 2', 'Quick chat 3': 'Chat rápido 3', 'Quick chat 4': 'Chat rápido 4',
    'Again with a direction to flip': 'Otra vez con una dirección para hacer pirueta', 'In the air: air roll while steering': 'En el aire: giro aéreo al girar',
    'Boost is unlimited in free play · <b>CAM</b> switches ball cam': 'En juego libre el turbo es ilimitado · <b>CÁM</b> cambia la cámara de pelota',
    'Public lobby': 'Sala pública', 'Public lobby · the match keeps going': 'Sala pública · el partido sigue', 'Room {c}': 'Sala {c}', 'You joined {c}': 'Entraste a {c}',
    'Waiting for players · share the invite link from the pause menu': 'Esperando jugadores · comparte la invitación desde el menú de pausa',
    'Starting the next match…': 'Empezando el próximo partido…', 'The next match starts in a few seconds.': 'El próximo partido empieza en unos segundos.',
    'Finding a lobby…': 'Buscando una sala…', 'Copy this link: {u}': 'Copia este enlace: {u}', 'You': 'Tú', 'Player': 'Jugador', 'Someone': 'Alguien', 'Bot': 'Bot',
    'Invite link copied. Friends who open it and enter the code land in this room.': 'Invitación copiada. Tus amigos la abren, ponen el código y caen en esta sala.',
    'You were invited to room bb-{c}': 'Te invitaron a la sala bb-{c}',
    'Blue': 'Azul', 'Orange': 'Naranja', 'Red': 'Rojo', 'Green': 'Verde', 'Yellow': 'Amarillo', 'Purple': 'Violeta', 'Pink': 'Rosa', 'Teal': 'Verde azulado', 'Cyan': 'Cian', 'Violet': 'Morado',
    "Couldn't reach the game database. If you're on a school or work network it may be blocking it; try another network, or play Practice.": 'No se pudo conectar con la base de datos del juego. Si estás en la red de la escuela o del trabajo, puede que esté bloqueada; prueba otra red o juega una práctica.',
    'Could not reach the game server. Check your connection, or play Practice.': 'No se pudo conectar con el servidor del juego. Revisa tu conexión o juega una práctica.',
    'Signing in to the game server timed out. Check your connection, or play Practice.': 'El inicio de sesión en el servidor tardó demasiado. Revisa tu conexión o juega una práctica.',
    'Still signing in…': 'Todavía iniciando sesión…', 'Sign-in failed: {e}': 'No se pudo iniciar sesión: {e}',
    "Couldn't read the lobbies ({e}).": 'No se pudieron leer las salas ({e}).'
  });
})();
