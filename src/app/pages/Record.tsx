import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  GLOW_ID,
  dash,
  figmaScreen,
  loadRecord,
  loadSearchIndex,
  localSrc,
  slugify,
  type PackedRecord,
  type SearchHit,
} from "@/lib/archive";
import { LazyImg } from "../components/LazyImg";
import { Provenance } from "../components/Meta";

const SUGGEST_CAP = 8;

export function RecordPage() {
  const { id = GLOW_ID } = useParams();
  const [found, setFound] = useState<PackedRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [index, setIndex] = useState<SearchHit[] | null>(null);
  const [view, setView] = useState(0);

  useEffect(() => {
    setFound(null);
    setMissing(false);
    setView(0);
    let alive = true;
    loadRecord(id).then((row) => {
      if (!alive) return;
      if (row) setFound(row);
      else setMissing(true);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    let alive = true;
    loadSearchIndex().then((rows) => {
      if (alive) setIndex(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  const isGlowMaster = id === GLOW_ID;
  const figma = isGlowMaster ? figmaScreen("04-record-glow-in-the-dark") : [];

  const archiveImages = (found?.images ?? [])
    .map((img) => localSrc(img.local_path))
    .filter((src): src is string => Boolean(src));

  const images = isGlowMaster
    ? figma.map((f) => f.src).filter(Boolean)
    : archiveImages;

  const current = images[view] ?? images[0] ?? null;

  const documented = useMemo(() => {
    if (!found || !index) return [];
    return found.related_records
      .map((rid) => index.find((h) => h.id === rid))
      .filter((h): h is SearchHit => Boolean(h));
  }, [found, index]);

  const suggested = useMemo(() => {
    if (!found || !index) return [];
    const related = new Set(found.related_records);
    const pool = index.filter((h) => {
      if (h.id === found.id || related.has(h.id)) return false;
      if (found.project && h.project === found.project) return true;
      if (found.era && h.era === found.era && found.project && h.project === found.project) {
        return true;
      }
      if (found.era && h.era === found.era) return true;
      if (!found.people.length) return false;
      const theirs = new Set(
        [...(h.names ?? []), ...(h.people ?? [])].map((n) => n.toLowerCase()),
      );
      return found.people.some((p) => theirs.has(p.toLowerCase()));
    });
    const withImg = pool.filter((h) => h.img);
    const rest = pool.filter((h) => !h.img);
    return [...withImg, ...rest].slice(0, SUGGEST_CAP);
  }, [found, index]);

  if (missing) {
    return (
      <main className="ye-page fade-in">
        <p className="meta">Record not in the local archive.</p>
      </main>
    );
  }

  if (!found) {
    return (
      <main className="ye-page fade-in">
        <p className="meta">Loading record…</p>
      </main>
    );
  }

  const people = found.people.filter(Boolean);
  const orgs = found.organizations.filter(Boolean);
  const refs = found.references.filter(Boolean);
  const claims = found.source_claims.filter((c) => c.field !== "headers");

  return (
    <main className="record fade-in">
      <div className="record__media">
        {current ? <LazyImg src={current} alt={found.title} /> : <div className="record__void" />}
        {images.length > 1 ? (
          <div className="record__viewer">
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                className={i === view ? "is-on" : ""}
                onClick={() => setView(i)}
              >
                <LazyImg src={src} alt="" />
                <span className="meta">{String(i + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
        ) : null}
        {isGlowMaster ? (
          <div className="meta" style={{ marginTop: 12 }}>
            Glow in the Dark — master composition
          </div>
        ) : found.images[view]?.caption ? (
          <div className="meta" style={{ marginTop: 12 }}>
            {found.images[view].caption}
          </div>
        ) : null}
      </div>
      <aside>
        <h1 className="record__title">{found.title}</h1>
        <Provenance
          source={found.source.name}
          url={found.source.url}
          date={found.date ?? found.year}
          status={found.status}
          statusTerm={found.status_source_term}
        />
        {found.description ? (
          <p style={{ marginTop: 28, fontSize: 16, lineHeight: 1.4, maxWidth: "36em" }}>
            {found.description}
          </p>
        ) : null}
        <dl className="record__meta">
          {found.type ? (
            <>
              <dt className="record__k">Type</dt>
              <dd className="record__v">
                {found.type}
                {found.subtype ? ` / ${found.subtype}` : ""}
              </dd>
            </>
          ) : null}
          {found.date || found.year ? (
            <>
              <dt className="record__k">Date</dt>
              <dd className="record__v">{dash(found.date ?? found.year)}</dd>
            </>
          ) : null}
          {found.year ? (
            <>
              <dt className="record__k">Year</dt>
              <dd className="record__v">
                <Link to={`/year/${found.year}`}>{found.year}</Link>
              </dd>
            </>
          ) : null}
          {found.era ? (
            <>
              <dt className="record__k">Era</dt>
              <dd className="record__v">{found.era}</dd>
            </>
          ) : null}
          {found.project ? (
            <>
              <dt className="record__k">Project</dt>
              <dd className="record__v">
                <Link to={`/work/${slugify(found.project)}`}>{found.project}</Link>
              </dd>
            </>
          ) : null}
          {found.domain ? (
            <>
              <dt className="record__k">Medium</dt>
              <dd className="record__v">
                <Link to={`/medium/${found.domain.toLowerCase()}`}>{found.domain}</Link>
              </dd>
            </>
          ) : null}
          {found.status ? (
            <>
              <dt className="record__k">Status</dt>
              <dd className="record__v">
                {found.status}
                {found.status_source_term ? ` · source term: ${found.status_source_term}` : ""}
              </dd>
            </>
          ) : null}
          {people.length ? (
            <>
              <dt className="record__k">People</dt>
              <dd className="record__v">
                {people.map((p, i) => {
                  const compound = /[,&/]|\band\b/i.test(p);
                  return (
                    <span key={`${p}-${i}`}>
                      {i ? " · " : null}
                      {compound ? p : <Link to={`/people/${slugify(p)}`}>{p}</Link>}
                    </span>
                  );
                })}
              </dd>
            </>
          ) : null}
          {orgs.length ? (
            <>
              <dt className="record__k">Organizations</dt>
              <dd className="record__v">{orgs.join(" · ")}</dd>
            </>
          ) : null}
          {found.source.name ? (
            <>
              <dt className="record__k">Source</dt>
              <dd className="record__v">
                {found.source.url ? (
                  <a href={found.source.url} target="_blank" rel="noreferrer">
                    {found.source.name}
                  </a>
                ) : (
                  found.source.name
                )}
              </dd>
            </>
          ) : null}
          {documented.length ? (
            <>
              <dt className="record__k">Related</dt>
              <dd className="record__v">
                <div className="meta meta-ink" style={{ marginBottom: 8 }}>
                  Documented — related_records
                </div>
                {documented.map((h) => (
                  <div key={h.id}>
                    <Link to={`/record/${h.id}`}>{h.title}</Link>
                  </div>
                ))}
              </dd>
            </>
          ) : null}
          {found.related_unresolved ? (
            <>
              <dt className="record__k">Unresolved</dt>
              <dd className="record__v">
                {found.related_unresolved} source identifiers do not resolve in this archive
              </dd>
            </>
          ) : null}
          {suggested.length ? (
            <>
              <dt className="record__k">Suggested</dt>
              <dd className="record__v">
                <div className="meta" style={{ marginBottom: 8 }}>
                  Algorithmic — shared project, era, or person. Not a documented link. Shared
                  year is not treated as fact.
                </div>
                {suggested.map((h) => (
                  <div key={h.id}>
                    <Link to={`/record/${h.id}`}>{h.title}</Link>
                  </div>
                ))}
              </dd>
            </>
          ) : null}
          {refs.length ? (
            <>
              <dt className="record__k">References</dt>
              <dd className="record__v">
                {refs.map((r) => (
                  <div key={r}>
                    <a href={r} target="_blank" rel="noreferrer">
                      {r}
                    </a>
                  </div>
                ))}
              </dd>
            </>
          ) : null}
        </dl>
        {claims.length ? (
          <div className="record__claims">
            <div className="meta meta-ink">Source claims — not silently merged</div>
            {claims.map((c, i) => (
              <div key={`${c.field}-${i}`} className="meta" style={{ marginTop: 8 }}>
                {c.field}: {c.value} · {c.source_name} ·{" "}
                <a href={c.source_url} target="_blank" rel="noreferrer">
                  URL
                </a>
              </div>
            ))}
          </div>
        ) : null}
      </aside>
      {isGlowMaster && figma.length > 1 ? (
        <div className="record__more">
          {figma.slice(1).map((item) => (
            <Link key={item.file} to={`/record/${item.record_id}`}>
              <LazyImg src={item.src} alt={item.record_title} />
              <div className="meta" style={{ marginTop: 8 }}>
                {item.record_title}
                <br />
                {item.source_name}
              </div>
            </Link>
          ))}
        </div>
      ) : documented.length ? (
        <div className="record__more">
          {documented
            .filter((h) => h.img)
            .slice(0, 6)
            .map((h) => (
              <Link key={h.id} to={`/record/${h.id}`}>
                <LazyImg src={h.img} alt={h.title} />
                <div className="meta" style={{ marginTop: 8 }}>
                  {h.title}
                  <br />
                  documented relation
                </div>
              </Link>
            ))}
        </div>
      ) : null}
    </main>
  );
}
