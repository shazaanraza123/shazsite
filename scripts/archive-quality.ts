/**
 * Quality report + derived indexes + people normalization.
 * Does not modify data/archive.json or public/archive/.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ArchiveRecord } from "../scrapers/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const records = JSON.parse(
  readFileSync(join(root, "data/archive.json"), "utf8"),
) as ArchiveRecord[];

function bump(map: Record<string, number>, key: string | null | undefined) {
  const k = (key ?? "").trim() || "(empty)";
  map[k] = (map[k] ?? 0) + 1;
}

function publicUrl(local: string | null | undefined): string | null {
  if (!local) return null;
  if (local.startsWith("public/")) return "/" + local.slice("public/".length);
  if (local.startsWith("/")) return local;
  return "/" + local;
}

function slugify(input: string): string {
  const s = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || "untitled";
}

function yearOf(r: ArchiveRecord): string | null {
  if (r.year && /^\d{4}$/.test(r.year.trim())) return r.year.trim();
  const d = r.date ?? "";
  const m = d.match(/(19|20)\d{2}/);
  return m ? m[0] : null;
}

const byDomain: Record<string, number> = {};
const byYear: Record<string, number> = {};
const byStatus: Record<string, number> = {};
const bySource: Record<string, number> = {};
const byType: Record<string, number> = {};
const bySubtype: Record<string, number> = {};
const byDomainType: Record<string, Record<string, number>> = {};
const byProject: Record<string, number> = {};
const byEra: Record<string, number> = {};

let withImage = 0;
let withPeople = 0;
let withProject = 0;
let withEra = 0;
let withDate = 0;
let withYear = 0;
let withDescription = 0;
let missingDomain = 0;
let missingTitle = 0;
let malformedPeople = 0;
const malformedPeopleSamples: { id: string; people: unknown }[] = [];
const unclassifiedTypes: Record<string, number> = {};
const titleCounts = new Map<string, string[]>();

const knownDomains = new Set([
  "MUSIC",
  "FASHION",
  "PERFORMANCE",
  "FILM",
  "DESIGN",
  "ARCHITECTURE",
  "PHOTOGRAPHY",
  "WRITING",
  "SOCIAL",
  "PEOPLE",
  "OBJECTS",
  "EVENTS",
  "REFERENCES",
  "EPHEMERA",
  "UNRELEASED/UNREALIZED",
]);

for (const r of records) {
  bump(byDomain, r.domain);
  bump(byYear, yearOf(r) ?? "(none)");
  bump(byStatus, r.status);
  bump(bySource, r.source?.name);
  bump(byType, r.type);
  bump(bySubtype, r.subtype);
  bump(byProject, r.project);
  bump(byEra, r.era);
  if (!byDomainType[r.domain]) byDomainType[r.domain] = {};
  bump(byDomainType[r.domain], r.type);

  if (r.images?.some((i) => i.local_path)) withImage += 1;
  if ((r.people ?? []).some((p) => String(p).trim())) withPeople += 1;
  if (r.project) withProject += 1;
  if (r.era) withEra += 1;
  if (r.date) withDate += 1;
  if (yearOf(r)) withYear += 1;
  if (r.description) withDescription += 1;
  if (!r.domain || !knownDomains.has(r.domain)) missingDomain += 1;
  if (!r.title?.trim()) missingTitle += 1;

  const people = r.people;
  if (people && !Array.isArray(people)) {
    malformedPeople += 1;
    if (malformedPeopleSamples.length < 12) {
      malformedPeopleSamples.push({ id: r.id, people });
    }
  } else if (Array.isArray(people)) {
    for (const p of people) {
      if (typeof p !== "string") {
        malformedPeople += 1;
        if (malformedPeopleSamples.length < 12) {
          malformedPeopleSamples.push({ id: r.id, people });
        }
        break;
      }
    }
  }

  if (r.type && /[^a-z0-9 \/_-]/i.test(r.type) && r.type.length > 40) {
    bump(unclassifiedTypes, r.type);
  }

  const t = (r.title ?? "").trim().toLowerCase();
  if (t) {
    const ids = titleCounts.get(t) ?? [];
    ids.push(r.id);
    titleCounts.set(t, ids);
  }
}

const duplicateTitles = [...titleCounts.entries()]
  .filter(([, ids]) => ids.length > 1)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 80)
  .map(([title, ids]) => ({ title, count: ids.length, sample_ids: ids.slice(0, 6) }));

const sortCounts = (map: Record<string, number>) =>
  Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]));

const supportedMediums = Object.entries(byDomain)
  .filter(([d, n]) => n > 0 && d !== "(empty)")
  .map(([d, n]) => ({ domain: d, count: n, types: sortCounts(byDomainType[d] ?? {}) }));

const quality = {
  generated_at: new Date().toISOString(),
  totals: {
    records: records.length,
    with_local_image: withImage,
    without_local_image: records.length - withImage,
    with_people: withPeople,
    with_project: withProject,
    with_era: withEra,
    with_date: withDate,
    with_year: withYear,
    with_description: withDescription,
    missing_or_unknown_domain: missingDomain,
    missing_title: missingTitle,
    malformed_people_records: malformedPeople,
    duplicate_title_groups: duplicateTitles.length,
  },
  by_domain: sortCounts(byDomain),
  by_year: sortCounts(byYear),
  by_status: sortCounts(byStatus),
  by_source: sortCounts(bySource),
  by_type: sortCounts(byType),
  by_subtype: Object.fromEntries(
    Object.entries(sortCounts(bySubtype)).slice(0, 80),
  ),
  by_era_top: Object.fromEntries(Object.entries(sortCounts(byEra)).slice(0, 60)),
  by_project_top: Object.fromEntries(
    Object.entries(sortCounts(byProject)).slice(0, 80),
  ),
  supported_mediums: supportedMediums,
  duplicate_titles_top: duplicateTitles,
  malformed_people_samples: malformedPeopleSamples,
  unclassified_long_types: sortCounts(unclassifiedTypes),
  browsing: {
    domains: Object.keys(byDomain).filter((d) => d !== "(empty)" && byDomain[d] > 0),
    years: Object.keys(byYear)
      .filter((y) => /^\d{4}$/.test(y))
      .sort(),
    statuses: Object.keys(byStatus).filter((s) => s !== "(empty)"),
    note: "Only categories with count > 0 are browsable. Do not invent empty mediums.",
  },
};

writeFileSync(
  join(root, "data/archive-quality-report.json"),
  JSON.stringify(quality, null, 2),
);

console.log(
  JSON.stringify(
    {
      records: records.length,
      with_image: withImage,
      with_people: withPeople,
      with_project: withProject,
      with_year: withYear,
      domains: sortCounts(byDomain),
      years: Object.keys(byYear).filter((y) => /^\d{4}$/.test(y)).length,
      statuses: Object.keys(byStatus).length,
      duplicate_title_groups: duplicateTitles.length,
      malformed_people: malformedPeople,
    },
    null,
    2,
  ),
);
