import '@fontsource/press-start-2p/latin-400.css';
import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { BattleScene } from './scenes/BattleScene';
import { OverworldScene } from './scenes/OverworldScene';
import { PauseScene } from './scenes/PauseScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { audio } from './systems/audio';
import { game as gameState } from './systems/gameState';

// La fuente de menús debe estar lista antes de crear el primer texto de Phaser.
await document.fonts.load('8px "Press Start 2P"').catch(() => undefined);

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
  scene: [PreloadScene, TitleScene, OverworldScene, BattleScene, PauseScene, UIScene],
});

// Los navegadores solo permiten audio tras un gesto del usuario: la primera tecla/clic lo activa.
for (const ev of ['keydown', 'pointerdown'] as const) window.addEventListener(ev, () => audio.unlock());

// Solo en desarrollo: ganchos para depurar y para tools/screenshot.ts.
if (import.meta.env.DEV) Object.assign(window, { __game: game, __state: gameState, __audio: audio });
