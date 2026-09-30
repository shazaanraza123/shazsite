/**
 * Quality-derived indexes, people normalization, search index, record shards.
 * Does not modify data/archive.json or public/archive/.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ArchiveRecord } from "../scrapers/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const records = JSON.parse(
  readFileSync(join(root, "data/archive.json"), "utf8"),
) as ArchiveRecord[];
const idSet = new Set(records.map((r) => r.id));

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
    .slice(0, 72);
  return s || "untitled";
}

function yearOf(r: ArchiveRecord): string | null {
  if (r.year && /^\d{4}$/.test(String(r.year).trim())) return String(r.year).trim();
  const m = String(r.date ?? "").match(/(19|20)\d{2}/);
  return m ? m[0] : null;
}

type RoleHint = { record_id: string; original_url: string; editorial_role: string; rank: number };
const roleFile = (() => {
  try {
    return JSON.parse(readFileSync(join(root, "data/image-roles.json"), "utf8")) as {
      images: RoleHint[];
    };
  } catch {
    return { images: [] as RoleHint[] };
  }
})();
const roleMap = new Map<string, RoleHint>();
for (const row of roleFile.images) {
  roleMap.set(`${row.record_id}|${row.original_url}`, row);
}

function roleFor(recordId: string, originalUrl: string): RoleHint | undefined {
  return roleMap.get(`${recordId}|${originalUrl}`);
}

function rankedLocals(r: ArchiveRecord) {
  return (r.images ?? [])
    .filter((i) => i.local_path)
    .slice()
    .sort((a, b) => {
      const ra = roleFor(r.id, a.original_url)?.rank ?? (a.role === "primary" ? 6 : 5);
      const rb = roleFor(r.id, b.original_url)?.rank ?? (b.role === "primary" ? 6 : 5);
      if (rb !== ra) return rb - ra;
      return (b.width ?? 0) - (a.width ?? 0);
    });
}

function firstImg(r: ArchiveRecord): string | null {
  return publicUrl(rankedLocals(r)[0]?.local_path ?? null);
}

const SENTENCE = /cover art for|featuring kanye|posted by|designed by the/i;

/** Split people only on clear structural separators. Preserve original on the record. */
export function splitPeople(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  if (SENTENCE.test(t) && t.split(/\s+/).length > 8) return [];
  const protectedStr = t.replace(/,\s*Inc\.?/gi, " Inc.");
  const parts = protectedStr
    .split(/\s*(?:&|,|\band\b|\/)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const names: string[] = [];
  for (const p of parts) {
    const words = p.split(/\s+/);
    if (words.length === 0 || words.length > 6) continue;
    if (/^inc\.?$/i.test(p)) continue;
    names.push(p);
  }
  if (names.length) return names;
  if (t.split(/\s+/).length <= 6 && !SENTENCE.test(t)) return [t];
  return [];
}

function shardKey(id: string): string {
  const hex = id.includes("-") ? id.slice(id.lastIndexOf("-") + 1) : id;
  return hex.slice(0, 2).toLowerCase().replace(/[^0-9a-f]/g, "0").padEnd(2, "0");
}

type Person = {
  slug: string;
  display_name: string;
  aliases: string[];
  original_fields: string[];
  record_count: number;
  record_ids: string[];
  domains: string[];
  years: string[];
};

const peopleMap = new Map<string, Person>();

function addPerson(display: string, original: string, rec: ArchiveRecord) {
  const key = display.toLowerCase();
  let p = peopleMap.get(key);
  if (!p) {
    p = {
      slug: slugify(display),
      display_name: display,
      aliases: [],
      original_fields: [],
      record_count: 0,
      record_ids: [],
      domains: [],
      years: [],
    };
    peopleMap.set(key, p);
  }
  if (!p.original_fields.includes(original)) p.original_fields.push(original);
  if (!p.record_ids.includes(rec.id)) {
    p.record_ids.push(rec.id);
    p.record_count += 1;
  }
  if (rec.domain && !p.domains.includes(rec.domain)) p.domains.push(rec.domain);
  const y = yearOf(rec);
  if (y && !p.years.includes(y)) p.years.push(y);
}

for (const r of records) {
  for (const raw of r.people ?? []) {
    if (typeof raw !== "string") continue;
    const parts = splitPeople(raw);
    if (!parts.length) continue;
    for (const part of parts) addPerson(part, raw, r);
  }
}

const slugUsed = new Set<string>();
const people = [...peopleMap.values()]
  .sort((a, b) => b.record_count - a.record_count || a.display_name.localeCompare(b.display_name))
  .map((p) => {
    let slug = p.slug;
    if (slugUsed.has(slug)) slug = `${slug}-${p.record_count}`;
    slugUsed.add(slug);
    p.years.sort();
    return { ...p, slug };
  });

writeFileSync(
  join(root, "data/people-normalized.json"),
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      note: "Derived. archive.json people[] left unchanged. Ye and Kanye West are not merged.",
      people,
    },
    null,
    2,
  ),
);

const years: Record<string, { count: number; domains: Record<string, number>; with_image: number }> = {};
const domains: Record<string, { count: number; types: Record<string, number>; with_image: number }> = {};
const projects: Record<string, { count: number; domains: Record<string, number>; years: Record<string, number> }> = {};
const eras: Record<string, { count: number }> = {};
const statuses: Record<string, { count: number }> = {};

for (const r of records) {
  const y = yearOf(r);
  if (y) {
    years[y] ??= { count: 0, domains: {}, with_image: 0 };
    years[y].count += 1;
    years[y].domains[r.domain] = (years[y].domains[r.domain] ?? 0) + 1;
    if (firstImg(r)) years[y].with_image += 1;
  }
  domains[r.domain] ??= { count: 0, types: {}, with_image: 0 };
  domains[r.domain].count += 1;
  domains[r.domain].types[r.type] = (domains[r.domain].types[r.type] ?? 0) + 1;
  if (firstImg(r)) domains[r.domain].with_image += 1;
  if (r.project) {
    projects[r.project] ??= { count: 0, domains: {}, years: {} };
    projects[r.project].count += 1;
    projects[r.project].domains[r.domain] = (projects[r.project].domains[r.domain] ?? 0) + 1;
    if (y) projects[r.project].years[y] = (projects[r.project].years[y] ?? 0) + 1;
  }
  if (r.era) {
    eras[r.era] ??= { count: 0 };
    eras[r.era].count += 1;
  }
  if (r.status) {
    statuses[r.status] ??= { count: 0 };
    statuses[r.status].count += 1;
  }
}

const WORK_DEFS = [
  { slug: "yeezus", label: "Yeezus", project: ["Yeezus", "Yeezus 2"], era: ["Yeezus"] },
  { slug: "808s-heartbreak", label: "808s & Heartbreak", project: ["808s & Heartbreak"], era: ["808s & Heartbreak"] },
  { slug: "the-college-dropout", label: "The College Dropout", project: ["The College Dropout", "Before The College Dropout"], era: ["The College Dropout", "Before The College Dropout"] },
  { slug: "late-registration", label: "Late Registration", project: ["Late Registration"], era: ["Late Registration"] },
  { slug: "graduation", label: "Graduation", project: ["Graduation"], era: ["Graduation"] },
  { slug: "donda", label: "Donda", project: ["DONDA 2 [V1]", "DONDA [V1]", "Donda [V3]", "Donda [V2]", "Donda"], era: ["Donda", "DONDA"] },
  { slug: "the-life-of-pablo", label: "The Life Of Pablo", project: ["The Life Of Pablo"], era: ["The Life Of Pablo"] },
  { slug: "jesus-is-king", label: "Jesus Is King", project: ["JESUS IS KING", "Jesus Is King"], era: ["Jesus Is King"] },
  { slug: "yeezy-season", label: "Yeezy Season", project: ["Yeezy Season"], era: ["Yeezy Season"] },
  { slug: "yzy-gap", label: "YZY GAP", project: ["YZY GAP", "YZY GAP Engineered by Balenciaga"], era: ["YZY GAP"] },
  { slug: "vultures", label: "Vultures", project: ["VULTURES 1", "VULTURES 2", "Vultures"], era: ["Vultures"] },
  { slug: "glow-in-the-dark", label: "Glow In The Dark", titleIncludes: ["Glow In The Dark", "Glow in the Dark"] },
] as const;

const works = WORK_DEFS.map((w) => {
  let count = 0;
  const domainCounts: Record<string, number> = {};
  const yearCounts: Record<string, number> = {};
  for (const r of records) {
    const hit =
      ("project" in w && w.project?.includes(r.project ?? "")) ||
      ("era" in w && w.era?.includes(r.era ?? "")) ||
      ("titleIncludes" in w &&
        w.titleIncludes?.some((t) => (r.title ?? "").includes(t)));
    if (!hit) continue;
    count += 1;
    domainCounts[r.domain] = (domainCounts[r.domain] ?? 0) + 1;
    const y = yearOf(r);
    if (y) yearCounts[y] = (yearCounts[y] ?? 0) + 1;
  }
  return { ...w, count, domains: domainCounts, years: yearCounts };
}).filter((w) => w.count > 0);

const publicIndex = join(root, "public/index");
mkdirSync(publicIndex, { recursive: true });

writeFileSync(
  join(publicIndex, "years.json"),
  JSON.stringify({
    years: Object.entries(years)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, v]) => ({ year, ...v })),
  }),
);
writeFileSync(
  join(publicIndex, "domains.json"),
  JSON.stringify({
    domains: Object.entries(domains)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([domain, v]) => ({
        domain,
        slug: slugify(domain),
        ...v,
        types: Object.entries(v.types)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => ({ type, count })),
      })),
  }),
);
writeFileSync(
  join(publicIndex, "projects.json"),
  JSON.stringify({
    works,
    projects: Object.entries(projects)
      .filter(([, v]) => v.count >= 20)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([project, v]) => ({
        project,
        slug: slugify(project),
        count: v.count,
        domains: v.domains,
        years: v.years,
      })),
  }),
);
writeFileSync(
  join(publicIndex, "people.json"),
  JSON.stringify({
    people: people.map((p) => ({
      slug: p.slug,
      display_name: p.display_name,
      record_count: p.record_count,
      domains: p.domains,
      years: p.years,
      aliases: p.aliases,
      original_fields: p.original_fields,
    })),
  }),
);
writeFileSync(
  join(publicIndex, "status.json"),
  JSON.stringify({
    statuses: Object.entries(statuses)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([status, v]) => ({ status, count: v.count })),
    eras: Object.entries(eras)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 80)
      .map(([era, v]) => ({ era, count: v.count })),
  }),
);

const slim = records.map((r) => ({
  id: r.id,
  title: r.title,
  year: yearOf(r),
  date: r.date,
  era: r.era,
  project: r.project,
  domain: r.domain,
  type: r.type,
  subtype: r.subtype,
  status: r.status,
  status_source_term: r.status_source_term,
  people: r.people ?? [],
  names: (r.people ?? []).flatMap((p) => (typeof p === "string" ? splitPeople(p) : [])),
  source_name: r.source?.name ?? null,
  source_url: r.source?.url ?? null,
  img: firstImg(r),
  desc: (r.description ?? "").slice(0, 220),
  confidence: r.confidence,
}));
writeFileSync(join(root, "public/search-index.json"), JSON.stringify(slim));

const shards = new Map<string, object[]>();
for (const r of records) {
  const key = shardKey(r.id);
  const row = {
    id: r.id,
    title: r.title,
    date: r.date,
    year: yearOf(r),
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
    related_records: (r.related_records ?? []).filter((id) => idSet.has(id)),
    related_unresolved: (r.related_records ?? []).filter((id) => !idSet.has(id)).length,
    references: r.references ?? [],
    source: r.source,
    source_claims: (r.source_claims ?? []).filter((c) => c.field !== "headers"),
    confidence: r.confidence,
    images: rankedLocals(r).map((i) => ({
        local_path: publicUrl(i.local_path),
        original_url: i.original_url,
        source_page: i.source_page,
        caption: i.caption,
        role: i.role,
        editorial_role: roleFor(r.id, i.original_url)?.editorial_role ?? i.role,
        width: i.width,
        height: i.height,
      })),
  };
  const list = shards.get(key) ?? [];
  list.push(row);
  shards.set(key, list);
}

const recDir = join(root, "public/records");
rmSync(recDir, { recursive: true, force: true });
mkdirSync(recDir, { recursive: true });
for (const [key, list] of shards) {
  writeFileSync(join(recDir, `${key}.json`), JSON.stringify(list));
}

console.log(
  JSON.stringify({
    people: people.length,
    years: Object.keys(years).length,
    domains: Object.keys(domains).length,
    works: works.map((w) => [w.slug, w.count]),
    projects_indexed: Object.keys(projects).filter((k) => projects[k].count >= 20).length,
    search_bytes: JSON.stringify(slim).length,
    shards: shards.size,
  }),
);
