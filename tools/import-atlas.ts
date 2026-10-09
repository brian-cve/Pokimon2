// Importa un atlas dibujado a mano (una imagen con todos los sprites sobre fondo blanco)
// y lo convierte en public/assets/atlas.png + atlas.json respetando el tamaño de cada frame.
//   npm run assets:import -- <imagen.jpg> [--dump]
// Los sprites se detectan por componentes conexas y se asignan por orden de lectura (fila, columna)
// según ORDER. Con --dump se escribe out/import-debug.png con las cajas numeradas.
import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('Uso: npm run assets:import -- <imagen> [--dump]'); process.exit(1); }
const dump = process.argv.includes('--dump');

type Mode = 'fit' | 'stretch';
/** Orden de lectura de los sprites en la imagen → [frame, ancho, alto en el juego, modo]. null = ignorar. */
const ORDER: ([string, number, number, Mode] | null)[] = [
  ['battle_bg', 240, 112, 'stretch'],
  ...['brasito', 'gotilla', 'hojin', 'peluson', 'aleteo', 'cangrejete'].flatMap((id) =>
    ['front', 'back'].map((v) => [`${id}_${v}`, 64, 64, 'fit'] as [string, number, number, Mode])),
  ['ui_panel', 160, 56, 'stretch'], ['ui_dialog', 240, 48, 'stretch'],
  ['ui_moves', 168, 48, 'stretch'], ['ui_prompt', 136, 48, 'stretch'], ['ui_menu', 104, 48, 'stretch'], ['ui_moveinfo', 72, 48, 'stretch'],
  ['ui_hpbox_player', 112, 42, 'stretch'], ['ui_hpbox_enemy', 104, 32, 'stretch'],
  ...['down', 'up', 'left', 'right'].flatMap((d) => [0, 1, 2].map((f) => [`player_${d}_${f}`, 16, 24, 'fit'] as [string, number, number, Mode])),
  null, // tira de iconos redondos (no se usa en el juego)
  ['fx_normal', 16, 16, 'fit'], ['fx_fire', 16, 16, 'fit'], ['fx_water', 16, 16, 'fit'], ['fx_grass', 16, 16, 'fit'],
  ['ui_sound_on', 14, 11, 'fit'], ['ui_sound_off', 14, 11, 'fit'], ['grass_overlay', 16, 8, 'fit'],
  ['ui_hplabel', 11, 7, 'fit'], ['ui_cursor', 5, 7, 'fit'], ['ui_more', 7, 4, 'fit'],
];

const img = await loadImage(readFileSync(file));
const W = img.width, H = img.height;
const c = createCanvas(W, H);
const ctx = c.getContext('2d');
ctx.drawImage(img, 0, 0);
const data = ctx.getImageData(0, 0, W, H);
const px = data.data;
const isBg = (i: number) => px[i] > 232 && px[i + 1] > 232 && px[i + 2] > 232;

// fondo = zona casi blanca conectada con el borde (los blancos interiores se conservan)
const bg = new Uint8Array(W * H);
const stack: number[] = [];
const push = (x: number, y: number) => {
  const p = y * W + x;
  if (!bg[p] && isBg(p * 4)) { bg[p] = 1; stack.push(p); }
};
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
while (stack.length) {
  const p = stack.pop()!; const x = p % W, y = (p / W) | 0;
  if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y);
  if (y > 0) push(x, y - 1); if (y < H - 1) push(x, y + 1);
}

// componentes conexas del primer plano, fusionando huecos de hasta GAP px
const GAP = 3;
const label = new Int32Array(W * H).fill(-1);
type Box = { x0: number; y0: number; x1: number; y1: number; n: number };
let boxes: Box[] = [];
for (let s = 0; s < W * H; s++) {
  if (bg[s] || label[s] >= 0) continue;
  const id = boxes.length; const b: Box = { x0: W, y0: H, x1: 0, y1: 0, n: 0 };
  const st = [s]; label[s] = id;
  while (st.length) {
    const p = st.pop()!; const x = p % W, y = (p / W) | 0;
    b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); b.n++;
    for (let dy = -GAP; dy <= GAP; dy++) for (let dx = -GAP; dx <= GAP; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (!bg[q] && label[q] < 0) { label[q] = id; st.push(q); }
    }
  }
  boxes.push(b);
}
boxes = boxes.filter((b) => b.n > 12); // descarta motas de ruido
// descarta cajas contenidas en otra (restos de cielo, etc.)
boxes = boxes.filter((b) => !boxes.some((o) => o !== b && o.x0 <= b.x0 && o.y0 <= b.y0 && o.x1 >= b.x1 && o.y1 >= b.y1));
// orden de lectura: por filas (tolerancia vertical) y luego por x
boxes.sort((a, b) => a.y0 - b.y0);
const rows: Box[][] = [];
for (const b of boxes) {
  const row = rows.find((r) => Math.abs((r[0].y0 + r[0].y1) / 2 - (b.y0 + b.y1) / 2) < 40);
  if (row) row.push(b); else rows.push([b]);
}
let sorted = rows.flatMap((r) => r.sort((a, b) => a.x0 - b.x0));
// "sonido apagado" y la tira de hierba quedan pegados: se separan por la columna vacía más ancha
const SPLIT = 39;
{
  const b = sorted[SPLIT];
  let best = -1, bestLen = 0, run = 0;
  for (let x = b.x0; x <= b.x1; x++) {
    let empty = true;
    for (let y = b.y0; y <= b.y1 && empty; y++) if (!bg[y * W + x]) empty = false;
    run = empty ? run + 1 : 0;
    if (run > bestLen) { bestLen = run; best = x; }
  }
  if (best > 0) {
    const cut = best - bestLen + 1;
    const fit = (x0: number, x1: number): Box => {
      let y0 = H, y1 = 0;
      for (let y = b.y0; y <= b.y1; y++) for (let x = x0; x <= x1; x++) if (!bg[y * W + x]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      return { x0, x1, y0, y1, n: 99 };
    };
    sorted = [...sorted.slice(0, SPLIT), fit(b.x0, cut - 1), fit(best + 1, b.x1), ...sorted.slice(SPLIT + 1)];
  }
}
console.log(`${sorted.length} sprites detectados (esperados ${ORDER.length})`);
if (sorted.length !== ORDER.length) { console.error('El recuento no coincide: revisa out/import-debug.png (--dump)'); }
sorted.forEach((b, i) => console.log(i, ORDER[i]?.[0] ?? '-', `${b.x1 - b.x0 + 1}x${b.y1 - b.y0 + 1} @${b.x0},${b.y0}`));

if (dump) {
  mkdirSync('out', { recursive: true });
  ctx.strokeStyle = 'red'; ctx.fillStyle = 'red'; ctx.font = '14px sans-serif';
  sorted.forEach((b, i) => { ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1); ctx.fillText(String(i), b.x0 + 2, b.y0 + 12); });
  writeFileSync('out/import-debug.png', c.toBuffer('image/png'));
}

if (!dump) {
  if (sorted.length !== ORDER.length) process.exit(1);
  // 1) recorte con alfa: el fondo conectado con el borde pasa a transparente (y se come 1 px de halo claro del JPEG)
  const halo = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    if (bg[p]) continue;
    const i = p * 4;
    if (px[i] > 205 && px[i + 1] > 205 && px[i + 2] > 205 && (bg[p - 1] || bg[p + 1] || bg[p - W] || bg[p + W])) halo[p] = 1;
  }
  for (let p = 0; p < W * H; p++) if (bg[p] || halo[p]) px[p * 4 + 3] = 0;
  const cut = createCanvas(W, H);
  cut.getContext('2d').putImageData(data, 0, 0);

  // 2) cada sprite a su tamaño de juego (suavizado alto; los 'fit' conservan proporción y se apoyan abajo-centro)
  const frames: { name: string; w: number; h: number; canvas: Canvas }[] = [
    { name: 'px', w: 1, h: 1, canvas: (() => { const k = createCanvas(1, 1); const kc = k.getContext('2d'); kc.fillStyle = '#fff'; kc.fillRect(0, 0, 1, 1); return k; })() },
  ];
  ORDER.forEach((o, i) => {
    if (!o) return;
    const [name, w, h, mode] = o; const b = sorted[i];
    const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    const k = createCanvas(w, h); const kc = k.getContext('2d');
    kc.imageSmoothingEnabled = true; kc.imageSmoothingQuality = 'high';
    // el fondo de combate es opaco: sin recorte (las nubes casi blancas del cielo se tomarían por fondo)
    if (mode === 'stretch') kc.drawImage(name === 'battle_bg' ? c : cut, b.x0, b.y0, bw, bh, 0, 0, w, h);
    else {
      const sc = Math.min(w / bw, h / bh), dw = Math.max(1, Math.round(bw * sc)), dh = Math.max(1, Math.round(bh * sc));
      kc.drawImage(cut, b.x0, b.y0, bw, bh, Math.round((w - dw) / 2), h - dh, dw, dh);
    }
    frames.push({ name, w, h, canvas: k });
  });

  // ui_banner no viene en la imagen: se deriva del marco de ui_dialog (misma proporción) a 96x20
  const bi = ORDER.findIndex((o) => o?.[0] === 'ui_dialog'), bb = sorted[bi];
  const bk = createCanvas(96, 20); const bkc = bk.getContext('2d');
  bkc.imageSmoothingQuality = 'high';
  bkc.drawImage(cut, bb.x0, bb.y0, bb.x1 - bb.x0 + 1, bb.y1 - bb.y0 + 1, 0, 0, 96, 20);
  frames.push({ name: 'ui_banner', w: 96, h: 20, canvas: bk });

  // 3) empaquetado por estantes (igual que build-assets.ts) → atlas.png + atlas.json
  const PAD = 2, MAX_W = 512;
  const sortedF = [...frames].sort((a, b) => b.h - a.h || b.w - a.w);
  const placed: { f: (typeof frames)[number]; x: number; y: number }[] = [];
  let x = PAD, y = PAD, shelfH = 0;
  for (const f of sortedF) {
    if (x + f.w + PAD > MAX_W) { x = PAD; y += shelfH + PAD; shelfH = 0; }
    placed.push({ f, x, y }); x += f.w + PAD; shelfH = Math.max(shelfH, f.h);
  }
  const atlasH = y + shelfH + PAD;
  const atlas = createCanvas(MAX_W, atlasH); const actx = atlas.getContext('2d');
  for (const p of placed) actx.drawImage(p.f.canvas, p.x, p.y);
  writeFileSync('public/assets/atlas.png', atlas.toBuffer('image/png'));
  writeFileSync('public/assets/atlas.json', JSON.stringify({
    frames: Object.fromEntries(placed.map((p) => [p.f.name, {
      frame: { x: p.x, y: p.y, w: p.f.w, h: p.f.h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: p.f.w, h: p.f.h }, sourceSize: { w: p.f.w, h: p.f.h },
    }])),
    meta: { app: 'pokimon2/tools/import-atlas.ts', version: '1.0', image: 'atlas.png', format: 'RGBA8888', size: { w: MAX_W, h: atlasH }, scale: '1' },
  }, null, 2));
  console.log(`atlas ${MAX_W}x${atlasH} con ${placed.length} frames → public/assets/`);
}
