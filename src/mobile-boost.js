const touchDevice = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;

if (touchDevice) {
  let loop = null;
  let side = 'KeyQ';

  function raceIsLive() {
    const hud = document.querySelector('#race-hud.screen--active');
    const clock = document.querySelector('#race-clock')?.textContent?.trim();
    const command = document.querySelector('#starter-command')?.textContent?.trim();
    return Boolean(hud && clock && clock !== '0:00.00' && !command);
  }

  function fireStride() {
    const code = side;
    side = side === 'KeyQ' ? 'KeyP' : 'KeyQ';
    const key = code === 'KeyQ' ? 'q' : 'p';
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true, cancelable: true }));
  }

  function startExtra(interval) {
    stopExtra();
    if (!raceIsLive()) return;
    fireStride();
    loop = setInterval(() => {
      if (!raceIsLive()) return stopExtra();
      fireStride();
    }, interval);
  }

  function stopExtra() {
    if (loop) clearInterval(loop);
    loop = null;
  }

  document.addEventListener('pointerdown', (e) => {
    const target = e.target.closest?.('#touch-pace,#touch-push,#touch-kick');
    if (!target || !raceIsLive()) return;
    if (target.id === 'touch-pace') startExtra(215);
    else if (target.id === 'touch-push') startExtra(150);
    else {
      startExtra(112);
      setTimeout(stopExtra, 1150);
    }
  }, true);

  document.addEventListener('pointerup', (e) => {
    if (e.target.closest?.('#touch-pace,#touch-push')) stopExtra();
  }, true);
  document.addEventListener('pointercancel', stopExtra, true);
  addEventListener('blur', stopExtra);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopExtra(); });
}
