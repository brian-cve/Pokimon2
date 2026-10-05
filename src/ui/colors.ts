import { PALETTE } from '../../art/palette';

/** La paleta de arte como enteros 0xRRGGBB, para tintes de Phaser (única fuente de verdad: art/palette.ts). */
export const COLOR = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [k, parseInt(v.slice(1), 16)]),
) as Record<keyof typeof PALETTE, number>;
