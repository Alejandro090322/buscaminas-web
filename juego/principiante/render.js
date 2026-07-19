/*
 * Buscaminas Experto — pinta el estado del tablero (BuscaminasBoard) en el DOM
 * y gestiona la entrada del jugador: click normal, doble click/doble toque
 * (chording) y pulsación larga (~400ms) para banderas. Requiere board.js
 * cargado antes de este script.
 */

(function () {
  'use strict';

  var Board = window.BuscaminasBoard;

  var DURACION_PULSACION_LARGA_MS = 400;
  var TOLERANCIA_MOVIMIENTO_PX = 10; // si el dedo/puntero se mueve más que esto, se cancela la bandera (probablemente es scroll)

  var elBoard = document.getElementById('bm-board');
  var elContadorMinas = document.getElementById('bm-contador-minas');
  var elCronometro = document.getElementById('bm-cronometro');
  var elReset = document.getElementById('bm-reset');
  var elMensaje = document.getElementById('bm-mensaje');

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
    tablero = Board.crear();
    segundos = 0;
    actualizarCronometro();
    actualizarContadorMinas();
    elMensaje.textContent = '';
    elMensaje.className = 'bm-mensaje';
    elReset.textContent = '🙂';

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

  function onPointerMove(e) {
    if (idTimeoutPulsacion === null || idxPulsacion === null) return;
    var dx = e.clientX - inicioX;
    var dy = e.clientY - inicioY;
    if (Math.sqrt(dx * dx + dy * dy) > TOLERANCIA_MOVIMIENTO_PX) {
      // El dedo se ha movido demasiado: probablemente es un scroll, no una bandera.
      clearTimeout(idTimeoutPulsacion);
      idTimeoutPulsacion = null;
    }
  }

  function onPointerUp() {
    clearTimeout(idTimeoutPulsacion);
    idTimeoutPulsacion = null;

    if (idxPulsacion === null) return;
    var idx = idxPulsacion;
    idxPulsacion = null;

    if (pulsacionEsBandera) {
      pulsacionEsBandera = false;
      return; // la pulsación larga ya se gestionó como bandera; no abrir la casilla
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
      elReset.textContent = '😵';
      elMensaje.textContent = 'Has perdido. Pulsa reiniciar para jugar de nuevo.';
      elMensaje.className = 'bm-mensaje bm-mensaje--perdida';
    } else if (tablero.estado === Board.ESTADO.GANADA) {
      detenerCronometro();
      elReset.textContent = '😎';
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
