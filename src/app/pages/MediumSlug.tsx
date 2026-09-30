import { Link, useParams, useSearchParams } from "react-router";
import { MEDIUMS } from "@/lib/archive";
import { ArchiveBrowser, TypeLinks } from "../components/ArchiveBrowser";
import { useJson } from "../useArchive";
import type { DomainIndex } from "@/lib/archive";

export function MediumSlug() {
  const { slug = "", type } = useParams();
  const [params] = useSearchParams();
  const year = params.get("year") ?? undefined;
  const data = useJson<{ domains: DomainIndex[] }>("/index/domains.json");
  const medium = MEDIUMS.find((m) => m.slug === slug);
  const entry = data?.domains.find((d) => d.slug === slug);

  if (!medium) {
    return (
      <main className="year fade-in">
        <p className="meta">That medium is not in the archive.</p>
        <Link to="/medium" className="meta">
          ← Medium
        </Link>
      </main>
    );
  }

  const master =
    medium.slug === "music"
      ? { to: "/music", label: "Music composition" }
      : medium.slug === "fashion"
        ? { to: "/fashion/regular-fit-ls-tee-h03", label: "One garment, six views" }
        : medium.slug === "design"
          ? { to: "/era/yeezus", label: "Yeezus environment" }
          : null;

  return (
    <main className="year fade-in">
      <p className="meta">
        <Link to="/medium">Medium</Link>
        {master ? (
          <>
            {" · "}
            <Link to={master.to}>{master.label}</Link>
          </>
        ) : null}
      </p>
      <h1 className="year__h">{medium.domain}</h1>
      <p className="meta" style={{ maxWidth: 560, marginBottom: 36 }}>
        {entry
          ? `${entry.count.toLocaleString()} records · ${entry.with_image.toLocaleString()} with local image. Types are source categories, not a store taxonomy.`
          : "Loading…"}
      </p>
      {entry && !type ? (
        <TypeLinks types={entry.types} href={(t) => `/medium/${slug}/${encodeURIComponent(t)}`} />
      ) : null}
      {type ? (
        <p className="meta" style={{ marginBottom: 24 }}>
          Type {type} · <Link to={`/medium/${slug}`}>all {medium.domain.toLowerCase()}</Link>
        </p>
      ) : null}
      <ArchiveBrowser
        preset={{
          domain: medium.domain,
          type: type || undefined,
          year,
        }}
        lock={["domain", ...(type ? (["type"] as const) : []), ...(year ? (["year"] as const) : [])]}
      />
    </main>
  );
}
