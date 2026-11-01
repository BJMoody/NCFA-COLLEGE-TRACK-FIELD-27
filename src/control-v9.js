import { EVENTS } from './data.js';

const touchDevice = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
let floatMode = false;
let emitting = false;
let physicalLastSide = null;
let physicalTaps = [];
let driveUntil = 0;
let outputSide = 'q';
let outputTimer = null;
let lastOutputAt = 0;

function racePhase() {
  return window.__NCFA_RACE_PHASE || 'idle';
}

function eventName() {
  return document.querySelector('#race-event-label')?.textContent?.trim() || '800m';
}

function targetCadence() {
  return EVENTS[eventName()]?.cadence || 3.85;
}

function physicalRate() {
  const now = performance.now();
  physicalTaps = physicalTaps.filter((t) => now - t <= 900);
  if (physicalTaps.length < 2) return targetCadence() * 0.92;
  const span = (physicalTaps.at(-1) - physicalTaps[0]) / 1000;
  return span > 0 ? (physicalTaps.length - 1) / span : targetCadence();
}

function dispatchLegacy(side) {
  emitting = true;
  const code = side === 'q' ? 'KeyQ' : 'KeyP';
  const key = side === 'q' ? 'q' : 'p';
  window.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true, cancelable: true }));
  emitting = false;
}

function directMap(side) {
  dispatchLegacy(side === 'q' ? 'q' : 'p');
}

function desiredOutputRate() {
  const base = targetCadence();
  if (floatMode) return base * 0.80;
  const requested = physicalRate();
  return Math.max(base * 0.56, Math.min(requested, base * 1.16));
}

function outputLoop() {
  outputTimer = null;
  if (racePhase() !== 'racing') return;
  const now = performance.now();
  const active = floatMode || now < driveUntil;
  if (!active) return;

  const rate = desiredOutputRate();
  const interval = 1000 / Math.max(2.1, rate);
  if (now - lastOutputAt >= interval - 3) {
    dispatchLegacy(outputSide);
    outputSide = outputSide === 'q' ? 'p' : 'q';
    lastOutputAt = now;
  }
  outputTimer = setTimeout(outputLoop, Math.max(8, interval * 0.22));
}

function ensureOutputLoop() {
  if (!outputTimer) outputLoop();
}

function registerPhysicalTap(side) {
  if (side === physicalLastSide) return;
  physicalLastSide = side;
  const now = performance.now();
  physicalTaps.push(now);
  physicalTaps = physicalTaps.filter((t) => now - t <= 900);
  driveUntil = now + 230;
  ensureOutputLoop();
}

function setFloat(next) {
  floatMode = next;
  document.documentElement.classList.toggle('ncfa-float-active', floatMode);
  const indicator = document.querySelector('#float-indicator');
  if (indicator) indicator.classList.toggle('show', floatMode);
  if (floatMode) {
    driveUntil = performance.now() + 260;
    ensureOutputLoop();
    navigator.vibrate?.(7);
  }
}

window.addEventListener('keydown', (event) => {
  if (emitting) return;

  if (event.code === 'KeyF') {
    if (!event.repeat) setFloat(true);
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  if (event.code !== 'KeyQ' && event.code !== 'KeyE') return;
  if (event.repeat) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  const side = event.code === 'KeyQ' ? 'q' : 'e';
  event.preventDefault();
  event.stopImmediatePropagation();

  if (racePhase() === 'racing') registerPhysicalTap(side);
  else directMap(side === 'q' ? 'q' : 'p');
}, true);

window.addEventListener('keyup', (event) => {
  if (event.code === 'KeyF') {
    setFloat(false);
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

window.addEventListener('keydown', (event) => {
  if (!touchDevice || !floatMode || emitting) return;
  if (event.code === 'KeyQ' || event.code === 'KeyP') {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

function patchLabels() {
  const guide = document.querySelector('.tap-guide strong');
  if (guide && guide.textContent !== 'ALTERNATE Q / E') guide.textContent = 'ALTERNATE Q / E';
  const copy = document.querySelector('.tap-guide span');
  const copyText = 'Faster Q / E rhythm = more drive. Hold F to FLOAT and settle without shutting down.';
  if (copy && copy.textContent !== copyText) copy.textContent = copyText;
  const eLight = document.querySelector('#p-light');
  if (eLight && eLight.textContent !== 'E') eLight.textContent = 'E';

  if (!document.querySelector('#float-indicator')) {
    const indicator = document.createElement('div');
    indicator.id = 'float-indicator';
    indicator.textContent = 'FLOAT — SETTLED RHYTHM';
    document.querySelector('#race-hud')?.appendChild(indicator);
  }
}

function patchTouchFloat() {
  if (!touchDevice) return true;
  const row = document.querySelector('#touch-race-controls .touch-stride-row');
  if (!row) return false;
  if (document.querySelector('#touch-float')) return true;

  const button = document.createElement('button');
  button.id = 'touch-float';
  button.className = 'touch-kick touch-float';
  button.innerHTML = '<small>HOLD</small><strong>FLOAT</strong><span>Settle + recover</span>';
  const start = (event) => { event.preventDefault(); button.classList.add('pressed'); setFloat(true); };
  const end = (event) => { event.preventDefault(); button.classList.remove('pressed'); setFloat(false); };
  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', end);
  button.addEventListener('pointercancel', end);
  button.addEventListener('lostpointercapture', end);
  row.insertBefore(button, row.children[1] || null);
  return true;
}

const style = document.createElement('style');
style.textContent = `
  #float-indicator{position:absolute;left:50%;top:116px;transform:translateX(-50%) translateY(-8px);z-index:30;padding:7px 12px;border:1px solid rgba(111,220,255,.5);background:rgba(5,18,26,.88);color:#aeeaff;font:900 12px/1 Arial;letter-spacing:.08em;opacity:0;transition:.15s;pointer-events:none}
  #float-indicator.show{opacity:1;transform:translateX(-50%) translateY(0)}
  .touch-float{background:#153041!important;border-color:#55c9ef!important;color:#d9f7ff!important}
  .touch-float strong{font-size:18px!important}
  @media(max-width:700px){#float-indicator{top:88px}.touch-stride-row{grid-template-columns:1fr .72fr .72fr 1fr!important}}
`;
document.head.appendChild(style);

// One-time setup only. The old full-document MutationObserver rewrote the DOM
// from inside its own callback, causing a feedback loop and browser stalls.
patchLabels();

// Mobile controls are created by a later optional module, so retry only for a
// short bounded window instead of polling forever.
if (touchDevice && !patchTouchFloat()) {
  let attempts = 0;
  const retry = setInterval(() => {
    attempts += 1;
    if (patchTouchFloat() || attempts >= 24) clearInterval(retry);
  }, 250);
}

window.__NCFA_CONTROL_READY = true;
