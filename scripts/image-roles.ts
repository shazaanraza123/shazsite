/**
 * Targeted resume of missing YZY Library product images + editorial role classification.
 * Does not recrawl Paris Saint / Yeezy Archive / Tracker HTML.
 * Does not wipe archive.json — only fills local_path/width/height on images that lacked files.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { ArchiveRecord, ImageIndexRow } from "../scrapers/types.ts";
import {
  fetchText,
  imageDest,
  MIN_DIMENSION,
  MIN_IMAGE_BYTES,
  MAX_IMAGE_BYTES,
  MAX_STORE_EDGE,
  slugify,
  USER_AGENT,
} from "../scrapers/base.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const COVERAGE_URLS = [
  "https://yzylibrary.com/record/2978", // Helicopter Jacket
  "https://yzylibrary.com/record/8",
  "https://yzylibrary.com/record/9",
  "https://yzylibrary.com/record/10",
  "https://yzylibrary.com/record/12",
  "https://yzylibrary.com/record/19",
  "https://yzylibrary.com/record/20",
  "https://yzylibrary.com/record/21",
  "https://yzylibrary.com/record/22",
  "https://yzylibrary.com/record/23",
  "https://yzylibrary.com/record/25",
  "https://yzylibrary.com/record/26",
  "https://yzylibrary.com/record/27",
  "https://yzylibrary.com/record/28",
  "https://yzylibrary.com/record/29",
  "https://yzylibrary.com/record/7",
  "https://yzylibrary.com/record/6",
  "https://yzylibrary.com/record/32",
  "https://yzylibrary.com/record/35",
  "https://yzylibrary.com/record/2977",
  "https://yzylibrary.com/record/2973",
  "https://yzylibrary.com/record/30",
];

const RANK: Record<string, number> = {
  product: 100,
  "on-body": 90,
  front: 80,
  back: 70,
  detail: 60,
  label: 55,
  construction: 50,
  runway: 40,
  prototype: 35,
  sketch: 20,
  render: 15,
  reference: 10,
  unknown: 5,
};

type RoleRow = {
  record_id: string;
  original_url: string;
  local_path: string | null;
  source_page: string;
  source_name: string;
  source_role: string;
  caption: string | null;
  filename_hint: string | null;
  width: number | null;
  height: number | null;
  editorial_role: string;
  rank: number;
  evidence: string[];
};

function isProductRecord(r: ArchiveRecord) {
  return r.domain === "FASHION" || r.domain === "OBJECTS";
}

async function fetchImage(url: string): Promise<{
  ok: boolean;
  buffer: Buffer;
  contentType: string;
  filename: string | null;
  error?: string;
}> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
      redirect: "follow",
    });
    const contentType = res.headers.get("content-type") || "";
    const disp = res.headers.get("content-disposition") || "";
    const fn = disp.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i)?.[1] ?? null;
    if (!res.ok) return { ok: false, buffer: Buffer.alloc(0), contentType, filename: fn, error: `HTTP ${res.status}` };
    const buffer = Buffer.from(await res.arrayBuffer());
    return { ok: true, buffer, contentType, filename: fn ? decodeURIComponent(fn.replace(/"/g, "")) : null };
  } catch (e) {
    return { ok: false, buffer: Buffer.alloc(0), contentType: "", filename: null, error: e instanceof Error ? e.message : String(e) };
  }
}

async function saveBuffer(originalUrl: string, destRel: string, buffer: Buffer) {
  if (buffer.length < MIN_IMAGE_BYTES) return { saved: null as null, skip: `tiny-${buffer.length}b` };
  if (buffer.length > MAX_IMAGE_BYTES) return { saved: null, skip: "too-large" };
  let pipeline: sharp.Sharp;
  try {
    pipeline = sharp(buffer, { failOn: "none" });
  } catch {
    return { saved: null, skip: "not-an-image" };
  }
  let meta: sharp.Metadata;
  try {
    meta = await pipeline.metadata();
  } catch {
    return { saved: null, skip: "unreadable" };
  }
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w < MIN_DIMENSION || h < MIN_DIMENSION) return { saved: null, skip: `small-dim-${w}x${h}` };
  const abs = path.join(root, destRel);
  await mkdir(path.dirname(abs), { recursive: true });
  const longEdge = Math.max(w, h);
  const shouldResize = longEdge > MAX_STORE_EDGE;
  const outW = shouldResize ? Math.round(w * (MAX_STORE_EDGE / longEdge)) : w;
  const outH = shouldResize ? Math.round(h * (MAX_STORE_EDGE / longEdge)) : h;
  const ext = destRel.toLowerCase().endsWith(".png") && meta.hasAlpha ? "png" : "jpg";
  const finalRel = destRel.replace(/\.[a-z0-9]+$/i, ext === "png" ? ".png" : ".jpg");
  const finalAbs = path.join(root, finalRel);
  let out = pipeline.clone().rotate();
  if (shouldResize) out = out.resize({ width: outW, height: outH, fit: "inside", withoutEnlargement: true });
  if (ext === "png") await out.png({ compressionLevel: 9 }).toFile(finalAbs);
  else await out.jpeg({ quality: 85, mozjpeg: true }).toFile(finalAbs);
  const written = await readFile(finalAbs);
  const sha256 = createHash("sha256").update(written).digest("hex");
  const st = await stat(finalAbs);
  return {
    saved: {
      local_path: finalRel.replace(/\\/g, "/"),
      width: shouldResize ? outW : w,
      height: shouldResize ? outH : h,
      sha256,
      bytes: st.size,
    },
    skip: null as string | null,
  };
}

async function appearance(localPath: string) {
  try {
    const { data, info } = await sharp(path.join(root, localPath))
      .resize(48, 48, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const colors = new Set<number>();
    let black = 0;
    let white = 0;
    let skin = 0;
    const n = info.width * info.height;
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      colors.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
      const y = (r + g + b) / 3;
      if (y < 18) black++;
      if (y > 242) white++;
      if (r > 80 && g > 40 && b > 20 && r > g && g > b && r - b > 20) skin++;
    }
    return {
      unique: colors.size,
      blackRatio: black / n,
      whiteRatio: white / n,
      skinRatio: skin / n,
    };
  } catch {
    return null;
  }
}

function textBlob(parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function classifyOne(opts: {
  sourceRole: string;
  caption: string | null;
  filename: string | null;
  localPath: string | null;
  index: number;
  domain: string;
  appearance: { unique: number; blackRatio: number; whiteRatio: number; skinRatio: number } | null;
}): { role: string; evidence: string[] } {
  const evidence: string[] = [];
  const derivedName = opts.localPath ? path.basename(opts.localPath) : null;
  const termFile = opts.filename && opts.filename !== derivedName ? opts.filename : null;
  const blob = textBlob([opts.caption, termFile, opts.sourceRole]);
  const look = opts.appearance;
  const cameraFile = /^((cw|img|dsc|dscn|p[_-]?)\d+)/i.test(opts.filename ?? "") || /_DSC|IMG_|CW\d/i.test(opts.filename ?? "");

  if (/\b(sketch|illustration|drawing|cad|line.?art)\b/.test(blob)) {
    evidence.push("filename/caption names sketch");
    return { role: "sketch", evidence };
  }
  if (/\brender\b|\bmockup\b/.test(blob) && !cameraFile) {
    evidence.push("filename/caption names render");
    return { role: "render", evidence };
  }

  if (cameraFile) {
    evidence.push(`camera filename ${opts.filename}`);
    if (look && look.skinRatio > 0.03) {
      evidence.push(`skin-like pixels ${look.skinRatio.toFixed(4)}`);
      return { role: "on-body", evidence };
    }
    if (look && look.skinRatio > 0.004 && look.blackRatio > 0.7) {
      evidence.push(`black-studio lookbook skin=${look.skinRatio.toFixed(4)} black=${look.blackRatio.toFixed(2)}`);
      return { role: "on-body", evidence };
    }
    // Full-body lookbook on a black void: jeans/boots add palette even when the face is turned away.
    if (look && look.unique >= 22 && look.blackRatio > 0.78) {
      evidence.push(`full-body photographic unique=${look.unique} black=${look.blackRatio.toFixed(2)}`);
      return { role: "on-body", evidence };
    }
    if (/\b(back|rear)\b/.test(blob)) return { role: "back", evidence: [...evidence, "back term"] };
    if (/\b(front)\b/.test(blob)) return { role: "front", evidence: [...evidence, "front term"] };
    if (/\b(detail|macro)\b/.test(blob)) return { role: "detail", evidence: [...evidence, "detail term"] };
    return { role: "product", evidence };
  }

  const isIllustration =
    look &&
    look.unique < 28 &&
    (look.blackRatio > 0.45 || look.whiteRatio > 0.55) &&
    look.skinRatio < 0.03;
  if (isIllustration) evidence.push(`flat-palette unique=${look!.unique} black=${look!.blackRatio.toFixed(2)}`);

  if (isIllustration && opts.sourceRole === "primary" && !opts.caption?.includes("/products/")) {
    evidence.push("source IsPrimary + illustration-like pixels");
    return { role: "sketch", evidence };
  }

  if (/\b(runway|catwalk|show)\b/.test(blob)) {
    evidence.push("runway term");
    return { role: "runway", evidence };
  }
  if (/\b(prototype|sample|toil[eé]|muslin)\b/.test(blob)) {
    evidence.push("prototype term");
    return { role: "prototype", evidence };
  }
  if (/\b(label|hangtag|tag\b|size.?label)\b/.test(blob)) {
    evidence.push("label term");
    return { role: "label", evidence };
  }
  if (/\b(construction|seam|stitch|inside|lining|hardware)\b/.test(blob)) {
    evidence.push("construction term");
    return { role: "construction", evidence };
  }
  if (/\b(detail|macro|close.?up|crop)\b/.test(blob)) {
    evidence.push("detail term");
    return { role: "detail", evidence };
  }
  if (/\b(back|rear|verso)\b/.test(blob)) {
    evidence.push("back term");
    return { role: "back", evidence };
  }
  if (/\b(front|recto|obverse)\b/.test(blob)) {
    evidence.push("front term");
    return { role: "front", evidence };
  }
  if (/\b(on.?body|worn|model|lookbook|styled|outfit)\b/.test(blob)) {
    evidence.push("on-body term");
    return { role: "on-body", evidence };
  }
  if (look && look.skinRatio > 0.03) {
    evidence.push(`skin-like pixels ${look.skinRatio.toFixed(4)}`);
    return { role: "on-body", evidence };
  }
  if (look && look.skinRatio > 0.004 && look.blackRatio > 0.7) {
    evidence.push(`black-studio lookbook skin=${look.skinRatio.toFixed(4)} black=${look.blackRatio.toFixed(2)}`);
    return { role: "on-body", evidence };
  }
  if (opts.caption && /\/products\//i.test(opts.caption) && (!look || look.unique >= 12) && !isIllustration) {
    evidence.push("designer product-page credit");
    return { role: "product", evidence };
  }
  if (look && look.unique >= 40) {
    evidence.push(`photographic palette unique=${look.unique}`);
    return { role: "product", evidence };
  }
  if (isIllustration) {
    evidence.push("illustration-like pixels");
    return { role: "render", evidence };
  }
  if (opts.sourceRole === "primary") evidence.push("source primary flag only");
  evidence.push("insufficient evidence");
  return { role: "unknown", evidence };
}

function parseSourceImageCount(html: string): number | null {
  const m = html.match(/"Images":\s*\[/);
  if (!m || m.index == null) return null;
  const start = html.indexOf("[", m.index);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
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
      if (depth === 0) {
        try {
          const arr = JSON.parse(html.slice(start, i + 1));
          return Array.isArray(arr) ? arr.length : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function pool<T>(items: T[], n: number, fn: (item: T, i: number) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const cur = i++;
      await fn(items[cur], cur);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const records = JSON.parse(readFileSync(path.join(root, "data/archive.json"), "utf8")) as ArchiveRecord[];
  const imageIndex = JSON.parse(readFileSync(path.join(root, "data/images.json"), "utf8")) as ImageIndexRow[];
  const byUrl = new Map(imageIndex.map((row) => [row.original_url, row]));

  const coverageSet = new Set(
    records
      .filter((r) => COVERAGE_URLS.some((u) => (r.source?.url || "").replace(/\/$/, "") === u))
      .map((r) => r.id),
  );

  type Job = {
    rec: ArchiveRecord;
    img: ArchiveRecord["images"][number];
    index: number;
  };
  const jobs: Job[] = [];
  const skipDownload = process.env.SKIP_DOWNLOAD === "1";
  const priorRoles = existsSync(path.join(root, "data/image-roles.json"))
    ? (JSON.parse(readFileSync(path.join(root, "data/image-roles.json"), "utf8")).images as RoleRow[])
    : [];
  const priorFn = new Map(priorRoles.map((r) => [r.original_url, r.filename_hint]));
  const filenames = new Map<string, string>();
  for (const [k, v] of priorFn) if (v) filenames.set(k, v);

  let ok = 0;
  let fail = 0;

  if (skipDownload) {
    console.log("SKIP_DOWNLOAD=1 — classify existing locals only");
  } else {
    for (const rec of records) {
      if (rec.source?.name !== "YZY Library") continue;
      if (!isProductRecord(rec)) continue;
      const local = rec.images.filter((i) => i.local_path).length;
      const missing = rec.images
        .map((img, index) => ({ img, index }))
        .filter(({ img }) => !img.local_path && img.original_url);
      if (!missing.length) continue;
      const coverage = coverageSet.has(rec.id);
      const cap = coverage ? 10 : 8;
      if (!coverage && rec.images.length < 3) continue;
      if (!coverage && local >= 4) continue;
      const take = missing.slice(0, Math.max(0, cap - local));
      for (const m of take) jobs.push({ rec, img: m.img, index: m.index });
    }

    console.log(`download jobs ${jobs.length} coverage_records ${coverageSet.size}`);

    await pool(jobs, 4, async (job) => {
      const dest = imageDest(
        "yzylibrary.com",
        job.rec.era || job.rec.project,
        job.rec.title,
        job.index + 1,
        job.img.original_url,
      );
      const got = await fetchImage(job.img.original_url);
      if (!got.ok) {
        fail++;
        if (fail <= 8) console.log(`fail ${job.rec.id} ${got.error}`);
        return;
      }
      if (got.filename) filenames.set(job.img.original_url, got.filename);
      const { saved, skip } = await saveBuffer(job.img.original_url, dest, got.buffer);
      if (!saved) {
        fail++;
        if (fail <= 8) console.log(`skip ${job.rec.id} ${skip}`);
        return;
      }
      job.img.local_path = saved.local_path;
      job.img.width = saved.width;
      job.img.height = saved.height;
      const row = byUrl.get(job.img.original_url);
      if (row) {
        row.file = saved.local_path;
        row.width = saved.width;
        row.height = saved.height;
        row.sha256 = saved.sha256;
      }
      ok++;
      if (ok % 25 === 0) console.log(`saved ${ok}/${jobs.length}`);
    });

    console.log(`downloaded ok=${ok} fail=${fail}`);

    writeFileSync(path.join(root, "data/archive.json"), JSON.stringify(records));
    writeFileSync(path.join(root, "data/images.json"), JSON.stringify(imageIndex));
  }

  const roles: RoleRow[] = [];
  for (const rec of records) {
    if (!isProductRecord(rec) && rec.source?.name !== "YZY Library") continue;
    if (!["YZY Library", "Paris Saint", "Yeezy Archive"].includes(rec.source?.name)) continue;
    rec.images.forEach((img, index) => {
      const fn = filenames.get(img.original_url) || (img.local_path ? path.basename(img.local_path) : null);
      roles.push({
        record_id: rec.id,
        original_url: img.original_url,
        local_path: img.local_path,
        source_page: img.source_page,
        source_name: rec.source.name,
        source_role: img.role,
        caption: img.caption,
        filename_hint: fn,
        width: img.width,
        height: img.height,
        editorial_role: "pending",
        rank: 0,
        evidence: [],
        _index: index,
        _domain: rec.domain,
      } as RoleRow & { _index: number; _domain: string });
    });
  }

  const pending = roles as Array<RoleRow & { _index: number; _domain: string }>;
  console.log(`classifying ${pending.length} product-source images`);
  for (const row of pending) {
    const look = row.local_path && existsSync(path.join(root, row.local_path)) ? await appearance(row.local_path) : null;
    const { role, evidence } = classifyOne({
      sourceRole: row.source_role,
      caption: row.caption,
      filename: row.filename_hint,
      localPath: row.local_path,
      index: row._index,
      domain: row._domain,
      appearance: look,
    });
    row.editorial_role = role;
    row.rank = RANK[role] ?? RANK.unknown;
    row.evidence = evidence;
    delete (row as { _index?: number })._index;
    delete (row as { _domain?: string })._domain;
  }

  const roleFile = {
    generated_at: new Date().toISOString(),
    note: "Editorial image roles derived from source metadata, captions, filenames, and pixel statistics. Not historical claims. archive.json image.role left as scraped.",
    rank_order: Object.keys(RANK),
    images: pending,
  };
  writeFileSync(path.join(root, "data/image-roles.json"), JSON.stringify(roleFile));

  const coverage: object[] = [];
  for (const url of COVERAGE_URLS) {
    const rec = records.find((r) => (r.source?.url || "").replace(/\/$/, "") === url);
    if (!rec) {
      coverage.push({ record_id: null, source_url: url, error: "not in archive.json" });
      continue;
    }
    const page = await fetchText(url);
    const sourceCount = page.ok ? parseSourceImageCount(page.body) : null;
    const local = rec.images.filter((i) => i.local_path);
    const recRoles = pending.filter((r) => r.record_id === rec.id && r.local_path);
    recRoles.sort((a, b) => b.rank - a.rank || (b.width ?? 0) - (a.width ?? 0));
    const hero = recRoles[0];
    const missing = rec.images.filter((i) => !i.local_path).map((i) => i.original_url);
    coverage.push({
      record_id: rec.id,
      title: rec.title,
      source_url: url,
      source_image_count: sourceCount ?? rec.images.length,
      local_image_count: local.length,
      displayed_image_count: local.length,
      hero_role: hero?.editorial_role ?? null,
      hero_path: hero?.local_path ?? null,
      missing_images: missing,
      roles_present: [...new Set(recRoles.map((r) => r.editorial_role))],
    });
  }

  writeFileSync(
    path.join(root, "data/image-coverage-report.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        adapter_gap:
          "yzylibrary.ts sorted Images by IsPrimary and downloaded maxDl=1 for non-highValue garments, so the catalog illustration was saved and product/on-body stills (later in the payload) were URL-only.",
        downloaded_this_run: { ok, fail, jobs: jobs.length },
        records: coverage,
      },
      null,
      2,
    ),
  );

  const heli = coverage.find((c: any) => String(c.source_url || "").includes("/2978"));
  console.log("helicopter", JSON.stringify(heli, null, 2));
  console.log("wrote image-roles.json and image-coverage-report.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
