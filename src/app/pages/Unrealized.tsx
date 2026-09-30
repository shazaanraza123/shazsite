import { Link } from "react-router";
import { figmaScreen } from "@/lib/archive";
import { LazyImg } from "../components/LazyImg";
import { Provenance } from "../components/Meta";

export function Unrealized() {
  const items = figmaScreen("07-unrealized");
  const bands = new Map<string, typeof items>();
  for (const item of items) {
    const key = `${item.status} · ${item.status_source_term}`;
    const list = bands.get(key) ?? [];
    list.push(item);
    bands.set(key, list);
  }

  return (
    <main className="unreal fade-in">
      <h1 className="unreal__h">THE WORLD THAT DIDN&apos;T HAPPEN</h1>
      <p className="meta" style={{ maxWidth: 560, marginBottom: 64 }}>
        Statuses are preserved as the source wrote them. Unconfirmed is not presented as fact.
        Unused, concept, alternate, and released samplers are not flattened into a single
        “unreleased” bin.
      </p>
      {[...bands.entries()].map(([label, rows]) => (
        <section key={label} className="unreal__band">
          <h2 className="unreal__status">{label}</h2>
          <div className="unreal__sheet">
            {rows.map((item) => (
              <Link key={item.file} to={`/record/${item.record_id}`}>
                <LazyImg src={item.src} alt={item.record_title} />
                <div className="meta" style={{ marginTop: 8 }}>
                  {item.record_title}
                  <br />
                  {item.era ?? "—"}
                  <Provenance
                    source={item.source_name}
                    url={item.source_page}
                    date={item.year}
                    status={item.status}
                    statusTerm={item.status_source_term}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
