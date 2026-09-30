import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { figmaScreen } from "@/lib/archive";
import { LazyImg } from "../components/LazyImg";

type Spot = { x: number; y: number; w: number };

const SPOTS: Spot[] = [
  { x: 180, y: 220, w: 420 },
  { x: 720, y: 80, w: 160 },
  { x: 980, y: 260, w: 280 },
  { x: 140, y: 720, w: 210 },
  { x: 1280, y: 90, w: 520 },
  { x: 620, y: 540, w: 340 },
  { x: 1680, y: 480, w: 150 },
  { x: 1900, y: 160, w: 260 },
  { x: 40, y: 1080, w: 300 },
  { x: 1100, y: 780, w: 190 },
  { x: 1500, y: 860, w: 410 },
  { x: 760, y: 980, w: 240 },
  { x: 2100, y: 700, w: 180 },
  { x: 400, y: 1280, w: 560 },
  { x: 1180, y: 1240, w: 220 },
  { x: 1680, y: 1180, w: 330 },
  { x: 80, y: 1680, w: 170 },
  { x: 620, y: 1720, w: 280 },
  { x: 1080, y: 1640, w: 140 },
  { x: 1480, y: 1580, w: 250 },
  { x: 1860, y: 1480, w: 380 },
  { x: 2200, y: 1100, w: 200 },
];

const YEAR_MARKS = [
  { year: "2004", x: 60, y: 40 },
  { year: "2008", x: 900, y: 400 },
  { year: "2013", x: 1600, y: 40 },
  { year: "2021", x: 200, y: 1500 },
  { year: "2024", x: 1400, y: 1900 },
];

export function ArchiveField() {
  const items = figmaScreen("02-archive-field");
  const plane = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [view, setView] = useState({ x: -80, y: -40, s: 0.62 });
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      setView((v) => {
        const next = Math.min(1.35, Math.max(0.38, v.s + (e.deltaY > 0 ? -0.06 : 0.06)));
        return { ...v, s: next };
      });
    }
    function onDown(e: PointerEvent) {
      const v = viewRef.current;
      drag.current = { x: v.x, y: v.y, px: e.clientX, py: e.clientY };
      el.classList.add("is-dragging");
    }
    function onMove(e: PointerEvent) {
      if (!drag.current) return;
      const origin = drag.current;
      setView((v) => ({
        ...v,
        x: origin.x + (e.clientX - origin.px),
        y: origin.y + (e.clientY - origin.py),
      }));
    }
    function onUp() {
      drag.current = null;
      el.classList.remove("is-dragging");
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <main className="field fade-in" ref={wrap}>
      <div className="field__hint meta">
        Archive field · years as space · drag / scroll to move
      </div>
      <div
        className="field__plane"
        ref={plane}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
      >
        {YEAR_MARKS.map((m) => (
          <div key={m.year} className="field__year" style={{ left: m.x, top: m.y }}>
            {m.year}
          </div>
        ))}
        {items.map((item, i) => {
          const spot = SPOTS[i] ?? { x: 100 + i * 80, y: 200, w: 180 };
          return (
            <Link
              key={item.file}
              to={`/record/${item.record_id}`}
              className="field__cell"
              style={{ left: spot.x, top: spot.y, width: spot.w }}
            >
              <LazyImg src={item.src} alt={item.record_title} />
              <div className="field__cap meta">
                {item.year ?? "—"} · {item.record_title}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
