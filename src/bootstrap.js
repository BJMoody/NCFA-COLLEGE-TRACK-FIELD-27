const enterButton = document.querySelector('#enter-game');
const bootScreen = document.querySelector('#boot-screen');
const bootStatus = bootScreen?.querySelector('small');

let loading = false;
let ready = false;
let perfPromise = null;

function setStatus(text) {
  if (bootStatus) bootStatus.textContent = text;
}

function primeRendererModule() {
  if (!perfPromise) perfPromise = import('./perf-v10.js');
  return perfPromise;
}

async function loadGame() {
  if (loading || ready) return;
  loading = true;

  enterButton.disabled = true;
  enterButton.textContent = 'LOADING GAME…';
  setStatus('Loading the race engine…');
  document.documentElement.classList.add('ncfa-loading');

  // Give the browser a paint before the heavier modules execute.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    await primeRendererModule();

    setStatus('Building the stadium…');
    await import('./game.js');

    setStatus('Loading broadcast, controls & meet systems…');
    await Promise.all([
      import('./presentation.js'),
      import('./control-v9.js'),
      import('./mobile.js'),
      import('./mobile-boost.js'),
      import('./venue-pacers.js')
    ]);

    ready = true;
    loading = false;
    document.documentElement.classList.remove('ncfa-loading');
    enterButton.disabled = false;
    enterButton.textContent = 'ENTER GAME';
    setStatus('Ready • tap ENTER GAME');

    // game.js attaches the real Enter handler during import. Re-fire the click
    // now that every system is ready; the capture handler below allows it through.
    enterButton.click();
  } catch (error) {
    console.error('NCFA bootstrap failed', error);
    loading = false;
    document.documentElement.classList.remove('ncfa-loading');
    enterButton.disabled = false;
    enterButton.textContent = 'RETRY';
    setStatus('Could not finish loading. Check your connection and retry.');
  }
}

enterButton?.addEventListener('click', (event) => {
  if (ready) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  loadGame();
}, true);

// Start fetching Three.js only after the first paint when the browser is idle.
// This warms the cache without blocking the title screen from appearing.
const warm = () => primeRendererModule().catch(() => {});
if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 1800 });
else setTimeout(warm, 900);
