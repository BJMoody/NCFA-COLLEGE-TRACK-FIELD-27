import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const touch = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches || innerWidth < 760;
const memory = Number(navigator.deviceMemory || 0);
const cores = Number(navigator.hardwareConcurrency || 0);
const lowPower = touch && ((memory > 0 && memory <= 4) || (cores > 0 && cores <= 4));

document.documentElement.classList.toggle('ncfa-low-power', lowPower);
document.documentElement.classList.toggle('ncfa-touch-performance', touch);

function competitionVisible() {
  return Boolean(
    document.querySelector('#race-hud.screen--active') ||
    document.querySelector('#field-screen.screen--active') ||
    document.querySelector('#finish-cinematic.screen--active')
  );
}

const proto = THREE.WebGLRenderer.prototype;
if (!proto.__ncfaPerfV10) {
  Object.defineProperty(proto, '__ncfaPerfV10', { value: true });

  const originalRender = proto.render;
  const originalSetPixelRatio = proto.setPixelRatio;
  const lastOffscreen = new WeakMap();
  const lastMain = new WeakMap();

  proto.setPixelRatio = function ncfaSetPixelRatio(value) {
    const cap = lowPower ? 1.0 : touch ? 1.18 : 1.65;
    return originalSetPixelRatio.call(this, Math.min(value, cap));
  };

  proto.render = function ncfaRender(scene, camera) {
    if (document.hidden) return;

    // Critical v15 rule: menus, career/event setup, classes, practice, shop,
    // and meet setup are HTML screens. They should consume ZERO WebGL frames.
    // game.js still owns its lightweight JS loop, but the GPU stays asleep
    // until an actual competition screen is visible.
    if (!competitionVisible()) return;

    const now = performance.now();
    const renderTarget = this.getRenderTarget?.();

    // The stadium videoboard is a second full scene render. Only draw it
    // during the race HUD and at a deliberately low refresh rate.
    if (renderTarget) {
      const raceVisible = Boolean(document.querySelector('#race-hud.screen--active'));
      if (!raceVisible) return;
      const minInterval = lowPower ? 120 : touch ? 85 : 55;
      const last = lastOffscreen.get(this) || 0;
      if (now - last < minInterval) return;
      lastOffscreen.set(this, now);
      return originalRender.call(this, scene, camera);
    }

    // Cap touch rendering without slowing physics/input updates.
    if (touch) {
      const minInterval = lowPower ? 33 : 22;
      const last = lastMain.get(this) || 0;
      if (now - last < minInterval) return;
      lastMain.set(this, now);
    }

    return originalRender.call(this, scene, camera);
  };
}

export const performanceProfile = { touch, lowPower, memory, cores };
