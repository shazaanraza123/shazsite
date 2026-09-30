import type { ReactNode } from "react";
import { dash, statusKind } from "@/lib/archive";

export function Meta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`meta ${className}`}>{children}</div>;
}

export function Provenance({
  source,
  url,
  date,
  status,
  statusTerm,
}: {
  source?: string | null;
  url?: string | null;
  date?: string | null;
  status?: string | null;
  statusTerm?: string | null;
}) {
  const kind = statusKind(status);
  const label =
    kind === "unconfirmed"
      ? "unconfirmed"
      : kind === "fact"
        ? "documented"
        : "source claim";
  return (
    <div className="meta" style={{ display: "grid", gap: 4 }}>
      <div>
        SOURCE {dash(source)}
        {url ? (
          <>
            {" "}
            /{" "}
            <a href={url} target="_blank" rel="noreferrer">
              URL
            </a>
          </>
        ) : null}
      </div>
      <div>DATE {dash(date)}</div>
      <div>
        STATUS <span className={`claim claim--${kind}`}>{dash(status)}</span>
        {statusTerm ? ` · ${statusTerm}` : ""} · {label}
      </div>
    </div>
  );
}
