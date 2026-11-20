// set "path": the look pilot's campus path (a copy, see pilot_world.ts) as a kit SetBuilder
import type { SetBuilder } from "../../../kit/core/ctx";
import { buildPilotSet } from "./pilot_world";
export const buildPath: SetBuilder = (ctx) => buildPilotSet(ctx);
