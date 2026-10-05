# Guía de assets: atlas, tilemaps y cómo cambiar el arte

El juego **no genera nada en runtime**: carga archivos de `public/assets/`. Este documento explica el contrato de esos archivos para poder sustituirlos por arte propio o de licencia libre.

## 1. Qué se carga (`PreloadScene`)

| Archivo | Cargador de Phaser | Clave |
| --- | --- | --- |
| `atlas.png` + `atlas.json` | `load.atlas` | `atlas` |
| `tileset.png` | `load.image` | `tileset` |
| `font.png` + `font.fnt` | `load.bitmapFont` | `pixfont` |
| `maps/town.json`, `maps/route.json` | `load.tilemapTiledJSON` | `map_town`, `map_route` |

## 2. Atlas de sprites

Formato **JSON Hash** (el que exportan TexturePacker y Free Texture Packer para Phaser). El código pide frames **por nombre**, y un test (`src/assets.test.ts`) comprueba que existan todos:

| Frames | Nombres |
| --- | --- |
| Jugador 16×24 | `player_{down,up,left,right}_{0,1,2}` (0 = parado, 1 y 2 = pasos) |
| Criaturas 64×64 | `<id>_front`, `<id>_back` para cada id de `src/data/species.ts` |
| Combate | `battle_bg` (240×112), `ui_dialog`, `ui_prompt`, `ui_menu`, `ui_moves`, `ui_moveinfo`, `ui_hpbox_enemy`, `ui_hpbox_player`, `ui_panel`, `ui_hplabel`, `ui_cursor`, `ui_more`, `fx_{normal,fire,water,grass}` |
| Resto | `ui_banner`, `ui_sound_on`, `ui_sound_off`, `grass_overlay` |
| Utilidad | `px` (1×1 blanco, se escala y se tiñe para barras, cortinas y fundidos) |

Reglas para pixel art: deja **≥ 2 px de margen** entre frames, sin rotación ni recorte (`trimmed: false`) y sin interpolación (el juego ya usa `pixelArt: true`).

### Con TexturePacker / Free Texture Packer
1. Exporta cada sprite como PNG con el nombre del frame (`brasito_front.png`…).
2. Formato **Phaser (JSON Hash)**, margen 2, sin rotación, sin trim.
3. Guarda como `public/assets/atlas.png` y `atlas.json`.
4. `npm test` te dirá qué frame falta.

## 3. Tilemaps con Tiled

1. Abre `public/assets/maps/town.json` en [Tiled](https://www.mapeditor.org/) (el tileset enlaza `tileset.png`, tiles de 16×16).
2. Capas que el motor espera:

| Capa | Tipo | Uso |
| --- | --- | --- |
| `ground` | tiles | suelo; los tiles con propiedad `tallGrass` disparan encuentros |
| `objects` | tiles | árboles, casas, rocas… se dibuja sobre el suelo |
| `collision` | tiles (oculta) | **cualquier tile** en una celda = casilla bloqueada |
| `entities` | objetos | `spawn` (propiedad `dir`) y `warp` (`toMap`, `toX`, `toY`, `dir`) |

3. Propiedades del **mapa**: `displayName` (cartel al entrar) y `encounterTable` (clave de `src/data/encounters.ts`).
4. Propiedades de **tile** (panel *Tile Properties*): `tallGrass: true`, o `water: true` + `waterFrame: 0|1|2` (el agua anima cambiando entre esos 3 tiles).
5. Guarda como JSON (no TMX) y añade el id en `src/data/maps.ts`.

> Los mapas actuales se generan desde ASCII (`tools/maps/town.ts`) con `npm run assets`. Si prefieres editarlos en Tiled, edita el JSON y **no** vuelvas a ejecutar `npm run assets` (sobrescribe `maps/`).

## 4. Fuentes de assets con licencia libre

Para sustituir el arte por algo no generado, usa material con licencia clara y **respeta la atribución cuando se exija**:

- **Kenney** — <https://kenney.nl/assets> — todo en **CC0** (dominio público). Packs pixel-art de 16×16 como *Tiny Town* o *Tiny Dungeon*.
- **OpenGameArt** — <https://opengameart.org> — filtra por licencia (**CC0** o CC-BY) y revisa la de cada asset.
- **itch.io** — <https://itch.io/game-assets/free> — la licencia está en la página de cada pack; elige solo los que la indican.

Herramientas: [Tiled](https://www.mapeditor.org/) (mapas), [Free Texture Packer](http://free-tex-packer.com/) o [TexturePacker](https://www.codeandweb.com/texturepacker) (atlas), [LibreSprite](https://libresprite.github.io/) o Aseprite (dibujo).

> **No incluyas sprites extraídos de juegos de Nintendo/Pokémon en el repositorio.** Son material con copyright de terceros y se mantienen fuera de este proyecto.

## 5. Ejemplo real: importar los packs CC0 de Kenney

Es el flujo que sigue este proyecto. Los comandos y archivos están en el repositorio:

```bash
npm run assets:download     # baja Tiny Town y Tiny Dungeon (CC0) a assets-src/kenney/
npm run assets              # los importa y regenera atlas, tileset y mapas
npm run dev
```

1. **Descargar** — `tools/download-kenney.ts` baja los `.zip` oficiales y conserva solo `Tilemap/tilemap_packed.png` y `License.txt`. Si un enlace falla (llevan un hash), cópialo de la página del pack.
2. **Mirar la hoja** — cada `tilemap_packed.png` mide 192×176: **12 columnas × 11 filas** de 16×16. Una casilla se identifica por `(fila, columna)`; abre la imagen ampliada para elegir.
3. **Mapear** — `tools/external/kenney.ts` dice qué casilla hace de qué cosa del juego:

| Nombre en el juego | Casilla (fila, col) | Pack |
| --- | --- | --- |
| `grass0`, `grass1` | (0,0), (0,1) | Tiny Town |
| `flowerRed` / `flowerYellow` | (0,2) (la segunda, reflejada) | Tiny Town |
| `path` | (2,1) | Tiny Town |
| `treeTop` / `treeBottom` | (0,4) / (1,4) | Tiny Town |
| `forest` | (1,7) | Tiny Town |
| `fence` | (6,9) + poste de (6,8) (composición) | Tiny Town |
| `house0…8` | tejado (4,4–6), (5,4–6) y pared (7,4), (7,5), (7,4) | Tiny Town |
| jugador | (7,1) | Tiny Dungeon |
| criaturas | brasito (9,2) · gotilla (9,0) · hojin (9,4) · peluson (10,3) · aleteo (10,0) · cangrejete (10,2), escaladas ×4 | Tiny Dungeon |

4. **Importar** — `npm run assets` recorta cada casilla (`drawImage` con suavizado desactivado, para no emborronar el pixel art), la mete en el **atlas** y en el **tileset** con los mismos nombres de siempre, así que mapas y código no cambian.
5. **Rellenar huecos** — lo que el pack no trae (`tallGrass`, `water0-2`, `solid`) se completa con arte generado y el script lo avisa por consola. Es habitual: ningún pack trae todo.

### Cómo cambiar una elección
Edita la casilla en `TILES` o `CREATURES` y vuelve a ejecutar `npm run assets`. `npm test` comprueba que las casillas estén dentro de la hoja (`tools/external/kenney.test.ts`).

### Qué tener en cuenta con arte de terceros
- **Estilo coherente:** mezcla packs del mismo autor/estilo (aquí, los dos de Kenney comparten contorno oscuro). Al probar el *Roguelike/RPG Pack*, que sí trae agua, el estilo sin contorno no combinaba.
- **Densidad de píxel:** un sprite de 16×16 escalado ×4 tiene píxeles más grandes que los de la interfaz.
- **Un solo fotograma:** Kenney no trae animaciones de caminata ni vistas traseras.
