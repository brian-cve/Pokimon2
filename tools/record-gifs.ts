// Graba los GIF del README (docs/media/*.gif) jugando el juego real en Chromium headless.
// Uso (con `npm run dev` en marcha):  npm run gifs [-- <nombre> ...]     nombres: title world battle capture pause
// Los fotogramas se capturan a 2x (480x320), se cuantizan con una paleta común y solo se guardan los
// píxeles que cambian entre fotogramas (transparencia GIF), lo que reduce mucho el tamaño.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import gifenc from 'gifenc';
import { chromium, type Page } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const { applyPalette, GIFEncoder, quantize } = gifenc; // gifenc es CommonJS: sin exports con nombre en ESM
const URL = process.env.URL ?? 'http://localhost:5173';
const W = 480, H = 320;
const wanted = process.argv.slice(2);
mkdirSync('docs/media', { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
interface SceneLike { phase?: string; battle?: { rng: () => number }; debugEncounter(species: string, level: number): void; debugTeleport(map: string, x: number, y: number, dir: string): void }
type Win = { __game: { scene: { getScene(k: string): SceneLike; isActive(k: string): boolean } }; __state: { party: unknown[] } };

async function newPage() {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(URL);
  await sleep(1300);
  return { browser, page };
}

const press = async (page: Page, key: string, wait = 350) => { await page.keyboard.press(key); await sleep(wait); };
const hold = async (page: Page, key: string, ms: number) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); await sleep(60); };
const phase = (page: Page) => page.evaluate(() => (window as unknown as Win).__game.scene.getScene('Battle')?.phase as string | undefined);

/** Empieza la partida y deja el combate listo en el menú de acciones. */
async function toBattleMenu(page: Page, species: string, level: number): Promise<void> {
  await press(page, 'Enter', 1500);
  await page.evaluate(([s, l]) => (window as unknown as Win).__game.scene.getScene('Overworld').debugEncounter(s, l), [species, level] as const);
  for (let i = 0; i < 50 && (await phase(page)) !== 'actions'; i++) await press(page, 'Enter', 350);
}

/** Graba mientras `script` corre (más `tail` ms) y escribe el GIF. */
async function record(page: Page, name: string, script: () => Promise<void>, tail = 600): Promise<void> {
  const frames: { rgba: Uint8ClampedArray; t: number }[] = [];
  let running = true;
  const t0 = Date.now();
  const loop = (async () => {
    while (running) {
      const png = await page.screenshot({ type: 'png' });
      const img = await loadImage(png);
      const c = createCanvas(W, H), cx = c.getContext('2d');
      cx.drawImage(img, 0, 0, W, H);
      frames.push({ rgba: cx.getImageData(0, 0, W, H).data, t: Date.now() - t0 });
    }
  })();
  await script();
  await sleep(tail);
  running = false;
  await loop;
  if (frames.length < 2) throw new Error(`${name}: sin fotogramas`);

  // paleta común (muestreando varios fotogramas) con una entrada reservada para "sin cambio"
  const sample = new Uint8ClampedArray(Math.min(frames.length, 8) * (W * H / 4) * 4);
  frames.filter((_, i) => i % Math.max(1, Math.floor(frames.length / 8)) === 0).slice(0, 8).forEach((f, k) => {
    for (let p = 0; p < W * H / 4; p++) sample.set(f.rgba.subarray(p * 16, p * 16 + 4), (k * (W * H / 4) + p) * 4);
  });
  const palette = quantize(sample, 255);
  while (palette.length < 255) palette.push([0, 0, 0]);
  palette.push([0, 0, 0]);
  const TRANSPARENT = 255;

  const gif = GIFEncoder();
  let prev: Uint8Array | null = null;
  frames.forEach((f, i) => {
    const idx = applyPalette(f.rgba, palette);
    const delay = Math.max(40, (frames[i + 1]?.t ?? f.t + 400) - f.t);
    const out = prev ? idx.map((v, p) => (v === prev![p] ? TRANSPARENT : v)) : idx;
    gif.writeFrame(out, W, H, { palette: i === 0 ? palette : undefined, delay, transparent: !!prev, transparentIndex: TRANSPARENT, dispose: 1, repeat: 0 });
    prev = idx;
  });
  gif.finish();
  writeFileSync(`docs/media/${name}.gif`, gif.bytes());
  console.log(`docs/media/${name}.gif  ${frames.length} fotogramas, ${(gif.bytes().length / 1024).toFixed(0)} KB`);
}

const scenes: Record<string, (page: Page) => Promise<void>> = {
  /** Título: el logo se balancea y el cursor recorre el menú. */
  title: async (page) => {
    await record(page, 'title', async () => {
      await sleep(1200);
      await press(page, 'ArrowDown', 700); await press(page, 'ArrowDown', 700); await press(page, 'ArrowUp', 700); await press(page, 'ArrowUp', 1200);
    });
  },

  /** Mundo: caminar hasta la puerta, entrar a la casa y dormir en la cama. */
  world: async (page) => {
    await press(page, 'Enter', 1800);
    await page.evaluate(() => (window as unknown as Win).__game.scene.getScene('Overworld').debugTeleport('town', 4, 10, 'up'));
    await sleep(1500);
    await record(page, 'world', async () => {
      await sleep(500);
      await hold(page, 'ArrowUp', 1050);          // (4,10) → puerta (4,5)
      await sleep(1100);                            // fundido y cartel CASA
      await hold(page, 'ArrowUp', 640);            // hasta (4,3)
      await hold(page, 'ArrowLeft', 640);          // hasta junto a la cama
      await press(page, 'Enter', 700);             // diálogo
      await press(page, 'Enter', 3600);            // dormir: fundido y cura
      await press(page, 'Enter', 300);
    }, 300);
  },

  /** Combate: Lanzallamas contra una criatura de planta. */
  battle: async (page) => {
    await toBattleMenu(page, 'hojin', 4);
    await record(page, 'battle', async () => {
      await sleep(500);
      await press(page, 'Enter', 500);           // LUCHAR
      await press(page, 'ArrowDown', 350);        // LANZALLAMAS
      await press(page, 'Enter', 600);
      await sleep(5200);
    });
  },

  /** Captura: la ball vuela, la criatura entra y se sacude hasta quedar atrapada. */
  capture: async (page) => {
    await toBattleMenu(page, 'peluson', 4);
    await page.evaluate(() => { const b = (window as unknown as Win).__game.scene.getScene('Battle').battle; if (b) b.rng = () => 0; }); // captura asegurada
    await record(page, 'capture', async () => {
      await sleep(400);
      await press(page, 'ArrowRight', 400);       // MOCHILA
      await press(page, 'Enter', 500);
      await press(page, 'Enter', 600);            // POKÉ BALL
      await sleep(7600);
    });
  },

  /** Pausa → mochila: equipo con la criatura capturada. */
  pause: async (page) => {
    await press(page, 'Enter', 1800);
    // se añade una segunda criatura al equipo (con el módulo del propio juego, vía Vite)
    await page.evaluate("import('/src/systems/creature.ts').then((m) => window.__state.party.push(m.createCreature('gotilla', 6)))");
    await record(page, 'pause', async () => {
      await sleep(500);
      await press(page, 'Escape', 700);
      await press(page, 'ArrowDown', 500);
      await press(page, 'Enter', 900);
      await press(page, 'ArrowDown', 900);
      await press(page, 'Enter', 800);              // gotilla pasa a líder
      await sleep(900);
    });
  },
};

const names = wanted.length ? wanted : Object.keys(scenes);
for (const n of names) {
  if (!scenes[n]) { console.error(`escena desconocida: ${n}`); continue; }
  const { browser, page } = await newPage();
  await scenes[n](page);
  await browser.close();
}
