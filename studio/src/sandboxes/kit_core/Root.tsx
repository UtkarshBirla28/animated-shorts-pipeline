import React from "react";
import { KitComposition, type KitFrameInfo } from "../../kit/core/pipeline";
import { FILM, RIG_SHEET, ROOM, PHONE, LIGHTS, BLINK } from "./film";
import { RecordUI, recTimer } from "../../kit/core/phone_ui";

// overlay hook test: a React DOM label above the canvas (the captions pattern of the old films)
const Label: React.FC<{ f: KitFrameInfo }> = ({ f }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 1660, textAlign: "center", fontFamily: "sans-serif", fontWeight: 800, fontSize: 40,
    color: "#fff", textShadow: "0 3px 6px rgba(0,0,0,0.8)" }}>{`${f.shot.id} · ${f.shot.rig} · f${f.frame} · ${f.quality}`}</div>
);
const overlay = (f: KitFrameInfo) => <Label f={f} />;
// the full-frame phone POV gets the record UI (the same drawing as the phone screen's)
const recT = recTimer(0, 12);
const phoneOverlay = (f: KitFrameInfo) => (f.shot.id === "p1" ? <RecordUI t={f.t} timer={recT} /> : null);
// KIT CORE sandbox: ENTRY=src/sandboxes/kit_core/index.ts COMP=KitCore | KitCoreRigs | KitCoreRoom | KitCorePhone | KitCoreLights | KitCoreBlink
export const Root: React.FC = () => (
  <>
    <KitComposition id="KitCore" film={FILM} quality="preview" overlay={overlay} />
    <KitComposition id="KitCoreRigs" film={RIG_SHEET} quality="preview" />
    <KitComposition id="KitCoreRoom" film={ROOM} quality="preview" />
    <KitComposition id="KitCorePhone" film={PHONE} quality="preview" overlay={phoneOverlay} />
    <KitComposition id="KitCoreLights" film={LIGHTS} quality="draft" />
    <KitComposition id="KitCoreBlink" film={BLINK} quality="draft" />
  </>
);
