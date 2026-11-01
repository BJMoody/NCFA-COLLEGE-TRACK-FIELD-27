const touchDevice = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
const tabletLike = touchDevice && Math.min(innerWidth, innerHeight) >= 600;

if (touchDevice) {
  document.documentElement.classList.add('touch-ui');
  if (tabletLike) document.documentElement.classList.add('tablet-ui');
  else document.documentElement.classList.add('phone-ui');

  const eventCadence = {
    '100m': 4.65,
    '200m': 4.55,
    '400m': 4.25,
    '800m': 3.85,
    '1500m': 3.70,
    '3000m': 3.60,
    '5000m': 3.50,
    '10000m': 3.42
  };

  let heldMode = null;
  let cadenceLoop = null;
  let syntheticSide = 'q';
  let rememberedStart = '';
  let autoLane = true;
  let autoLaneDone = false;
  let lastHaptic = 0;

  const keyInfo = {
    q: ['KeyQ', 'q'],
    p: ['KeyP', 'p'],
    in: ['KeyD', 'd'],
    out: ['KeyA', 'a'],
    surge: ['Space', ' ']
  };

  function fireKey(name, duration = 18) {
    const [code, key] = keyInfo[name];
    if (!code) return;
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true, cancelable: true })), duration);
  }

  function eventName() {
    return document.querySelector('#race-event-label')?.textContent?.trim() || '800m';
  }

  function assistRate(mode) {
    const base = eventCadence[eventName()] || 3.85;
    if (mode === 'kick') return base * 1.14;
    if (mode === 'push') return base * 1.055;
    if (mode === 'pace') return base * 0.91;
    if (mode === 'field-power') return 4.65;
    if (mode === 'field-rhythm') return 4.0;
    return 0;
  }

  function pulse() {
    if (!heldMode) {
      cadenceLoop = null;
      return;
    }
    const raceActive = document.querySelector('#race-hud.screen--active');
    const fieldActive = document.querySelector('#field-screen.screen--active');
    if (!raceActive && !fieldActive) {
      heldMode = null;
      cadenceLoop = null;
      return;
    }
    fireKey(syntheticSide);
    syntheticSide = syntheticSide === 'q' ? 'p' : 'q';
    const rate = Math.max(2.5, assistRate(heldMode));
    cadenceLoop = setTimeout(pulse, 1000 / rate);
  }

  function startAssist(mode) {
    heldMode = mode;
    if (!cadenceLoop) pulse();
    const now = performance.now();
    if (navigator.vibrate && now - lastHaptic > 120) {
      navigator.vibrate(8);
      lastHaptic = now;
    }
  }

  function stopAssist(mode) {
    if (!mode || heldMode === mode) heldMode = null;
  }

  function holdKey(name, ms = 380) {
    const [code, key] = keyInfo[name];
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true, cancelable: true })), ms);
    navigator.vibrate?.(10);
  }

  function bindHold(button, mode) {
    const start = (e) => {
      e.preventDefault();
      button.setPointerCapture?.(e.pointerId);
      button.classList.add('pressed');
      startAssist(mode);
    };
    const end = (e) => {
      e.preventDefault();
      button.classList.remove('pressed');
      stopAssist(mode);
    };
    button.addEventListener('pointerdown', start);
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
    button.addEventListener('lostpointercapture', end);
  }

  function makeRaceControls() {
    const hud = document.querySelector('#race-hud');
    if (!hud || document.querySelector('#touch-race-controls')) return;
    const controls = document.createElement('div');
    controls.id = 'touch-race-controls';
    controls.className = 'touch-race-controls';
    controls.innerHTML = `
      <div class="touch-utility-row">
        <button id="touch-out" class="touch-small">↖ <span>OUT</span></button>
        <button id="touch-auto-lane" class="touch-small active"><span>AUTO LANE</span><b>ON</b></button>
        <button id="touch-science" class="touch-small"><span>SCIENCE</span><b>SHOW</b></button>
        <button id="touch-in" class="touch-small"><span>IN</span> ↗</button>
      </div>
      <div class="touch-stride-row">
        <button id="touch-pace" class="touch-stride"><small>HOLD</small><strong>PACE</strong><span>Sustainable rhythm</span></button>
        <button id="touch-kick" class="touch-kick"><strong>KICK</strong><span>1.2s</span></button>
        <button id="touch-push" class="touch-stride push"><small>HOLD</small><strong>PUSH</strong><span>Race / close gaps</span></button>
      </div>`;
    hud.appendChild(controls);

    bindHold(controls.querySelector('#touch-pace'), 'pace');
    bindHold(controls.querySelector('#touch-push'), 'push');

    controls.querySelector('#touch-kick').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      fireKey('surge', 40);
      startAssist('kick');
      e.currentTarget.classList.add('pressed');
      setTimeout(() => {
        stopAssist('kick');
        e.currentTarget.classList.remove('pressed');
      }, 1200);
      navigator.vibrate?.([12, 20, 12]);
    });

    controls.querySelector('#touch-out').addEventListener('pointerdown', (e) => { e.preventDefault(); holdKey('out', 420); });
    controls.querySelector('#touch-in').addEventListener('pointerdown', (e) => { e.preventDefault(); holdKey('in', 420); });

    controls.querySelector('#touch-auto-lane').addEventListener('click', (e) => {
      autoLane = !autoLane;
      e.currentTarget.classList.toggle('active', autoLane);
      e.currentTarget.querySelector('b').textContent = autoLane ? 'ON' : 'OFF';
    });

    controls.querySelector('#touch-science').addEventListener('click', (e) => {
      document.documentElement.classList.toggle('touch-science-open');
      const open = document.documentElement.classList.contains('touch-science-open');
      e.currentTarget.querySelector('b').textContent = open ? 'HIDE' : 'SHOW';
      e.currentTarget.classList.toggle('active', open);
    });
  }

  function makeFieldControls() {
    const screen = document.querySelector('#field-screen');
    if (!screen || document.querySelector('#touch-field-controls')) return;
    const controls = document.createElement('div');
    controls.id = 'touch-field-controls';
    controls.className = 'touch-field-controls';
    controls.innerHTML = `
      <button id="touch-field-rhythm" class="touch-stride"><small>HOLD</small><strong>RHYTHM</strong></button>
      <button id="touch-field-action" class="touch-field-action"><strong>ACTION</strong><span>Takeoff / release</span></button>
      <button id="touch-field-power" class="touch-stride push"><small>HOLD</small><strong>POWER</strong></button>`;
    screen.appendChild(controls);
    bindHold(controls.querySelector('#touch-field-rhythm'), 'field-rhythm');
    bindHold(controls.querySelector('#touch-field-power'), 'field-power');
    controls.querySelector('#touch-field-action').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      fireKey('surge', 35);
      navigator.vibrate?.(15);
    });
  }

  function parseDistance() {
    const text = document.querySelector('#distance-readout')?.textContent || '';
    const match = text.match(/(\d+(?:\.\d+)?)\s*\//);
    return match ? Number(match[1]) : 0;
  }

  function rememberStartType() {
    const detail = document.querySelector('#starter-detail')?.textContent || '';
    if (/one-turn/i.test(detail)) rememberedStart = 'one-turn';
    else if (/waterfall/i.test(detail)) rememberedStart = 'waterfall';
    else if (/stagger|lane/i.test(detail)) rememberedStart = 'lanes';
  }

  function mobileRaceAssist() {
    rememberStartType();
    const raceActive = Boolean(document.querySelector('#race-hud.screen--active'));
    if (!raceActive) {
      autoLaneDone = false;
      rememberedStart = '';
      stopAssist();
      return;
    }

    if (autoLane && !autoLaneDone && rememberedStart === 'one-turn' && parseDistance() >= 108) {
      autoLaneDone = true;
      holdKey('in', 1900);
      const autoButton = document.querySelector('#touch-auto-lane');
      if (autoButton) {
        autoButton.classList.add('completed');
        autoButton.querySelector('b').textContent = 'CUT IN';
        setTimeout(() => {
          autoButton.classList.remove('completed');
          autoButton.querySelector('b').textContent = autoLane ? 'ON' : 'OFF';
        }, 1600);
      }
    }
  }

  function updateOrientationHint() {
    let hint = document.querySelector('#touch-orientation-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'touch-orientation-hint';
      hint.className = 'touch-orientation-hint';
      hint.textContent = 'Rotate to landscape for the best race view';
      document.querySelector('#app')?.appendChild(hint);
    }
    const portraitPhone = innerHeight > innerWidth && Math.min(innerWidth, innerHeight) < 600;
    hint.classList.toggle('show', portraitPhone && Boolean(document.querySelector('#race-hud.screen--active')));
  }

  makeRaceControls();
  makeFieldControls();

  document.querySelector('#mobile-controls')?.setAttribute('aria-hidden', 'true');
  document.querySelector('#field-mobile')?.setAttribute('aria-hidden', 'true');

  setInterval(() => {
    mobileRaceAssist();
    updateOrientationHint();
  }, 120);

  addEventListener('resize', () => {
    document.documentElement.classList.toggle('tablet-ui', Math.min(innerWidth, innerHeight) >= 600);
    document.documentElement.classList.toggle('phone-ui', Math.min(innerWidth, innerHeight) < 600);
    updateOrientationHint();
  });

  addEventListener('blur', () => stopAssist());
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAssist(); });
}
