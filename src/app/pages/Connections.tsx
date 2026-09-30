import { useMemo, useState } from "react";
import { Link } from "react-router";
import { GLOW_ID, curated, figmaScreen } from "@/lib/archive";
import { LazyImg } from "../components/LazyImg";
import { Provenance } from "../components/Meta";

type Node = {
  id: string;
  title: string;
  src: string | null;
  status: string;
  term: string | null;
  source: string;
  url: string;
  year: string | null;
  related: string[];
};

export function Connections() {
  const glowFigs = figmaScreen("04-record-glow-in-the-dark");
  const extraFigs = figmaScreen("08-connections");

  const nodes = useMemo(() => {
    const byId = new Map<string, Node>();
    for (const r of curated.glow.records) {
      const fig = glowFigs.find((f) => f.record_id === r.id);
      byId.set(r.id, {
        id: r.id,
        title: r.title,
        src: fig?.src ?? r.images.find((i) => i.local_path)?.local_path ?? null,
        status: r.status,
        term: r.status_source_term,
        source: r.source.name,
        url: r.source.url,
        year: r.year,
        related: r.related_records,
      });
    }
    for (const fig of extraFigs) {
      if (byId.has(fig.record_id)) continue;
      byId.set(fig.record_id, {
        id: fig.record_id,
        title: fig.record_title,
        src: fig.src,
        status: fig.status,
        term: fig.status_source_term,
        source: fig.source_name,
        url: fig.source_page,
        year: fig.year,
        related: fig.record?.related_records ?? [],
      });
    }
    return [...byId.values()];
  }, [extraFigs, glowFigs]);

  const [center, setCenter] = useState(GLOW_ID);
  const centerNode = nodes.find((n) => n.id === center) ?? nodes[0];

  const layout = useMemo(() => {
    const others = nodes.filter((n) => n.id !== centerNode?.id);
    const cx = 50;
    const cy = 48;
    const placed: { node: Node; x: number; y: number; center: boolean }[] = [];
    if (centerNode) placed.push({ node: centerNode, x: cx, y: cy, center: true });
    others.forEach((node, i) => {
      const a = (Math.PI * 2 * i) / Math.max(others.length, 1) - Math.PI / 2;
      const radius = 28 + (i % 3) * 6;
      placed.push({
        node,
        x: cx + Math.cos(a) * radius,
        y: cy + Math.sin(a) * radius * 0.72,
        center: false,
      });
    });
    return placed;
  }, [centerNode, nodes]);

  const edges = layout.flatMap((a) =>
    layout
      .filter((b) => a.node.id !== b.node.id)
      .filter(
        (b) =>
          a.node.related.includes(b.node.id) || b.node.related.includes(a.node.id),
      )
      .map((b) => ({ a, b })),
  );

  return (
    <main className="graph fade-in">
      <svg className="graph__svg" aria-hidden="true">
        {edges.map(({ a, b }) => (
          <line
            key={`${a.node.id}-${b.node.id}`}
            x1={`${a.x}%`}
            y1={`${a.y}%`}
            x2={`${b.x}%`}
            y2={`${b.y}%`}
            stroke="rgba(17,17,16,0.28)"
            strokeWidth="1"
          />
        ))}
      </svg>
      {layout.map(({ node, x, y, center: isC }) => (
        <button
          key={node.id}
          type="button"
          className={`graph__node ${isC ? "is-center" : ""}`}
          style={{ left: `${x}%`, top: `${y}%` }}
          onClick={() => setCenter(node.id)}
        >
          {node.src ? <LazyImg src={node.src} alt="" /> : null}
          <div className="meta meta-ink">{node.title}</div>
        </button>
      ))}
      {centerNode ? (
        <div className="graph__center-label">
          <p className="meta meta-ink">{centerNode.title}</p>
          <Provenance
            source={centerNode.source}
            url={centerNode.url}
            date={centerNode.year}
            status={centerNode.status}
            statusTerm={centerNode.term}
          />
          <p className="meta" style={{ marginTop: 8 }}>
            Click a node to recenter. Lines only where related_records match.{" "}
            <Link to={`/record/${centerNode.id}`}>Open record →</Link>
          </p>
        </div>
      ) : null}
    </main>
  );
}
