/* Hotspot: Spanish for this game (see /e63334287a3deaa3/lang.js). Loaded right after geo-data/countries.js and before geo.js:
   with Spanish on, each country's shown name becomes its Spanish name (the browser's own list, Intl.DisplayNames), and the
   English name becomes an alias, so English and Spanish names both work in the guess box. Only the shown names change;
   saved guesses and the daily answer use the country ids, as before. The names follow the language the page was opened in. */
(function () {
  var L = window.BackRoomLang; if (!L) return;
  if (L.get() === 'es' && window.GEO_DATA && window.Intl && Intl.DisplayNames) {
    try {
      var dn = new Intl.DisplayNames(['es-419', 'es'], { type: 'region' });
      window.GEO_DATA.list.forEach(function (r) {
        var es = dn.of(r[0].toUpperCase());
        if (es && es.toUpperCase() !== r[0].toUpperCase() && es !== r[1]) { r[2] = r[1] + (r[2] ? '|' + r[2] : ''); r[1] = es; }
      });
    } catch (e) {}
  }
  var HOW = [
    ["<p>Find the <b>mystery country</b>. Every guess is coloured on the globe by how close it is: the nearer its border is to the mystery country's border, the hotter the colour.</p>",
     '<p>Encuentra el <b>país misterioso</b>. Cada intento se pinta en el globo según lo cerca que esté: cuanto más cerca está su frontera de la frontera del país misterioso, más caliente es el color.</p>'],
    ['>Far away<', '>Muy lejos<'], ['>Getting warm<', '>Te vas acercando<'], ['>It shares a border<', '>Comparte una frontera<'],
    ['<li>Guesses are as many as you like. The list keeps the nearest at the top.</li>', '<li>Puedes probar todas las veces que quieras. La lista deja los más cercanos arriba.</li>'],
    ['<li>Distances are between the <b>closest points of the two borders</b>, so a neighbour is 0 km.</li>', '<li>Las distancias se miden entre los <b>puntos más cercanos de las dos fronteras</b>, así que un país vecino está a 0 km.</li>'],
    ['<li><b>Drag</b> to turn the globe, <b>pinch</b> or scroll to zoom, tap a guessed country to see its name. Small countries get a ring so you can spot them.</li>',
     '<li><b>Arrastra</b> para girar el globo, <b>pellizca</b> o usa la rueda para hacer zoom, y toca un país que probaste para ver su nombre. Los países chicos tienen un anillo para que los encuentres.</li>'],
    ['<li>Type a name and pick it from the suggestions. Common names work too: UK, USA, Ivory Coast, Czech Republic.</li>',
     '<li>Escribe un nombre y elígelo de las sugerencias. Sirven los nombres en español y en inglés, y los comunes también: Reino Unido, EE. UU., UK, USA.</li>']
  ];
  window.HotspotHow = function (html) { if (L.get() !== 'es') return html; HOW.forEach(function (p) { html = html.split(p[0]).join(p[1]); }); return html; };
  L.add({
    '‹ Back': '‹ Volver', 'Statistics': 'Estadísticas', 'Privacy': 'Privacidad', 'Daily': 'Diario', 'Daily #{n}': 'Diario #{n}', 'Unlimited': 'Ilimitado', 'Mode': 'Modo',
    'Guess': 'Probar', 'Guess a country…': 'Escribe un país…', 'Type a country…': 'Escribe un país…', 'Country name': 'Nombre del país', 'Start typing, then pick a country.': 'Empieza a escribir y elige un país.',
    'No country matches that.': 'Ningún país coincide.', 'Pick one of the suggestions': 'Elige una de las sugerencias', 'You already guessed {c}': 'Ya probaste {c}',
    "Use your phone's keyboard": 'Usar el teclado del celular', 'Globe: drag to turn, pinch or scroll to zoom': 'Globo: arrastra para girar, pellizca o usa la rueda para hacer zoom',
    'Zoom in': 'Acercar', 'Zoom out': 'Alejar', 'Guess distribution': 'Distribución de intentos', 'Next puzzle in': 'Próximo en', 'Share': 'Compartir',
    'Played': 'Jugadas', 'Win %': '% ganadas', 'Current streak': 'Racha actual', 'Max streak': 'Racha máxima', 'Gave up': 'Rendido',
    'Copied! Paste it anywhere.': '¡Copiado! Pégalo donde quieras.', "Couldn't copy, sorry": 'No se pudo copiar, perdón',
    "A new puzzle every day at midnight, your time, the same for everyone. Unlimited mode gives you random ones that don't count towards your stats. Country shapes from Natural Earth (public domain). ·":
      'Un desafío nuevo cada día a la medianoche de tu hora, el mismo para todos. El modo Ilimitado te da países al azar que no cuentan para tus estadísticas. Formas de los países de Natural Earth (dominio público). ·',
    "Today's mystery country is hidden somewhere on the globe. Make a first guess anywhere.": 'El país misterioso de hoy está escondido en algún lugar del globo. Prueba con cualquier país para empezar.',
    'A random mystery country. Make a first guess anywhere.': 'Un país misterioso al azar. Prueba con cualquier país para empezar.',
    'Show {c} on the globe': 'Mostrar {c} en el globo', 'Found it!': '¡Lo encontraste!', 'Tap again to give up': 'Toca otra vez para rendirte', 'Give up and show it': 'Rendirse y mostrarlo',
    '<b>{n}</b> guess': '<b>{n}</b> intento', '<b>{n}</b> guesses': '<b>{n}</b> intentos', ' · nearest <b>{d}</b>': ' · el más cerca a <b>{d}</b>',
    'Found it in {n} guess!': '¡Lo encontraste en {n} intento!', 'Found it in {n} guesses!': '¡Lo encontraste en {n} intentos!', 'It was {c}': 'Era {c}',
    'The mystery country was <b>{c}</b> ({k}).': 'El país misterioso era <b>{c}</b> ({k}).', 'You made {n} guesses. The nearest was {d} away.': 'Hiciste {n} intentos. El más cercano estaba a {d}.',
    'Play unlimited': 'Jugar ilimitado', 'Next country': 'Siguiente país', 'Next in {t}': 'Próximo en {t}',
    '🌍 found in {n} guess': '🌍 encontrado en {n} intento', '🌍 found in {n} guesses': '🌍 encontrado en {n} intentos', '🌍 gave up after {n} (nearest {d})': '🌍 me rendí después de {n} (el más cerca a {d})',
    'Africa': 'África', 'Asia': 'Asia', 'Europe': 'Europa', 'North America': 'América del Norte', 'South America': 'América del Sur', 'Oceania': 'Oceanía', 'Antarctica': 'Antártida'
  });
})();
