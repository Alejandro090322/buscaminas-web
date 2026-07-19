# Buscaminas Experto — sitio web (V1)

Esqueleto completo del sitio: navegación, diseño visual, páginas legales y
plantillas del tutorial. Listo para subir a GitHub y desplegar en Netlify.

## Estructura

```
index.html              → Página de Inicio
entrenador.html          → Landing del Entrenador (tutorial activo, patrones "Próximamente")
tutorial/
  index.html             → Tutorial completo (5 lecciones con teoría y ejercicios interactivos, una sola página con motor JS propio, aportada por el equipo de contenido)
juego/
  principiante.html       → Página "Próximamente" del nivel Principiante jugable
legal/
  aviso-legal.html        → Datos identificativos del titular
  privacidad.html          → Qué datos se tratan y con qué base jurídica
  cookies.html              → Qué cookies hay activas hoy (ninguna) y cuáles se activarán con la publicidad
  condiciones-uso.html      → Condiciones de uso del servicio
  contacto.html              → Vía de contacto con el titular
css/styles.css            → Sistema de diseño completo (colores, tipografía, componentes)
js/nav.js                 → Menú móvil
assets/favicon.svg        → Icono del sitio
robots.txt / sitemap.xml  → SEO técnico básico
docs/legal-futuro/        → Versión completa de los documentos legales y de contacto, para publicar cuando el juego, el entrenador avanzado y la publicidad estén activos
```

## Sobre el tutorial

`tutorial/index.html` es una página autocontenida (estilos y JavaScript
propios, sin depender de `css/styles.css`) con 5 lecciones, teoría y
ejercicios interactivos, entregada ya terminada por el equipo de contenido.
Se le añadió únicamente: enlace de vuelta al Entrenador, pie de página con
los enlaces legales, favicon y analítica — para que tenga la misma coherencia
que el resto del sitio. El botón final "Jugar nivel Principiante" enlaza a
`juego/principiante.html` (página "Próximamente"), a la espera de que el
motor del juego jugable esté listo.

## Pendiente antes de activar publicidad

- Cuando se active Google AdSense, actualizar `legal/privacidad.html` y
  `legal/cookies.html` con la versión completa guardada en
  `docs/legal-futuro/` (describe el servicio con anuncios y juego jugable ya activos).
- Añadir el panel de consentimiento de cookies (CMP) en ese mismo momento.

## Decisiones de diseño (resumen)

El sistema de diseño sigue al detalle `informe-identidad-marca.md` (aportado
por el propietario del proyecto):

- **Color**: acento de marca `#FF6F00`; paleta de peligro para números 1-8
  (azul, verde, amarillo, naranja, rojos progresivos); bandera con mástil gris
  y pennant rojo `#E53935`, distinto del naranja de marca.
- **Geometría**: casillas con bisel real (2px claro arriba-izquierda, 2px
  oscuro abajo-derecha en "sin abrir"; invertido en "abierta"), radio 8px en
  casillas y botones, radio 12px en tarjetas sin sombra. El bisel de "casilla
  sin abrir" se reutiliza como lenguaje visual para todo lo bloqueado
  ("Próximamente").
- **Tipografía**: familia única Inter (400/500/600) — sin mezclar fuentes, por
  coherencia de marca y rendimiento de carga.
- **Tono**: tuteo, frases cortas, vocabulario de Fase 1 limitado a casilla,
  número, bandera, mina — sin jerga de resolución (nada de "subconjuntos" ni
  "1-2-1" en superficies visibles al principiante).
- Componentes nuevos disponibles para el tutorial: `.tip-box` (aviso con
  franja naranja) y `.practice-window` (marco para un tablero de práctica
  embebido, con cabecera de etiqueta) — listos en `css/styles.css` para quien
  redacte el contenido de las lecciones.
- Sin frameworks: HTML + CSS + JS vanilla, para minimizar la curva de entrada.

## Nota de accesibilidad

El número 3 de la paleta de peligro (`#F2B705`, amarillo) tiene bajo
contraste sobre fondo blanco. Se ha compensado aplicando `font-weight: 800`
solo a ese número en el tablero decorativo. Si en el tablero jugable real el
número 3 aparece con frecuencia, vale la pena revisar el contraste con una
herramienta de accesibilidad antes de dar la paleta por cerrada.
