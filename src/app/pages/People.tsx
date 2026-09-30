import { Link } from "react-router";
import { useJson } from "../useArchive";
import type { PersonIndex } from "@/lib/archive";

export function People() {
  const data = useJson<{ people: PersonIndex[] }>("/index/people.json");
  const people = data?.people ?? [];

  return (
    <main className="people fade-in">
      <h1 className="people__h">PEOPLE</h1>
      <p className="meta" style={{ maxWidth: 560, marginBottom: 32 }}>
        Names as stored on records, split only on clear separators. Ye and Kanye West are
        kept separate. Not a biography index — open a name to see the records that name them.
      </p>
      <div className="people__list">
        {people.map((p) => (
          <Link key={p.slug} to={`/people/${p.slug}`}>
            {p.display_name}
            <span className="meta"> {p.record_count}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
