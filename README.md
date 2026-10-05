# Pokimon Rubí-lite

Juego de rol por turnos inspirado en Pokémon Rubí, hecho con **Phaser 3/4 + Vite + TypeScript**.
Alcance deliberadamente pequeño: **2 mapas**, combates aleatorios en hierba alta y **todo el arte y el audio generados por código** (sin assets externos, sin material de Nintendo).

## Cómo ejecutarlo

```bash
npm install
npm run dev        # http://localhost:5173
```

Otros comandos:

| Comando | Qué hace |
| --- | --- |
| `npm run build` | Comprueba tipos y genera `dist/` |
| `npm test` | Tests del motor de combate, mapas y canciones (Vitest) |
| `npm run sheet` | Exporta `out/sheet.png` (tiles, jugador, criaturas, ×4) y `out/sheet_ui.png` (fuente, cajas, fondo de combate) |
| `npm run shot -- <nombre>` | Captura el juego real con Chromium headless en `out/<nombre>.png` (ver `tools/screenshot.ts`) |

> La primera vez, para `npm run shot`: `npx playwright install chromium`.

## Controles

| Acción | Teclas |
| --- | --- |
| Mover | Flechas o WASD (pulsar una dirección distinta solo gira; mantener camina) |
| Confirmar | Z, Enter o Espacio |
| Volver | X, Backspace o Escape |
| Silenciar | M o clic en el altavoz (arriba a la derecha) |

El navegador solo permite audio tras un gesto: la música empieza con la primera tecla que pulses.

## Qué incluye

- **Pueblo (Villa Brasa)** y **Ruta 1**, unidos por un camino con fundido a negro. 4 direcciones, casillas de 16×16, animación de caminata, colisiones (agua, árboles, casas, rocas, vallas), agua animada, cartel con el nombre del mapa y hierba que cubre los pies.
- **Combates aleatorios** (12 % por casilla de hierba alta) con tabla propia por mapa:
  - Pueblo: Pelusón, Hojín, Gotilla (nv 3–5)
  - Ruta: Aleteo, Cangrejete, Brasito (nv 5–8)
- **Combate clásico por turnos**: LUCHAR (4 movimientos con tipo y PP) · MOCHILA y EQUIPO (deshabilitados) · HUIR (probabilístico). Orden por velocidad, daño `((2·N/5+2)·Poder·Atq/Def)/50+2` con variación 0,85–1, STAB ×1,5 y tabla de tipos (Fuego, Agua, Planta, Normal). Experiencia, subida de nivel, pantalla de victoria/derrota. Si pierdes, te curas y vuelves al pueblo.
- **Transición** de combate: doble destello + barrido de bandas.
- **Audio** Web Audio: 15 efectos, 2 loops chiptune (overworld y combate), botón de silencio (se recuerda entre sesiones).

Fuera de alcance a propósito: captura, inventario, tienda, guardado, historia y más de 2 mapas. Cada criatura tiene 4 movimientos fijos (no aprende más al subir de nivel) y no hay estados alterados.

## Arquitectura

```
src/
  main.ts                    config Phaser (240×160, pixelArt, zoom entero)
  art/                       todo el arte procedural
    palette.ts               ÚNICA paleta (31 colores); una letra = un color
    grid.ts                  lienzo con sombreado de luz arriba-izquierda y contorno de 1 px
    pixmap.ts                sprite = string[]; validación contra la paleta
    tiles.ts player.ts creatures/ font.ts ui.ts
    textures.ts              convierte los sprites en texturas de Phaser (BootScene)
  data/                      datos, nada hardcodeado en escenas
    types.ts moves.ts species.ts encounters.ts maps/{town,route,parse}.ts
  systems/
    battleEngine.ts          lógica de combate pura (sin Phaser) → lista de eventos
    creature.ts gameState.ts transition.ts
    audio.ts songs.ts        síntesis + secuenciador / canciones como datos
  scenes/                    Boot, Overworld (reutilizable por mapa), Battle, UI
  ui/                        PixelText (fuente bitmap), StatusBox (cajas de PS)
tools/                       export-sheet.ts, screenshot.ts
```

### Decisiones de diseño

- **Arte como matrices de píxeles.** Los sprites son `string[]` (un carácter por color de la paleta). Los de 64×64 de las criaturas se *generan* con primitivas de `grid.ts` (elipsoides sombreados, polígonos, contorno automático) en vez de teclear 4096 caracteres a mano; el resultado sigue siendo una matriz validada contra la paleta.
- **Motor de combate separado de la escena.** `Battle.resolveTurn()` devuelve eventos (`text`, `move`, `hit`, `faint`, `exp`, `levelUp`, `end`) y la escena solo los anima. Por eso se puede testear sin render (`npm test`).
- **Mapas como ASCII.** Cada carácter es una casilla; `parse.ts` los expande a las capas suelo / objetos / colisión y se cargan con tilemaps de Phaser. El agua anima cambiando entre 3 tiles.
- **Fuente propia** (5×7, mayúsculas, con acentos y ñ) para no depender de licencias. Todo el texto se escribe en mayúsculas, como en la GBA.
- **Pixel-perfect.** 240×160 internos, `pixelArt`, `roundPixels` y zoom entero máximo que quepa en la ventana.

## Verificación visual

`npm run sheet` genera las hojas ×4 que se revisaron una a una (legibilidad, coherencia de paleta, silueta) y se reescribieron hasta quedar aceptables. Para depurar en desarrollo, la consola del navegador expone `__game`, `__state` y `__audio`, y `tools/screenshot.ts` los usa para capturar estados concretos (`TELEPORT`, `ENCOUNTER`, `KEYS`, `PRINT`; ver la cabecera del archivo).

## Licencias

Sin assets externos: sprites, fuente, música y efectos se generan por código. Dependencias de ejecución: solo `phaser` (MIT).
