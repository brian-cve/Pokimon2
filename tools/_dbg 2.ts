import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 640 } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto('http://localhost:5173'); await p.waitForTimeout(2000);
const ev = <T = unknown>(s: string) => p.evaluate(s) as Promise<T>;
const OW = "window.__game.scene.getScene('Overworld')", BT = "window.__game.scene.getScene('Battle')";
const status = () => ev(`(() => { const m = window.__game.scene; const o = ${OW}; return JSON.stringify({ ow: { active: m.isActive('Overworld'), paused: m.isPaused('Overworld'), visible: m.isVisible('Overworld'), moving: o.moving, transitioning: o.transitioning }, bt: { active: m.isActive('Battle'), sleeping: m.isSleeping('Battle'), phase: ${BT}?.getState?.().phase } }); })()`);
await ev(`${OW}.debugEncounter('cangrejete',3)`);
for (let t = 0; t < 400; t++) { if (await ev(`${BT}?.getState?.().phase==='actions'`).catch(() => false)) break; await p.waitForTimeout(50); }
console.log('en combate  :', await status());
for (let k = 0; k < 12; k++) {
  const cur = await ev<number>(`${BT}.getState().cursor`);
  if (cur & 2 ^ 2) await p.keyboard.press('ArrowDown'); if (cur & 1 ^ 1) await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(80); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  if (await ev<boolean>(`window.__game.scene.isSleeping('Battle')`)) break;
  for (let t = 0; t < 180; t++) { if (await ev(`${BT}.getState().phase==='actions'`)) break; await p.waitForTimeout(50); }
}
await p.waitForTimeout(300);  console.log('+0.3 s       :', await status());
await p.waitForTimeout(1500); console.log('+1.8 s       :', await status());
await p.waitForTimeout(3000); console.log('+4.8 s       :', await status());
await b.close();
