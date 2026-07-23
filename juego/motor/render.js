/*
 * Buscaminas Experto — pinta el estado del tablero (BuscaminasBoard) en el DOM
 * y gestiona la entrada del jugador: click normal, doble click/doble toque
 * (chording) y pulsación larga (~400ms) para banderas. Requiere board.js
 * cargado antes de este script. Compartido por todos los niveles: las
 * dimensiones del tablero se leen de data-filas/data-columnas/data-minas en
 * #bm-board, así que cada nivel solo aporta su HTML/CSS, no una copia de
 * este archivo.
 *
 * Única excepción, aislada tras la bandera ES_INTERMEDIO (detecta la clase
 * "nivel-intermedio" en <body>, la misma que usa juego/shell/styles.css
 * para aislar sus propias reglas de Intermedio): en Intermedio el tablero
 * en móvil puede ser más ancho/alto que la pantalla (celda de tamaño fijo,
 * ver esa hoja de estilos), así que un arrastre que empiece sobre una
 * celda debe poder desplazar la página sin abrir ninguna casilla por el
 * camino. Se aísla a Intermedio en vez de compartirse porque en
 * Principiante/Experto (touch-action:pinch-zoom, no "manipulation") CUALQUIER
 * movimiento del dedo llega intacto hasta pointerup — el navegador no toma
 * el gesto como scroll y cancela el puntero antes de tiempo, a diferencia
 * de Intermedio — así que no se pudo descartar con confianza que un toque
 * normal ahí nunca supere el umbral por simple imprecisión del dedo.
 */

(function () {
  'use strict';

  var Board = window.BuscaminasBoard;

  // Icono de bandera: círculo de contraste (claro/blanco roto) detrás +
  // bandera con las mismas proporciones EXACTAS que el logotipo de la
  // marca (favicon / cabecera): mástil vertical con extremos redondeados
  // y banderín triangular apuntando a la derecha desde su extremo
  // superior. Las coordenadas replican 1:1 las del logo (line x=26,
  // y 16-48 y polygon 26,16 47,23.5 26,31 dentro de una casilla de 56x56
  // en el SVG original), reexpresadas en un viewBox de 0 a 100 para que
  // encajen con el resto de la casilla. El fondo de la casilla NO cambia
  // aquí: sigue siendo el naranja de "sin abrir" definido en el CSS.
  var SVG_BANDERA =
    '<svg class="bm-flag-icon" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="46" fill="var(--color-flag-circle-bg)"/>' +
      '<line x1="39.3" y1="78.6" x2="39.3" y2="21.4" stroke="var(--color-flag-mast)" stroke-width="7" stroke-linecap="round"/>' +
      '<polygon points="39.3,21.4 76.8,34.8 39.3,48.2" fill="var(--color-flag-pennant)"/>' +
    '</svg>';

  var DURACION_PULSACION_LARGA_MS = 400;
  var TOLERANCIA_MOVIMIENTO_PX = 10; // Principiante/Experto, sin cambios: si el dedo se mueve más que esto, se cancela la bandera (probablemente es scroll)

  // Ver comentario de cabecera del archivo. Solo Intermedio: umbral de
  // movimiento entre pointerdown y pointerup para distinguir un toque real
  // de un arrastre de página (scroll), y mismo umbral para cancelar el
  // long-press de bandera si el dedo se mueve antes de completarse.
  var ES_INTERMEDIO = document.body.classList.contains('nivel-intermedio');
  var UMBRAL_MOVIMIENTO_INTERMEDIO_PX = 8;

  var elBoard = document.getElementById('bm-board');
  var elContadorMinas = document.getElementById('bm-contador-minas');
  var elCronometro = document.getElementById('bm-cronometro');
  var elReset = document.getElementById('bm-reset');
  var elMensaje = document.getElementById('bm-mensaje');

  // Dimensiones del nivel: data-filas/data-columnas/data-minas en #bm-board.
  // Si faltan (no deberían, cada página de nivel las declara), Board.crear()
  // cae en sus valores por defecto (9x9, 10 minas, los de Principiante).
  var FILAS = Number(elBoard.dataset.filas) || undefined;
  var COLUMNAS = Number(elBoard.dataset.columnas) || undefined;
  var MINAS = Number(elBoard.dataset.minas) || undefined;

  var tablero = null;
  var celdasEl = []; // referencias a los <div> de cada celda, indexadas igual que tablero.celdas

  var idTemporizador = null;
  var segundos = 0;

  // Estado del gesto de pulsación en curso (delegado sobre el tablero completo)
  var idTimeoutPulsacion = null;
  var idxPulsacion = null;
  var pulsacionEsBandera = false;
  var inicioX = 0;
  var inicioY = 0;

  function iniciarPartida() {
    detenerCronometro();
    tablero = Board.crear(FILAS, COLUMNAS, MINAS);
    segundos = 0;
    actualizarCronometro();
    actualizarContadorMinas();
    elMensaje.textContent = '';
    elMensaje.className = 'bm-mensaje';
    elReset.classList.remove('bm-reset--perdida', 'bm-reset--ganada');

    construirCeldas();
    pintarTodo();
  }

  function construirCeldas() {
    elBoard.innerHTML = '';
    celdasEl = new Array(tablero.celdas.length);
    for (var i = 0; i < tablero.celdas.length; i++) {
      var div = document.createElement('div');
      div.className = 'bm-cell bm-cell--closed';
      div.setAttribute('role', 'gridcell');
      div.dataset.idx = String(i);
      elBoard.appendChild(div);
      celdasEl[i] = div;
    }
  }

  // ---------- Entrada del jugador (delegada sobre el contenedor del tablero) ----------

  function celdaDesdeEvento(e) {
    var el = e.target.closest ? e.target.closest('.bm-cell') : null;
    return el && elBoard.contains(el) ? el : null;
  }

  function onPointerDown(e) {
    var celdaEl = celdaDesdeEvento(e);
    if (!celdaEl) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return; // solo botón principal, sin click derecho

    try { celdaEl.setPointerCapture(e.pointerId); } catch (err) { /* no crítico */ }

    pulsacionEsBandera = false;
    idxPulsacion = Number(celdaEl.dataset.idx);
    inicioX = e.clientX;
    inicioY = e.clientY;

    clearTimeout(idTimeoutPulsacion);
    idTimeoutPulsacion = setTimeout(function () {
      pulsacionEsBandera = true;
      onBandera(idxPulsacion);
      if (navigator.vibrate) {
        try { navigator.vibrate(15); } catch (err) { /* no soportado, ignorar */ }
      }
    }, DURACION_PULSACION_LARGA_MS);
  }

  function distanciaDesdeInicio(e) {
    var dx = e.clientX - inicioX;
    var dy = e.clientY - inicioY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onPointerMove(e) {
    if (idTimeoutPulsacion === null || idxPulsacion === null) return;
    var seMovioDemasiado = ES_INTERMEDIO
      ? distanciaDesdeInicio(e) >= UMBRAL_MOVIMIENTO_INTERMEDIO_PX
      : distanciaDesdeInicio(e) > TOLERANCIA_MOVIMIENTO_PX;
    if (seMovioDemasiado) {
      // El dedo se ha movido demasiado: probablemente es un scroll, no una bandera.
      clearTimeout(idTimeoutPulsacion);
      idTimeoutPulsacion = null;
    }
  }

  function onPointerUp(e) {
    clearTimeout(idTimeoutPulsacion);
    idTimeoutPulsacion = null;

    if (idxPulsacion === null) return;
    var idx = idxPulsacion;
    idxPulsacion = null;

    if (pulsacionEsBandera) {
      pulsacionEsBandera = false;
      return; // la pulsación larga ya se gestionó como bandera; no abrir la casilla
    }

    // Solo Intermedio (ver ES_INTERMEDIO arriba): si el dedo se movió 8px
    // o más entre el pointerdown y este pointerup, es un arrastre de
    // página, no un toque — no se abre ninguna casilla. No se ha llamado
    // a preventDefault en ningún momento del gesto, así que el navegador
    // sigue libre de gestionar el scroll con normalidad.
    if (ES_INTERMEDIO && distanciaDesdeInicio(e) >= UMBRAL_MOVIMIENTO_INTERMEDIO_PX) {
      return;
    }

    onClicNormal(idx);
  }

  function onPointerCancel() {
    clearTimeout(idTimeoutPulsacion);
    idTimeoutPulsacion = null;
    idxPulsacion = null;
    pulsacionEsBandera = false;
  }

  function onDobleClic(e) {
    var celdaEl = celdaDesdeEvento(e);
    if (!celdaEl) return;
    e.preventDefault();
    var idx = Number(celdaEl.dataset.idx);
    if (!tablero || tablero.estado === Board.ESTADO.GANADA || tablero.estado === Board.ESTADO.PERDIDA) return;

    var resultado = Board.clicDoble(tablero, idx);
    pintarCeldas(resultado.reveladas);
    despuesDeJugada(resultado.perdida);
  }

  // ---------- Acciones de juego ----------

  function onClicNormal(idx) {
    if (!tablero || tablero.estado === Board.ESTADO.GANADA || tablero.estado === Board.ESTADO.PERDIDA) return;

    var resultado = Board.clic(tablero, idx);
    if (resultado.primerClic) iniciarCronometro();

    pintarCeldas(resultado.reveladas);
    despuesDeJugada(resultado.perdida);
  }

  function onBandera(idx) {
    if (!tablero || tablero.estado === Board.ESTADO.GANADA || tablero.estado === Board.ESTADO.PERDIDA) return;

    var cambiada = Board.bandera(tablero, idx);
    if (cambiada) {
      pintarCelda(idx);
      actualizarContadorMinas();
    }
  }

  function despuesDeJugada(perdida) {
    if (perdida) {
      pintarTodasLasMinas();
      detenerCronometro();
      elReset.classList.add('bm-reset--perdida');
      elMensaje.textContent = 'Has perdido. Pulsa reiniciar para jugar de nuevo.';
      elMensaje.className = 'bm-mensaje bm-mensaje--perdida';
    } else if (tablero.estado === Board.ESTADO.GANADA) {
      detenerCronometro();
      elReset.classList.add('bm-reset--ganada');
      elMensaje.textContent = '¡Has ganado!';
      elMensaje.className = 'bm-mensaje bm-mensaje--ganada';
    }
  }

  // Al perder, board.js ya marca todas las minas como reveladas: solo hace falta repintarlas.
  function pintarTodasLasMinas() {
    for (var i = 0; i < tablero.celdas.length; i++) {
      if (tablero.celdas[i].mina) pintarCelda(i);
    }
  }

  // ---------- Pintado ----------

  function pintarCeldas(indices) {
    for (var i = 0; i < indices.length; i++) pintarCelda(indices[i]);
  }

  function pintarTodo() {
    for (var i = 0; i < tablero.celdas.length; i++) pintarCelda(i);
  }

  function pintarCelda(idx) {
    var celda = tablero.celdas[idx];
    var div = celdasEl[idx];
    div.className = 'bm-cell';
    div.textContent = '';

    if (celda.revelada) {
      if (celda.mina) {
        div.classList.add('bm-cell--open', 'bm-cell--mine');
        if (idx === tablero.celdaMinaPulsada) div.classList.add('bm-cell--mine-exploded');
        div.setAttribute('aria-label', idx === tablero.celdaMinaPulsada ? 'Mina pulsada' : 'Mina');
      } else {
        div.classList.add('bm-cell--open');
        if (celda.adyacentes > 0) {
          div.classList.add('bm-cell--n' + celda.adyacentes);
          div.textContent = String(celda.adyacentes);
          div.setAttribute('aria-label', celda.adyacentes + ' minas alrededor');
        } else {
          div.setAttribute('aria-label', 'Casilla vacía');
        }
      }
    } else if (celda.bandera) {
      div.classList.add('bm-cell--closed', 'bm-cell--flagged');
      div.innerHTML = SVG_BANDERA;
      div.setAttribute('aria-label', 'Casilla con bandera');
    } else {
      div.classList.add('bm-cell--closed');
      div.setAttribute('aria-label', 'Casilla sin abrir');
    }
  }

  function actualizarContadorMinas() {
    elContadorMinas.textContent = String(Board.minasRestantes(tablero));
  }

  // ---------- Cronómetro ----------

  function iniciarCronometro() {
    detenerCronometro();
    segundos = 0;
    actualizarCronometro();
    idTemporizador = setInterval(function () {
      segundos++;
      actualizarCronometro();
    }, 1000);
  }

  function detenerCronometro() {
    if (idTemporizador !== null) {
      clearInterval(idTemporizador);
      idTemporizador = null;
    }
  }

  function actualizarCronometro() {
    elCronometro.textContent = String(segundos);
  }

  // ---------- Inicialización ----------

  elBoard.addEventListener('pointerdown', onPointerDown);
  elBoard.addEventListener('pointerup', onPointerUp);
  elBoard.addEventListener('pointercancel', onPointerCancel);
  elBoard.addEventListener('pointermove', onPointerMove);
  elBoard.addEventListener('dblclick', onDobleClic);
  // Sin click derecho: se anula el menú contextual nativo sobre el tablero.
  elBoard.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  elReset.addEventListener('click', iniciarPartida);

  iniciarPartida();
})();
