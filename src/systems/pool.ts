import Phaser from 'phaser';
import { ATLAS } from '../config';

export interface PoolStats { created: number; reused: number; active: number; total: number }
type Poolable = Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown };

/**
 * Pool de objetos sobre `Phaser.GameObjects.Group`: en vez de crear/destruir un GameObject cada vez
 * (efectos de impacto, textos de menú, cortinas), se reciclan los inactivos del grupo.
 *  - acquire(): reutiliza un objeto muerto del grupo o crea uno nuevo.
 *  - release(): lo mata (active=false) y lo oculta; también cancela sus tweens.
 */
export class Pool<T extends Poolable> {
  private readonly group: Phaser.GameObjects.Group;
  private created = 0;
  private reused = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly make: () => T, private readonly reset: (o: T) => void, prewarm = 0) {
    this.group = scene.add.group();
    for (let i = 0; i < prewarm; i++) this.release(this.spawn());
  }

  private spawn(): T {
    const o = this.make();
    this.group.add(o);
    this.created++;
    return o;
  }

  acquire(): T {
    const dead = this.group.getFirstDead(false) as T | null;
    let o: T;
    if (dead) { o = dead; this.reused++; } else o = this.spawn();
    this.reset(o);
    o.setActive(true).setVisible(true);
    return o;
  }

  release(o: T): void {
    this.scene.tweens.killTweensOf(o);
    this.group.killAndHide(o);
  }

  get stats(): PoolStats {
    return { created: this.created, reused: this.reused, active: this.group.countActive(true), total: this.group.getLength() };
  }
}

/** Pools de imágenes (frames del atlas / píxel escalado) y de textos bitmap de una escena. */
export class UiPools {
  readonly images: Pool<Phaser.GameObjects.Image>;
  readonly texts: Pool<Phaser.GameObjects.BitmapText>;

  constructor(scene: Phaser.Scene) {
    this.images = new Pool(
      scene,
      () => scene.add.image(0, 0, ATLAS, 'px'),
      (o) => o.setTexture(ATLAS, 'px').setOrigin(0).setScale(1).setAlpha(1).setAngle(0).clearTint().setDepth(0).setScrollFactor(1),
      12,
    );
    this.texts = new Pool(
      scene,
      () => scene.add.bitmapText(0, 0, 'pixfont', ''),
      (o) => o.setText('').setOrigin(0).setScale(1).setAlpha(1).clearTint().setDepth(0).setScrollFactor(1).setLineSpacing(5),
      16,
    );
  }

  /** Un frame del atlas en (x, y). */
  image(frame: string, x = 0, y = 0): Phaser.GameObjects.Image {
    return this.images.acquire().setTexture(ATLAS, frame).setPosition(x, y);
  }

  /** Rectángulo sólido: el frame 'px' (1×1 blanco) escalado y teñido. */
  rect(x: number, y: number, w: number, h: number, color: number): Phaser.GameObjects.Image {
    return this.images.acquire().setTexture(ATLAS, 'px').setPosition(x, y).setDisplaySize(w, h).setTint(color);
  }

  releaseImage(o: Phaser.GameObjects.Image): void {
    o.parentContainer?.remove(o);
    this.images.release(o);
  }
}

const registry = new WeakMap<Phaser.Scene, UiPools>();

/** Pools de la escena (se crean al primer uso y se descartan cuando la escena se apaga). */
export function poolsFor(scene: Phaser.Scene): UiPools {
  let p = registry.get(scene);
  if (!p) {
    p = new UiPools(scene);
    registry.set(scene, p);
    scene.events.once('shutdown', () => registry.delete(scene));
    scene.events.once('destroy', () => registry.delete(scene));
  }
  return p;
}
