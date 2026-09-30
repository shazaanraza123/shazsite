import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  PAGE_SIZE,
  dash,
  filterHits,
  sortHits,
  uniqueSorted,
  type BrowseFilter,
  type SearchHit,
} from "@/lib/archive";
import { useSearchIndex } from "../useArchive";
import { LazyImg } from "./LazyImg";
import { Provenance } from "./Meta";

type SortKey = "chrono" | "reverse" | "title";
type LockKey = keyof BrowseFilter;

const FILTERS: { key: LockKey; label: string }[] = [
  { key: "year", label: "Year" },
  { key: "era", label: "Era" },
  { key: "domain", label: "Domain" },
  { key: "type", label: "Type" },
  { key: "subtype", label: "Subtype" },
  { key: "project", label: "Project" },
  { key: "status", label: "Status" },
  { key: "person", label: "Person" },
  { key: "source", label: "Source" },
];

type Props = {
  preset?: BrowseFilter;
  lock?: LockKey[];
  groupByDomain?: boolean;
  perGroup?: number;
  match?: (hit: SearchHit) => boolean;
};

function optionsFor(rows: SearchHit[], key: LockKey): string[] {
  if (key === "person") {
    const named = rows.flatMap((r) => (r.names?.length ? r.names : (r.people ?? [])));
    return uniqueSorted(named);
  }
  if (key === "source") {
    return uniqueSorted(rows.map((r) => r.source_name));
  }
  return uniqueSorted(rows.map((r) => (r[key as keyof SearchHit] as string | null) ?? null));
}

export function ArchiveBrowser({
  preset = {},
  lock = [],
  groupByDomain = false,
  perGroup = 8,
  match,
}: Props) {
  const { index, error } = useSearchIndex();
  const [extra, setExtra] = useState<BrowseFilter>({});
  const [sort, setSort] = useState<SortKey>("chrono");
  const [page, setPage] = useState(1);

  const locked = new Set(lock);
  const presetKey = JSON.stringify(preset);

  const base = useMemo(() => {
    if (!index) return [];
    let rows = filterHits(index, preset);
    if (match) rows = rows.filter(match);
    return rows;
    // presetKey captures preset; match is stable when parents memoize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, presetKey, match]);

  const filtered = useMemo(() => {
    const f = { ...extra, ...pickLocked(preset, lock) };
    return sortHits(filterHits(base, f), sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, extra, sort, presetKey]);

  const groups = useMemo(() => {
    if (!groupByDomain) return null;
    const map = new Map<string, SearchHit[]>();
    for (const hit of filtered) {
      const key = hit.domain || "UNCLASSIFIED";
      const list = map.get(key) ?? [];
      if (list.length < perGroup) list.push(hit);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupByDomain, perGroup]);

  const grouped = groupByDomain && !extra.domain;
  const shown = filtered.slice(0, page * PAGE_SIZE);
  const more = filtered.length > shown.length;

  function setFilter(key: LockKey, value: string) {
    setPage(1);
    setExtra((prev) => {
      const next = { ...prev };
      if (!value) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  const optionPool = extra.domain || extra.type ? filterHits(base, extra) : base;

  return (
    <div className="browse">
      <div className="browse__bar">
        {FILTERS.filter((f) => !locked.has(f.key)).map((f) => {
          const opts = optionsFor(f.key === "type" || f.key === "subtype" ? optionPool : base, f.key);
          if (opts.length < 2 && !extra[f.key]) return null;
          return (
            <label key={f.key} className="browse__f">
              <span>{f.label}</span>
              <select
                value={extra[f.key] ?? ""}
                onChange={(e) => setFilter(f.key, e.target.value)}
              >
                <option value="">All</option>
                {opts.slice(0, 200).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
        <div className="browse__f">
          <span>Sort</span>
          <div className="browse__sort">
            {(["chrono", "reverse", "title"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={sort === s ? "is-on" : ""}
                onClick={() => {
                  setSort(s);
                  setPage(1);
                }}
              >
                {s === "chrono" ? "Chronological" : s === "reverse" ? "Reverse" : "Title"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="meta browse__count">
        {index
          ? `${filtered.length.toLocaleString()} records in this slice · showing ${
              groupByDomain ? "by discipline" : shown.length.toLocaleString()
            }`
          : "Loading index…"}
      </p>
      {error ? <p className="meta">{error}</p> : null}

      {grouped && groups ? (
        <div className="browse__groups">
          {groups.map(([domain, rows]) => {
            const total = filtered.filter((h) => h.domain === domain).length;
            return (
              <section key={domain} className="browse__group">
                <h2 className="browse__domain">
                  {domain}
                  <span className="meta"> {total.toLocaleString()}</span>
                </h2>
                {rows.map((hit) => (
                  <BrowseRow key={hit.id} hit={hit} />
                ))}
                {total > rows.length ? (
                  <button
                    type="button"
                    className="browse__more"
                    onClick={() => setFilter("domain", domain)}
                  >
                    Continue {domain.toLowerCase()} →
                  </button>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="browse__list">
          {shown.map((hit) => (
            <BrowseRow key={hit.id} hit={hit} />
          ))}
          {more ? (
            <button type="button" className="browse__more" onClick={() => setPage((p) => p + 1)}>
              Further records
            </button>
          ) : null}
          {index && filtered.length === 0 ? (
            <p className="meta">No records in this slice of the archive.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function pickLocked(preset: BrowseFilter, lock: LockKey[]): BrowseFilter {
  const out: BrowseFilter = {};
  for (const k of lock) {
    if (preset[k]) out[k] = preset[k];
  }
  return out;
}

function BrowseRow({ hit }: { hit: SearchHit }) {
  return (
    <Link to={`/record/${hit.id}`} className="browse__row">
      <div className="browse__yr">{dash(hit.year)}</div>
      <div className="browse__body">
        <div className="browse__title">{hit.title}</div>
        <div className="meta">
          {hit.domain}
          {hit.type ? ` · ${hit.type}` : ""}
          {hit.subtype ? ` / ${hit.subtype}` : ""}
          {hit.project ? ` · ${hit.project}` : ""}
        </div>
        <Provenance
          source={hit.source_name}
          url={hit.source_url}
          date={hit.date ?? hit.year}
          status={hit.status}
          statusTerm={hit.status_source_term}
        />
      </div>
      {hit.img ? (
        <LazyImg src={hit.img} alt="" className="browse__still" />
      ) : (
        <div className="browse__still browse__still--empty" aria-hidden="true" />
      )}
    </Link>
  );
}

export function DisciplineLinks({
  counts,
  toFor,
}: {
  counts: Record<string, number>;
  toFor: (domain: string) => string;
}) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (!entries.length) return null;
  return (
    <div className="browse__disc">
      {entries
        .sort((a, b) => b[1] - a[1])
        .map(([domain, n]) => (
          <Link key={domain} to={toFor(domain)}>
            {domain}
            <span className="meta"> {n.toLocaleString()}</span>
          </Link>
        ))}
    </div>
  );
}

export function TypeLinks({
  types,
  href,
}: {
  types: { type: string; count: number }[];
  href: (type: string) => string;
}) {
  if (!types.length) return null;
  return (
    <div className="browse__types">
      {types.map((t) => (
        <Link key={t.type} to={href(t.type)}>
          {t.type}
          <span className="meta"> {t.count.toLocaleString()}</span>
        </Link>
      ))}
    </div>
  );
}
