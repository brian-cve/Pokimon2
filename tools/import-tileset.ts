// Convierte una hoja de tiles dibujada (assets-src/custom/tileset2.jpg) en public/assets/tileset.png.
//   npm run assets:import-tileset [-- <imagen.jpg>]
// Cada tile se recorta de una región fija de la hoja y se reduce a 16x16; los objetos
// (árbol, roca, valla, casa) se recortan quitando el fondo magenta. Sobre la hoja:
// out/tileset-preview.png (x8) para revisar el resultado.
import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { TILE, TILE_DEFS } from '../art/tiles';
import { fromSprite } from './drawable';

const file = process.argv[2] ?? 'assets-src/custom/tileset2.jpg';
const img = await loadImage(readFileSync(file));
const W = img.width, H = img.height;
const src = createCanvas(W, H);
src.getContext('2d').drawImage(img, 0, 0);

// ---- terreno: celdas de ~167 px separadas por canales magenta (columnas fijas; filas de alto variable)
const COLS = [2, 173, 343, 514, 685, 855], CELL_W = 167;
const ROWS = [2, 158, 310, 450, 618]; // y de arranque de cada fila de terreno
type Rect = [x: number, y: number, w: number, h: number];
/** Región cuadrada centrada en la celda (c,r), `size` px de lado (y `dy` de desplazamiento vertical). */
const cellRect = (c: number, r: number, size: number, dy = 0, cellH = 148): Rect =>
  [COLS[c] + Math.round((CELL_W - size) / 2), ROWS[r] + Math.round((cellH - size) / 2) + dy, size, size];

// ---- objetos: el fondo es magenta liso; se pasa a transparente por color (incluye el halo rosado del JPEG)
function cutout([rx, ry, rw, rh]: Rect): Canvas {
  const c = createCanvas(rw, rh);
  const cx = c.getContext('2d');
  cx.drawImage(src, rx, ry, rw, rh, 0, 0, rw, rh);
  const d = cx.getImageData(0, 0, rw, rh), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i] > 120 && p[i + 2] > 120 && (p[i] + p[i + 2]) / 2 - p[i + 1] > 45) p[i + 3] = 0;
  }
  // el borde del JPEG deja un halo rosado: se come hasta 2 px de píxeles rosados junto al fondo
  for (let pass = 0; pass < 2; pass++) {
    const gone: number[] = [];
    for (let y = 1; y < rh - 1; y++) for (let x = 1; x < rw - 1; x++) {
      const q = y * rw + x, i = q * 4;
      if (p[i + 3] && p[i] > p[i + 1] + 20 && p[i + 2] > p[i + 1] + 20 && (!p[i - 1] || !p[i + 7] || !p[(q - rw) * 4 + 3] || !p[(q + rw) * 4 + 3])) gone.push(i);
    }
    for (const i of gone) p[i + 3] = 0;
  }
  cx.putImageData(d, 0, 0);
  return c;
}

/** Caja que envuelve los píxeles no transparentes. */
function bbox(c: Canvas): Rect {
  const { width: w, height: h } = c;
  const p = c.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (p[(y * w + x) * 4 + 3] > 40) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

const tile = (): Canvas => createCanvas(TILE, TILE);
const smooth = (c: Canvas) => { const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; return x; };

/** Región de la hoja → tile completo (opcionalmente espejado). */
function fill(r: Rect, flip: 'h' | 'v' | '' = ''): Canvas {
  const t = tile(), x = smooth(t);
  if (flip === 'h') { x.translate(TILE, 0); x.scale(-1, 1); }
  if (flip === 'v') { x.translate(0, TILE); x.scale(1, -1); }
  x.drawImage(src, ...r, 0, 0, TILE, TILE);
  return t;
}

/** Objeto recortado, escalado a w×h y colocado en (dx,dy) de un lienzo de cw×ch. */
function place(obj: Canvas, cw: number, ch: number, dx: number, dy: number, w: number, h: number): Canvas {
  const t = createCanvas(cw, ch), x = smooth(t);
  const b = bbox(obj);
  x.drawImage(obj, ...b, dx, dy, w, h);
  return t;
}

// ---------------------------------------------------------------- tiles
const out = new Map<string, Canvas>();
out.set('grass0', fill(cellRect(0, 0, 130)));
out.set('grass1', fill(cellRect(3, 0, 130)));
out.set('grass2', fill(cellRect(0, 0, 130), 'v'));
out.set('flowerRed', fill(cellRect(1, 0, 130)));    // flores blancas
out.set('flowerYellow', fill(cellRect(2, 0, 130)));
out.set('tallGrass', fill(cellRect(1, 1, 140)));
out.set('path', fill([COLS[1] + 45, ROWS[2] + 40, 78, 78])); // centro arenoso de la franja, sin los bordes de pasto
[0, 1, 2].forEach((i) => out.set(`water${i}`, fill(cellRect(i, 4, 112, 12)))); // sin la línea de oleaje superior
out.set('forest', fill(cellRect(0, 3, 150, 0, 160)));

// árbol: pieza única de 16x32 partida en treeTop / treeBottom (la copa ocupa la parte alta)
const tree = createCanvas(TILE, TILE * 2);
tree.getContext('2d').drawImage(place(cutout([2, 772, 168, 250]), TILE, TILE * 2, 0, 3, 16, 29), 0, 0);
const half = (c: Canvas, y: number) => { const t = tile(); t.getContext('2d').drawImage(c, 0, y, TILE, TILE, 0, 0, TILE, TILE); return t; };
out.set('treeTop', half(tree, 0));
out.set('treeBottom', half(tree, TILE));

out.set('rock', place(cutout([386, 776, 126, 120]), TILE, TILE, 1, 3, 14, 13));
out.set('fence', place(cutout([514, 776, 126, 120]), TILE, TILE, 0, 3, 16, 12));

// casa 3x3: la ilustración (sin la franja de suelo de abajo) se estira a 48x48
const house = createCanvas(48, 48);
smooth(house).drawImage(cutout([770, 772, 254, 224]), 0, 0, 48, 48);
for (let i = 0; i < 9; i++) {
  const t = tile();
  t.getContext('2d').drawImage(house, (i % 3) * TILE, Math.floor(i / 3) * TILE, TILE, TILE, 0, 0, TILE, TILE);
  out.set(`house${i}`, t);
}

// marca de colisión (capa oculta): se conserva la procedural
const solid = tile();
fromSprite(TILE_DEFS.find(([n]) => n === 'solid')![1]).draw(solid.getContext('2d'), 0, 0);
out.set('solid', solid);

// ---------------------------------------------------------------- tileset (orden = TILE_DEFS)
const tileset = createCanvas(TILE_DEFS.length * TILE, TILE), sx = tileset.getContext('2d');
TILE_DEFS.forEach(([name], i) => {
  // lo que la hoja dibujada no trae (colisión, interiores) se completa con el tile procedural
  const t = out.get(name) ?? (() => { const k = tile(); fromSprite(TILE_DEFS[i][1]).draw(k.getContext('2d'), 0, 0); return k; })();
  sx.drawImage(t, i * TILE, 0);
});
writeFileSync('public/assets/tileset.png', tileset.toBuffer('image/png'));

mkdirSync('out', { recursive: true });
const SC = 8, prev = createCanvas(tileset.width * SC, TILE * SC * 2), px = prev.getContext('2d');
px.fillStyle = '#ff00ff'; px.fillRect(0, 0, prev.width, prev.height);
px.imageSmoothingEnabled = false;
px.drawImage(tileset, 0, 0, tileset.width * SC, TILE * SC);
writeFileSync('out/tileset-preview.png', prev.toBuffer('image/png'));
console.log(`tileset ${tileset.width}x${TILE} (${TILE_DEFS.length} tiles) → public/assets/tileset.png`);
