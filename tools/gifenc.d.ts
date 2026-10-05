declare module 'gifenc' {
  export type Palette = number[][];
  export interface FrameOpts { palette?: Palette; delay?: number; transparent?: boolean; transparentIndex?: number; dispose?: number; repeat?: number }
  export function GIFEncoder(): { writeFrame(index: Uint8Array, w: number, h: number, o?: FrameOpts): void; finish(): void; bytes(): Uint8Array };
  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, o?: { format?: string }): Palette;
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: string): Uint8Array;
  const gifenc: { GIFEncoder: typeof GIFEncoder; quantize: typeof quantize; applyPalette: typeof applyPalette };
  export default gifenc;
}
