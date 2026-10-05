import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { OverworldScene } from './scenes/OverworldScene';
import { BattleScene } from './scenes/BattleScene';
import { UIScene } from './scenes/UIScene';
import { audio } from './systems/audio';
import { game as gameState } from './systems/gameState';

export const GAME_W = 240;
export const GAME_H = 160;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  backgroundColor: '#14101f',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, zoom: Phaser.Scale.MAX_ZOOM },
  scene: [BootScene, OverworldScene, BattleScene, UIScene],
});

// Solo en desarrollo: permite que tools/screenshot.ts consulte el estado del juego.
// Los navegadores solo permiten audio tras un gesto del usuario: la primera tecla/clic lo activa.
for (const ev of ['keydown', 'pointerdown'] as const) window.addEventListener(ev, () => audio.unlock());

if (import.meta.env.DEV) Object.assign(window, { __game: game, __state: gameState, __audio: audio });
