import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT, log } from "../scrapers/base.ts";
import type { ArchiveRecord, ArchiveImage } from "../scrapers/types.ts";

interface Pick {
  screen: string;
  folder: string;
  file: string;
  record: ArchiveRecord;
  image: ArchiveImage;
  role: string;
  position: string;
}

function downloaded(rec: ArchiveRecord): ArchiveImage[] {
  return rec.images.filter((i) => i.local_path);
}

function blob(rec: ArchiveRecord): string {
  return [
    rec.title,
    rec.era,
    rec.project,
    rec.type,
    rec.subtype,
    rec.status,
    rec.status_source_term,
    rec.description,
    rec.source_claims.map((c) => c.value).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function has(rec: ArchiveRecord, re: RegExp): boolean {
  return re.test(blob(rec));
}

function area(img: ArchiveImage): number {
  return (img.width || 0) * (img.height || 0);
}

function bestImage(rec: ArchiveRecord): ArchiveImage | null {
  const imgs = downloaded(rec).slice().sort((a, b) => area(b) - area(a));
  return imgs[0] || null;
}

function copyName(screen: string, rec: ArchiveRecord, img: ArchiveImage, idx: number): string {
  const ext = path.extname(img.local_path || "") || ".jpg";
  const slug = rec.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-|-$/g, "") || "image";
  return `${screen}-${String(idx).padStart(2, "0")}-${slug}${ext}`;
}

async function copyPicked(picks: Pick[]): Promise<void> {
  for (const p of picks) {
    const destDir = path.join(ROOT, "figma-export", p.folder);
    await mkdir(destDir, { recursive: true });
    const src = path.join(ROOT, p.image.local_path!);
    const dest = path.join(destDir, p.file);
    await copyFile(src, dest);
  }
}

export async function buildFigmaExport(records: ArchiveRecord[]): Promise<void> {
  const withImg = records.filter((r) => downloaded(r).length > 0);
  const usedFiles = new Set<string>();
  const picks: Pick[] = [];

  const take = (
    screen: string,
    folder: string,
    rec: ArchiveRecord,
    img: ArchiveImage,
    role: string,
    position: string,
    idx: number,
  ) => {
    if (!img.local_path || usedFiles.has(img.local_path) && screen !== "06-fashion") return;
    usedFiles.add(img.local_path);
    picks.push({
      screen,
      folder,
      file: copyName(screen, rec, img, idx),
      record: rec,
      image: img,
      role,
      position,
    });
  };

  // 01 ENTRY — largest iconic fashion/performance still
  const entryCandidates = withImg
    .filter((r) => downloaded(r).some((i) => area(i) > 200 * 200))
    .sort((a, b) => area(bestImage(b)!) - area(bestImage(a)!));
  const entryPref = entryCandidates.find((r) => has(r, /yeezus|mask|stage|yeezy 950|season 1|cover/)) || entryCandidates[0];
  if (entryPref) {
    take("01-entry", "01-entry", entryPref, bestImage(entryPref)!, "iconic-entry", "Full-bleed center. Single image. No grid.", 1);
  }

  // 02 ARCHIVE FIELD — diverse 15–25
  const diversityNeed: Array<{ re: RegExp; label: string }> = [
    { re: /hoodie|tee|jacket|season|garment|footwear|boot/, label: "fashion" },
    { re: /album|cover art|track|mixtape/, label: "music" },
    { re: /tour|stage|setlist|concert|show|performance/, label: "performance" },
    { re: /art|sketch|artwork|graphic|scan/, label: "artwork" },
    { re: /document|paperwork|pass|poster|lookbook/, label: "documents" },
    { re: /building|architecture/, label: "architecture" },
    { re: /object|bracelet|hat|bag|collectible/, label: "objects" },
    { re: /film|visualizer|commercial|video/, label: "film" },
    { re: /misc|ephemera|interview|tweet/, label: "ephemera" },
  ];
  let fieldIdx = 1;
  const fieldRecs: ArchiveRecord[] = [];
  for (const need of diversityNeed) {
    const hit = withImg.find((r) => has(r, need.re) && !fieldRecs.includes(r) && r !== entryPref);
    if (hit) fieldRecs.push(hit);
  }
  for (const r of withImg) {
    if (fieldRecs.length >= 22) break;
    if (r === entryPref || fieldRecs.includes(r)) continue;
    if (r.domain && !fieldRecs.some((x) => x.domain === r.domain)) fieldRecs.push(r);
  }
  for (const r of withImg) {
    if (fieldRecs.length >= 22) break;
    if (r === entryPref || fieldRecs.includes(r)) continue;
    fieldRecs.push(r);
  }
  for (const r of fieldRecs.slice(0, 22)) {
    const img = bestImage(r);
    if (!img) continue;
    take("02-archive-field", "02-archive-field", r, img, "field-cell", "Grid cell. Mixed scale. Leave uneven gaps.", fieldIdx++);
  }

  // 03 ERA YEEZUS
  const yeezus = withImg.filter((r) => has(r, /yeezus/) && !has(r, /pre-?yeezus/));
  let yIdx = 1;
  for (const r of yeezus.slice(0, 15)) {
    const img = bestImage(r);
    if (!img) continue;
    take("03-era-yeezus", "03-era-yeezus", r, img, "era-evidence", "Horizontal era row / stacked evidence. Caption with source.", yIdx++);
  }

  // 04 GLOW IN THE DARK
  const gitd = withImg.filter((r) =>
    has(r, /glow in the dark|glow-in-the-dark|\bgitd\b|glow in the dark tour/),
  );
  const gitdExtra = withImg.filter((r) =>
    has(r, /2008/) && has(r, /tour|stage|projection|sketch|book|concert/),
  );
  const gitdSet = [...gitd, ...gitdExtra.filter((r) => !gitd.includes(r))];
  let gIdx = 1;
  for (const r of gitdSet.slice(0, 12)) {
    const img = bestImage(r);
    if (!img) continue;
    take(
      "04-record-glow-in-the-dark",
      "04-record-glow-in-the-dark",
      r,
      img,
      "record-evidence",
      "Record layout: tour / stage / sketch / document. Keep source visible.",
      gIdx++,
    );
  }

  // 05 MUSIC
  const music = withImg.filter(
    (r) =>
      r.domain === "MUSIC" ||
      r.type === "art" ||
      r.type === "tracklists" ||
      r.type === "released" ||
      r.type === "main" ||
      has(r, /cover art|album|demo|tracklist|visualizer/),
  );
  let mIdx = 1;
  for (const r of music.slice(0, 16)) {
    const img = bestImage(r);
    if (!img) continue;
    take("05-music", "05-music", r, img, "music-visual", "Album/cover/doc strip. Do not crop into square unless source is square.", mIdx++);
  }

  // 06 FASHION — ONE garment, multiple images
  const garments = withImg
    .filter((r) => r.type === "garment" || r.domain === "FASHION")
    .filter((r) => downloaded(r).length >= 3)
    .sort((a, b) => downloaded(b).length - downloaded(a).length);
  const garment = garments[0];
  if (garment) {
    let fIdx = 1;
    for (const img of downloaded(garment).slice(0, 8)) {
      take(
        "06-fashion",
        "06-fashion",
        garment,
        img,
        img.role === "primary" ? "garment-primary" : "garment-view",
        "Same garment only. Front / additional views as source provides. Do not mix pieces.",
        fIdx++,
      );
    }
  }

  // 07 UNREALIZED
  const unreal = withImg.filter(
    (r) =>
      /UNRELEASED|PROTOTYPE|SAMPLE|CONCEPT|CANCELLED|NEVER RECORDED|LOST/.test(String(r.status)) ||
      has(r, /unreleased|prototype|sample|cancelled|unrealized|unbuilt|unused|concept|never recorded/),
  );
  let uIdx = 1;
  for (const r of unreal.slice(0, 20)) {
    const img = bestImage(r);
    if (!img) continue;
    take("07-unrealized", "07-unrealized", r, img, "unrealized-evidence", "Sparse proof sheet. Caption must include original source status term.", uIdx++);
  }

  // 08 CONNECTIONS — few, sparse
  const conn = withImg.filter((r) => r.related_records.length > 0 || (r.people && r.people.length > 0));
  let cIdx = 1;
  for (const r of conn.slice(0, 5)) {
    const img = bestImage(r);
    if (!img) continue;
    take("08-connections", "08-connections", r, img, "connection-node", "Very few images. Large margin. Lines/labels in Figma, not extra photos.", cIdx++);
  }

  await mkdir(path.join(ROOT, "figma-export"), { recursive: true });
  for (const folder of [
    "01-entry",
    "02-archive-field",
    "03-era-yeezus",
    "04-record-glow-in-the-dark",
    "05-music",
    "06-fashion",
    "07-unrealized",
    "08-connections",
  ]) {
    await mkdir(path.join(ROOT, "figma-export", folder), { recursive: true });
  }

  await copyPicked(picks);

  const manifest = {
    generated_at: new Date().toISOString(),
    note: "Copies only. Master files remain in public/archive/. Do not invent facts; every row cites a scraped record.",
    screens: Object.fromEntries(
      [
        "01-entry",
        "02-archive-field",
        "03-era-yeezus",
        "04-record-glow-in-the-dark",
        "05-music",
        "06-fashion",
        "07-unrealized",
        "08-connections",
      ].map((s) => [s, picks.filter((p) => p.folder === s).length]),
    ),
    items: picks.map((p) => ({
      screen: p.screen,
      file: `figma-export/${p.folder}/${p.file}`,
      record_id: p.record.id,
      record_title: p.record.title,
      source_name: p.record.source.name,
      source_page: p.record.source.url,
      original_image_url: p.image.original_url,
      master_local_path: p.image.local_path,
      intended_position_role: p.position,
      image_role: p.role,
      year: p.record.year,
      era: p.record.era,
      status: p.record.status,
      status_source_term: p.record.status_source_term,
    })),
  };
  await writeFile(path.join(ROOT, "figma-export", "manifest.json"), JSON.stringify(manifest, null, 2));

  const guide = [
    "# FIGMA IMAGE GUIDE",
    "",
    "Generated from the YE ARCHIVE scrape. Every file is a **copy** of a master image in `public/archive/`.",
    "Do not treat folder order as historical fact beyond what the cited record documents.",
    "",
    "| SCREEN | FILE | RECORD | SOURCE | INTENDED POSITION / ROLE |",
    "| --- | --- | --- | --- | --- |",
    ...picks.map((p) => {
      const rec = `${p.record.title.replace(/\|/g, "/")} (\`${p.record.id}\`)`;
      const src = `[${p.record.source.name}](${p.record.source.url})`;
      return `| ${p.screen} | \`${p.folder}/${p.file}\` | ${rec} | ${src} | ${p.position} (${p.role}) |`;
    }),
    "",
    "## Screen notes",
    "",
    "- **01 ENTRY** — One image only. Iconic, full-bleed.",
    "- **02 ARCHIVE FIELD** — 15–25 mixed domains. Uneven grid.",
    "- **03 ERA YEEZUS** — Only records whose source text/collection names Yeezus.",
    "- **04 RECORD GLOW IN THE DARK** — Only if the source documents Glow in the Dark (or 2008 tour/stage/docs). If few images matched, do not pad with unrelated concerts.",
    "- **05 MUSIC** — Cover art, tracker art, visualizers, documented music stills.",
    "- **06 FASHION** — A single garment record with multiple source images. Do not mix garments.",
    "- **07 UNREALIZED** — Unreleased / prototype / sample / cancelled / concept as labeled by the source.",
    "- **08 CONNECTIONS** — Sparse. Use for linking lines in Figma, not a gallery.",
    "",
    `Glow in the Dark matches found: ${gitdSet.length}. Fashion multi-image garment: ${garment ? garment.title : "(none with ≥3 downloaded images)"}.`,
    "",
  ].join("\n");
  await writeFile(path.join(ROOT, "FIGMA_IMAGE_GUIDE.md"), guide);
  log(`figma-export picks=${picks.length}`);
}
