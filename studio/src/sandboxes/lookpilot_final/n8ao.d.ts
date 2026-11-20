// minimal typing for n8ao 1.10.3 (the package ships plain JS)
declare module "n8ao" {
  import type { Pass } from "postprocessing";
  import type { Scene, Camera, Color } from "three";
  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: { aoSamples: number; aoRadius: number; denoiseSamples: number; denoiseRadius: number; distanceFalloff: number; intensity: number;
      halfRes: boolean; gammaCorrection: boolean; screenSpaceRadius: boolean; depthAwareUpsampling: boolean; color: Color; [k: string]: unknown };
    setSize(w: number, h: number): void;
  }
}
