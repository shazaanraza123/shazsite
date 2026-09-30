import type { AdapterResult } from "./types.ts";

/**
 * yzy-twts.com robots.txt:
 *   User-agent: *
 *   Disallow: /
 * Automated crawling is disallowed. This adapter records the skip and does not fetch pages.
 */
export async function scrapeYzytwts(): Promise<AdapterResult> {
  return {
    sourceId: "yzytwts",
    sourceName: "YZY TWTS",
    sourceUrl: "https://yzy-twts.com/",
    records: [],
    failedPages: [],
    skipped: true,
    skipReason: "robots.txt User-agent: * Disallow: / — automated crawling is disallowed",
    notes: [
      "robots.txt (200 text/plain) ends with a catch-all Disallow: / for User-agent: *.",
      "Specific search crawlers are Allow: /; archival/AI bulk agents are not.",
      "Public site structure observed only from the already-fetched homepage during the source audit (year index /2026…/2007, /about, /faq, /search) — those URLs were not crawled as a dataset.",
      "Treat as a research lead for social archival records; do not auto-scrape.",
    ],
  };
}
