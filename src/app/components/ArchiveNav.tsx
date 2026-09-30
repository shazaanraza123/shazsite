import { NavLink, useLocation, useNavigate } from "react-router";
import { NAV } from "@/lib/archive";

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
              className={({ isActive }) => (isActive ? "is-on" : "")}
            >
              {item.label}
            </NavLink>
          ),
        )}
      </nav>
    </header>
  );
}
