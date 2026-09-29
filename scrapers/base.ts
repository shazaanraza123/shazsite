import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, stat, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { ArchiveImage, ArchiveRecord, SourceClaim } from "./types.ts";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = path.join(ROOT, "data");
export const ARCHIVE_DIR = path.join(ROOT, "public", "archive");

export const USER_AGENT =
  "Mozilla/5.0 (compatible; YeArchiveResearchBot/1.0; +https://github.com/shazaanraza123/shazsite; archival research with site-owner permission)";

export const RATE_MS = 1100;
const MAX_RETRIES = 3;
export const MIN_IMAGE_BYTES = 8000;
export const MIN_DIMENSION = 180;
export const MAX_STORE_EDGE = 1600;
export const MAX_IMAGE_BYTES = 12_000_000;

const lastRequestAt = new Map<string, number>();
const downloadedUrls = new Map<string, { local_path: string; width: number; height: number; sha256: string }>();
export const scrapeLog: string[] = [];

type DownloadJob = () => Promise<void>;
const downloadJobs: DownloadJob[] = [];
let downloadRunning = 0;
const MAX_DOWNLOAD_PARALLEL = 6;

function pumpDownloads(): void {
  while (downloadRunning < MAX_DOWNLOAD_PARALLEL && downloadJobs.length) {
    const job = downloadJobs.shift()!;
    downloadRunning++;
    job()
      .catch((e) => log(`download job error: ${e instanceof Error ? e.message : e}`))
      .finally(() => {
        downloadRunning--;
        pumpDownloads();
      });
  }
}

export function enqueueDownload(job: DownloadJob): void {
  downloadJobs.push(job);
  pumpDownloads();
}

export async function waitForDownloads(): Promise<void> {
  while (downloadRunning > 0 || downloadJobs.length > 0) {
    await sleep(250);
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}`;
  scrapeLog.push(line);
  console.log(line);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

export async function throttle(url: string): Promise<void> {
  const host = hostOf(url);
  const prev = lastRequestAt.get(host) ?? 0;
  const wait = prev + RATE_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(host, Date.now());
}

export function slugify(input: string, fallback = "untitled"): string {
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return s || fallback;
}

export function recordId(sourceId: string, ...parts: Array<string | number>): string {
  const raw = [sourceId, ...parts.map(String)].join(":");
  return `${sourceId}-${createHash("sha1").update(raw).digest("hex").slice(0, 16)}`;
}

export function absUrl(base: string, href: string): string {
  return new URL(href, base).toString();
}

export function claim(
  field: string,
  value: string | number | null | undefined,
  sourceName: string,
  sourceUrl: string,
): SourceClaim | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return { field, value: String(value), source_name: sourceName, source_url: sourceUrl };
}

export function pushClaims(record: ArchiveRecord, claims: Array<SourceClaim | null>): void {
  for (const c of claims) if (c) record.source_claims.push(c);
}

const CHROME_RE =
  /logo|favicon|sprite|pixel|tracking|1x1|payment|badge|icon[-_.]|wordmark|home\.svg|searchinactive|flags\/[a-z]{2}\.svg|shopify\/static/i;

export function isChromeUrl(url: string): boolean {
  return CHROME_RE.test(url);
}

export function preferImageUrl(url: string): string {
  try {
    const u = new URL(url);
    // YZY Library Cloudflare transform → original on same CDN
    if (u.hostname.includes("cdn.yzylibrary.com") && u.pathname.includes("/cdn-cgi/image/")) {
      const file = u.pathname.split("/").pop();
      if (file) return `https://www.cdn.yzylibrary.com/${file}`;
    }
    // Shopify: request large derivative, never invent pixels beyond source
    if (u.hostname.includes("cdn.shopify.com") || u.hostname.includes("parisaint.com")) {
      u.searchParams.delete("width");
      u.searchParams.set("width", "2000");
      return u.toString();
    }
    if (u.hostname.includes("cdn.swell.store")) {
      u.searchParams.set("width", "1600");
      return u.toString();
    }
    return u.toString();
  } catch {
    return url;
  }
}

export async function fetchText(
  url: string,
  opts: { accept?: string } = {},
): Promise<{ ok: boolean; status: number; url: string; body: string; contentType: string; error?: string }> {
  let lastErr = "unknown";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await throttle(url);
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: opts.accept ?? "text/html,application/json;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });
      const contentType = res.headers.get("content-type") || "";
      if (res.status === 403 || res.status === 401 || res.status === 429) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          status: res.status,
          url: res.url,
          body,
          contentType,
          error: `blocked HTTP ${res.status}`,
        };
      }
      const body = await res.text();
      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
          await sleep(2000 * 2 ** attempt);
          continue;
        }
        return { ok: false, status: res.status, url: res.url, body, contentType, error: lastErr };
      }
      return { ok: true, status: res.status, url: res.url, body, contentType };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt < MAX_RETRIES - 1) await sleep(2000 * 2 ** attempt);
    }
  }
  return { ok: false, status: 0, url, body: "", contentType: "", error: lastErr };
}

export async function fetchBuffer(
  url: string,
): Promise<{ ok: boolean; status: number; buffer: Buffer; contentType: string; error?: string }> {
  let lastErr = "unknown";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await throttle(url);
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
        redirect: "follow",
      });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        if ((res.status >= 500 || res.status === 429) && attempt < MAX_RETRIES - 1) {
          await sleep(2000 * 2 ** attempt);
          continue;
        }
        return { ok: false, status: res.status, buffer: Buffer.alloc(0), contentType, error: lastErr };
      }
      const ab = await res.arrayBuffer();
      return { ok: true, status: res.status, buffer: Buffer.from(ab), contentType };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt < MAX_RETRIES - 1) await sleep(2000 * 2 ** attempt);
    }
  }
  return { ok: false, status: 0, buffer: Buffer.alloc(0), contentType: "", error: lastErr };
}

export async function dhashHex(img: sharp.Sharp): Promise<string | null> {
  try {
    const { data, info } = await img
      .clone()
      .greyscale()
      .resize(9, 8, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let bits = "";
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width - 1; x++) {
        const i = y * info.width + x;
        bits += data[i] < data[i + 1] ? "1" : "0";
      }
    }
    return BigInt("0b" + bits).toString(16).padStart(16, "0");
  } catch {
    return null;
  }
}

export interface SavedImage {
  local_path: string;
  width: number;
  height: number;
  sha256: string;
  phash: string | null;
  bytes: number;
}

export async function saveImage(
  originalUrl: string,
  destRel: string,
): Promise<{ saved: SavedImage | null; skipReason?: string }> {
  const preferred = preferImageUrl(originalUrl);
  if (isChromeUrl(preferred)) return { saved: null, skipReason: "chrome-asset" };
  const cached = downloadedUrls.get(preferred) || downloadedUrls.get(originalUrl);
  if (cached) {
    return {
      saved: {
        local_path: cached.local_path,
        width: cached.width,
        height: cached.height,
        sha256: cached.sha256,
        phash: null,
        bytes: 0,
      },
    };
  }

  const got = await fetchBuffer(preferred);
  if (!got.ok) return { saved: null, skipReason: got.error || "fetch-failed" };
  if (got.buffer.length < MIN_IMAGE_BYTES) return { saved: null, skipReason: `tiny-${got.buffer.length}b` };
  if (got.buffer.length > MAX_IMAGE_BYTES) return { saved: null, skipReason: "too-large" };

  let pipeline: sharp.Sharp;
  try {
    pipeline = sharp(got.buffer, { failOn: "none" });
  } catch {
    return { saved: null, skipReason: "not-an-image" };
  }
  let meta: sharp.Metadata;
  try {
    meta = await pipeline.metadata();
  } catch {
    return { saved: null, skipReason: "unreadable-image" };
  }
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w < MIN_DIMENSION || h < MIN_DIMENSION) {
    return { saved: null, skipReason: `small-dim-${w}x${h}` };
  }

  const abs = path.join(ROOT, destRel);
  await mkdir(path.dirname(abs), { recursive: true });

  const longEdge = Math.max(w, h);
  const shouldResize = longEdge > MAX_STORE_EDGE;
  const outW = shouldResize ? Math.round(w * (MAX_STORE_EDGE / longEdge)) : w;
  const outH = shouldResize ? Math.round(h * (MAX_STORE_EDGE / longEdge)) : h;

  const ext = destRel.toLowerCase().endsWith(".png") ? "png" : "jpg";
  const finalRel = destRel.replace(/\.[a-z0-9]+$/i, ext === "png" ? ".png" : ".jpg");
  const finalAbs = path.join(ROOT, finalRel);

  try {
    let out = pipeline.clone().rotate();
    if (shouldResize) out = out.resize({ width: outW, height: outH, fit: "inside", withoutEnlargement: true });
    if (ext === "png") await out.png({ compressionLevel: 9 }).toFile(finalAbs);
    else await out.jpeg({ quality: 85, mozjpeg: true }).toFile(finalAbs);
  } catch (e) {
    return { saved: null, skipReason: `encode-failed:${e instanceof Error ? e.message : e}` };
  }

  const written = await readFile(finalAbs);
  const sha256 = createHash("sha256").update(written).digest("hex");
  const phash = await dhashHex(sharp(written));
  const st = await stat(finalAbs);
  const saved: SavedImage = {
    local_path: finalRel.replace(/\\/g, "/"),
    width: shouldResize ? outW : w,
    height: shouldResize ? outH : h,
    sha256,
    phash,
    bytes: st.size,
  };
  downloadedUrls.set(preferred, {
    local_path: saved.local_path,
    width: saved.width,
    height: saved.height,
    sha256,
  });
  downloadedUrls.set(originalUrl, downloadedUrls.get(preferred)!);
  return { saved };
}

export function imageDest(
  domainFolder: string,
  group: string | null,
  title: string,
  index: number,
  originalUrl: string,
): string {
  const era = slugify(group || "misc-unclassified", "misc-unclassified");
  let ext = "jpg";
  try {
    const p = new URL(originalUrl).pathname.toLowerCase();
    if (p.endsWith(".png") || p.endsWith(".webp")) ext = "jpg";
    if (p.endsWith(".gif")) ext = "jpg";
  } catch {
    /* keep jpg */
  }
  return path.posix.join(
    "public/archive",
    domainFolder,
    era,
    `${slugify(title).slice(0, 50)}-${String(index).padStart(2, "0")}.${ext}`,
  );
}

export async function attachImage(
  record: ArchiveRecord,
  originalUrl: string,
  sourcePage: string,
  opts: { caption?: string | null; role?: string; group?: string | null; download?: boolean; index?: number },
): Promise<void> {
  if (!originalUrl || isChromeUrl(originalUrl)) return;
  const existing = record.images.find((i) => i.original_url === originalUrl || i.original_url === preferImageUrl(originalUrl));
  if (existing) return;
  const img: ArchiveImage = {
    local_path: null,
    original_url: preferImageUrl(originalUrl),
    source_page: sourcePage,
    width: null,
    height: null,
    caption: opts.caption ?? null,
    role: opts.role || "unknown",
  };
  record.images.push(img);
  if (opts.download !== false) {
    const dest = imageDest(
      hostOf(record.source.url).replace(/^www\./, ""),
      opts.group || record.era || record.project,
      record.title,
      opts.index ?? record.images.length,
      originalUrl,
    );
    enqueueDownload(async () => {
      const { saved, skipReason } = await saveImage(originalUrl, dest);
      if (saved) {
        img.local_path = saved.local_path;
        img.width = saved.width;
        img.height = saved.height;
        (img as ArchiveImage & { sha256?: string; phash?: string | null }).sha256 = saved.sha256;
        (img as ArchiveImage & { sha256?: string; phash?: string | null }).phash = saved.phash;
      } else if (skipReason) {
        log(`image skip ${originalUrl.slice(0, 90)} :: ${skipReason}`);
      }
    });
  }
}

export function confidenceOf(record: ArchiveRecord): "high" | "medium" | "low" {
  const hasUrl = Boolean(record.source?.url);
  const hasTitle = Boolean(record.title && record.title !== "Untitled");
  const hasImg = record.images.length > 0;
  const hasDesc = Boolean(record.description && record.description.length > 40);
  if (hasUrl && hasTitle && (hasImg || hasDesc)) return "high";
  if (hasUrl && hasTitle) return "medium";
  return "low";
}

export function finishRecord(record: ArchiveRecord): ArchiveRecord {
  record.confidence = confidenceOf(record);
  return record;
}

export function extractBalancedJson(text: string, startBrace: number): string | null {
  if (text[startBrace] !== "{") return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = startBrace; i < text.length; i++) {
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
      if (depth === 0) return text.slice(startBrace, i + 1);
    }
  }
  return null;
}

export function unescapeNextPayload(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

export function nextPayloads(html: string): string[] {
  const out: string[] = [];
  const re = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push(unescapeNextPayload(m[1]));
  }
  return out;
}

export function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'");
}

export function visibleText(html: string): string {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n")
      .replace(/\n+/g, "\n"),
  )
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

export function yearFrom(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = String(text).match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

export function statusFromSourceText(text: string | null | undefined): { status: string; term: string | null } {
  if (!text) return { status: "UNCONFIRMED", term: null };
  const t = text.toLowerCase();
  const pairs: Array<[RegExp, string]> = [
    [/\bnever recorded\b/, "NEVER RECORDED"],
    [/\bunreleased\b/, "UNRELEASED"],
    [/\bprototype\b/, "PROTOTYPE"],
    [/\bsample\b/, "SAMPLE"],
    [/\bcancelled\b|\bcanceled\b/, "CANCELLED"],
    [/\bconcept\b/, "CONCEPT"],
    [/\blost\b/, "LOST"],
    [/\bpartial\b/, "PARTIAL"],
    [/\bunrealized\b|\bunbuilt\b|\bunused\b/, "UNRELEASED"],
    [/\breleased\b/, "RELEASED"],
    [/\brealized\b/, "REALIZED"],
  ];
  for (const [re, status] of pairs) {
    const m = t.match(re);
    if (m) return { status, term: m[0] };
  }
  return { status: "UNCONFIRMED", term: null };
}

export function domainFromHints(text: string): ArchiveRecord["domain"] {
  const t = (text || "").toLowerCase();
  if (/\bunreleased\b|\bprototype\b|\bsample\b|\bcancelled\b|\bconcept\b|\nunrealized\b/.test(t) && /\b(album|track|song|garment|building|tour)\b/.test(t)) {
    /* keep more specific below */
  }
  if (/\b(hoodie|tee|jacket|pant|boot|sneaker|garment|season \d|yeezy gap|merch)\b/.test(t)) return "FASHION";
  if (/\b(album|track|song|mixtape|stem|demo|cover art)\b/.test(t)) return "MUSIC";
  if (/\b(tour|setlist|concert|performance|stage|show)\b/.test(t)) return "PERFORMANCE";
  if (/\b(film|movie|visualizer|commercial|music video)\b/.test(t)) return "FILM";
  if (/\b(building|architecture|yeezy home)\b/.test(t)) return "ARCHITECTURE";
  if (/\b(sketch|artwork|graphic|design)\b/.test(t)) return "DESIGN";
  if (/\b(interview|book|paperwork|document|letter)\b/.test(t)) return "WRITING";
  if (/\b(tweet|post|social)\b/.test(t)) return "SOCIAL";
  return "EPHEMERA";
}

/** Only used when the source itself names a type/category. Do not call with guessed text. */
export function passthroughDomain(sourceCategory: string | null | undefined, fallback: ArchiveRecord["domain"]): ArchiveRecord["domain"] {
  if (!sourceCategory) return fallback;
  const t = sourceCategory.toLowerCase();
  if (t.includes("footwear") || t.includes("apparel") || t.includes("merch") || t.includes("season")) return "FASHION";
  if (t.includes("music") || t.includes("album")) return "MUSIC";
  if (t.includes("tour") || t.includes("live") || t.includes("show")) return "PERFORMANCE";
  if (t.includes("art") || t.includes("design")) return "DESIGN";
  if (t.includes("doc") || t.includes("misc")) return "EPHEMERA";
  return fallback;
}

export async function writeJson(rel: string, data: unknown): Promise<void> {
  const abs = path.join(ROOT, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, JSON.stringify(data, null, 2));
}

export async function appendNdjson(rel: string, obj: unknown): Promise<void> {
  const abs = path.join(ROOT, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await appendFile(abs, JSON.stringify(obj) + "\n");
}

export function stripTags(html: string | null | undefined): string | null {
  if (!html) return null;
  const t = decodeHtml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  return t || null;
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function parseSitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((m) => decodeHtml(m[1].trim()));
}
