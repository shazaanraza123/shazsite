import { Link } from "react-router";
import { MEDIUMS } from "@/lib/archive";
import { useJson } from "../useArchive";
import type { DomainIndex } from "@/lib/archive";

export function Medium() {
  const data = useJson<{ domains: DomainIndex[] }>("/index/domains.json");
  const bySlug = new Map((data?.domains ?? []).map((d) => [d.slug, d]));

  return (
    <main className="mediums fade-in">
      <h1 className="mediums__h">MEDIUM</h1>
      <p className="meta" style={{ maxWidth: 480, marginBottom: 40 }}>
        Views into one archive. Counts are from the local scrape. Architecture is omitted —
        it is not a domain in the records.
      </p>
      {MEDIUMS.map((m) => {
        const d = bySlug.get(m.slug);
        if (data && !d) return null;
        return (
          <Link key={m.slug} to={`/medium/${m.slug}`}>
            {m.domain}
            {d ? <span className="meta"> {d.count.toLocaleString()}</span> : null}
          </Link>
        );
      })}
    </main>
  );
}
