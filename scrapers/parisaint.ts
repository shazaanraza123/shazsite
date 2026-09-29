import {
  attachImage,
  claim,
  fetchText,
  finishRecord,
  log,
  nowIso,
  preferImageUrl,
  pushClaims,
  recordId,
  statusFromSourceText,
  stripTags,
  yearFrom,
} from "./base.ts";
import type { AdapterResult, ArchiveRecord } from "./types.ts";

const SOURCE_NAME = "Paris Saint";
const BASE = "https://www.parisaint.com";
const SOURCE_ID = "parisaint";

function collectionDomain(handle: string, title: string): ArchiveRecord["domain"] {
  const t = `${handle} ${title}`.toLowerCase();
  if (t.includes("collectible")) return "OBJECTS";
  return "FASHION";
}

function peopleFromTags(tags: string[]): string[] {
  const known = new Set(["Wes Lang", "Virgil Abloh"]);
  return tags.filter((t) => known.has(t));
}

export async function scrapeParisaint(): Promise<AdapterResult> {
  const failedPages: AdapterResult["failedPages"] = [];
  const notes: string[] = [];
  const records: ArchiveRecord[] = [];

  const handleToCollections = new Map<string, string[]>();
  const collectionsMeta: Array<{ handle: string; title: string; products_count: number }> = [];

  for (let page = 1; page <= 20; page++) {
    const url = `${BASE}/collections.json?limit=250&page=${page}`;
    log(`parisaint collections.json page ${page}`);
    const res = await fetchText(url, { accept: "application/json" });
    if (!res.ok) {
      failedPages.push({ url, reason: res.error || "fail" });
      break;
    }
    let data: any;
    try {
      data = JSON.parse(res.body);
    } catch {
      failedPages.push({ url, reason: "invalid json" });
      break;
    }
    const cols = data.collections || [];
    if (!cols.length) break;
    for (const c of cols) {
      collectionsMeta.push({ handle: c.handle, title: c.title, products_count: c.products_count });
    }
  }

  for (const col of collectionsMeta) {
    for (let page = 1; page <= 40; page++) {
      const url = `${BASE}/collections/${col.handle}/products.json?limit=250&page=${page}`;
      const res = await fetchText(url, { accept: "application/json" });
      if (!res.ok) {
        failedPages.push({ url, reason: res.error || "fail" });
        break;
      }
      let data: any;
      try {
        data = JSON.parse(res.body);
      } catch {
        failedPages.push({ url, reason: "invalid json" });
        break;
      }
      const prods = data.products || [];
      if (!prods.length) break;
      for (const p of prods) {
        const arr = handleToCollections.get(p.handle) || [];
        if (!arr.includes(col.title)) arr.push(col.title);
        handleToCollections.set(p.handle, arr);
      }
      if (prods.length < 250) break;
    }
  }
  notes.push(`collections=${collectionsMeta.length}`);

  const seen = new Set<string>();
  for (let page = 1; page <= 30; page++) {
    const url = `${BASE}/products.json?limit=250&page=${page}`;
    log(`parisaint products.json page ${page}`);
    const res = await fetchText(url, { accept: "application/json" });
    if (!res.ok) {
      failedPages.push({ url, reason: res.error || "fail" });
      break;
    }
    let data: any;
    try {
      data = JSON.parse(res.body);
    } catch {
      failedPages.push({ url, reason: "invalid json" });
      break;
    }
    const prods = data.products || [];
    if (!prods.length) break;
    for (const p of prods) {
      if (seen.has(p.handle)) continue;
      seen.add(p.handle);
      const pageUrl = `${BASE}/products/${p.handle}`;
      const tags: string[] = Array.isArray(p.tags)
        ? p.tags
        : String(p.tags || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
      const collections = handleToCollections.get(p.handle) || [];
      const blob = `${p.title} ${tags.join(" ")} ${collections.join(" ")} ${p.body_html || ""}`;
      const { status, term } = statusFromSourceText(blob);
      const rec: ArchiveRecord = {
        id: recordId(SOURCE_ID, p.handle),
        title: p.title,
        date: p.published_at || null,
        year: yearFrom(p.title) || yearFrom(collections.join(" ")) || yearFrom(p.published_at),
        domain: collectionDomain(collections.join(" "), p.title),
        type: p.product_type || tags.find((t) => /tee|hoodie|jacket|pant|footwear|collectible|accessory/i.test(t)) || "product",
        subtype: collections[0] || p.product_type || null,
        era: collections.find((c) => /yeezus|season|pablo|donda|dropout|jesus|wyoming|gap|calabasas/i.test(c)) || null,
        project: collections[0] || null,
        status,
        status_source_term: term,
        description: stripTags(p.body_html),
        people: peopleFromTags(tags),
        organizations: p.vendor ? [p.vendor] : ["Paris Saint"],
        related_records: [],
        references: [pageUrl],
        images: [],
        source: { name: SOURCE_NAME, url: pageUrl },
        source_claims: [],
        confidence: "medium",
        scraped_at: nowIso(),
      };
      pushClaims(rec, [
        claim("title", p.title, SOURCE_NAME, pageUrl),
        claim("handle", p.handle, SOURCE_NAME, pageUrl),
        claim("vendor", p.vendor, SOURCE_NAME, pageUrl),
        claim("product_type", p.product_type, SOURCE_NAME, pageUrl),
        claim("tags", tags.join(", "), SOURCE_NAME, pageUrl),
        claim("collections", collections.join(" | "), SOURCE_NAME, pageUrl),
        claim("published_at", p.published_at, SOURCE_NAME, pageUrl),
      ]);
      const highValue = /unreleased|prototype|sample|yeezus|glow in the dark|concept/i.test(blob);
      const maxDl = highValue ? 6 : 2;
      const images = Array.isArray(p.images) ? p.images : [];
      let idx = 0;
      for (const im of images) {
        if (!im.src) continue;
        idx++;
        await attachImage(rec, preferImageUrl(im.src), pageUrl, {
          caption: null,
          role: im.position === 1 ? "primary" : "unknown",
          group: rec.era || rec.project,
          index: idx,
          download: idx <= maxDl,
        });
      }
      records.push(finishRecord(rec));
    }
    if (prods.length < 250) break;
  }

  notes.push(`products=${records.length}`);
  notes.push("Used public Shopify storefront JSON (products.json / collections.json), allowed by robots.txt Allow: /.");
  notes.push("Did not request /cart.js, checkout, account, or other disallowed paths.");

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
