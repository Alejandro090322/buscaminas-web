/*
 * Buscaminas Experto — configuración de niveles del shell generalizado.
 * Única fuente de verdad para los parámetros que distinguen a cada nivel
 * (Principiante, Intermedio, Experto): dimensiones del tablero, número de
 * minas y tamaño mínimo de celda jugable.
 *
 * La única pieza de configuración por nivel que NO vive aquí es
 * --bm-board-max-width: su valor cambia según el breakpoint (móvil/tablet
 * vs escritorio), y un estilo inline fijado desde JS sobre <html> tiene
 * más especificidad que CUALQUIER regla de la hoja de estilos, incluida
 * una dentro de un @media — fijarlo aquí rompería esa cascada responsive.
 * Por eso cada página de nivel declara esas dos líneas (base + @media
 * 1024px) en un <style> propio, muy pequeño, en su <head> — ver
 * juego/shell/principiante.html como referencia. cols/rows/cell-min no
 * tienen ese problema (un solo valor, sin variación por breakpoint), así
 * que sí es seguro fijarlos desde aquí.
 */

(function (global) {
  'use strict';

  var NIVELES = {
    principiante: { nombre: 'Principiante', cols: 9, rows: 9, mines: 10, cellMin: 30 },
    intermedio: { nombre: 'Intermedio', cols: 16, rows: 16, mines: 40, cellMin: 30 },
    experto: { nombre: 'Experto', cols: 30, rows: 16, mines: 99, cellMin: 30 }
  };

  // Aplica la configuración de un nivel: fija las custom properties CSS
  // seguras (cols/rows/cell-min) sobre <html>, y los data-* + aria-label
  // de #bm-board que motor/board.js y motor/render.js leen para construir
  // el tablero. Debe llamarse ANTES de cargar motor/board.js.
  function aplicarNivel(idNivel) {
    var config = NIVELES[idNivel];
    if (!config) throw new Error('Nivel de Buscaminas desconocido: ' + idNivel);

    var raiz = document.documentElement.style;
    raiz.setProperty('--bm-cols', config.cols);
    raiz.setProperty('--bm-rows', config.rows);
    raiz.setProperty('--bm-cell-min', config.cellMin + 'px');

    var board = document.getElementById('bm-board');
    board.dataset.filas = config.rows;
    board.dataset.columnas = config.cols;
    board.dataset.minas = config.mines;
    board.setAttribute('aria-label', 'Tablero de Buscaminas, ' + config.rows + ' por ' + config.cols);

    var elNivelNombre = document.querySelector('[data-bm-nivel-nombre]');
    if (elNivelNombre) elNivelNombre.textContent = config.nombre;

    return config;
  }

  global.BuscaminasNiveles = { NIVELES: NIVELES, aplicar: aplicarNivel };
})(window);
