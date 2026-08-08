import { Game } from './main.js';
import { TouchControls } from './touch-controls.js';

function isMobileDevice() {
  return matchMedia('(pointer: coarse)').matches
    || /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (window.innerWidth <= 900 && 'ontouchstart' in window);
}

const mobile = isMobileDevice();

if (mobile) {
  document.documentElement.dataset.mobile = 'true';
  document.body.classList.add('mobile-mode');

  let game;
  const touch = new TouchControls(document.getElementById('controls'), {
    onDragonfly: () => game?.useDragonfly(),
  });
  game = new Game({ mobile: true, touchControls: touch });
} else {
  new Game();
}
