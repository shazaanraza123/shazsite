export type ArchiveDomain =
  | "MUSIC"
  | "FASHION"
  | "PERFORMANCE"
  | "FILM"
  | "DESIGN"
  | "ARCHITECTURE"
  | "PHOTOGRAPHY"
  | "WRITING"
  | "SOCIAL"
  | "PEOPLE"
  | "OBJECTS"
  | "EVENTS"
  | "REFERENCES"
  | "EPHEMERA"
  | "UNRELEASED/UNREALIZED";

export type ArchiveStatus =
  | "RELEASED"
  | "REALIZED"
  | "UNRELEASED"
  | "PROTOTYPE"
  | "SAMPLE"
  | "CONCEPT"
  | "CANCELLED"
  | "LOST"
  | "PARTIAL"
  | "NEVER RECORDED"
  | "UNCONFIRMED"
  | string;

export interface ArchiveImage {
  local_path: string | null;
  original_url: string;
  source_page: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  role: string;
}

export interface SourceClaim {
  field: string;
  value: string;
  source_name: string;
  source_url: string;
}

export interface ArchiveRecord {
  id: string;
  title: string;
  date: string | null;
  year: string | null;
  domain: ArchiveDomain | string;
  type: string;
  subtype: string | null;
  era: string | null;
  project: string | null;
  status: ArchiveStatus;
  status_source_term: string | null;
  description: string | null;
  people: string[];
  organizations: string[];
  related_records: string[];
  references: string[];
  images: ArchiveImage[];
  source: { name: string; url: string };
  source_claims: SourceClaim[];
  confidence: "high" | "medium" | "low";
  scraped_at: string;
  possible_duplicate?: boolean;
}

export interface ImageIndexRow {
  id: string;
  record_id: string;
  file: string | null;
  original_url: string;
  source_page: string;
  source_name: string;
  width: number | null;
  height: number | null;
  sha256: string | null;
  phash: string | null;
  role: string;
}

export interface AdapterResult {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  records: ArchiveRecord[];
  failedPages: { url: string; reason: string }[];
  skipped: boolean;
  skipReason?: string;
  notes: string[];
  estimatedRecords?: number;
}

export interface SourceAuditEntry {
  id: string;
  name: string;
  url: string;
  robots_txt: string;
  robots_status: string;
  crawl_allowed: boolean;
  skip_reason: string | null;
  terms_notes: string;
  rendering: "ssr" | "js-spa" | "hybrid" | "json" | "google-sheets" | "unknown";
  structure: string;
  pagination: string;
  detail_pages: string;
  category_pages: string;
  image_cdn: string;
  metadata_fields: string[];
  public_json_endpoints: string[];
  estimated_records: string;
  crawl_plan: string;
}

export interface ScrapeReport {
  generated_at: string;
  sources: Record<
    string,
    {
      records: number;
      images_downloaded: number;
      images_referenced: number;
      failed_pages: number;
      skipped: boolean;
      skip_reason?: string;
      notes: string[];
    }
  >;
  totals: {
    records: number;
    images_downloaded: number;
    images_referenced: number;
    duplicates_flagged: number;
    failed_pages: number;
    skipped_sources: number;
    broken_images: number;
    tiny_files: number;
    missing_source_urls: number;
    missing_provenance: number;
    duplicate_filenames: number;
  };
  uncrawled_sources: string[];
  broken_images: { path: string; reason: string }[];
  tiny_files: { path: string; bytes: number }[];
  duplicate_filenames: string[];
  missing_source_urls: string[];
  missing_provenance: string[];
  failed_pages: { source: string; url: string; reason: string }[];
}
