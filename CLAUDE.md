# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static website for **Buscaminas Experto** (buscaminasexpert.es / buscaminasexperto.es), a free browser Minesweeper in Spanish: play the game, learn to play via an interactive tutorial ("Entrenador"), and legal pages. Pure HTML + CSS + vanilla JS — no framework, no build step, no package manager, no test suite. Deployed as static files (Netlify, per `_redirects`; `.assetsignore` also references `.wrangler`/Cloudflare tooling).

Content and language: all copy, comments, and commit messages are in **Spanish**. Match that when editing files or writing commits.

## Running locally

There is no dev server or build command. Serve the repo root with any static file server and open pages directly, e.g.:

```bash
npx serve .
```

or simply open the `.html` files in a browser (relative asset paths work either way).

## Architecture

### Game engine vs. presentation split

The playable game is split into three layers, reused across all difficulty levels:

- [juego/motor/board.js](juego/motor/board.js) — pure game state/logic (`window.BuscaminasBoard`). No DOM access at all: board creation, first-click-safe mine placement (Fisher-Yates over eligible cells, excluding the clicked cell and its neighbors), flood-fill reveal, chording, flagging, win/loss detection. Designed to be testable in isolation even though no tests currently exist.
- [juego/motor/render.js](juego/motor/render.js) — DOM rendering + input handling for `#bm-board`: builds cell `<div>`s, wires pointer events (click, double-click/chord, ~400ms long-press for flag on touch), timer, mine counter, win/lose messaging. Reads board dimensions from `data-filas`/`data-columnas`/`data-minas` on `#bm-board` rather than hardcoding them, so this file is identical across levels.
- [juego/shell/niveles.js](juego/shell/niveles.js) — single source of truth for per-level parameters (`principiante`/`intermedio`/`experto`: cols, rows, mines, min cell size). `BuscaminasNiveles.aplicar(id)` sets CSS custom properties on `<html>` and the `data-*`/`aria-label` attributes on `#bm-board` — **must run before `motor/board.js` loads**.
- [juego/shell/layout.js](juego/shell/layout.js) — presentation-only sizing (not game logic): measures available space with `ResizeObserver` and fixes `--bm-cell-size` in px so a revealed cell's content (numbers) never changes the board's overall size. Handles the tablet/desktop "always fits, never scrolls, shrink smoothly" sizing that CSS alone can't do reliably when the board's height comes from a nested column flex layout.
- [juego/shell/styles.css](juego/shell/styles.css) — shared styles for the game shell (board, cells, panel/HUD), used by every level page.

**Adding a new level** means adding an entry to `NIVELES` in `niveles.js` and a new level HTML page (see [juego/shell/experto.html](juego/shell/experto.html) as the current reference/template) — no changes needed to `board.js`, `render.js`, or `layout.js`.

One CSS variable is deliberately *not* set from `niveles.js`: `--bm-board-max-width`. Its value differs per breakpoint (mobile/tablet vs. desktop), and an inline style set via JS on `<html>` would out-specificity any stylesheet rule including ones inside `@media`, breaking the responsive cascade. Each level page instead declares that variable itself in a small inline `<style>` block in its own `<head>`.

Load order in a level page matters: `niveles.js` → `BuscaminasNiveles.aplicar(id)` inline call → `motor/board.js` → `motor/render.js` → `shell/layout.js`.

### Site shell vs. game shell

Two separate CSS systems coexist by design:

- [css/styles.css](css/styles.css) — the marketing/legal site design system (colors, typography, header/nav, cards, buttons, `.tip-box`, `.practice-window`). Loaded on every non-game-embedded page.
- [juego/shell/styles.css](juego/shell/styles.css) — game-shell-specific styles (board, HUD, cell bevels), loaded in addition to `css/styles.css` on level pages.
- [tutorial/index.html](tutorial/index.html) is fully self-contained (own inline styles and JS), delivered pre-built by the content team; only navigation, footer, favicon, and analytics were added to match site conventions. Don't assume it shares any code with `css/styles.css` or the game engine.

`css/styles.css` documents the project's breakpoint policy in its header comment: mobile-first, exactly three ranges (mobile: no query; tablet: `min-width: 640px`; desktop: `min-width: 1024px`), with literal pixel values repeated in each `@media` (custom properties don't work inside media query conditions). Any new page must follow this same convention.

### Board sizing policy (important when touching layout/CSS)

On tablet/desktop the board must **never scroll** — it shrinks fluidly to fit both width and height. Only on mobile does a minimum playable cell size (`--bm-cell-min`, ~28-32px) apply as a hard floor, below which `.bm-board-wrap` switches to `overflow: auto` instead of shrinking further. This asymmetry is intentional (see the long comment at the top of `css/styles.css`): on tablet/desktop the constraining axis is usually height (HUD + potential ad slot competing with the board), so applying the mobile floor there would cause unwanted vertical overflow.

### Brand/design reference

[docs/informe-identidad-marca.md](docs/informe-identidad-marca.md) is the source-of-truth brand spec that `css/styles.css` and the game shell implement: accent color `#FF6F00`, a fixed danger palette for numbers 1-8, flag styling (gray mast + red `#E53935` pennant, distinct from the brand orange), real bevel geometry for cells/buttons, Inter as the only typeface, and tuteo/plain-vocabulary tone (no solver jargon like "1-2-1" on beginner-facing surfaces). The number 3 in the danger palette (`#F2B705`) has low contrast on white and is compensated with `font-weight: 800` — keep that if reusing the palette elsewhere.

### Legal pages

[legal/](legal/) holds the currently-published (minimal, no-ads-yet) versions of the legal pages. [docs/legal-futuro/](docs/legal-futuro/) holds the fuller versions to swap in once Google AdSense and a cookie consent (CMP) are activated — don't merge these two sets casually, they describe different site states.

### Other pages

- [index.html](index.html) — homepage.
- [entrenador.html](entrenador.html) — tutorial landing page; solver-pattern lessons beyond the basics are marked "Próximamente" (coming soon).
- `juego/principiante.html`, `juego/intermedio.html` — level pages using the shared shell (see Architecture above); `juego/shell/experto.html` is the expert level, still under `shell/` rather than promoted to `juego/experto.html`.
