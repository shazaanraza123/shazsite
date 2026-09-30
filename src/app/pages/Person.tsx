import { useCallback } from "react";
import { Link, useParams } from "react-router";
import type { PersonIndex, SearchHit } from "@/lib/archive";
import { ArchiveBrowser } from "../components/ArchiveBrowser";
import { useJson } from "../useArchive";

export function Person() {
  const { slug = "" } = useParams();
  const data = useJson<{ people: PersonIndex[] }>("/index/people.json");
  const person = data?.people.find((p) => p.slug === slug);

  const match = useCallback(
    (h: SearchHit) => {
      if (!person) return false;
      const needle = person.display_name.toLowerCase();
      const names = [...(h.names ?? [])].map((n) => n.toLowerCase());
      if (names.some((n) => n === needle)) return true;
      if (needle.length < 3) return false;
      return (h.people ?? []).some((p) => p.toLowerCase().includes(needle));
    },
    [person],
  );

  if (data && !person) {
    return (
      <main className="year fade-in">
        <p className="meta">No person in the normalized index uses that name.</p>
        <Link to="/people" className="meta">
          ← People
        </Link>
      </main>
    );
  }

  return (
    <main className="year fade-in">
      <p className="meta">
        <Link to="/people">People</Link>
      </p>
      <h1 className="year__h">{person?.display_name ?? slug}</h1>
      <p className="meta" style={{ maxWidth: 560, marginBottom: 28 }}>
        Archive connections only. {person ? `${person.record_count} records name this person.` : ""}{" "}
        No biography is written here.
      </p>
      {person?.years?.length ? (
        <p className="meta" style={{ marginBottom: 16 }}>
          Years {person.years.join(" · ")}
        </p>
      ) : null}
      {person?.original_fields?.length ? (
        <p className="meta" style={{ marginBottom: 28, maxWidth: 640 }}>
          Source field
          {person.original_fields.length > 1 ? "s" : ""}: {person.original_fields.join(" · ")}
        </p>
      ) : null}
      {person?.domains?.length ? (
        <p className="meta" style={{ marginBottom: 28 }}>
          {person.domains.map((d, i) => (
            <span key={d}>
              {i ? " · " : null}
              <Link to={`/medium/${d.toLowerCase()}`}>{d}</Link>
            </span>
          ))}
        </p>
      ) : null}
      {person ? <ArchiveBrowser match={match} lock={["person"]} /> : null}
    </main>
  );
}
