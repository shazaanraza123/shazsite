import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  FASHION_ID,
  GLOW_ID,
  dash,
  figmaByRecord,
  figmaScreen,
  loadSearchIndex,
  packedById,
  type PackedRecord,
  type SearchHit,
} from "@/lib/archive";
import { LazyImg } from "../components/LazyImg";
import { Provenance } from "../components/Meta";

function fromHit(hit: SearchHit): PackedRecord {
  return {
    id: hit.id,
    title: hit.title,
    date: hit.date,
    year: hit.year,
    domain: hit.domain,
    type: hit.type,
    subtype: hit.subtype,
    era: hit.era,
    project: hit.project,
    status: hit.status,
    status_source_term: hit.status_source_term,
    description: null,
    people: hit.people,
    organizations: [],
    related_records: [],
    references: [],
    source: { name: hit.source_name ?? "", url: hit.source_url ?? "" },
    source_claims: [],
    confidence: hit.confidence,
    images: hit.img
      ? [
          {
            local_path: hit.img,
            original_url: "",
            source_page: hit.source_url ?? "",
            width: null,
            height: null,
            caption: null,
            role: "primary",
          },
        ]
      : [],
  };
}

export function RecordPage() {
  const { id = GLOW_ID } = useParams();
  const [found, setFound] = useState<PackedRecord | null>(packedById(id));
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const packed = packedById(id);
    if (packed) {
      setFound(packed);
      setMissing(false);
      return;
    }
    let alive = true;
    loadSearchIndex().then((rows) => {
      if (!alive) return;
      const hit = rows.find((r) => r.id === id);
      if (hit) setFound(fromHit(hit));
      else setMissing(true);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const isGlow = id === GLOW_ID || /glow in the dark/i.test(found?.title ?? "");
  const figma = isGlow ? figmaScreen("04-record-glow-in-the-dark") : figmaByRecord(id);
  const hero = figma[0];
  const relatedGlow = isGlow
    ? figma.slice(1)
    : figma.filter((item) => item.record_id !== id);

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

  const connected = found.related_records.filter(Boolean);

  return (
    <main className="record fade-in">
      <div className="record__media">
        <LazyImg
          src={hero?.src ?? found.images.find((i) => i.local_path)?.local_path}
          alt={found.title}
        />
        {hero ? (
          <div className="meta" style={{ marginTop: 12 }}>
            {hero.intended_position_role}
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
          <dt className="record__k">Type</dt>
          <dd className="record__v">
            {dash(found.type)}
            {found.subtype ? ` / ${found.subtype}` : ""}
          </dd>
          <dt className="record__k">Date</dt>
          <dd className="record__v">{dash(found.date ?? found.year)}</dd>
          <dt className="record__k">Status</dt>
          <dd className="record__v">
            {dash(found.status)}
            {found.status_source_term ? ` · source term: ${found.status_source_term}` : ""}
          </dd>
          <dt className="record__k">Era</dt>
          <dd className="record__v">{dash(found.era)}</dd>
          <dt className="record__k">Connected to</dt>
          <dd className="record__v">
            {isGlow ? (
              <Link to="/connections">Glow in the Dark graph</Link>
            ) : connected.length ? (
              connected.map((rid) => (
                <div key={rid}>
                  <Link to={`/record/${rid}`}>{rid}</Link>
                </div>
              ))
            ) : (
              "—"
            )}
          </dd>
          <dt className="record__k">People</dt>
          <dd className="record__v">
            {found.people.length ? found.people.join(" · ") : "—"}
          </dd>
          <dt className="record__k">Source</dt>
          <dd className="record__v">
            {found.source.url ? (
              <a href={found.source.url} target="_blank" rel="noreferrer">
                {found.source.name}
              </a>
            ) : (
              dash(found.source.name)
            )}
          </dd>
          <dt className="record__k">Material</dt>
          <dd className="record__v">{dash(found.domain)}</dd>
          <dt className="record__k">Related records</dt>
          <dd className="record__v">
            {id === FASHION_ID ? (
              <Link to="/fashion/regular-fit-ls-tee-h03">REGULAR FIT LS TEE (H03)</Link>
            ) : relatedGlow.length ? (
              relatedGlow.slice(0, 6).map((item) => (
                <div key={item.file}>
                  <Link to={`/record/${item.record_id}`}>{item.record_title}</Link>
                </div>
              ))
            ) : connected.length ? (
              connected.map((rid) => (
                <div key={rid}>
                  <Link to={`/record/${rid}`}>{rid}</Link>
                </div>
              ))
            ) : (
              "—"
            )}
          </dd>
        </dl>
        {found.source_claims.length ? (
          <div className="record__claims">
            <div className="meta meta-ink">Source claims — not silently merged</div>
            {found.source_claims.map((c, i) => (
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
      {relatedGlow.length ? (
        <div className="record__more">
          {relatedGlow.map((item) => (
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
      ) : null}
    </main>
  );
}
