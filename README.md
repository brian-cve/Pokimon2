# Pokimon Rubí-lite

Juego de rol por turnos inspirado en Pokémon Rubí, hecho con **Phaser 3 (3.90) + Vite + TypeScript**. Dos mapas explorables, combates aleatorios en hierba alta, audio procedural y un pipeline de assets completo: **atlas de sprites, tilemaps de Tiled, fuente bitmap y object pooling**.

**Arte:** por defecto todo el arte (mundo, personaje, criaturas, interfaz) y el audio se generan por código (`art/`) y se vuelcan a un **atlas editable** en `public/assets/atlas.png` + `atlas.json`: puedes abrirlo y cambiar personajes a mano. Opcionalmente se pueden importar los packs CC0 de Kenney (`npm run assets:kenney`, ver [`CREDITS.md`](CREDITS.md)). Sin material de Nintendo ni de terceros con copyright.

## Arranque rápido

```bash
npm install
npm run dev          # http://localhost:5173

# regenerar el atlas desde el arte procedural (sobrescribe public/assets/)
npm run assets

# opcional: usar los packs de Kenney
npm run assets:download && npm run assets:kenney
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Comprobación de tipos + build de producción en `dist/` (rutas relativas) |
| `npm run assets:download` | Descarga los packs CC0 de Kenney a `assets-src/kenney/` |
| `npm run assets` | Regenera atlas, tileset, fuente y mapas de Tiled en `public/assets/` con el arte procedural (`art/`) |
| `npm run maps` | Regenera solo los mapas de Tiled (no toca atlas ni tileset). **Usa esto en vez de `npm run assets`** si trabajas con las imágenes de `assets-src/custom` |
| `npm run assets:import` | Reconstruye el atlas desde `assets-src/custom/atlas.jpg` |
| `npm run assets:import-tileset` | Reconstruye el tileset desde `assets-src/custom/tileset2.jpg` |
| `npm run assets:kenney` | Lo mismo, pero importando los packs de Kenney |
| `npm test` | 51 tests (motor de combate, canciones, integridad de atlas y mapas) |
| `npm run lint` | ESLint + typescript-eslint |
| `npm run check` | lint + tests + build (lo mismo que ejecuta el CI) |
| `npm run sheet` | Hojas de sprites ×4 en `out/` para revisar el arte |
| `npm run shot -- <nombre>` | Captura del juego real con Chromium headless (ver `tools/screenshot.ts`) |

Controles: **flechas/WASD** mover · **Z/Enter/Espacio** confirmar · **X/Backspace** volver · **Esc/P** pausa · **M** silenciar.

**Combate:** cada movimiento tiene su animación (`src/systems/moveFx.ts`: embestidas, zarpazos, colmillos, bolas de fuego, chorros de llama y agua, ondas, lianas, remolino de hojas) con partículas procedurales (`art/fx.ts`), retroceso con destello y sacudida de cámara según la eficacia. **MOCHILA** y **EQUIPO** del combate, y **MOCHILA** de la pausa, abren la ficha del equipo (`PartyScene`).

**Captura:** en combate, MOCHILA → POKÉ BALL lanza una ball (10 al empezar). La probabilidad sube cuando el rival tiene pocos PS y según el `catchRate` de la especie; la ball se sacude hasta 3 veces antes de atrapar o soltar a la criatura (que contraataca). Las capturadas pasan al equipo (máx. 6) y se pueden elegir como líder desde la **MOCHILA** de la pausa (Z). EQUIPO, en combate, muestra la ficha del equipo.

**Casa de Villa Brasa:** la casa de la izquierda se puede visitar (puerta → interior). Con Z/Enter de frente: la **cama** cura a todo el equipo y el **cofre** repone las Poké Balls. El interior es el mapa `house` (`tools/maps/house.ts`, tiles de `art/interior.ts`).

**Flujo de juego:** `Preload → Title (JUGAR · CONTROLES · SONIDO) → Overworld ⇄ Battle`; desde el mundo, **Esc/P** abre la pausa (CONTINUAR · SONIDO · SALIR AL INICIO, con confirmación). El logo *RUBYMON* y el contador de equipo (6 pokéballs arriba a la izquierda) se generan por código (`src/ui/logo.ts`, `art/hud.ts`). Los menús usan la fuente *Press Start 2P* (OFL, vía `@fontsource`); el texto de combate sigue con la fuente bitmap propia.

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
assets-src/kenney/      Packs CC0 descargados (hojas de tiles + licencia)
  palette.ts            Única paleta (31 colores) · grid.ts primitivas con luz arriba-izquierda
  tiles.ts player.ts creatures/ ui.ts font.ts
tools/
  build-assets.ts       art/ o packs externos + mapas ASCII  →  public/assets/ (atlas, tileset, fuente, Tiled)
  external/kenney.ts    Importador: recorta tiles/personaje/criaturas de las hojas de Kenney
  download-kenney.ts    Descarga y extrae los packs
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

Flujo de datos: **`art/` (o packs de Kenney) + `tools/maps` → `npm run assets` → `public/assets/` → `PreloadScene` → escenas**.

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

`npm test` ejecuta 51 pruebas, entre ellas:

- **Motor:** tabla de tipos, fórmula de daño con STAB, orden por velocidad, PP/Forcejeo, EXP y subida de nivel, huida y tablas de encuentro disjuntas.
- **Assets generados:** cada especie tiene frontal/trasera en el atlas, ningún frame se solapa, y **todo nombre de frame que el código pide existe** (detecta erratas).
- **Mapas de Tiled:** capas con `width×height` celdas, spawn transitable, warps hacia mapas y casillas válidas, propiedades de tile presentes.

## Límites conocidos

- **Arte externo (solo con `assets:kenney`):** los packs de Kenney traen un solo fotograma por personaje y monstruo, así que el jugador no tiene 4 direcciones ni caminata propia (se simula un saltito) y los monstruos de combate son el mismo sprite reflejado de espaldas. Al escalar ×4 los píxeles de las criaturas son más grandes que los de la interfaz.
- **Agua animada y hierba alta:** los packs usados no las traen; se rellenan con arte generado (el script lo avisa).
- Cada criatura tiene 4 movimientos fijos y no hay estados alterados; captura, inventario, tienda y guardado quedan fuera del alcance.
- El texto es solo en mayúsculas (la fuente propia no tiene minúsculas).
- La música es chiptune sintetizada; está verificada por medición de nivel, no por escucha.

## Licencias

Sin assets externos: sprites, fuente, música y efectos se generan por código. Dependencia de ejecución: `phaser` (MIT).
