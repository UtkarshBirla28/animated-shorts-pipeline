// SURFACES proof film: three stills sets. (a) path [0,150) at the pilot camera, (b) street corner [150,160), (c) room [160,170)
import type { Film } from "../../kit/core/ctx";
import { buildPathSet, pilotCam } from "./set_path";
import { buildStreetSet, streetCam } from "./set_street";
import { buildRoomSet, roomCam, ROOM_RIG } from "./set_room";
import { buildTrainSet, trainCam } from "./set_train";
export const FILM: Film = {
  slug: "kit_surfaces", fps: 30, total: 180,
  sets: { path: buildPathSet, street: buildStreetSet, room: buildRoomSet, train: buildTrainSet },
  shots: [
    { id: "path", from: 0, to: 150, set: "path", rig: "golden", cam: pilotCam },
    { id: "street", from: 150, to: 160, set: "street", rig: "golden", cam: streetCam, rigOpts: { sunAz: 70, sunEl: 30 } },
    { id: "room", from: 160, to: 170, set: "room", rig: "interiorWarm", cam: roomCam, rigOpts: ROOM_RIG },
    { id: "train", from: 170, to: 180, set: "train", rig: "golden", cam: trainCam, rigOpts: { sunAz: 60, sunEl: 32 } },
  ],
};
