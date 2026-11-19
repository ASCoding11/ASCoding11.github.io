// Showdown in Spanish (see README and /e63334287a3deaa3/lang.js). English → Spanish, our own words.
// The table's hand log and messages travel between players in English (as before); each page shows them in its own
// language through SD_TR() below, which turns the hand names into Spanish and then looks the line up in the dictionary.
(function () {
  var L = window.BackRoomLang; if (!L) return;
  var R = { Two: 'dos', Three: 'tres', Four: 'cuatro', Five: 'cinco', Six: 'seis', Seven: 'siete', Eight: 'ocho', Nine: 'nueve', Ten: 'diez', Jack: 'J', Queen: 'Q', King: 'K', Ace: 'As' };
  var P = { Twos: 'doses', Threes: 'treses', Fours: 'cuatros', Fives: 'cincos', Sixes: 'seis', Sevens: 'sietes', Eights: 'ochos', Nines: 'nueves', Tens: 'dieces', Jacks: 'jotas', Queens: 'reinas', Kings: 'reyes', Aces: 'ases' };
  var RN = Object.keys(R).join('|'), PN = Object.keys(P).join('|');
  var HANDS = [
    [new RegExp('Straight flush, (' + RN + ') high', 'g'), function (m, a) { return 'Escalera de color al ' + R[a]; }],
    [/Royal flush/g, function () { return 'Escalera real'; }],
    [new RegExp('Four (' + PN + ')', 'g'), function (m, a) { return 'Póker de ' + P[a]; }],
    [new RegExp('Full house, (' + PN + ') full of (' + PN + ')', 'g'), function (m, a, b) { return 'Full de ' + P[a] + ' y ' + P[b]; }],
    [new RegExp('Flush, (' + RN + ') high', 'g'), function (m, a) { return 'Color al ' + R[a]; }],
    [new RegExp('Straight, (' + RN + ') high', 'g'), function (m, a) { return 'Escalera al ' + R[a]; }],
    [new RegExp('Three (' + PN + ')', 'g'), function (m, a) { return 'Trío de ' + P[a]; }],
    [new RegExp('Two pair, (' + PN + ') and (' + PN + ')', 'g'), function (m, a, b) { return 'Doble par, ' + P[a] + ' y ' + P[b]; }],
    [new RegExp('Pair of (' + PN + ')', 'g'), function (m, a) { return 'Par de ' + P[a]; }],
    [new RegExp('\\b(' + RN + ') high', 'g'), function (m, a) { return 'Carta alta: ' + R[a]; }]
  ];
  window.SD_HAND = function (s) { if (L.get() === 'en') return s; for (var i = 0; i < HANDS.length; i++) s = s.replace(HANDS[i][0], HANDS[i][1]); return s; };
  // names: the players' names at the table. Each is swapped for a token before the lookup and put back after it, so a
  // name is never translated (a player called "Ready" or "Ace high" stays as typed).
  window.SD_TR = function (s, names) {
    if (L.get() === 'en') return s;
    var keep = [];
    (names || []).slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (n) {
      if (!n || s.indexOf(n) < 0) return;
      // whole names only (not "Al" inside "All in")
      var re = new RegExp('(^|[^\\p{L}\\p{N}])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}])', 'gu');
      var tok = '\u0001' + keep.length + '\u0001', t2 = s.replace(re, function (m, pre) { return pre + tok; });
      if (t2 !== s) { keep.push(n); s = t2; }
    });
    s = L.t(window.SD_HAND(s));
    return s.replace(/\u0001(\d+)\u0001/g, function (m, i) { return keep[+i]; });
  };
  L.add({
    // table and bar
    'Invite': 'Invitar', 'Coach': 'Coach', 'Coach: odds and hand strength (H)': 'Coach: probabilidades y fuerza de la mano (H)', 'Log': 'Registro',
    'Hand log, chat and players (L)': 'Registro, chat y jugadores (L)', 'Four-color deck': 'Mazo de cuatro colores', 'Sound (M)': 'Sonido (M)', 'Leave': 'Salir',
    'Hands': 'Manos', 'Chat': 'Chat', 'Players': 'Jugadores', 'Say something': 'Escribe algo', 'Chat message': 'Mensaje', 'Send': 'Enviar',
    'Sound off': 'Sonido apagado', 'Sound on': 'Sonido encendido', 'Your turn': 'Te toca', 'Open seat': 'Lugar libre', 'Away': 'Ausente', 'Busted': 'Sin fichas',
    'Sitting out': 'Fuera de juego', 'Main {a}': 'Principal {a}', 'Side {a}': 'Secundario {a}', 'Pot {a}': 'Pozo {a}', 'Total {a}': 'Total {a}', 'Pot': 'Pozo',
    '½ pot': '½ pozo', '¾ pot': '¾ pozo', 'Min': 'Mín', 'All-in': 'All-in', 'Bet size': 'Tamaño de apuesta', 'Bet amount': 'Monto', 'Fold': 'Retirarse', 'Check': 'Pasar',
    'Call': 'Igualar', 'Bet': 'Apostar', 'Raise': 'Subir', 'Raise to': 'Subir a', 'Muck': 'Tirar', 'Next hand starting…': 'Empieza otra mano…',
    'Waiting for another player…': 'Esperando a otro jugador…', 'Waiting for players…': 'Esperando jugadores…',
    'Joining the table…': 'Entrando a la mesa…', "You're watching. You'll get a seat when one opens up.": 'Estás mirando. Te sientas cuando se libere un lugar.',
    "You're out of chips.": 'Te quedaste sin fichas.', 'Rebuy {a}': 'Recomprar {a}', "You're sitting out.": 'Estás fuera de juego.', "I'm back": 'Volví',
    'Check / fold': 'Pasar / retirarse', 'Next hand in a moment.': 'Otra mano en un momento.', 'All in. Good luck.': 'All-in. ¡Suerte!',
    'Waiting for the next hand.': 'Esperando la próxima mano.', 'Sit out next hand': 'No jugar la próxima mano',
    'You win {a}': 'Ganas {a}', 'You win {a} · {h}': 'Ganas {a} · {h}', '{n} wins {a}': '{n} gana {a}', '{n} wins {a} · {h}': '{n} gana {a} · {h}',
    'Hand #{n}': 'Mano #{n}',
    // coach
    '· top {p}% of starting hands': '· entre el {p}% mejor de manos iniciales', 'top {p}% of starting hands': 'entre el {p}% mejor de manos iniciales', 'Position:': 'Posición:', 'You have': 'Tienes', 'You folded this hand.': 'Te retiraste de esta mano.',
    'Win chance vs {n} random hand:': 'Chance de ganar contra {n} mano al azar:', 'Win chance vs {n} random hands:': 'Chance de ganar contra {n} manos al azar:',
    'Call {a} to win {b}: you need': 'Iguala {a} para ganar {b}: necesitas', 'the price is right': 'vale la pena', 'the price is too high': 'cuesta demasiado',
    'No bet to call. Checking is free.': 'No hay apuesta. Pasar es gratis.',
    'Button (small blind)': 'Botón (ciega chica)', 'Button': 'Botón', 'Small blind': 'Ciega chica', 'Big blind': 'Ciega grande', 'Cutoff': 'Cutoff', 'Hijack': 'Hijack',
    'Under the gun': 'Primero en hablar', 'Middle position': 'Posición media',
    // log lines (from the table, in English)
    '{a} posts {x}, {b} posts {y}': '{a} pone {x}, {b} pone {y}', 'Hand #{n} · blinds {s} / {b}': 'Mano #{n} · ciegas {s} / {b}', '{n} left': '{n} se fue',
    '{n} mucks': '{n} tira sus cartas', '{n} shows {c} · {h}': '{n} muestra {c} · {h}',
    '{n} sits down': '{n} se sienta', '{n} leaves the table': '{n} deja la mesa', '{n} rebuys for {a}': '{n} recompra por {a}', '{n} folds': '{n} se retira',
    '{n} checks': '{n} pasa', '{n} calls {a} and is all-in': '{n} iguala {a} y va all-in', '{n} calls {a}': '{n} iguala {a}',
    '{n} bets {a} (all-in)': '{n} apuesta {a} (all-in)', '{n} bets {a}': '{n} apuesta {a}', '{n} raises to {a} (all-in)': '{n} sube a {a} (all-in)', '{n} raises to {a}': '{n} sube a {a}',
    '{n} is sitting out': '{n} queda fuera de juego', 'Uncalled {a} returned to {n}': 'Se devuelven {a} no igualados a {n}', 'All in: the board runs out': 'All-in: salen todas las cartas',
    'Flop: {c}': 'Flop: {c}', 'Turn: {c}': 'Turn: {c}', 'River: {c}': 'River: {c}',
    '{n} wins the main pot ({a}) with {h}': '{n} gana el pozo principal ({a}) con {h}', '{n} split the main pot ({a}) with {h}': '{n} reparten el pozo principal ({a}) con {h}',
    '{n} wins side pot {k} ({a}) with {h}': '{n} gana el pozo secundario {k} ({a}) con {h}', '{n} split side pot {k} ({a}) with {h}': '{n} reparten el pozo secundario {k} ({a}) con {h}',
    '{n} and {m} split the main pot ({a}) with {h}': '{n} y {m} reparten el pozo principal ({a}) con {h}',
    '{n} and {m} split side pot {k} ({a}) with {h}': '{n} y {m} reparten el pozo secundario {k} ({a}) con {h}',
    '{n} and {m} split ({a}) with {h}': '{n} y {m} reparten ({a}) con {h}',
    '{n} wins ({a}) with {h}': '{n} gana ({a}) con {h}', '{n} split ({a}) with {h}': '{n} reparten ({a}) con {h}',
    'The dealer changed hands. Hand #{n} was called off and the chips went back.': 'Cambió quien reparte. La mano #{n} se anuló y se devolvieron las fichas.',
    // menu
    "Texas Hold'em": "Texas Hold'em", 'No limit · up to 8 seats': 'Sin límite · hasta 8 lugares',
    "No-limit Hold'em with friends or against bots. Read the table, size your bets, and take it to the river.": "Hold'em sin límite con amigos o contra bots. Lee la mesa, mide tus apuestas y llega hasta el river.",
    'Your name': 'Tu nombre', 'Colour': 'Color', 'Colour {n}': 'Color {n}', 'Online': 'Online', 'Quick match': 'Partida rápida', 'Sit at the busiest public table.': 'Siéntate en la mesa pública con más gente.',
    'Room code': 'Código de sala', 'Play in room': 'Jugar en sala', 'Pick a room code, then send friends the invite link from the table.': 'Elige un código de sala y manda la invitación desde la mesa.',
    'Practice vs bots': 'Práctica contra bots', 'Practice': 'Práctica', 'No timer. Rebuy whenever you like.': 'Sin reloj. Recompra cuando quieras.',
    'Table settings': 'Ajustes de mesa', 'Seats': 'Lugares', 'Heads-up': 'Mano a mano', 'Bots': 'Bots', 'Easy': 'Fácil', 'Normal': 'Normal', 'Hard': 'Difícil',
    'Stack': 'Fichas', 'Timer': 'Reloj', 'Fill seats': 'Llenar lugares', 'With bots': 'Con bots', 'People only': 'Solo personas', 'No bots in party games': 'Sin bots en partidas de grupo',
    'Used for Practice and for rooms you start. Blinds are 10 / 20. Quick match tables are 6-max, 100 BB, 30 s, Normal bots.': 'Para la práctica y las salas que abres. Ciegas 10 / 20. Las mesas de Partida rápida son 6-max, 100 BB, 30 s, bots normales.',
    'How to play': 'Cómo jugar',
    'Everyone gets two cards. Five shared cards come out in three rounds (the flop, the turn and the river), with a round of betting before each and one at the end. Make the best five-card hand from any of your two and the five on the table, or make everyone else fold.': 'Cada uno recibe dos cartas. Salen cinco cartas comunes en tres tandas (flop, turn y river), con una ronda de apuestas antes de cada una y otra al final. Arma la mejor mano de cinco con tus dos y las cinco de la mesa, o haz que todos los demás se retiren.',
    'Check or call': 'Pasar o igualar', 'Bet or raise the amount on the slider': 'Apostar o subir lo que marca el control', 'Change the bet size': 'Cambiar la apuesta',
    'Coach on / off': 'Coach sí / no', 'Hand log, chat and players': 'Registro, chat y jugadores', 'Sound on / off': 'Sonido sí / no', 'Advertisement': 'Publicidad',
    'Play chips only ·': 'Solo fichas de juego ·', 'Privacy': 'Privacidad', 'Practice: {h} hands played, biggest pot won {b} · Play chips only ·': 'Práctica: {h} manos jugadas, mayor pozo ganado {b} · Solo fichas de juego ·',
    'Royal flush': 'Escalera real', 'Straight flush': 'Escalera de color', 'Four of a kind': 'Póker', 'Full house': 'Full', 'Flush': 'Color', 'Straight': 'Escalera',
    'Three of a kind': 'Trío', 'Two pair': 'Doble par', 'Pair': 'Par', 'High card': 'Carta alta',
    'Leave the table?': '¿Dejar la mesa?', 'Stay': 'Quedarme',
    "You're in a hand. Leaving folds it, and you'll keep your stack if you come back to this room soon.": 'Estás en una mano. Si sales la tiras, y conservas tus fichas si vuelves pronto a esta sala.',
    "You're in a hand. Leaving ends this practice session.": 'Estás en una mano. Si sales termina esta práctica.',
    'Player': 'Jugador', 'Net': 'Neto', 'Net counts rebuys. Everyone starts with {a} play chips.': 'El neto cuenta las recompras. Todos empiezan con {a} fichas de juego.',
    'Say hi to the table.': 'Saluda a la mesa.', 'Invite link copied': 'Invitación copiada', 'Public table {n}': 'Mesa pública {n}',
    'You were invited to room sd-{c}. Press Play in room to join.': 'Te invitaron a la sala sd-{c}. Pulsa Jugar en sala para entrar.',
    'Still signing in…': 'Todavía iniciando sesión…',
    "Couldn't reach the game database. If you're on a school or work network it may be blocking it; try another network, or play Practice.": 'No se pudo llegar a la base de datos del juego. Si estás en la red de la escuela o del trabajo, puede estar bloqueada; prueba otra red o juega Práctica.',
    'Could not reach the game server. Check your connection, or play Practice.': 'No se pudo llegar al servidor del juego. Revisa tu conexión o juega Práctica.',
    'Signing in to the game server timed out. Check your connection, or play Practice.': 'Se agotó el tiempo para entrar al servidor. Revisa tu conexión o juega Práctica.',
    "This browser can't keep cards secret here (it needs a secure https page). Try another browser, or play Practice.": 'Este navegador no puede ocultar las cartas aquí (necesita una página https segura). Prueba otro navegador o juega Práctica.',
    'That table is full ({n} people). Try another code.': 'Esa mesa está llena ({n} personas). Prueba otro código.', 'Language': 'Idioma', 'Room {r}': 'Sala {r}', 'You': 'Tú', 'C / SPACE': 'C / ESPACIO', 'Practice · Easy bots': 'Práctica · bots fáciles', 'Practice · Normal bots': 'Práctica · bots normales', 'Practice · Hard bots': 'Práctica · bots difíciles',
    // the Wardrobe (wardrobe.js; captains only for now)
    'Wardrobe': 'Vestidor', 'Done': 'Listo', 'Wardrobe sections': 'Secciones del vestidor',
    'Captains only for now. Everything is free to wear, and only changes how your seat looks.': 'Por ahora solo para capitanes. Todo es gratis y solo cambia cómo se ve tu asiento.',
    'Your seat, as the table sees it': 'Tu asiento, como lo ve la mesa', 'Play flourish': 'Ver festejo',
    'Seat looks': 'Retratos', 'Card backs': 'Dorsos', 'Felts': 'Paños', 'Win flourishes': 'Festejos',
    "Shown in your seat's circle for everyone at the table, on your own colour.": 'Se ve en el círculo de tu asiento para toda la mesa, sobre tu color.',
    'Your face-down cards, as everyone else sees them. Card faces never change.': 'Tus cartas boca abajo, como las ven los demás. Las caras de las cartas no cambian.',
    'The table on your own screen. Only you see it.': 'La mesa en tu pantalla. Solo la ves vos.',
    'Plays round your seat when you win a pot, for everyone at the table.': 'Aparece alrededor de tu asiento cuando ganás un pozo, para toda la mesa.',
    'Your initial': 'Tu inicial', 'Classic back': 'Dorso clásico', 'Classic green': 'Verde clásico', 'No flourish': 'Sin festejo',
    'Common': 'Común', 'Uncommon': 'Poco común', 'Rare': 'Raro', 'Epic': 'Épico', 'Legendary': 'Legendario',
    'Striker': 'Delantero', 'Point Guard': 'Base', 'Gridiron': 'Americano', 'Slugger': 'Bateador', 'Goalie Mask': 'Máscara de arquero', 'Tennis Ace': 'As del tenis',
    'Boxing Champ': 'Campeón de boxeo', 'Racing Driver': 'Piloto de carreras', 'Referee': 'Árbitro', 'Tin Robot': 'Robot de lata', 'Chrome Android': 'Androide cromado',
    'Pirate Captain': 'Capitán pirata', 'Deckhand': 'Marinero', 'The Boss': 'El Jefe', 'Bodyguard': 'Guardaespaldas', 'Secret Agent': 'Agente secreto',
    'Tracksuit Tough': 'Duro de jogging', 'Wizard': 'Mago',
    'Pitch': 'Cancha', 'Hardwood': 'Parqué', 'Checkered Flag': 'Bandera a cuadros', 'Circuit Board': 'Placa de circuitos', 'Treasure Map': 'Mapa del tesoro', 'Pinstripe': 'Raya diplomática',
    'Midnight Blue': 'Azul medianoche', 'Casino Red': 'Rojo casino', 'Striped Pitch': 'Césped a rayas', 'Purple Velvet': 'Terciopelo violeta', "Ship's Deck": 'Cubierta del barco',
    'Confetti': 'Papel picado', 'Coin Shower': 'Lluvia de monedas', 'Trophy': 'Trofeo', 'Fireworks': 'Fuegos artificiales', 'Treasure Chest': 'Cofre del tesoro'
  });
})();
