import Phaser from 'phaser';
import { COLOR } from '../ui/colors';
import { sleep } from './transition';

type Spr = Phaser.GameObjects.Image;
export interface Pt { x: number; y: number }
interface Ctx { scene: Phaser.Scene; atk: Spr; tgt: Spr; from: Pt; to: Pt; dir: 1 | -1 }

const DEPTH = 70;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Centro visual de un sprite de criatura (origen abajo-centro, 64 px de alto). */
export const centerOf = (s: Spr): Pt => ({ x: s.x, y: s.y - 30 });

const tween = (scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig) =>
  new Promise<void>((res) => scene.tweens.add({ ...cfg, onComplete: () => res() }));

function particle(scene: Phaser.Scene, key: string, x: number, y: number, tint?: number): Spr {
  const p = scene.add.image(x, y, key).setDepth(DEPTH).setOrigin(0.5);
  if (tint !== undefined) p.setTint(tint);
  return p;
}

interface StreamOpts {
  count: number; stagger?: number; duration?: number; jitter?: number; scale?: [number, number];
  arc?: number; spin?: number; tint?: number; ease?: string; aim?: boolean; onArrive?: (p: Spr) => void;
}

/** Lanza `count` partículas de `from` a `to` (con dispersión, arco y giro) y resuelve al llegar la última. */
function stream(scene: Phaser.Scene, key: string, from: Pt, to: Pt, o: StreamOpts): Promise<void> {
  const { count, stagger = 50, duration = 260, jitter = 6, scale = [1, 1], arc = 0, spin = 0, tint, ease = 'Quad.easeIn', aim = false } = o;
  const jobs = Array.from({ length: count }, (_, i) => new Promise<void>((done) => {
    scene.time.delayedCall(i * stagger, () => {
      const jx = rnd(-jitter, jitter), jy = rnd(-jitter, jitter);
      const p = particle(scene, key, from.x, from.y, tint).setScale(scale[0]);
      if (aim) p.setRotation(Math.atan2(to.y + jy - from.y, to.x + jx - from.x) + Math.PI / 2);
      const s = { t: 0 };
      scene.tweens.add({
        targets: s, t: 1, duration, ease,
        onUpdate: () => {
          p.setPosition(lerp(from.x, to.x + jx, s.t), lerp(from.y, to.y + jy, s.t) - Math.sin(s.t * Math.PI) * arc);
          p.setScale(lerp(scale[0], scale[1], s.t));
          if (spin) p.angle += spin;
        },
        onComplete: () => { o.onArrive?.(p); p.destroy(); done(); },
      });
    });
  }));
  return Promise.all(jobs).then(() => undefined);
}

/** Estallido radial de partículas que se alejan y se desvanecen. */
export function burst(scene: Phaser.Scene, at: Pt, key: string, n: number, o: { speed?: number; life?: number; tint?: number; scale?: number; gravity?: number } = {}): Promise<void> {
  const { speed = 26, life = 340, tint, scale = 1, gravity = 0 } = o;
  return Promise.all(Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3), d = speed * rnd(0.6, 1.1);
    const p = particle(scene, key, at.x, at.y, tint).setScale(scale * rnd(0.8, 1.2));
    return tween(scene, {
      targets: p, x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d + gravity, alpha: 0, scale: 0.3 * scale,
      duration: life * rnd(0.8, 1.1), ease: 'Quad.easeOut', onComplete: () => p.destroy(),
    });
  })).then(() => undefined);
}

/** Destello de 4 puntas en el punto de impacto. */
export function impactStar(scene: Phaser.Scene, at: Pt, size = 1.5): Promise<void> {
  const s = particle(scene, 'fxp_star', at.x, at.y).setScale(0.3).setAngle(rnd(-15, 15));
  return tween(scene, { targets: s, scale: size, angle: s.angle + 40, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
}

/** Embestida: pequeño retroceso, carrera hasta casi tocar al rival (`onContact`) y vuelta. */
async function dash(c: Ctx, onContact?: () => Promise<void> | void, reach = 0.72, windup = 8): Promise<void> {
  const { scene, atk, tgt, dir } = c;
  const sx = atk.x, sy = atk.y;
  await tween(scene, { targets: atk, x: sx - dir * windup, duration: 90, ease: 'Quad.easeOut' });
  await tween(scene, { targets: atk, x: lerp(sx, tgt.x, reach), y: lerp(sy, tgt.y, reach), duration: 110, ease: 'Quad.easeIn' });
  const pending = onContact?.();
  await Promise.all([pending, sleep(scene, 40)]);
  await tween(scene, { targets: atk, x: sx, y: sy, duration: 190, ease: 'Quad.easeOut' });
  atk.setPosition(sx, sy);
}

/** Cambia un objeto de Graphics por una animación de 0→1 y lo destruye al terminar. */
function drawn(scene: Phaser.Scene, duration: number, draw: (g: Phaser.GameObjects.Graphics, t: number) => void, ease = 'Quad.easeOut', fade = true): Promise<void> {
  const g = scene.add.graphics().setDepth(DEPTH);
  const s = { t: 0 };
  return tween(scene, {
    targets: s, t: 1, duration, ease,
    onUpdate: () => { g.clear(); g.setAlpha(fade && s.t > 0.7 ? 1 - (s.t - 0.7) / 0.3 : 1); draw(g, s.t); },
    onComplete: () => g.destroy(),
  });
}

const WHITE = 0xf8f8f0;
const tint = (scene: Phaser.Scene, to: Pt, color: number, alpha = 0.45, ms = 140) => {
  const r = scene.add.rectangle(0, 0, 240, 112, color, alpha).setOrigin(0).setDepth(DEPTH - 1);
  void to;
  return tween(scene, { targets: r, alpha: 0, duration: ms, ease: 'Quad.easeIn', onComplete: () => r.destroy() });
};

// ------------------------------------------------------------------ animaciones por movimiento

const FX: Record<string, (c: Ctx) => Promise<void>> = {
  /** Placaje: embestida con destello de impacto. */
  placaje: (c) => dash(c, () => Promise.all([impactStar(c.scene, c.to, 1.8), burst(c.scene, c.to, 'fxp_dot', 6, { speed: 22, life: 260 })]).then(() => undefined)),

  /** Forcejeo: dos embestidas rápidas y desesperadas. */
  forcejeo: async (c) => {
    await dash(c, () => impactStar(c.scene, c.to, 1.1), 0.62, 5);
    await dash(c, () => impactStar(c.scene, c.to, 1.4), 0.7, 5);
  },

  /** Carrera: estela de imágenes residuales y choque. */
  ataqueRapido: async (c) => {
    const { scene, atk, tgt } = c;
    const ghosts = [0.55, 0.35, 0.2].map((a) => scene.add.image(atk.x, atk.y, atk.texture.key, atk.frame.name).setOrigin(0.5, 1).setDepth(atk.depth - 0.5).setAlpha(0).setData('a', a));
    const sx = atk.x, sy = atk.y;
    await tween(scene, { targets: atk, x: sx - c.dir * 10, duration: 80, ease: 'Quad.easeOut' });
    const run = tween(scene, { targets: atk, x: lerp(sx, tgt.x, 0.8), y: lerp(sy, tgt.y, 0.8), duration: 150, ease: 'Quad.easeIn',
      onUpdate: (tw) => ghosts.forEach((g, i) => { g.setAlpha(g.getData('a') as number * (1 - tw.progress * 0.4)); g.setPosition(lerp(sx, atk.x, 0.3 + i * 0.25), lerp(sy, atk.y, 0.3 + i * 0.25)); }) });
    await run;
    await Promise.all([impactStar(scene, c.to, 1.7), burst(scene, c.to, 'fxp_dot', 8, { speed: 28 })]);
    ghosts.forEach((g) => g.destroy());
    await tween(scene, { targets: atk, x: sx, y: sy, duration: 160, ease: 'Quad.easeOut' });
  },

  /** Arañazo: tres zarpazos diagonales. */
  aranazo: (c) => dash(c, async () => {
    const { x, y } = c.to;
    const claws = [-9, 0, 9].map((off, i) => new Promise<void>((res) => c.scene.time.delayedCall(i * 55, () => {
      void drawn(c.scene, 190, (g, t) => {
        const x0 = x + off - 10, y0 = y - 18, x1 = x + off + 10, y1 = y + 18;
        g.lineStyle(4, 0x1f1a2e, 1).lineBetween(x0, y0, lerp(x0, x1, t), lerp(y0, y1, t));
        g.lineStyle(2, WHITE, 1).lineBetween(x0, y0, lerp(x0, x1, t), lerp(y0, y1, t));
      }).then(res);
    })));
    await Promise.all([...claws, sleep(c.scene, 120).then(() => burst(c.scene, c.to, 'fxp_dot', 7, { speed: 24, life: 220 }))]);
  }, 0.6),

  /** Mordisco: dos hileras de colmillos que se cierran. */
  mordisco: (c) => dash(c, async () => {
    const { x, y } = c.to;
    await drawn(c.scene, 300, (g, t) => {
      const d = t < 0.5 ? lerp(24, 4, t / 0.5) : 4;
      for (let i = -2; i <= 2; i++) {
        const fx = x + i * 8;
        g.fillStyle(WHITE, 1).lineStyle(1, 0x1f1a2e, 1);
        g.fillTriangle(fx - 4, y - d - 6, fx + 4, y - d - 6, fx, y - d + 8).strokeTriangle(fx - 4, y - d - 6, fx + 4, y - d - 6, fx, y - d + 8);
        g.fillTriangle(fx - 4, y + d + 6, fx + 4, y + d + 6, fx, y + d - 8).strokeTriangle(fx - 4, y + d + 6, fx + 4, y + d + 6, fx, y + d - 8);
      }
    }, 'Quad.easeIn');
    await impactStar(c.scene, c.to, 1.6);
  }, 0.62),

  /** Picotazo: tres picotazos cortos y rápidos. */
  picotazo: async (c) => {
    for (let i = 0; i < 3; i++) await dash(c, () => Promise.all([impactStar(c.scene, { x: c.to.x + rnd(-6, 6), y: c.to.y + rnd(-8, 8) }, 0.9), burst(c.scene, c.to, 'fxp_dot', 3, { speed: 14, life: 160 })]).then(() => undefined), 0.5, 4);
  },

  /** Ataque Ala: dos medias lunas que barren al rival. */
  ataqueAla: (c) => dash(c, async () => {
    const { x, y } = c.to;
    await Promise.all([-1, 1].map((side, k) => drawn(c.scene, 280, (g, t) => {
      const a0 = side < 0 ? Math.PI * 1.15 : -Math.PI * 0.15;
      const sweep = side < 0 ? -Math.PI * 0.9 * t : Math.PI * 0.9 * t;
      g.lineStyle(5, 0x1f1a2e, 1).beginPath().arc(x, y + k * 6 - 3, 24, a0, a0 + sweep, side > 0).strokePath();
      g.lineStyle(3, WHITE, 1).beginPath().arc(x, y + k * 6 - 3, 24, a0, a0 + sweep, side > 0).strokePath();
    })));
    await burst(c.scene, c.to, 'fxp_dot', 8, { speed: 26, life: 240 });
  }, 0.55),

  /** Ascuas: lluvia de bolas de fuego en arco. */
  ascuas: async (c) => {
    await stream(c.scene, 'fxp_flame', c.from, c.to, { count: 5, stagger: 80, duration: 300, jitter: 8, scale: [0.8, 1.1], arc: 14, aim: true,
      onArrive: (p) => { void burst(c.scene, { x: p.x, y: p.y }, 'fxp_dot', 4, { speed: 14, life: 220, tint: COLOR.O }); } });
    await Promise.all([impactStar(c.scene, c.to, 1.5), tint(c.scene, c.to, COLOR.O, 0.35, 220)]);
  },

  /** Lanzallamas: un chorro continuo de fuego. */
  lanzallamas: async (c) => {
    void tint(c.scene, c.to, COLOR.P, 0.25, 420);
    await stream(c.scene, 'fxp_flame', c.from, c.to, { count: 16, stagger: 32, duration: 250, jitter: 7, scale: [0.6, 1.9], aim: true, ease: 'Linear',
      onArrive: (p) => { void burst(c.scene, { x: p.x, y: p.y }, 'fxp_dot', 2, { speed: 12, life: 200, tint: COLOR.Y }); } });
    await Promise.all([impactStar(c.scene, c.to, 2.2), tint(c.scene, c.to, COLOR.O, 0.5, 260), burst(c.scene, c.to, 'fxp_flame', 6, { speed: 30, life: 380, scale: 0.9 })]);
  },

  /** Pistola Agua: chorro rápido de gotas con salpicadura. */
  pistolaAgua: async (c) => {
    await stream(c.scene, 'fxp_drop', c.from, c.to, { count: 9, stagger: 36, duration: 230, jitter: 5, scale: [0.9, 1.2], arc: 6, ease: 'Linear', aim: true });
    await Promise.all([burst(c.scene, c.to, 'fxp_drop', 9, { speed: 26, life: 380, gravity: 10 }), tint(c.scene, c.to, COLOR.i, 0.3, 200)]);
  },

  /** Hidropulso: ondas de agua que viajan hasta el rival y estallan. */
  hidropulso: async (c) => {
    await stream(c.scene, 'fxp_ring', c.from, c.to, { count: 3, stagger: 130, duration: 330, jitter: 1, scale: [0.35, 1.3], tint: COLOR.i, ease: 'Sine.easeIn' });
    const r = particle(c.scene, 'fxp_ring', c.to.x, c.to.y, COLOR.h).setScale(0.5);
    await Promise.all([
      tween(c.scene, { targets: r, scale: 3, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => r.destroy() }),
      burst(c.scene, c.to, 'fxp_drop', 10, { speed: 32, life: 400, gravity: 8 }), tint(c.scene, c.to, COLOR.i, 0.4, 300),
    ]);
  },

  /** Látigo Cepa: una liana que ondula, restalla contra el rival y suelta hojas. */
  latigoCepa: async (c) => {
    const { from, to } = c;
    const len = Math.hypot(to.x - from.x, to.y - from.y), nx = -(to.y - from.y) / len, ny = (to.x - from.x) / len;
    await drawn(c.scene, 420, (g, t) => {
      const reach = t < 0.55 ? t / 0.55 : 1;
      const wob = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i <= 24; i++) {
        const s = (i / 24) * reach;
        const off = Math.sin(s * Math.PI * 4 + t * 14) * 11 * (1 - s * 0.4) * wob;
        pts.push(new Phaser.Math.Vector2(lerp(from.x, to.x, s) + nx * off, lerp(from.y, to.y, s) + ny * off));
      }
      g.lineStyle(5, COLOR.H, 1).strokePoints(pts);
      g.lineStyle(3, COLOR.b, 1).strokePoints(pts);
      g.lineStyle(1, COLOR.a, 1).strokePoints(pts);
    }, 'Linear');
    await Promise.all([impactStar(c.scene, to, 1.4), burst(c.scene, to, 'fxp_leaf', 7, { speed: 28, life: 420, gravity: 8 })]);
  },

  /** Hoja Afilada: remolino de hojas que corta al rival. */
  hojaAfilada: async (c) => {
    await stream(c.scene, 'fxp_leaf', c.from, c.to, { count: 8, stagger: 45, duration: 300, jitter: 9, scale: [0.9, 1.3], arc: 22, spin: 28, ease: 'Sine.easeIn' });
    const { x, y } = c.to;
    await Promise.all([
      drawn(c.scene, 230, (g, t) => {
        g.lineStyle(3, WHITE, 1).lineBetween(x - 20, y + 14, lerp(x - 20, x + 20, t), lerp(y + 14, y - 14, t));
        g.lineStyle(2, COLOR.a, 1).lineBetween(x - 20, y - 6, lerp(x - 20, x + 20, t), lerp(y - 6, y + 14, t));
      }),
      burst(c.scene, c.to, 'fxp_leaf', 8, { speed: 30, life: 420, gravity: 10 }),
    ]);
  },
};

/** Reproduce la animación del movimiento `moveId` de `atk` hacia `tgt`. Resuelve cuando el impacto ha ocurrido. */
export function playMoveFx(scene: Phaser.Scene, moveId: string, atk: Spr, tgt: Spr): Promise<void> {
  const c: Ctx = { scene, atk, tgt, from: centerOf(atk), to: centerOf(tgt), dir: tgt.x > atk.x ? 1 : -1 };
  return (FX[moveId] ?? FX.placaje)(c);
}

export const MOVE_FX_IDS = Object.keys(FX);

/** Retroceso del rival al ser golpeado (más fuerte cuanto más eficaz sea el ataque). */
export async function recoil(scene: Phaser.Scene, tgt: Spr, dir: 1 | -1, eff: number): Promise<void> {
  const x = tgt.x, amp = eff >= 2 ? 10 : eff < 1 ? 3 : 6;
  tgt.setTintFill(WHITE);
  scene.time.delayedCall(70, () => tgt.clearTint());
  await tween(scene, { targets: tgt, x: x + dir * amp, duration: 60, ease: 'Quad.easeOut' });
  await tween(scene, { targets: tgt, x, duration: 140, ease: 'Elastic.easeOut' });
  tgt.setX(x);
}

/** Chispas doradas que suben alrededor de una criatura (subida de nivel). */
export function sparkle(scene: Phaser.Scene, tgt: Spr): Promise<void> {
  const c = centerOf(tgt);
  return Promise.all(Array.from({ length: 12 }, (_, i) => new Promise<void>((res) => scene.time.delayedCall(i * 60, () => {
    const p = particle(scene, 'fxp_star', c.x + rnd(-26, 26), c.y + rnd(0, 30)).setScale(rnd(0.4, 0.8)).setTint(COLOR.Y);
    void tween(scene, { targets: p, y: p.y - 34, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => { p.destroy(); res(); } });
  })))).then(() => undefined);
}

/** Nube de polvo al desmayarse. */
export function dust(scene: Phaser.Scene, tgt: Spr): Promise<void> {
  return burst(scene, { x: tgt.x, y: tgt.y - 4 }, 'fxp_dot', 10, { speed: 30, life: 480, tint: COLOR.w, scale: 1.4, gravity: -6 });
}
