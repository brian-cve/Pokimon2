// Importa arte de los packs CC0 de Kenney (assets-src/kenney) y lo expone con los MISMOS nombres
// que usa el resto del pipeline (tiles, fotogramas del jugador y criaturas).
// Lo que estos packs no traen (agua animada, hierba alta, marcador de colisión) se rellena con arte generado.
import { loadImage, type Image } from '@napi-rs/canvas';
import type { Drawable } from '../drawable';

const ROOT = 'assets-src/kenney';
const T = 16;

interface Ref { sheet: 'town' | 'dungeon'; row: number; col: number }
const town = (row: number, col: number): Ref => ({ sheet: 'town', row, col });
const dungeon = (row: number, col: number): Ref => ({ sheet: 'dungeon', row, col });

/** Nombre del tile del juego → casilla (fila, columna) en Tiny Town. Ver las hojas numeradas en docs/ASSETS.md. */
export const TILES: Record<string, Ref> = {
  grass0: town(0, 0), grass1: town(0, 1), grass2: town(0, 0),
  flowerRed: town(0, 2), flowerYellow: town(0, 2),
  path: town(2, 1),
  treeTop: town(0, 4), treeBottom: town(1, 4),
  forest: town(1, 7),
  rock: town(0, 5),                    // arbusto redondo: hace de obstáculo bajo
  fence: town(6, 9),                   // barandas; el poste se le añade abajo (composición)
  // casa 3×3 de tejado rojo: dos filas de tejado + fila de pared con ventana-puerta-ventana
  house0: town(4, 4), house1: town(4, 5), house2: town(4, 6),
  house3: town(5, 4), house4: town(5, 5), house5: town(5, 6),
  house6: town(7, 4), house7: town(7, 5), house8: town(7, 4),
};
const FLIPPED = new Set(['flowerYellow', 'house8']);
const FENCE_POST = town(6, 8);   // extremo de valla: de él solo se toma el poste
const POST_W = 7;

export const HERO = dungeon(7, 1);
/** Criatura del juego → monstruo de Tiny Dungeon (se escala ×4 hasta 64×64). */
export const CREATURES: Record<string, Ref> = {
  brasito: dungeon(9, 2),      // monstruo rojo
  gotilla: dungeon(9, 0),      // limo verde
  hojin: dungeon(9, 4),        // duende de cinta verde
  peluson: dungeon(10, 3),     // criatura marrón
  aleteo: dungeon(10, 0),      // murciélago
  cangrejete: dungeon(10, 2),  // araña
};

export interface ExternalArt {
  tiles: Record<string, Drawable>;
  player: Record<string, Drawable>;
  creatures: Record<string, Drawable>;
}

export async function loadKenney(): Promise<ExternalArt> {
  const sheets: Record<Ref['sheet'], Image> = {
    town: await loadImage(`${ROOT}/tiny-town/Tilemap/tilemap_packed.png`),
    dungeon: await loadImage(`${ROOT}/tiny-dungeon/Tilemap/tilemap_packed.png`),
  };

  /** Recorta una casilla de 16×16; `scale` y `flip` se aplican sin suavizado; `dy` la baja dentro de su lienzo. */
  const crop = (ref: Ref, o: { scale?: number; flip?: boolean; dx?: number; dy?: number; w?: number; h?: number } = {}): Drawable => {
    const scale = o.scale ?? 1;
    const w = o.w ?? T * scale, h = o.h ?? T * scale;
    return {
      w, h,
      draw(ctx, x, y) {
        ctx.imageSmoothingEnabled = false;
        const size = T * scale;
        ctx.save();
        if (o.flip) { ctx.translate(x + (o.dx ?? 0) + size, y + (o.dy ?? 0)); ctx.scale(-1, 1); }
        else ctx.translate(x + (o.dx ?? 0), y + (o.dy ?? 0));
        ctx.drawImage(sheets[ref.sheet], ref.col * T, ref.row * T, T, T, 0, 0, size, size);
        ctx.restore();
      },
    };
  };

  const tiles: Record<string, Drawable> = Object.fromEntries(Object.entries(TILES).map(([name, ref]) => [name, crop(ref, { flip: FLIPPED.has(name) })]));

  // La valla de Kenney viene en 3 piezas (extremo, tramo, extremo): se compone un tramo con poste a la izquierda
  // para que, repetido, quede "poste–baranda–poste".
  const rails = tiles.fence;
  tiles.fence = {
    w: T, h: T,
    draw(ctx, x, y) {
      rails.draw(ctx, x, y);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sheets.town, FENCE_POST.col * T, FENCE_POST.row * T, POST_W, T, x, y, POST_W, T);
    },
  };

  // Kenney solo trae un fotograma por personaje (sin 4 direcciones ni caminata): se simula un saltito.
  const player: Record<string, Drawable> = {};
  for (const dir of ['down', 'up', 'left', 'right']) {
    player[`player_${dir}_0`] = crop(HERO, { w: T, h: 24, dy: 8 });
    player[`player_${dir}_1`] = crop(HERO, { w: T, h: 24, dy: 7 });
    player[`player_${dir}_2`] = crop(HERO, { w: T, h: 24, dy: 7, flip: true });
  }

  // Un solo fotograma por monstruo: delante tal cual; "de espaldas" se usa el reflejo.
  const creatures: Record<string, Drawable> = {};
  for (const [id, ref] of Object.entries(CREATURES)) {
    creatures[`${id}_front`] = crop(ref, { scale: 4 });
    creatures[`${id}_back`] = crop(ref, { scale: 4, flip: true });
  }
  return { tiles, player, creatures };
}
