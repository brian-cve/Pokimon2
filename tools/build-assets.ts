// Genera TODOS los assets que carga el juego:
//   public/assets/atlas.png + atlas.json   atlas de sprites (formato JSON Hash de Phaser / TexturePacker)
//   public/assets/tileset.png              tira de tiles 16x16 (la usan los mapas de Tiled)
//   public/assets/font.png + font.fnt      fuente bitmap (formato BMFont XML)
//   public/assets/maps/*.json              mapas de Tiled (capas, propiedades de tile, objetos)
//
// Fuente del arte del mundo (tiles, jugador y criaturas):
//   npm run assets                 arte externo CC0 de Kenney (antes: npm run assets:download)  [por defecto]
//   npm run assets:procedural      arte original generado por código (carpeta art/)
// La interfaz (cajas, cursor, fondo de combate, efectos) y la fuente siempre se generan por código.
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { CREATURE_ART } from '../art/creatures';
import { advance, buildFontAtlas, CHARS, FONT_CELL_H, FONT_LINE_H } from '../art/font';
import { PLAYER_FRAMES } from '../art/player';
import { TILE, TILE_DEFS } from '../art/tiles';
import { SPEC } from '../art/ui';
import { fromSprite, type Drawable } from './drawable';
import { loadKenney } from './external/kenney';
import { MAPS } from './maps';
import { TILESET_FILE, toTiled } from './maps/tiled';

const OUT = 'public/assets';
const PAD = 2;       // margen transparente entre frames: evita sangrado al escalar
const MAX_W = 512;
const source = process.argv.includes('--source=procedural') ? 'procedural' : 'kenney';
mkdirSync(`${OUT}/maps`, { recursive: true });

const save = (file: string, canvas: Canvas) => writeFileSync(`${OUT}/${file}`, canvas.toBuffer('image/png'));

// ---------------------------------------------------------------- arte procedural (siempre disponible)
const procedural = {
  tiles: Object.fromEntries(TILE_DEFS.map(([name, s]) => [name, fromSprite(s)])) as Record<string, Drawable>,
  player: Object.fromEntries(Object.entries(PLAYER_FRAMES).map(([n, s]) => [n, fromSprite(s)])) as Record<string, Drawable>,
  creatures: Object.fromEntries(
    Object.entries(CREATURE_ART).flatMap(([id, a]) => [[`${id}_front`, fromSprite(a.front)], [`${id}_back`, fromSprite(a.back)]]),
  ) as Record<string, Drawable>,
};

// ---------------------------------------------------------------- elección de fuente
let art = procedural;
const fallbacks: string[] = [];
if (source === 'kenney') {
  if (!existsSync('assets-src/kenney/tiny-town/Tilemap/tilemap_packed.png')) {
    console.error('Faltan los packs de Kenney. Ejecuta primero:  npm run assets:download');
    process.exit(1);
  }
  const ext = await loadKenney();
  // lo que el pack externo no trae se rellena con arte procedural (y se avisa)
  const merge = (name: string, group: 'tiles' | 'player' | 'creatures') => {
    if (ext[group][name]) return ext[group][name];
    fallbacks.push(name);
    return procedural[group][name];
  };
  art = {
    tiles: Object.fromEntries(TILE_DEFS.map(([name]) => [name, merge(name, 'tiles')])),
    player: Object.fromEntries(Object.keys(procedural.player).map((n) => [n, merge(n, 'player')])),
    creatures: Object.fromEntries(Object.keys(procedural.creatures).map((n) => [n, merge(n, 'creatures')])),
  };
}

// ---------------------------------------------------------------- atlas de sprites
const items: [string, Drawable][] = [
  ['px', fromSprite(['W'])], // 1x1 blanco: se escala y se tiñe para barras, cortinas y fundidos
  ...Object.entries(art.player),
  ...Object.entries(art.creatures),
  ...SPEC.map(([name, sprite]) => [name, fromSprite(sprite)] as [string, Drawable]),
];

// empaquetado por estantes: de más alto a más bajo
const sorted = [...items].sort((a, b) => b[1].h - a[1].h || b[1].w - a[1].w);
const placed: { name: string; d: Drawable; x: number; y: number }[] = [];
let x = PAD, y = PAD, shelfH = 0;
for (const [name, d] of sorted) {
  if (x + d.w + PAD > MAX_W) { x = PAD; y += shelfH + PAD; shelfH = 0; }
  placed.push({ name, d, x, y });
  x += d.w + PAD; shelfH = Math.max(shelfH, d.h);
}
const atlasH = y + shelfH + PAD;
const atlas = createCanvas(MAX_W, atlasH);
const actx = atlas.getContext('2d');
for (const p of placed) p.d.draw(actx, p.x, p.y);
save('atlas.png', atlas);
writeFileSync(`${OUT}/atlas.json`, JSON.stringify({
  frames: Object.fromEntries(placed.map((p) => [p.name, {
    frame: { x: p.x, y: p.y, w: p.d.w, h: p.d.h }, rotated: false, trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: p.d.w, h: p.d.h }, sourceSize: { w: p.d.w, h: p.d.h },
  }])),
  meta: { app: 'pokimon2/tools/build-assets.ts', version: '1.0', image: 'atlas.png', format: 'RGBA8888', size: { w: MAX_W, h: atlasH }, scale: '1' },
}, null, 2));

// ---------------------------------------------------------------- tileset (orden = TILE_DEFS, el que usan los mapas)
const tileset = createCanvas(TILE_DEFS.length * TILE, TILE);
const tctx = tileset.getContext('2d');
TILE_DEFS.forEach(([name], i) => art.tiles[name].draw(tctx, i * TILE, 0));
save(TILESET_FILE, tileset);

// ---------------------------------------------------------------- fuente bitmap (BMFont XML)
const font = buildFontAtlas();
const fw = font.sprite[0].length;
const fontCanvas = createCanvas(fw, FONT_CELL_H);
fromSprite(font.sprite).draw(fontCanvas.getContext('2d'), 0, 0);
save('font.png', fontCanvas);
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

console.log(`fuente de arte: ${source} · atlas ${MAX_W}x${atlasH} (${placed.length} frames) · tileset ${TILE_DEFS.length} tiles · mapas: ${Object.keys(MAPS).join(', ')}`);
if (fallbacks.length) console.log(`  relleno con arte generado (no está en los packs externos): ${[...new Set(fallbacks)].join(', ')}`);
