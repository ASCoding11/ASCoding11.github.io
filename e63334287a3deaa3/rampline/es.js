// Rampline in Spanish (see the comment at the top of ../lang.js). English → Spanish, in our own words.
// Track names (First Gear and the rest) and players' track names stay as they are.
(function () {
  if (!window.BackRoomLang) return;
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
