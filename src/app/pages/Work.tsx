import { Link } from "react-router";
import { useJson } from "../useArchive";
import type { WorkIndex } from "@/lib/archive";

type ProjectRow = WorkIndex & { project?: string };

export function WorkIndexPage() {
  const data = useJson<{ works: WorkIndex[]; projects: ProjectRow[] }>("/index/projects.json");
  const works = data?.works ?? [];
  const extras = (data?.projects ?? []).filter((p) => !works.some((w) => w.slug === p.slug));

  return (
    <main className="mediums fade-in">
      <h1 className="mediums__h">WORK</h1>
      <p className="meta" style={{ maxWidth: 560, marginBottom: 40 }}>
        Named bodies of work as the records group them — project and era fields, or a title
        the source itself uses. Relationships are not invented.
      </p>
      {works.map((w) => (
        <Link key={w.slug} to={`/work/${w.slug}`}>
          {w.label}
          <span className="meta"> {w.count.toLocaleString()}</span>
        </Link>
      ))}
      {extras.length ? (
        <section style={{ marginTop: 72 }}>
          <h2 className="meta meta-ink" style={{ marginBottom: 18 }}>
            Other named projects in the index
          </h2>
          <div className="work__extras">
            {extras.map((p) => (
              <Link key={p.slug} to={`/work/${p.slug}`} className="work__extra">
                {p.label ?? p.project}
                <span className="meta"> {p.count.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
