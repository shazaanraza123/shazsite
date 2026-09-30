import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { hitMatchesWork, slugify, type SearchHit, type WorkIndex } from "@/lib/archive";
import { ArchiveBrowser, DisciplineLinks } from "../components/ArchiveBrowser";
import { useJson } from "../useArchive";

type ProjectRow = WorkIndex & { project?: string | string[] };

type ProjectsFile = {
  works: WorkIndex[];
  projects: ProjectRow[];
};

function matchesWork(h: SearchHit, work: ProjectRow, slug: string) {
  if (work.era || work.titleIncludes || Array.isArray(work.project)) {
    return hitMatchesWork(h, work);
  }
  if (typeof work.project === "string") return h.project === work.project;
  return slugify(h.project ?? "") === slug;
}

export function WorkSlug() {
  const { slug = "" } = useParams();
  const data = useJson<ProjectsFile>("/index/projects.json");

  const work =
    data?.works.find((w) => w.slug === slug) ??
    data?.projects.find((p) => p.slug === slug) ??
    null;

  const match = useCallback(
    (h: SearchHit) => (work ? matchesWork(h, work, slug) : false),
    [work, slug],
  );

  if (data && !work) {
    return (
      <main className="year fade-in">
        <p className="meta">No project in the index uses that name.</p>
        <Link to="/work" className="meta">
          ← Work
        </Link>
      </main>
    );
  }

  const label = work?.label ?? (typeof work?.project === "string" ? work.project : slug);
  const counts = work?.domains ?? {};

  return (
    <main className="year fade-in">
      <p className="meta">
        <Link to="/work">Work</Link>
        {slug === "yeezus" ? (
          <>
            {" · "}
            <Link to="/era/yeezus">Yeezus environment</Link>
          </>
        ) : null}
        {slug === "glow-in-the-dark" ? (
          <>
            {" · "}
            <Link to="/record/yetracker-3b678731de5e1b3a">Glow record</Link>
            {" · "}
            <Link to="/connections">Connections</Link>
          </>
        ) : null}
      </p>
      <h1 className="year__h">{label}</h1>
      <p className="meta" style={{ maxWidth: 560, marginBottom: 36 }}>
        {work
          ? `${work.count.toLocaleString()} records whose project, era, or title the source ties to this work. Cross-medium only where the metadata says so.`
          : "Loading…"}
      </p>
      <DisciplineLinks counts={counts} toFor={(domain) => `/medium/${domain.toLowerCase()}`} />
      {work ? <ArchiveBrowser match={match} groupByDomain /> : null}
    </main>
  );
}
