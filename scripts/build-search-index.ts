/**
 * Derive slim public search files from data/archive.json.
 * Does not modify data/ or public/archive/.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ArchiveRecord } from "../scrapers/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function publicUrl(local: string | null | undefined): string | null {
  if (!local) return null;
  if (local.startsWith("public/")) return "/" + local.slice("public/".length);
  if (local.startsWith("/")) return local;
  return "/" + local;
}

function figmaUrl(file: string): string {
  const trimmed = file.replace(/^figma-export\//, "");
  return "/figma-export/" + trimmed;
}

const records = JSON.parse(
  readFileSync(join(root, "data/archive.json"), "utf8"),
) as ArchiveRecord[];
const byId = new Map(records.map((r) => [r.id, r]));

const slim = records.map((r) => {
  const img = r.images?.find((i) => i.local_path)?.local_path ?? null;
  return {
    id: r.id,
    title: r.title,
    year: r.year,
    date: r.date,
    era: r.era,
    project: r.project,
    domain: r.domain,
    type: r.type,
    subtype: r.subtype,
    status: r.status,
    status_source_term: r.status_source_term,
    people: r.people ?? [],
    source_name: r.source?.name ?? null,
    source_url: r.source?.url ?? null,
    img: publicUrl(img),
    confidence: r.confidence,
  };
});

const publicDir = join(root, "public");
mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, "search-index.json"), JSON.stringify(slim));

const manifest = JSON.parse(
  readFileSync(join(root, "figma-export/manifest.json"), "utf8"),
) as {
  items: Array<{
    screen: string;
    file: string;
    record_id: string;
    record_title: string;
    source_name: string;
    source_page: string;
    original_image_url: string;
    master_local_path: string;
    intended_position_role: string;
    image_role: string;
    year: string | null;
    era: string | null;
    status: string;
    status_source_term: string;
  }>;
};

function packRecord(r: ArchiveRecord | undefined) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    year: r.year,
    domain: r.domain,
    type: r.type,
    subtype: r.subtype,
    era: r.era,
    project: r.project,
    status: r.status,
    status_source_term: r.status_source_term,
    description: r.description,
    people: r.people ?? [],
    organizations: r.organizations ?? [],
    related_records: r.related_records ?? [],
    references: r.references ?? [],
    source: r.source,
    source_claims: r.source_claims ?? [],
    confidence: r.confidence,
    images: (r.images ?? []).map((img) => ({
      local_path: publicUrl(img.local_path),
      original_url: img.original_url,
      source_page: img.source_page,
      width: img.width,
      height: img.height,
      caption: img.caption,
      role: img.role,
    })),
  };
}

const figmaItems = manifest.items.map((item) => {
  const rec = byId.get(item.record_id);
  return {
    ...item,
    src: figmaUrl(item.file),
    master_src: publicUrl(item.master_local_path),
    record: packRecord(rec),
  };
});

const glowTitle = records.filter((r) =>
  /glow in the dark/i.test(r.title),
);

function packAxis(r: ArchiveRecord) {
  return {
    id: r.id,
    title: r.title,
    year: r.year,
    date: r.date,
    type: r.type,
    subtype: r.subtype,
    status: r.status,
    status_source_term: r.status_source_term,
    era: r.era,
    project: r.project,
    domain: r.domain,
    source: r.source,
    img: publicUrl(r.images?.find((i) => i.local_path)?.local_path ?? null),
  };
}

const musicAxis = {
  demo: records
    .filter(
      (r) =>
        r.domain === "MUSIC" &&
        (r.type === "stems" ||
          /BEAT ONLY|NEVER RECORDED|DEMO/i.test(String(r.status))),
    )
    .slice(0, 24)
    .map(packAxis),
  version: records
    .filter(
      (r) =>
        r.domain === "MUSIC" &&
        (r.type === "main" || /OG FILE|PARTIAL|TAGGED/i.test(String(r.status))),
    )
    .slice(0, 24)
    .map(packAxis),
  release: records
    .filter(
      (r) =>
        r.domain === "MUSIC" &&
        (r.type === "released" ||
          r.status === "RELEASED" ||
          r.status === "REALIZED"),
    )
    .slice(0, 24)
    .map(packAxis),
};

const yeezusByDomain: Record<string, ReturnType<typeof packAxis>[]> = {};
for (const r of records) {
  const blob = `${r.era ?? ""} ${r.project ?? ""} ${r.title ?? ""}`;
  if (!/yeezus/i.test(blob)) continue;
  const key = r.domain;
  if (!yeezusByDomain[key]) yeezusByDomain[key] = [];
  if (yeezusByDomain[key].length < 8) yeezusByDomain[key].push(packAxis(r));
}

const curated = {
  generated_at: new Date().toISOString(),
  note: "Derived from scrape. Do not treat as new facts.",
  figma: figmaItems,
  glow: {
    primary_id: "yetracker-3b678731de5e1b3a",
    records: glowTitle.map((r) => packRecord(r)),
  },
  fashion_id: "yzylibrary-c5ad330858772531",
  music_axis: musicAxis,
  yeezus_domains: yeezusByDomain,
  domains: [...new Set(records.map((r) => r.domain))].sort(),
  record_count: records.length,
};

const srcData = join(root, "src/data");
mkdirSync(srcData, { recursive: true });
writeFileSync(join(srcData, "curated.json"), JSON.stringify(curated, null, 2));

console.log(
  JSON.stringify({
    search_index: slim.length,
    search_bytes: JSON.stringify(slim).length,
    figma_items: figmaItems.length,
    glow: glowTitle.length,
    yeezus_domains: Object.fromEntries(
      Object.entries(yeezusByDomain).map(([k, v]) => [k, v.length]),
    ),
  }),
);
