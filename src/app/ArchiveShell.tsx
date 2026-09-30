import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { ArchiveNav } from "./components/ArchiveNav";
import { SearchOverlay } from "./components/SearchOverlay";

export function ArchiveShell() {
  const loc = useLocation();
  const nav = useNavigate();
  const searchOpen = loc.pathname === "/search";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        if (!searchOpen) nav("/search");
      }
      if (e.key === "Escape" && searchOpen) {
        nav(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, searchOpen]);

  return (
    <div className="ye">
      <ArchiveNav />
      <Outlet />
      {searchOpen ? <SearchOverlay /> : null}
    </div>
  );
}
