import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ROOT, MIN_IMAGE_BYTES, log } from "../scrapers/base.ts";
import type { ArchiveRecord, ImageIndexRow } from "../scrapers/types.ts";

function normTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hamming(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 99;
  let n = 0;
  const x = BigInt("0x" + a);
  const y = BigInt("0x" + b);
  let z = x ^ y;
  while (z) {
    n += Number(z & 1n);
    z >>= 1n;
  }
  return n;
}

export interface DuplicateGroup {
  ids: string[];
  reason: string;
  confidence: "high" | "medium" | "low";
  auto_merged: false;
}

export async function buildImageIndexAndDedupe(records: ArchiveRecord[]): Promise<{
  images: ImageIndexRow[];
  duplicates: DuplicateGroup[];
  reportExtras: {
    broken_images: { path: string; reason: string }[];
    tiny_files: { path: string; bytes: number }[];
    duplicate_filenames: string[];
  };
}> {
  const images: ImageIndexRow[] = [];
  const broken: { path: string; reason: string }[] = [];
  const tiny: { path: string; bytes: number }[] = [];
  const names = new Map<string, number>();

  for (const rec of records) {
    for (const img of rec.images) {
      const extra = img as typeof img & { sha256?: string; phash?: string | null };
      let sha = extra.sha256 || null;
      let ph = extra.phash || null;
      if (img.local_path) {
        const abs = path.join(ROOT, img.local_path);
        try {
          const buf = await readFile(abs);
          const st = await stat(abs);
          if (st.size < MIN_IMAGE_BYTES) tiny.push({ path: img.local_path, bytes: st.size });
          sha = sha || createHash("sha256").update(buf).digest("hex");
          const base = path.basename(img.local_path);
          names.set(base, (names.get(base) || 0) + 1);
        } catch (e) {
          broken.push({ path: img.local_path, reason: e instanceof Error ? e.message : "missing" });
        }
      }
      images.push({
        id: createHash("sha1").update(rec.id + "|" + img.original_url).digest("hex").slice(0, 16),
        record_id: rec.id,
        file: img.local_path,
        original_url: img.original_url,
        source_page: img.source_page,
        source_name: rec.source.name,
        width: img.width,
        height: img.height,
        sha256: sha,
        phash: ph,
        role: img.role || "unknown",
      });
    }
  }

  const duplicateFilenames = [...names.entries()].filter(([, n]) => n > 1).map(([n]) => n);

  const duplicates: DuplicateGroup[] = [];
  const flagged = new Set<string>();

  const bySourceUrl = new Map<string, ArchiveRecord[]>();
  const byTitle = new Map<string, ArchiveRecord[]>();
  for (const rec of records) {
    const su = rec.source.url;
    if (su) {
      const arr = bySourceUrl.get(su) || [];
      arr.push(rec);
      bySourceUrl.set(su, arr);
    }
    const nt = normTitle(rec.title);
    if (nt.length > 3) {
      const arr = byTitle.get(nt) || [];
      arr.push(rec);
      byTitle.set(nt, arr);
    }
  }

  for (const [url, group] of bySourceUrl) {
    if (group.length < 2) continue;
    const ids = group.map((g) => g.id);
    const low = group.some((g) => g.confidence === "low");
    duplicates.push({
      ids,
      reason: `same source.url ${url}`,
      confidence: low ? "low" : "high",
      auto_merged: false,
    });
    for (const rec of group) {
      rec.possible_duplicate = true;
      flagged.add(rec.id);
    }
  }

  for (const [title, group] of byTitle) {
    if (group.length < 2) continue;
    const sources = new Set(group.map((g) => g.source.name));
    if (sources.size < 2 && group.length < 3) continue;
    const sameEra = group.every((g) => g.era && g.era === group[0].era);
    const sameYear = group.every((g) => g.year && g.year === group[0].year);
    if (!sameEra && !sameYear) continue;
    const ids = group.map((g) => g.id);
    const low = group.some((g) => g.confidence === "low");
    if (low) {
      for (const rec of group) rec.possible_duplicate = true;
      duplicates.push({ ids, reason: `normalized title "${title}" + era/year overlap (low confidence, not merged)`, confidence: "low", auto_merged: false });
      continue;
    }
    for (const rec of group) rec.possible_duplicate = true;
    duplicates.push({
      ids,
      reason: `normalized title "${title}"${sameEra ? " same era" : ""}${sameYear ? " same year" : ""} across ${[...sources].join(", ")}`,
      confidence: "medium",
      auto_merged: false,
    });
  }

  const bySha = new Map<string, ImageIndexRow[]>();
  for (const im of images) {
    if (!im.sha256) continue;
    const arr = bySha.get(im.sha256) || [];
    arr.push(im);
    bySha.set(im.sha256, arr);
  }
  for (const [sha, group] of bySha) {
    const recIds = [...new Set(group.map((g) => g.record_id))];
    if (recIds.length < 2) continue;
    duplicates.push({ ids: recIds, reason: `identical image sha256 ${sha.slice(0, 12)}…`, confidence: "high", auto_merged: false });
    for (const id of recIds) {
      const rec = records.find((r) => r.id === id);
      if (rec) rec.possible_duplicate = true;
    }
  }

  const withHash = images.filter((i) => i.phash);
  for (let i = 0; i < withHash.length; i++) {
    for (let j = i + 1; j < withHash.length; j++) {
      const a = withHash[i];
      const b = withHash[j];
      if (a.record_id === b.record_id) continue;
      if (!a.phash || !b.phash) continue;
      const d = hamming(a.phash, b.phash);
      if (d <= 6) {
        const recA = records.find((r) => r.id === a.record_id);
        const recB = records.find((r) => r.id === b.record_id);
        if (recA?.confidence === "low" || recB?.confidence === "low") {
          if (recA) recA.possible_duplicate = true;
          if (recB) recB.possible_duplicate = true;
          duplicates.push({
            ids: [a.record_id, b.record_id],
            reason: `perceptual hash distance ${d} (low-confidence record, not merged)`,
            confidence: "low",
            auto_merged: false,
          });
          continue;
        }
        if (recA) recA.possible_duplicate = true;
        if (recB) recB.possible_duplicate = true;
        duplicates.push({
          ids: [a.record_id, b.record_id],
          reason: `perceptual hash distance ${d}`,
          confidence: d <= 2 ? "high" : "medium",
          auto_merged: false,
        });
      }
    }
  }

  // cap phash pairwise if huge
  log(`dedupe groups=${duplicates.length} images_index=${images.length} flagged_records=${records.filter((r) => r.possible_duplicate).length}`);

  return {
    images,
    duplicates,
    reportExtras: {
      broken_images: broken,
      tiny_files: tiny,
      duplicate_filenames: duplicateFilenames,
    },
  };
}

export async function listFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string) {
    let ents;
    try {
      ents = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else out.push(p);
    }
  }
  await walk(dir);
  return out;
}
