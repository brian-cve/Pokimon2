import type Phaser from 'phaser';

export const FONT_KEY = 'pixfont';
const advances = new Map<string, number>();

/** Lee los anchos de glifo del BitmapFont cargado (font.fnt), para medir y ajustar texto sin renderizarlo. */
export function initFontMetrics(cache: Phaser.Cache.CacheManager): void {
  const font = cache.bitmapFont.get(FONT_KEY) as { data: { chars: Record<number, { xAdvance: number }> } };
  advances.clear();
  for (const [code, g] of Object.entries(font.data.chars)) advances.set(String.fromCharCode(Number(code)), g.xAdvance);
}

/** La fuente solo tiene mayúsculas: todo el texto se normaliza. */
export const toFontText = (s: string): string => s.toUpperCase();

export function measure(text: string): number {
  return [...toFontText(text)].reduce((w, c) => w + (advances.get(c) ?? advances.get('?') ?? 6), 0) - 1;
}
