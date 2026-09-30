import { Link } from "react-router";
import { curated, figmaScreen } from "@/lib/archive";
import { LazyImg } from "../components/LazyImg";
import { Provenance } from "../components/Meta";

const SAT = [
  { i: 0, left: "4%", top: "4%", w: "14vw" },
  { i: 2, left: "68%", top: "0%", w: "11vw" },
  { i: 3, left: "78%", top: "28%", w: "16vw" },
  { i: 4, left: "6%", top: "42%", w: "18vw" },
  { i: 5, left: "72%", top: "58%", w: "10vw" },
  { i: 14, left: "48%", top: "62%", w: "13vw" },
  { i: 7, left: "8%", top: "78%", w: "9vw" },
  { i: 10, left: "58%", top: "82%", w: "15vw" },
];

const DISC = [
  { key: "DESIGN", left: "58%", top: "6%" },
  { key: "FASHION", left: "82%", top: "48%" },
  { key: "PERFORMANCE", left: "36%", top: "72%" },
  { key: "FILM", left: "70%", top: "88%" },
  { key: "EPHEMERA", left: "18%", top: "88%" },
];

export function EraYeezus() {
  const items = figmaScreen("03-era-yeezus").filter(
    (x) => !x.file.includes("03-era-yeezus-02-yeezus"),
  );
  const cover =
    items.find((x) => x.file.includes("alternate-cover-1")) ?? items[0];

  return (
    <main className="era fade-in">
      <div className="era__year">2013</div>
      <h1 className="era__title">YEEZUS</h1>
      <p className="meta" style={{ maxWidth: 520, marginBottom: 48 }}>
        An environment, not a gallery. Images are only records whose source names Yeezus.
        Disciplines sit in space around the released cover — not six equal modules.
      </p>
      <div className="era__env">
        {cover ? (
          <Link to={`/record/${cover.record_id}`} className="era__cover">
            <LazyImg src={cover.src} alt={cover.record_title} />
            <div className="meta" style={{ marginTop: 10 }}>
              {cover.record_title}
              <Provenance
                source={cover.source_name}
                url={cover.source_page}
                date={cover.year}
                status={cover.status}
                statusTerm={cover.status_source_term}
              />
            </div>
          </Link>
        ) : null}

        {SAT.map((s) => {
          const item = items[s.i];
          if (!item || item.file === cover?.file) return null;
          return (
            <Link
              key={item.file}
              to={`/record/${item.record_id}`}
              className="era__sat"
              style={{ left: s.left, top: s.top, width: s.w }}
            >
              <LazyImg src={item.src} alt={item.record_title} />
              <div className="meta" style={{ marginTop: 6 }}>
                {item.record_title}
                <br />
                {item.status_source_term}
              </div>
            </Link>
          );
        })}

        {DISC.map((d) => {
          const rows = (curated.yeezus_domains[d.key] ?? []).filter(
            (r) => !/\.mp3|\.wav|ref \(/i.test(r.title) && r.type !== "tracklists" && r.type !== "stems" && r.type !== "main",
          );
          return (
            <div key={d.key} className="era__disc" style={{ left: d.left, top: d.top }}>
              <div>{d.key}</div>
              <ul className="era__list">
                {rows.slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <Link to={`/record/${r.id}`}>{r.title}</Link>
                    <div className="meta">
                      {r.status}
                      {r.status_source_term ? ` · ${r.status_source_term}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <div className="era__disc" style={{ left: "2%", top: "22%" }}>
          <div>MUSIC</div>
          <ul className="era__list">
            <li>
              <Link to="/music">Open the music axis →</Link>
              <div className="meta">Not a tracklist dump</div>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
