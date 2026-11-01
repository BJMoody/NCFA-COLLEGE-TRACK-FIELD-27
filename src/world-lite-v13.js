import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { EVENTS } from './data.js';

export const STRAIGHT = 84.39;
export const BASE_RADIUS = 36.80;
export const LAP = 2 * STRAIGHT + 2 * Math.PI * BASE_RADIUS;
export const LANE_WIDTH = 1.22;
export const INNER_RADIUS = BASE_RADIUS - 1.7;
export const OUTER_RADIUS = INNER_RADIUS + LANE_WIDTH * 8.6;
export const TRACK_Y = 0.08;
export const CHUTE_Z = -(OUTER_RADIUS + 5.4);
export const FINISH_COURSE = STRAIGHT;

const modLap = (value) => ((value % LAP) + LAP) % LAP;

export function eventStartBase(eventName) {
  const distance = Number(EVENTS[eventName]?.distance || 0);
  return modLap(FINISH_COURSE - distance);
}

export function stadiumPoint(metres, radius = BASE_RADIUS) {
  let d = modLap(metres);
  const curve = Math.PI * BASE_RADIUS;
  if (d < STRAIGHT) return new THREE.Vector3(-STRAIGHT / 2 + d, TRACK_Y, -radius);
  d -= STRAIGHT;
  if (d < curve) {
    const a = -Math.PI / 2 + d / BASE_RADIUS;
    return new THREE.Vector3(STRAIGHT / 2 + Math.cos(a) * radius, TRACK_Y, Math.sin(a) * radius);
  }
  d -= curve;
  if (d < STRAIGHT) return new THREE.Vector3(STRAIGHT / 2 - d, TRACK_Y, radius);
  d -= STRAIGHT;
  const a = Math.PI / 2 + d / BASE_RADIUS;
  return new THREE.Vector3(-STRAIGHT / 2 + Math.cos(a) * radius, TRACK_Y, Math.sin(a) * radius);
}

function raceOrFieldVisible() {
  return Boolean(
    document.querySelector('#race-hud.screen--active') ||
    document.querySelector('#field-screen.screen--active') ||
    document.querySelector('#finish-cinematic.screen--active')
  );
}

function disposeGroup(group) {
  group.traverse((obj) => {
    obj.geometry?.dispose?.();
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
    else obj.material?.dispose?.();
  });
  group.parent?.remove(group);
}

export function createWorld(scene, venue) {
  const athleteGroup = new THREE.Group();
  athleteGroup.name = `ncfa-athletes-${venue.id}`;
  scene.add(athleteGroup);

  let built = null;
  let buildPromise = null;
  let disposed = false;
  let pendingTexture = null;
  let pendingClock = ['0:00.00', 'NCFA'];
  let pendingReaction = 'idle';
  let latestTime = 0;

  function beginBuild() {
    if (disposed || built || buildPromise || !raceOrFieldVisible()) return;
    buildPromise = import('./world-fast-v11.js')
      .then(({ createWorld: createFastWorld }) => {
        if (disposed) return null;
        built = createFastWorld(scene, venue);
        if (pendingTexture) built.setBroadcastTexture?.(pendingTexture);
        built.setBroadcastClock?.(...pendingClock);
        built.setCrowdReaction?.(pendingReaction);
        built.update?.(latestTime);
        return built;
      })
      .catch((error) => {
        console.error('NCFA stadium failed to load', error);
        buildPromise = null;
        return null;
      });
  }

  return {
    group: athleteGroup,
    get videoBoard() { return built?.videoBoard || null; },
    setBroadcastTexture(texture) {
      pendingTexture = texture;
      built?.setBroadcastTexture?.(texture);
    },
    setBroadcastClock(time, event) {
      pendingClock = [time, event];
      built?.setBroadcastClock?.(time, event);
    },
    setCrowdReaction(reaction) {
      pendingReaction = reaction;
      built?.setCrowdReaction?.(reaction);
    },
    update(time) {
      latestTime = time;
      beginBuild();
      built?.update?.(time);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      built?.dispose?.();
      built = null;
      disposeGroup(athleteGroup);
    }
  };
}
