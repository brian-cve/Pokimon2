import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { COLOR } from '../ui/colors';
import { poolsFor } from './pool';

const BARS = 8;
const BAR_H = GAME_H / BARS;
const DEPTH = 5000;
export const sleep = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, r));
const tween = (scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig) =>
  new Promise<void>((r) => scene.tweens.add({ ...cfg, onComplete: () => r() }));

/** Destello blanco doble, como al empezar un combate. */
export async function flash(scene: Phaser.Scene, times = 2): Promise<void> {
  const pools = poolsFor(scene);
  const rect = pools.rect(0, 0, GAME_W, GAME_H, COLOR.W).setScrollFactor(0).setDepth(DEPTH).setAlpha(0);
  for (let i = 0; i < times; i++) {
    await tween(scene, { targets: rect, alpha: 1, duration: 70 });
    await tween(scene, { targets: rect, alpha: 0.15, duration: 90 });
  }
  await tween(scene, { targets: rect, alpha: 1, duration: 60 });
  pools.releaseImage(rect);
}

// Las 8 bandas se reciclan del pool de la escena: se piden al cerrar y se devuelven al abrir.
const barsByScene = new WeakMap<Phaser.Scene, Phaser.GameObjects.Image[]>();

function makeBars(scene: Phaser.Scene, covered: boolean): Phaser.GameObjects.Image[] {
  const pools = poolsFor(scene);
  barsByScene.get(scene)?.forEach((b) => pools.releaseImage(b));
  const bars = Array.from({ length: BARS }, (_, i) =>
    pools.rect(covered ? 0 : (i % 2 ? GAME_W : -GAME_W), i * BAR_H, GAME_W, BAR_H, COLOR.K).setScrollFactor(0).setDepth(DEPTH));
  barsByScene.set(scene, bars);
  return bars;
}

/** Barrido: bandas negras que entran alternando izquierda/derecha hasta cubrir la pantalla. */
export async function sweepClose(scene: Phaser.Scene): Promise<void> {
  const bars = makeBars(scene, false);
  await Promise.all(bars.map((b, i) => tween(scene, { targets: b, x: 0, duration: 260, delay: i * 40, ease: 'Sine.easeIn' })));
}

/** Inverso: las bandas salen y descubren la escena. Si no hubo barrido previo en esta escena, parte cubierta. */
export async function sweepOpen(scene: Phaser.Scene): Promise<void> {
  const bars = barsByScene.get(scene) ?? makeBars(scene, true);
  await Promise.all(bars.map((b, i) => tween(scene, { targets: b, x: i % 2 ? -GAME_W : GAME_W, duration: 260, delay: i * 40, ease: 'Sine.easeOut' })));
  const pools = poolsFor(scene);
  bars.forEach((b) => pools.releaseImage(b));
  barsByScene.delete(scene);
}
