// THE FILM'S ACTING AS A STORYBOARD (owner CAST; not part of the film): every row of beats.ts for one hero, drawn at its
// key frame with the film's REAL timing (timing.ts: the voice's words; shots.ts: the shot table). Read it after every
// re-time / script change: a red line = a beat that does not line up (its word is not in the script, a call whose two
// words are too close for the ear hold, a point under 12 f).
//   COMP=PointingCastBeats ENTRY=src/videos3/pointing/cast/bench/beats_index.ts  frame 0 driver, 1 tourist, 2 kid
// This entry imports the shot table (shots -> cams -> sets), so it needs every owner's set files to bundle; the
// character sheet (index.ts) does not.
import React, { useLayoutEffect, useRef, useState } from "react";
import { useCurrentFrame, delayRender, continueRender } from "remotion";
import { SW, SH, grid, title, label, envAt, KIDK, type Cell } from "./Sheet";
import { filmBeats, beatReport, shotAt } from "../acting";
import { voiceSource, mouthAt, getToks, type Speaker } from "../timing";
import { actBeats } from "../moves";
import type { Who } from "../people";
import type { P2 } from "../../../../videos/clown/toon";

const HEROES: Who[] = ["driver", "tourist", "kid"];
const V = { s: 0.55, c: 0.83 };
export const Beats: React.FC = () => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender("cast beats"));
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#2a2430"; g.fillRect(0, 0, SW, SH);
    const who = HEROES[Math.min(HEROES.length - 1, Math.max(0, Math.floor(f)))], T = filmBeats(), mine = T.filter((t) => t.b.who === who), rep = beatReport().filter((r) => r.startsWith(who));
    title(g, `POINTING · ${who.toUpperCase()}: the ${mine.length} beats of beats.ts on the "${voiceSource()}" timing (${getToks().length} script words) · ${rep.length ? rep.length + " do not line up" : "all line up"}`);
    const aim: P2 = who === "tourist" ? [600, 760] : [640, 330], look: P2 = [640, 560];
    const cells: Cell[] = mine.filter((t) => t.ok).slice(0, 40).map((t) => {
      const b = t.b, fr = Math.round(b.m === "call" ? t.call!.status + 3 : t.f0 + Math.min(12, 0.5 * (t.f1 - t.f0)));
      const e = envAt(who, V, fr, { aim, look, seat: who === "driver" ? 0.47 : undefined });
      const cue = b.m === "call" ? `${b.name}>${b.status}` : String(b.at);
      return { label: `${shotAt(Math.max(0, fr)).id} f${fr} ${b.m} ${cue}`.slice(0, 30), who, k: (who === "kid" ? KIDK : 0.47) * Math.min(1, 3.1 / Math.max(2, Math.ceil(mine.length / 8))),
        P: { ...V, ...actBeats(who, T, e, { mouth: mouthAt(who as Speaker, fr / 30).mouth }) } };
    });
    grid(g, cells, 8, Math.max(2, Math.ceil(cells.length / 8)), 0, 60, SW, SH - 60 - 26 * Math.min(6, rep.length + 1));
    g.fillStyle = "#1c1820"; g.fillRect(0, SH - 26 * Math.min(6, rep.length + 1), SW, 200);
    (rep.length ? rep : ["beatReport(): every beat lines up with the script and the voice"]).slice(0, 6).forEach((r, i) => { g.font = "bold 19px Arial"; g.fillStyle = rep.length ? "#ff6a5a" : "#9be29b"; g.fillText(r.slice(0, 230), 14, SH - 26 * Math.min(6, rep.length + 1) + 20 + 26 * i); });
    void label; continueRender(h);
  }, [f, h]);
  return <canvas ref={ref} width={SW} height={SH} style={{ width: SW, height: SH }} />;
};
