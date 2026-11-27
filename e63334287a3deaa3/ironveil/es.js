/* Midnight Ops (folder ironveil/) in Spanish (lang.js; see README). English -> Spanish, in our own words. Loaded right
   after lang.js, before the game's scripts. The game name itself comes from MO.GAME_NAME and is not translated. */
(function () {
  if (!window.BackRoomLang) return;
  BackRoomLang.add({
    // ---- title and content note
    'Night Drop': 'Salto nocturno', 'Normandy, 6 June 1944': 'Normandía, 6 de junio de 1944',
    'You came down three miles off the drop zone. The flak battery in this hamlet is tearing up the second wave. Spike its three guns, then reach the rally point.': 'Caíste a cinco kilómetros de la zona de salto. La batería antiaérea de esta aldea está destrozando a la segunda oleada. Inutiliza sus tres cañones y llega al punto de reunión.',
    'Deploy': 'Desplegar', 'Settings': 'Ajustes', 'Controls': 'Controles', 'Back': 'Volver',
    'Every stone, weapon and sound is made in your browser as the game starts. More missions are on the way.': 'Cada piedra, arma y sonido se crea en tu navegador al empezar el juego. Vienen más misiones en camino.',
    'Before you play': 'Antes de jugar',
    'Midnight Ops is a war game set in 1944. It shows soldiers shooting at each other, and some blood. You can turn the blood off in Settings.': 'Midnight Ops es un juego de guerra ambientado en 1944. Muestra soldados disparándose y algo de sangre. Puedes quitar la sangre en Ajustes.',
    'I understand, continue': 'Entiendo, continuar',
    'Building the hamlet': 'Construyendo la aldea', 'Raising the storm': 'Levantando la tormenta', 'Checking the weapon': 'Revisando el arma',
    // ---- key hints
    'Move': 'Moverse', 'Look': 'Mirar', 'Fire': 'Disparar', 'Aim': 'Apuntar', 'Reload': 'Recargar', 'Plant charge': 'Poner carga', 'Sprint': 'Correr', 'Crouch': 'Agacharse', 'Jump': 'Saltar', 'Pause': 'Pausa',
    'Mouse': 'Ratón', 'Left': 'Izq.', 'Right': 'Der.', 'Left click': 'Clic izquierdo', 'Right click': 'Clic derecho',
    'Look (arrow keys also work)': 'Mirar (las flechas también sirven)', 'Aim down the sights': 'Apuntar con la mira', 'Hold to plant a charge on a gun': 'Mantén para poner una carga en un cañón', 'Crouch (harder to see and to hit)': 'Agacharse (más difícil que te vean y te den)',
    'On a phone or tablet: drag the left side of the screen to move, drag the right side to look, and use the buttons on the right. Push the move stick far forward to sprint.': 'En teléfono o tableta: arrastra el lado izquierdo de la pantalla para moverte, el derecho para mirar, y usa los botones de la derecha. Empuja la palanca bien hacia delante para correr.',
    'Done': 'Listo', 'Load': 'Carga', 'Duck': 'Agachar', 'Hold': 'Mantén',
    // ---- pause, death, debrief
    'Paused': 'En pausa', 'Resume': 'Seguir', 'Restart mission': 'Reiniciar misión', 'Quit': 'Salir', 'Guns destroyed: {n} of 3': 'Cañones destruidos: {n} de 3',
    'Killed in action': 'Caído en combate', 'Try again': 'Reintentar', 'You go back in from the last gun you destroyed.': 'Vuelves a entrar desde el último cañón que destruiste.', 'You go back in from the drop zone.': 'Vuelves a entrar desde la zona de salto.',
    'Mission complete': 'Misión cumplida', 'The battery is silent. The second wave is coming in clean.': 'La batería calló. La segunda oleada entra sin problemas.', 'Play again': 'Jugar otra vez', 'Title': 'Inicio',
    'Time': 'Tiempo', 'Accuracy': 'Puntería', 'Enemies down': 'Enemigos abatidos', 'Retries': 'Reintentos',
    'Ragged': 'A duras penas', 'Loud': 'Ruidoso', 'Steady': 'Firme', 'Clean': 'Limpio', 'Sharp': 'Afilado', 'Textbook': 'De manual',
    // ---- settings
    'Graphics': 'Gráficos', 'Auto': 'Automático', 'Low': 'Bajos', 'Medium': 'Medios', 'High': 'Altos', 'Look speed': 'Velocidad de la mira', 'Field of view': 'Campo de visión', 'Volume': 'Volumen',
    'Invert look up and down': 'Invertir mirar arriba y abajo', 'Blood effects': 'Efectos de sangre', 'Language': 'Idioma', 'A change to Graphics takes effect when the page is opened again.': 'El cambio de Gráficos se aplica al volver a abrir la página.',
    // ---- keys and new actions
    'Mouse / trackpad': 'Ratón / panel táctil', 'Left Shift (hold)': 'Mayús izq. (mantén)', 'Left Shift': 'Mayús izq.', 'Left Control (hold)': 'Control izq. (mantén)', 'Left Control': 'Control izq.',
    'Right click (hold)': 'Clic derecho (mantén)', 'Shift (hold)': 'Mayús (mantén)', 'Shift': 'Mayús', 'Tab / Caps Lock': 'Tab / Bloq Mayús', 'Space': 'Espacio', 'Esc': 'Esc',
    'Aim down the sights (right click too)': 'Apuntar con la mira (también clic derecho)', 'Crouch (toggle); while sprinting: slide': 'Agacharse (alterna); corriendo: deslizarse', 'Prone (toggle)': 'Cuerpo a tierra (alterna)', 'Prone': 'Cuerpo a tierra',
    'Reload (automatic when empty)': 'Recargar (automático al vaciarse)', 'Hold to plant a charge': 'Mantén para poner una carga', 'Melee: silent, kills from behind': 'Cuerpo a cuerpo: silencioso, mata por la espalda', 'Melee': 'Cuerpo a cuerpo',
    'Throw a grenade': 'Lanzar una granada', 'Inspect weapon': 'Revisar el arma', 'Map': 'Mapa', 'Plant charge': 'Poner carga', 'Grenade': 'Granada', 'Ping a spot': 'Marcar un punto', 'Status': 'Estado',
    'Keys': 'Teclas', 'Mac: Shift aims, Control sprints': 'Mac: Mayús apunta, Control corre', 'Classic: Shift sprints, right click aims': 'Clásico: Mayús corre, clic derecho apunta', 'Automatic reload': 'Recarga automática',
    'Grenades': 'Granadas', 'Ammunition': 'Munición', 'No grenades left': 'No quedan granadas', '+20 rounds, +1 grenade': '+20 balas, +1 granada', 'Silent takedown': 'Eliminación silenciosa', 'M to close': 'M para cerrar', 'Nade': 'Grana',
    // ---- campaign
    'Full screen': 'Pantalla completa', 'Exit full screen': 'Salir de pantalla completa', 'For full screen on iPhone: tap the aA button in the address bar, then Hide Toolbar. Turn the phone sideways for the widest view.': 'Para pantalla completa en iPhone: toca el botón aA de la barra de direcciones y luego Ocultar barra de herramientas. Gira el teléfono para ver más.',
    'Missions': 'Misiones', 'Ready': 'Lista', 'Play': 'Jugar', 'Locked': 'Bloqueada', 'Coming soon': 'Muy pronto', 'Done': 'Hecha', 'Next mission': 'Siguiente misión', 'Next: {t}': 'Siguiente: {t}', 'Building the map': 'Construyendo el mapa',
    'Bridge at Dawn': 'El puente al amanecer', 'Take the river bridge, then hold it through three counter-attacks.': 'Toma el puente del río y aguanta tres contraataques.',
    'The Clocktower': 'La torre del reloj', 'Sniper overwatch over an occupied town while a courier crosses the square.': 'Cubre con el fusil de precisión a un mensajero que cruza la plaza de un pueblo ocupado.',
    'Rail Yard': 'La playa de vías', 'Charges on a fuel train, a fuse already burning, and a truck out of the yard.': 'Cargas en un tren de combustible, una mecha ya encendida y un camión para salir de la estación.',
    'Exit': 'Salida', 'Treeline': 'Arboleda', 'Radio': 'Radio', 'Mast': 'Mástil', 'Power': 'Corriente', 'Charges': 'Cargas',
    // ---- mission 2, The Radio Mast
    'The Radio Mast': 'El mástil de radio', 'Normandy, France. 6 June 1944, 04:10': 'Normandía, Francia. 6 de junio de 1944, 04:10',
    'A signals compound with three ways in. Silence the transmitter before it calls in the guns, then bring down the mast.': 'Un recinto de transmisiones con tres entradas. Calla el transmisor antes de que llame a la artillería y luego derriba el mástil.',
    'Silence the transmitter': 'Calla el transmisor', 'Bring down the mast': 'Derriba el mástil', 'Get to the treeline': 'Llega a la arboleda',
    'That mast is how they call the guns down on the beaches. Kill the transmitter in the bunker, then drop the mast.': 'Con ese mástil dirigen los cañones contra las playas. Destruye el transmisor del búnker y luego tira el mástil.',
    'Three ways in: the main gate, the drainage ditch on the west side, or the broken fence behind the generator.': 'Tres entradas: la puerta principal, la zanja de desagüe del lado oeste o la cerca rota detrás del generador.',
    'If they see you, that radio starts calling for artillery. Keep out of the searchlight.': 'Si te ven, esa radio empezará a pedir artillería. No te metas en el reflector.',
    'Radio is dead. That is both. Get to the treeline, north-west. Go!': 'La radio está muerta. Ya están los dos. Ve a la arboleda, al noroeste. ¡Vamos!',
    'Transmitter is scrap. Now the mast, or they will have a spare set talking by morning.': 'El transmisor es chatarra. Ahora el mástil, o por la mañana tendrán otro equipo hablando.',
    'Down she comes! Get to the treeline, north-west. Go!': '¡Ahí cae! Ve a la arboleda, al noroeste. ¡Vamos!',
    'The mast is down, but that radio can still talk on a short aerial. Finish it.': 'El mástil cayó, pero esa radio aún puede hablar con una antena corta. Acaba con ella.',
    'Lights out. That will make them jumpy, and half blind.': 'Sin luces. Eso los pondrá nerviosos y medio ciegos.',
    'They are on the set. Calling the guns. You have two and a half minutes.': 'Están en la radio. Llaman a los cañones. Tienes dos minutos y medio.',
    'Guns called: {t}': 'Cañones pedidos: {t}', 'Incoming!': '¡Obuses!', 'Spotted by the searchlight!': '¡Te vio el reflector!', 'The guns found you.': 'Los cañones te encontraron.',
    'You go back in from your last charge.': 'Vuelves a entrar desde tu última carga.', 'You go back in from the woods.': 'Vuelves a entrar desde el bosque.',
    'The mast is down and the radio is silent. The guns stay blind until dawn.': 'El mástil cayó y la radio calla. Los cañones siguen ciegos hasta el amanecer.',
    // ---- HUD and radio
    'Objective': 'Objetivo', 'Spike the three flak guns': 'Inutiliza los tres cañones antiaéreos', 'Reach the rally point': 'Llega al punto de reunión', 'Guns': 'Cañones', 'Rally': 'Reunión',
    'Hold to plant the charge': 'Mantén para poner la carga', 'Charge set. Get clear!': '¡Carga puesta. Aléjate!', 'Reinforcements': 'Refuerzos', 'Reloading': 'Recargando', 'Health': 'Salud', 'Seen': 'Te ven', 'Under fire': 'Bajo fuego', '+20 rounds': '+20 balas',
    'Normandy, France. 6 June 1944, 01:42': 'Normandía, Francia. 6 de junio de 1944, 01:42',
    'You are down and in one piece. Good. The battery in that hamlet is cutting the second wave to bits.': 'Aterrizaste entero. Bien. La batería de esa aldea está haciendo pedazos a la segunda oleada.',
    'Three guns: the farmyard, the orchard, and one by the church. Put a charge on each. Go quiet if you can.': 'Tres cañones: el corral, el huerto y uno junto a la iglesia. Pon una carga en cada uno. Ve en silencio si puedes.',
    'That is all three. Rally at the wayside cross, north end of the lane. Move!': 'Ya son los tres. Reúnete en la cruz del camino, al norte del sendero. ¡Muévete!',
    'One gun down. They know you are here now. Keep moving.': 'Un cañón menos. Ya saben que estás aquí. No te detengas.', 'Two down. One more and the sky is ours.': 'Van dos. Uno más y el cielo es nuestro.'
  });
})();
