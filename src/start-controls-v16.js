// Minimal start/race compatibility layer loaded before game.js.
// The legacy core listens for Q/P while the public controls are Q/E.

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

  // If the full control module is available, let it own live racing input.
  if (current === 'racing' && window.__NCFA_CONTROL_V9_READY) return;
  if (current === 'idle' || current === 'presentation') return;

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

setInterval(tick, 250);
