import curatedJson from "../data/curated.json";

export type SearchHit = {
  id: string;
  title: string;
  year: string | null;
  date: string | null;
  era: string | null;
  project: string | null;
  domain: string;
  type: string;
  subtype: string | null;
  status: string;
  status_source_term: string | null;
  people: string[];
  source_name: string | null;
  source_url: string | null;
  img: string | null;
  confidence: "high" | "medium" | "low";
};

export type PackedRecord = {
  id: string;
  title: string;
  date: string | null;
  year: string | null;
  domain: string;
  type: string;
  subtype: string | null;
  era: string | null;
  project: string | null;
  status: string;
  status_source_term: string | null;
  description: string | null;
  people: string[];
  organizations: string[];
  related_records: string[];
  references: string[];
  source: { name: string; url: string };
  source_claims: {
    field: string;
    value: string;
    source_name: string;
    source_url: string;
  }[];
  confidence: string;
  images: {
    local_path: string | null;
    original_url: string;
    source_page: string;
    width: number | null;
    height: number | null;
    caption: string | null;
    role: string;
  }[];
};

export type AxisRow = {
  id: string;
  title: string;
  year: string | null;
  date: string | null;
  type: string;
  subtype: string | null;
  status: string;
  status_source_term: string | null;
  era: string | null;
  project: string | null;
  domain: string;
  source: { name: string; url: string };
  img: string | null;
};

export type FigmaItem = {
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
  src: string;
  master_src: string | null;
  record: PackedRecord | null;
};

export type Curated = {
  generated_at: string;
  note: string;
  figma: FigmaItem[];
  glow: { primary_id: string; records: PackedRecord[] };
  fashion_id: string;
  music_axis: { demo: AxisRow[]; version: AxisRow[]; release: AxisRow[] };
  yeezus_domains: Record<string, AxisRow[]>;
  domains: string[];
  record_count: number;
};

export const curated = curatedJson as Curated;

export const GLOW_ID = "yetracker-3b678731de5e1b3a";
export const FASHION_ID = "yzylibrary-c5ad330858772531";

export function figmaScreen(screen: string): FigmaItem[] {
  return curated.figma.filter((item) => item.screen === screen);
}

export function figmaByRecord(id: string): FigmaItem[] {
  return curated.figma.filter((item) => item.record_id === id);
}

export function packedById(id: string): PackedRecord | null {
  for (const item of curated.figma) {
    if (item.record_id === id && item.record) return item.record;
  }
  return curated.glow.records.find((r) => r.id === id) ?? null;
}

export function localSrc(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return null;
  if (path.startsWith("/")) return path;
  if (path.startsWith("public/")) return "/" + path.slice("public/".length);
  if (path.startsWith("figma-export/")) return "/" + path;
  return "/" + path;
}

export function statusKind(status: string | null | undefined): "fact" | "claim" | "unconfirmed" {
  const s = (status ?? "").toUpperCase();
  if (s === "UNCONFIRMED" || s === "RUMORED" || s === "CONFLICTING SOURCES") {
    return "unconfirmed";
  }
  if (
    s === "RELEASED" ||
    s === "REALIZED" ||
    s === "FULL" ||
    s === "UNRELEASED" ||
    s === "PROTOTYPE" ||
    s === "SAMPLE" ||
    s === "CONCEPT" ||
    s === "CANCELLED" ||
    s === "LOST" ||
    s === "PARTIAL" ||
    s === "NEVER RECORDED"
  ) {
    return "fact";
  }
  return "claim";
}

export function dash(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  return v.length ? v : "—";
}

let indexPromise: Promise<SearchHit[]> | null = null;

export function loadSearchIndex(): Promise<SearchHit[]> {
  if (!indexPromise) {
    indexPromise = fetch("/search-index.json").then((res) => {
      if (!res.ok) throw new Error("search-index missing");
      return res.json();
    });
  }
  return indexPromise;
}

export function matchHit(hit: SearchHit, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  const hay = [
    hit.title,
    hit.year,
    hit.era,
    hit.project,
    hit.domain,
    hit.type,
    hit.subtype,
    hit.status,
    hit.status_source_term,
    ...(hit.people ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export const NAV = [
  { label: "Time", to: "/archive" },
  { label: "Medium", to: "/medium" },
  { label: "Unrealized", to: "/unrealized" },
  { label: "People", to: "/people" },
  { label: "Search", to: "/search" },
] as const;
