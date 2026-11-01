const enterButton = document.querySelector('#enter-game');
const bootScreen = document.querySelector('#boot-screen');
const bootStatus = bootScreen?.querySelector('small');

let loading = false;
let ready = false;
let enhancementIndex = 0;
let enhancementsStarted = false;
let raceControlsReady = false;
let startingEvent = false;

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
  './control-v9.js',
  './venue-pacers.js',
  ...(navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches ? ['./mobile.js', './mobile-boost.js'] : []),
  './presentation.js',
  './ui-v11.js'
];

async function loadEnhancement(path) {
  try {
    await import(path);
    if (path === './control-v9.js') raceControlsReady = true;
  } catch (error) {
    console.warn(`Optional NCFA module failed softly: ${path}`, error);
  }
}

function scheduleEnhancementStep(delay = 0) {
  if (!enhancementsStarted || enhancementIndex >= enhancementModules.length) return;

  const schedule = () => {
    const run = async () => {
      if (!enhancementsStarted || enhancementIndex >= enhancementModules.length) return;
      if (competitionActive()) return;

      const path = enhancementModules[enhancementIndex++];
      await loadEnhancement(path);

      requestAnimationFrame(() => requestAnimationFrame(() => scheduleEnhancementStep(0)));
    };

    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 900 });
    else setTimeout(run, 120);
  };

  if (delay) setTimeout(schedule, delay);
  else schedule();
}

function beginRaceEnhancements() {
  if (enhancementsStarted) return;
  enhancementsStarted = true;
  scheduleEnhancementStep(0);
}

function installMeetSetupTrigger() {
  const meetSetup = document.querySelector('#meet-setup');
  if (!meetSetup) return;

  const check = () => {
    if (meetSetup.classList.contains('screen--active')) beginRaceEnhancements();
  };

  const observer = new MutationObserver(check);
  observer.observe(meetSetup, { attributes: true, attributeFilter: ['class'] });
  check();
}

function installStartEventGuard() {
  const button = document.querySelector('#start-meet');
  if (!button) return;

  button.addEventListener('click', async (event) => {
    if (startingEvent || raceControlsReady) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    startingEvent = true;
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'PREPARING EVENT…';

    // Q/E race controls are critical, not optional. Guarantee them before the
    // core START EVENT handler is allowed to run.
    await loadEnhancement('./control-v9.js');

    button.disabled = false;
    button.textContent = oldText || 'START EVENT';
    startingEvent = false;

    // Re-enter after this capture handler has released the original click.
    setTimeout(() => button.click(), 0);
  }, true);
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
    // These guards must exist before game.js creates renderer/audio/start state.
    await import('./perf-v10.js');
    await import('./audio-safety-v16.js');
    await import('./start-controls-v16.js');
    await import('./game.js');

    ready = true;
    loading = false;
    document.documentElement.classList.remove('ncfa-loading');
    enterButton.disabled = false;
    enterButton.textContent = 'ENTER GAME';
    setStatus('Ready');

    showMenuImmediately();
    installMeetSetupTrigger();
    installStartEventGuard();
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

// Zero Three/WebGL work before ENTER. Setup screens remain HTML-only. START EVENT
// now has hard guards against stalled audio and missing Q/E control modules.
