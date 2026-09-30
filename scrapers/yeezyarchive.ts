import * as cheerio from "cheerio";
import {
  absUrl,
  attachImage,
  claim,
  fetchText,
  finishRecord,
  log,
  nowIso,
  preferImageUrl,
  pushClaims,
  recordId,
  stripTags,
  unique,
  yearFrom,
} from "./base.ts";
import type { AdapterResult, ArchiveRecord } from "./types.ts";

const SOURCE_NAME = "Yeezy Archive";
const BASE = "https://yeezyarchive.net";
const SOURCE_ID = "yeezyarchive";

const LISTINGS = [
  "/era/2015",
  "/era/2017",
  "/era/2019",
  "/szn",
  "/szn/tour",
  "/footwear",
  "/merch",
  "/merch/yeezy-collaborations",
  "/merch/yeezy-season-8-9-2020-2022",
  "/merch/yeezy-gap-engineered-by-balenciaga-2021-2022",
  "/merch/dropout-trilogy-archive-2004-2008",
  "/merch/miscellaneous-album-merch-2008-2015",
  "/merch/yeezus-archive-2013-2015",
  "/merch/the-life-of-pablo-archives-2016",
  "/merch/wyoming-sessions-new",
  "/merch/jesus-is-king-archive-2019",
  "/merch/donda-vultures-archives-2021-2024",
];

function listingContext(pathname: string): { era: string | null; project: string | null; domain: ArchiveRecord["domain"]; type: string } {
  if (pathname.startsWith("/era/2015")) return { era: "Seasons 1–2 (2015–2016)", project: "Yeezy Season", domain: "FASHION", type: "garment" };
  if (pathname.startsWith("/era/2017")) return { era: "Seasons 3–6 (2016–2019)", project: "Yeezy Season", domain: "FASHION", type: "garment" };
  if (pathname.startsWith("/era/2019")) return { era: "Adidas Yeezy (2019–2022)", project: "Adidas Yeezy", domain: "FASHION", type: "garment" };
  if (pathname.startsWith("/szn/tour")) return { era: "2026 Tour", project: "SZN X / 2026 Tour", domain: "FASHION", type: "merch" };
  if (pathname.startsWith("/szn")) return { era: "SZN X", project: "SZN X", domain: "FASHION", type: "garment" };
  if (pathname.startsWith("/footwear")) return { era: null, project: "Yeezy Footwear", domain: "FASHION", type: "footwear" };
  if (pathname.includes("yeezus")) return { era: "Yeezus", project: "Yeezus", domain: "FASHION", type: "merch" };
  if (pathname.includes("dropout")) return { era: "Dropout Trilogy", project: "Dropout Trilogy", domain: "FASHION", type: "merch" };
  if (pathname.includes("pablo")) return { era: "The Life of Pablo", project: "The Life of Pablo", domain: "FASHION", type: "merch" };
  if (pathname.includes("jesus-is-king")) return { era: "Jesus Is King", project: "Jesus Is King", domain: "FASHION", type: "merch" };
  if (pathname.includes("donda")) return { era: "Donda / Vultures / Bully", project: "Donda / Vultures / Bully", domain: "FASHION", type: "merch" };
  if (pathname.includes("wyoming")) return { era: "Wyoming Sessions", project: "Wyoming Sessions", domain: "FASHION", type: "merch" };
  if (pathname.includes("gap")) return { era: "Yeezy Gap", project: "Yeezy Gap Engineered by Balenciaga", domain: "FASHION", type: "garment" };
  if (pathname.includes("album-merch")) return { era: "Album merch 2008–2015", project: "Album merch", domain: "FASHION", type: "merch" };
  if (pathname.startsWith("/merch")) return { era: null, project: "Merch", domain: "FASHION", type: "merch" };
  return { era: null, project: null, domain: "FASHION", type: "item" };
}

function collectCards(html: string, pageUrl: string): Array<{ href: string; title: string; img: string | null; extra: string | null }> {
  const $ = cheerio.load(html);
  const cards: Array<{ href: string; title: string; img: string | null; extra: string | null }> = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.startsWith("/")) return;
    const isItem =
      href.startsWith("/products/") ||
      href.startsWith("/merch/p/") ||
      href.startsWith("/szn/tour/p/") ||
      /^\/szn\/(?!tour\/?$)[a-z0-9-]+$/i.test(href);
    if (!isItem) return;
    const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || null;
    const title =
      $(el).find("img").attr("alt") ||
      $(el)
        .text()
        .replace(/\s+/g, " ")
        .trim()
        .split("$")[0]
        .trim();
    if (!title) return;
    cards.push({
      href: absUrl(pageUrl, href),
      title: title.replace(/\s+/g, " ").trim(),
      img: img ? absUrl(pageUrl, img.replace(/&amp;/g, "&")) : null,
      extra: $(el).text().replace(/\s+/g, " ").trim(),
    });
  });
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.href)) return false;
    seen.add(c.href);
    return true;
  });
}

function parseDetail(html: string, url: string): { description: string | null; fields: Record<string, string>; images: string[] } {
  const $ = cheerio.load(html);
  const images: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (!src) return;
    const abs = absUrl(url, src.replace(/&amp;/g, "&"));
    if (/favicon|wordmark|fonts?\//i.test(abs)) return;
    images.push(abs);
  });
  const fields: Record<string, string> = {};
  const text = $("main").text() || $.root().text();
  const labeled = [...text.matchAll(/\n\s*(Type|Year|Style|SKU|In)\s*\n\s*([^\n]+)/gi)];
  for (const m of labeled) fields[m[1].toLowerCase()] = m[2].trim();
  // description: first substantial paragraph in main
  let description: string | null = null;
  $("main p, main div").each((_, el) => {
    if (description) return;
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length > 80 && !/yeezy archive|discord|report an issue/i.test(t)) description = t;
  });
  if (!description) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 80 && !/yeezy archive|discord/i.test(l));
    description = lines[0] || null;
  }
  return { description, fields, images: unique(images) };
}

export async function scrapeYeezyarchive(): Promise<AdapterResult> {
  const failedPages: AdapterResult["failedPages"] = [];
  const notes: string[] = [];
  const byUrl = new Map<string, ArchiveRecord>();

  for (const path of LISTINGS) {
    const url = absUrl(BASE, path);
    log(`yeezyarchive listing ${url}`);
    const page = await fetchText(url);
    if (!page.ok) {
      failedPages.push({ url, reason: page.error || "fail" });
      continue;
    }
    const ctx = listingContext(path);
    const cards = collectCards(page.body, url);
    notes.push(`${path}: ${cards.length} item links`);
    for (const card of cards) {
      if (byUrl.has(card.href)) {
        const existing = byUrl.get(card.href)!;
        if (ctx.project && !existing.related_records.includes(recordId(SOURCE_ID, "listing", path))) {
          existing.related_records.push(recordId(SOURCE_ID, "listing", path));
        }
        continue;
      }
      const { status, term } = (() => {
        const blob = `${card.title} ${card.extra || ""}`;
        const t = blob.toLowerCase();
        if (t.includes("unreleased")) return { status: "UNRELEASED", term: "unreleased" };
        if (t.includes("prototype")) return { status: "PROTOTYPE", term: "prototype" };
        if (t.includes("sample")) return { status: "SAMPLE", term: "sample" };
        if (t.includes("concept")) return { status: "CONCEPT", term: "concept" };
        return { status: "UNCONFIRMED", term: null };
      })();
      const rec: ArchiveRecord = {
        id: recordId(SOURCE_ID, card.href),
        title: card.title,
        date: null,
        year: yearFrom(card.title) || yearFrom(ctx.era),
        domain: ctx.domain,
        type: ctx.type,
        subtype: ctx.project,
        era: ctx.era,
        project: ctx.project,
        status,
        status_source_term: term,
        description: null,
        people: [],
        organizations: path.includes("merch") ? ["Paris Saint (imagery credit on site)"] : [],
        related_records: [],
        references: [card.href, url],
        images: [],
        source: { name: SOURCE_NAME, url: card.href },
        source_claims: [],
        confidence: "medium",
        scraped_at: nowIso(),
      };
      pushClaims(rec, [
        claim("title", card.title, SOURCE_NAME, url),
        claim("listing_page", url, SOURCE_NAME, url),
        claim("nav_section", path, SOURCE_NAME, url),
      ]);
      if (card.img) {
        await attachImage(rec, preferImageUrl(card.img), url, {
          role: "primary",
          group: ctx.era || ctx.project,
          index: 1,
          download: true,
        });
      }
      byUrl.set(card.href, finishRecord(rec));
    }
  }

  const detailUrls = [...byUrl.keys()];
  const priority = detailUrls.filter((u) =>
    /unreleased|prototype|sample|concept|yeezus|glow|sketch/i.test(u + (byUrl.get(u)?.title || "")),
  );
  const products = detailUrls.filter((u) => u.includes("/products/"));
  const szn = detailUrls.filter((u) => /\/szn\/(?!tour\/?$)/.test(new URL(u).pathname) && !u.includes("/tour/p/"));
  const merchP = detailUrls.filter((u) => u.includes("/merch/p/") || u.includes("/szn/tour/p/"));
  const toFetch = unique([...priority, ...products, ...szn, ...merchP.filter((u) => /yeezus|unreleased|prototype|sample|glow/i.test(u))]);

  notes.push(`detail fetch planned=${toFetch.length} of ${detailUrls.length}`);
  let i = 0;
  for (const url of toFetch) {
    i++;
    if (i % 40 === 0) log(`yeezyarchive detail ${i}/${toFetch.length}`);
    const page = await fetchText(url);
    if (!page.ok) {
      failedPages.push({ url, reason: page.error || "fail" });
      continue;
    }
    const rec = byUrl.get(url);
    if (!rec) continue;
    const detail = parseDetail(page.body, url);
    if (detail.description && !rec.description) rec.description = stripTags(detail.description);
    if (detail.fields.year && !rec.year) rec.year = yearFrom(detail.fields.year);
    if (detail.fields.year && !rec.date) rec.date = detail.fields.year;
    if (detail.fields.type) rec.subtype = rec.subtype ? `${rec.subtype} / ${detail.fields.type}` : detail.fields.type;
    if (detail.fields.style) pushClaims(rec, [claim("style", detail.fields.style, SOURCE_NAME, url)]);
    if (detail.fields.sku) pushClaims(rec, [claim("sku", detail.fields.sku, SOURCE_NAME, url)]);
    if (detail.fields.in) pushClaims(rec, [claim("in", detail.fields.in, SOURCE_NAME, url)]);
    if (detail.fields.type) pushClaims(rec, [claim("type", detail.fields.type, SOURCE_NAME, url)]);
    if (detail.fields.year) pushClaims(rec, [claim("year", detail.fields.year, SOURCE_NAME, url)]);
    let idx = rec.images.length;
    for (const img of detail.images.slice(0, 8)) {
      idx++;
      await attachImage(rec, img, url, {
        role: rec.images.length === 0 ? "primary" : "unknown",
        group: rec.era || rec.project,
        index: idx,
        download: idx <= 6,
      });
    }
    rec.confidence = rec.images.length || rec.description ? "high" : rec.confidence;
    rec.source.url = url;
  }

  notes.push("Merch listings and imagery are credited by the site to Paris Saint.");
  notes.push("No robots.txt (404 HTML). Crawled public listing and detail HTML only.");

  return {
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: BASE,
    records: [...byUrl.values()],
    failedPages,
    skipped: false,
    notes,
    estimatedRecords: detailUrls.length,
  };
}
