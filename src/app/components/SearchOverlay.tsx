import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { loadSearchIndex, matchHit, type SearchHit } from "@/lib/archive";
import { LazyImg } from "./LazyImg";
import { Provenance } from "./Meta";

const PER_GROUP = 24;

export function SearchOverlay() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const [index, setIndex] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(q);
  }, [q]);

  useEffect(() => {
    let alive = true;
    loadSearchIndex()
      .then((rows) => {
        if (alive) setIndex(rows);
      })
      .catch(() => {
        if (alive) setError("Search index could not be loaded.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const groups = useMemo(() => {
    if (!index || !q.trim()) return [];
    const hits = index.filter((row) => matchHit(row, q));
    const map = new Map<string, SearchHit[]>();
    for (const hit of hits) {
      const key = hit.domain || "UNCLASSIFIED";
      const list = map.get(key) ?? [];
      if (list.length < PER_GROUP + 1) list.push(hit);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [index, q]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
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
          placeholder="Title, year, era, project, domain, type, people, status"
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Search query"
        />
      </form>
      <p className="meta" style={{ marginTop: 16 }}>
        Local index · {index ? `${index.length.toLocaleString()} records` : "loading"} · grouped by
        medium · never more than {PER_GROUP} rows per domain
      </p>
      {error ? <p className="meta">{error}</p> : null}
      <div className="search__groups">
        {q && groups.length === 0 && index ? (
          <p className="meta">No records match this query.</p>
        ) : null}
        {groups.map(([domain, rows]) => {
          const extra = rows.length > PER_GROUP;
          const shown = extra ? rows.slice(0, PER_GROUP) : rows;
          return (
            <section key={domain} className="search__group">
              <h2 className="meta meta-ink">{domain}</h2>
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
