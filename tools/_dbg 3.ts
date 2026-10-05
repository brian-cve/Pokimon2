import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 640 } });
const errs: string[] = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5173'); await p.waitForTimeout(2000);
const ev = <T = unknown>(s: string) => p.evaluate(s) as Promise<T>;
const OW = "window.__game.scene.getScene('Overworld')", BT = "window.__game.scene.getScene('Battle')";
const wait = async (expr: string, ms = 20000) => { for (let t = 0; t < ms / 50; t++) { if (await ev(expr).catch(() => false)) return true; await p.waitForTimeout(50); } console.log('TIMEOUT', expr); return false; };
const sleeping = `window.__game.scene.isSleeping('Battle')`;
let timeouts = 0;
for (let i = 1; i <= 4; i++) {
  if (!(await wait(`!${OW}.getState().moving`, 8000))) timeouts++;
  await ev(`${OW}.debugEncounter('cangrejete',3)`);
  await wait(`${BT}?.getState?.().battles===${i} && ${BT}.getState().phase==='actions'`);
  for (let k = 0; k < 12 && !(await ev<boolean>(sleeping)); k++) {
    if ((await ev<string>(`${BT}.getState().phase`)) !== 'actions') { await p.waitForTimeout(300); continue; }
    const cur = await ev<number>(`${BT}.getState().cursor`);
    if (cur & 2 ^ 2) await p.keyboard.press('ArrowDown'); if (cur & 1 ^ 1) await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(80); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
    await wait(`${BT}.getState().phase==='actions' || ${sleeping}`, 9000);
  }
  await wait(sleeping, 8000);
  if (!(await wait(`!${OW}.getState().moving`, 8000))) timeouts++;
  const s = await ev<{ pools: { images: { created: number; reused: number }; texts: { created: number; reused: number } } }>(`${BT}.getState()`);
  console.log(`combate ${i}: imágenes creadas=${s.pools.images.created} reutilizadas=${s.pools.images.reused} | textos creados=${s.pools.texts.created} reutilizados=${s.pools.texts.reused}`);
}
// y el jugador sigue pudiendo moverse tras los combates
const before = await ev<{ x: number }>(`${OW}.getState()`);
await p.keyboard.down('ArrowRight'); await p.waitForTimeout(800); await p.keyboard.up('ArrowRight');
const after = await ev<{ x: number }>(`${OW}.getState()`);
console.log(`movimiento tras combates: x ${before.x} → ${after.x}`, after.x > before.x ? '(OK)' : '(BLOQUEADO)');
console.log('timeouts:', timeouts, '| errores de página:', JSON.stringify(errs));
await b.close();
