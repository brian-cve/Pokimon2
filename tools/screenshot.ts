// Captura el juego real con Chromium headless.
// Uso:  tsx tools/screenshot.ts <nombre> [url]  →  out/<nombre>.png
// Variables de entorno:
//   TELEPORT="mapa:x,y,dir"   coloca al jugador antes de empezar.
//   ENCOUNTER="especie:nivel" fuerza un combate.
//   PRINT=<js>                imprime el resultado de la expresión antes de capturar.
//   KEYS="a|b|c"              secuencia de pasos separados por '|':
//        Tecla:ms             mantiene la tecla ms milisegundos
//        Tecla@mapa:x,y       mantiene la tecla hasta llegar a esa casilla
//        wait=<js>            espera a que la expresión JS sea verdadera (máx. 20 s)
//        sleep=<ms>           espera
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [name = 'shot', url = 'http://localhost:5173'] = process.argv.slice(2);
mkdirSync('out', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
page.on('console', (m) => { const t = m.text(); if (!/GL Driver|WebGL|vite/.test(t)) console.log('[browser]', t); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url);
await page.waitForTimeout(1200);

const ow = "window.__game.scene.getScene('Overworld')";
const tp = (process.env.TELEPORT ?? '').match(/^(\w+):(\d+),(\d+),(\w+)$/);
if (tp) {
  await page.evaluate(([m, x, y, d]) => (window as any).__game.scene.getScene('Overworld').debugTeleport(m, +x, +y, d), tp.slice(1));
  await page.waitForTimeout(600);
}
const enc = (process.env.ENCOUNTER ?? '').match(/^(\w+):(\d+)$/);
if (enc) await page.evaluate(([s, l]) => (window as any).__game.scene.getScene('Overworld').debugEncounter(s, +l), enc.slice(1));

const state = () => page.evaluate(`${ow}.getState()`);
for (const part of (process.env.KEYS ?? '').split('|').filter(Boolean)) {
  const until = part.match(/^(\w+)@(\w+):(\d+),(\d+)$/);
  if (part.startsWith('wait=')) {
    const expr = part.slice(5);
    let ok = false;
    for (let i = 0; i < 400 && !ok; i++) { ok = Boolean(await page.evaluate(expr).catch(() => false)); if (!ok) await page.waitForTimeout(50); }
    if (!ok) console.log('[timeout] ' + expr);
  } else if (part.startsWith('sleep=')) {
    await page.waitForTimeout(Number(part.slice(6)));
  } else if (until) {
    const [, key, map, x, y] = until;
    await page.keyboard.down(key);
    for (let i = 0; i < 400; i++) {
      const st = (await state()) as { map: string; x: number; y: number } | null;
      if (st && st.map === map && st.x === +x && st.y === +y) break;
      await page.waitForTimeout(50);
    }
    await page.keyboard.up(key);
    await page.waitForTimeout(500);
  } else {
    const [key, ms] = part.split(':');
    await page.keyboard.down(key); await page.waitForTimeout(Number(ms ?? 80)); await page.keyboard.up(key);
    await page.waitForTimeout(80);
  }
}
if (process.env.PRINT) console.log('PRINT', JSON.stringify(await page.evaluate(process.env.PRINT)));
await page.locator('canvas').screenshot({ path: `out/${name}.png` });
await browser.close();
console.log(`out/${name}.png`);
