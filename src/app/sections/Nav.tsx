import { Reveal } from '../components/ui/Reveal';

export function Nav() {
  return (
    <nav className="border-b-2 border-neutral-900 bg-white">
      <Reveal className="grid grid-cols-1 md:grid-cols-3 min-h-[80px]">
        {/* Left: Name */}
        <div className="flex flex-col justify-center px-6 py-4 border-b md:border-b-0 md:border-r border-neutral-200">
          <h1 className="font-serif italic text-2xl leading-none">Shazaan Raza</h1>
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mt-1">Designer & Developer</span>
        </div>

        {/* Center: Location */}
        <div className="flex items-center justify-center px-6 py-4 border-b md:border-b-0 md:border-r border-neutral-200">
          <span className="font-mono text-[11px] uppercase tracking-widest text-center">
            Portfolio — 2025 — Hoffman Estates, IL
          </span>
        </div>

        {/* Right: Links */}
        <div className="flex items-center justify-center md:justify-end px-6 py-4 gap-6">
          {["About", "Work", "Skills", "Contact"].map((link) => (
            <a 
              key={link} 
              href={`#${link.toLowerCase()}`}
              className="font-mono text-[11px] uppercase tracking-widest hover:text-neutral-500 transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
      </Reveal>
    </nav>
  );
}
