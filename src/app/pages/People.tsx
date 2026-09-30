import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { loadSearchIndex, type SearchHit } from "@/lib/archive";

export function People() {
  const nav = useNavigate();
  const [index, setIndex] = useState<SearchHit[] | null>(null);

  useEffect(() => {
    loadSearchIndex().then(setIndex).catch(() => setIndex([]));
  }, []);

  const people = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of index ?? []) {
      for (const name of row.people ?? []) {
        const n = name.trim();
        if (!n) continue;
        counts.set(n, (counts.get(n) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [index]);

  return (
    <main className="people fade-in">
      <h1 className="people__h">PEOPLE</h1>
      <p className="meta" style={{ marginBottom: 32 }}>
        Names as stored on records. Not a social graph. Click opens search.
      </p>
      <div className="people__list">
        {people.map(([name, n]) => (
          <button
            key={name}
            type="button"
            onClick={() => nav(`/search?q=${encodeURIComponent(name)}`)}
          >
            {name}
            <span className="meta"> {n}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
