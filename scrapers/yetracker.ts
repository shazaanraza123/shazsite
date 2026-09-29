import {
  attachImage,
  claim,
  fetchText,
  finishRecord,
  log,
  nowIso,
  pushClaims,
  recordId,
  yearFrom,
} from "./base.ts";
import type { AdapterResult, ArchiveRecord } from "./types.ts";

const SOURCE_NAME = "Ye Tracker";
const BASE = "https://yetracker.cc";
const SOURCE_ID = "yetracker";

function asTitle(name: unknown): string {
  if (!name) return "Untitled";
  if (typeof name === "string") return name.replace(/\s+/g, " ").trim();
  if (typeof name === "object" && name && "title" in (name as any)) return String((name as any).title);
  if (typeof name === "object" && name && "raw" in (name as any)) return String((name as any).raw);
  return String(name);
}

function asLinks(links: unknown): string[] {
  if (!links) return [];
  if (Array.isArray(links)) return links.map(String).filter((l) => l.startsWith("http"));
  if (typeof links === "string") {
    try {
      const p = JSON.parse(links.replace(/'/g, '"'));
      if (Array.isArray(p)) return p.map(String).filter((l) => l.startsWith("http"));
    } catch {
      /* ignore */
    }
    return [...links.matchAll(/https?:\/\/[^\s"']+/g)].map((m) => m[0]);
  }
  return [];
}

function tabDomain(tab: string, item: any): ArchiveRecord["domain"] {
  if (tab === "art") return "DESIGN";
  if (tab === "tracklists" || tab === "main" || tab === "released" || tab === "stems" || tab === "samples") return "MUSIC";
  if (tab === "misc") {
    const mt = String(item?.misc_type || item?.art_type || "").toLowerCase();
    if (mt.includes("film") || mt.includes("video") || mt.includes("commercial")) return "FILM";
    if (mt.includes("book") || mt.includes("interview") || mt.includes("doc")) return "WRITING";
    if (mt.includes("merch")) return "FASHION";
    if (mt.includes("art") || mt.includes("cover")) return "DESIGN";
    if (mt.includes("performance") || mt.includes("tour") || mt.includes("stage")) return "PERFORMANCE";
    return "EPHEMERA";
  }
  if (tab === "special" || tab === "grails") return "MUSIC";
  return "EPHEMERA";
}

function availabilityStatus(item: any): { status: string; term: string | null } {
  const avail = String(item?.available_length || item?.quality || item?.use || "").trim();
  const notes = String(item?.notes || "");
  const blob = `${avail} ${notes}`.toLowerCase();
  if (blob.includes("never recorded")) return { status: "NEVER RECORDED", term: "never recorded" };
  if (blob.includes("unavailable")) return { status: "UNCONFIRMED", term: item?.available_length || "unavailable" };
  if (String(item?.available_length) === "Partial" || blob.includes("snippet")) return { status: "PARTIAL", term: item?.available_length || "snippet" };
  if (String(item?.use).toLowerCase() === "unused") return { status: "UNRELEASED", term: "Unused" };
  if (String(item?.use).toLowerCase() === "used") return { status: "RELEASED", term: "Used" };
  if (item?.available_length) return { status: String(item.available_length).toUpperCase(), term: String(item.available_length) };
  if (item?.quality) return { status: "UNCONFIRMED", term: String(item.quality) };
  return { status: "UNCONFIRMED", term: null };
}

export async function scrapeYetracker(): Promise<AdapterResult> {
  const failedPages: AdapterResult["failedPages"] = [];
  const notes: string[] = [];
  const records: ArchiveRecord[] = [];

  const manifestUrl = `${BASE}/api/manifest`;
  log(`yetracker manifest ${manifestUrl}`);
  const man = await fetchText(manifestUrl, { accept: "application/json" });
  if (!man.ok) {
    return {
      sourceId: SOURCE_ID,
      sourceName: SOURCE_NAME,
      sourceUrl: BASE,
      records: [],
      failedPages: [{ url: manifestUrl, reason: man.error || "fail" }],
      skipped: true,
      skipReason: "public /api/manifest unavailable",
      notes: ["Ye Tracker cc SPA; public JSON used by the site was unavailable."],
    };
  }
  let manifest: any;
  try {
    manifest = JSON.parse(man.body);
  } catch {
    return {
      sourceId: SOURCE_ID,
      sourceName: SOURCE_NAME,
      sourceUrl: BASE,
      records: [],
      failedPages: [{ url: manifestUrl, reason: "invalid json" }],
      skipped: true,
      skipReason: "manifest not json",
      notes: [],
    };
  }
  notes.push(`manifest lastUpdated=${manifest.lastUpdated}`);
  const tabs: string[] = Object.keys(manifest.tabs || {});
  notes.push(`tabs=${tabs.join(",")}`);

  const priorityTabs = [
    "art",
    "misc",
    "tracklists",
    "special",
    "samples",
    "released",
    "main",
    "stems",
    "grails",
    "best",
    "worst",
    "shared",
    "ssc",
    "fakes",
    "copies",
    "groupbuys",
  ];
  const ordered = [...priorityTabs.filter((t) => tabs.includes(t)), ...tabs.filter((t) => !priorityTabs.includes(t))];

  for (const tab of ordered) {
    const url = `${BASE}/api/tab/${tab}`;
    log(`yetracker tab ${tab}`);
    const res = await fetchText(url, { accept: "application/json" });
    if (!res.ok) {
      failedPages.push({ url, reason: res.error || "fail" });
      continue;
    }
    let data: any;
    try {
      data = JSON.parse(res.body);
    } catch {
      failedPages.push({ url, reason: "invalid json" });
      continue;
    }
    const eras = data.eras || [];
    for (const era of eras) {
      const eraName = era.name || tab;
      const eraPage = `${BASE}/`; // SPA; tab+era are not separate public HTML routes
      if (era.cover_art && String(era.cover_art).startsWith("http")) {
        const eraRec: ArchiveRecord = {
          id: recordId(SOURCE_ID, "era", tab, eraName),
          title: `${eraName} (${tab})`,
          date: null,
          year: yearFrom(era.timeline) || yearFrom(era.description),
          domain: tab === "art" ? "DESIGN" : tab === "misc" ? "EPHEMERA" : "MUSIC",
          type: "era",
          subtype: tab,
          era: eraName,
          project: eraName,
          status: "UNCONFIRMED",
          status_source_term: era.stats_raw || null,
          description: [era.description, era.timeline].filter(Boolean).join("\n\n") || null,
          people: [],
          organizations: ["Ye Tracker"],
          related_records: [],
          references: asLinks(era.aka).concat([eraPage]),
          images: [],
          source: { name: SOURCE_NAME, url: eraPage },
          source_claims: [],
          confidence: "medium",
          scraped_at: nowIso(),
        };
        pushClaims(eraRec, [
          claim("era", eraName, SOURCE_NAME, url),
          claim("aka", Array.isArray(era.aka) ? era.aka.join(" | ") : era.aka, SOURCE_NAME, url),
          claim("stats_raw", era.stats_raw, SOURCE_NAME, url),
          claim("tab", tab, SOURCE_NAME, url),
          claim("cover_art", era.cover_art, SOURCE_NAME, url),
        ]);
        await attachImage(eraRec, era.cover_art, eraPage, {
          role: "primary",
          group: eraName,
          index: 1,
          download: true,
        });
        records.push(finishRecord(eraRec));
      }

      const items = era.tracks || [];
      let i = 0;
      for (const item of items) {
        i++;
        const title = asTitle(item.name);
        const links = asLinks(item.links);
        const { status, term } = availabilityStatus(item);
        const rec: ArchiveRecord = {
          id: recordId(SOURCE_ID, tab, eraName, i, title),
          title,
          date: item.file_date && item.file_date !== "None" ? String(item.file_date) : item.leak_date && item.leak_date !== "None" ? String(item.leak_date) : item.date_made || null,
          year:
            yearFrom(item.file_date) ||
            yearFrom(item.leak_date) ||
            yearFrom(item.date_made) ||
            yearFrom(eraName) ||
            yearFrom(item.notes),
          domain: tabDomain(tab, item),
          type: tab,
          subtype: item.art_type || item.misc_type || item.project_type || item.quality || null,
          era: item.era || eraName,
          project: item.era || eraName,
          status,
          status_source_term: [term, item.available_length, item.quality, item.use, item.misc_type].filter((x) => x && x !== "None").join(" | ") || term,
          description: item.notes || item.tracklist || null,
          people: item.designer && item.designer !== "Unknown" && item.designer !== "None" ? [String(item.designer)] : [],
          organizations: ["Ye Tracker"],
          related_records: [recordId(SOURCE_ID, "era", tab, eraName)],
          references: links.slice(0, 8),
          images: [],
          source: { name: SOURCE_NAME, url: eraPage },
          source_claims: [],
          confidence: "medium",
          scraped_at: nowIso(),
        };
        pushClaims(rec, [
          claim("tab", tab, SOURCE_NAME, url),
          claim("era", item.era || eraName, SOURCE_NAME, url),
          claim("name", title, SOURCE_NAME, url),
          claim("notes", item.notes, SOURCE_NAME, url),
          claim("track_length", item.track_length, SOURCE_NAME, url),
          claim("file_date", item.file_date, SOURCE_NAME, url),
          claim("leak_date", item.leak_date, SOURCE_NAME, url),
          claim("available_length", item.available_length, SOURCE_NAME, url),
          claim("quality", item.quality, SOURCE_NAME, url),
          claim("art_type", item.art_type, SOURCE_NAME, url),
          claim("project_type", item.project_type, SOURCE_NAME, url),
          claim("use", item.use, SOURCE_NAME, url),
          claim("designer", item.designer, SOURCE_NAME, url),
          claim("misc_type", item.misc_type, SOURCE_NAME, url),
          claim("source", item.source, SOURCE_NAME, url),
          claim("headers", (data.headers || []).join(" | "), SOURCE_NAME, url),
        ]);
        const img = item.image && item.image !== "None" ? String(item.image) : null;
        const downloadable = img && (img.startsWith(`${BASE}/img/`) || img.startsWith("https://yetracker.cc/img/"));
        if (downloadable) {
          const high = tab === "art" || tab === "misc" || tab === "tracklists";
          await attachImage(rec, img, eraPage, {
            role: "primary",
            group: item.era || eraName,
            index: 1,
            download: high || tab === "released",
          });
        }
        records.push(finishRecord(rec));
      }
    }
    notes.push(`tab ${tab}: eras=${eras.length}`);
  }

  notes.push("Public /api/manifest and /api/tab/* are the same unauthenticated JSON the website loads (cache-control public, x-source: r2).");
  notes.push("Did not follow off-site leak/file host links. Images limited to yetracker.cc/img/.");
  notes.push("yetracker.net is a Google Sheets host with x-robots-tag noindex,nofollow — handled separately as skipped.");

  return {
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: BASE,
    records,
    failedPages,
    skipped: false,
    notes,
    estimatedRecords: records.length,
  };
}

export async function scrapeYetrackerNet(): Promise<AdapterResult> {
  const notes = [
    "https://yetracker.net/ serves a Google Sheets / Google Drive document (title: Ye Tracker - Google Drive).",
    "Response includes x-robots-tag: noindex, nofollow, nosnippet.",
    "robots.txt returns 404 JSON. Automated extraction of Google Sheets cell data was skipped (Drive/Sheets document, not a public HTML archive).",
    "The public website edition of the same tracker is yetracker.cc, which was crawled instead.",
  ];
  return {
    sourceId: "yetracker-net",
    sourceName: "Ye Tracker (yetracker.net)",
    sourceUrl: "https://yetracker.net/",
    records: [],
    failedPages: [],
    skipped: true,
    skipReason: "Google Sheets document with x-robots-tag noindex,nofollow; not a crawlable public HTML catalog",
    notes,
  };
}
