// Genera solo los mapas de Tiled (public/assets/maps/*.json) a partir de tools/maps/.
// A diferencia de `npm run assets`, NO toca el atlas ni el tileset (que vienen de las imágenes de assets-src/custom).
import { mkdirSync, writeFileSync } from 'node:fs';
import { MAPS } from './maps';
import { toTiled } from './maps/tiled';

export function writeMaps(out = 'public/assets'): string[] {
  mkdirSync(`${out}/maps`, { recursive: true });
  for (const m of Object.values(MAPS)) writeFileSync(`${out}/maps/${m.id}.json`, JSON.stringify(toTiled(m)));
  return Object.keys(MAPS);
}

// se ejecuta como script (npm run maps), no al importarlo desde build-assets
if (process.argv[1]?.endsWith('build-maps.ts')) console.log(`mapas: ${writeMaps().join(', ')}`);
