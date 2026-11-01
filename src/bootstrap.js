const enterButton = document.querySelector('#enter-game');
const bootScreen = document.querySelector('#boot-screen');
const bootStatus = bootScreen?.querySelector('small');

let loading = false;
let ready = false;

function setStatus(text) {
  if (bootStatus) bootStatus.textContent = text;
}

function showMenuImmediately() {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('screen--active'));
  document.querySelector('#main-menu')?.classList.add('screen--active');
}

function loadEnhancementsInBackground() {
  const run = () => {
    Promise.allSettled([
      import('./ui-v11.js'),
      import('./control-v9.js'),
      import('./mobile.js'),
      import('./mobile-boost.js'),
      import('./venue-pacers.js'),
      import('./presentation.js'),
      import('./perf-v10.js'),
      // Warm the stadium module only after the menu is already usable.
      import('./world-fast-v11.js')
    ]).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') console.warn(`Optional NCFA module ${index} failed softly`, result.reason);
      });
    });
  };

  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2500 });
  else setTimeout(run, 350);
}

async function loadGame() {
  if (loading || ready) return;
  loading = true;

  enterButton.disabled = true;
  enterButton.textContent = 'LOADING…';
  setStatus('Loading career menu…');
  document.documentElement.classList.add('ncfa-loading');

  // Paint the loading state before parsing Three.js/game code.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    // Direct module import: no fetch-as-text, source rewriting, Blob module,
    // compatibility double-parse, or stadium construction on the critical path.
    await import('./game.js');

    ready = true;
    loading = false;
    document.documentElement.classList.remove('ncfa-loading');
    enterButton.disabled = false;
    enterButton.textContent = 'ENTER GAME';
    setStatus('Ready');

    // Do NOT re-click the game's Enter handler here. That handler waits for
    // crowd audio before showing the menu. Menu first; meet audio can load later.
    showMenuImmediately();
    loadEnhancementsInBackground();
  } catch (error) {
    console.error('NCFA core load failed', error);
    loading = false;
    document.documentElement.classList.remove('ncfa-loading');
    enterButton.disabled = false;
    enterButton.textContent = 'RETRY';
    setStatus('Load failed • tap RETRY');
  }
}

enterButton?.addEventListener('click', (event) => {
  if (ready) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  loadGame();
}, true);

// Intentionally zero game/Three/WebGL work before ENTER GAME.
