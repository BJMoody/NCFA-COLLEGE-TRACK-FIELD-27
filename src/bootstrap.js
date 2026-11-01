const enterButton = document.querySelector('#enter-game');
const bootScreen = document.querySelector('#boot-screen');
const bootStatus = bootScreen?.querySelector('small');

let loading = false;
let ready = false;
let enhancementIndex = 0;
let enhancementPaused = false;

function setStatus(text) {
  if (bootStatus) bootStatus.textContent = text;
}

function showMenuImmediately() {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('screen--active'));
  document.querySelector('#main-menu')?.classList.add('screen--active');
}

function competitionActive() {
  return Boolean(
    document.querySelector('#race-hud.screen--active') ||
    document.querySelector('#field-screen.screen--active') ||
    document.querySelector('#finish-cinematic.screen--active')
  );
}

const enhancementModules = [
  './ui-v11.js',
  './venue-pacers.js',
  './control-v9.js',
  ...(navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches ? ['./mobile.js', './mobile-boost.js'] : []),
  './presentation.js',
  './perf-v10.js'
];

function scheduleEnhancementStep(delay = 0) {
  if (enhancementPaused || enhancementIndex >= enhancementModules.length) return;

  const schedule = () => {
    const run = async () => {
      if (enhancementPaused || enhancementIndex >= enhancementModules.length) return;
      if (competitionActive()) {
        setTimeout(() => scheduleEnhancementStep(0), 900);
        return;
      }

      const path = enhancementModules[enhancementIndex++];
      try {
        await import(path);
      } catch (error) {
        console.warn(`Optional NCFA module failed softly: ${path}`, error);
      }

      // Give the browser a clean frame between module parses/initializers.
      requestAnimationFrame(() => scheduleEnhancementStep(0));
    };

    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1200 });
    else setTimeout(run, 80);
  };

  if (delay) setTimeout(schedule, delay);
  else schedule();
}

function beginEnhancementLoading() {
  enhancementPaused = false;
  scheduleEnhancementStep(120);

  // When the player opens meet setup, prioritize the remaining race modules
  // while they are choosing venue/role instead of waiting for START EVENT.
  document.querySelector('#race-now')?.addEventListener('click', () => scheduleEnhancementStep(0), { passive: true });
}

async function loadGame() {
  if (loading || ready) return;
  loading = true;

  enterButton.disabled = true;
  enterButton.textContent = 'LOADING…';
  setStatus('Loading career menu…');
  document.documentElement.classList.add('ncfa-loading');

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    // One direct core import. No source rewriting, Blob import, stadium build,
    // audio wait, or optional-module fan-out on the menu critical path.
    await import('./game.js');

    ready = true;
    loading = false;
    document.documentElement.classList.remove('ncfa-loading');
    enterButton.disabled = false;
    enterButton.textContent = 'ENTER GAME';
    setStatus('Ready');

    showMenuImmediately();
    beginEnhancementLoading();
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

// Zero game/Three/WebGL work before ENTER GAME, and no stadium module warm-up
// while browsing menus. The stadium is loaded progressively only for a meet.
