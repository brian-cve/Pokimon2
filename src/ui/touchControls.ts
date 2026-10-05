import type { Dir } from '../systems/gridMovement';

/**
 * Mando táctil en pantalla. Las escenas leen el teclado (e.code / keyCode), así que el mando
 * emite esas mismas teclas sobre `window`: movimiento, menús, combate y título funcionan sin cambios.
 */
type Key = { code: string; key: string; keyCode: number };

const KEY: Record<Dir | 'a' | 'b' | 'menu', Key> = {
  up: { code: 'ArrowUp', key: 'ArrowUp', keyCode: 38 },
  down: { code: 'ArrowDown', key: 'ArrowDown', keyCode: 40 },
  left: { code: 'ArrowLeft', key: 'ArrowLeft', keyCode: 37 },
  right: { code: 'ArrowRight', key: 'ArrowRight', keyCode: 39 },
  a: { code: 'KeyZ', key: 'z', keyCode: 90 },
  b: { code: 'KeyX', key: 'x', keyCode: 88 },
  menu: { code: 'Escape', key: 'Escape', keyCode: 27 },
};

/** Radio (px) del centro de la cruceta donde no se registra dirección. */
const DEAD_ZONE = 14;

const CSS = `
#touch { position: fixed; inset: auto 0 0 0; display: flex; justify-content: space-between; align-items: flex-end;
  padding: 0 max(16px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  pointer-events: none; z-index: 10; user-select: none; -webkit-user-select: none; touch-action: none; }
#touch * { touch-action: none; -webkit-tap-highlight-color: transparent; }
#touch .dpad { position: relative; width: 148px; height: 148px; border-radius: 50%; background: rgba(255,255,255,.08);
  border: 2px solid rgba(255,255,255,.22); pointer-events: auto; }
#touch .dpad i { position: absolute; font-style: normal; color: rgba(255,255,255,.55); font: 20px/1 sans-serif;
  width: 44px; height: 44px; display: grid; place-items: center; border-radius: 10px; }
#touch .dpad i.on { background: rgba(255,255,255,.28); color: #fff; }
#touch .dpad .up { left: 52px; top: 6px; } #touch .dpad .down { left: 52px; bottom: 6px; }
#touch .dpad .left { left: 6px; top: 52px; } #touch .dpad .right { right: 6px; top: 52px; }
#touch .btns { position: relative; width: 150px; height: 130px; }
#touch button { position: absolute; width: 62px; height: 62px; border-radius: 50%; pointer-events: auto;
  background: rgba(255,255,255,.12); border: 2px solid rgba(255,255,255,.3); color: rgba(255,255,255,.75);
  font: 18px/1 "Press Start 2P", monospace; padding: 0; }
#touch button.on { background: rgba(255,255,255,.35); color: #fff; }
#touch .a { right: 0; top: 14px; } #touch .b { left: 0; bottom: 0; }
#touch .menu { width: 54px; height: 28px; border-radius: 14px; right: 44px; top: -34px; font-size: 8px; }
/* El juego deja libre una franja para los controles (debajo en vertical, a los lados en horizontal). */
@media (orientation: portrait) { body.touch #game { height: calc(100% - 200px); } }
@media (orientation: landscape) and (max-height: 500px) {
  body.touch #game { width: calc(100% - 320px); margin: 0 auto; }
  #touch .dpad { width: 124px; height: 124px; } #touch .dpad i { width: 36px; height: 36px; }
  #touch .dpad .up { left: 42px; top: 4px; } #touch .dpad .down { left: 42px; bottom: 4px; }
  #touch .dpad .left { left: 4px; top: 42px; } #touch .dpad .right { right: 4px; top: 42px; }
  #touch .btns { width: 130px; height: 112px; } #touch button { width: 52px; height: 52px; }
}
`;

function send(type: 'keydown' | 'keyup', k: Key): void {
  const e = new KeyboardEvent(type, { code: k.code, key: k.key, bubbles: true, cancelable: true });
  // Phaser identifica la tecla por keyCode, que no todos los navegadores aceptan en el constructor.
  for (const prop of ['keyCode', 'which'] as const) {
    if (e[prop] !== k.keyCode) Object.defineProperty(e, prop, { get: () => k.keyCode });
  }
  window.dispatchEvent(e);
}

/** Captura el puntero para seguir el gesto fuera del elemento; si el navegador no puede, el gesto sigue sin captura. */
function capture(el: HTMLElement, id: number): void {
  try { el.setPointerCapture(id); } catch { /* puntero ya liberado */ }
}

/** Mantiene una tecla pulsada mientras dure el gesto; `set(null)` la suelta. */
function holder(): (k: Key | null, el?: HTMLElement) => void {
  let cur: Key | null = null;
  let curEl: HTMLElement | undefined;
  return (k, el) => {
    if (k === cur) return;
    if (cur) { send('keyup', cur); curEl?.classList.remove('on'); }
    cur = k;
    curEl = el;
    if (cur) { send('keydown', cur); curEl?.classList.add('on'); }
  };
}

/** ¿Hay pantalla táctil principal? `?touch=1` / `?touch=0` fuerzan mostrarlo / ocultarlo (pruebas). */
function wantsTouch(): boolean {
  const q = new URLSearchParams(location.search).get('touch');
  if (q !== null) return q !== '0';
  return window.matchMedia('(pointer: coarse)').matches;
}

export function setupTouchControls(): void {
  if (!wantsTouch()) return;

  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div class="dpad"><i class="up">▲</i><i class="down">▼</i><i class="left">◀</i><i class="right">▶</i></div>
    <div class="btns">
      <button class="menu" data-k="menu">MENÚ</button>
      <button class="b" data-k="b">B</button>
      <button class="a" data-k="a">A</button>
    </div>`;
  document.body.appendChild(root);
  document.body.classList.add('touch');

  // Cruceta: una sola zona; la dirección sale de dónde esté el dedo, así se puede deslizar sin levantarlo.
  const pad = root.querySelector<HTMLElement>('.dpad')!;
  const arrows = Object.fromEntries((['up', 'down', 'left', 'right'] as Dir[]).map((d) => [d, pad.querySelector<HTMLElement>(`.${d}`)!])) as Record<Dir, HTMLElement>;
  const padHold = holder();
  const aim = (e: PointerEvent): void => {
    const r = pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.max(Math.abs(dx), Math.abs(dy)) < DEAD_ZONE) return padHold(null);
    const d: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    padHold(KEY[d], arrows[d]);
  };
  pad.addEventListener('pointerdown', (e) => { capture(pad, e.pointerId); aim(e); e.preventDefault(); });
  pad.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') aim(e); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) pad.addEventListener(ev, () => padHold(null));

  // Botones A / B / MENÚ: una pulsación = tecla mantenida mientras el dedo esté encima.
  for (const btn of root.querySelectorAll<HTMLButtonElement>('button')) {
    const hold = holder();
    const k = KEY[btn.dataset.k as 'a' | 'b' | 'menu'];
    btn.addEventListener('pointerdown', (e) => { capture(btn, e.pointerId); hold(k, btn); e.preventDefault(); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) btn.addEventListener(ev, () => hold(null));
  }

  // Sin zoom por doble toque, sin menú contextual al mantener pulsado.
  root.addEventListener('contextmenu', (e) => e.preventDefault());
}
