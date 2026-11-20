// set "phone" (CORE sandbox, K-K1 test): the pilot path + a phone held in front of the lens whose screen REPLAYS the
// scene as it was 2.5 s earlier, seen from the POV camera that "recorded" it (with the record UI). The phone body is
// main-lens only; the screen hides itself from its own render.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Built, CamState, SetBuilder, V3 } from "../../../kit/core/ctx";
import { screen, mainOnly } from "../../../kit/core/screen";
import { recTimer } from "../../../kit/core/phone_ui";
import { buildPilotSet } from "./pilot_world";
import { charPos } from "./pilot_shot";

/** the POV "recording" camera (the phone's own camera, film time): handheld at chest height, on the phone guy */
export const povCam = (t: number): CamState => {
  const c = charPos(t);
  const pos: V3 = [0.25 + 0.03 * Math.sin(t * 1.9), 1.48 + 0.015 * Math.sin(t * 3.1), 1.4 - 0.12 * t];
  return { pos, look: [c[0] * 0.8, 1.15, c[2]], fov: 62, roll: 0.012 * Math.sin(t * 1.3), fnum: 11 };
};
export const REPLAY_LAG = 2.5;
/** where the phone is held in the over-the-shoulder shot (film time) */
export const phoneAt = (t: number): { pos: V3; yaw: number; tilt: number } => ({
  pos: [0.34 + 0.006 * Math.sin(t * 1.7), 1.31 + 0.004 * Math.sin(t * 2.3), 1.18], yaw: 0.35 + 0.01 * Math.sin(t * 1.1), tilt: -0.22,
});
export const PHONE_FROM = 1.5;                 // the phone is in hand (visible) from this film time

export const buildPhoneSet: SetBuilder = async (ctx): Promise<Built> => {
  const base = await buildPilotSet(ctx);
  const phone = new THREE.Group(); phone.name = "phone";
  const caseM = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.18, 0.44, 0.88, THREE.SRGBColorSpace), roughness: 0.45, metalness: 0 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.076, 0.158, 0.011, 4, 0.008), caseM);
  body.castShadow = true; body.receiveShadow = true;
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(0.071, 0.152, 0.002, 3, 0.007), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.2 }));
  bezel.position.z = 0.0056;
  phone.add(body, bezel);
  const scr = screen(ctx, {
    size: [0.0665, 0.1455], corner: 0.0065, cam: (t) => povCam(t - REPLAY_LAG), sceneTime: (t) => t - REPLAY_LAG,
    active: (t) => t >= PHONE_FROM - 0.1, ui: { timer: recTimer(-REPLAY_LAG, 9), blink: false }, smudge: 0.4, seed: 2,
  });
  scr.mesh.position.z = 0.0068;
  phone.add(scr.mesh);
  mainOnly(phone);
  base.object.add(phone);
  return {
    ...base,
    update: (t, cam) => {
      base.update?.(t, cam);
      const p = phoneAt(t);
      phone.visible = t >= PHONE_FROM;
      phone.position.set(...p.pos); phone.rotation.set(p.tilt, p.yaw, 0, "YXZ");
    },
  };
};
