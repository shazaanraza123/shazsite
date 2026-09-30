import { Link } from "react-router";
import { curated } from "@/lib/archive";

const LINKS: { name: string; to: string }[] = [
  { name: "MUSIC", to: "/music" },
  { name: "FASHION", to: "/fashion/regular-fit-ls-tee-h03" },
  { name: "PERFORMANCE", to: "/archive" },
  { name: "FILM", to: "/archive" },
  { name: "DESIGN", to: "/era/yeezus" },
  { name: "EPHEMERA", to: "/record/yetracker-3b678731de5e1b3a" },
  { name: "PHOTOGRAPHY", to: "/archive" },
  { name: "WRITING", to: "/archive" },
  { name: "OBJECTS", to: "/archive" },
];

export function Medium() {
  return (
    <main className="mediums fade-in">
      <h1 className="mediums__h">MEDIUM</h1>
      <p className="meta" style={{ maxWidth: 480, marginBottom: 40 }}>
        Views into one archive. Counts are from the local scrape, not a store catalog.
      </p>
      {LINKS.filter((l) => curated.domains.includes(l.name)).map((l) => (
        <Link key={l.name} to={l.to}>
          {l.name}
        </Link>
      ))}
    </main>
  );
}
