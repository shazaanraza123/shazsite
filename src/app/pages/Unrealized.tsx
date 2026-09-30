import { useMemo, useState } from "react";
import { Link } from "react-router";
import { UNREALIZED_STATUSES, figmaScreen } from "@/lib/archive";
import { ArchiveBrowser } from "../components/ArchiveBrowser";
import { LazyImg } from "../components/LazyImg";
import { Provenance } from "../components/Meta";
import { useJson } from "../useArchive";

export function Unrealized() {
  const items = figmaScreen("07-unrealized");
  const bands = new Map<string, typeof items>();
  for (const item of items) {
    const key = `${item.status} · ${item.status_source_term}`;
    const list = bands.get(key) ?? [];
    list.push(item);
    bands.set(key, list);
  }

  const data = useJson<{ statuses: { status: string; count: number }[] }>("/index/status.json");
  const present = useMemo(() => {
    const map = new Map((data?.statuses ?? []).map((s) => [s.status, s.count]));
    return UNREALIZED_STATUSES.map((s) => ({ status: s, count: map.get(s) ?? 0 })).filter(
      (s) => s.count > 0,
    );
  }, [data]);

  const [status, setStatus] = useState<string | null>(null);

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

      <section className="unreal__index">
        <h2 className="unreal__status">Statuses in the full archive</h2>
        <div className="unreal__statuses">
          {present.map((s) => (
            <button
              key={s.status}
              type="button"
              className={status === s.status ? "is-on" : ""}
              onClick={() => setStatus(status === s.status ? null : s.status)}
            >
              {s.status}
              <span className="meta"> {s.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
        {status ? (
          <ArchiveBrowser preset={{ status }} lock={["status"]} groupByDomain />
        ) : (
          <p className="meta" style={{ marginTop: 24 }}>
            Select a status to read across mediums. Counts are source statuses, not a single
            unreleased pile.
          </p>
        )}
      </section>
    </main>
  );
}
