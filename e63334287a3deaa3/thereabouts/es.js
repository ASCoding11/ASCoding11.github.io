/* Thereabouts: Spanish words for this game (see /e63334287a3deaa3/lang.js). English stays exactly as it is when the language is English.
   The questions, worked steps, notes and sources are English prose by design (tagged "En inglés"); units are translated here.
   Typing a guess works the same in both languages (a dot for decimals, English number words), so scores never change. */
window.BackRoomLang && BackRoomLang.add({
    // the daily-puzzle shell (wordplay/kit.js) around the game
    '‹ Back': '‹ Volver', 'Statistics': 'Estadísticas', 'Privacy': 'Privacidad', 'Daily': 'Diario', 'Daily #{n}': 'Diario #{n}', 'Unlimited': 'Ilimitado', 'Mode': 'Modo',
    'Played': 'Jugadas', 'Win %': '% ganadas', 'Current streak': 'Racha actual', 'Max streak': 'Racha máxima', 'Distribution': 'Distribución', 'Next puzzle in': 'Próximo en',
    'Share': 'Compartir', 'Copied! Paste it anywhere.': '¡Copiado! Pégalo donde quieras.', "Couldn't copy, sorry": 'No se pudo copiar, perdón', '(unlimited)': '(ilimitado)', '(preview)': '(adelanto)',
    'Next in {t}': 'Próximo en {t}', 'Language': 'Idioma',
    "A new puzzle every day at midnight, your time, the same for everyone. Unlimited mode gives you random ones from the whole collection that don't count towards your stats. Every puzzle was written for this site. Answers were checked against the sources listed under each one on 16 November 2026. ·":
      'Un desafío nuevo cada día a la medianoche de tu hora, el mismo para todos. El modo Ilimitado te da preguntas al azar de toda la colección que no cuentan para tus estadísticas. Cada pregunta se escribió para este sitio. Las respuestas se revisaron con las fuentes que figuran debajo de cada una el 16 de noviembre de 2026. Las preguntas y los cálculos están en inglés. ·',
    'Answers were checked against the sources listed under each one on {d}.': 'Las respuestas se revisaron con las fuentes que figuran debajo de cada una el {d}.',
    'three estimates a day': 'tres estimaciones por día', 'Calculator': 'Calculadora', 'Hide': 'Ocultar', 'Show': 'Mostrar', 'Earlier sums': 'Cuentas anteriores', 'Sum': 'Cuenta',
    'Use this as my guess ↑': 'Usar esto como mi respuesta ↑', 'Past days': 'Días anteriores',
    '<p>Three questions a day. Each answer is a number that <b>nobody knows off by heart</b>, and you are not supposed to. The game is to <b>work it out roughly</b> from things you do know.</p>':
      '<p>Tres preguntas por día (en inglés). Cada respuesta es un número que <b>nadie sabe de memoria</b>, y no hace falta saberlo. El juego es <b>calcularlo más o menos</b> a partir de cosas que sí sabes.</p>',
    '<ul><li>Break the question into smaller guesses you can make, then multiply them up. The <b>calculator</b> is there to be used.</li>': '<ul><li>Divide la pregunta en estimaciones más chicas que puedas hacer y después multiplícalas. La <b>calculadora</b> está para usarla.</li>',
    '<li>Type your number and <b>Lock in</b>. You get one guess per question.</li>': '<li>Escribe tu número y toca <b>Confirmar</b>. Tienes un intento por pregunta.</li>',
    '<li>Your score is <b>how many times out you were</b>. If the answer is 100, a guess of 200 scores 2× and so does a guess of 50. A perfect guess is 1×, and lower is better.</li>':
      '<li>Tu puntaje es <b>cuántas veces te alejaste</b>. Si la respuesta es 100, decir 200 da 2× y decir 50 también. Un acierto perfecto es 1×, y menos es mejor.</li>',
    '<li>Then you see the answer and a short <b>back of the envelope</b> working that gets close to it, with where the numbers came from.</li></ul>':
      '<li>Después ves la respuesta y una <b>cuenta rápida</b> que se acerca a ella, con de dónde salen los números.</li></ul>',
    "<p>Big numbers can be typed as <b>2,500,000</b>, <b>2.5 million</b>, <b>40k</b> or <b>3e6</b>. The day's score is the average of your three.</p>":
      '<p>Los números grandes se pueden escribir como <b>2,500,000</b>, <b>2.5 million</b>, <b>40k</b> o <b>3e6</b> (con punto para los decimales y las palabras en inglés). El puntaje del día es el promedio de tus tres.</p>',
    // categories, difficulty, kinds, grades
    'Everyday life': 'Vida diaria', 'Food': 'Comida', 'Sport': 'Deporte', 'The body': 'El cuerpo', 'Nature': 'Naturaleza', 'Space': 'Espacio', 'Technology': 'Tecnología', 'Transport': 'Transporte', 'Geography': 'Geografía',
    'Easy': 'Fácil', 'Medium': 'Media', 'Hard': 'Difícil', 'Measured': 'Medido', 'Calculated': 'Calculado', 'Estimated': 'Estimado',
    'This answer is a published count or measurement.': 'Esta respuesta es un conteo o una medición publicada.', 'This answer is worked out exactly from the figures shown.': 'Esta respuesta se calcula exactamente con los datos que se muestran.',
    'This answer is itself an estimate, so nobody knows it exactly.': 'Esta respuesta es en sí una estimación, así que nadie la sabe exacta.',
    'Spot on': 'Clavado', 'Dead on': 'Justo', 'Sharp': 'Muy cerca', 'Right area': 'Por la zona', 'Roughly': 'Más o menos', 'Wide of it': 'Lejos', 'Way out': 'Muy lejos',
    // the question
    '<span>Practice: </span><b>{n}</b> answered, average <b>{a}</b>': '<span>Práctica: </span><b>{n}</b> respondidas, promedio <b>{a}</b>', 'Practice: nothing here counts': 'Práctica: acá nada cuenta',
    'Past day <b>#{n}</b> · {d}': 'Día anterior <b>#{n}</b> · {d}', 'Today: <b>{a}</b>': 'Hoy: <b>{a}</b>', 'Question <b>{n}</b> of 3': 'Pregunta <b>{n}</b> de 3', 'Questions': 'Preguntas',
    'Question {n}': 'Pregunta {n}', 'Now': 'Ahora', 'Next': 'Después', 'Result': 'Resultado', 'Your estimate': 'Tu estimación', 'Your estimate, in {u}': 'Tu estimación, en {u}', 'Read as': 'Se lee como',
    'Add:': 'Agregar:', 'Adds the English word "{w}", which the box reads': 'Agrega la palabra en inglés "{w}", que el recuadro entiende', 'Lock in': 'Confirmar',
    'One guess. Split it into smaller guesses and multiply them up: the calculator is part of the game.': 'Un solo intento. Divídelo en estimaciones más chicas y multiplícalas: la calculadora es parte del juego.',
    "The questions didn't load. Check your connection and reload the page.": 'Las preguntas no cargaron. Revisa tu conexión y recarga la página.',
    // the answer
    'Your guess was {m} too high': 'Tu respuesta fue {m} más alta', 'Your guess was {m} too low': 'Tu respuesta fue {m} más baja', 'Your guess was {m}': 'Tu respuesta fue {m}',
    'answer': 'respuesta', 'you': 'tú', 'you ›': 'tú ›', '‹ you': '‹ tú', 'Right on the accepted answer.': 'Justo en la respuesta aceptada.',
    'Your guess was {m} times too high.': 'Tu respuesta fue {m} veces demasiado alta.', 'Your guess was {m} times too low.': 'Tu respuesta fue {m} veces demasiado baja.',
    'too high': 'demasiado alta', 'too low': 'demasiado baja', 'Your guess': 'Tu respuesta', 'Accepted answer': 'Respuesta aceptada', '← too low': '← demasiado baja', 'each mark is ten times': 'cada marca es diez veces',
    'too high →': 'demasiado alta →', 'Back of the envelope': 'La cuenta rápida', 'This quick working lands on about {r}; the accepted answer is {a}.': 'Esta cuenta rápida da más o menos {r}; la respuesta aceptada es {a}.',
    'Sources ({n})': 'Fuentes ({n})', 'checked {d}': 'revisadas el {d}', 'Another question': 'Otra pregunta', 'See the result': 'Ver el resultado', 'Next question': 'Siguiente pregunta', 'Back to today': 'Volver a hoy',
    // the day's result
    'Day #{n} · {d}': 'Día #{n} · {d}', 'You {g} · answer {a}': 'Tú: {g} · respuesta: {a}', "Today's average": 'Promedio de hoy', 'Question {n}: {m}. Show the working': 'Pregunta {n}: {m}. Mostrar la cuenta', 'My statistics': 'Mis estadísticas',
    'Practise more': 'Practicar más', 'Three new questions in': 'Tres preguntas nuevas en', '. Tap a line above to see its working again.': '. Toca una línea de arriba para ver su cuenta otra vez.',
    "Past days don't change your statistics or your streak.": 'Los días anteriores no cambian tus estadísticas ni tu racha.', 'Almost nothing in it on all three.': 'Casi exacto en las tres.',
    'On average you were within half as much again of the answer.': 'En promedio quedaste a menos de una vez y media de la respuesta.', 'On average you were within double or half.': 'En promedio quedaste entre el doble y la mitad.',
    'On average you were {m} times out. One big miss does that.': 'En promedio te alejaste {m} veces. Un error grande hace eso.', 'On average you were {m} times out. Count the zeros twice next time.': 'En promedio te alejaste {m} veces. La próxima, cuenta los ceros dos veces.',
    'average {m} ({g})': 'promedio {m} ({g})', '▲ too high  ▼ too low  1× is perfect': '▲ demasiado alta  ▼ demasiado baja  1× es perfecto',
    // statistics and past days
    'Average': 'Promedio', 'Best day': 'Mejor día', 'Day streak': 'Racha de días', 'High or low?': '¿Alto o bajo?',
    "You don't lean either way: your guesses land high about as often as low.": 'No te inclinas para ningún lado: tus respuestas caen altas más o menos tan seguido como bajas.',
    'You tend to guess high: a typical guess of yours is {m} times the answer.': 'Tiendes a decir de más: una respuesta típica tuya es {m} veces la respuesta.',
    'You tend to guess low: a typical guess of yours is the answer divided by {m}.': 'Tiendes a decir de menos: una respuesta típica tuya es la respuesta dividida por {m}.',
    '÷10 low': '÷10 bajo', 'high ×10': 'alto ×10', '{l} low · {h} high · {s} spot on': '{l} bajas · {h} altas · {s} clavadas',
    'Finish a day and your numbers will show up here: your average, your best day, and whether you tend to guess high or low.': 'Termina un día y tus números van a aparecer acá: tu promedio, tu mejor día y si tiendes a decir de más o de menos.',
    'Your daily averages': 'Tus promedios diarios', 'Longest streak: {n} day.': 'Racha más larga: {n} día.', 'Longest streak: {n} days.': 'Racha más larga: {n} días.',
    "Only the daily game counts here; Unlimited and past days don't. Everything is kept in this browser and nowhere else.": 'Acá solo cuenta el juego diario; Ilimitado y los días anteriores no. Todo se guarda en este navegador y en ningún otro lado.',
    'Next questions in': 'Próximas preguntas en', 'Not played': 'Sin jugar', 'Played here:': 'Jugado acá:', 'On the day:': 'Ese día:',
    "Play any earlier day's three questions. They don't count towards your statistics or your streak.": 'Juega las tres preguntas de cualquier día anterior. No cuentan para tus estadísticas ni tu racha.',
    'There are no earlier days yet. Come back tomorrow.': 'Todavía no hay días anteriores. Vuelve mañana.',
    // calculator
    'Clear': 'Borrar todo', 'Delete': 'Borrar', 'Divide': 'Dividir', 'Times': 'Por', 'Minus': 'Menos', 'To the power of': 'Elevado a', 'Plus': 'Más', 'Pi': 'Pi', 'Square root': 'Raíz cuadrada',
    'Times ten to the power of': 'Por diez elevado a', 'Equals': 'Igual', 'Your sums stay here. Tap one to use its answer again.': 'Tus cuentas quedan acá. Toca una para volver a usar su resultado.',
    'Put this answer into the sum': 'Poner este resultado en la cuenta', 'Calculator ': 'Calculadora',
    // messages from core.js (reading a guess, the calculator)
    "Type a number first.": 'Primero escribe un número.', "I couldn't read that as a number. Try 2500000, 2,500,000, 2.5 million, 40k or 2.5e6.": 'No pude leer eso como número. Prueba 2500000, 2,500,000, 2.5 million, 40k o 2.5e6.',
    'Use a dot for the decimal point (2.5, not 2,5), and commas only between groups of three digits.': 'Usa punto para los decimales (2.5, no 2,5), y comas solo entre grupos de tres cifras.',
    'I don\'t know the word "{w}". You can use thousand, million, billion or trillion (or k, m, bn).': 'No conozco la palabra "{w}". Puedes usar thousand, million, billion o trillion (o k, m, bn), en inglés.',
    'Is that "{a}" short for {b}, or for {c}? Type the word {d} in full, or leave the unit off.': '¿Esa "{a}" es de {b} o de {c}? Escribe la palabra {d} completa, o no pongas la unidad.',
    'That number is too big for this game to score. Try something smaller.': 'Ese número es demasiado grande para este juego. Prueba con uno más chico.',
    "A guess can't be negative: every answer here is a count or a size, so it is more than zero.": 'La respuesta no puede ser negativa: acá todas son conteos o tamaños, así que son mayores que cero.',
    "A guess can't be zero. The score is how many times too big or too small you were, and nothing is zero times anything. Try your smallest sensible number.": 'La respuesta no puede ser cero. El puntaje es cuántas veces te pasaste o te quedaste corto, y nada es cero veces algo. Prueba con tu número razonable más chico.',
    'That is outside anything this game asks about. Check the number of zeros.': 'Eso está fuera de todo lo que pregunta este juego. Revisa la cantidad de ceros.',
    'A bracket is missing its partner.': 'A un paréntesis le falta su pareja.', 'I don\'t know "{w}".': 'No conozco "{w}".', 'Put brackets after {a}, like {b}.': 'Pon paréntesis después de {a}, como {b}.',
    'Something is missing at the end.': 'Falta algo al final.', 'That comes out too big to show.': 'Da un número demasiado grande para mostrar.', 'There is no earlier answer yet.': 'Todavía no hay un resultado anterior.',
    'Type a sum first.': 'Primero escribe una cuenta.', 'Use a dot for decimals, and commas only between groups of three digits.': 'Usa punto para los decimales, y comas solo entre grupos de tres cifras.',
    "You can't divide by zero.": 'No se puede dividir por cero.', "You can't take the square root of a negative number.": 'No se puede sacar la raíz cuadrada de un número negativo.',
    "I can't work that out. Check the brackets and signs.": 'No puedo calcular eso. Revisa los paréntesis y los signos.',
    // units
    'litres': 'litros', 'km': 'km', 'metres': 'metros', 'km/h': 'km/h', 'years': 'años', 'seconds': 'segundos', 'kg': 'kg', 'tonnes': 'toneladas', 'hours': 'horas', 'days': 'días', 'times': 'veces',
    'steps': 'pasos', 'sheets': 'hojas', 'people': 'personas', 'grams': 'gramos', 'cells': 'células', 'balls': 'pelotas', 'Earths': 'Tierras', 'watts': 'vatios', 'turns': 'vueltas', 'trees': 'árboles',
    'towers': 'torres', 'ticks': 'tics', 'tickets': 'entradas', 'stars': 'estrellas', 'sleepers': 'durmientes', 'revolutions': 'revoluciones', 'positions': 'posiciones', 'pizzas': 'pizzas', 'pixels': 'píxeles',
    'photos': 'fotos', 'pedal turns': 'pedaleadas', 'passwords': 'contraseñas', 'orbits': 'órbitas', 'minutes': 'minutos', 'milliseconds': 'milisegundos', 'addresses': 'direcciones', 'ancestors': 'antepasados', 'ants': 'hormigas', 'babies': 'bebés', 'beats': 'latidos', 'blinks': 'parpadeos', 'blocks': 'bloques', 'breaths': 'respiraciones', 'bricks': 'ladrillos', 'cm': 'cm', 'coins': 'monedas', 'cups': 'tazas', 'doublings': 'duplicaciones', 'drops': 'gotas', 'eggs': 'huevos', 'flashes': 'destellos', 'frames': 'cuadros', 'games': 'partidas', 'gigabytes': 'gigabytes', 'hairs': 'pelos', 'hands': 'manos', 'handshakes': 'apretones de manos', 'kcal': 'kcal', 'kernels': 'granos', 'km²': 'km²', 'km³': 'km³', 'laps': 'vueltas', 'lengths': 'largos', 'matches': 'partidos', 'meals': 'comidas', 'mm': 'mm', 'm²': 'm²', 'm³': 'm³'
});
