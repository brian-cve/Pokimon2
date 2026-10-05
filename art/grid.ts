import type { Sprite } from './pixmap';

/** Rampa de tonos de claro → oscuro (3 o 4 caracteres de paleta). */
export type Ramp = string[];
type Mask = (x: number, y: number) => boolean;

// Luz única arriba-izquierda (vector normalizado hacia la luz).
const L = (() => {
  const v = [-0.5, -0.6, 0.62];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / n);
})();

/**
 * Lienzo de píxeles con primitivas que sombrean por bandas duras (sin anti-aliasing)
 * y dibujan contorno oscuro de 1 px por forma. El resultado es un `Sprite` (string[]).
 */
export class Grid {
  readonly cells: string[][];
  constructor(readonly w: number, readonly h: number, fill = '.') {
    this.cells = Array.from({ length: h }, () => Array<string>(w).fill(fill));
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x: number, y: number, ch: string): this {
    x = Math.round(x); y = Math.round(y);
    if (this.inside(x, y)) this.cells[y][x] = ch;
    return this;
  }
  get(x: number, y: number): string {
    return this.inside(x, y) ? this.cells[y][x] : '.';
  }
  rect(x: number, y: number, w: number, h: number, ch: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ch);
    return this;
  }
  hline(x: number, y: number, len: number, ch: string): this { return this.rect(x, y, len, 1, ch); }
  vline(x: number, y: number, len: number, ch: string): this { return this.rect(x, y, 1, len, ch); }
  line(x0: number, y0: number, x1: number, y1: number, ch: string): this {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) this.set(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, ch);
    return this;
  }
  /** Pega otro grid (los '.' no sobrescriben). */
  blit(src: Grid | Sprite, ox: number, oy: number): this {
    const rows = src instanceof Grid ? src.cells.map((r) => r.join('')) : src;
    rows.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && this.set(ox + i, oy + j, ch)));
    return this;
  }

  private paint(mask: Mask, bounds: [number, number, number, number], shadeAt: (x: number, y: number) => string, outline: string | false): this {
    const [x0, y0, x1, y1] = bounds;
    const px: [number, number][] = [];
    for (let y = Math.floor(y0) - 1; y <= Math.ceil(y1) + 1; y++)
      for (let x = Math.floor(x0) - 1; x <= Math.ceil(x1) + 1; x++) if (mask(x, y)) px.push([x, y]);
    for (const [x, y] of px) {
      const edge = !mask(x - 1, y) || !mask(x + 1, y) || !mask(x, y - 1) || !mask(x, y + 1);
      this.set(x, y, edge && outline ? outline : shadeAt(x, y));
    }
    return this;
  }

  /** Elipsoide sombreado (la luz da en la esquina superior izquierda). */
  ellipse(cx: number, cy: number, rx: number, ry: number, ramp: Ramp, outline: string | false = 'K'): this {
    const mask: Mask = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
    const shade = (x: number, y: number) => {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = nx * L[0] + ny * L[1] + nz * L[2];
      if (ramp.length >= 4) return l > 0.78 ? ramp[0] : l > 0.35 ? ramp[1] : l > -0.1 ? ramp[2] : ramp[3];
      if (ramp.length === 2) return l > 0.15 ? ramp[0] : ramp[1];
      return l > 0.6 ? ramp[0] : l > 0.0 ? ramp[1] : ramp[2];
    };
    return this.paint(mask, [cx - rx, cy - ry, cx + rx, cy + ry], shade, outline);
  }

  /** Polígono con sombreado plano en diagonal (claro arriba-izquierda). */
  poly(pts: [number, number][], ramp: Ramp, outline: string | false = 'K'): this {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const mask: Mask = (px, py) => {
      const x = px + 0.5, y = py + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    };
    const shade = (x: number, y: number) => {
      const s = ((x - minX) / Math.max(1, maxX - minX) + (y - minY) / Math.max(1, maxY - minY)) / 2;
      const n = ramp.length;
      return ramp[Math.min(n - 1, Math.floor(s * n * 0.95))];
    };
    return this.paint(mask, [minX, minY, maxX, maxY], shade, outline);
  }

  /** Rectángulo sombreado plano con borde. */
  box(x: number, y: number, w: number, h: number, ramp: Ramp, outline: string | false = 'K'): this {
    return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], ramp, outline);
  }

  /** Contorno exterior de 1 px alrededor de todo lo dibujado (para siluetas finales). */
  outlineAll(ch = 'K'): this {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.cells[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.get(x + dx, y + dy) !== '.' && this.get(x + dx, y + dy) !== ch))
          add.push([x, y]);
    add.forEach(([x, y]) => (this.cells[y][x] = ch));
    return this;
  }

  mirrorH(): Grid {
    const g = new Grid(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.cells[y][this.w - 1 - x] = this.cells[y][x];
    return g;
  }

  toSprite(): Sprite {
    return this.cells.map((r) => r.join(''));
  }
}

/** PRNG determinista (mulberry32) para variantes de tiles reproducibles. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
