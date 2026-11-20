import React from "react";
import { KitComposition } from "../../kit/core/pipeline";
import { LAB_FILM } from "./film";
import { HOOK_FILM } from "./film_hook";
// LAB sandbox (ENTRY=src/sandboxes/kit_home/index.ts), independent of the film's shot table and of the other sets:
//   KitHomeLab  = the v3 lab's ONE picture on script v3's lengths: use A (the EYE half), a short gap, use B (the FINGER half).
//   KitHomeHook = the v4 HOOK (the big lamp, the one button, the seven Go's, the red, the X) + the loop shot (film_hook.ts).
export const Root: React.FC = () => (<>
  <KitComposition id="KitHomeLab" film={LAB_FILM} quality="draft" />
  <KitComposition id="KitHomeHook" film={HOOK_FILM} quality="draft" />
</>);
