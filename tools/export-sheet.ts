// Exporta una hoja PNG (x4) con todos los tiles, el jugador y las criaturas.
// Uso: npm run sheet [escala]  →  out/sheet.png
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PALETTE } from '../art/palette';
import { drawSprite } from '../art/pixmap';
import { TILE_DEFS } from '../art/tiles';
import { PLAYER_FRAMES, PLAYER_H, PLAYER_W } from '../art/player';
import { CREATURE_ART } from '../art/creatures';

const SCALE = Number(process.argv[2] ?? 4);
const BG = '#7a7a8c';
const PAD = 4;

const W = 12 * 20 + PAD * 2; // 244 px lógicos de ancho para tiles
const creatureNames = Object.keys(CREATURE_ART);
const creatureW = creatureNames.length * (64 + 4) + 4; // 6 criaturas por fila
const sheetW = Math.max(W, creatureW);
const tileRows = Math.ceil(TILE_DEFS.length / 12);
const H = PAD + tileRows * 20 + 8 + (PLAYER_H + 6) * 4 / 3 + 12 + 2 * 68 + PAD + 14;

const canvas = createCanvas(sheetW, Math.ceil(H));
const ctx = canvas.getContext('2d');
ctx.fillStyle = BG;
ctx.fillRect(0, 0, sheetW, Math.ceil(H));

let y = PAD;
// tiles
const tiles = TILE_DEFS.map(([, s]) => s);
tiles.forEach((s, i) => drawSprite(ctx, s, PAD + (i % 12) * 20, y + Math.floor(i / 12) * 20));
y += tileRows * 20 + 4;

// jugador: 4 direcciones × 3 frames
const dirs = ['down', 'up', 'left', 'right'];
dirs.forEach((d, di) => {
  for (let f = 0; f < 3; f++) drawSprite(ctx, PLAYER_FRAMES[`player_${d}_${f}`], PAD + (di * 3 + f) * (PLAYER_W + 2), y);
});
y += PLAYER_H + 6;

// criaturas: fila frontal, fila trasera
creatureNames.forEach((n, i) => drawSprite(ctx, CREATURE_ART[n].front, PAD + i * 68, y));
y += 68;
creatureNames.forEach((n, i) => drawSprite(ctx, CREATURE_ART[n].back, PAD + i * 68, y));
y += 68;

// paleta (comprobación de coherencia)
Object.values(PALETTE).forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(PAD + i * 8, y, 7, 7); });

// ampliación entera, vecino más cercano
const out = createCanvas(sheetW * SCALE, Math.ceil(H) * SCALE);
const octx = out.getContext('2d');
octx.imageSmoothingEnabled = false;
octx.drawImage(canvas, 0, 0, out.width, out.height);
mkdirSync('out', { recursive: true });
writeFileSync('out/sheet.png', out.toBuffer('image/png'));
console.log(`out/sheet.png ${out.width}x${out.height} (x${SCALE}), ${Object.keys(PALETTE).length} colores en paleta`);

// ---------- hoja de UI: fuente, cajas, cursor, fondo de combate y efectos ----------
import { SPEC } from '../art/ui';
import { renderText } from '../art/font';

const UW = 250;
const lines = ['ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', 'ÁÉÍÓÚÜ 0123456789 .,!?¡¿:\'-/%+()', '¡BRASITO USÓ LANZALLAMAS!', 'LUCHAR  MOCHILA  EQUIPO  HUIR'];
const UH = 14 * lines.length + 8 + 112 + 8 + 48 + 8 + 42 + 24;
const ui = createCanvas(UW, UH);
const uctx = ui.getContext('2d');
uctx.fillStyle = BG; uctx.fillRect(0, 0, UW, UH);
let uy = 4;
for (const l of lines) { drawSprite(uctx, renderText(l, 'K'), 4, uy); uy += 14; }
uy += 4;
const sp = Object.fromEntries(SPEC.map(([n, s]) => [n, s]));
drawSprite(uctx, sp.battle_bg, 4, uy); uy += 116;
drawSprite(uctx, sp.ui_dialog, 4, uy); uy += 52;
let ux = 4;
for (const k of ['ui_hpbox_enemy', 'ui_hpbox_player', 'ui_menu']) { drawSprite(uctx, sp[k], ux, uy); ux += sp[k][0].length + 4; }
uy += 46;
for (const k of ['fx_normal', 'fx_fire', 'fx_water', 'fx_grass', 'ui_cursor', 'ui_more', 'ui_hplabel']) { drawSprite(uctx, sp[k], 4 + ['fx_normal', 'fx_fire', 'fx_water', 'fx_grass', 'ui_cursor', 'ui_more', 'ui_hplabel'].indexOf(k) * 20, uy); }
const uout = createCanvas(UW * 4, UH * 4);
const uo = uout.getContext('2d'); uo.imageSmoothingEnabled = false; uo.drawImage(ui, 0, 0, uout.width, uout.height);
writeFileSync('out/sheet_ui.png', uout.toBuffer('image/png'));
console.log(`out/sheet_ui.png ${uout.width}x${uout.height}`);
