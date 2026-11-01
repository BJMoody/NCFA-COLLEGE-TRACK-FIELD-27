const enterButton = document.querySelector('#enter-game');
const bootScreen = document.querySelector('#boot-screen');
const bootStatus = bootScreen?.querySelector('small');

let loading = false;
let ready = false;
let perfPromise = null;
let uiPromise = null;

function installMockupSkin() {
  if (!document.querySelector('link[data-ncfa-v11]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './mockup-v11.css';
    link.dataset.ncfaV11 = '1';
    document.head.appendChild(link);
  }
  if (!uiPromise) uiPromise = import('./ui-v11.js').catch((error) => console.warn('NCFA UI skin failed softly', error));
  return uiPromise;
}

installMockupSkin();

function setStatus(text) {
  if (bootStatus) bootStatus.textContent = text;
  window.NCFA_UI_V11?.setLoading?.(text);
}

function primeRendererModule() {
  if (!perfPromise) perfPromise = import('./perf-v10.js');
  return perfPromise;
}

function absolute(path) {
  return new URL(path, import.meta.url).href;
}

async function importFastCoreGame() {
  const gameUrl = absolute('./game.js');
  const response = await fetch(gameUrl, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not fetch game.js (${response.status})`);

  let source = await response.text();
  const imports = new Map([
    ["'./data.js'", `'${absolute('./data.js')}'`],
    ["'./athlete.js'", `'${absolute('./athlete.js')}'`],
    ["'./world.js'", `'${absolute('./world-fast-v11.js')}'`],
    ["'./audio.js'", `'${absolute('./audio.js')}'`],
    ["'./commentary.js'", `'${absolute('./commentary.js')}'`]
  ]);
  for (const [from, to] of imports) source = source.split(from).join(to);

  // Do not build a full stadium while the title/menu/career screens are loading.
  // The real 3D world is created only when startRace/startField calls loadWorld().
  source = source.replace('\nloadWorld(venue);\n\nfunction renderCareers()', '\n\nfunction renderCareers()');
  source = source.replace(
    "if (state.venueId) venue = VENUES.find((v) => v.id === state.venueId) || venue;\n    loadWorld(venue);",
    "if (state.venueId) venue = VENUES.find((v) => v.id === state.venueId) || venue;"
  );
  source = source.replace(
    "$('#return-hub').addEventListener('click', () => { cleanupCompetition(); venue = randomVenue(); loadWorld(venue); renderHub(); setMode('hub', 'career-hub'); });",
    "$('#return-hub').addEventListener('click', () => { cleanupCompetition(); venue = randomVenue(); renderHub(); setMode('hub', 'career-hub'); });"
  );
  source = source.split('world.update(elapsed);').join('world?.update(elapsed);');
  source = source.replace(
    "world.setCrowdReaction('idle');\n  window.__NCFA_RACE_PHASE = 'idle';",
    "world?.setCrowdReaction('idle');\n  if (world) { world.dispose(); world = null; }\n  window.__NCFA_RACE_PHASE = 'idle';"
  );

  const blob = new Blob([source, '\n//# sourceURL=ncfa-game-v11.js'], { type: 'text/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    await import(blobUrl);
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
  }
}

async function loadGame() {
  if (loading || ready) return;
  loading = true;

  enterButton.disabled = true;
  enterButton.textContent = 'LOADING GAME…';
  setStatus('Preparing the race engine…');
  document.documentElement.classList.add('ncfa-loading');
  window.NCFA_UI_V11?.showLoading?.('Preparing the race engine…');

  // Guarantee the loading screen gets a paint before module parsing / WebGL work.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    await Promise.allSettled([installMockupSkin(), primeRendererModule()]);

    setStatus('Loading career and race systems…');
    try {
      await importFastCoreGame();
    } catch (fastError) {
      console.warn('Fast loader failed; using compatibility core.', fastError);
      setStatus('Using compatibility loader…');
      await import('./game.js');
    }

    setStatus('Loading broadcast and controls…');
    const extras = await Promise.allSettled([
      import('./presentation.js'),
      import('./control-v9.js'),
      import('./mobile.js'),
      import('./mobile-boost.js'),
      import('./venue-pacers.js')
    ]);
    extras.forEach((result, index) => {
      if (result.status === 'rejected') console.warn(`Optional NCFA module ${index} failed softly`, result.reason);
    });

    ready = true;
    loading = false;
    document.documentElement.classList.remove('ncfa-loading');
    enterButton.disabled = false;
    enterButton.textContent = 'ENTER GAME';
    setStatus('Ready');
    window.NCFA_UI_V11?.hideLoading?.();

    // game.js installs the real Enter handler during import.
    enterButton.click();
  } catch (error) {
    console.error('NCFA bootstrap failed', error);
    loading = false;
    document.documentElement.classList.remove('ncfa-loading');
    window.NCFA_UI_V11?.hideLoading?.();
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

// Warm only the renderer after first paint. The stadium itself is deliberately
// not constructed until an event actually begins.
const warm = () => primeRendererModule().catch(() => {});
if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 2200 });
else setTimeout(warm, 1100);
