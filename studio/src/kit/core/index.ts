// REAL-WORLD KIT core: one import for builders and films (see NOTES.md for the API).
export * from "./ctx";
export { KitFilm, KitComposition, useKitFrame, shotIndexAt, excludeFromCardShadow, QUALITY, QUALITY_SCALE, LIGHT_BUDGET, summarizeFilm, checkFilm, lensMM } from "./pipeline";
export type { KitFrameInfo, KitFilmProps, KitProps, KitShotInfo, QualitySpec } from "./pipeline";
export { KIT_SEED, KIT_TAPS, seeded, seedAll, patchShadowChunk, KitGrade } from "./shaders";
export { makeAssets, assetStats, gltfRaw, pbrRepeat, exists } from "./assets";
export { RIGS, DEFAULT_RIG, resolveRig, sunDirOf, sunColorOf, kelvin, srgb, practical, PRACTICAL_UNIT, scanSky } from "./rigs";
export { makeGI, bakeProbe, setGroundBounce, probeBounce } from "./gi";
export * from "./camera";
export { screen, screenOnly, mainOnly, LAYER_SCREEN_ONLY, LAYER_MAIN_ONLY } from "./screen";
export type { ScreenSpec, Screen } from "./screen";
export { RecordUI, drawRecordUI, recTimer } from "./phone_ui";
export type { RecordUIOpts } from "./phone_ui";
export { PROC_ENVS, envTexture } from "./rigs";
