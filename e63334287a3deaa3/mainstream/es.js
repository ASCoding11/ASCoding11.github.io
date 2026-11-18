/* Mainstream: Spanish words for this game (see /e63334287a3deaa3/lang.js). English stays exactly as it is when the language is English.
   The prompts and answers come from Deepword's English bank and stay English (tagged "En inglés"). */
window.BackRoomLang && BackRoomLang.add({
    // the daily-puzzle shell (wordplay/kit.js) around the game
    '‹ Back': '‹ Volver', 'Statistics': 'Estadísticas', 'Privacy': 'Privacidad', 'Daily': 'Diario', 'Daily #{n}': 'Diario #{n}', 'Unlimited': 'Ilimitado', 'Mode': 'Modo',
    'Played': 'Jugadas', 'Win %': '% ganadas', 'Current streak': 'Racha actual', 'Max streak': 'Racha máxima', 'Distribution': 'Distribución', 'Next puzzle in': 'Próximo en',
    'Share': 'Compartir', 'Copied! Paste it anywhere.': '¡Copiado! Pégalo donde quieras.', "Couldn't copy, sorry": 'No se pudo copiar, perdón', '(unlimited)': '(ilimitado)', '(preview)': '(adelanto)',
    'Next in {t}': 'Próximo en {t}', 'Language': 'Idioma',
    "A new puzzle every day at midnight, your time, the same for everyone. Unlimited mode gives you random ones from the whole collection that don't count towards your stats. Every puzzle was written for this site. Here that means the prompts and the boards: the boards are estimates, not survey results. ·":
      'Un desafío nuevo cada día a la medianoche de tu hora, el mismo para todos. El modo Ilimitado te da desafíos al azar de toda la colección que no cuentan para tus estadísticas. Cada desafío se escribió para este sitio: las consignas y los tableros. Los tableros son estimaciones, no encuestas. Las consignas y respuestas están en inglés. ·',
    // How to play
    '<p>Ten prompts. For each one, type the answer you think <b>most people</b> would give.</p>': '<p>Diez consignas (en inglés). En cada una, escribe la respuesta que crees que daría <b>la mayoría de la gente</b>.</p>',
    "<ul><li>You get <b>{s} seconds</b> a prompt. If your answer isn't one we accept, try another while the clock runs. Your <b>first accepted answer is final</b>. You can pass.</li>":
      '<ul><li>Tienes <b>{s} segundos</b> por consigna. Si tu respuesta no es una de las que aceptamos, prueba otra mientras corre el reloj. Tu <b>primera respuesta aceptada es la definitiva</b>. Puedes pasar.</li>',
    '<li>Every prompt has a board of its <b>ten most common answers</b>. Here is what each place scores:</li></ul>': '<li>Cada consigna tiene un tablero con sus <b>diez respuestas más comunes</b>. Esto vale cada puesto:</li></ul>',
    "<ul><li>An accepted answer that isn't on the board scores <b>{o}</b>. A pass, or running out of time, scores <b>0</b>.</li>": '<ul><li>Una respuesta aceptada que no está en el tablero vale <b>{o}</b>. Pasar, o quedarse sin tiempo, vale <b>0</b>.</li>',
    '<li>The river gets wider as it goes: prompts 1 to 3 count <b>×1</b>, 4 to 7 <b>×2</b> and 8 to 10 <b>×3</b>, so the ending matters most. A perfect run is <b>{m}</b>.</li>':
      '<li>El río se ensancha a medida que avanza: las consignas 1 a 3 valen <b>×1</b>, de la 4 a la 7 <b>×2</b> y de la 8 a la 10 <b>×3</b>, así que el final es lo que más importa. Una partida perfecta suma <b>{m}</b>.</li>',
    '<li>Score <b>{p}</b> or more in the daily run to keep your streak going.</li></ul>': '<li>Suma <b>{p}</b> o más en la partida diaria para mantener tu racha.</li></ul>',
    '<p><b>The boards are our own prepared estimates</b> of what most people would say. They are not survey results, and they are not what other players answered.</p>':
      '<p><b>Los tableros son estimaciones nuestras</b> de lo que diría la mayoría. No son resultados de encuestas ni lo que respondieron otros jugadores.</p>',
    '<p>The clock stops while this window is open or the tab is hidden. If time runs out with an accepted answer still in the box, it counts.</p>': '<p>El reloj se detiene mientras esta ventana está abierta o la pestaña está oculta. Si se acaba el tiempo con una respuesta aceptada en el recuadro, cuenta.</p>',
    '<p>Would you sooner find the answer nobody else thinks of? <a href="/e63334287a3deaa3/deepword/">Deepword</a> is this game turned upside down.</p>': '<p>¿Prefieres encontrar la respuesta que nadie más piensa? <a href="/e63334287a3deaa3/deepword/">Deepword</a> es este juego dado vuelta.</p>',
    // stats
    'Daily runs by result': 'Partidas diarias por resultado', 'Best daily score': 'Mejor puntaje diario', 'Average score': 'Puntaje promedio', 'Top answers': 'Respuestas top',
    'Pure mainstream': 'Corriente pura', 'Full flow': 'A todo caudal', 'Main current': 'Corriente principal', 'In the flow': 'En la corriente', 'Backwater': 'Aguas quietas', 'Up the creek': 'En aprietos',
    // the river
    'Spring': 'Manantial', 'Stream': 'Arroyo', 'River': 'Río', 'number {n}': 'número {n}', 'off the board': 'fuera del tablero', 'passed': 'pasó', 'out of time': 'sin tiempo',
    'Your run: {a} of {b} prompts answered. Places so far: {c}.': 'Tu partida: {a} de {b} consignas respondidas. Puestos hasta ahora: {c}.',
    'Your run: not started. The river widens as later prompts are worth more.': 'Tu partida: sin empezar. El río se ensancha porque las últimas consignas valen más.', '{n} seconds left': 'Quedan {n} segundos',
    // the run
    'pts': 'pts', "The prompts didn't load": 'Las consignas no cargaron', 'Check your connection and reload the page.': 'Revisa tu conexión y recarga la página.',
    'Carry on': 'Seguir', "Start today's run": 'Empezar la partida de hoy', 'Start a practice run': 'Empezar una práctica', 'Daily run': 'Partida diaria', 'Practice run': 'Práctica',
    '{n} prompts · {s} s each': '{n} consignas · {s} s cada una', 'Prompt {a} of {b} is next': 'Sigue la consigna {a} de {b}', 'What would most people say?': '¿Qué diría la mayoría?',
    'You left in the middle of a prompt. Its clock picks up with <b>{n} seconds</b> left.': 'Te fuiste en el medio de una consigna. Su reloj sigue con <b>{n} segundos</b>.',
    'You have <b>{p}</b> points so far.': 'Llevas <b>{p}</b> puntos.',
    'Type the answer you think <b>most people</b> would give. The top answer on each board scores most, and later prompts count double, then triple.': 'Escribe la respuesta que crees que daría <b>la mayoría</b> (en inglés). La respuesta top de cada tablero vale más, y las últimas consignas valen el doble y después el triple.',
    'Practice runs are random and never touch your daily record.': 'Las prácticas son al azar y nunca tocan tu registro diario.',
    'The boards are our own estimates, not survey results. After the rarest answer, not the most common? Play <a href="/e63334287a3deaa3/deepword/">Deepword</a>.': 'Los tableros son estimaciones nuestras, no encuestas. ¿Buscas la respuesta más rara y no la más común? Juega <a href="/e63334287a3deaa3/deepword/">Deepword</a>.',
    'Type an answer': 'Escribe una respuesta', '{q}. Your answer': '{q}. Tu respuesta', 'Enter': 'Enviar', 'Pass': 'Pasar', 'Your first accepted answer is final': 'Tu primera respuesta aceptada es la definitiva',
    'Prompt {a} of {b}': 'Consigna {a} de {b}', 'Top answer <b>{p}</b>': 'Respuesta top <b>{p}</b>', 'Counts <b>×{m}</b>': 'Vale <b>×{m}</b>',
    "“{a}” isn't an answer we accept here. Try another.": '“{a}” no es una respuesta que aceptemos acá. Prueba otra.',
    'Top answer': 'Respuesta top', '#{n} on the board': '#{n} en el tablero', 'Accepted, but not on the board': 'Aceptada, pero no está en el tablero', 'Passed': 'Pasaste', 'Out of time': 'Sin tiempo',
    'You said {a}': 'Dijiste {a}', 'No answer given': 'Sin respuesta', 'The clock ran out': 'Se acabó el tiempo', 'See your result': 'Ver tu resultado', 'Next prompt': 'Siguiente consigna', 'Total <b>{t}</b>': 'Total <b>{t}</b>',
    'The board is our prepared estimate of what most people would say, not a survey.': 'El tablero es nuestra estimación de lo que diría la mayoría, no una encuesta.',
    'The board: the ten most common answers, by our estimate': 'El tablero: las diez respuestas más comunes, según nuestra estimación', '{n}, {a}, your answer, {p} points': '{n}, {a}, tu respuesta, {p} puntos',
    // the end
    'Prompt {n}, {q}: {a}{p}, {s} points. Open to see the board.': 'Consigna {n}, {q}: {a}{p}, {s} puntos. Ábrela para ver el tablero.',
    'Daily run #{n}': 'Partida diaria #{n}', '{a} of {b} on the board': '{a} de {b} en el tablero', 'of {m}': 'de {m}', 'streak kept': 'racha mantenida', '{p} keeps a streak': 'con {p} mantienes la racha',
    'practice, not counted': 'práctica, no cuenta', 'Play a practice run': 'Jugar una práctica', 'Another run': 'Otra partida', 'Tap a prompt to see its board.': 'Toca una consigna para ver su tablero.',
    'Want the opposite game? <a href="/e63334287a3deaa3/deepword/">Deepword</a> rewards the rarest answer.': '¿Quieres el juego opuesto? <a href="/e63334287a3deaa3/deepword/">Deepword</a> premia la respuesta más rara.'
});
