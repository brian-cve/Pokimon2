/** Mapas del juego: id → archivo `public/assets/maps/<id>.json` (generado por `npm run assets`). */
export const MAP_IDS = ['town', 'route'] as const;
export type MapId = (typeof MAP_IDS)[number];
export const mapKey = (id: string): string => `map_${id}`;
