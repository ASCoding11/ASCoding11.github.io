/* Yardstick: Spanish for this game (see /e63334287a3deaa3/lang.js). English stays exactly as it is when the language is English.
   The game is about sizes, so it is fully Spanish: the page, plus each object's name, description, note and fact (OBJ below,
   in our own words, keyed by the object's id in objects.js). Sources keep their published titles. If objects.js gains an
   object that has no Spanish here, it simply shows in English. */
(function () {
  var L = window.BackRoomLang; if (!L) return;
  // Each object: [name, which one exactly, note (or ''), fact], in our own words. Keyed by the object's id.
  var OBJ = {
    'golf-ball': ['Pelota de golf', 'una pelota reglamentaria, por su parte más ancha', '1.68 pulgadas es el tamaño mínimo que permiten las reglas del golf, y casi todas las pelotas se fabrican justo de ese tamaño', 'Los hoyuelos no son decoración: una pelota con hoyuelos vuela más o menos el doble que una lisa.'],
    'tennis-ball': ['Pelota de tenis', 'una pelota oficial de partido', 'la Federación Internacional de Tenis permite de 6.54 a 6.86 cm', 'Si apilas unas 26, llegas a la coronilla de un hombre promedio.'],
    'bowling-ball': ['Bola de bolos', 'una bola reglamentaria de diez bolos', 'las reglas permiten de 8.5 a 8.595 pulgadas de diámetro', 'Todas las bolas legales miden lo mismo, pesen lo que pesen: una de 6 libras y una de 16 solo cambian por dentro.'],
    'soccer-ball': ['Pelota de fútbol', 'una pelota de partido de tamaño completo (número 5)', 'de 68 a 70 cm de circunferencia, o sea de 21.6 a 22.3 cm de diámetro', 'El diseño clásico tiene 12 pentágonos y 20 hexágonos cosidos en una casi esfera.'],
    'basketball': ['Pelota de básquet', 'una pelota de partido de la NBA (número 7)', '29.5 pulgadas de circunferencia, que da 23.85 cm de diámetro', 'El aro mide 18 pulgadas de ancho, así que dos de estas no llegan a pasar juntas.'],
    'bowling-pin': ['Bolo', 'un bolo reglamentario', '15 pulgadas según el reglamento de la USBC', 'Un bolo es más alto que el ancho de una pelota de básquet, pero pesa solo un kilo y medio.'],
    'world-cup-trophy': ['Copa del Mundo de la FIFA', 'el trofeo que se entrega desde 1974, de la base a la punta', '', 'Es de oro macizo de 18 quilates y pesa poco más de 6 kg, más o menos lo que una bola de bolos.'],
    'stanley-cup': ['Copa Stanley', 'el trofeo de hockey sobre hielo tal como es hoy, de la base al cuenco', '35 1/4 pulgadas', 'No para de crecer: los nombres de los campeones se graban en sus anillos, y cuando uno se llena se retira para hacer lugar a uno nuevo.'],
    'hurdle': ['Valla de velocidad', 'a la altura de las vallas cortas de hombres', '42 pulgadas, la de los 110 m con vallas', 'Los mejores velocistas saltan diez de estas en menos de 13 segundos casi sin perder el paso.'],
    'man': ['Hombre estadounidense promedio', 'la altura media de los hombres adultos de Estados Unidos', '68.9 pulgadas, de la encuesta de los CDC de 2021 a 2023 (hombres de 20 años o más)', 'La mujer estadounidense promedio de la misma encuesta mide 63.5 pulgadas, unos 14 cm menos.'],
    'wadlow': ['Robert Wadlow', 'la persona más alta medida de forma confiable', '8 pies 11.1 pulgadas, medido en 1940', 'A los ocho años ya era más alto que su papá, y seguía creciendo cuando murió a los 22.'],
    'phone-box': ['Cabina telefónica roja', 'el clásico quiosco británico K6, del suelo a la punta del techo abovedado', '8 pies 3 pulgadas', 'Pesa unas 0.7 toneladas porque es de hierro fundido.'],
    'soda-can': ['Lata de gaseosa', 'una lata estándar de EE. UU. de 12 onzas líquidas', '4.83 pulgadas', 'Si apilas unas catorce latas, la torre es tan alta como un hombre promedio.'],
    'aa-battery': ['Pila AA', 'parada, con el botón incluido', 'de 49.5 a 50.5 mm', 'Treinta y cinco paradas una sobre otra miden lo mismo que un hombre promedio.'],
    'iphone': ['iPhone 15', 'el iPhone 15 de Apple (2023), parado, visto de atrás', '', 'Doce puestos uno sobre otro miden más o menos lo que un hombre promedio.'],
    'oscar': ['Estatuilla del Oscar', 'la estatuilla del Premio de la Academia, con la base', '13.5 pulgadas', 'En la tele parece liviana, pero pesa 3.9 kg, más o menos lo que un bidón de casi 4 litros de leche.'],
    'giraffe': ['Jirafa', 'un adulto completamente desarrollado, del suelo a la punta de los cuernos', 'los adultos miden de 4.3 a 5.7 m, y los machos son los más altos', 'Solo el cuello puede medir unos dos metros, y aun así tiene siete vértebras en el cuello, las mismas que tú.'],
    'elephant': ['Elefante africano de sabana', 'un macho adulto promedio, hasta el hombro, que es su punto más alto', '', 'Es el animal más grande que camina sobre la tierra, y un macho promedio pesa unas seis toneladas.'],
    'ostrich': ['Avestruz', 'un macho adulto parado, hasta la coronilla', 'los machos miden de 2.1 a 2.75 m', 'Es el ave viva más alta, y su ojo, de 5 cm, es el más grande de todos los animales terrestres.'],
    'great-white': ['Tiburón blanco', 'una hembra que acaba de llegar a adulta, del hocico a la punta de la cola', 'las hembras son adultas con 15 a 16 pies, los machos con apenas 11 a 13', 'Las hembras son las más grandes, y el tiburón blanco más largo medido con precisión en un estudio del Pacífico pasaba apenas los 6 m.'],
    'orca': ['Orca', 'un macho adulto, del hocico a la cola', 'los machos suelen medir de 6 a 8 m', 'Aunque le dicen ballena asesina, es el miembro más grande de la familia de los delfines.'],
    'hope-whale': ['Ballena azul "Hope"', 'la ballena azul cuyo esqueleto cuelga en el Museo de Historia Natural de Londres, del hocico a la cola', '', 'Era una hembra joven que quedó varada en Irlanda en 1891; las ballenas azules más grandes son todavía más largas.'],
    'lolong': ['Lolong, el cocodrilo', 'un cocodrilo de agua salada capturado en Filipinas en 2011, el más grande medido en cautiverio, del hocico a la cola', '', 'Pesaba más de una tonelada, y hicieron falta unas cien personas para sacarlo del arroyo.'],
    'sophie': ['Sophie, el estegosaurio', 'el esqueleto de estegosaurio más completo que se conoce, en el Museo de Historia Natural de Londres, del hocico a la cola', 'mide 2.9 m de alto', 'Sophie es del tamaño de una camioneta grande, y se encontró casi entera: solo faltaban el brazo izquierdo y la base de la cola.'],
    'sue': ['Sue, el T. rex', 'el tiranosaurio del Field Museum, del hocico a la cola', 'unos 40 pies; medida a lo largo de la columna da de 12.3 a 12.8 m', 'Sue medía unos 4 m de alto a la cadera, y se recuperó más del 90% del esqueleto.'],
    'smart': ['Smart Fortwo', 'el auto urbano de dos plazas (desde 2007), de paragolpes a paragolpes', '', 'Cuatro estacionados uno detrás del otro siguen siendo más cortos que un colectivo de dos pisos de Londres.'],
    'mini': ['Mini original', 'el Mini sedán de 1959, de paragolpes a paragolpes', '', 'Las ruedas de diez pulgadas, empujadas hasta las esquinas, dejaban cuatro quintos del piso para gente y equipaje.'],
    'beetle': ['Volkswagen Escarabajo', 'el clásico Escarabajo enfriado por aire, de paragolpes a paragolpes', 'de 4.08 a 4.14 m según el año', 'Se fabricaron más de 21 millones en 65 años, todos con el motor atrás.'],
    'routemaster': ['Colectivo de dos pisos de Londres', 'el New Routemaster de 2012, de paragolpes a paragolpes', 'mide 4.39 m de alto', 'Es casi tres metros más largo que el viejo Routemaster y tiene tres puertas y dos escaleras.'],
    'flying-scotsman': ['Flying Scotsman', 'la locomotora a vapor con su ténder, de tope a tope', '70 pies', 'En 1934 fue la primera locomotora a vapor cronometrada oficialmente a 100 millas por hora.'],
    'concorde': ['Concorde', 'el avión de pasajeros supersónico, de la nariz a la cola', '', 'A dos veces la velocidad del sonido se calentaba tanto que se estiraba unos 20 cm en vuelo.'],
    'boeing-747': ['Boeing 747-8', 'el 747-8, el más largo de los jumbos, de la nariz a la cola', '250 pies 2 pulgadas', 'Su cola es tan alta como un edificio de seis pisos.'],
    'a380': ['Airbus A380', 'el A380-800, el avión de pasajeros más grande jamás construido, de la nariz a la cola', '', 'Tiene dos pisos completos de pasajeros de punta a punta y se le pueden poner más de 800 asientos.'],
    'orbiter': ['Orbitador del transbordador espacial', 'el orbitador alado solo, de la nariz a las toberas de los motores', '', 'Despegaba como un cohete pero aterrizaba planeando, con una sola oportunidad de hacer bien la aproximación.'],
    'shuttle-stack': ['Transbordador espacial al despegar', 'todo el conjunto en la plataforma: orbitador, tanque de combustible y dos cohetes impulsores', '', 'Los dos impulsores blancos hacían casi toda la fuerza y se apagaban a los dos minutos.'],
    'falcon-9': ['Falcon 9', 'el Falcon 9 actual en la plataforma, con su cofia de carga', '', 'Su primera etapa vuelve y aterriza parada, y algunos impulsores ya volaron decenas de veces.'],
    'saturn-v': ['Saturno V', 'el cohete lunar del Apolo con la nave y la torre de escape arriba', '363 pies', 'Se lanzaron trece, y nueve de ellos llevaron astronautas a la Luna o alrededor de ella.'],
    'hindenburg': ['Dirigible Hindenburg', 'el zepelín LZ 129 de 1936, de la nariz a la cola', '', 'Fue la aeronave más grande que voló jamás: más largo que tres jumbos.'],
    'titanic': ['RMS Titanic', 'eslora total, de proa a popa (dibujado fuera del agua, hasta la quilla)', '882 pies 9 pulgadas', 'Solo tres de las cuatro chimeneas funcionaban; la cuarta era casi solo para que se viera bien y para ventilar.'],
    'gerald-ford': ['Portaaviones USS Gerald R. Ford', 'el portaaviones CVN-78 de la Marina de EE. UU., eslora total', '1,106 pies', 'Su cubierta de vuelo es más larga que tres canchas de fútbol americano puestas una tras otra.'],
    'icon-of-the-seas': ['Icon of the Seas', 'el crucero de Royal Caribbean de 2024, de proa a popa', '', 'Es unos 95 m más largo que el Titanic y lleva más de 7,000 pasajeros.'],
    'credit-card': ['Tarjeta de crédito', 'la tarjeta bancaria estándar, por su lado largo', 'tamaño ISO/IEC 7810 ID-1: 85.60 por 53.98 mm', 'Las tarjetas de banco, los registros de conducir y casi todos los documentos tienen exactamente este tamaño para entrar en las mismas ranuras y billeteras.'],
    'football': ['Pelota de fútbol americano', 'una pelota de partido de la NFL, de punta a punta', 'de 11 a 11 1/4 pulgadas', 'La misma forma puntiaguda que la hace girar tan bien es la razón de que nadie sepa para dónde va a picar.'],
    'tennis-racket': ['Raqueta de tenis', 'una raqueta estándar de adulto, del mango a la punta', '27 pulgadas; las reglas permiten hasta 29', 'Hasta 1997 las raquetas podían medir hasta 32 pulgadas, cuando el límite bajó a 29.'],
    'barbell': ['Barra olímpica', 'una barra de levantamiento de pesas masculino, de punta a punta', '', 'La barra sola pesa 20 kg, y los mejores levantadores le ponen más de 240 kg encima.'],
    'grand-piano': ['Piano de cola de concierto', 'Steinway Modelo D, del teclado a la cola', '8 pies 11 3/4 pulgadas', 'Tiene unas 12,000 piezas, y sus cuerdas tiran del marco de hierro con una fuerza de unas 20 toneladas.'],
    'brandenburg-gate': ['Puerta de Brandeburgo', 'la puerta de Berlín, del suelo a la punta de la estatua del carro', 'la puerta de piedra sola mide unos 20 m; la estatua de arriba suma el resto', 'Sus cinco pasajes tenían categorías: solo la realeza podía usar el ancho del medio.'],
    'christ-redeemer': ['Cristo Redentor', 'la estatua de Río de Janeiro sola, sin el pedestal', 'el pedestal suma otros 8 m', 'Sus brazos miden 28 m de punta a punta de los dedos, casi tanto como su altura.'],
    'arc-de-triomphe': ['Arco de Triunfo', 'el arco en lo alto de los Campos Elíseos de París, altura total', '', 'En 1919 un piloto pasó volando con un biplano justo por el medio.'],
    'pisa': ['Torre de Pisa', 'del suelo a la punta', '55.86 m del lado bajo, 56.67 m del lado alto', 'Empezó a inclinarse mientras todavía la construían, así que los pisos de arriba se hicieron un poco curvos para compensar.'],
    'sydney-opera-house': ['Ópera de Sídney', 'hasta la punta de su cubierta más alta', '', 'Las cubiertas parecen velas, pero todas salen de la superficie de la misma esfera imaginaria.'],
    'taj-mahal': ['Taj Mahal', 'la tumba de Agra, del suelo a la punta del remate de la cúpula', '', 'Los cuatro minaretes se inclinan un poco hacia afuera, para que en un terremoto caigan lejos de la tumba.'],
    'general-sherman': ['Árbol General Sherman', 'la secuoya gigante de California que es el árbol vivo más grande en volumen', '', 'Está lejos de ser el árbol más alto, pero su tronco tiene más madera que cualquier otro árbol de la Tierra.'],
    'hyperion': ['Hyperion', 'una secuoya roja de California, el árbol vivo más alto que se conoce', 'según la medición de 2026', 'Su ubicación exacta se mantiene en secreto y está prohibido visitarlo, para que nadie le pise las raíces.'],
    'statue-of-liberty': ['Estatua de la Libertad', 'del suelo a la punta de la antorcha, con el pedestal', '305 pies; la estatua sola mide 46 m', 'Su piel de cobre es apenas tan gruesa como dos monedas juntas.'],
    'big-ben': ['Big Ben', 'la Torre Elizabeth de Londres, donde está la campana llamada Big Ben', '316 pies', 'Cada esfera del reloj mide 7 m, y los minuteros recorren unos 190 km por año.'],
    'london-eye': ['London Eye', 'la rueda de observación sobre el Támesis, del suelo a su punto más alto', 'la rueda mide 120 m de diámetro', 'Una vuelta lenta tarda una media hora, y normalmente no para para que suba la gente.'],
    'great-pyramid': ['Gran Pirámide de Guiza', 'tal como está hoy', 'medía 146.6 m antes de perder su revestimiento liso y su punta', 'Durante unos 3,800 años nada construido por personas fue más alto.'],
    'washington-monument': ['Monumento a Washington', 'el obelisco de Washington, D.C.', '555 pies según la cifra tradicional, 554 pies 7 pulgadas según una medición de 2014', 'La obra se frenó más de 20 años, y todavía se ve la línea donde cambia el color de la piedra.'],
    'space-needle': ['Space Needle', 'la torre de Seattle, del suelo a la punta de su aguja', '605 pies', 'Se construyó para la Feria Mundial de 1962 en unos 400 días.'],
    'gateway-arch': ['Gateway Arch', 'el arco de acero de San Luis', '630 pies, y exactamente tan ancho como alto', 'Es el arco más alto del mundo, y un tren de cápsulas chiquitas sube a los visitantes por dentro de sus patas.'],
    'the-shard': ['The Shard', 'el rascacielos de vidrio junto al London Bridge', '', 'Sus lados de vidrio nunca llegan a juntarse arriba, y de ahí viene su nombre ("la astilla").'],
    'eiffel-tower': ['Torre Eiffel', 'hasta la punta de sus antenas, tal como está hoy', '', 'En un día de calor el hierro se dilata y la torre crece varios centímetros.'],
    'empire-state': ['Empire State Building', 'hasta la punta de su antena', '1,454 pies; el techo está a 381 m', 'Se levantó en poco más de un año, por momentos a cuatro pisos y medio por semana.'],
    'cn-tower': ['Torre CN', 'la torre de Toronto, hasta la punta de su antena', '', 'Fue la estructura independiente más alta del mundo por más de 30 años.'],
    'burj-khalifa': ['Burj Khalifa', 'la torre de Dubái, el edificio más alto del mundo', '828 m, o 829.8 m hasta la punta', 'Es tan alto que puedes ver la puesta del sol abajo, subir en el ascensor y verla otra vez.'],
    'sphinx': ['Gran Esfinge de Guiza', 'de la punta de las patas a la cola', 'mide unos 20 m de alto', 'Se talló de una sola pieza en la roca, y durante largos períodos de la historia solo le asomaba la cabeza de la arena.']
  };
  var K = { name: 0, what: 1, note: 2, fact: 3 };
  window.YardstickObj = function (o, k) {
    var es = L.get() === 'es' && OBJ[o.id];
    return es && (es[K[k]] || k === 'note') ? es[K[k]] : o[k];
  };
  L.add({
      // the daily-puzzle shell (wordplay/kit.js) around the game
      '‹ Back': '‹ Volver', 'Statistics': 'Estadísticas', 'Privacy': 'Privacidad', 'Daily': 'Diario', 'Daily #{n}': 'Diario #{n}', 'Unlimited': 'Ilimitado', 'Mode': 'Modo',
      'Played': 'Jugadas', 'Win %': '% ganadas', 'Current streak': 'Racha actual', 'Max streak': 'Racha máxima', 'Distribution': 'Distribución', 'Next puzzle in': 'Próximo en',
      'Share': 'Compartir', 'Copied! Paste it anywhere.': '¡Copiado! Pégalo donde quieras.', "Couldn't copy, sorry": 'No se pudo copiar, perdón', '(unlimited)': '(ilimitado)', '(preview)': '(adelanto)',
      'Next in {t}': 'Próximo en {t}', 'Language': 'Idioma',
      "A new puzzle every day at midnight, your time, the same for everyone. Unlimited mode gives you random ones from the whole collection that don't count towards your stats. Every puzzle was written for this site. Each size has a source; tell us if you spot one that is wrong. ·":
        'Un desafío nuevo cada día a la medianoche de tu hora, el mismo para todos. El modo Ilimitado te da parejas al azar de toda la colección que no cuentan para tus estadísticas. Cada desafío se escribió para este sitio. Cada tamaño tiene una fuente; avísale a Arjun si encuentras uno que esté mal. ·',
      '<p>Two shapes stand on one ground line, drawn to the <b>same scale</b>. The <b style="color:var(--ref)">blue</b> one is the reference, and you are told its real size. Stretch the <b style="color:var(--tgt)">yellow</b> one until it looks the right real-life size next to it, then <b>lock it in</b>.</p>':
        '<p>Dos figuras están paradas sobre la misma línea de suelo, dibujadas a la <b>misma escala</b>. La <b style="color:var(--ref)">azul</b> es la referencia, y te decimos su tamaño real. Estira la <b style="color:var(--tgt)">amarilla</b> hasta que parezca del tamaño real correcto a su lado, y después <b>confírmala</b>.</p>',
      '<ul><li><b>Resize:</b> drag the yellow shape or its round handle, use the slider, tap − and + for small steps, or press the arrow keys (hold Shift for tiny steps).</li>':
        '<ul><li><b>Cambiar el tamaño:</b> arrastra la figura amarilla o su manija redonda, usa el control deslizante, toca − y + para pasos chicos, o usa las flechas del teclado (con Shift para pasos mínimos).</li>',
      '<li><b>Zoom</b> (the buttons, the scroll wheel or a pinch) only changes how big both shapes are drawn. It never changes your answer.</li>':
        '<li>El <b>zoom</b> (los botones, la rueda del mouse o pellizcar) solo cambia qué tan grandes se dibujan las dos figuras. Nunca cambia tu respuesta.</li>',
      '<li>You never type a number. After you lock in you see the real size as a green outline, the real measurement and a fact.</li>':
        '<li>Nunca escribes un número. Después de confirmar ves el tamaño real como un contorno verde, la medida real y un dato curioso.</li>',
      '<li><b>Five rounds</b>, up to <b>100 points</b> each. What counts is how many <i>times</i> too big or too small you were: within 3% is 100, 10% out is about 92, 25% out about 72, half as much again 46, and <b>twice too big scores the same as half the size: 20</b>.</li></ul>':
        '<li><b>Cinco rondas</b>, de hasta <b>100 puntos</b> cada una. Cuenta cuántas <i>veces</i> te pasaste o te quedaste corto: dentro del 3% son 100, un 10% de diferencia son unos 92, un 25% unos 72, una vez y media 46, y <b>el doble de grande vale lo mismo que la mitad: 20</b>.</li></ul>',
      '<p>Heights are only ever compared with heights, and lengths with lengths. Every size was looked up and its source is shown after each round.</p>':
        '<p>Las alturas solo se comparan con alturas, y los largos con largos. Cada tamaño se buscó, y su fuente aparece después de cada ronda.</p>',
      'Daily totals (out of 500)': 'Totales diarios (sobre 500)', 'Average score': 'Puntaje promedio',
      'Everything': 'Todo', 'Animals': 'Animales', 'Vehicles': 'Vehículos', 'Buildings and landmarks': 'Edificios y monumentos', 'Everyday things': 'Cosas de todos los días', 'Sports': 'Deportes',
      'Practice category': 'Categoría de práctica', 'Reference': 'Referencia', 'Resize this one': 'Cambia el tamaño de esta',
      'Drawing surface: the reference shape and the target shape standing on one ground line': 'Área de dibujo: la figura de referencia y la figura objetivo paradas sobre la misma línea de suelo',
      'Drawing surface. Reference: {r}, {s}. Target: {t}.': 'Área de dibujo. Referencia: {r}, {s}. Objetivo: {t}.',
      'Zoom the view out': 'Alejar la vista', 'Zoom the view in': 'Acercar la vista', 'Fit both shapes in view': 'Ver las dos figuras enteras', 'Fit': 'Ajustar',
      'A little smaller': 'Un poco más chica', 'A little bigger': 'Un poco más grande', 'A little smaller (hold to keep going)': 'Un poco más chica (mantén para seguir)',
      'A little bigger (hold to keep going)': 'Un poco más grande (mantén para seguir)', 'Size of the target shape': 'Tamaño de la figura objetivo', 'Lock it in': 'Confirmar',
      'Drag the yellow shape or its handle, use the slider, or press the arrow keys (Shift for tiny steps). Scroll or pinch to zoom the view.':
        'Arrastra la figura amarilla o su manija, usa el control deslizante o las flechas del teclado (Shift para pasos mínimos). Usa la rueda o pellizca para hacer zoom.',
      'tall': 'de alto', 'across': 'de diámetro', 'long': 'de largo', '{a} to {b}': '{a} a {b}', 'How {d}? Make it look right': '¿Cuánto mide {d}? Haz que se vea bien',
      'one square = {m}': 'un cuadrado = {m}', 'Round {n} of {m}': 'Ronda {n} de {m}', 'Avg {a} · {n} rounds': 'Prom. {a} · {n} rondas', 'Avg {a} · {n} round': 'Prom. {a} · {n} ronda',
      'inside the real range': 'dentro del rango real', 'within 3%': 'a menos del 3%', '{n} times too big': '{n} veces más grande', '{n} times too small': '{n} veces más chica',
      '{n}% too big': '{n}% más grande', '{n}% too small': '{n}% más chica',
      'Way off': 'Muy lejos', 'Not close': 'Lejos', 'In the right area': 'Por la zona', 'Spot on': 'Clavado',
      'You made it <b class="g">{g}</b>. Really <b class="a">{a}</b> {d}: {o}.': 'La hiciste de <b class="g">{g}</b>. En realidad mide <b class="a">{a}</b> {d}: {o}.',
      'See your results': 'Ver tus resultados', 'Next round': 'Siguiente ronda', 'Source: {s}': 'Fuente: {s}', 'you {m}': 'tú {m}', 'real {m}': 'real {m}',
      'A tough day for the tape measure. Tomorrow is a new five.': 'Un día difícil para la cinta métrica. Mañana hay cinco nuevas.',
      'Some of these were a long way out. That is how you learn them.': 'Algunas quedaron muy lejos. Así es como se aprenden.',
      'A decent eye. A couple of these fooled you.': 'Buen ojo. Un par te engañaron.', 'A sharp eye for size.': 'Un ojo muy fino para los tamaños.',
      'Outstanding: you could measure by looking.': 'Impresionante: podrías medir con solo mirar.', 'next to {n}': 'junto a {n}', 'You <b>{g}</b> · real <b>{a}</b>': 'Tú <b>{g}</b> · real <b>{a}</b>',
      'Play unlimited': 'Jugar ilimitado', 'Stats': 'Estadísticas', 'Next five in {t}': 'Las próximas cinco en {t}',
      "Today's five targets at their real sizes, all to one scale. Tap a name to zoom in on it.": 'Las cinco figuras de hoy a su tamaño real, todas a la misma escala. Toca un nombre para acercarte.',
      'Zoom the gallery': 'Hacer zoom en la galería', "Today's five targets drawn at one true scale": 'Las cinco figuras de hoy dibujadas a una misma escala real'
  });
})();
