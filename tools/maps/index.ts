import type { MapData } from './types';
import { TOWN } from './town';
import { ROUTE } from './route';

export const MAPS: Record<string, MapData> = { town: TOWN, route: ROUTE };
