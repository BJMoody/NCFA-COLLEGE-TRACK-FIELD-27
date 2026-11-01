const enterButton = document.querySelector('#enter-game');
const bootScreen = document.querySelector('#boot-screen');
const bootStatus = bootScreen?.querySelector('small');

let loading = false;
let ready = false;
let enhancementIndex = 0;
let enhancementsStarted = false;
let criticalStartAttempted = false;
let preparingCriticalStart = false;
window.__NCFA_CONTROL_V9_READY = false;
window.__NCFA_PRERACE_V21_READY = false;

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

function reportRuntimeIssue(title, detail) {
  let panel = document.querySelector('#ncfa-runtime-error');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'ncfa-runtime-error';
    panel.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;padding:14px 16px;background:#210b0b;border:2px solid #ff5757;color:#fff;font:800 13px/1.35 Arial;white-space:pre-wrap;box-shadow:0 12px 40px rgba(0,0,0,.5)';
    document.body.appendChild(panel);
  }
  panel.textContent = `${title}\n${String(detail || 'Unknown error').slice(0, 1000)}`;
}

window.addEventListener('error', (event) => {
  reportRuntimeIssue('NCFA RUNTIME ERROR', event.error?.stack || event.message || 'Unknown window error');
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  reportRuntimeIssue('NCFA UNHANDLED PROMISE', reason?.stack || reason?.message || String(reason));
});

const enhancementModules = [
  './control-v9.js',
  './venue-pacers.js',
  ...(navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches ? ['./mobile.js', './mobile-boost.js'] : []),
  './ui-v11.js'
];

async function loadEnhancement(path) {
  try {
    await import(path);
    if (path === './control-v9.js') window.__NCFA_CONTROL_V9_READY = true;
    return true;
  } catch (error) {
    console.warn(`Optional NCFA module failed softly: ${path}`, error);
    return false;
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

async function beginRaceEnhancements() {
  if (enhancementsStarted) return;
  enhancementsStarted = true;
  await loadEnhancement('./control-v9.js');
  enhancementIndex = 1;
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

function installStartDiagnostics() {
  const button = document.querySelector('#start-meet');
  if (!button) return;

  button.addEventListener('click', async (event) => {
    if (!criticalStartAttempted && !window.__NCFA_CONTROL_V9_READY) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (preparingCriticalStart) return;
      preparingCriticalStart = true;
      criticalStartAttempted = true;
      const oldText = button.textContent;
      button.disabled = true;
      button.textContent = 'PREPARING CONTROLS…';
      await loadEnhancement('./control-v9.js');
      button.disabled = false;
      button.textContent = oldText || 'START EVENT';
      preparingCriticalStart = false;
      setTimeout(() => button.click(), 0);
      return;
    }

    criticalStartAttempted = true;
    document.querySelector('#ncfa-runtime-error')?.remove();
    button.textContent = 'STARTING EVENT…';
    setTimeout(() => {
      const stillSetup = document.querySelector('#meet-setup.screen--active');
      if (!stillSetup) return;
      reportRuntimeIssue(
        'START EVENT STALLED',
        `phase=${window.__NCFA_RACE_PHASE || 'unknown'} | controls=${window.__NCFA_CONTROL_V9_READY ? 'ready' : 'fallback'} | prerace=${window.__NCFA_PRERACE_V21_READY ? 'ready' : 'missing'} | main thread is responsive`
      );
    }, 3000);
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
    await import('./perf-v10.js');
    await import('./prerace-v21.js');
    window.__NCFA_PRERACE_V21_READY = true;
    await import('./audio-safety-v17.js');
    await import('./start-controls-v17.js');
    await import('./game.js');
    await import('./pace-choice.js');

    ready = true;
    loading = false;
    document.documentElement.classList.remove('ncfa-loading');
    enterButton.disabled = false;
    enterButton.textContent = 'ENTER GAME';
    setStatus('Ready');

    showMenuImmediately();
    installMeetSetupTrigger();
    installStartDiagnostics();
  } catch (error) {
    console.error('NCFA core load failed', error);
    reportRuntimeIssue('NCFA CORE LOAD FAILED', error?.stack || error?.message || String(error));
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

// START EVENT remains owned by the core game. v21 owns the prerace broadcast.
