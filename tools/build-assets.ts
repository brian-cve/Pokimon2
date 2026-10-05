// Genera TODOS los assets que carga el juego a partir del arte procedural:
//   public/assets/atlas.png + atlas.json   atlas de sprites (formato JSON Hash de Phaser / TexturePacker)
//   public/assets/tileset.png              tira de tiles 16x16 (la usan los mapas de Tiled)
//   public/assets/font.png + font.fnt      fuente bitmap (formato BMFont XML)
//   public/assets/maps/*.json              mapas de Tiled (capas, propiedades de tile, objetos)
// Uso: npm run assets
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CREATURE_ART } from '../art/creatures';
import { buildFontAtlas, FONT_CELL_H, FONT_LINE_H, CHARS, advance } from '../art/font';
import { PLAYER_FRAMES } from '../art/player';
import { drawSprite, type Sprite } from '../art/pixmap';
import { TILE, TILE_DEFS } from '../art/tiles';
import { SPEC } from '../art/ui';
import { MAPS } from './maps';
import { TILESET_FILE, toTiled } from './maps/tiled';

const OUT = 'public/assets';
const PAD = 2;       // margen transparente entre frames: evita sangrado al escalar
const MAX_W = 512;
mkdirSync(`${OUT}/maps`, { recursive: true });

const save = (file: string, canvas: Canvas) => writeFileSync(`${OUT}/${file}`, canvas.toBuffer('image/png'));
const render = (sprites: Sprite[], w: number, h: number, place: (i: number) => [number, number]) => {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  sprites.forEach((s, i) => drawSprite(ctx, s, ...place(i)));
  return c;
};

// ---------------------------------------------------------------- atlas de sprites
const items: [string, Sprite][] = [
  ['px', ['W']], // 1x1 blanco: se escala y se tiñe para barras, cortinas y fundidos
  ...Object.entries(PLAYER_FRAMES),
  ...Object.entries(CREATURE_ART).flatMap(([id, a]) => [[`${id}_front`, a.front], [`${id}_back`, a.back]] as [string, Sprite][]),
  ...SPEC.map(([name, sprite]) => [name, sprite] as [string, Sprite]),
];

// empaquetado por estantes: de más alto a más bajo
const sorted = [...items].sort((a, b) => b[1].length - a[1].length || b[1][0].length - a[1][0].length);
const placed: { name: string; sprite: Sprite; x: number; y: number }[] = [];
let x = PAD, y = PAD, shelfH = 0;
for (const [name, sprite] of sorted) {
  const w = sprite[0].length, h = sprite.length;
  if (x + w + PAD > MAX_W) { x = PAD; y += shelfH + PAD; shelfH = 0; }
  placed.push({ name, sprite, x, y });
  x += w + PAD; shelfH = Math.max(shelfH, h);
}
const atlasH = y + shelfH + PAD;
const atlas = createCanvas(MAX_W, atlasH);
const actx = atlas.getContext('2d');
for (const p of placed) drawSprite(actx, p.sprite, p.x, p.y);
save('atlas.png', atlas);
writeFileSync(`${OUT}/atlas.json`, JSON.stringify({
  frames: Object.fromEntries(placed.map((p) => {
    const w = p.sprite[0].length, h = p.sprite.length;
    return [p.name, { frame: { x: p.x, y: p.y, w, h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h } }];
  })),
  meta: { app: 'pokimon2/tools/build-assets.ts', version: '1.0', image: 'atlas.png', format: 'RGBA8888', size: { w: MAX_W, h: atlasH }, scale: '1' },
}, null, 2));

// ---------------------------------------------------------------- tileset
save(TILESET_FILE, render(TILE_DEFS.map(([, s]) => s), TILE_DEFS.length * TILE, TILE, (i) => [i * TILE, 0]));

// ---------------------------------------------------------------- fuente bitmap (BMFont XML)
const font = buildFontAtlas();
const fw = font.sprite[0].length;
save('font.png', render([font.sprite], fw, FONT_CELL_H, () => [0, 0]));
const chars = CHARS.map((ch) => {
  const f = font.frames[ch];
  return `    <char id="${ch.charCodeAt(0)}" x="${f.x}" y="0" width="${f.w}" height="${FONT_CELL_H}" xoffset="0" yoffset="0" xadvance="${advance(ch)}" page="0" chnl="15"/>`;
});
writeFileSync(`${OUT}/font.fnt`, `<?xml version="1.0"?>
<font>
  <info face="pixfont" size="${FONT_CELL_H}" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="0" aa="0" padding="0,0,0,0" spacing="0,0"/>
  <common lineHeight="${FONT_LINE_H}" base="${FONT_CELL_H - 1}" scaleW="${fw}" scaleH="${FONT_CELL_H}" pages="1" packed="0"/>
  <pages><page id="0" file="font.png"/></pages>
  <chars count="${chars.length}">
${chars.join('\n')}
  </chars>
</font>
`);

// ---------------------------------------------------------------- mapas de Tiled
for (const m of Object.values(MAPS)) writeFileSync(`${OUT}/maps/${m.id}.json`, JSON.stringify(toTiled(m)));

console.log(`atlas.png ${MAX_W}x${atlasH} · ${placed.length} frames · tileset ${TILE_DEFS.length} tiles · fuente ${CHARS.length} glifos · mapas: ${Object.keys(MAPS).join(', ')}`);
