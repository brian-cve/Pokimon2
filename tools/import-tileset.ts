// Convierte una hoja de tiles dibujada (assets-src/custom/tileset.jpg) en public/assets/tileset.png.
//   npm run assets:import-tileset [-- <imagen.jpg>]
// Cada tile se recorta de una región fija de la hoja (ver REGIONS) y se reduce a 16x16; los objetos
// (árbol, roca, valla, casa) se recortan quitando el papel cuadriculado del fondo. Sobre la hoja:
// out/tileset-preview.png (x8) para revisar el resultado.
import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { TILE, TILE_DEFS } from '../art/tiles';
import { fromSprite } from './drawable';

const file = process.argv[2] ?? 'assets-src/custom/tileset.jpg';
const img = await loadImage(readFileSync(file));
const W = img.width, H = img.height;
const src = createCanvas(W, H);
src.getContext('2d').drawImage(img, 0, 0);

// ---- cuadrícula de terreno: 5 columnas x 2 filas de celdas de ~154x156 que empiezan en (302,120)
const CX = 302, CY = 120, CW = 154, CH = 156, INSET = 14;
const cell = (c: number, r: number): Rect => [CX + c * CW + INSET, CY + r * CH + INSET, CW - 2 * INSET, CH - 2 * INSET];
type Rect = [x: number, y: number, w: number, h: number];

// ---- papel del fondo: casi blanco/crema conectado con el borde de la región (las líneas de la cuadrícula
// son un poco más oscuras pero igual de poco saturadas)
function cutout([rx, ry, rw, rh]: Rect): Canvas {
  const c = createCanvas(rw, rh);
  const cx = c.getContext('2d');
  cx.drawImage(src, rx, ry, rw, rh, 0, 0, rw, rh);
  const d = cx.getImageData(0, 0, rw, rh), p = d.data;
  const paper = (i: number) => {
    const mx = Math.max(p[i], p[i + 1], p[i + 2]), mn = Math.min(p[i], p[i + 1], p[i + 2]);
    return mn > 170 && mx - mn < 48;
  };
  const bg = new Uint8Array(rw * rh), st: number[] = [];
  const push = (x: number, y: number) => { const q = y * rw + x; if (!bg[q] && paper(q * 4)) { bg[q] = 1; st.push(q); } };
  for (let x = 0; x < rw; x++) { push(x, 0); push(x, rh - 1); }
  for (let y = 0; y < rh; y++) { push(0, y); push(rw - 1, y); }
  while (st.length) {
    const q = st.pop()!, x = q % rw, y = (q / rw) | 0;
    if (x > 0) push(x - 1, y); if (x < rw - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1); if (y < rh - 1) push(x, y + 1);
  }
  // 1 px de halo claro (borde del JPEG) también pasa a transparente
  const halo: number[] = [];
  for (let y = 1; y < rh - 1; y++) for (let x = 1; x < rw - 1; x++) {
    const q = y * rw + x;
    if (!bg[q] && (bg[q - 1] || bg[q + 1] || bg[q - rw] || bg[q + rw]) && Math.min(p[q * 4], p[q * 4 + 1], p[q * 4 + 2]) > 150) halo.push(q);
  }
  for (const q of halo) bg[q] = 1;
  for (let q = 0; q < rw * rh; q++) if (bg[q]) p[q * 4 + 3] = 0;
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
// esquina sin tréboles: el trébol oscuro de la celda se repetiría como un tablero
const grass: Rect = [462, 126, 84, 84];
out.set('grass0', fill(grass));
out.set('grass1', fill(grass, 'h'));
out.set('grass2', fill(grass, 'v'));
out.set('flowerRed', fill(cell(0, 1)));
out.set('flowerYellow', fill(cell(1, 1)));
out.set('tallGrass', fill(cell(0, 0)));
out.set('path', fill([CX + 2 * CW + 30, CY + CH + 30, CW - 60, CH - 60]));
[0, 1, 2].forEach((i) => out.set(`water${i}`, fill([i * 152 + 14, 432 + 14, 152 - 28, 150 - 28])));
out.set('forest', fill([CX + 2 * CW + 30, CY + 30, CW - 60, CH - 60]));

// árbol: copa (arbusto) sobre tronco, en un lienzo de 16x32 partido en treeTop / treeBottom
const canopy = cutout([455, 436, 150, 146]), trunk = cutout([606, 428, 92, 158]);
const tree = createCanvas(TILE, TILE * 2), tx = tree.getContext('2d');
tx.drawImage(place(trunk, TILE, TILE * 2, 3, 12, 10, 20), 0, 0);
tx.drawImage(place(canopy, TILE, TILE * 2, 0, 1, 16, 17), 0, 0);
const half = (c: Canvas, y: number) => { const t = tile(); t.getContext('2d').drawImage(c, 0, y, TILE, TILE, 0, 0, TILE, TILE); return t; };
out.set('treeTop', half(tree, 0));
out.set('treeBottom', half(tree, TILE));

out.set('rock', place(cutout([690, 462, 124, 116]), TILE, TILE, 1, 3, 14, 12));
out.set('fence', place(cutout([800, 448, 158, 128]), TILE, TILE, 0, 2, 16, 13));

// casa 3x3: la ilustración se estira a 48x48 y se le pinta una puerta (la hoja no la trae)
const house = createCanvas(48, 48), hx = smooth(house);
hx.drawImage(cutout([0, 48, 308, 390]), 0, 0, 48, 48);
hx.fillStyle = '#3b2412'; hx.fillRect(19, 33, 10, 14);
hx.fillStyle = '#8a5a2e'; hx.fillRect(20, 34, 8, 13);
hx.fillStyle = '#6b4220'; hx.fillRect(24, 34, 1, 13);
hx.fillStyle = '#f2c14e'; hx.fillRect(26, 41, 1, 1);
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
  const t = out.get(name);
  if (!t) throw new Error(`falta el tile '${name}'`);
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
