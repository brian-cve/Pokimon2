import Phaser from 'phaser';

const BARS = 8;
const BAR_H = 20;
const W = 240;
const DEPTH = 5000;
const sleep = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, r));
const tween = (scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig) =>
  new Promise<void>((r) => scene.tweens.add({ ...cfg, onComplete: () => r() }));

/** Destello blanco doble, como al empezar un combate. */
export async function flash(scene: Phaser.Scene, times = 2): Promise<void> {
  const rect = scene.add.image(0, 0, 'px_W').setOrigin(0).setDisplaySize(W, 160).setScrollFactor(0).setDepth(DEPTH).setAlpha(0);
  for (let i = 0; i < times; i++) {
    await tween(scene, { targets: rect, alpha: 1, duration: 70 });
    await tween(scene, { targets: rect, alpha: 0.15, duration: 90 });
  }
  await tween(scene, { targets: rect, alpha: 1, duration: 60 });
  rect.destroy();
}

const barsByScene = new WeakMap<Phaser.Scene, Phaser.GameObjects.Image[]>();

function makeBars(scene: Phaser.Scene, covered: boolean): Phaser.GameObjects.Image[] {
  barsByScene.get(scene)?.forEach((b) => b.destroy());
  const bars = Array.from({ length: BARS }, (_, i) =>
    scene.add.image(covered ? 0 : (i % 2 ? W : -W), i * BAR_H, 'px_K').setOrigin(0).setDisplaySize(W, BAR_H).setScrollFactor(0).setDepth(DEPTH));
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
  await Promise.all(bars.map((b, i) => tween(scene, { targets: b, x: i % 2 ? -W : W, duration: 260, delay: i * 40, ease: 'Sine.easeOut' })));
  bars.forEach((b) => b.destroy());
  barsByScene.delete(scene);
}

export { sleep };
