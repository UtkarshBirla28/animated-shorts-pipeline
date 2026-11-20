// TOKYO (owner TOKYO): the 2005 street in front of the exchange (tokyo_street.ts, shot 2) + the exchange lobby with the
// round glass ticker drum, the debut bell, the museum pedestal and the shot-7 tower (tokyo_lobby.ts, shots 3 / 4 / 7 / 9).
// Painters: tokyo_paint.ts. Pose is a pure function of (shot, frame).
import * as THREE from "three";
import type { SetCtx } from "./ctx";
import type { Kit } from "./build";
import type { Lighting, SetModule } from "./sets";
import { TokyoStreet } from "./tokyo_street";
import { TokyoLobby } from "./tokyo_lobby";

export class TokyoSet implements SetModule {
  readonly sets = ["street" as const, "lobby" as const];
  readonly group = new THREE.Group();
  private street = new TokyoStreet(); private lobby = new TokyoLobby();
  constructor(_kit: Kit) {
    this.group.add(this.street.group, this.lobby.group);
  }
  pose(ctx: SetCtx, L: Lighting) {
    const st = ctx.shot.set === "street", lb = ctx.shot.set === "lobby";
    this.street.group.visible = st; this.lobby.group.visible = lb;
    if (st) this.street.pose(ctx, L);
    if (lb) this.lobby.pose(ctx, L);
  }
}
