// NATURE: trees, plants, grass + weeds, hedges + bushes, flowers, ground scatter (litter), shared wind
export { buildTrees, tree, sunGap, TREE_SPECIES, type TreeSpec, type TreeSpeciesId } from "./trees";
export { plants, PLANT_MODELS, type PlantModel, type PlantPoint, type PlantOpts } from "./plants";
export { grass, weeds, grassMaterial, type GrassOpts } from "./grass";
export { hedge, bushes, type HedgeOpts } from "./hedge";
export { flowers, type FlowerKind, type FlowerOpts } from "./flowers";
export { scatter, scatterPoints, vnoise, leafAtlas, type Area, type Avoid, type ScatterOpts, type ScatterKitOpts, type LitterKind, type XZ } from "./ground_scatter";
export { WIND } from "./wind";
