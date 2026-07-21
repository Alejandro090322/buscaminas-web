/*
 * Buscaminas Experto — motor puro del tablero, compartido por todos los
 * niveles (Principiante, Intermedio, Experto). Sin dependencias del DOM:
 * solo estado y funciones sobre ese estado, para que sea reutilizable y
 * testeable de forma aislada. El renderizado vive en render.js.
 *
 * crear(filas, columnas, numMinas) acepta las dimensiones del nivel; los
 * valores por defecto (9x9, 10 minas) son los de Principiante, para que
 * una llamada sin argumentos siga generando exactamente ese tablero.
 */

(function (global) {
  'use strict';

  var FILAS_DEFECTO = 9;
  var COLUMNAS_DEFECTO = 9;
  var MINAS_DEFECTO = 10;

  var ESTADO = {
    ESPERANDO: 'esperando', // aún no se ha hecho el primer click: el tablero no tiene minas
    JUGANDO: 'jugando',
    GANADA: 'ganada',
    PERDIDA: 'perdida'
  };

  // ---------- Utilidades de coordenadas ----------

  function indice(tablero, fila, columna) {
    return fila * tablero.columnas + columna;
  }

  function coordenadas(tablero, idx) {
    return { fila: Math.floor(idx / tablero.columnas), columna: idx % tablero.columnas };
  }

  function dentroDelTablero(tablero, fila, columna) {
    return fila >= 0 && fila < tablero.filas && columna >= 0 && columna < tablero.columnas;
  }

  // Vecindad de Moore (hasta 8 vecinas), con los ajustes de borde/esquina correspondientes
  function vecinos(tablero, idx) {
    var pos = coordenadas(tablero, idx);
    var resultado = [];
    for (var df = -1; df <= 1; df++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (df === 0 && dc === 0) continue;
        var f = pos.fila + df;
        var c = pos.columna + dc;
        if (dentroDelTablero(tablero, f, c)) {
          resultado.push(indice(tablero, f, c));
        }
      }
    }
    return resultado;
  }

  // ---------- Creación del tablero ----------

  function crearTablero(filas, columnas, numMinas) {
    var celdas = new Array(filas * columnas);
    for (var i = 0; i < celdas.length; i++) {
      celdas[i] = { mina: false, revelada: false, bandera: false, adyacentes: 0 };
    }
    return {
      filas: filas,
      columnas: columnas,
      numMinas: numMinas,
      celdas: celdas,
      estado: ESTADO.ESPERANDO,
      minasColocadas: false,
      celdaMinaPulsada: -1 // índice de la mina que hizo perder la partida, para resaltarla distinto
    };
  }

  // Fisher-Yates in-place
  function barajar(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  // Reparte las minas excluyendo la celda del primer click y sus vecinas (seguridad
  // del primer click), mediante lista + shuffle Fisher-Yates (sin reintentos).
  function colocarMinas(tablero, idxPrimerClick) {
    var excluidas = {};
    excluidas[idxPrimerClick] = true;
    vecinos(tablero, idxPrimerClick).forEach(function (v) { excluidas[v] = true; });

    var elegibles = [];
    for (var i = 0; i < tablero.celdas.length; i++) {
      if (!excluidas[i]) elegibles.push(i);
    }
    barajar(elegibles);

    var minas = elegibles.slice(0, tablero.numMinas);
    minas.forEach(function (i) { tablero.celdas[i].mina = true; });

    // Números de adyacencia (solo tiene sentido en casillas sin mina)
    for (var j = 0; j < tablero.celdas.length; j++) {
      if (tablero.celdas[j].mina) continue;
      var vec = vecinos(tablero, j);
      var n = 0;
      for (var k = 0; k < vec.length; k++) {
        if (tablero.celdas[vec[k]].mina) n++;
      }
      tablero.celdas[j].adyacentes = n;
    }

    tablero.minasColocadas = true;
  }

  // ---------- Revelado ----------

  // Revelado en cascada (flood fill) iterativo con pila, para no depender de la
  // profundidad de recursión. Se detiene en cualquier casilla con número > 0
  // (esa casilla se abre, pero no propaga más allá).
  function revelar(tablero, idxInicial) {
    var inicial = tablero.celdas[idxInicial];
    if (inicial.revelada || inicial.bandera) return [];

    var reveladas = [];
    var pila = [idxInicial];
    var visitadas = {};

    while (pila.length > 0) {
      var idx = pila.pop();
      if (visitadas[idx]) continue;
      visitadas[idx] = true;

      var celda = tablero.celdas[idx];
      if (celda.revelada || celda.bandera) continue;

      celda.revelada = true;
      reveladas.push(idx);

      // No debería llegar aquí una mina (se gestiona aparte con perder()),
      // pero se protege por si acaso para no propagar desde ella.
      if (celda.mina) continue;

      if (celda.adyacentes === 0) {
        var vec = vecinos(tablero, idx);
        for (var i = 0; i < vec.length; i++) {
          var v = vec[i];
          if (!tablero.celdas[v].revelada && !tablero.celdas[v].bandera) {
            pila.push(v);
          }
        }
      }
    }

    return reveladas;
  }

  function comprobarVictoria(tablero) {
    var noReveladas = 0;
    for (var i = 0; i < tablero.celdas.length; i++) {
      if (!tablero.celdas[i].revelada) noReveladas++;
    }
    // Se gana cuando las únicas casillas sin revelar son las minas
    return noReveladas === tablero.numMinas;
  }

  function perder(tablero, idxPulsada) {
    tablero.estado = ESTADO.PERDIDA;
    tablero.celdaMinaPulsada = idxPulsada;
    tablero.celdas[idxPulsada].revelada = true;
    for (var i = 0; i < tablero.celdas.length; i++) {
      if (tablero.celdas[i].mina) tablero.celdas[i].revelada = true;
    }
  }

  // ---------- Acciones del jugador ----------

  // Click/toque normal sobre una casilla. Genera el tablero en el primer click válido.
  function clic(tablero, idx) {
    if (tablero.estado === ESTADO.GANADA || tablero.estado === ESTADO.PERDIDA) {
      return { reveladas: [], perdida: false, primerClic: false };
    }

    var celda = tablero.celdas[idx];
    if (celda.bandera || celda.revelada) {
      return { reveladas: [], perdida: false, primerClic: false };
    }

    var primerClic = false;
    if (!tablero.minasColocadas) {
      colocarMinas(tablero, idx);
      tablero.estado = ESTADO.JUGANDO;
      primerClic = true;
    }

    if (celda.mina) {
      perder(tablero, idx);
      return { reveladas: [idx], perdida: true, primerClic: primerClic };
    }

    var reveladas = revelar(tablero, idx);
    if (comprobarVictoria(tablero)) {
      tablero.estado = ESTADO.GANADA;
    }
    return { reveladas: reveladas, perdida: false, primerClic: primerClic };
  }

  // Chording: doble click/doble toque sobre una casilla ya revelada con número.
  // Si el número de banderas vecinas coincide exactamente con el número mostrado,
  // abre automáticamente las vecinas sin bandera (con flood fill si corresponde).
  function encadenar(tablero, idx) {
    var celda = tablero.celdas[idx];
    if (!celda.revelada || celda.mina || celda.adyacentes === 0) {
      return { reveladas: [], perdida: false };
    }

    var vec = vecinos(tablero, idx);
    var banderas = 0;
    for (var i = 0; i < vec.length; i++) {
      if (tablero.celdas[vec[i]].bandera) banderas++;
    }
    if (banderas !== celda.adyacentes) {
      return { reveladas: [], perdida: false };
    }

    var reveladasTotal = [];
    for (var j = 0; j < vec.length; j++) {
      var v = vec[j];
      var vecina = tablero.celdas[v];
      if (vecina.revelada || vecina.bandera) continue;

      if (vecina.mina) {
        // Bandera mal colocada: destaparla al hacer chording pierde la partida,
        // igual que si se hubiera pulsado la mina directamente.
        perder(tablero, v);
        reveladasTotal.push(v);
        return { reveladas: reveladasTotal, perdida: true };
      }

      reveladasTotal = reveladasTotal.concat(revelar(tablero, v));
    }

    return { reveladas: reveladasTotal, perdida: false };
  }

  function clicDoble(tablero, idx) {
    if (tablero.estado === ESTADO.GANADA || tablero.estado === ESTADO.PERDIDA) {
      return { reveladas: [], perdida: false };
    }
    if (!tablero.minasColocadas) {
      return { reveladas: [], perdida: false };
    }

    var resultado = encadenar(tablero, idx);
    if (!resultado.perdida && comprobarVictoria(tablero)) {
      tablero.estado = ESTADO.GANADA;
    }
    return resultado;
  }

  // Pulsación larga: alterna bandera. No requiere que el tablero tenga minas
  // colocadas todavía (se puede banderear antes del primer click).
  function alternarBandera(tablero, idx) {
    if (tablero.estado === ESTADO.GANADA || tablero.estado === ESTADO.PERDIDA) return false;
    var celda = tablero.celdas[idx];
    if (celda.revelada) return false;
    celda.bandera = !celda.bandera;
    return true;
  }

  function minasRestantes(tablero) {
    var banderas = 0;
    for (var i = 0; i < tablero.celdas.length; i++) {
      if (tablero.celdas[i].bandera) banderas++;
    }
    return tablero.numMinas - banderas;
  }

  // ---------- API pública ----------

  global.BuscaminasBoard = {
    ESTADO: ESTADO,
    crear: function (filas, columnas, numMinas) {
      return crearTablero(
        filas || FILAS_DEFECTO,
        columnas || COLUMNAS_DEFECTO,
        numMinas || MINAS_DEFECTO
      );
    },
    clic: clic,
    clicDoble: clicDoble,
    bandera: alternarBandera,
    minasRestantes: minasRestantes,
    indice: indice,
    coordenadas: coordenadas
  };
})(window);
