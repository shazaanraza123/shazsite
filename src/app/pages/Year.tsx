import { Link, useParams } from "react-router";
import { ArchiveBrowser, DisciplineLinks } from "../components/ArchiveBrowser";
import { useJson } from "../useArchive";
import type { YearIndex } from "@/lib/archive";

export function Year() {
  const { year = "" } = useParams();
  const data = useJson<{ years: YearIndex[] }>("/index/years.json");
  const entry = data?.years.find((y) => y.year === year);

  if (data && !entry) {
    return (
      <main className="year fade-in">
        <p className="meta">No dated records for {year}.</p>
        <Link to="/time" className="meta">
          ← Time
        </Link>
      </main>
    );
  }

  return (
    <main className="year fade-in">
      <p className="meta">
        <Link to="/time">Time</Link>
      </p>
      <h1 className="year__h">{year}</h1>
      <p className="meta" style={{ maxWidth: 520, marginBottom: 40 }}>
        {entry
          ? `${entry.count.toLocaleString()} dated records · ${entry.with_image.toLocaleString()} with local image. Disciplines listed only if they exist this year.`
          : "Loading year index…"}
      </p>
      {entry ? (
        <DisciplineLinks
          counts={entry.domains}
          toFor={(domain) => `/medium/${domain.toLowerCase()}?year=${year}`}
        />
      ) : null}
      <ArchiveBrowser preset={{ year }} lock={["year"]} groupByDomain />
    </main>
  );
}
