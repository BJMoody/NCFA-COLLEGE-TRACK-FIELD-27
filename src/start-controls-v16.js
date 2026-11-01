// Minimal start-procedure compatibility layer loaded before game.js.
// The legacy core still listens for Q/P while the public controls are Q/E.
// Keep this tiny and always available so START EVENT never depends on optional modules.

let emitting = false;
let phaseStartedAt = performance.now();
let lastPhase = 'idle';
let failSafeUsed = false;

function phase() {
  return window.__NCFA_RACE_PHASE || 'idle';
}

function emit(code, key) {
  emitting = true;
  window.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true, cancelable: true }));
  emitting = false;
}

window.addEventListener('keydown', (event) => {
  if (emitting || event.repeat) return;
  const current = phase();
  if (current === 'racing' || current === 'idle' || current === 'presentation') return;

  if (event.code === 'KeyQ' || event.code === 'KeyE') {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.code === 'KeyQ') emit('KeyQ', 'q');
    else emit('KeyP', 'p');
  }
}, true);

function tick() {
  const current = phase();
  if (current !== lastPhase) {
    lastPhase = current;
    phaseStartedAt = performance.now();
    failSafeUsed = false;
  }

  const elapsed = performance.now() - phaseStartedAt;

  // Give the player a real chance to interact. If the UI/control module failed,
  // advance safely rather than leaving START EVENT stuck forever.
  if (!failSafeUsed && current === 'walk' && elapsed > 12000) {
    failSafeUsed = true;
    let count = 0;
    const step = () => {
      emit(count % 2 === 0 ? 'KeyQ' : 'KeyP', count % 2 === 0 ? 'q' : 'p');
      count += 1;
      if (count < 5) setTimeout(step, 90);
    };
    step();
  }

  if (!failSafeUsed && current === 'ready' && elapsed > 12000) {
    failSafeUsed = true;
    emit('Enter', 'Enter');
  }
}

// Low-frequency watchdog only; no permanent animation-frame loop on menus.
setInterval(tick, 250);
