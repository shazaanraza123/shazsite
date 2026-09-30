import { Link } from "react-router";
import { figmaScreen, packedById, FASHION_ID } from "@/lib/archive";
import { LazyImg } from "../components/LazyImg";
import { Provenance } from "../components/Meta";

const VIEW = ["Primary", "View 02", "View 03", "View 04", "View 05", "View 06"];

export function Fashion() {
  const shots = figmaScreen("06-fashion");
  const rec = packedById(FASHION_ID);
  const hero = shots[0];
  const rest = shots.slice(1);

  return (
    <main className="garment fade-in">
      <div className="garment__hero">
        {hero ? <LazyImg src={hero.src} alt={hero.record_title} /> : null}
        <div className="meta" style={{ marginTop: 12 }}>
          {VIEW[0]} · six source images, same garment · YZY Library record/8
        </div>
      </div>
      <aside className="garment__side">
        <p className="meta">Fashion · one garment</p>
        <h1 className="garment__name">{rec?.title ?? "REGULAR FIT LS TEE (H03)"}</h1>
        <Provenance
          source={rec?.source.name ?? "YZY Library"}
          url={rec?.source.url ?? "https://yzylibrary.com/record/8"}
          date={rec?.date ?? rec?.year ?? "2022"}
          status={rec?.status ?? "UNRELEASED"}
          statusTerm={rec?.status_source_term ?? "Unreleased"}
        />
        <dl className="record__meta">
          <dt className="record__k">Type</dt>
          <dd className="record__v">
            {rec?.type}
            {rec?.subtype ? ` / ${rec.subtype}` : ""}
          </dd>
          <dt className="record__k">Era</dt>
          <dd className="record__v">{rec?.era ?? "YZY GAP"}</dd>
          <dt className="record__k">People</dt>
          <dd className="record__v">{rec?.people.length ? rec.people.join(" · ") : "—"}</dd>
          <dt className="record__k">Source</dt>
          <dd className="record__v">
            <a href="https://yzylibrary.com/record/8" target="_blank" rel="noreferrer">
              yzylibrary.com/record/8
            </a>
          </dd>
        </dl>
        {rec?.description ? <div className="garment__note">{rec.description}</div> : null}
        <p className="meta" style={{ marginTop: 36 }}>
          <Link to="/medium/fashion">Browse fashion records →</Link>
        </p>
        <div className="garment__views">
          {rest.map((item, i) => (
            <figure key={item.file}>
              <LazyImg src={item.src} alt={`${item.record_title} ${VIEW[i + 1]}`} />
              <figcaption className="meta" style={{ marginTop: 6 }}>
                {VIEW[i + 1]}
              </figcaption>
            </figure>
          ))}
        </div>
      </aside>
    </main>
  );
}
