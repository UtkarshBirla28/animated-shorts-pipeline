// KIT / HOME (owner HOME_LAB): home + lab props and night-interior life. See NOTES.md.
export * from "./util";
export { wallClock, type ClockOpts } from "./clock";
export { keyRing, type KeyRingOpts, type KeyKick } from "./keys";
export { apartmentDoor, type DoorOpts } from "./door";
export { counterRun, gasHob, rangeHood, kettle, fridge, dishRack, coirMat, coatHook, hoodLamp, type CounterOpts, type HobOpts } from "./kitchen";
export { nightCity, curtain, headlightSweep, moth, type NightCityOpts, type CurtainOpts, type SweepOpts } from "./night";
export { workTable, taskBoard, cable, cableCover, ballSim, redBalls, staticBalls, ballTray, whiteboard, binderShelf, pinboard, ceilingPanel, wainscot, conduit,
  LAMP_RGB, type LampState, type TaskBoardOpts, type BallDrop, type JarSpace, type BallTrack } from "./lab";
export { jarGlass, glassJar, glassShadow, jarStation, dropsForImpacts, drawPictogram, type GlassOpts, type JarOpts, type JarIcon, type StationOpts } from "./jars";
