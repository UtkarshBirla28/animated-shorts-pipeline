// kit/vehicles (TRAIN owner): re-exports. See NOTES.md.
export { trainJP, doorCycle, departRun, arriveRun, type TrainJPOpts, type TrainDoors, type DoorSide } from "./train_jp";
export { interiorJP, carSway, type InteriorJPOpts } from "./interior_jp";
export { cabJP, CAB, type CabJPOpts } from "./cab_jp";
export { suitcase, SUITCASE, type SuitcaseOpts } from "./suitcase";
export { lampBeacon, type BeaconOpts } from "./beacon";
export { D, FACE, DOORS_CAB, DOORS_MID, BOGIES_CAB, BOGIES_MID, windowsOf } from "./dims";
export { vmat, glass, lamp, smudgeMap, carEnv, cabEnv, roomEnv, ownEnv, PAL } from "./mats";
