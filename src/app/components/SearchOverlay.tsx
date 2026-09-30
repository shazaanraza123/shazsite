import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { matchHit, uniqueSorted, type SearchHit } from "@/lib/archive";
import { useSearchIndex } from "../useArchive";
import { LazyImg } from "./LazyImg";
import { Provenance } from "./Meta";

const PER_GROUP = 24;

export function SearchOverlay() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const [domain, setDomain] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const { index, error } = useSearchIndex();

  useEffect(() => {
    setDraft(q);
  }, [q]);

  const liveQ = draft.trim().length >= 2 ? draft.trim() : q.trim();

  const hits = useMemo(() => {
    if (!index || !liveQ) return [];
    return index.filter((row) => matchHit(row, liveQ));
  }, [index, liveQ]);

  const filtered = useMemo(() => {
    return hits.filter((h) => {
      if (domain && h.domain !== domain) return false;
      if (year && h.year !== year) return false;
      if (status && h.status !== status) return false;
      return true;
    });
  }, [hits, domain, year, status]);

  const groups = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    for (const hit of filtered) {
      const key = hit.domain || "UNCLASSIFIED";
      const list = map.get(key) ?? [];
      if (list.length < PER_GROUP + 1) list.push(hit);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const domains = uniqueSorted(hits.map((h) => h.domain));
  const years = uniqueSorted(hits.map((h) => h.year));
  const statuses = uniqueSorted(hits.map((h) => h.status));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDomain("");
    setYear("");
    setStatus("");
    setParams(draft.trim() ? { q: draft.trim() } : {});
  }

  return (
    <div className="search fade-in" role="dialog" aria-label="Search the archive">
      <button type="button" className="search__close" onClick={() => nav(-1)}>
        Close
      </button>
      <h1 className="search__h">SEARCH THE ARCHIVE</h1>
      <form onSubmit={onSubmit}>
        <input
          type="search"
          value={draft}
          autoFocus
          placeholder="Title, year, era, project, domain, type, subtype, people, status, description"
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Search query"
        />
      </form>
      <p className="meta" style={{ marginTop: 16 }}>
        Local index · {index ? `${index.length.toLocaleString()} records` : "loading"}
        {liveQ ? ` · ${filtered.length.toLocaleString()} match` : " · type at least two letters"} · grouped by
        medium · never more than {PER_GROUP} rows per domain
      </p>
      {liveQ && hits.length ? (
        <div className="browse__bar" style={{ marginTop: 28 }}>
          <label className="browse__f">
            <span>Domain</span>
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              <option value="">All</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="browse__f">
            <span>Year</span>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="browse__f">
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      {error ? <p className="meta">{error}</p> : null}
      <div className="search__groups">
        {liveQ && groups.length === 0 && index ? (
          <p className="meta">No records match this query.</p>
        ) : null}
        {groups.map(([gDomain, rows]) => {
          const extra = rows.length > PER_GROUP;
          const shown = extra ? rows.slice(0, PER_GROUP) : rows;
          return (
            <section key={gDomain} className="search__group">
              <h2 className="meta meta-ink">{gDomain}</h2>
              <div className="search__hits">
                {shown.map((hit) => (
                  <Link key={hit.id} to={`/record/${hit.id}`} className="search__hit">
                    <LazyImg src={hit.img} alt="" />
                    <div>
                      <div>{hit.title}</div>
                      <Provenance
                        source={hit.source_name}
                        url={hit.source_url}
                        date={hit.date ?? hit.year}
                        status={hit.status}
                        statusTerm={hit.status_source_term}
                      />
                    </div>
                    <div className="meta">{hit.year ?? "—"}</div>
                  </Link>
                ))}
                {extra ? (
                  <div className="search__more">Further hits exist. Narrow the query.</div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
