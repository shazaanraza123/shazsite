import { Link } from "react-router";
import { figmaScreen } from "@/lib/archive";
import { LazyImg } from "../components/LazyImg";

export function Music() {
  const stills = figmaScreen("05-music");

  return (
    <main className="music fade-in">
      <h1 className="music__h">MUSIC</h1>
      <p className="meta" style={{ maxWidth: 640 }}>
        Temporal axis as the source records it. DEMO → VERSION → RELEASE is a reading
        structure, not a claimed genealogy. The stills on this screen are Ye Tour catalog
        visualizers and live audio (2026). No demo-to-release chain is documented for them,
        so none is drawn.{" "}
        <Link to="/medium/music">Browse all music records →</Link>
      </p>
      <div className="music__axis">
        <span>Demo</span>
        <hr />
        <span>Version</span>
        <hr />
        <span>Release</span>
      </div>
      <div className="music__cols">
        <section className="music__col">
          <h2>Demo</h2>
          <p className="meta">
            No demo stills in the curated music export. Statuses such as BEAT ONLY / NEVER
            RECORDED exist elsewhere in the index — they are not attached to these titles.
          </p>
        </section>
        <section className="music__col">
          <h2>Version</h2>
          <p className="meta">
            No version lineage is recorded between these catalog stills. Search the archive
            for source terms such as OG FILE or PARTIAL.
          </p>
        </section>
        <section className="music__col">
          <h2>Release · Ye Tour catalog stills</h2>
          <div className="music__stills">
            {stills.map((item) => (
              <Link key={item.file} to={`/record/${item.record_id}`}>
                <LazyImg src={item.src} alt={item.record_title} />
                <div className="meta" style={{ marginTop: 8 }}>
                  {item.record_title} · {item.year ?? "—"} · {item.status}
                  <br />
                  {item.source_name} · {item.status_source_term}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
