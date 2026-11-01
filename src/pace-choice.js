import { EVENTS } from './data.js';

let bypassNext = false;
let pendingTrigger = null;
let selectedRole = 'race';

function eventFromText(text = '') {
  const names = Object.keys(EVENTS).sort((a, b) => b.length - a.length);
  return names.find((name) => text.includes(name)) || '';
}

function currentEvent() {
  const sources = [
    document.querySelector('#meet-event')?.textContent,
    document.querySelector('#race-event-label')?.textContent,
    document.querySelector('#results-title')?.textContent,
    document.querySelector('#hub-race-line')?.textContent
  ].filter(Boolean);
  for (const text of sources) {
    const ev = eventFromText(text);
    if (ev) return ev;
  }
  return '';
}

function isPaceEligible(ev) {
  const event = EVENTS[ev];
  return event?.kind === 'race' && Number(event.distance || 0) >= 800;
}

function ensureChooser() {
  let overlay = document.querySelector('#pre-race-role-choice');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'pre-race-role-choice';
  overlay.innerHTML = `
    <div class="prc-card" role="dialog" aria-modal="true" aria-labelledby="prc-title">
      <div class="prc-eyebrow">COACH RACE ROLE</div>
      <h2 id="prc-title">What do you want to do?</h2>
      <p class="prc-copy">Choose your role before the meet setup is locked in.</p>
      <div class="prc-options">
        <button data-role="race" class="prc-option selected">
          <strong>RACE NORMALLY</strong>
          <span>You compete for place and time. An AI athlete may or may not be assigned as a pacer.</span>
        </button>
        <button data-role="pace" class="prc-option">
          <strong>ACCEPT PACE JOB</strong>
          <span>Coach gives you a target distance and asks you to control the race before stepping off.</span>
        </button>
      </div>
      <div class="prc-actions">
        <button id="prc-cancel">CANCEL</button>
        <button id="prc-continue">CONTINUE</button>
      </div>
    </div>`;

  const style = document.createElement('style');
  style.textContent = `
    #pre-race-role-choice{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px)}
    #pre-race-role-choice.show{display:flex}
    .prc-card{width:min(620px,94vw);background:#090d12;border:1px solid rgba(255,255,255,.18);box-shadow:0 24px 80px rgba(0,0,0,.55);padding:24px;color:#fff}
    .prc-eyebrow{font:900 12px/1 Arial;letter-spacing:.14em;color:#f1c40f;margin-bottom:8px}
    .prc-card h2{margin:0 0 8px;font:900 34px/1 'Barlow Condensed',Arial,sans-serif}
    .prc-copy{margin:0 0 18px;color:#aeb8c5;font-size:14px}
    .prc-options{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .prc-option{min-height:132px;padding:16px;text-align:left;border:1px solid rgba(255,255,255,.16);background:#111820;color:#fff;cursor:pointer;touch-action:manipulation}
    .prc-option strong{display:block;font:900 21px/1 'Barlow Condensed',Arial,sans-serif;margin-bottom:8px}
    .prc-option span{display:block;color:#aeb8c5;font-size:12px;line-height:1.45}
    .prc-option.selected{border-color:#f1c40f;box-shadow:inset 0 0 0 1px #f1c40f;background:#171a12}
    .prc-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}
    .prc-actions button{min-height:46px;padding:0 18px;border:1px solid rgba(255,255,255,.2);background:#151b22;color:#fff;font-weight:900;cursor:pointer}
    #prc-continue{background:#f1c40f;color:#151208;border-color:#f1c40f}
    @media(max-width:700px){.prc-card{padding:18px}.prc-options{grid-template-columns:1fr}.prc-option{min-height:104px}.prc-actions{display:grid;grid-template-columns:1fr 1fr}.prc-actions button{min-height:54px}}
  `;
  document.head.appendChild(style);
  document.querySelector('#app')?.appendChild(overlay);

  overlay.querySelectorAll('[data-role]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedRole = button.dataset.role;
      overlay.querySelectorAll('[data-role]').forEach((b) => b.classList.toggle('selected', b === button));
    });
  });

  overlay.querySelector('#prc-cancel').addEventListener('click', () => {
    pendingTrigger = null;
    overlay.classList.remove('show');
  });

  overlay.querySelector('#prc-continue').addEventListener('click', () => {
    overlay.classList.remove('show');
    if (!pendingTrigger) return;
    runControlledMeetSetup(pendingTrigger, selectedRole);
    pendingTrigger = null;
  });

  return overlay;
}

function showChooser(trigger) {
  pendingTrigger = trigger;
  selectedRole = 'race';
  const overlay = ensureChooser();
  overlay.querySelectorAll('[data-role]').forEach((b) => b.classList.toggle('selected', b.dataset.role === 'race'));
  overlay.classList.add('show');
}

function withControlledPacerRandom(role, fn) {
  const nativeRandom = Math.random;
  let calls = 0;
  Math.random = () => {
    calls += 1;
    // game.js prepareMeet(): random #1 = heat strength, #2 = daily form,
    // #3 = whether the player receives a pacer assignment.
    if (calls === 3) return role === 'pace' ? 0.01 : 0.99;
    return nativeRandom();
  };
  try {
    fn();
  } finally {
    setTimeout(() => { Math.random = nativeRandom; }, 0);
  }
}

function annotateMeetSetup(role) {
  setTimeout(() => {
    const assignment = document.querySelector('#pace-assignment');
    if (!assignment) return;

    if (role === 'pace') {
      assignment.classList.remove('hidden');
      assignment.dataset.playerChoice = 'pace';
      if (!/PACER|Lead or help control/i.test(assignment.textContent || '')) {
        assignment.innerHTML = '<strong>COACH ASSIGNMENT: PACER</strong><p>You accepted the pace job. Coach will assign your target distance for this race.</p>';
      }
    } else {
      assignment.dataset.playerChoice = 'race';
      assignment.classList.remove('hidden');
      assignment.innerHTML = '<strong>RACE ROLE: COMPETE</strong><p>You declined the pace job. You are racing for place and time. An AI athlete may or may not be assigned to pace the field.</p>';
    }
  }, 0);
}

function runControlledMeetSetup(trigger, role) {
  bypassNext = true;
  withControlledPacerRandom(role, () => trigger.click());
  annotateMeetSetup(role);
}

function interceptMeetEntry(button) {
  if (!button) return;
  button.addEventListener('click', (event) => {
    if (bypassNext) {
      bypassNext = false;
      return;
    }

    const ev = currentEvent();
    if (!isPaceEligible(ev)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    showChooser(button);
  }, true);
}

interceptMeetEntry(document.querySelector('#race-now'));
interceptMeetEntry(document.querySelector('#race-again'));
