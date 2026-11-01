import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const touch = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches || innerWidth < 760;
const memory = Number(navigator.deviceMemory || 0);
const cores = Number(navigator.hardwareConcurrency || 0);
const lowPower = touch && ((memory > 0 && memory <= 4) || (cores > 0 && cores <= 4));

document.documentElement.classList.toggle('ncfa-low-power', lowPower);
document.documentElement.classList.toggle('ncfa-touch-performance', touch);

const proto = THREE.WebGLRenderer.prototype;
if (!proto.__ncfaPerfV10) {
  Object.defineProperty(proto, '__ncfaPerfV10', { value: true });

  const originalRender = proto.render;
  const originalSetPixelRatio = proto.setPixelRatio;
  const lastOffscreen = new WeakMap();
  const lastMain = new WeakMap();

  proto.setPixelRatio = function ncfaSetPixelRatio(value) {
    const cap = lowPower ? 1.0 : touch ? 1.18 : 1.8;
    return originalSetPixelRatio.call(this, Math.min(value, cap));
  };

  proto.render = function ncfaRender(scene, camera) {
    const now = performance.now();
    const renderTarget = this.getRenderTarget?.();

    // The stadium videoboard is a second full scene render. Do not render it
    // while the player is on menus, the hub, classes, practice, or the shop.
    if (renderTarget) {
      const raceVisible = Boolean(document.querySelector('#race-hud.screen--active'));
      if (!raceVisible || document.hidden) return;

      // The board does not need 60 FPS. 10-20 FPS still looks live while
      // saving a large amount of GPU work, especially on phones/tablets.
      const minInterval = lowPower ? 110 : touch ? 80 : 50;
      const last = lastOffscreen.get(this) || 0;
      if (now - last < minInterval) return;
      lastOffscreen.set(this, now);
      return originalRender.call(this, scene, camera);
    }

    if (document.hidden) return;

    // Cap only the visual render rate on touch hardware. Physics/input loops
    // still update normally, so controls remain responsive.
    if (touch) {
      const minInterval = lowPower ? 32 : 21;
      const last = lastMain.get(this) || 0;
      if (now - last < minInterval) return;
      lastMain.set(this, now);
    }

    return originalRender.call(this, scene, camera);
  };
}

export const performanceProfile = { touch, lowPower, memory, cores };
