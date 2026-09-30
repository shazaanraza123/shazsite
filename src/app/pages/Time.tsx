import { Link } from "react-router";
import { useJson } from "../useArchive";
import type { YearIndex } from "@/lib/archive";

export function Time() {
  const data = useJson<{ years: YearIndex[] }>("/index/years.json");
  const years = (data?.years ?? []).filter((y) => /^\d{4}$/.test(y.year));

  return (
    <main className="time fade-in">
      <h1 className="time__h">TIME</h1>
      <p className="meta" style={{ maxWidth: 520, marginBottom: 48 }}>
        Years as the records date them. Empty years are not invented. The field remains the
        spatial entry; this index is chronological.
      </p>
      <div className="time__years">
        {years.map((y) => (
          <Link key={y.year} to={`/year/${y.year}`} className="time__year">
            <span className="time__num">{y.year}</span>
            <span className="meta">
              {y.count.toLocaleString()} · {Object.keys(y.domains).join(" · ")}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
