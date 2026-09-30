import { NavLink, useLocation, useNavigate } from "react-router";
import { NAV } from "@/lib/archive";

function isOn(to: string, pathname: string) {
  if (to === "/time") return pathname === "/time" || pathname.startsWith("/year/");
  if (to === "/medium") {
    return (
      pathname === "/medium" ||
      pathname.startsWith("/medium/") ||
      pathname === "/music" ||
      pathname.startsWith("/fashion/")
    );
  }
  if (to === "/work") return pathname === "/work" || pathname.startsWith("/work/") || pathname.startsWith("/era/");
  if (to === "/people") return pathname === "/people" || pathname.startsWith("/people/");
  if (to === "/unrealized") return pathname === "/unrealized";
  if (to === "/connections") return pathname === "/connections";
  return pathname === to;
}

export function ArchiveNav() {
  const loc = useLocation();
  const nav = useNavigate();
  const searchOn = loc.pathname === "/search";

  return (
    <header className="ye-nav">
      <NavLink to="/" className="ye-nav__mark">
        YE ARCHIVE
      </NavLink>
      <span />
      <nav className="ye-nav__views" aria-label="Archive views">
        {NAV.map((item) =>
          item.to === "/search" ? (
            <button
              key={item.label}
              type="button"
              className={searchOn ? "is-on" : ""}
              onClick={() => nav("/search")}
            >
              {item.label}
            </button>
          ) : (
            <NavLink
              key={item.label}
              to={item.to}
              className={() => (isOn(item.to, loc.pathname) ? "is-on" : "")}
            >
              {item.label}
            </NavLink>
          ),
        )}
      </nav>
    </header>
  );
}
