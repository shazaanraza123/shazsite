import {
  attachImage,
  claim,
  fetchText,
  finishRecord,
  log,
  nowIso,
  parseSitemapLocs,
  preferImageUrl,
  pushClaims,
  recordId,
  yearFrom,
} from "./base.ts";
import type { AdapterResult, ArchiveRecord } from "./types.ts";

const SOURCE_NAME = "Ye Tour";
const BASE = "https://yetour.xyz";
const SOURCE_ID = "yetour";
const YEARS = ["2021", "2023", "2024", "2025", "2026"];

function merchUrl(year: string, folder: string, fileName: string): string {
  if (fileName.startsWith("http://") || fileName.startsWith("https://")) return fileName;
  if (year === "2021") return `https://media.yetour.xyz/donda/merch/${fileName}`;
  if (year === "2023") return `https://media.yetour.xyz/vultures/2023/merch/${fileName}`;
  return `https://media.yetour.xyz/merch/${folder}/${fileName}`;
}

function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function showCity(name: string): string | null {
  // Do not infer. The source names the show; city is only stored when identical to the documented show title token list — skip.
  return null;
}

export async function scrapeYetour(): Promise<AdapterResult> {
  const failedPages: AdapterResult["failedPages"] = [];
  const notes: string[] = [];
  const records: ArchiveRecord[] = [];

  const sm = await fetchText(`${BASE}/sitemap.xml`);
  const sitemapUrls = sm.ok ? parseSitemapLocs(sm.body) : [];
  if (!sm.ok) failedPages.push({ url: `${BASE}/sitemap.xml`, reason: sm.error || "fail" });
  notes.push(`sitemap urls=${sitemapUrls.length}`);

  for (const year of YEARS) {
    const url = `${BASE}/api/catalog/${year}`;
    log(`yetour catalog ${year}`);
    const res = await fetchText(url, { accept: "application/json" });
    if (!res.ok) {
      failedPages.push({ url, reason: res.error || "fail" });
      continue;
    }
    let catalog: any;
    try {
      catalog = JSON.parse(res.body);
    } catch {
      failedPages.push({ url, reason: "invalid json" });
      continue;
    }

    const merch = catalog.merch || [];
    for (const item of merch) {
      const title = item.base || item.name || "Untitled merch";
      const folder = item.folder || "misc";
      const files: string[] = Array.isArray(item.files) ? item.files : [];
      const pageGuess =
        sitemapUrls.find((u) => u.toLowerCase().includes(String(title).toLowerCase().replace(/\s+/g, "-"))) ||
        sitemapUrls.find((u) => u.includes(`/merch/${folder}/`)) ||
        `${BASE}/${year}`;
      const rec: ArchiveRecord = {
        id: recordId(SOURCE_ID, "merch", year, folder, title),
        title: String(title),
        date: year,
        year,
        domain: "FASHION",
        type: "merch",
        subtype: folder,
        era: year === "2021" ? "Donda" : year === "2023" || year === "2024" ? "Vultures" : `Ye Tour ${year}`,
        project: `Ye Tour ${year}`,
        status: "RELEASED",
        status_source_term: `catalog year ${year}`,
        description: null,
        people: [],
        organizations: [],
        related_records: [],
        references: [pageGuess],
        images: [],
        source: { name: SOURCE_NAME, url: pageGuess },
        source_claims: [],
        confidence: "medium",
        scraped_at: nowIso(),
      };
      pushClaims(rec, [
        claim("year", year, SOURCE_NAME, url),
        claim("folder", folder, SOURCE_NAME, url),
        claim("base", item.base, SOURCE_NAME, url),
        claim("files", files.join(", "), SOURCE_NAME, url),
      ]);
      let idx = 0;
      for (const f of files) {
        const imgUrl = merchUrl(year, folder, f);
        if (isVideo(imgUrl)) continue;
        idx++;
        await attachImage(rec, preferImageUrl(imgUrl), pageGuess, {
          role: idx === 1 ? "primary" : "unknown",
          group: `${year}-${folder}`,
          index: idx,
          download: idx <= 4,
        });
      }
      records.push(finishRecord(rec));
    }

    for (const show of catalog.shows || []) {
      const title = show.name || show.id || "Untitled show";
      const page =
        sitemapUrls.find((u) => u.includes(`/shows/`) && u.toLowerCase().includes(String(show.name || "").toLowerCase().replace(/\s+/g, "-").slice(0, 18))) ||
        (show.id ? `${BASE}/shows/${show.id}` : `${BASE}/${year}`);
      const timestamps = Array.isArray(show.timestamps) ? show.timestamps : [];
      const setlist = timestamps.map((t: any) => (t.song ? `${t.time || ""} ${t.song}`.trim() : "")).filter(Boolean);
      const rec: ArchiveRecord = {
        id: recordId(SOURCE_ID, "show", year, show.id || title),
        title: String(title),
        date: year,
        year,
        domain: "PERFORMANCE",
        type: show.category || "show",
        subtype: show.spec || null,
        era: `Ye Tour ${year}`,
        project: `Ye Tour ${year}`,
        status: show.accessible === false ? "UNCONFIRMED" : "REALIZED",
        status_source_term: show.accessible === false ? "accessible=false" : "catalog show",
        description: setlist.length ? `Setlist timestamps (source):\n${setlist.join("\n")}` : null,
        people: [],
        organizations: [],
        related_records: [],
        references: [page],
        images: [],
        source: { name: SOURCE_NAME, url: page },
        source_claims: [],
        confidence: "medium",
        scraped_at: nowIso(),
      };
      pushClaims(rec, [
        claim("show_id", show.id, SOURCE_NAME, url),
        claim("category", show.category, SOURCE_NAME, url),
        claim("spec", show.spec, SOURCE_NAME, url),
        claim("setlist", setlist.join(" | "), SOURCE_NAME, url),
        claim("city", showCity(String(title)), SOURCE_NAME, url),
        claim("video", isVideo(String(show.video || "")) ? show.video : null, SOURCE_NAME, url),
      ]);
      if (show.image && !isVideo(String(show.image))) {
        await attachImage(rec, String(show.image), page, {
          role: "primary",
          group: `tour-${year}`,
          index: 1,
          download: true,
        });
      }
      records.push(finishRecord(rec));
    }

    for (const music of catalog.music || []) {
      const title = music.name || music.id || "Untitled";
      const page =
        sitemapUrls.find((u) => u.includes("/music/") && u.toLowerCase().includes(String(title).toLowerCase().replace(/\s+/g, "-").slice(0, 12))) ||
        `${BASE}/${year}`;
      const rec: ArchiveRecord = {
        id: recordId(SOURCE_ID, "music", year, music.id || title),
        title: String(title),
        date: year,
        year,
        domain: music.type === "video" ? "FILM" : "MUSIC",
        type: music.type || "music",
        subtype: music.spec || null,
        era: `Ye Tour ${year}`,
        project: `Ye Tour ${year}`,
        status: "RELEASED",
        status_source_term: `catalog music type=${music.type || "unknown"}`,
        description: null,
        people: [],
        organizations: [],
        related_records: [],
        references: [page],
        images: [],
        source: { name: SOURCE_NAME, url: page },
        source_claims: [],
        confidence: "medium",
        scraped_at: nowIso(),
      };
      pushClaims(rec, [
        claim("id", music.id, SOURCE_NAME, url),
        claim("type", music.type, SOURCE_NAME, url),
        claim("spec", music.spec, SOURCE_NAME, url),
      ]);
      if (music.image && !isVideo(String(music.image))) {
        await attachImage(rec, String(music.image), page, {
          role: "primary",
          group: `music-${year}`,
          index: 1,
          download: true,
        });
      }
      records.push(finishRecord(rec));
    }
  }

  notes.push("Used public /api/catalog/{year} (same endpoint the homepage fetches). Did not call /api/admin/*.");
  notes.push("Skipped video files; downloaded stills/thumbnails/merch photos from media.yetour.xyz.");
  notes.push("robots.txt allows User-agent: * except /admin/.");

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
