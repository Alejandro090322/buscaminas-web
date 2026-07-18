# Buscaminas Experto — sitio web (V1)

Esqueleto completo del sitio: navegación, diseño visual, páginas legales y
plantillas del tutorial. Listo para subir a GitHub y desplegar en Netlify.

## Estructura

```
index.html              → Página de Inicio
entrenador.html          → Landing del Entrenador (tutorial activo, patrones "Próximamente")
tutorial/
  index.html             → Índice de las 5 lecciones
  leccion-1.html … 5.html → Plantillas de cada lección (contenido pendiente)
legal/
  aviso-legal.html        → Borrador — completar datos entre [CORCHETES]
  privacidad.html          → Borrador — completar datos entre [CORCHETES]
css/styles.css            → Sistema de diseño completo (colores, tipografía, componentes)
js/nav.js                 → Menú móvil
assets/favicon.svg        → Icono del sitio
robots.txt / sitemap.xml  → SEO técnico básico
```

## Para quien rellene el contenido del tutorial

Cada archivo `tutorial/leccion-N.html` tiene un bloque marcado así:

```html
<!-- CONTENIDO PENDIENTE — a completar por el equipo de contenido del entrenador. ... -->
<div class="lesson-content-pending">
  Contenido de esta lección pendiente de redactar.
</div>
```

Sustituye ese `<div>` por el contenido real (texto, listas, imágenes,
interactividad). No hace falta tocar nada de la cabecera, pie de página ni
navegación entre lecciones: ya funcionan. Usa las clases ya definidas en
`css/styles.css` (`.card`, `.pill`, etc.) para mantener el estilo consistente,
o pide que se añadan clases nuevas si algo no encaja.

## Pendiente antes de publicar

- Completar los datos entre `[CORCHETES]` en `legal/aviso-legal.html` y
  `legal/privacidad.html` (nombre/razón social, NIF, dirección, email).
- Elegir e integrar la herramienta de analítica sin cookies (Cloudflare Web
  Analytics o GoatCounter) y actualizar el nombre real en `privacidad.html`.
- Subir esta carpeta a un repositorio de GitHub y conectarlo con Netlify.
- Apuntar el dominio buscaminasexperto.es a Netlify.

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
