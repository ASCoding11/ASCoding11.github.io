// Rampline in Spanish (see the comment at the top of ../lang.js). English → Spanish, in our own words.
// Track names (First Gear and the rest) and players' track names stay as they are.
(function () {
  if (!window.BackRoomLang) return;
  // combinations put together in code: tier · look, and medal results
  var TIER = { 'Green': 'Verde', 'Blue': 'Azul', 'Red': 'Rojo', 'Black': 'Negro' };
  var LOOK = { 'Summer valley': 'Valle de verano', 'Snowy pass': 'Paso nevado', 'Desert canyon': 'Cañón del desierto' };
  var MED = { 'Bronze': 'Bronce', 'Silver': 'Plata', 'Gold': 'Oro', 'Builder': 'Constructor' };
  var more = {};
  Object.keys(LOOK).forEach(function (l) {
    more[l] = LOOK[l]; more['By {a} · {n} pieces · ' + l] = 'De {a} · {n} piezas · ' + LOOK[l];
    Object.keys(TIER).forEach(function (t) { more[t + ' · ' + l] = TIER[t] + ' · ' + LOOK[l]; });
  });
  Object.keys(MED).forEach(function (m) {
    more[m] = MED[m]; more[m + ' medal!'] = '¡Medalla de ' + MED[m].toLowerCase() + '!'; more['Best {t} · ' + m] = 'Récord {t} · ' + MED[m];
    more['First layout: {t} · ' + m + ' kept'] = 'Primer trazado: {t} · conservas ' + MED[m];
  });
  more['Builder time beaten!'] = '¡Superaste el tiempo del constructor!';
  Object.keys(TIER).forEach(function (t) { more[t] = TIER[t]; });
  BackRoomLang.add(more);
  BackRoomLang.add({
    // menu
    'A little car, a track built from blocks, and the clock. Hit the ramps, hold the loops, and shave off every millisecond. Then build your own.': 'Un autito, una pista hecha de bloques y el reloj. Salta las rampas, aguanta los loops y recorta cada milésima. Después arma la tuya.',
    'Track builder': 'Constructor de pistas', 'make, share and publish': 'crea, comparte y publica', 'of 30 finished': 'de 30 terminadas', 'medals': 'medallas',
    '0 medals': '0 medallas', 'golds': 'oros', '30 to master': '30 para dominar', 'Tracks': 'Pistas', 'Community': 'Comunidad', 'Medals': 'Medallas',
    'Beat a time to win its medal. Every track is open: start anywhere.': 'Supera un tiempo para ganar su medalla. Todas las pistas están abiertas: empieza donde quieras.',
    'Tracks published by players, each with its own top 10. Publish yours from Track builder.': 'Pistas publicadas por jugadores, cada una con su top 10. Publica la tuya desde el Constructor de pistas.',
    'tracks by players': 'pistas de jugadores', 'Most raced': 'Más corridas', 'Newest': 'Más nuevas', 'This week': 'Esta semana', 'Show hidden': 'Mostrar ocultas',
    'Garage': 'Garaje', 'Pick a car': 'Elige un auto', 'Car colour': 'Color del auto', 'Ghost': 'Fantasma', 'Show my best': 'Mostrar mi mejor vuelta', 'Compare with': 'Comparar con',
    'Graphics': 'Gráficos', 'Fast': 'Rápido', 'Pretty': 'Lindo', 'Speed effects': 'Efectos de velocidad', 'Language': 'Idioma', 'Speed lines and the view widening at speed': 'Líneas de velocidad y vista más amplia a alta velocidad',
    'Sound volume': 'Volumen del sonido', 'Sound on or off': 'Sonido sí o no', 'Off': 'No', 'On': 'Sí', 'Camera': 'Cámara', 'Chase': 'Atrás', 'Far': 'Lejos', 'Hood': 'Capó',
    'Look of the track': 'Aspecto de la pista', 'Summer': 'Verano', 'Desert': 'Desierto', 'Snow': 'Nieve',
    // how to play
    'Driving': 'Manejo', ': accelerate, brake (hold it to reverse) and steer. The car turns less the faster you go. To': ': acelera, frena (mantén para ir marcha atrás) y gira. Cuanto más rápido vas, menos gira el auto. Para',
    'drift': 'derrapar', ', let go of go and tap brake while you turn: the nose swings out and you can take a tight corner fast. Ease off the steering and it grips again.': ', suelta el acelerador y toca el freno mientras giras: la trompa se abre y puedes tomar una curva cerrada rápido. Afloja el giro y vuelve a agarrar.',
    'Air': 'Aire', ': ramps, bumps and crests throw you. In the air, the': ': las rampas, los saltos y las lomas te lanzan. En el aire, el', 'air brake': 'freno de aire',
    '(or brake) stops the car tumbling and levels it: land straight and you keep your speed, land crooked and you lose it. Orange pads boost you.': '(o el freno) frena los giros del auto y lo endereza: si caes derecho mantienes la velocidad, si caes torcido la pierdes. Las placas naranjas te impulsan.',
    'Runs': 'Vueltas', ": R restarts at once, and the clock starts when you press a key. Drive through every checkpoint, in any order, then the finish. Going back to a checkpoint (or falling off) is fine for practice, but that run won't count.": ': R reinicia al instante y el reloj arranca cuando tocas una tecla. Pasa por todos los puntos de control, en cualquier orden, y después por la meta. Volver a un punto de control (o caerte) sirve para practicar, pero esa vuelta no cuenta.',
    'Ghosts and boards': 'Fantasmas y tablas', ': your best run drives beside you. Every track has an online top 10, checked by driving each run again; tick up to 10 ghosts to race, and watch any run in the replay viewer.': ': tu mejor vuelta corre a tu lado. Cada pista tiene un top 10 en línea, comprobado volviendo a correr cada vuelta; marca hasta 10 fantasmas para correr contra ellos y mira cualquier vuelta en la repetición.',
    ': snap pieces together, test drive, share the code, or publish it under Community with its own top 10.': ': encaja piezas, pruébala, comparte el código o publícala en Comunidad con su propio top 10.',
    'Keys': 'Teclas', ': W / ↑ go, S / ↓ brake, A D or ← → steer, Space air brake, R or Enter restart, Backspace back to the checkpoint, C camera, M sound, Esc pause. Change them under Controls.': ': W / ↑ acelerar, S / ↓ frenar, A D o ← → girar, Espacio freno de aire, R o Enter reiniciar, Backspace volver al punto de control, C cámara, M sonido, Esc pausa. Cámbialas en Controles.',
    'Touch': 'Táctil', ': arrows bottom left steer, GO and BRAKE bottom right (BRAKE in the air is the air brake). Top right: back to the checkpoint (flag), restart, camera, sound and pause.': ': las flechas abajo a la izquierda giran, ACEL. y FRENO abajo a la derecha (FRENO en el aire es el freno de aire). Arriba a la derecha: volver al punto de control (bandera), reiniciar, cámara, sonido y pausa.',
    // driving
    'Rampline game view': 'Vista del juego Rampline', 'Accelerate': 'Acelerar', 'Brake': 'Frenar', 'Steer left': 'Girar a la izquierda', 'Steer right': 'Girar a la derecha',
    'Back to the last checkpoint': 'Volver al último punto de control', 'Restart': 'Reiniciar', 'Change camera': 'Cambiar cámara', 'GO': 'ACEL.', 'BRAKE': 'FRENO',
    'Checkpoint': 'Punto de control', 'checkpoint': 'punto de control', 'Finished!': '¡Terminaste!', "Go when you're ready": 'Arranca cuando quieras', 'Paused': 'Pausa',
    "You went back to a checkpoint: this run won't count. R for a clean run.": 'Volviste a un punto de control: esta vuelta no cuenta. R para una vuelta limpia.',
    'go': 'acelerar', 'brake': 'frenar', 'steer': 'girar', 'restart': 'reiniciar', 'camera': 'cámara', 'Replay': 'Repetición', 'Timeline': 'Línea de tiempo',
    'Step back': 'Paso atrás', 'Step forward': 'Paso adelante', 'Speed over distance: tap to jump there': 'Velocidad según la distancia: toca para saltar ahí', 'Menu': 'Menú', 'Track': 'Pista',
    // tiers, pieces, garage menu
    'Learn the car: go, brake, turn, drift.': 'Aprende a manejar: acelera, frena, gira, derrapa.', 'Slopes, banks, kickers, gaps and climbs.': 'Pendientes, peraltes, rampitas, saltos y subidas.',
    'Loops, wall rides, rings and big air.': 'Loops, paredes, aros y grandes saltos.', 'Everything at once, high in the sky.': 'Todo junto, bien alto en el cielo.',
    'Straight': 'Recta', 'Tight curve': 'Curva cerrada', 'Curve': 'Curva', 'Wide curve': 'Curva abierta', 'Slope': 'Pendiente', 'Steep slope': 'Pendiente fuerte', 'Kicker': 'Rampita',
    'Big ramp': 'Rampa grande', 'Banked curve': 'Curva peraltada', 'Wide banked curve': 'Curva peraltada abierta', 'Loop (left)': 'Loop (izquierda)', 'Loop (right)': 'Loop (derecha)',
    'Wall ride': 'Pared', 'Narrow road': 'Camino angosto', 'Gap': 'Hueco', 'Platform': 'Plataforma', 'Start': 'Salida', 'Finish': 'Meta', 'Tree': 'Árbol', 'Rock': 'Roca',
    'Arrow sign': 'Cartel de flecha', 'Huge curve': 'Curva enorme', 'S-bend (left)': 'Curva en S (izquierda)', 'S-bend (right)': 'Curva en S (derecha)',
    'Climbing curve (left)': 'Curva en subida (izquierda)', 'Climbing curve (right)': 'Curva en subida (derecha)', 'Long climb': 'Subida larga', 'Bump': 'Lomo',
    'jump': 'salto', 'JUMP': 'SALTO', 'wall': 'pared', 'bank': 'peralte', 'gap': 'hueco', 'bump': 'lomo', 'boost': 'impulso', 'ring': 'aro',
    'Boost pad': 'Placa de impulso', 'Checkpoint ring': 'Aro de control',
    'Plain': 'Liso', 'Stripe': 'Franja', 'Twin stripes': 'Dos franjas', 'Two-tone': 'Dos tonos', 'Pattern': 'Diseño', 'Stripe colour': 'Color de la franja',
    'Stripe colour {n}': 'Color de la franja {n}', 'Rims': 'Llantas', 'Name': 'Nombre', 'Neon': 'Neón', 'Smoke': 'Humo', 'Flame': 'Llama', 'Rainbow': 'Arcoíris',
    // runs and results
    'Air brake': 'Freno de aire', 'In the air: stop the car turning and level it for the landing (the brake does it too)': 'En el aire: frena los giros y endereza el auto para caer (el freno también lo hace)',
    'Start the run again from the start': 'Empieza la vuelta otra vez desde la salida', 'Back to checkpoint': 'Volver al punto de control', 'The clock keeps running': 'El reloj sigue corriendo',
    'Brake / reverse': 'Frenar / marcha atrás', 'Drive': 'Manejo', 'Run': 'Vuelta', 'Sound on / off': 'Sonido sí / no',
    'CP {n}/{m}': 'PC {n}/{m}', 'CP{n} {t}': 'PC{n} {t}', 'Best {t}': 'Récord {t}', 'No time yet': 'Sin tiempo todavía', 'Finish (not counted)': 'Meta (no cuenta)', 'New best!': '¡Nuevo récord!',
    'Finish!': '¡Meta!', 'Practice run': 'Vuelta de práctica', 'New best time!': '¡Nuevo mejor tiempo!', 'Finished': 'Terminada', 'Untitled': 'Sin nombre',
    '{t} · test drive': '{t} · prueba', 'Not counted: you went back to a checkpoint. Press R for a clean run.': 'No cuenta: volviste a un punto de control. Toca R para una vuelta limpia.',
    '{d} against your best ({t})': '{d} contra tu récord ({t})', 'Your first time on this track.': 'Tu primera vez en esta pista.',
    'Times count once the track checks out (one start, one finish, all joined).': 'Los tiempos cuentan cuando la pista está bien armada (una salida, una meta, todo unido).',
    'Retry (R)': 'Otra vez (R)', 'Watch replay': 'Ver repetición', 'Next track: {n}': 'Siguiente pista: {n}', 'My tracks': 'Mis pistas', 'All tracks': 'Todas las pistas',
    'Track {n} · {t}': 'Pista {n} · {t}', 'No medal yet': 'Sin medalla todavía', 'Old layout {a} · Gold {b}': 'Trazado anterior {a} · Oro {b}', 'Gold {t}': 'Oro {t}',
    '{a} of {b} medals': '{a} de {b} medallas', 'Your best': 'Tu récord', 'You': 'Tú', 'did not finish': 'no terminó', 'Compare with: nobody': 'Comparar con: nadie',
    'Compare with: Your best': 'Comparar con: tu récord', 'Compare with: {n}': 'Comparar con: {n}', 'Pause': 'Pausa', 'Play': 'Jugar',
    // my tracks and sharing
    "Couldn't save: this browser's storage is full.": 'No se pudo guardar: el almacenamiento de este navegador está lleno.',
    'No tracks yet. Start a new one, or start from a built-in track.': 'Todavía no hay pistas. Empieza una nueva o parte de una pista del juego.',
    '{n} pieces · best {t}': '{n} piezas · récord {t}', '{n} pieces · no time yet': '{n} piezas · sin tiempo todavía', '{n} pieces · not finished yet': '{n} piezas · sin terminar',
    'Not ready yet': 'Todavía no está lista', 'Edit': 'Editar', 'Publish': 'Publicar', 'Delete "{n}"?': '¿Borrar "{n}"?',
    'This removes it from this browser. If you shared its code, that still works.': 'Se borra de este navegador. Si compartiste su código, sigue funcionando.',
    'Keep it': 'Conservarla', 'My track': 'Mi pista', '{n} (copy)': '{n} (copia)', 'Pick one to copy into the builder. The copy is yours to change.': 'Elige una para copiarla al constructor. La copia es tuya para cambiarla.',
    'Imported "{n}" ({p} pieces).': 'Importaste "{n}" ({p} piezas).', 'Imported "{n}".': 'Importaste "{n}".',
    '{n} characters. Anyone can paste it into Track builder → Paste a track code.': '{n} caracteres. Cualquiera puede pegarlo en Constructor de pistas → Pega un código de pista.',
    'Share "{n}"': 'Compartir "{n}"', 'Copy code': 'Copiar código', "Couldn't copy: select the code and copy it yourself.": 'No se pudo copiar: selecciona el código y cópialo tú.',
    "That isn't a track code.": 'Eso no es un código de pista.', 'That code is too long to be a track.': 'Ese código es demasiado largo para ser una pista.',
    "That isn't a track code (they start with RL1.).": 'Eso no es un código de pista (empiezan con RL1.).', 'That code is from a newer version of the game.': 'Ese código es de una versión más nueva del juego.',
    'That code is broken or cut short.': 'Ese código está roto o incompleto.', "That code has been changed or cut short (its check doesn't match).": 'Ese código fue cambiado o está incompleto (su control no coincide).',
    'That code is broken.': 'Ese código está roto.', 'That track has too many pieces.': 'Esa pista tiene demasiadas piezas.', 'That code is broken (wrong length).': 'Ese código está roto (largo incorrecto).',
    "That code has a piece the game doesn't know.": 'Ese código tiene una pieza que el juego no conoce.', 'That code has pieces on top of each other.': 'Ese código tiene piezas encimadas.',
    "That code couldn't be read.": 'No se pudo leer ese código.', 'Shared track': 'Pista compartida',
    // builder checks
    'Add a Start.': 'Pon una Salida.', 'Only one Start, please ({n} now).': 'Solo una Salida, por favor (ahora hay {n}).', 'Add a Finish.': 'Pon una Meta.',
    'Only one Finish, please ({n} now).': 'Solo una Meta, por favor (ahora hay {n}).', '{n} pieces overlap.': '{n} piezas se superponen.',
    "The Finish isn't joined to the Start.": 'La Meta no está unida a la Salida.',
    "{n} checkpoints aren't joined to the Start, so the Finish may never count.": '{n} puntos de control no están unidos a la Salida, así que la Meta podría no contar nunca.',
    "{n} checkpoint isn't joined to the Start, so the Finish may never count.": '{n} punto de control no está unido a la Salida, así que la Meta podría no contar nunca.',
    "{n} pieces aren't joined to the track.": '{n} piezas no están unidas a la pista.', "{n} piece isn't joined to the track.": '{n} pieza no está unida a la pista.',
    '⚠ {n} to fix': '⚠ Arreglar {n}', '! {n} warning': '! {n} aviso', '! {n} warnings': '! {n} avisos', '✓ Ready': '✓ Lista', 'Fix:': 'Arreglar:', 'Check:': 'Revisar:',
    'One start, one finish, everything joined. Go and test drive it!': 'Una salida, una meta, todo unido. ¡Ve a probarla!', 'Track check': 'Revisión de la pista',
    'A track needs exactly one Start and one Finish, joined by road. Ramps count as joined to road a few tiles ahead of them. Every checkpoint must be passed, in any order, before the finish counts.': 'Una pista necesita exactamente una Salida y una Meta, unidas por camino. Las rampas cuentan como unidas al camino que está unos casilleros más adelante. Hay que pasar por todos los puntos de control, en cualquier orden, antes de que cuente la meta.',
    'Put exactly one Start piece down first (you have {n}).': 'Primero pon exactamente una pieza de Salida (tienes {n}).', 'Free drive: no finish yet': 'Manejo libre: todavía sin meta',
    "Those pieces don't fit there. Move, raise (E) or turn (R) them.": 'Esas piezas no entran ahí. Muévelas, súbelas (E) o gíralas (R).',
    'Something is already there. Raise it (E), turn it (R) or delete the other piece.': 'Ya hay algo ahí. Súbela (E), gírala (R) o borra la otra pieza.',
    "That's the most pieces a track can have (1500).": 'Es el máximo de piezas que puede tener una pista (1500).', 'Moved.': 'Movido.', 'Pasted {n} piece.': 'Pegaste {n} pieza.',
    'Pasted {n} pieces.': 'Pegaste {n} piezas.', 'Select some pieces first (the arrow tool, then click or drag).': 'Primero elige algunas piezas (la herramienta de flecha, después clic o arrastrar).',
    'Nothing copied yet.': 'Todavía no copiaste nada.', 'Copied {n}. Ctrl+V to paste.': 'Copiaste {n}. Ctrl+V para pegar.', 'Cut {n}. Ctrl+V to paste.': 'Cortaste {n}. Ctrl+V para pegar.',
    // boards and community
    'Top 10': 'Top 10', 'Loading the board…': 'Cargando la tabla…', 'You (online)': 'Tú (en línea)', '{n} (you)': '{n} (tú)', '{d} against your best': '{d} contra tu récord',
    'Ghost on': 'Fantasma sí', 'Up to {n} ghosts at once (your best counts as one).': 'Hasta {n} fantasmas a la vez (tu récord cuenta como uno).', 'Race this run as a ghost': 'Corre contra esta vuelta como fantasma',
    'Watch': 'Ver', 'Checked: every time here was driven again on this device and matches.': 'Comprobado: cada tiempo de aquí se volvió a correr en este dispositivo y coincide.',
    '{n} ghost will race with you.': '{n} fantasma correrá contigo.', '{n} ghosts will race with you.': '{n} fantasmas correrán contigo.', 'No times yet. Set one and it goes up here.': 'Todavía no hay tiempos. Marca uno y aparece aquí.',
    "Couldn't load the board.": 'No se pudo cargar la tabla.', 'Your best: {t}': 'Tu récord: {t}', 'No time yet.': 'Sin tiempo todavía.', 'Watch a run of yours ({n})': 'Ver una vuelta tuya ({n})',
    'Take it down': 'Quitarla', 'Take "{n}" down?': '¿Quitar "{n}"?', 'It disappears from Community. Its board stays, and you can publish it again.': 'Desaparece de Comunidad. Su tabla queda y puedes volver a publicarla.',
    'Take down': 'Quitar', "Couldn't take it down": 'No se pudo quitar', 'Hide': 'Ocultar', 'Report': 'Denunciar', 'Reported': 'Denunciada',
    'Publish this track (Track builder → Publish) to give it a board.': 'Publica esta pista (Constructor de pistas → Publicar) para que tenga tabla.',
    'Loading community tracks…': 'Cargando pistas de la comunidad…', "Couldn't load community tracks.": 'No se pudieron cargar las pistas de la comunidad.',
    '{n} track': '{n} pista', '{n} tracks': '{n} pistas', '{n} track · {h} hidden by you': '{n} pista · {h} ocultas por ti', '{n} tracks · {h} hidden by you': '{n} pistas · {h} ocultas por ti',
    'No tracks published yet. Build one, finish it, then press Publish under Track builder.': 'Todavía no hay pistas publicadas. Arma una, termínala y toca Publicar en el Constructor de pistas.',
    'Track of the week': 'Pista de la semana', 'Your best {t}': 'Tu récord {t}', 'Yours': 'Tuya',
    '{a} · {n} pieces · {p} raced ({w} this week) · best {t}': '{a} · {n} piezas · {p} corridas ({w} esta semana) · récord {t}', '{a} · {n} pieces · {p} raced · best {t}': '{a} · {n} piezas · {p} corridas · récord {t}',
    '{a} · {n} pieces · {p} raced ({w} this week) · no time yet': '{a} · {n} piezas · {p} corridas ({w} esta semana) · sin tiempo', '{a} · {n} pieces · {p} raced · no time yet': '{a} · {n} piezas · {p} corridas · sin tiempo',
    'Not ready to publish': 'Todavía no se puede publicar', 'Finish it first': 'Primero termínala',
    'Drive it to the finish without going back to a checkpoint (Play or Test drive), so everyone knows it can be done. Then publish.': 'Llega a la meta sin volver a un punto de control (Jugar o Probar), así todos saben que se puede. Después publícala.',
    'Too big to publish': 'Demasiado grande para publicar', 'Published tracks can have up to {m} pieces (this one has {n}).': 'Las pistas publicadas pueden tener hasta {m} piezas (esta tiene {n}).',
    'Publish "{n}"?': '¿Publicar "{n}"?', 'Published!': '¡Publicada!', '"{n}" is up under Community.': '"{n}" ya está en Comunidad.', 'See it': 'Verla', "Couldn't publish": 'No se pudo publicar',
    'Everyone in the Back Room will see it under Community, with your name ({n}) and its own top 10. You can have {m} published at once and take any down later.': 'Todos en el Back Room la verán en Comunidad, con tu nombre ({n}) y su propio top 10. Puedes tener {m} publicadas a la vez y quitar cualquiera después.',
    'You can have {m} tracks published at once. Take one down first (Community → yours).': 'Puedes tener {m} pistas publicadas a la vez. Primero quita una (Comunidad → tuyas).',
    "Couldn't reach the game server. Boards and community tracks need a connection.": 'No se pudo conectar con el servidor del juego. Las tablas y las pistas de la comunidad necesitan conexión.',
    '"{n}" is hidden for you now. To tell us about it, use Tell us on the Back Room page and mention the track\'s name and author ({a}).': '"{n}" ya no se muestra para ti. Para avisarnos, usa Cuéntanos en la página del Back Room y menciona el nombre de la pista y su autor ({a}).',
    // captain's garage (garage.js; car, paint and wheel names that are just words are translated)
    "Captain’s garage": 'Garaje de capitanes', 'Front': 'Frente', 'Cars': 'Autos', 'Paint': 'Pintura', 'Wheels': 'Ruedas', 'Tyre smoke': 'Humo de gomas', 'Horn': 'Bocina',
    'Garage car': 'Auto del garaje', 'The car’s own': 'El del auto', 'Garage colour': 'Color del garaje', 'Garage rims': 'Llantas del garaje', 'No horn': 'Sin bocina',
    'Pick one to hear it. While driving, press H (or the horn button on a touch screen).': 'Elige una para escucharla. Mientras manejas, toca H (o el botón de bocina en pantalla táctil).',
    'Hidden for now: only the site’s captains see this': 'Oculto por ahora: solo lo ven los capitanes del sitio', 'Extras on': 'Extras activados',
    'Not public yet: only the site’s captains can see this, and everything here is free to wear. Your car, paint and wheels show on the online boards and as your ghost; smoke and horn are just for you.': 'Aún no es público: solo lo ven los capitanes del sitio y todo es gratis. Tu auto, pintura y ruedas se ven en las tablas en línea y en tu fantasma; el humo y la bocina son solo para ti.',
    '{c} (garage car)': '{c} (auto del garaje)', '{p} paint': 'pintura {p}', '{s} smoke': 'humo {s}', '{h} horn ({k})': 'bocina {h} ({k})', 'the horn button': 'el botón de bocina',
    'Wearing: {w}': 'Usando: {w}', 'Go-Kart': 'Go-kart', 'Candy Apple': 'Manzana caramelo', 'Tangerine': 'Mandarina', 'Lemon Drop': 'Limón', 'Lime Fizz': 'Lima',
    'Mint': 'Menta', 'Teal': 'Verde azulado', 'Sky': 'Celeste', 'Midnight': 'Medianoche', 'Lavender': 'Lavanda', 'Grape': 'Uva', 'Bubblegum': 'Chicle', 'Magenta': 'Magenta',
    'Copper': 'Cobre', 'Sand': 'Arena', 'Whitewalls': 'Bandas blancas', 'Wire Spokes': 'Rayos de alambre', 'Gold Star': 'Estrella dorada', 'Off-Road': 'Todoterreno',
    'Neon Rings': 'Aros de neón', 'Wooden': 'De madera', 'Red Steelies': 'Llantas rojas de acero', 'Turbine': 'Turbina', 'Candy Swirl': 'Remolino de caramelo',
    'Flower Caps': 'Tapas de flor', 'Race Slicks': 'Gomas de carrera', 'Rainbow Rings': 'Aros arcoíris', 'Pink': 'Rosa', 'Sky Blue': 'Celeste', 'Lime': 'Lima',
    'Purple': 'Violeta', 'Orange': 'Naranja', 'Confetti': 'Papelitos', 'Beep Beep': 'Bip bip', 'Clown Honk': 'Bocina de payaso', 'Air Horn': 'Bocina de aire',
    'Little Tune': 'Melodía', 'Duck Quack': 'Cuac', 'Bike Bell': 'Timbre de bici', 'Squeaky Toy': 'Juguete chillón', 'Space Zap': 'Rayo espacial', 'Foghorn': 'Sirena de niebla',
    'Ice Cream Jingle': 'Musiquita de heladero', 'Train Whistle': 'Silbato de tren',
    'Normal cars': 'Autos normales', 'Work vehicles': 'Vehículos de trabajo', 'Toy cars': 'Autos de juguete', 'Silly cars': 'Autos locos',
    'Muscle Car': 'Muscle car', 'Rally Hatch': 'Hatchback de rally', 'Pickup': 'Camioneta', 'Dune Buggy': 'Buggy de arena', 'Monster Truck': 'Monster truck', 'Retro Wedge': 'Cuña retro',
    'Limo': 'Limusina', 'School Bus': 'Autobús escolar', 'Taxi': 'Taxi', 'Police Cruiser': 'Patrullero', 'Fire Truck': 'Camión de bomberos', 'Ice Cream Truck': 'Camión de helados',
    'Garbage Truck': 'Camión de basura', 'Tractor': 'Tractor', 'Golf Cart': 'Carrito de golf', 'Lunar Rover': 'Vehículo lunar', 'Wooden Toy': 'Juguete de madera', 'Wind-Up Car': 'Auto a cuerda',
    'RC Car': 'Auto a control remoto', 'Soapbox Crate': 'Cajón con ruedas', 'Cardboard Box': 'Caja de cartón', 'Shopping Cart': 'Carrito de compras', 'Bathtub': 'Bañera', 'Couch': 'Sillón',
    'Hot Dog': 'Hot dog', 'Banana': 'Banana', 'Rubber Duck': 'Patito de goma', 'Giant Shoe': 'Zapato gigante', 'Rocket Car': 'Auto cohete',
    'Sports cars': 'Autos deportivos', 'Pirates, suits and robots': 'Piratas, trajes y robots', 'Team Bus': 'Autobús del equipo', 'Ice Resurfacer': 'Pulidora de hielo',
    'Golf Cart Racer': 'Carrito de golf de carreras', 'Football Helmet': 'Casco de fútbol americano', 'Soccer Ball': 'Pelota de fútbol', 'Pirate Ship': 'Barco pirata',
    'Black Sedan': 'Sedán negro', 'VIP Limo': 'Limusina VIP', 'Armoured Van': 'Camioneta blindada', 'Robo Walker': 'Robot caminante', 'Lowrider': 'Lowrider',
    'Jersey Blue': 'Azul camiseta', 'Turf Green': 'Verde césped', 'Ice White': 'Blanco hielo', 'Varsity Maroon': 'Granate universitario', 'Gunmetal': 'Gris metal',
    'Tuxedo Black': 'Negro esmoquin', 'Parrot Green': 'Verde loro', 'Plank Brown': 'Marrón tablón', 'Circuit Green': 'Verde circuito', "Ship's Bell": 'Campana de barco', 'Ref Whistle': 'Silbato de árbitro',
    // builder
    'New track': 'Pista nueva', 'Start from a built-in track': 'Empezar desde una pista del juego', 'Import': 'Importar', 'Paste a track code': 'Pega un código de pista',
    'Track code to import': 'Código de pista para importar', 'Your tracks stay in this browser. Share one as a code; anyone can paste it in below.': 'Tus pistas se guardan en este navegador. Comparte una como código; cualquiera puede pegarlo abajo.',
    'Test drive': 'Probar', 'Share': 'Compartir', 'Copy': 'Copiar', 'Delete': 'Borrar', 'Move': 'Mover', 'Check': 'Revisar', 'Ramp': 'Rampa', 'line': 'línea',
    'Back to the builder': 'Volver al constructor', 'Track name': 'Nombre de la pista', 'Undo': 'Deshacer', 'Redo': 'Rehacer', 'Raise': 'Subir', 'Lower': 'Bajar',
    'Turn piece': 'Girar pieza', 'Select pieces': 'Elegir piezas', 'Delete mode': 'Modo borrar', 'Side walls on or off': 'Paredes laterales sí o no',
    'Delete (X, or right-click a piece)': 'Borrar (X, o clic derecho en una pieza)', 'Lower (Q)': 'Bajar (Q)', 'Raise (E)': 'Subir (E)', 'Redo (Ctrl+Y)': 'Rehacer (Ctrl+Y)',
    'Select (V): click or drag a box, then move (M), copy (Ctrl+C), cut (Ctrl+X), paste (Ctrl+V)': 'Elegir (V): clic o arrastra un recuadro, después mover (M), copiar (Ctrl+C), cortar (Ctrl+X), pegar (Ctrl+V)',
    'Side walls (B)': 'Paredes laterales (B)', 'Turn piece (R)': 'Girar pieza (R)', 'Undo (Ctrl+Z)': 'Deshacer (Ctrl+Z)',
    'Click: place · right-click: delete ·': 'Clic: poner · clic derecho: borrar ·', 'pick up': 'levantar', 'Middle-drag: look round · right-drag: pan · wheel: zoom': 'Arrastre central: mirar · arrastre derecho: mover · rueda: zoom',
    'Shift + wheel or': 'Shift + rueda o', ': height ·': ': altura ·', 'turn ·': 'girar ·', 'test': 'probar', 'select · Ctrl+': 'elegir · Ctrl+', 'move': 'mover',
    'Trail': 'Estela', 'Your name and car show on the online boards and as your ghost.': 'Tu nombre y tu auto se ven en las tablas en línea y como tu fantasma.',
    'Your name on the boards': 'Tu nombre en las tablas', 'Paint {n}': 'Color {n}', '{n} selected': '{n} elegidas', 'Space': 'Espacio'
  });
})();
