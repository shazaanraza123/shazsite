import { Link } from "react-router";
import { curated, figmaScreen } from "@/lib/archive";
import { LazyImg } from "../components/LazyImg";

const entry = figmaScreen("01-entry")[0];

export function Entry() {
  return (
    <main className="entry fade-in">
      <div className="entry__type">
        <p className="meta">Digital creative archive · {curated.record_count.toLocaleString()} records</p>
        <div>
          <h1 className="entry__ye">YE</h1>
          <h2 className="entry__archive">ARCHIVE</h2>
        </div>
        <div>
          <div className="entry__domains meta">
            {curated.domains.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div style={{ marginTop: 36 }}>
            <Link className="entry__enter" to="/archive">
              Enter the archive →
            </Link>
          </div>
        </div>
      </div>
      <figure className="entry__figure">
        {entry ? (
          <>
            <LazyImg src={entry.src} alt={entry.record_title} />
            <figcaption className="meta" style={{ marginTop: 10 }}>
              {entry.record_title} · {entry.source_name} · {entry.year ?? "undated"} · {entry.status}
            </figcaption>
          </>
        ) : null}
      </figure>
    </main>
  );
}
