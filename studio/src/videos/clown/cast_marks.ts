// STAND-IN MARKS (owner EDIT; debug only, inputProps.post.marks = true): see-through grey-ish cards with a label where
// each character of each shot WILL stand (plan.ts anchors), so the animatic and the camera checks show the staging the
// cameras were built for. Never on in a final render. The real staging is cast_quiz.ts / cast_story1.ts / cast_story2.ts.
import type { Eng, Stage, CamInfo } from "./cast";
import type { Pen } from "./toon";
import { SQ, OFFICE, STUDY, STORY, PHONES, DUCKS, P1_F0, clownQ, lapPos, LANES, laneAt, laneLen, type V3 } from "./plan";
import { SHOTS, SID, BEAT } from "./beats";
import { pt } from "./remap";

const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const c01 = (x: number) => Math.max(0, Math.min(1, x));
const span = (key: string, f: number, pad = 6) => { const s = SHOTS[SID[key] - 1]; return c01((f - s.a + pad) / (s.b - s.a + 2 * pad)); };
type M = { p: V3; h: number; col: string; label: string };
/** one stand-in: body + head, its colour at 45 %, a white outline, the label on the chest */
const card = (h: number, col: string, label: string) => (p: Pen) => {
  const g = p.g, H = h / 0.00216, top = 975 - H, w = Math.min(300, 0.36 * H), hr = Math.min(95, 0.17 * H);
  g.globalAlpha = 0.5; g.fillStyle = col; g.strokeStyle = "#ffffff"; g.lineWidth = 10;
  g.beginPath(); g.arc(300, top + hr, hr, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); const x0 = 300 - w / 2, y0 = top + 2 * hr + 8, y1 = 975, r = 40;
  g.moveTo(x0 + r, y0); g.lineTo(x0 + w - r, y0); g.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); g.lineTo(x0 + w, y1); g.lineTo(x0, y1); g.lineTo(x0, y0 + r); g.quadraticCurveTo(x0, y0, x0 + r, y0);
  g.fill(); g.stroke();
  g.globalAlpha = 0.95; g.fillStyle = "#ffffff"; g.font = `bold ${Math.round(Math.min(90, 0.5 * w))}px Arial Black, Arial`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 8; g.strokeStyle = "#1a1030"; g.strokeText(label, 300, y0 + 0.28 * (y1 - y0)); g.fillText(label, 300, y0 + 0.28 * (y1 - y0));
  g.globalAlpha = 1;
};
const quiz = (t: number): M[] => {
  const out: M[] = [{ p: clownQ(t).p, h: 2.1, col: "#e8b800", label: "CLOWN" }];
  PHONES.forEach((ph, k) => { if (Math.abs(t - ph.t) < 34) out.push({ p: ph.at, h: 1.66, col: ph.phone, label: `P${k + 1}` }); });
  DUCKS.forEach((d) => { if (Math.abs(t - d.t) < 10) out.push({ p: d.at, h: 1.33, col: "#ffffff", label: "DUCK" }); });
  if (t < 75) out.push({ p: lerp3(P1_F0, PHONES[0].at, c01(t / PHONES[0].t)), h: 1.66, col: PHONES[0].phone, label: "P1" });
  return out;
};
export const marks = (id: number, f: number): M[] => {
  const K = SHOTS[id - 1].key, O = OFFICE, H = "#8a6a3a", ST = "#3a7ab8", IV = "#2e9a6a";
  switch (K) {
    case "Q1": case "Q2": case "Q3": return quiz(f);
    case "S1": { const u = span("S1", f), a = (f - SHOTS[id - 1].a) * 0.07, c = STORY.s1.circle;
      return [{ p: lerp3(STORY.s1.from, STORY.s1.to, u), h: 1.66, col: "#d84a3a", label: "PHONE" }, { p: [c.c[0] + c.r * Math.sin(a), 0, c.c[2] + c.r * Math.cos(a)], h: 2.1, col: "#e8b800", label: "CLOWN" }]; }
    case "S2": return [{ p: O.hyman.atBoard, h: 1.7, col: H, label: "HYMAN" }];
    case "S3": return [{ p: O.hyman.turned, h: 1.7, col: H, label: "HYMAN" }, { p: O.student.lean, h: 1.85, col: ST, label: "STUDENT" }];
    case "S4": case "S5": return [{ p: O.hyman.turned, h: 1.7, col: H, label: "HYMAN" }, { p: O.student.inRoom, h: 1.85, col: ST, label: "STUDENT" }];
    case "S6": { const a = -((f - SHOTS[id - 1].a) * 0.045); return [{ p: lapPos(a), h: 2.1, col: "#e8b800", label: "CLOWN" }]; }
    case "S7": { const u = span("S7", f); return [{ p: lerp3(STUDY.walkIn.from, STUDY.walkIn.to, 1 - (1 - u) ** 1.6), h: 1.66, col: "#7a5ac8", label: "WALKER" },
      { p: lerp3(STUDY.ivFrom, STUDY.iv, c01((u - 0.45) / 0.45)), h: 1.62, col: IV, label: "ASKER" }]; }
    case "S8": case "S10": return [{ p: STUDY.stop, h: 1.66, col: K === "S8" ? "#7a5ac8" : "#e07a2a", label: K === "S8" ? "WALKER" : "HEADPH" }, { p: STUDY.iv, h: 1.62, col: IV, label: "ASKER" }];
    case "S9": return [{ p: STUDY.pair[0], h: 1.6, col: "#c84a8a", label: "FRIEND" }, { p: STUDY.pair[1], h: 1.66, col: "#4a8ac8", label: "PAIR" }, { p: STUDY.iv, h: 1.62, col: IV, label: "ASKER" }];
    case "S11": return [{ p: STUDY.stop, h: 1.66, col: "#d84a3a", label: "PHONE" }, { p: lerp3(STUDY.clownBy.from, STUDY.clownBy.to, span("S11", f)), h: 2.1, col: "#e8b800", label: "CLOWN" }];
    case "S12": return [{ p: STUDY.iv, h: 1.62, col: IV, label: "ASKER" }];
    case "S13": return [{ p: STUDY.stop, h: 1.66, col: "#d84a3a", label: "PHONE" }, { p: STUDY.clownSide, h: 2.1, col: "#e8b800", label: "CLOWN" }];
    case "S14": return [{ p: lerp3(STORY.s14.from, STORY.s14.to, span("S14", f)), h: 1.66, col: "#e07a2a", label: "HEADPH" }, { p: lapPos(STORY.s14.clownAt - 0.004 * (f - SHOTS[id - 1].a)), h: 2.1, col: "#e8b800", label: "CLOWN" }];
    case "S15": return [{ p: lerp3(STORY.s15.from, STORY.s15.to, span("S15", f)), h: 1.62, col: "#2aa8a0", label: "HERO" }];
    case "S16": return [{ p: lerp3(STORY.s16.from, STORY.s16.to, span("S16", f)), h: 1.7, col: H, label: "HYMAN" }];
    case "S17": return [{ p: STORY.s17.at, h: 1.7, col: H, label: "HYMAN" }];
    case "S18": { const L = LANES.B, n = laneLen(L), s = SHOTS[id - 1];
      return [0, 1, 2].map((k) => { const d = n - 5.0 + ((f - s.a) - 20 * k) * 0.042; return { p: laneAt(L, Math.min(n, d)).p, h: 1.66, col: ["#c84a8a", "#4a8ac8", "#7ab84a"][k], label: `W${k + 1}` }; }); }
    case "S19": return [{ p: STORY.s19.stopper, h: 1.66, col: "#7ab84a", label: "STOPS" }, { p: STORY.s19.board, h: 1.1, col: "#f0e6c8", label: "BOARD" }];
    case "S20": { const s = SHOTS[id - 1], u = c01((f - pt(SID.S20, s.a)) / (pt(SID.S20, s.b) - pt(SID.S20, s.a)));
      return [{ p: lerp3(STORY.s20.from, STORY.s20.to, u), h: f > pt(SID.S20, BEAT.dodged) - 10 && f < pt(SID.S20, BEAT.dodged) + 10 ? 1.33 : 1.62, col: "#2aa8a0", label: "HERO" }]; }
    default: return [];
  }
};
export const stageMarks = (E: Eng, out: Stage, cam: CamInfo, id: number, f: number) => {
  marks(id, f).forEach((m, i) => E.putGhost(out, cam, `mark|${i}|${m.label}|${m.h}|${m.col}`, m.p, card(m.h, m.col, m.label)));
};
void SQ;
