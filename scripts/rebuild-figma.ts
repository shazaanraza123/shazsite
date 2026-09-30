import { readFile } from "node:fs/promises";
import { buildFigmaExport } from "./figma-export.ts";

const recs = JSON.parse(await readFile("data/archive.json", "utf8"));
await buildFigmaExport(recs);
console.log("figma rebuild done, records=", recs.length);
