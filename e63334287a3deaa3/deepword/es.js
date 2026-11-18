/* Deepword: Spanish words for this game (see /e63334287a3deaa3/lang.js). English stays exactly as it is when the language is English.
   The prompts and answers are English by design (an English word game): they're kept out of translation and tagged "En inglés".
   Nothing here is ever sent to the room: Blowfish Brawl prompts and answers travel in English, as before. */
(function () {
  var L = window.BackRoomLang; if (!L) return;
  L.add({
    // top bar, menu
    '‹ Back': '‹ Volver', '‹ Quit': '‹ Salir', 'Surface': 'Superficie', 'Sound on': 'Sonido activado', 'Sound off': 'Sonido desactivado', 'Sound (M)': 'Sonido (M)',
    'Daily rare-answer dive': 'Buceo diario de respuestas raras', 'Rarer answers sink deeper': 'Las respuestas más raras bajan más hondo',
    'Eight prompts, thousands of right answers. Name the one hardly anyone would think of: the obvious answers barely dent the surface, the deep cuts carry you toward the trench.':
      'Ocho consignas, miles de respuestas correctas. Di la que casi nadie pensaría: las obvias apenas rozan la superficie, las rarezas te llevan hacia la fosa.',
    'Diver': 'Buzo', 'Daily Dive': 'Buceo diario', "Today's results": 'Resultados de hoy', 'Practice topic': 'Tema de práctica', 'Any topic': 'Cualquier tema',
    'Past dives': 'Buceos anteriores', "Replay any of the last 30 Daily Dives. It's practice: no streak, and nothing is sent.": 'Vuelve a jugar cualquiera de los últimos 30 buceos diarios. Es práctica: no cuenta para la racha y no se envía nada.',
    'Day streak': 'Racha de días', 'Best depth': 'Mejor profundidad', 'Dives': 'Buceos', 'Blowfish Brawl · 2–12 players': 'Blowfish Brawl · 2 a 12 jugadores',
    'Join the busiest public room.': 'Entra a la sala pública con más gente.', 'Play in room': 'Jugar en la sala',
    'Everyone gets the same prompt and ten seconds. Blank, invalid or already taken, and you puff up. Three puffs and you pop.': 'Todos reciben la misma consigna y diez segundos. Si dejas en blanco, no vale o alguien ya la dijo, te inflas. Tres infladas y explotas.',
    'The box turns green when your answer counts. Spelling, accents, "the", plurals and British or American spelling don\'t matter; a small typo of a well-known answer counts, and a near miss offers a "did you mean" button. After each prompt you can see every answer.':
      'El recuadro se pone verde cuando tu respuesta cuenta. No importan la ortografía, los acentos, "the", los plurales ni la ortografía británica o estadounidense; un error chico en una respuesta conocida cuenta, y si casi aciertas aparece un botón de "¿quisiste decir?". Después de cada consigna puedes ver todas las respuestas.',
    'Your month': 'Tu mes', 'Advertisement': 'Publicidad',
    'Prompts are our own. Answers and how well known they are come from our own lists plus Wikidata, Wikipedia pageviews, Linguabase and GeoNames (geonames.org, CC BY 4.0). ·':
      'Las consignas son nuestras. Las respuestas y qué tan conocidas son salen de nuestras listas más Wikidata, las visitas de Wikipedia, Linguabase y GeoNames (geonames.org, CC BY 4.0). Las consignas y respuestas están en inglés. ·',
    'Privacy': 'Privacidad', 'A new set of eight prompts every day. Same prompts for every diver.': 'Ocho consignas nuevas cada día. Las mismas para todos los buzos.',
    "Today's dive is done: {m}. Press Daily Dive to see your results, or practise with random prompts.": 'Ya buceaste hoy: {m}. Toca Buceo diario para ver tus resultados, o practica con consignas al azar.',
    "The prompt bank (prompts.js) didn't load.": 'No cargó el banco de consignas (prompts.js).',
    // help (rich)
    '<b>Daily Dive:</b> the same eight prompts for everyone today. Type any right answer: the less well known it is in the real world, the more points (10 to 100), and every point is 15 m of depth. You have 30 seconds of air per prompt.':
      '<b>Buceo diario:</b> las mismas ocho consignas para todos hoy. Escribe cualquier respuesta correcta: cuanto menos conocida sea en el mundo real, más puntos (de 10 a 100), y cada punto son 15 m de profundidad. Tienes 30 segundos de aire por consigna.',
    '<b>How deep is an answer?</b> Every answer is ranked by how well known it is (how often people read its Wikipedia page, how many languages have one, how familiar the word is). The best-known answer scores 10; the deeper you go down that ranking, the more it scores. What other divers said never changes your points.':
      '<b>¿Qué tan honda es una respuesta?</b> Cada respuesta está ordenada según lo conocida que es (cuántas veces se lee su página de Wikipedia, en cuántos idiomas tiene una, qué tan familiar es la palabra). La más conocida vale 10; cuanto más abajo en ese orden, más vale. Lo que dijeron otros buzos nunca cambia tus puntos.',
    "<b>Tiers:</b> Shallows, Reef, Drop-off, Deep water, Abyss and, at the very bottom of a prompt's list, Seafloor.": '<b>Niveles:</b> Bajíos, Arrecife, Talud, Aguas profundas, Abismo y, al fondo de todo de la lista de una consigna, Lecho marino.',
    '<b>Zones:</b> Sunlit to 200 m, Twilight to 1,000 m, Midnight to 4,000 m, Abyss to 6,000 m, then the Trench. A perfect dive reaches the deepest point in the ocean.': '<b>Zonas:</b> Luminosa hasta 200 m, Penumbra hasta 1.000 m, Medianoche hasta 4.000 m, Abismo hasta 6.000 m, y después la Fosa. Un buceo perfecto llega al punto más hondo del océano.',
    '<b>Blowfish Brawl:</b> same prompt for everyone in the room, 10 seconds that shrink to 6. An answer nobody else sent first keeps you safe; a blank, an invalid answer or a duplicate puffs you up. Three puffs and you pop. Last one swimming wins.':
      '<b>Blowfish Brawl:</b> la misma consigna para toda la sala, 10 segundos que bajan a 6. Una respuesta que nadie mandó antes te salva; en blanco, inválida o repetida te infla. Tres infladas y explotas. Gana el último que sigue nadando.',
    '<b>Keys:</b> Enter sends, Esc pauses in Practice, M mutes.': '<b>Teclas:</b> Enter envía, Esc pausa en Práctica, M silencia.',
    '<b style="color:var(--ink)">Dive:</b> read the prompt, type an answer, press Enter or Dive. Right answers turn the box green. The less well known your answer is in the real world, the more it scores (10 to 100 points), and each point is 15 m deeper. Other divers\' answers never change your score.':
      '<b style="color:var(--ink)">Bucear:</b> lee la consigna (en inglés), escribe una respuesta y presiona Enter o Bucear. Las respuestas correctas ponen el recuadro verde. Cuanto menos conocida sea tu respuesta en el mundo real, más vale (de 10 a 100 puntos), y cada punto son 15 m más hondo. Las respuestas de otros buzos nunca cambian tus puntos.',
    '<b style="color:var(--ink)">Tiers:</b> Shallows, Reef, Drop-off, Deep water, Abyss, and Seafloor for the very bottom of a prompt\'s list.': '<b style="color:var(--ink)">Niveles:</b> Bajíos, Arrecife, Talud, Aguas profundas, Abismo, y Lecho marino para el fondo de todo de la lista de una consigna.',
    '<b style="color:var(--ink)">Air:</b> 30 seconds per prompt. Out of air means no points for that prompt.': '<b style="color:var(--ink)">Aire:</b> 30 segundos por consigna. Si te quedas sin aire, no sumas puntos en esa consigna.',
    '<b style="color:var(--ink)">Brawl:</b> one prompt for the whole room, 10 seconds down to 6. Duplicates go to whoever sent first; blank, invalid or duplicate puffs you. Three puffs and you pop.': '<b style="color:var(--ink)">Brawl:</b> una consigna para toda la sala, de 10 segundos a 6. Las repetidas son para quien la mandó primero; en blanco, inválida o repetida te infla. Tres infladas y explotas.',
    '<b style="color:var(--ink)">Keys:</b> Enter sends, Esc pauses in Practice, M toggles sound.': '<b style="color:var(--ink)">Teclas:</b> Enter envía, Esc pausa en Práctica, M activa o quita el sonido.',
    'Got it': 'Entendido',
    // categories (the prompt itself stays English)
    'Geography': 'Geografía', 'Animals': 'Animales', 'Food': 'Comida', 'Words': 'Palabras', 'Pop culture': 'Cultura pop', 'Science': 'Ciencia', 'Sports': 'Deportes', 'Everyday': 'Vida diaria',
    '{c} practice': 'Práctica de {c}', 'Practice dive': 'Buceo de práctica', 'Past dive · {d}': 'Buceo anterior · {d}', 'Word': 'Palabra', 'Category': 'Categoría',
    // the dive
    '{n} pts': '{n} pts', 'pts': 'pts', 'Type your answer…': 'Escribe tu respuesta…', 'Your answer': 'Tu respuesta', 'Dive': 'Bucear', 'Loading the answers…': 'Cargando las respuestas…',
    '{n} answers count': 'Valen {n} respuestas', 'Not on the list yet…': 'Todavía no está en la lista…', '"{a}" isn\'t on the list.': '"{a}" no está en la lista.', 'Try another.': 'Prueba con otra.',
    'Did you mean': '¿Quisiste decir', 'or': 'o', 'Out of air': 'Sin aire', 'No points this time.': 'Esta vez no sumaste puntos.',
    ' (read as {a}, from "{b}")': ' (leído como {a}, de "{b}")', '(read as {a}, from "{b}")': '(leído como {a}, de "{b}")', '+{p} pts · {m} deeper': '+{p} pts · {m} más hondo',
    '{n} answers counted': '{n} respuestas válidas', 'yours is #{r} best known': 'la tuya es la #{r} más conocida', '{k} other diver said this today': 'Otro buzo dijo esto hoy',
    '{k} other divers said this today': 'Otros {k} buzos dijeron esto hoy', 'No other diver said this today': 'Ningún otro buzo dijo esto hoy',
    'Rarest so far today: {a} ({n} diver)': 'La más rara de hoy por ahora: {a} ({n} buzo)', 'Rarest so far today: {a} ({n} divers)': 'La más rara de hoy por ahora: {a} ({n} buzos)',
    'Deeper finds:': 'Hallazgos más hondos:', 'Most said:': 'Las más dichas:', 'See results': 'Ver resultados',
    // tiers, what they say, zones, landmarks
    'Shallows': 'Bajíos', 'Reef': 'Arrecife', 'Drop-off': 'Talud', 'Deep water': 'Aguas profundas', 'Abyss': 'Abismo', 'Seafloor': 'Lecho marino',
    'Most divers would say that first.': 'La mayoría de los buzos diría eso primero.', 'A good find, but the reef is busy.': 'Buen hallazgo, pero el arrecife está lleno de gente.',
    'Past where most people stop looking.': 'Más allá de donde casi todos dejan de buscar.', 'Not many would think of that.': 'No muchos pensarían en eso.',
    'A real deep cut.': 'Una verdadera rareza.', 'As deep as this prompt goes.': 'Lo más hondo de esta consigna.',
    'Sunlit': 'Luminosa', 'Twilight': 'Penumbra', 'Midnight': 'Medianoche', 'Trench': 'Fosa', '{z} zone': 'Zona {z}', '{m} m and below': '{m} m y más abajo', 'The surface': 'La superficie',
    'Deeper than {s} ({m}).': 'Más hondo que {s} ({m}).', 'the deepest scuba dive': 'el buceo con tanque más profundo', 'where sunlight ends': 'donde termina la luz del sol',
    'the deepest whale dive on record': 'la inmersión de ballena más profunda registrada', 'the wreck of the Titanic': 'los restos del Titanic', 'the start of the trenches': 'el comienzo de las fosas',
    'the height of Everest, upside down': 'la altura del Everest, dada vuelta', 'the bottom of the Challenger Deep': 'el fondo del abismo Challenger',
    // results
    'Your dive, prompt by prompt': 'Tu buceo, consigna por consigna', 'You touched the bottom!': '¡Tocaste el fondo!', 'Divers today': 'Buzos hoy', 'Share': 'Compartir', 'Menu': 'Menú',
    'New personal best!': '¡Nuevo récord personal!', 'Copied! Paste it anywhere.': '¡Copiado! Pégalo donde quieras.', 'All answers': 'Ver todas', 'All answers for: {q}': 'Todas las respuestas de: {q}',
    '{k} other': '{k} más', '{k} others': '{k} más', 'Other divers who said this today': 'Otros buzos que dijeron esto hoy', 'Your daily progress is saved': 'Tu progreso del día está guardado',
    '(replay)': '(repetición)', 'Deepword practice': 'Deepword práctica', '{m} down': '{m} de profundidad', 'deepest find: {t}': 'hallazgo más hondo: {t}',
    // every answer
    'Every answer': 'Todas las respuestas', 'Search the answers': 'Buscar en las respuestas', 'Show more': 'Mostrar más', '{a} of {b} answers': '{a} de {b} respuestas', '{b} answers': '{b} respuestas', 'showing {n}': 'se ven {n}',
    // pause
    'Paused': 'En pausa', 'Your air is on hold. Take your time.': 'Tu aire está en pausa. Tómate tu tiempo.', 'New set': 'Otra tanda', 'Language': 'Idioma',
    // Blowfish Brawl (names, prompts and answers stay as sent)
    'Lobby': 'Sala de espera', 'Fill to 4 with bots': 'Completar hasta 4 con bots', 'Copy invite link': 'Copiar enlace de invitación', 'How the brawl works': 'Cómo funciona el Brawl',
    'Every round shows one prompt, like "an animal starting with P" or "a 5-letter word containing OU".': 'Cada ronda muestra una consigna en inglés, como "an animal starting with P" (un animal que empiece con P) o "a 5-letter word containing OU" (una palabra de 5 letras con OU).',
    "Send a valid answer before the clock runs out. If someone in the room sent the same answer first, yours doesn't count.": 'Manda una respuesta válida antes de que se acabe el tiempo. Si alguien de la sala mandó la misma antes, la tuya no cuenta.',
    'Blank, invalid or duplicate: you puff up. Three puffs and you pop, and watch the rest.': 'En blanco, inválida o repetida: te inflas. Tres infladas y explotas, y miras al resto.',
    'Rounds start at 10 seconds and shrink to 6. The last blowfish swimming wins.': 'Las rondas empiezan con 10 segundos y bajan a 6. Gana el último pez globo que sigue nadando.',
    'Round {n}': 'Ronda {n}', '{n} swimming': '{n} nadando', 'Get ready': 'Prepárate', 'The first prompt is coming…': 'Ya viene la primera consigna…', 'Send': 'Enviar',
    'Round {n} results': 'Resultados de la ronda {n}', '✓ safe': '✓ a salvo', 'already said · puff': 'ya dicha · se infla', 'not valid · puff': 'no vale · se infla', 'popped': 'explotó', 'puff': 'se infla', 'POP!': '¡PUM!',
    'left the room': 'se fue de la sala', 'no answer': 'sin respuesta', 'left': 'se fue', 'Everyone missed, so nobody pops this round.': 'Todos fallaron, así que nadie explota en esta ronda.',
    'You popped!': '¡Explotaste!', 'Puff! {n} left': '¡Te inflaste! Te quedan {n}', "You're the host now": 'Ahora eres el anfitrión', "You'll join the next match. Watching…": 'Entras en la próxima partida. Mirando…',
    'You popped! Watching the rest…': '¡Explotaste! Mirando al resto…', 'Watching…': 'Mirando…', 'Sent: {a}. Waiting for the others…': 'Enviada: {a}. Esperando a los demás…',
    '(you)': '(tú)', 'host': 'anfitrión', 'Public room': 'Sala pública', 'Room {r}': 'Sala {r}', 'Starting in {n}…': 'Empieza en {n}…', 'Starting soon…': 'Empieza enseguida…',
    'Waiting for one more player. Bots fill the rest.': 'Falta un jugador más. Los bots completan el resto.', 'Press Start when everyone is in.': 'Toca Empezar cuando estén todos.',
    'Press Start when everyone is in. Bots fill the room to 4.': 'Toca Empezar cuando estén todos. Los bots completan la sala hasta 4.', 'Waiting for a friend, or tick the bots box.': 'Esperando a un amigo, o marca la casilla de bots.',
    'Waiting for the host to start.': 'Esperando a que el anfitrión empiece.', '{p} wins!': '¡Ganó {p}!', 'Everyone popped!': '¡Explotaron todos!', 'last one swimming': 'el último nadando',
    'popped in round {n}': 'explotó en la ronda {n}', 'Rematch': 'Revancha', 'Ask for a rematch': 'Pedir revancha', 'The next match starts in a moment.': 'La próxima partida empieza en un momento.',
    'Asked the host for a rematch…': 'Le pediste la revancha al anfitrión…', 'Finding a room…': 'Buscando una sala…', 'Joining {r}…': 'Entrando a {r}…',
    'Invite link copied. Friends open it and enter the code to join.': 'Enlace copiado. Tus amigos lo abren y entran con el código.',
    'You were invited to room {r}. Press Play in room to join.': 'Te invitaron a la sala {r}. Toca Jugar en la sala para entrar.',
    'Offline: playing without the divers count': 'Sin conexión: juegas sin la cuenta de buzos',
    'All public rooms are full right now. Try a room code.': 'Todas las salas públicas están llenas ahora. Prueba con un código de sala.',
    'That room is full ({n} players). Try another code.': 'Esa sala está llena ({n} jugadores). Prueba con otro código.',
    'Could not reach the game server. Check your connection, or play the Daily or Practice.': 'No se pudo conectar con el servidor del juego. Revisa tu conexión, o juega el Diario o la Práctica.',
    "Couldn't reach the game database. If you're on a school or work network it may be blocking it; try another network, or play the Daily or Practice.": 'No se pudo conectar con la base de datos del juego. Si estás en la red de la escuela o del trabajo, puede que la bloquee; prueba otra red, o juega el Diario o la Práctica.',
    'Signing in to the game server timed out. Check your connection.': 'Se tardó demasiado en entrar al servidor del juego. Revisa tu conexión.'
  });
  // Paragraphs with bold words inside are swapped whole (they carry data-i18n-html and data-noi18n).
  function rich() {
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      if (el.__en == null) el.__en = el.innerHTML;
      var en = el.__en.replace(/\s+/g, ' ').trim(), out = L.get() === 'en' ? el.__en : L.t(en);
      if (el.innerHTML !== out) el.innerHTML = out;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rich); else rich();
  document.addEventListener('backroom:lang', rich);
})();
