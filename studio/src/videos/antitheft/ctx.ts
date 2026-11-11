// Per-frame context handed to every set module by world.ts (pure function of shot id + frame).
import type * as THREE from "three";
import type { LightState } from "./lights";
import type { ShotDef } from "./story";

export type SetCtx = {
  id: number;            // shot id (story.ts SHOTS)
  f: number;             // frame on the PICTURE clock (story BEAT / SHOTS; fractional since the voice time-map)
  vf: number;            // VIDEO frame (narration clock, 0..VOICE_TOTAL-1): drive idle life (breath, blinks, sway, wind) from it
  t: number;             // seconds (f / FPS)
  shot: ShotDef;
  cam: THREE.PerspectiveCamera;
  light: LightState;     // the blended light state of this frame (lights.ts)
  sunDir: THREE.Vector3; // world direction TOWARD the sun / key light
};
