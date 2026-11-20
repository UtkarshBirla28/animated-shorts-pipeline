// HERO DESK textures (owner DESK): hand-painted canvas maps for the keyboard, the ORDER SCREEN states, the side
// monitors, the SHARES SOLD split-flap counter, the share certificates (+ their ghosts), the laminate, papers, notes.
// Plus the desk's LOOP clock: whole cycles over VOICE_TOTAL - 1 frames, so frame 0 and the last frame (2540) match.
import { VOICE_TOTAL } from "./voicewarp";
import { tx, rrect, shadeHex, jit, rgba, speck, mottle, ctext, font, TAU, G, R } from "./setkit";

// ---------------- loop clock ----------------
/** the loop length in video frames: frame 0 == frame LOOPN (the last frame) */
export const LOOPN = VOICE_TOTAL - 1;
/** n whole cycles over the loop */
export const lsin = (n: number, v: number, ph = 0) => Math.sin((TAU * n * v) / LOOPN + ph);
/** 0..1 sawtooth with n whole cycles over the loop */
export const lfr = (n: number, v: number, ph = 0) => { const x = (n * v) / LOOPN + ph; return x - Math.floor(x); };

const UI = 'Tahoma, Verdana, Arial, sans-serif';
const HEAVY = '"Arial Black", Arial, sans-serif';
const KANA = 'Meiryo, "Yu Gothic", "MS Gothic", sans-serif';

// ---------------- keyboard ----------------
/** keyboard extents (set-local metres) and its texture scale (px per metre, top-down planar map) */
export const KB = { x0: -0.23, x1: 0.23, z0: 1.24, z1: 1.4, S: 4000, deck: 0.762, capTop: 0.7715, ins: 0.0021 };
export type Key = { x0: number; x1: number; z0: number; z1: number; label: string; kana?: string; mod: boolean; id?: string };
const KANA_OF: Record<string, string> = { Q: "た", W: "て", E: "い", R: "す", T: "か", Y: "ん", U: "な", I: "に", O: "ら", P: "せ", A: "ち", S: "と", D: "し", F: "は", G: "き",
  H: "く", J: "ま", K: "の", L: "り", Z: "つ", X: "さ", C: "そ", V: "ひ", B: "こ", N: "み", M: "も", "1": "ぬ", "2": "ふ", "3": "あ", "4": "う", "5": "え", "6": "お",
  "7": "や", "8": "ゆ", "9": "よ", "0": "わ" };
const ROWZ = (r: number) => 1.255 + r * 0.0235, KD = 0.0212;
/** ENTER (oversized, rows 2-3, right) and CANCEL (big red, rows 1-2, left) */
export const ENTER_K = { x0: 0.134, x1: 0.222, z0: ROWZ(2) - KD / 2, z1: ROWZ(3) + KD / 2, top: 0.775 };
export const CANCEL_K = { x0: -0.222, x1: -0.178, z0: ROWZ(1) - KD / 2, z1: ROWZ(2) + KD / 2, top: 0.7745 };
/** the key layout: rows of [label, width units], each row scaled to fill its x span */
export const keyLayout = (): Key[] => {
  const rows: { r: number; a: number; b: number; k: [string, number][] }[] = [
    { r: 0, a: -0.222, b: 0.222, k: [["ESC", 1.2], ["F1", 1], ["F2", 1], ["F3", 1], ["F4", 1], ["F5", 1], ["F6", 1], ["F7", 1], ["F8", 1], ["F9", 1], ["F10", 1], ["F11", 1], ["F12", 1], ["DEL", 1.2]] },
    { r: 1, a: -0.175, b: 0.222, k: [["1", 1], ["2", 1], ["3", 1], ["4", 1], ["5", 1], ["6", 1], ["7", 1], ["8", 1], ["9", 1], ["0", 1], ["-", 1], ["^", 1], ["¥", 1], ["BS", 1.6]] },
    { r: 2, a: -0.175, b: 0.131, k: [["TAB", 1.3], ["Q", 1], ["W", 1], ["E", 1], ["R", 1], ["T", 1], ["Y", 1], ["U", 1], ["I", 1], ["O", 1], ["P", 1], ["@", 1]] },
    { r: 3, a: -0.222, b: 0.131, k: [["CAPS", 1.7], ["A", 1], ["S", 1], ["D", 1], ["F", 1], ["G", 1], ["H", 1], ["J", 1], ["K", 1], ["L", 1], [";", 1], [":", 1]] },
    { r: 4, a: -0.222, b: 0.222, k: [["SHIFT", 2.1], ["Z", 1], ["X", 1], ["C", 1], ["V", 1], ["B", 1], ["N", 1], ["M", 1], [",", 1], [".", 1], ["/", 1], ["SHIFT", 1.9], ["\u2191", 1]] },
    { r: 5, a: -0.222, b: 0.222, k: [["CTRL", 1.5], ["ALT", 1.3], ["", 7.2], ["ALT", 1.3], ["CTRL", 1.3], ["\u2190", 1], ["\u2193", 1], ["\u2192", 1]] },
  ];
  const out: Key[] = [], gap = 0.0021;
  for (const row of rows) {
    const U = row.k.reduce((s, k) => s + k[1], 0), unit = (row.b - row.a + gap) / U;
    let x = row.a;
    for (const [label, w] of row.k) {
      const x1 = x + w * unit - gap, zc = ROWZ(row.r);
      out.push({ x0: x, x1, z0: zc - KD / 2, z1: zc + KD / 2, label, kana: KANA_OF[label], mod: label.length > 1 || row.r === 0 || label === "", id: row.r === 1 && /^[0-9]$/.test(label) ? "d" + label : undefined });
      x = x1 + gap;
    }
  }
  return out;
};
export const kbTex = () => tx("dkKeyboard", Math.round((KB.x1 - KB.x0) * KB.S), Math.round((KB.z1 - KB.z0) * KB.S), (g, r) => {
  const S = KB.S, W = Math.round((KB.x1 - KB.x0) * S), H = Math.round((KB.z1 - KB.z0) * S);
  const X = (x: number) => (x - KB.x0) * S, Z = (z: number) => (z - KB.z0) * S;
  // the case rim (warm grey plastic) and the dark deck between the keys
  g.fillStyle = "#cbc2ae"; g.fillRect(0, 0, W, H);
  speck(g, r, W, H, 1600, ["#b8ae98", "#ddd4c0"], 1, 3, 0.25);
  g.fillStyle = "#4c463e"; rrect(g, X(-0.2245), Z(1.2445), (0.449) * S, (1.3865 - 1.2445) * S, 14); g.fill();
  mottle(g, r, W, H, 40, ["#3a352e", "#5a5246"], 10, 40, 0.15);
  // a printed badge on the case's back strip (plain text, no logo)
  ctext(g, "TRADER 106", X(0.17), Z(1.2425), 18, "#7d7564", 200, UI, "bold");
  const ins = KB.ins * S;
  const cap = (k: { x0: number; x1: number; z0: number; z1: number }, top: string, label: string, kana?: string, mod = false) => {
    const x = X(k.x0), y = Z(k.z0), w = (k.x1 - k.x0) * S, h = (k.z1 - k.z0) * S;
    g.fillStyle = shadeHex(top, -0.12); rrect(g, x, y, w, h, 7); g.fill();
    g.fillStyle = shadeHex(top, -0.05); rrect(g, x + ins * 0.5, y + ins * 0.35, w - ins, h - ins * 0.6, 6); g.fill();
    const gr = g.createRadialGradient(x + w / 2, y + h * 0.45, 2, x + w / 2, y + h * 0.45, Math.max(w, h) * 0.7);
    gr.addColorStop(0, shadeHex(top, 0.04)); gr.addColorStop(1, top);
    g.fillStyle = gr; rrect(g, x + ins, y + ins * 0.8, w - 2 * ins, h - 2 * ins, 6); g.fill();
    // a lit top edge, a little grime toward the front
    g.fillStyle = "rgba(255,255,255,0.22)"; g.fillRect(x + ins + 4, y + ins * 0.8 + 1, w - 2 * ins - 8, 2);
    g.fillStyle = "rgba(90,70,40,0.07)"; g.fillRect(x + ins, y + h - ins - 10, w - 2 * ins, 8);
    if (label) {
      const big = label.length === 1 || label === "¥" || /^[\u2190-\u2193]$/.test(label);
      font(g, big ? 30 : mod ? 17 : 22, UI, "bold"); g.fillStyle = "#3a352f"; g.textBaseline = "alphabetic";
      if (big && !mod) { g.textAlign = "left"; g.fillText(label, x + ins + 7, y + ins + 31); }
      else { g.textAlign = "center"; g.fillText(label, x + w / 2, y + h / 2 + 8, w - 2 * ins - 4); }
    }
    if (kana) { font(g, 17, KANA); g.textAlign = "right"; g.fillStyle = "#8a5a3a"; g.fillText(kana, x + w - ins - 5, y + h - ins - 6); }
  };
  for (const k of keyLayout()) cap(k, jit(r, k.mod ? "#d6cbb5" : "#ece3cf", 0.03, 3), k.label, k.kana, k.mod);
  // the deck under ENTER / CANCEL (separate moving caps) stays dark
});
/** the glowing ENTER cap: white top, a pale-blue rim (the sides), "ENTER" + the return arrow in deep blue */
export const enterTex = () => tx("dkEnter", 512, 262, (g) => {
  const W = 512, H = 262, ins = (KB.ins / (ENTER_K.x1 - ENTER_K.x0)) * W;
  g.fillStyle = "#4f8fd8"; g.fillRect(0, 0, W, H);
  const gr = g.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, W * 0.55); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#bfe4ff");
  g.fillStyle = gr; rrect(g, ins, ins * 0.8, W - 2 * ins, H - 2 * ins, 18); g.fill();
  ctext(g, "ENTER", W / 2 - 24, H * 0.6, 92, "#173a8a", W * 0.66, HEAVY);
  g.strokeStyle = "#173a8a"; g.lineWidth = 15; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(W * 0.86, H * 0.28); g.lineTo(W * 0.86, H * 0.58); g.lineTo(W * 0.74, H * 0.58); g.stroke();
  g.beginPath(); g.moveTo(W * 0.77, H * 0.5); g.lineTo(W * 0.73, H * 0.58); g.lineTo(W * 0.77, H * 0.66); g.stroke();
}, true);
/** the big red CANCEL cap */
export const cancelTex = () => tx("dkCancel", 360, 368, (g) => {
  const W = 360, H = 368, ins = (KB.ins / (CANCEL_K.x1 - CANCEL_K.x0)) * W;
  g.fillStyle = "#8e1612"; g.fillRect(0, 0, W, H);
  const gr = g.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H * 0.42, W * 0.6); gr.addColorStop(0, "#f04434"); gr.addColorStop(1, "#c8211a");
  g.fillStyle = gr; rrect(g, ins, ins * 0.8, W - 2 * ins, H - 2 * ins, 22); g.fill();
  g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(ins + 12, ins * 0.8 + 4, W - 2 * ins - 24, 5);
  ctext(g, "CANCEL", W / 2, H * 0.58, 74, "#fff6ec", W - 2 * ins - 16, HEAVY);
}, true);

// ---------------- the ORDER SCREEN ----------------
export type Ord = { mode: "blank" | "typing" | "typo" | "sent" | "cancel"; qty: string; price: string; strip: number; cur: "" | "q" | "p"; dots: number; flash: number; dim?: number; hot?: "" | "q" | "p" | "b" };
export const ordKey = (s: Ord) => `${s.mode}|${s.qty}|${s.price}|${+s.strip}|${s.cur}|${s.dots}|${s.flash}|${s.hot ?? ""}`;
export const SCR_W = 1040, SCR_H = 660;
/** screen-pixel boxes (shared with the overlays) */
export const SCR = { qty: { x: 500, y: 200, w: 480, h: 120 }, price: { x: 500, y: 372, w: 480, h: 120 }, foot: { x: 60, y: 540, w: 920, h: 92 }, btn: { x: 470, y: 540, w: 520, h: 92 } };
const groupDigits = (s: string) => s;
export const orderTex = (s: Ord) => tx("dkOrd_" + ordKey(s), SCR_W, SCR_H, (g, r) => {
  const W = SCR_W, H = SCR_H;
  // a 2005 terminal blue with a soft vignette
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#1d4aa8"); bg.addColorStop(1, "#11307a");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,10,40,0.35)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // header bar
  g.fillStyle = "#c9d3e6"; g.fillRect(0, 0, W, 58); g.fillStyle = "#0b1d52"; g.fillRect(0, 58, W, 4);
  font(g, 30, UI, "bold"); g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#0b1d52"; g.fillText("MIZUHO SECURITIES   ORDER ENTRY", 22, 31);
  font(g, 24, UI, "bold"); g.textAlign = "right"; g.fillStyle = "#3a4a70"; g.fillText("09:27", W - 20, 31);
  // stock + date line, SELL highlighted
  font(g, 46, HEAVY); g.textAlign = "left"; g.fillStyle = "#ffffff"; g.fillText("J-COM", 34, 112);
  font(g, 30, UI, "bold"); g.fillStyle = "#a8c0ec"; g.fillText("2005-12-08", 228, 114);
  g.fillStyle = "#34508e"; rrect(g, 640, 82, 150, 62, 8); g.fill(); ctext(g, "BUY", 715, 128, 36, "#7f93bd", 140, HEAVY);
  g.fillStyle = "#e23b2a"; rrect(g, 806, 78, 200, 70, 9); g.fill(); g.strokeStyle = "#ffd6a0"; g.lineWidth = 4; g.stroke();
  ctext(g, "SELL", 906, 129, 46, "#ffffff", 186, HEAVY);
  // the two boxes (labels left, hint text greyed under / beside)
  // the two boxes: the label ABOVE each box with its unit greyed beside it ("QTY  shares", "PRICE  yen per share"),
  // so 610000 sits under "shares" and 1 under "yen": the numbers are visibly in the wrong boxes
  const box = (b: { x: number; y: number; w: number; h: number }, label: string, hint: string, val: string, cur: boolean, hot = "") => {
    font(g, 40, HEAVY); g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = "#ffffff"; g.fillText(label, b.x, b.y - (hot ? 16 : 10));
    const lw = g.measureText(label).width; font(g, hot ? 34 : 28, UI, "bold"); g.fillStyle = hot || "#9fb4dc"; g.fillText(hint, b.x + lw + 16, b.y - (hot ? 18 : 12));
    if (hot) { g.fillStyle = hot; rrect(g, b.x - 12, b.y - 12, b.w + 24, b.h + 24, 8); g.fill(); }
    g.fillStyle = "#08163e"; g.fillRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
    g.fillStyle = "#f6f8ff"; g.fillRect(b.x, b.y, b.w, b.h);
    g.fillStyle = "rgba(20,40,90,0.18)"; g.fillRect(b.x, b.y, b.w, 7);
    if (val) { font(g, 106, HEAVY); g.textAlign = "right"; g.textBaseline = "middle"; g.fillStyle = "#101828"; g.fillText(groupDigits(val), b.x + b.w - 24, b.y + b.h / 2 + 6); }
    if (cur) { g.fillStyle = "#101828"; g.fillRect(b.x + b.w - 18, b.y + 20, 10, b.h - 40); }
  };
  // the left column: a little order ticket (plain words, the 2005 terminal clutter)
  g.fillStyle = "rgba(10,25,70,0.55)"; rrect(g, 34, 170, 420, 322, 10); g.fill(); g.strokeStyle = "rgba(160,190,240,0.35)"; g.lineWidth = 2; g.stroke();
  font(g, 26, UI, "bold"); g.textAlign = "left"; g.textBaseline = "alphabetic";
  ([["ORDER", "0001"], ["SIDE", "SELL"], ["TYPE", "LIMIT"], ["MARKET", "MOTHERS"], ["LIMIT/DAY", "OK"]] as [string, string][]).forEach(([k, v], i) => {
    g.fillStyle = "#8ea6d4"; g.fillText(k, 56, 214 + i * 62); g.fillStyle = i === 1 ? "#ff8a7a" : "#e8eefc"; g.textAlign = "right"; g.fillText(v, 432, 214 + i * 62); g.textAlign = "left";
  });
  const typed = s.mode !== "blank";
  const hotC = s.hot === "b" ? "#ff5a3c" : "#ffc93a";
  box(SCR.qty, "QTY", "shares", typed ? s.qty : "", s.cur === "q", s.hot === "q" || s.hot === "b" ? hotC : "");
  box(SCR.price, "PRICE", "yen per share", typed ? s.price : "", s.cur === "p", s.hot === "p" || s.hot === "b" ? hotC : "");
  // footer: the hint / the strip / the status
  const F = SCR.foot;
  if (s.mode === "typo") {
    const Bt = SCR.btn; g.fillStyle = "#0e2a6a"; rrect(g, Bt.x, Bt.y, Bt.w, Bt.h, 14); g.fill(); g.strokeStyle = "#7fd4ff"; g.lineWidth = 5; g.stroke();
    ctext(g, "PRESS ENTER", Bt.x + Bt.w / 2, Bt.y + Bt.h / 2 + 22, 62, "#bfeaff", Bt.w - 40, HEAVY);
  } else if (s.mode === "typing") {
    if (s.strip) {
      g.fillStyle = "#ffd23a"; g.fillRect(F.x - 30, F.y - 6, F.w + 60, F.h + 12);
      const full = "SELL 610,000 @ \u00a51"; font(g, 74, HEAVY); const x0 = W / 2 - g.measureText(full).width / 2;
      g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = "#14182a"; g.fillText(s.strip > 1 ? full : "SELL 610,000 @ \u00a5", x0, F.y + F.h / 2 + 26);
      if (s.strip === 1) { g.fillRect(x0 + g.measureText("SELL 610,000 @ \u00a5").width + 6, F.y + 16, 8, F.h - 30); }
    }
    else { font(g, 30, UI, "bold"); g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#a8c0ec"; g.fillText("TYPE QTY, PRICE   [ENTER] = SEND", F.x + 20, F.y + F.h / 2); }
  } else if (s.mode === "sent") {
    const Bt = SCR.btn; g.fillStyle = "#1f8a4a"; rrect(g, Bt.x, Bt.y, Bt.w, Bt.h, 14); g.fill();
    ctext(g, "ORDER SENT", Bt.x + Bt.w / 2, Bt.y + Bt.h / 2 + 22, 62, "#eaffef", Bt.w - 40, HEAVY);
  } else if (s.mode === "cancel") {
    g.fillStyle = s.flash ? "#ff3a2a" : "#c4231a"; g.fillRect(0, 158, W, 0); // (no top band)
    g.fillStyle = s.flash ? "#ff4a36" : "#c4231a"; rrect(g, F.x - 30, F.y - 30, F.w + 60, F.h + 50, 12); g.fill();
    g.strokeStyle = "#ffe0d0"; g.lineWidth = 5; g.stroke();
    ctext(g, "CANCEL: NOT ACCEPTED", W / 2, F.y + F.h / 2 + 14, 66, "#ffffff", F.w + 30, HEAVY);
    if (s.dots) { const P = SCR.price; font(g, 58, HEAVY); g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#9aa0ae"; g.fillText("...", P.x + 22, P.y + P.h / 2 - 6); }
  } else {
    font(g, 30, UI, "bold"); g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#a8c0ec"; g.fillText("NEW ORDER   [ENTER] = SEND", F.x + 20, F.y + F.h / 2);
  }
  // status line
  font(g, 20, UI); g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = "#7f98c8"; g.fillText("ACCT 0106   MKT: OPEN", 22, H - 10);
  speck(g, r, W, H, 400, ["#ffffff", "#000000"], 1, 2, 0.04);
});
/** a soft glow rectangle (additive overlays: the PRESS ENTER pulse, the red flash) */
export const glowRectTex = () => tx("dkGlowRect", 256, 128, (g) => {
  g.clearRect(0, 0, 256, 128);
  for (let i = 0; i < 24; i++) { const k = i / 24; g.fillStyle = `rgba(255,255,255,${0.04 + 0.05 * k})`; rrect(g, 4 + k * 40, 4 + k * 24, 248 - k * 80, 120 - k * 48, 18); g.fill(); }
}, true);
/** CRT-ish scanlines for the 2005 LCDs (tiles vertically) */
export const scanTex = () => tx("dkScan", 8, 64, (g) => {
  g.clearRect(0, 0, 8, 64);
  for (let y = 0; y < 64; y += 4) { g.fillStyle = "rgba(0,0,20,0.55)"; g.fillRect(0, y, 8, 2); }
  g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(0, 30, 8, 3);
});
/** the left monitor: a scrolling quote list (tiles vertically: 24 rows) */
export const quotesTex = () => tx("dkQuotes", 512, 1024, (g, r) => {
  g.fillStyle = "#06121e"; g.fillRect(0, 0, 512, 1024);
  const codes = ["2462", "8411", "9984", "6758", "7203", "8306", "4755", "9432", "6502", "8604", "2914", "4689"];
  for (let i = 0; i < 24; i++) {
    const y = i * (1024 / 24) + 30, up = r() > 0.45, px = (1000 + r() * 90000).toFixed(0), ch = (r() * 4).toFixed(2);
    g.fillStyle = i % 2 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0)"; g.fillRect(0, y - 30, 512, 42);
    font(g, 30, UI, "bold"); g.textBaseline = "alphabetic"; g.textAlign = "left"; g.fillStyle = "#d8e2f0"; g.fillText(codes[i % codes.length], 18, y);
    g.textAlign = "right"; g.fillStyle = "#e8eef8"; g.fillText(px, 330, y);
    g.fillStyle = up ? "#3ee07a" : "#ff5a4a"; g.fillText((up ? "+" : "-") + ch, 494, y);
  }
});
/** the right monitor: an intraday chart (plain numbers), green line on black, grid */
export const chartTex = () => tx("dkChart", 512, 384, (g, r) => {
  g.fillStyle = "#050c14"; g.fillRect(0, 0, 512, 384);
  g.fillStyle = "#c9d3e6"; g.fillRect(0, 0, 512, 40); font(g, 24, UI, "bold"); g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#0b1d52"; g.fillText("2462  J-COM   1 DAY", 12, 21);
  g.strokeStyle = "rgba(120,150,190,0.25)"; g.lineWidth = 1;
  for (let x = 40; x < 512; x += 52) { g.beginPath(); g.moveTo(x, 48); g.lineTo(x, 370); g.stroke(); }
  for (let y = 60; y < 380; y += 46) { g.beginPath(); g.moveTo(10, y); g.lineTo(470, y); g.stroke(); }
  g.strokeStyle = "#46e888"; g.lineWidth = 4; g.beginPath();
  let y = 200; for (let x = 12; x < 470; x += 6) { y += (r() - 0.5) * 14 - (x > 380 ? -5 : 0.25); y = Math.max(70, Math.min(350, y)); if (x === 12) g.moveTo(x, y); else g.lineTo(x, y); }
  g.stroke();
  font(g, 18, UI); g.textAlign = "right"; g.fillStyle = "#8ea6d4"; for (let k = 0; k < 6; k++) g.fillText(String(900 - k * 60) + "k", 508, 66 + k * 56);
});

// ---------------- the SHARES SOLD split-flap counter ----------------
export const FLAP = "0123456789 ";
export const flapAtlas = () => tx("dkFlapAtlas", 160 * 11, 320, (g) => {
  for (let i = 0; i < 11; i++) {
    const x = i * 160;
    g.fillStyle = "#121416"; g.fillRect(x, 0, 160, 320);
    rrect(g, x + 6, 6, 148, 308, 14); g.fillStyle = "#24282d"; g.fill();
    const gr = g.createLinearGradient(0, 6, 0, 314); gr.addColorStop(0, "rgba(255,255,255,0.09)"); gr.addColorStop(0.5, "rgba(0,0,0,0.16)"); gr.addColorStop(1, "rgba(255,255,255,0.05)");
    g.fillStyle = gr; g.fillRect(x + 6, 6, 148, 308);
    g.save(); g.translate(x + 80, 166); g.scale(0.8, 1); font(g, 262, HEAVY); g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#f6eed8"; g.fillText(FLAP[i], 0, 6); g.restore();
    g.fillStyle = "#06080a"; g.fillRect(x + 6, 157, 148, 6); g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x + 6, 163, 148, 2);
  }
}, true);
/** counter layout (metres from the face centre, y up): 6 cells (ddd,ddd) under "SHARES SOLD" */
export const CNT = (() => {
  const w = 0.62, h = 0.2, cw = 0.066, ch = 0.118, gap = 0.006, cg = 0.03, total = 6 * cw + 4 * gap + cg, cy = -h / 2 + 0.017 + ch / 2;
  const cells: { x: number; y: number }[] = []; let x = -total / 2;
  for (let i = 0; i < 6; i++) { cells.push({ x: x + cw / 2, y: cy }); x += cw + (i === 2 ? cg : gap); }
  return { w, h, cw, ch, cells, comma: cells[2].x + cw / 2 + cg / 2, labelY: h / 2 - 0.035 };
})();
export const counterFaceTex = () => tx("dkCounterFace", Math.round(CNT.w * 1600), Math.round(CNT.h * 1600), (g, r) => {
  const PX = 1600, W = Math.round(CNT.w * PX), H = Math.round(CNT.h * PX), cx = (x: number) => (x + CNT.w / 2) * PX, cy = (y: number) => (CNT.h / 2 - y) * PX;
  g.fillStyle = "#23272e"; g.fillRect(0, 0, W, H);
  speck(g, r, W, H, 900, ["#ffffff", "#000000"], 1, 2, 0.05);
  g.strokeStyle = "#8a93a0"; g.lineWidth = 6; rrect(g, 8, 8, W - 16, H - 16, 14); g.stroke();
  font(g, 50, HEAVY); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#f2e6c4"; g.fillText("SHARES SOLD", W / 2, cy(CNT.labelY));
  for (const c of CNT.cells) { g.fillStyle = "#07080a"; rrect(g, cx(c.x - CNT.cw / 2) - 5, cy(c.y + CNT.ch / 2) - 5, CNT.cw * PX + 10, CNT.ch * PX + 10, 8); g.fill(); }
  const base = cy(CNT.cells[0].y - CNT.ch * 0.36), X = cx(CNT.comma), rd = 9;
  g.fillStyle = "#f2e6c4"; g.beginPath(); g.arc(X, base - rd, rd, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(X + rd * 0.95, base - rd * 0.7); g.quadraticCurveTo(X + rd * 0.9, base + rd * 1.6, X - rd * 0.9, base + rd * 2.6); g.quadraticCurveTo(X + rd * 0.1, base + rd * 1.2, X - rd * 0.3, base - rd * 0.2); g.closePath(); g.fill();
  for (const [bx, by] of [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]]) { g.fillStyle = "#5a6070"; g.beginPath(); g.arc(bx, by, 6, 0, TAU); g.fill(); }
});

// ---------------- share certificates ----------------
const guilloche = (g: G, x: number, y: number, w: number, h: number, band: number, col: string) => {
  g.save(); g.strokeStyle = col; g.lineWidth = 1.4;
  const per = 2 * (w + h);
  for (let k = 0; k < 6; k++) {
    g.beginPath();
    for (let s = 0; s <= per; s += 2) {
      const off = band * (0.5 + 0.42 * Math.sin(s * 0.11 + k * 1.05) * Math.cos(s * 0.023 + k));
      let px: number, py: number;
      if (s < w) { px = x + s; py = y + off; } else if (s < w + h) { px = x + w - off; py = y + s - w; } else if (s < 2 * w + h) { px = x + w - (s - w - h); py = y + h - off; } else { px = x + off; py = y + h - (s - 2 * w - h); }
      if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();
  }
  g.restore();
};
const certPaint = (g: G, r: R, ghost: boolean) => {
  const W = 512, H = 352;
  g.clearRect(0, 0, W, H);
  if (ghost) {
    g.fillStyle = "rgba(225,240,255,0.32)"; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.45;
  } else { g.fillStyle = "#f3e9cf"; g.fillRect(0, 0, W, H); mottle(g, r, W, H, 30, ["#e6d6b0", "#fbf3df"], 20, 60, 0.12); }
  g.fillStyle = ghost ? "rgba(0,0,0,0)" : "#e8f0dc"; g.fillRect(14, 14, W - 28, H - 28);
  guilloche(g, 14, 14, W - 28, H - 28, 34, ghost ? "#bfe6ff" : "#2f7a4a");
  g.strokeStyle = ghost ? "#bfe6ff" : "#1f5a34"; g.lineWidth = 3; g.strokeRect(52, 52, W - 104, H - 104);
  ctext(g, "SHARE CERTIFICATE", W / 2, 100, 34, ghost ? "#dff2ff" : "#1f4a30", W - 130, 'Georgia, "Times New Roman", serif', "bold");
  ctext(g, "J-COM", W / 2, 186, 74, ghost ? "#eaf6ff" : "#16301f", W - 160, 'Georgia, "Times New Roman", serif', "bold");
  g.strokeStyle = ghost ? "#dff2ff" : "#9a2a1e"; g.lineWidth = 4; g.strokeRect(W / 2 - 96, 214, 192, 56);
  ctext(g, "1 SHARE", W / 2, 255, 36, ghost ? "#dff2ff" : "#9a2a1e", 180, HEAVY);
  if (!ghost) {
    g.fillStyle = "rgba(190,40,30,0.85)"; g.beginPath(); g.arc(W - 96, H - 92, 22, 0, TAU); g.fill();
    g.strokeStyle = "rgba(255,230,210,0.7)"; g.lineWidth = 3; g.beginPath(); g.arc(W - 96, H - 92, 15, 0, TAU); g.stroke();
    font(g, 16, UI, "bold"); g.textAlign = "left"; g.fillStyle = "#5a6a50"; g.fillText("No. " + String(100000 + Math.floor(r() * 899999)), 70, H - 72);
  }
  g.globalAlpha = 1;
  if (ghost) {
    g.setLineDash([22, 14]); g.strokeStyle = "rgba(235,248,255,0.95)"; g.lineWidth = 7; g.strokeRect(6, 6, W - 12, H - 12); g.setLineDash([]);
  }
};
export const certTex = () => tx("dkCert", 512, 352, (g, r) => certPaint(g, r, false), true);
export const ghostTex = () => tx("dkGhost", 512, 352, (g, r) => certPaint(g, r, true), true);

// ---------------- desk dressing ----------------
/** painted laminate desk top (1.8 x 0.85 m) */
export const lamTex = () => tx("dkLaminate", 1024, 512, (g, r) => {
  g.fillStyle = "#cf9f62"; g.fillRect(0, 0, 1024, 512);   // fix2: warm honey wood (the room's desk tops match)
  mottle(g, r, 1024, 512, 120, ["#bd8a4c", "#e0b67c"], 20, 90, 0.18);
  for (let y = 0; y < 512; y += 5) { g.strokeStyle = rgba(r() < 0.5 ? "#a8743a" : "#e8c48e", 0.14 + 0.1 * r()); g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(0, y + r() * 3); g.bezierCurveTo(340, y + (r() - 0.5) * 9, 680, y + (r() - 0.5) * 9, 1024, y + r() * 3); g.stroke(); }
  speck(g, r, 1024, 512, 2500, ["#a06c34", "#ecd0a0", "#8f5f2c"], 1, 2.5, 0.25);
  // a worn patch in front of the keyboard, a tea ring, pen scratches
  const gr = g.createRadialGradient(512, 360, 10, 512, 360, 160); gr.addColorStop(0, "rgba(240,235,222,0.35)"); gr.addColorStop(1, "rgba(240,235,222,0)"); g.fillStyle = gr; g.fillRect(300, 200, 424, 312);
  g.strokeStyle = "rgba(120,90,50,0.25)"; g.lineWidth = 5; g.beginPath(); g.arc(760, 300, 22, 0.3, 5.6); g.stroke();
  g.strokeStyle = "rgba(60,60,110,0.18)"; g.lineWidth = 1.5; for (let i = 0; i < 9; i++) { const x = r() * 1024, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 6; g.strokeRect(3, 3, 1018, 506);
});
export const edgeTex = () => tx("dkEdge", 256, 32, (g, r) => { g.fillStyle = "#5f5d5a"; g.fillRect(0, 0, 256, 32); speck(g, r, 256, 32, 200, ["#4a4846", "#757370"], 1, 2, 0.3); g.fillStyle = "rgba(255,255,255,0.2)"; g.fillRect(0, 2, 256, 3); });
/** a printed sheet (report lines, a little table) */
export const sheetTex = (k: number) => tx("dkSheet" + k, 256, 340, (g, r) => {
  g.fillStyle = ["#f6f4ee", "#f2efe4", "#fbf8f0"][k % 3]; g.fillRect(0, 0, 256, 340);
  g.fillStyle = "#3a3c48"; g.fillRect(22, 22, 120, 10);
  for (let y = 50; y < 320; y += 13) { const w = 150 + r() * 70; g.fillStyle = rgba("#50525e", 0.5 + 0.3 * r()); g.fillRect(22, y, y % 65 === 50 ? w * 0.5 : w, 4); }
  if (k % 2) { g.strokeStyle = "rgba(60,60,80,0.4)"; g.lineWidth = 1; for (let y = 180; y < 300; y += 20) { g.beginPath(); g.moveTo(22, y); g.lineTo(234, y); g.stroke(); } }
  if (k === 1) { g.strokeStyle = "rgba(210,40,40,0.6)"; g.lineWidth = 3; g.beginPath(); g.arc(190, 90, 26, 0, TAU); g.stroke(); }
});
/** sticky notes (plain words) */
export const noteTex = (k: number) => tx("dkNote" + k, 128, 128, (g, r) => {
  const cols = ["#ffe866", "#ff9fbf", "#9fe8ff", "#b8f08a"], words = [["MTG", "9:30"], ["CALL", "OSAKA"], ["LUNCH?", ""], ["x2", "CHECK"]];
  g.fillStyle = cols[k % 4]; g.fillRect(0, 0, 128, 128); g.fillStyle = "rgba(0,0,0,0.06)"; g.fillRect(0, 0, 128, 22);
  g.save(); g.translate(64, 64); g.rotate((r() - 0.5) * 0.2);
  ctext(g, words[k % 4][0], 0, -4, 34, "#1e2a5a", 110, '"Comic Sans MS", "Segoe Print", Arial, sans-serif', "bold");
  ctext(g, words[k % 4][1], 0, 34, 30, "#1e2a5a", 110, '"Comic Sans MS", "Segoe Print", Arial, sans-serif', "bold");
  g.restore();
});
/** the phone's keypad face + the LCD */
export const phoneTex = () => tx("dkPhone", 256, 256, (g, r) => {
  g.fillStyle = "#4a4e56"; g.fillRect(0, 0, 256, 256); speck(g, r, 256, 256, 300, ["#3a3e46", "#5a5e66"], 1, 2, 0.4);
  g.fillStyle = "#9fb88a"; g.fillRect(40, 20, 176, 40); font(g, 22, UI, "bold"); g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#24301e"; g.fillText("LINE 1  09:27", 50, 41);
  const lab = "123456789*0#";
  for (let i = 0; i < 12; i++) { const x = 52 + (i % 3) * 56, y = 82 + Math.floor(i / 3) * 42; g.fillStyle = "#e8e6de"; rrect(g, x, y, 44, 32, 6); g.fill(); ctext(g, lab[i], x + 22, y + 25, 22, "#2a2c30", 40, UI, "bold"); }
  for (let i = 0; i < 4; i++) { g.fillStyle = i === 0 ? "#e04a3a" : "#8fd08a"; g.beginPath(); g.arc(226, 92 + i * 40, 8, 0, TAU); g.fill(); }
});
/** a 2005 office ID card on a lanyard (no name, no logo: a photo square + a stripe) */
export const idTex = () => tx("dkId", 128, 192, (g) => {
  g.fillStyle = "#f4f6f8"; g.fillRect(0, 0, 128, 192); g.fillStyle = "#2a5aa8"; g.fillRect(0, 0, 128, 34);
  g.fillStyle = "#c8d0dc"; g.fillRect(30, 50, 68, 80); g.fillStyle = "#5a6070"; g.beginPath(); g.arc(64, 82, 18, 0, TAU); g.fill(); g.fillRect(40, 104, 48, 26);
  g.fillStyle = "#7a8090"; g.fillRect(24, 146, 80, 8); g.fillRect(34, 162, 60, 6);
});

// ---------------- fix2 (Design A): the big board's brass plate, the clock over it, the loop's calendar pages ----------------
/** the engraved brass plate under the big SHARES SOLD board: the stakes in five words */
export const plateTex = () => tx("dkPlate", 1430, 190, (g, r) => {
  const W = 1430, H = 190, gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#f6d274"); gr.addColorStop(0.45, "#e2b04a"); gr.addColorStop(1, "#b88428");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  speck(g, r, W, H, 700, ["#fff2c0", "#8a5e16"], 1, 3, 0.1);
  g.strokeStyle = "#7a5212"; g.lineWidth = 6; rrect(g, 9, 9, W - 18, H - 18, 12); g.stroke();
  g.strokeStyle = "rgba(255,244,200,0.7)"; g.lineWidth = 2; rrect(g, 15, 15, W - 30, H - 30, 9); g.stroke();
  for (const [bx, by] of [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]]) { g.fillStyle = "#6a4a12"; g.beginPath(); g.arc(bx, by, 8, 0, TAU); g.fill(); g.fillStyle = "#ffe9a8"; g.beginPath(); g.arc(bx - 2, by - 2, 3, 0, TAU); g.fill(); }
  ctext(g, "J-COM: ONLY 14,500 EXIST", W / 2 + 2, 131, 104, "rgba(255,240,190,0.75)", W - 110, HEAVY);
  ctext(g, "J-COM: ONLY 14,500 EXIST", W / 2, 128, 104, "#3a2408", W - 110, HEAVY);
}, true);
/** a station clock face: white, black ticks and numerals, the hour / minute hands at 9:27 (the second hand is a mesh) */
export const bigClockTex = () => tx("dkBigClock", 600, 600, (g) => {
  const c = 300;
  g.fillStyle = "#fbf8ee"; g.beginPath(); g.arc(c, c, 300, 0, TAU); g.fill();
  g.strokeStyle = "#1a1c22"; g.lineWidth = 16; g.beginPath(); g.arc(c, c, 290, 0, TAU); g.stroke();
  for (let k = 0; k < 60; k++) {
    const a = (k / 60) * TAU, big = k % 5 === 0, r0 = big ? 232 : 256, r1 = 276;
    g.strokeStyle = "#1a1c22"; g.lineWidth = big ? 12 : 4; g.beginPath(); g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1); g.stroke();
  }
  font(g, 62, HEAVY); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#1a1c22";
  for (const [n, a] of [["12", 0], ["3", 0.25], ["6", 0.5], ["9", 0.75]] as [string, number][]) g.fillText(n, c + Math.sin(a * TAU) * 186, c - Math.cos(a * TAU) * 186 + 4);
  const hand = (a: number, len: number, w: number) => { g.strokeStyle = "#1a1c22"; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(c - Math.sin(a) * 30, c + Math.cos(a) * 30); g.lineTo(c + Math.sin(a) * len, c - Math.cos(a) * len); g.stroke(); };
  hand(((9 + 27 / 60) / 12) * TAU, 150, 20); hand((27 / 60) * TAU, 226, 13);
}, true);
/** a tear-off calendar page of the loop shot: a red header band, the year in big black figures */
export const pageTex = (year: number) => tx("dkPage" + year, 300, 360, (g, r) => {
  g.fillStyle = "#fbf7ea"; g.fillRect(0, 0, 300, 360);
  mottle(g, r, 300, 360, 14, ["#efe6cf", "#ffffff"], 20, 60, 0.12);
  g.fillStyle = "#c8281e"; g.fillRect(0, 0, 300, 84);
  for (const x of [70, 230]) { g.fillStyle = "#fbf7ea"; g.beginPath(); g.arc(x, 30, 11, 0, TAU); g.fill(); }
  ctext(g, "YEAR", 150, 70, 40, "#fff3e6", 200, HEAVY);
  ctext(g, String(year), 150, 262, 128, "#1c1a20", 270, HEAVY);
  g.strokeStyle = "#2a2630"; g.lineWidth = 8; g.strokeRect(4, 4, 292, 352);
}, true);
/** fix2 (audit 9): the boss's order slip (the readable copy stuck by the order screen): SELL 1 @ ¥610,000 */
export const slipTex = () => tx("dkSlip", 480, 300, (g) => {
  g.fillStyle = "#fbf6e4"; g.fillRect(0, 0, 480, 300);
  g.strokeStyle = "#2a2630"; g.lineWidth = 8; g.strokeRect(4, 4, 472, 292);
  g.fillStyle = "#c8352c"; g.fillRect(16, 16, 448, 54);
  ctext(g, "ORDER", 240, 60, 44, "#ffffff", 400, HEAVY);
  ctext(g, "SELL 1", 240, 168, 104, "#1e2235", 430, HEAVY);
  ctext(g, "@ ¥610,000", 240, 262, 76, "#1e2235", 430, HEAVY);
}, true);
