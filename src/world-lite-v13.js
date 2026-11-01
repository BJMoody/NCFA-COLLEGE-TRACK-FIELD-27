import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import {
  createWorld as createFastWorld,
  STRAIGHT,
  BASE_RADIUS,
  LAP,
  LANE_WIDTH,
  INNER_RADIUS,
  OUTER_RADIUS,
  TRACK_Y,
  CHUTE_Z,
  FINISH_COURSE,
  eventStartBase,
  stadiumPoint
} from './world-fast-v11.js';

export {
  STRAIGHT,
  BASE_RADIUS,
  LAP,
  LANE_WIDTH,
  INNER_RADIUS,
  OUTER_RADIUS,
  TRACK_Y,
  CHUTE_Z,
  FINISH_COURSE,
  eventStartBase,
  stadiumPoint
};

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
  let disposed = false;
  let pendingTexture = null;
  let pendingClock = ['0:00.00', 'NCFA'];
  let pendingReaction = 'idle';

  function ensureBuilt() {
    if (disposed || built || !raceOrFieldVisible()) return built;
    built = createFastWorld(scene, venue);
    if (pendingTexture) built.setBroadcastTexture?.(pendingTexture);
    built.setBroadcastClock?.(...pendingClock);
    built.setCrowdReaction?.(pendingReaction);
    return built;
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
      ensureBuilt()?.update?.(time);
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
