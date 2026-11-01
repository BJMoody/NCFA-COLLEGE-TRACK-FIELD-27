const $ = (s) => document.querySelector(s);

function addLoader() {
  if ($('#ncfa-v11-loader')) return;
  const loader = document.createElement('div');
  loader.id = 'ncfa-v11-loader';
  loader.innerHTML = `
    <div class="v11-load-card">
      <div class="eyebrow">NCFA COLLEGE TRACK & FIELD 27</div>
      <h2>LOADING MEET DAY</h2>
      <p id="ncfa-v11-load-copy">Preparing the race engine…</p>
      <div class="v11-load-bar"><i></i></div>
    </div>`;
  document.body.appendChild(loader);
}

function brandBoot() {
  const boot = $('#boot-screen');
  if (!boot || boot.dataset.v11) return;
  boot.dataset.v11 = '1';
  const mark = boot.querySelector('.boot-mark');
  const title = boot.querySelector('h1');
  const copy = boot.querySelector('p');
  if (mark) mark.textContent = 'NCFA';
  if (title) title.innerHTML = 'COLLEGE TRACK<br>& FIELD <span>27</span>';
  if (copy) copy.textContent = 'THE COLLEGE TRACK EXPERIENCE';
}

function brandMenu() {
  const menu = $('#main-menu');
  if (!menu || menu.dataset.v11) return;
  menu.dataset.v11 = '1';
  const eyebrow = menu.querySelector('.eyebrow');
  const title = menu.querySelector('h2');
  if (eyebrow) eyebrow.textContent = 'NATIONAL COLLEGIATE FEDERATION OF ATHLETICS';
  if (title) title.textContent = 'NCFA COLLEGE TRACK & FIELD 27';
  const cards = [...menu.querySelectorAll('[data-mode]')];
  const labels = {
    career: ['ROAD TO GLORY', 'CAREER', 'Classes, practice, meets and your four-year college track career.'],
    quick: ['RACE NOW', 'EXHIBITION', 'Pick an event, stadium and race immediately.'],
    championship: ['SURVIVE & ADVANCE', 'CHAMPIONSHIP', 'Heats, qualifying rounds and finals.'],
    dynasty: ['BUILD A PROGRAM', 'DYNASTY', 'Recruit, develop and manage a college track program.']
  };
  cards.forEach((card) => {
    const data = labels[card.dataset.mode];
    if (!data) return;
    card.querySelector('span').textContent = data[0];
    card.querySelector('strong').textContent = data[1];
    card.querySelector('small').textContent = data[2];
  });
}

function addRaceChrome() {
  const hud = $('#race-hud');
  if (!hud || hud.dataset.v11) return;
  hud.dataset.v11 = '1';

  const controls = document.createElement('div');
  controls.className = 'mockup-control-bar';
  controls.innerHTML = `
    <div class="mockup-control"><b>Q</b><span>DRIVE</span></div>
    <div class="mockup-control"><b>E</b><span>DRIVE</span></div>
    <div class="mockup-control float"><b>F</b><span>FLOAT</span></div>
    <div class="mockup-control kick"><b>SPACE</b><span>KICK</span></div>`;
  hud.appendChild(controls);

  const lower = document.createElement('div');
  lower.className = 'broadcast-lower-third';
  lower.innerHTML = `<span class="num">4</span><strong id="v11-athlete-name">JORDAN CARTER</strong><small><span id="v11-event-name">800M</span> • NCFA</small>`;
  hud.appendChild(lower);
}

function syncRaceChrome() {
  const lower = $('.broadcast-lower-third');
  if (!lower) return;
  const athlete = $('#hub-athlete')?.textContent?.trim() || 'JORDAN CARTER';
  const event = $('#race-event-label')?.textContent?.trim() || $('#hub-event-group')?.textContent?.split('•').pop()?.trim() || '800M';
  $('#v11-athlete-name').textContent = athlete.toUpperCase();
  $('#v11-event-name').textContent = event.toUpperCase();
  lower.style.display = $('#race-hud')?.classList.contains('screen--active') ? '' : 'none';
}

function polishMeet() {
  const meet = $('#meet-setup');
  if (!meet || meet.dataset.v11) return;
  meet.dataset.v11 = '1';
  const title = $('#meet-title');
  if (title && !title.textContent.includes('MEET SETUP')) title.insertAdjacentHTML('beforebegin', '<div class="eyebrow">MEET SETUP</div>');
}

function exposeLoaderApi() {
  window.NCFA_UI_V11 = {
    showLoading(copy = 'Preparing the race engine…') {
      const loader = $('#ncfa-v11-loader');
      const text = $('#ncfa-v11-load-copy');
      if (text) text.textContent = copy;
      loader?.classList.add('show');
    },
    setLoading(copy) {
      const text = $('#ncfa-v11-load-copy');
      if (text) text.textContent = copy;
    },
    hideLoading() { $('#ncfa-v11-loader')?.classList.remove('show'); }
  };
}

addLoader();
brandBoot();
brandMenu();
addRaceChrome();
polishMeet();
exposeLoaderApi();

const observer = new MutationObserver(() => {
  brandBoot();
  brandMenu();
  addRaceChrome();
  polishMeet();
  syncRaceChrome();
});
observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
setInterval(syncRaceChrome, 500);
