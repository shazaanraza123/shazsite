import * as cheerio from "cheerio";
import {
  attachImage,
  claim,
  fetchText,
  finishRecord,
  log,
  nextPayloads,
  nowIso,
  parseSitemapLocs,
  pushClaims,
  recordId,
  slugify,
  yearFrom,
} from "./base.ts";
import type { AdapterResult, ArchiveRecord } from "./types.ts";

const SOURCE_NAME = "YZY Library";
const BASE = "https://www.yzylibrary.com";
const SOURCE_ID = "yzylibrary";

function extractRecordPayload(html: string): any | null {
  const blobs = nextPayloads(html).join("\n");
  const idx = blobs.indexOf('"record":{');
  if (idx < 0) return null;
  const start = blobs.indexOf("{", idx + '"record":'.length - 1);
  const json = extractObject(blobs, start);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractGalleryPayload(html: string): any | null {
  const blobs = nextPayloads(html).join("\n");
  const idx = blobs.indexOf('"Gallery":{');
  if (idx < 0) return null;
  const start = blobs.indexOf("{", idx + '"Gallery":'.length - 1);
  const json = extractObject(blobs, start);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractCollectionRecords(html: string): any[] {
  const blobs = nextPayloads(html).join("\n");
  const idx = blobs.indexOf('"records":[');
  if (idx < 0) return [];
  const start = blobs.indexOf("[", idx);
  const json = extractArray(blobs, start);
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function extractCollectionMeta(html: string): any | null {
  const blobs = nextPayloads(html).join("\n");
  const keys = ['"Name":', '"CollectionName":', '"Title":'];
  // look for object containing CloudflareId season icon + Name
  const idx = blobs.search(/"Name":"(Season|SZN|Yeezy)[^"]*"/);
  if (idx < 0) return null;
  const start = blobs.lastIndexOf("{", idx);
  const json = extractObject(blobs, start);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractObject(text: string, start: number): string | null {
  if (start < 0 || text[start] !== "{") return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function extractArray(text: string, start: number): string | null {
  if (start < 0 || text[start] !== "[") return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function cfUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.startsWith("http")) return id;
  return `https://www.cdn.yzylibrary.com/${id.replace(/^\/+/, "")}`;
}

function gdriveUrl(fileId: string | null | undefined): string | null {
  if (!fileId) return null;
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

function statusFromRecord(html: string, payload: any): { status: string; term: string | null } {
  const $ = cheerio.load(html);
  const tag = $("span.ant-tag")
    .map((_, el) => $(el).text().trim())
    .get()
    .find((t) => t.length > 0);
  if (tag) {
    const up = tag.toUpperCase();
    return { status: up, term: tag };
  }
  if (payload?.ReleaseType === 1) {
    return { status: "RELEASED", term: "ReleaseType=1 (visible tag not parsed)" };
  }
  return { status: "UNCONFIRMED", term: payload?.ReleaseType != null ? `ReleaseType=${payload.ReleaseType}` : null };
}

export async function scrapeYzylibrary(): Promise<AdapterResult> {
  const failedPages: AdapterResult["failedPages"] = [];
  const notes: string[] = [];
  const records: ArchiveRecord[] = [];

  const sm = await fetchText("https://www.yzylibrary.com/sitemap.xml");
  if (!sm.ok) {
    return {
      sourceId: SOURCE_ID,
      sourceName: SOURCE_NAME,
      sourceUrl: BASE,
      records: [],
      failedPages: [{ url: "https://www.yzylibrary.com/sitemap.xml", reason: sm.error || "fail" }],
      skipped: true,
      skipReason: "sitemap unavailable",
      notes: ["Could not load sitemap.xml"],
    };
  }
  const locs = parseSitemapLocs(sm.body);
  const collectionUrls = locs.filter((u) => /\/collection\/\d+\/?$/.test(u));
  const galleryUrls = locs.filter((u) => /\/collection\/\d+\/gallery\/?$/.test(u));
  const recordUrls = locs.filter((u) => /\/record\/\d+\/?$/.test(u));
  notes.push(`sitemap collections=${collectionUrls.length} galleries=${galleryUrls.length} records=${recordUrls.length}`);

  const collectionNames = new Map<number, string>();

  for (const url of collectionUrls) {
    log(`yzylibrary collection ${url}`);
    const page = await fetchText(url);
    if (!page.ok) {
      failedPages.push({ url, reason: page.error || "fail" });
      continue;
    }
    const $ = cheerio.load(page.body);
    const title = $("title").text().replace(/\s*\|\s*YZY Library.*$/i, "").trim();
    const idMatch = url.match(/collection\/(\d+)/);
    const colId = idMatch ? Number(idMatch[1]) : NaN;
    if (!Number.isNaN(colId) && title) collectionNames.set(colId, title);

    const listed = extractCollectionRecords(page.body);
    const meta = extractCollectionMeta(page.body);

    const rec: ArchiveRecord = {
      id: recordId(SOURCE_ID, "collection", colId || slugify(url)),
      title: title || `Collection ${colId}`,
      date: null,
      year: yearFrom(title) || yearFrom(JSON.stringify(meta || {})),
      domain: "FASHION",
      type: "collection",
      subtype: "library-collection",
      era: title || null,
      project: title || null,
      status: "REALIZED",
      status_source_term: title,
      description: null,
      people: [],
      organizations: ["YZY Library"],
      related_records: listed.map((r: any) => recordId(SOURCE_ID, "record", r.Id)),
      references: [url],
      images: [],
      source: { name: SOURCE_NAME, url },
      source_claims: [],
      confidence: "medium",
      scraped_at: nowIso(),
    };
    pushClaims(rec, [
      claim("title", title, SOURCE_NAME, url),
      claim("collection_id", colId, SOURCE_NAME, url),
      claim("listed_record_count", listed.length, SOURCE_NAME, url),
    ]);
    const sample = Array.isArray(meta?.SampleImages) ? meta.SampleImages : [];
    let i = 0;
    for (const fid of sample.slice(0, 6)) {
      const u = cfUrl(String(fid));
      if (u) {
        i++;
        await attachImage(rec, u, url, { role: "unknown", group: title, index: i, download: true });
      }
    }
    records.push(finishRecord(rec));
  }

  for (const url of galleryUrls) {
    log(`yzylibrary gallery ${url}`);
    const page = await fetchText(url);
    if (!page.ok) {
      failedPages.push({ url, reason: page.error || "fail" });
      continue;
    }
    const gallery = extractGalleryPayload(page.body);
    const colMatch = url.match(/collection\/(\d+)/);
    const colId = colMatch ? Number(colMatch[1]) : null;
    const colName = (colId && collectionNames.get(colId)) || `collection-${colId}`;
    const lookbooks = gallery?.Lookbooks || [];
    for (const lb of lookbooks) {
      const rec: ArchiveRecord = {
        id: recordId(SOURCE_ID, "lookbook", lb.Id || lb.Title),
        title: lb.Title || "Untitled lookbook",
        date: lb.DateReleased || null,
        year: yearFrom(lb.DateReleased) || yearFrom(colName),
        domain: "PHOTOGRAPHY",
        type: "lookbook",
        subtype: lb.IsOfficial ? "official-lookbook" : "lookbook",
        era: colName,
        project: colName,
        status: "REALIZED",
        status_source_term: lb.IsOfficial ? "IsOfficial=true" : null,
        description: lb.Credits ? `Credits (source): ${lb.Credits}` : null,
        people: [],
        organizations: [],
        related_records: colId ? [recordId(SOURCE_ID, "collection", colId)] : [],
        references: [url],
        images: [],
        source: { name: SOURCE_NAME, url },
        source_claims: [],
        confidence: "medium",
        scraped_at: nowIso(),
      };
      pushClaims(rec, [
        claim("lookbook_id", lb.Id, SOURCE_NAME, url),
        claim("source_credit", lb.Source, SOURCE_NAME, url),
        claim("credits", lb.Credits, SOURCE_NAME, url),
        claim("is_official", lb.IsOfficial, SOURCE_NAME, url),
      ]);
      const images = Array.isArray(lb.Images) ? lb.Images : [];
      let idx = 0;
      for (const im of images.slice(0, 40)) {
        if (im.IsNSFW) continue;
        const u = cfUrl(im.CloudflareImageId) || gdriveUrl(im.GoogleFileId);
        if (!u) continue;
        idx++;
        await attachImage(rec, u, url, {
          caption: im.Source || im.AuthorName || null,
          role: "unknown",
          group: colName,
          index: idx,
          download: idx <= 20,
        });
      }
      records.push(finishRecord(rec));
    }
  }

  let n = 0;
  for (const url of recordUrls) {
    n++;
    if (n % 25 === 0) log(`yzylibrary records ${n}/${recordUrls.length}`);
    const page = await fetchText(url);
    if (!page.ok) {
      failedPages.push({ url, reason: page.error || "fail" });
      continue;
    }
    const payload = extractRecordPayload(page.body);
    const $ = cheerio.load(page.body);
    const htmlTitle = $("title")
      .text()
      .replace(/\s*–.*$/, "")
      .replace(/\s*\|\s*YZY Library.*$/i, "")
      .trim();
    const title = (payload?.Title || htmlTitle || "Untitled").trim();
    const idMatch = url.match(/record\/(\d+)/);
    const recNum = idMatch ? idMatch[1] : slugify(url);
    const collectionName = payload?.CollectionName || null;
    const { status, term } = statusFromRecord(page.body, payload);
    const rec: ArchiveRecord = {
      id: recordId(SOURCE_ID, "record", recNum),
      title,
      date: payload?.Year ? String(payload.Year) : null,
      year: payload?.Year ? String(payload.Year) : yearFrom(title),
      domain: "FASHION",
      type: "garment",
      subtype: collectionName,
      era: collectionName,
      project: collectionName,
      status,
      status_source_term: term,
      description: payload?.Description || null,
      people: [],
      organizations: [],
      related_records: payload?.CollectionId
        ? [recordId(SOURCE_ID, "collection", payload.CollectionId)]
        : [],
      references: [url],
      images: [],
      source: { name: SOURCE_NAME, url },
      source_claims: [],
      confidence: "medium",
      scraped_at: nowIso(),
    };
    pushClaims(rec, [
      claim("title", payload?.Title, SOURCE_NAME, url),
      claim("sku", payload?.SKU, SOURCE_NAME, url),
      claim("year", payload?.Year, SOURCE_NAME, url),
      claim("collection", payload?.CollectionName, SOURCE_NAME, url),
      claim("retail_price", payload?.RetailPrice, SOURCE_NAME, url),
      claim("source_contributor", payload?.Source, SOURCE_NAME, url),
      claim("colorways", Array.isArray(payload?.Colorways) ? payload.Colorways.join(", ") : null, SOURCE_NAME, url),
      claim("release_type", payload?.ReleaseType, SOURCE_NAME, url),
      claim("visible_status_tag", term, SOURCE_NAME, url),
    ]);
    const images = Array.isArray(payload?.Images) ? payload.Images : [];
    const highValue = /unreleased|prototype|sample|concept|yeezus/i.test(`${title} ${collectionName} ${status}`);
    const maxDl = highValue ? 6 : 1;
    const sorted = [...images].sort((a, b) => Number(b.IsPrimary) - Number(a.IsPrimary) || (a.Position || 0) - (b.Position || 0));
    let idx = 0;
    for (const im of sorted) {
      const u = im.Url || gdriveUrl(im.GoogleFileId) || cfUrl(im.CloudflareImageId);
      if (!u) continue;
      idx++;
      const role = im.IsPrimary ? "primary" : "unknown";
      await attachImage(rec, u, url, {
        caption: im.Credit || null,
        role,
        group: collectionName,
        index: idx,
        download: idx <= maxDl,
      });
    }
    records.push(finishRecord(rec));
  }

  notes.push(`parsed records=${records.length} failed_pages=${failedPages.length}`);
  notes.push("Did not request /api (robots.txt Disallow: /api). Images and metadata taken from public HTML/RSC.");

  return {
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: BASE,
    records,
    failedPages,
    skipped: false,
    notes,
    estimatedRecords: recordUrls.length,
  };
}
