/*
 * Buscaminas Experto — ajuste de tamaño del tablero y de la casilla.
 * No es lógica de juego (eso vive en juego/motor/): esto es una ayuda de
 * presentación específica de este nivel.
 *
 * Dos responsabilidades separadas:
 *
 * 1) Tamaño EXTERIOR del tablero en tablet/escritorio: debe caber en
 *    ancho Y alto a la vez sin nunca hacer scroll (ver la política
 *    documentada en css/styles.css), y las técnicas CSS puro para eso
 *    (container queries de tamaño, aspect-ratio con max-height/max-width)
 *    no se comportan de forma fiable cuando el alto de .bm-board-wrap
 *    viene de un flex-grow anidado en columna (el patrón de tablet:
 *    panel arriba, tablero debajo) — ver comentario junto a ".bm-board"
 *    en styles.css. Medir el hueco real con ResizeObserver y fijar los
 *    px directamente evita depender de esas resoluciones CSS frágiles.
 *    En móvil no hace falta: ahí el ancho es el único eje que aprieta, y
 *    el CSS base (width:100% + aspect-ratio + suelo mínimo) ya lo
 *    resuelve sin JS.
 *
 * 2) Tamaño de CASILLA fijo, en los dos casos (móvil incluido): una vez
 *    se conoce el tamaño YA renderizado del tablero (de donde sea que
 *    venga: CSS en móvil, o el punto 1 en tablet/escritorio), se deriva
 *    de él un --bm-cell-size en píxeles y se aplica a los tracks del
 *    grid y a cada celda. Sin esto, los tracks "1fr" del grid reservan
 *    como mínimo el min-content de su contenido, así que una celda con
 *    un número ocupa más que una tapada y el tablero entero crecía al
 *    revelar la primera casilla — el bug reportado. Con --bm-cell-size
 *    fijo en px, el contenido de una celda ya no puede alterar el tamaño
 *    del tablero, pase lo que pase dentro (número, bandera).
 *
 * Para Experto (30x16): copiar este archivo tal cual — ya lee filas y
 * columnas de data-filas/data-columnas en #bm-board, no hace falta tocar
 * ningún número aquí.
 */

(function () {
  'use strict';

  var wrap = document.querySelector('.bm-board-wrap');
  var board = document.getElementById('bm-board');
  if (!wrap || !board) return;

  var TABLET_BREAKPOINT_PX = 640; // mismo valor literal que css/styles.css

  var columnas = Number(board.dataset.columnas) || 16;
  var filas = Number(board.dataset.filas) || 16;
  var proporcion = columnas / filas;

  function numeroVarRaiz(nombre) {
    var valor = getComputedStyle(document.documentElement).getPropertyValue(nombre);
    var px = parseFloat(valor);
    return isNaN(px) ? 0 : px;
  }

  function techoAncho() {
    var px = numeroVarRaiz('--bm-board-max-width');
    return px || Infinity;
  }

  // ---------- 1) Tamaño exterior del tablero (solo tablet/escritorio) ----------
  function ajustarTamanoExterior() {
    if (window.innerWidth < TABLET_BREAKPOINT_PX) {
      // Móvil: se limpia cualquier tamaño fijado antes (p. ej. tras
      // redimensionar la ventana de escritorio a móvil) para que el CSS
      // base (width:100% + aspect-ratio) vuelva a mandar.
      board.style.width = '';
      board.style.height = '';
      return;
    }

    var anchoDisponible = wrap.clientWidth;
    var altoDisponible = wrap.clientHeight;
    if (anchoDisponible <= 0 || altoDisponible <= 0) return;

    var ancho = Math.min(anchoDisponible, altoDisponible * proporcion, techoAncho());
    var alto = ancho / proporcion;

    board.style.width = ancho + 'px';
    board.style.height = alto + 'px';
  }

  // ---------- 2) Tamaño de casilla fijo (móvil y tablet/escritorio) ----------
  // Se lee el ancho YA renderizado de #bm-board (tras aplicar el punto 1,
  // o el CSS base en móvil) y se deriva un tamaño de celda en píxeles
  // exacto, constante para las 256 casillas hasta el próximo recálculo.
  function fijarTamanoCelda() {
    var padding = numeroVarRaiz('--bm-board-padding');
    var gap = numeroVarRaiz('--bm-cell-gap');
    var anchoInterior = board.clientWidth - 2 * padding;
    var celda = (anchoInterior - (columnas - 1) * gap) / columnas;
    if (celda > 0) {
      board.style.setProperty('--bm-cell-size', celda + 'px');
    }
  }

  function ajustarTodo() {
    ajustarTamanoExterior();
    fijarTamanoCelda();
  }

  // "resize" cubre el caso normal (el usuario redimensiona la ventana).
  // El ResizeObserver sobre #bm-board (no solo sobre .bm-board-wrap) es
  // lo que garantiza el punto 2 también en móvil, donde el tamaño
  // exterior lo decide el CSS y no este script: cualquier cambio de
  // tamaño del propio tablero, venga de donde venga, recalcula la celda.
  window.addEventListener('resize', ajustarTodo);
  if (window.ResizeObserver) {
    new ResizeObserver(ajustarTamanoExterior).observe(wrap);
    new ResizeObserver(fijarTamanoCelda).observe(board);
  }

  ajustarTodo();
})();
