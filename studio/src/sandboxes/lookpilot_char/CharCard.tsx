// LOOK PILOT CHARACTER CARD: the phone guy (navy suit, glasses, red tie, RED phone at the ear) walking toward the lens in a
// front view, chatting, the free hand gesturing, drawn with the real cast code (cast_people) on a TRANSPARENT canvas.
// The walk phase follows the METRES the card travels in Blender (phone gait, 0.711 m/s): stride matches travel, no slide.
// Pages: "phone" (the hero), "cyclist" (crowd kit cyclist, side view riding screen-left -> right), "pigeon" (a pigeon that
// pecks, then takes off at f PIG_GO).
import React, { useLayoutEffect, useRef, useState } from "react";
import { useCurrentFrame, delayRender, continueRender } from "remotion";
import { Pen } from "../../videos/clown/toon";
import * as PPL from "../../videos/clown/cast_people";
import type { Pose } from "../../videos/clown/cast_people";
import * as CROWD from "../../videos/clown/cast_crowd";
import * as FX from "../../videos/clown/cast_fx";

export const K = 2, X0 = -50, Y0 = -50;            // 2 px per design unit; the window starts at design (-50, -50)
export const CW = 700 * K, CH = 1050 * K;          // 1400 x 2100 px
// the cyclist's bike is wider than a figure card: its own window, design x -350..950, y -50..1000 at 1.5 px / unit
export const KC = 1.5, XC = -350, YC = -50, CWC = 1300 * KC, CHC = 1050 * KC;   // 1950 x 1575 px
const TAU = Math.PI * 2;
const LIGHT = (-128 * Math.PI) / 180;              // key light from the upper LEFT (the low sun behind-left of him)
export const SPEED = PPL.gaitSpeed("phone");       // m/s: the Blender card travels exactly this fast
export const PIG_GO = 70;                          // pigeon take-off frame (local)

const drawPhone = (p: Pen, f: number) => {
  const m = (f * SPEED) / 30, seed = 13, ch = PPL.phoneChat(f + 6, seed), dart = PPL.dartAt(f, seed, 0.22);
  const P: Pose = {
    s: 0, c: 1, walk: PPL.walkPhase(m, "phone"), go: 1, gait: "phone", light: LIGHT,
    expr: ch.laughing ? "laughBig" : "bright", mouth: ch.mouth, nod: ch.nod,
    look: 0.18 + dart.look + 0.12 * Math.sin(TAU * f / 97), lookY: 0.05 + dart.lookY,
    headTilt: -3 + 2.5 * Math.sin(TAU * f / 71), blink: PPL.blinkAt(f, seed),
    breath: 0.5 + 0.5 * Math.sin(TAU * f / 95),
    armL: PPL.phoneArm(PPL.C.phoneRed), armR: PPL.talkHand(f, seed, ch.talking),
  };
  PPL.drawPhoneGuy(p, P);
};
const drawCyclist = (p: Pen, f: number) => {
  const m = f * 4.2 / 30;                          // ~4.2 m/s ride
  const P = { ...CROWD.crowdPose("cyclist", f, { s: 1, c: 0, metres: m, light: LIGHT }), s: 1, c: 0, light: LIGHT, spin: m / 0.34 } as CROWD.CrowdPose;
  CROWD.drawCrowd(p, "cyclist", P);
};
const drawPig = (p: Pen, f: number) => {
  const t = f - PIG_GO, up = Math.max(0, Math.min(1, t / 8));
  FX.drawPigeon(p, { run: t < 0 ? 0 : t / 6, flap: t < -6 ? 0 : Math.min(1, (t + 6) / 6), wing: f / 4, peck: t < 0 ? Math.max(0, Math.sin(TAU * f / 34)) ** 3 : 0, lift: up });
};

export const CharCard: React.FC<{ page: string }> = ({ page }) => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender("lookpilot-char"));
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    const cyc = page === "cyclist", k = cyc ? KC : K, x0 = cyc ? XC : X0, y0 = cyc ? YC : Y0;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cyc ? CWC : CW, cyc ? CHC : CH);
    g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    const p = new Pen(g);
    if (page === "cyclist") drawCyclist(p, f); else if (page === "pigeon") drawPig(p, f); else drawPhone(p, f);
    g.setTransform(1, 0, 0, 1, 0, 0);
    continueRender(h);
  }, [f, page, h]);
  const w = page === "cyclist" ? CWC : CW, hh = page === "cyclist" ? CHC : CH;
  return <canvas ref={ref} width={w} height={hh} style={{ width: w, height: hh, background: "transparent" }} />;
};
