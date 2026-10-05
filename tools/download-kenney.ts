// Descarga los packs CC0 de Kenney y extrae solo lo necesario a assets-src/kenney/<pack>/.
// Uso: npm run assets:download
import { unzipSync } from 'fflate';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface Pack { id: string; url: string; page: string; keep: string[] }

/** Los enlaces de kenney.nl llevan un hash: si alguno falla, cópialo de la página del pack (botón "Download"). */
const PACKS: Pack[] = [
  {
    id: 'tiny-town',
    page: 'https://kenney.nl/assets/tiny-town',
    url: 'https://kenney.nl/media/pages/assets/tiny-town/a415fbeb49-1735736916/kenney_tiny-town.zip',
    keep: ['Tilemap/tilemap_packed.png', 'License.txt', 'Tilesheet.txt', 'Sample.png'],
  },
  {
    id: 'tiny-dungeon',
    page: 'https://kenney.nl/assets/tiny-dungeon',
    url: 'https://kenney.nl/media/pages/assets/tiny-dungeon/f8422efb44-1674742415/kenney_tiny-dungeon.zip',
    keep: ['Tilemap/tilemap_packed.png', 'License.txt', 'Tilesheet.txt', 'Sample.png'],
  },
];

for (const pack of PACKS) {
  process.stdout.write(`↓ ${pack.id} … `);
  const res = await fetch(pack.url);
  if (!res.ok) throw new Error(`${pack.id}: HTTP ${res.status}. Copia el enlace actualizado desde ${pack.page}`);
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
  let saved = 0;
  for (const [path, data] of Object.entries(files)) {
    // el zip puede traer o no una carpeta raíz: se acepta la ruta exacta o terminada en la deseada
    const rel = pack.keep.find((k) => path === k || path.endsWith(`/${k}`));
    if (!rel) continue;
    const out = join('assets-src/kenney', pack.id, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, data);
    saved++;
  }
  console.log(`${saved}/${pack.keep.length} archivos (licencia CC0 incluida)`);
}
