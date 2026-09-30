import { Link } from "react-router";
import { curated, figmaScreen } from "@/lib/archive";
import { LazyImg } from "../components/LazyImg";
import { Provenance } from "../components/Meta";

export function Music() {
  const stills = figmaScreen("05-music");
  const { demo, version, release } = curated.music_axis;

  return (
    <main className="music fade-in">
      <h1 className="music__h">MUSIC</h1>
      <p className="meta" style={{ maxWidth: 640 }}>
        Temporal axis as the source records it. DEMO → VERSION → RELEASE is a reading structure,
        not a claimed genealogy. No version relationships are invented between these titles.
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
          <h2>Demo · source type stems / never recorded / beat only</h2>
          {demo.slice(0, 16).map((row) => (
            <Link key={row.id} to={`/record/${row.id}`} className="music__row">
              <div>{row.title}</div>
              <Provenance
                source={row.source.name}
                url={row.source.url}
                date={row.date ?? row.year}
                status={row.status}
                statusTerm={row.status_source_term}
              />
            </Link>
          ))}
        </section>
        <section className="music__col">
          <h2>Version · source type main / og file / partial</h2>
          {version.slice(0, 16).map((row) => (
            <Link key={row.id} to={`/record/${row.id}`} className="music__row">
              <div>{row.title}</div>
              <Provenance
                source={row.source.name}
                url={row.source.url}
                date={row.date ?? row.year}
                status={row.status}
                statusTerm={row.status_source_term}
              />
            </Link>
          ))}
        </section>
        <section className="music__col">
          <h2>Release · documented released / realized stills</h2>
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
          {release.slice(0, 8).map((row) => (
            <Link key={row.id} to={`/record/${row.id}`} className="music__row">
              <div>{row.title}</div>
              <Provenance
                source={row.source.name}
                url={row.source.url}
                date={row.date ?? row.year}
                status={row.status}
                statusTerm={row.status_source_term}
              />
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
