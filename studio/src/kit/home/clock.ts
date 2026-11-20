// KIT / HOME: a round wall clock (K-P19) with real ticking hands, pure in t. Face = canvas (digits 1-12, minute ticks,
// no text / brand), a moulded plastic rim (lathe), a domed glass cover (physical, catches the lamp), hour / minute hands,
// a thin red second hand with a counterweight that TICKS once per second with a small overshoot, a centre cap, a
// contact shadow on the wall. Faces local +Z; place with `pos` + `yaw` (world yaw of the face normal).
import * as THREE from "three";
import type { Built, KitCtx } from "../core/ctx";
import { canvas, canvasMat, latheG, pbr, mesh, rboxC, at, type V3, type C3 } from "./util";

export type ClockOpts = {
  pos: V3; yaw?: number; radius?: number;
  /** rim colour (sRGB 0..1) */
  rim?: C3;
  /** the time shown at film t = 0, seconds since midnight (default 23:12:20) */
  time0?: number;
  /** face style: "plain" (digits) | "dots" (no digits) */
  face?: "plain" | "dots";
  seed?: number;
};

const faceCanvas = (style: "plain" | "dots") => {
  const S = 1024, { cv, g } = canvas(S, S), c = S / 2;
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, S, S);
  // a faint radial falloff + paper grain (macro / micro on the face)
  const gr = g.createRadialGradient(c, c, S * 0.1, c, c, S * 0.5); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(120,110,95,0.18)");
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0, r0 = S * (big ? 0.405 : 0.425), r1 = S * 0.45;
    g.strokeStyle = "#1d1c1f"; g.lineWidth = big ? 9 : 3.5; g.beginPath();
    g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1); g.stroke();
  }
  if (style === "plain") {
    g.fillStyle = "#1d1c1f"; g.font = "600 96px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    for (let h = 1; h <= 12; h++) { const a = (h / 12) * Math.PI * 2, r = S * 0.335; g.fillText(String(h), c + Math.sin(a) * r, c - Math.cos(a) * r + 4); }
  } else {
    g.fillStyle = "#1d1c1f";
    for (let h = 1; h <= 12; h++) { const a = (h / 12) * Math.PI * 2, r = S * 0.35; g.beginPath(); g.arc(c + Math.sin(a) * r, c - Math.cos(a) * r, h % 3 ? 12 : 20, 0, 7); g.fill(); }
  }
  return cv;
};

/** the second-hand angle (rad, clockwise from 12) at time s: one step per second with a damped overshoot */
const secondAngle = (s: number) => {
  const whole = Math.floor(s), f = s - whole;
  const step = (2 * Math.PI) / 60, k = f < 0.06 ? f / 0.06 : 1;           // 60 ms move
  const over = f < 0.06 ? 0 : 0.11 * Math.exp(-(f - 0.06) * 38) * Math.sin((f - 0.06) * 95);
  return (whole % 60) * step + step * (k * k * (3 - 2 * k)) - step + step * over;
};

export const wallClock = async (_ctx: KitCtx, o: ClockOpts): Promise<Built> => {
  const R = o.radius ?? 0.15, g = new THREE.Group(); g.name = "wallClock";
  const rimM = pbr({ color: o.rim ?? [0.18, 0.18, 0.2], rough: 0.38, peel: 0.3, tile: 0.1, clearcoat: 0.25, ccRough: 0.25 });
  // rim: back plate + a rounded bezel ring
  const rim = latheG([[0.001, 0], [R + 0.012, 0], [R + 0.016, 0.008], [R + 0.016, 0.03], [R + 0.01, 0.04], [R + 0.002, 0.042], [R - 0.004, 0.036], [R - 0.006, 0.03]], 72);
  rim.rotateX(Math.PI / 2); g.add(mesh(rim, rimM, true, "clockRim"));
  const faceG = new THREE.CircleGeometry(R - 0.004, 72); faceG.translate(0, 0, 0.012);
  g.add(mesh(faceG, canvasMat(faceCanvas(o.face ?? "plain"), { rough: 0.7 }), false, "clockFace"));
  // hands (black satin, slightly raised in z so they shade the face)
  const handM = pbr({ color: [0.06, 0.06, 0.07], rough: 0.45, peel: 0 });
  const redM = pbr({ color: [0.75, 0.08, 0.06], rough: 0.4, peel: 0 });
  const handShape = (len: number, w0: number, w1: number, tail: number) => {
    const s = new THREE.Shape(); s.moveTo(-w0 / 2, -tail); s.lineTo(w0 / 2, -tail); s.lineTo(w1 / 2, len * 0.9); s.lineTo(0, len); s.lineTo(-w1 / 2, len * 0.9); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.0015, bevelEnabled: false });
  };
  const hour = new THREE.Group(), minute = new THREE.Group(), second = new THREE.Group();
  hour.add(mesh(at(handShape(R * 0.52, 0.016, 0.01, 0.02), 0, 0, 0.016), handM, true));
  minute.add(mesh(at(handShape(R * 0.78, 0.012, 0.007, 0.022), 0, 0, 0.0185), handM, true));
  second.add(mesh(at(rboxC(0.0022, R * 0.86 + 0.04, 0.001, 0, R * 0.43 - 0.02, 0.021, 0.0004), 0, 0, 0), redM, true));
  second.add(mesh(at(new THREE.CylinderGeometry(0.007, 0.007, 0.0015, 16), 0, -0.035, 0.021, Math.PI / 2), redM, true));
  g.add(hour, minute, second);
  const cap = new THREE.CylinderGeometry(0.0055, 0.0055, 0.006, 16); cap.rotateX(Math.PI / 2); cap.translate(0, 0, 0.024);
  g.add(mesh(cap, redM, true));
  // domed glass (thin, reflective; no shadow)
  const dome = new THREE.SphereGeometry(R * 4, 48, 6, 0, Math.PI * 2, 0, Math.asin((R - 0.002) / (R * 4)));
  dome.rotateX(Math.PI / 2); dome.translate(0, 0, 0.03 - R * 4 * Math.cos(Math.asin((R - 0.002) / (R * 4))));
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false });
  glassM.customProgramCacheKey = () => "home:clockglass";
  const gl = new THREE.Mesh(dome, glassM); gl.castShadow = false; gl.renderOrder = 2; g.add(gl);
  g.position.set(...o.pos); g.rotation.y = o.yaw ?? 0;
  const t0 = o.time0 ?? 23 * 3600 + 12 * 60 + 20;
  return { object: g, update: (t) => {
    const s = t0 + t;
    second.rotation.z = -secondAngle(s);
    minute.rotation.z = -((s / 60) % 60) / 60 * Math.PI * 2;
    hour.rotation.z = -((s / 3600) % 12) / 12 * Math.PI * 2;
  } };
};
