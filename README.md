# Pokimon Rubí-lite

Juego de rol por turnos inspirado en Pokémon Rubí, hecho con **Phaser + Vite + TypeScript**. Dos mapas explorables, combates aleatorios en hierba alta, audio procedural y un pipeline de assets completo: **atlas de sprites, tilemaps de Tiled, fuente bitmap y object pooling**.

Todo el arte y el audio son originales y se generan por código (sin assets externos ni material de terceros).

## Arranque rápido

```bash
npm install
npm run dev          # http://localhost:5173
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Comprobación de tipos + build de producción en `dist/` (rutas relativas) |
| `npm run assets` | Regenera atlas, tileset, fuente y mapas de Tiled en `public/assets/` |
| `npm test` | 47 tests (motor de combate, canciones, integridad de atlas y mapas) |
| `npm run lint` | ESLint + typescript-eslint |
| `npm run check` | lint + tests + build (lo mismo que ejecuta el CI) |
| `npm run sheet` | Hojas de sprites ×4 en `out/` para revisar el arte |
| `npm run shot -- <nombre>` | Captura del juego real con Chromium headless (ver `tools/screenshot.ts`) |

Controles: **flechas/WASD** mover · **Z/Enter/Espacio** confirmar · **X/Backspace** volver · **M** silenciar.

## Qué demuestra este proyecto

| Tema | Dónde | Resumen |
| --- | --- | --- |
| **Atlas** | `tools/build-assets.ts`, `PreloadScene` | 45 sprites en un único `atlas.png` + `atlas.json` (formato JSON Hash de Phaser/TexturePacker), cargado con `load.atlas`. Todo el juego usa `add.image(x, y, 'atlas', 'frame')`. |
| **Tilemaps de Tiled** | `public/assets/maps/*.json`, `OverworldScene` | Capas `ground` / `objects` / `collision` + capa de objetos `entities` (spawn y warps) + propiedades de tile (`tallGrass`, `water`). Cargados con `load.tilemapTiledJSON`. |
| **Object pooling** | `src/systems/pool.ts` | `Pool<T>` sobre `Phaser.GameObjects.Group` para efectos de impacto, textos y cajas de menú, cortinas de transición y fundidos. |
| **Escena persistente** | `BattleScene` | Se crea una vez y después `sleep`/`wake`: sus pools sobreviven entre combates. |
| **Fuente bitmap** | `public/assets/font.fnt` | Formato BMFont XML estándar, cargada con `load.bitmapFont`. |
| **Lógica desacoplada** | `src/systems/battleEngine.ts` | El combate es lógica pura (sin Phaser) que devuelve eventos; la escena solo anima. Testeable sin render. |

### Object pooling: resultados medidos

Se fuerzan 4 combates consecutivos y se leen los contadores de los pools de `BattleScene` (`getState().pools`):

| Tras… | imágenes creadas | imágenes reutilizadas | textos creados | textos reutilizados |
| --- | --- | --- | --- | --- |
| combate 1 | 21 | 15 | 22 | 16 |
| combate 2 | 21 | 26 | 22 | 26 |
| combate 3 | 21 | 37 | 22 | 36 |
| combate 4 | **21** | **48** | **22** | **46** |

Los objetos **creados no crecen** después del primer combate; solo crece el número de reutilizaciones. Cada pool expone `stats` (`created`, `reused`, `active`, `total`).

> Honestidad técnica: en un juego de esta escala el pooling no cambia los FPS; está para demostrar el patrón y evitar basura/GC en las animaciones frecuentes (impactos, menús). Los contadores son la prueba de que funciona.

## Arquitectura

```
art/                    Arte procedural (SOLO en build, no entra en el bundle del juego)
  palette.ts            Única paleta (31 colores) · grid.ts primitivas con luz arriba-izquierda
  tiles.ts player.ts creatures/ ui.ts font.ts
tools/
  build-assets.ts       art/ + mapas ASCII  →  public/assets/ (atlas, tileset, fuente, Tiled)
  maps/                 Mapas fuente (ASCII) y conversor a Tiled
  export-sheet.ts       Hojas de sprites para revisar el arte
  screenshot.ts         Capturas del juego real (Playwright)
public/assets/          Assets generados y versionados (el juego solo carga esto)
src/
  main.ts config.ts     Arranque de Phaser y constantes
  data/                 Datos puros: especies, movimientos, tipos, encuentros, ids de mapa
  systems/              Reglas sin Phaser: battleEngine, creature, audio, songs, pool, transition
  scenes/               Preload, Overworld, Battle, UI
  ui/                   PixelText, StatusBox, métricas de fuente, colores
```

Flujo de datos: **`art/` + `tools/maps` → `npm run assets` → `public/assets/` → `PreloadScene` → escenas**.

```
PreloadScene ──carga──▶ atlas · tileset · font.fnt · maps/*.json
     │
     ▼
OverworldScene ──encuentro──▶ BattleScene (wake) ──resultado──▶ OverworldScene (resume)
     │  Tiled: capas, collision, warps, tallGrass          │  Battle.resolveTurn() → eventos → animación
     └────────────── UIScene (silencio, siempre encima) ───┘
```

### Decisiones de diseño

- **El arte vive fuera del runtime.** Antes se generaba en `BootScene`; ahora un script produce los mismos assets que haría un artista con TexturePacker y Tiled. El juego carga archivos reales, así que cambiar el arte no exige tocar el código (ver `docs/ASSETS.md`).
- **Colisión y hierba por datos de Tiled**, no por constantes en código: la capa `collision` y las propiedades de tile (`tallGrass`, `water`, `waterFrame`) mandan.
- **Combate = eventos.** `Battle.resolveTurn()` calcula todo y devuelve una lista (`text`, `move`, `hit`, `faint`, `exp`, `levelUp`, `end`); `BattleScene` solo la reproduce con `async/await`.
- **Pixel-perfect:** 240×160 internos, `pixelArt`, `roundPixels`, zoom entero y 2 px de margen entre frames del atlas.
- **Los eventos de escena sobreviven al `restart`:** `OverworldScene` registra y retira su listener de `resume` para no acumular manejadores duplicados.

## Pruebas

`npm test` ejecuta 47 pruebas, entre ellas:

- **Motor:** tabla de tipos, fórmula de daño con STAB, orden por velocidad, PP/Forcejeo, EXP y subida de nivel, huida y tablas de encuentro disjuntas.
- **Assets generados:** cada especie tiene frontal/trasera en el atlas, ningún frame se solapa, y **todo nombre de frame que el código pide existe** (detecta erratas).
- **Mapas de Tiled:** capas con `width×height` celdas, spawn transitable, warps hacia mapas y casillas válidas, propiedades de tile presentes.

## Límites conocidos

- Cada criatura tiene 4 movimientos fijos y no hay estados alterados; captura, inventario, tienda y guardado quedan fuera del alcance.
- El texto es solo en mayúsculas (la fuente propia no tiene minúsculas).
- La música es chiptune sintetizada; está verificada por medición de nivel, no por escucha.

## Licencias

Sin assets externos: sprites, fuente, música y efectos se generan por código. Dependencia de ejecución: `phaser` (MIT).
