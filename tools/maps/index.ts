import type { MapData } from './types';
import { TOWN } from './town';
import { ROUTE } from './route';
import { HOUSE } from './house';

export const MAPS: Record<string, MapData> = { town: TOWN, route: ROUTE, house: HOUSE };
