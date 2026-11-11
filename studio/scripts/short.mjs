// Which short is current? Same rule as tools/short_cfg.py:
//   env SHORT / COMPFILE  ->  ../.short.json {"slug","comp"} (tools/new_short.py writes it)  ->  "antitheft" / "AntiTheft".
// import { SHORT, COMPFILE, COMP_ID, FRAMES_CONST } from "./short.mjs"
// shell:  eval "$(node scripts/short.mjs --sh)"   -> exports SHORT, COMPFILE, COMP_ID, FRAMES_CONST
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cfgPath = path.resolve(here, "../../.short.json");
const d = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, "utf8")) : {};
export const SHORT = process.env.SHORT || d.slug || "antitheft";
export const COMPFILE = process.env.COMPFILE || d.comp || (SHORT === "antitheft" ? "AntiTheft" : SHORT.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(""));
export const COMP_ID = `${COMPFILE}Short`;
export const FRAMES_CONST = `${COMPFILE.toUpperCase()}_FRAMES`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes("--sh")) {
  console.log(`export SHORT=${SHORT} COMPFILE=${COMPFILE} COMP_ID=${COMP_ID} FRAMES_CONST=${FRAMES_CONST}`);
}
