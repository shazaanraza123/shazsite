import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT, DATA_DIR, log, nowIso, waitForDownloads, writeJson } from "../scrapers/base.ts";
import { scrapeYzylibrary } from "../scrapers/yzylibrary.ts";
import { scrapeYeezyarchive } from "../scrapers/yeezyarchive.ts";
import { scrapeParisaint } from "../scrapers/parisaint.ts";
import { scrapeYzytwts } from "../scrapers/yzytwts.ts";
import { scrapeYetracker, scrapeYetrackerNet } from "../scrapers/yetracker.ts";
import { scrapeYetour } from "../scrapers/yetour.ts";
import type { AdapterResult, ArchiveRecord, ScrapeReport, SourceAuditEntry } from "../scrapers/types.ts";
import { buildImageIndexAndDedupe } from "./dedupe.ts";
import { buildFigmaExport } from "./figma-export.ts";

const SOURCE_AUDIT: SourceAuditEntry[] = [
  {
    id: "yzytwts",
    name: "YZY TWTS",
    url: "https://yzy-twts.com/",
    robots_txt: "https://yzy-twts.com/robots.txt",
    robots_status: "200 text/plain. Sitemap listed. Googlebot/search bots Allow: /. User-agent: * Disallow: /.",
    crawl_allowed: false,
    skip_reason: "robots.txt catch-all Disallow: / for User-agent: *",
    terms_notes: "robots.txt also Disallow for GPTBot, ClaudeBot, CCBot, ia_archiver, archive.org_bot.",
    rendering: "hybrid",
    structure: "Next.js year-index archive of posts (/2026 … /2007), /about /faq /search.",
    pagination: "Year folders, not crawled.",
    detail_pages: "Not crawled.",
    category_pages: "Year indexes.",
    image_cdn: "Same origin /images/ (observed on homepage during audit only).",
    metadata_fields: ["year", "post text", "media", "original URL"],
    public_json_endpoints: ["none used — crawl skipped"],
    estimated_records: "unknown (not crawled)",
    crawl_plan: "SKIP. Document as research lead in SOURCES.md.",
  },
  {
    id: "yzylibrary",
    name: "YZY Library",
    url: "https://www.yzylibrary.com/",
    robots_txt: "https://www.yzylibrary.com/robots.txt",
    robots_status: "200. User-Agent: * Allow: /. Disallow: /admin, /admin/*, /api. Sitemap present.",
    crawl_allowed: true,
    skip_reason: null,
    terms_notes:
      "About page: community-driven Yeezy archive documenting garments/looks/collection history; items are not for sale. No /terms page (404). Did not call /api.",
    rendering: "hybrid",
    structure: "Next.js App Router. Sitemap: ~28 collections, collection galleries, ~1949 /record/{id} pages.",
    pagination: "Collections list records on one page. Sitemap enumerates all records.",
    detail_pages: "/record/{id} — SSR + RSC payload with SKU, year, colorways, status tag, image URLs.",
    category_pages: "/collection/{id} and /collection/{id}/gallery lookbooks.",
    image_cdn: "https://www.cdn.yzylibrary.com/{uuid} and lh3.googleusercontent.com/d/{fileId} in public RSC.",
    metadata_fields: [
      "Title",
      "SKU",
      "Year",
      "CollectionName",
      "Description",
      "Colorways",
      "RetailPrice",
      "ReleaseType",
      "Source",
      "Images.Url/Credit/IsPrimary",
    ],
    public_json_endpoints: ["sitemap.xml. /api is Disallow — not used."],
    estimated_records: "~1949 garment records + collections + lookbooks",
    crawl_plan: "Fetch sitemap, collection/gallery/record HTML. Parse RSC. Prefer original CDN / Drive preview URLs from the page payload.",
  },
  {
    id: "parisaint",
    name: "Paris Saint",
    url: "https://www.parisaint.com/",
    robots_txt: "https://www.parisaint.com/robots.txt",
    robots_status: "200 Shopify robots. User-agent: * Allow: /. Disallow cart/checkout/account/admin/cart.js/recommendations/sort traps.",
    crawl_allowed: true,
    skip_reason: null,
    terms_notes:
      "Shopify storefront. agents.md / UCP present for shopping assistants. Product HTML and products.json are public catalog. Did not touch checkout or cart.js.",
    rendering: "ssr",
    structure: "Shopify collections (Yeezus, Seasons, Dropout, JIK, Donda/Vultures, etc.) and product pages.",
    pagination: "products.json ?limit=250&page=N; collection product JSON paginated the same way.",
    detail_pages: "/products/{handle} plus public products.json objects (title, tags, images, body_html).",
    category_pages: "/collections/{handle} (~29 in sitemap_collections_1.xml).",
    image_cdn: "cdn.shopify.com / parisaint.com/cdn/shop — request width=2000, never upscale beyond source.",
    metadata_fields: ["title", "handle", "tags", "vendor", "product_type", "body_html", "images", "published_at", "collection membership"],
    public_json_endpoints: [
      "/products.json",
      "/collections.json",
      "/collections/{handle}/products.json",
      "/sitemap.xml",
    ],
    estimated_records: "~1098 products (999+99 in product sitemaps)",
    crawl_plan: "Public Shopify JSON only. Map collection membership. Download up to 2 images (6 if source text documents unreleased/prototype/yeezus).",
  },
  {
    id: "yeezyarchive",
    name: "Yeezy Archive",
    url: "https://yeezyarchive.net/",
    robots_txt: "https://yeezyarchive.net/robots.txt",
    robots_status: "404 HTML SPA shell (no robots.txt document).",
    crawl_allowed: true,
    skip_reason: null,
    terms_notes:
      "About: community archive, 2,463 items, 2005–2026. Merch listings/imagery credited to Paris Saint. Not affiliated with Yeezy LLC. No robots Disallow.",
    rendering: "hybrid",
    structure: "React SSR listings: /era/2015|2017|2019, /szn, /szn/tour, /footwear, /merch and merch collection paths. Detail: /products/{year}/{slug}, /merch/p/{handle}, /szn/{sku}.",
    pagination: "Listing pages appear complete (no page=). era/2017 HTML had 428 product links vs about-page 675 for seasons 3–6 — union of listings used.",
    detail_pages: "SSR product/merch pages with description, type, year, additional images.",
    category_pages: "Era, footwear, SZN, merch collections matching Paris Saint handles.",
    image_cdn: "/archive/img/*.webp ; merch uses cdn.shopify.com ; SZN uses cdn.swell.store.",
    metadata_fields: ["title", "type", "year", "style/SKU when present", "section", "Paris Saint credit"],
    public_json_endpoints: ["none as a stable catalog URL; searchIndex JS is UI code, not used as an API."],
    estimated_records: "About page claims 2,463 items",
    crawl_plan: "Cheerio on listing HTML, then detail HTML for /products, /szn, and high-value merch.",
  },
  {
    id: "yetracker",
    name: "Ye Tracker",
    url: "https://yetracker.cc/",
    robots_txt: "https://yetracker.cc/robots.txt",
    robots_status: "200 but returns the SPA HTML shell (not a robots policy document). No Disallow rules published.",
    crawl_allowed: true,
    skip_reason: null,
    terms_notes: "Public unauthenticated JSON (cache-control public, x-source: r2) used by the site itself.",
    rendering: "js-spa",
    structure: "Vite SPA. Tabs: main, released, art, misc, tracklists, special, stems, samples, grails, fakes, etc.",
    pagination: "Each tab is one JSON document.",
    detail_pages: "No separate HTML routes; records keyed by tab + era + name.",
    category_pages: "Tabs and eras inside JSON (e.g. Before The College Dropout …).",
    image_cdn: "https://yetracker.cc/img/{hash} and era cover_art URLs.",
    metadata_fields: [
      "Era",
      "Name",
      "Notes",
      "Track Length",
      "File Date",
      "Leak Date",
      "Available Length",
      "Quality",
      "art_type",
      "project_type",
      "use",
      "designer",
      "misc_type",
      "tracklist",
    ],
    public_json_endpoints: ["/api/manifest", "/api/tab/{tab}"],
    estimated_records: "manifest: main 9701, released 1460, art 717, misc 766, tracklists 439, plus other tabs",
    crawl_plan: "Fetch manifest + every public tab. Preserve tracker terminology. Images only from yetracker.cc/img/. Do not follow leak file hosts.",
  },
  {
    id: "yetracker-net",
    name: "Ye Tracker (yetracker.net)",
    url: "https://yetracker.net/",
    robots_txt: "https://yetracker.net/robots.txt",
    robots_status: "404 application/json {status:404}. HTML responses carry x-robots-tag: noindex, nofollow, nosnippet.",
    crawl_allowed: false,
    skip_reason: "Google Sheets/Drive document with noindex,nofollow; not a public HTML catalog",
    terms_notes: "GET / returns Google Spreadsheets client HTML (title: Ye Tracker - Google Drive). Skipped rather than scraping Sheets.",
    rendering: "google-sheets",
    structure: "Published Google Sheet behind the yetracker.net host.",
    pagination: "n/a",
    detail_pages: "n/a",
    category_pages: "n/a",
    image_cdn: "n/a",
    metadata_fields: [],
    public_json_endpoints: [],
    estimated_records: "same tracker corpus as yetracker.cc",
    crawl_plan: "SKIP. Use yetracker.cc public website/JSON instead.",
  },
  {
    id: "yetour",
    name: "Ye Tour",
    url: "https://yetour.xyz/",
    robots_txt: "https://yetour.xyz/robots.txt",
    robots_status: "200. Slurp Disallow: /. User-agent: * Disallow: /admin/. Sitemap listed.",
    crawl_allowed: true,
    skip_reason: null,
    terms_notes: "Public tour archive. Homepage loads /api/catalog/{year}. Did not call /api/admin/login or upload endpoints.",
    rendering: "hybrid",
    structure: "Year catalogs with merch, music, shows. Sitemap ~252 URLs (shows, merch, visualizer, music, years).",
    pagination: "One catalog JSON per year (2021, 2023, 2024, 2025, 2026).",
    detail_pages: "/shows/{slug}, /merch/{venue}/{slug}, /visualizer/{slug}, /{year}/music/…",
    category_pages: "Year and venue folders.",
    image_cdn: "https://media.yetour.xyz/ (merch, live-shows/thumbnails, music-videos stills).",
    metadata_fields: ["show name", "category", "spec", "timestamps/setlist", "merch files/folder", "music type"],
    public_json_endpoints: ["/api/catalog/{year}", "sitemap.xml"],
    estimated_records: "2026 catalog: 130 merch + 28 shows + 10 music; smaller catalogs in earlier years",
    crawl_plan: "Catalog JSON + sitemap for canonical page URLs. Download stills only, skip mp4.",
  },
  {
    id: "instagram-rckdmn",
    name: "Instagram @rckdmn",
    url: "https://www.instagram.com/rckdmn/",
    robots_txt: "https://www.instagram.com/robots.txt",
    robots_status: "Prohibits collection of data through automated means without express written permission from Instagram.",
    crawl_allowed: false,
    skip_reason: "Research lead only; Instagram robots/terms disallow automated collection",
    terms_notes: "Not auto-scraped. Listed in SOURCES.md.",
    rendering: "js-spa",
    structure: "Social profile.",
    pagination: "n/a",
    detail_pages: "n/a",
    category_pages: "n/a",
    image_cdn: "n/a",
    metadata_fields: [],
    public_json_endpoints: [],
    estimated_records: "n/a",
    crawl_plan: "Do not scrape.",
  },
  {
    id: "instagram-yzy-rchv",
    name: "Instagram @yzy.rchv",
    url: "https://www.instagram.com/yzy.rchv/",
    robots_txt: "https://www.instagram.com/robots.txt",
    robots_status: "Same Instagram automated-collection prohibition.",
    crawl_allowed: false,
    skip_reason: "Research lead only; Instagram robots/terms disallow automated collection",
    terms_notes: "Not auto-scraped. Listed in SOURCES.md.",
    rendering: "js-spa",
    structure: "Social profile.",
    pagination: "n/a",
    detail_pages: "n/a",
    category_pages: "n/a",
    image_cdn: "n/a",
    metadata_fields: [],
    public_json_endpoints: [],
    estimated_records: "n/a",
    crawl_plan: "Do not scrape.",
  },
  {
    id: "reddit-yzy-droam",
    name: "Reddit r/Kanye YZY Droam thread",
    url: "https://www.reddit.com/r/Kanye/comments/1i6i5aq/yzy_droam_visualization_and_details/",
    robots_txt: "https://www.reddit.com/robots.txt",
    robots_status: "User-agent: * Disallow: /. Public Content Policy restricts automated access.",
    crawl_allowed: false,
    skip_reason: "Research lead only; robots.txt Disallow: / for User-agent: *",
    terms_notes: "Not auto-scraped. Listed in SOURCES.md.",
    rendering: "hybrid",
    structure: "Single discussion thread.",
    pagination: "n/a",
    detail_pages: "n/a",
    category_pages: "n/a",
    image_cdn: "n/a",
    metadata_fields: [],
    public_json_endpoints: [],
    estimated_records: "n/a",
    crawl_plan: "Do not scrape.",
  },
];

async function run(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeJson("data/source-audit.json", {
    generated_at: nowIso(),
    phase: 1,
    user_permission_note:
      "Operator (Shazaan123) states permission from relevant site owners to use archival images. Crawler only accessed normal public pages/assets and honored robots.txt.",
    sources: SOURCE_AUDIT,
  });
  log("wrote data/source-audit.json");

  const adapters: Array<() => Promise<AdapterResult>> = [
    scrapeYzytwts,
    scrapeYetrackerNet,
    scrapeYetour,
    scrapeYetracker,
    scrapeParisaint,
    scrapeYeezyarchive,
    scrapeYzylibrary,
  ];

  const results: AdapterResult[] = [];
  const allRecords: ArchiveRecord[] = [];

  for (const fn of adapters) {
    const started = Date.now();
    try {
      const result = await fn();
      results.push(result);
      allRecords.push(...result.records);
      log(
        `${result.sourceId}: records=${result.records.length} skipped=${result.skipped} failed=${result.failedPages.length} (${Math.round((Date.now() - started) / 1000)}s)`,
      );
      await writeJson("data/archive.json", allRecords);
    } catch (e) {
      const msg = e instanceof Error ? e.stack || e.message : String(e);
      log(`ADAPTER CRASH ${fn.name}: ${msg}`);
      results.push({
        sourceId: fn.name,
        sourceName: fn.name,
        sourceUrl: "",
        records: [],
        failedPages: [{ url: "adapter", reason: msg }],
        skipped: true,
        skipReason: `adapter exception: ${msg}`,
        notes: [msg],
      });
    }
  }

  log("waiting for image downloads…");
  await waitForDownloads();
  await writeJson("data/archive.json", allRecords);

  const { images, duplicates, reportExtras } = await buildImageIndexAndDedupe(allRecords);
  await writeJson("data/images.json", images);
  await writeJson("data/duplicates.json", duplicates);

  const perSource: ScrapeReport["sources"] = {};
  const failedPages: ScrapeReport["failed_pages"] = [];
  const uncrawled: string[] = [];
  let skippedSources = 0;
  for (const r of results) {
    const recs = r.records;
    const imgsDl = recs.reduce((n, rec) => n + rec.images.filter((i) => i.local_path).length, 0);
    const imgsRef = recs.reduce((n, rec) => n + rec.images.length, 0);
    perSource[r.sourceId] = {
      records: recs.length,
      images_downloaded: imgsDl,
      images_referenced: imgsRef,
      failed_pages: r.failedPages.length,
      skipped: r.skipped,
      skip_reason: r.skipReason,
      notes: r.notes,
    };
    if (r.skipped) {
      skippedSources++;
      uncrawled.push(`${r.sourceId}: ${r.skipReason || "skipped"}`);
    }
    for (const f of r.failedPages) failedPages.push({ source: r.sourceId, url: f.url, reason: f.reason });
  }

  const missingSourceUrls = allRecords.filter((r) => !r.source?.url).map((r) => r.id);
  const missingProvenance = allRecords
    .filter((r) => !r.source?.name || !r.source?.url || !r.scraped_at)
    .map((r) => r.id);

  const report: ScrapeReport = {
    generated_at: nowIso(),
    sources: perSource,
    totals: {
      records: allRecords.length,
      images_downloaded: images.filter((i) => i.file).length,
      images_referenced: images.length,
      duplicates_flagged: duplicates.length,
      failed_pages: failedPages.length,
      skipped_sources: skippedSources,
      broken_images: reportExtras.broken_images.length,
      tiny_files: reportExtras.tiny_files.length,
      missing_source_urls: missingSourceUrls.length,
      missing_provenance: missingProvenance.length,
      duplicate_filenames: reportExtras.duplicate_filenames.length,
    },
    uncrawled_sources: uncrawled,
    broken_images: reportExtras.broken_images,
    tiny_files: reportExtras.tiny_files,
    duplicate_filenames: reportExtras.duplicate_filenames,
    missing_source_urls: missingSourceUrls.slice(0, 200),
    missing_provenance: missingProvenance.slice(0, 200),
    failed_pages: failedPages,
  };
  await writeJson("data/scrape-report.json", report);

  await buildFigmaExport(allRecords);

  console.log("\n==============================");
  console.log("YE ARCHIVE SCRAPE COMPLETE");
  console.log("==============================");
  for (const [id, s] of Object.entries(perSource)) {
    const flag = s.skipped ? " SKIPPED" : s.records === 0 ? " FAILED" : "";
    console.log(
      `${id}: records=${s.records} images_downloaded=${s.images_downloaded} images_referenced=${s.images_referenced} failed_pages=${s.failed_pages}${flag}`,
    );
    if (s.skip_reason) console.log(`  skip: ${s.skip_reason}`);
  }
  console.log("------------------------------");
  console.log(`TOTAL records=${report.totals.records}`);
  console.log(`TOTAL images_downloaded=${report.totals.images_downloaded}`);
  console.log(`DUPLICATES flagged=${report.totals.duplicates_flagged}`);
  console.log(`FAILED pages=${report.totals.failed_pages}`);
  console.log(`SKIPPED sources=${report.totals.skipped_sources}`);
  console.log(`UNCRAWLED: ${uncrawled.join(" | ") || "(none)"}`);
  console.log("==============================\n");

  await writeFile(path.join(ROOT, "data", "scrape-console.txt"), scrapeConsoleText(report, perSource, uncrawled));
}

function scrapeConsoleText(
  report: ScrapeReport,
  perSource: ScrapeReport["sources"],
  uncrawled: string[],
): string {
  const lines = ["YE ARCHIVE SCRAPE COMPLETE"];
  for (const [id, s] of Object.entries(perSource)) {
    lines.push(
      `${id}: records=${s.records} images=${s.images_downloaded} referenced=${s.images_referenced} failed=${s.failed_pages} skipped=${s.skipped}`,
    );
    if (s.skip_reason) lines.push(`  skip: ${s.skip_reason}`);
  }
  lines.push(
    `TOTAL=${report.totals.records} DUPLICATES=${report.totals.duplicates_flagged} FAILED=${report.totals.failed_pages} SKIPPED=${report.totals.skipped_sources}`,
  );
  lines.push(`UNCRAWLED: ${uncrawled.join(" | ")}`);
  return lines.join("\n");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
