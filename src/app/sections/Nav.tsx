import { useState } from 'react';
import { Reveal } from '../components/ui/Reveal';
import { cn } from '../../lib/utils';

const navLinks = ['About', 'Work', 'Projects', 'Skills', 'Contact'];

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="border-b-2 border-neutral-900 bg-white relative z-50">
      <Reveal className="grid grid-cols-[1fr_auto] md:grid-cols-3 min-h-[80px]">
        <div className="flex flex-col justify-center px-6 py-4 border-b md:border-b-0 md:border-r border-neutral-200">
          <h1 className="font-serif italic text-2xl leading-none">Shazaan Raza</h1>
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mt-1 hidden md:block">
            Designer & Developer
          </span>
        </div>

        <div className="hidden md:flex items-center justify-center px-6 py-4 border-b md:border-b-0 md:border-r border-neutral-200">
          <span className="font-mono text-[11px] uppercase tracking-widest text-center">
            Portfolio — 2025 — Hoffman Estates, IL
          </span>
        </div>

        <div className="hidden md:flex items-center justify-end px-6 py-4 gap-6">
          {navLinks.slice(0, -1).map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="font-mono text-[11px] uppercase tracking-widest hover:text-neutral-500 transition-colors"
            >
              {link}
            </a>
          ))}
          {/* TODO: Replace with actual resume PDF */}
          <a
            href="/resume.pdf"
            download="Shazaan_Raza_Resume.pdf"
            className="font-mono text-[11px] uppercase tracking-widest border border-neutral-900 px-3 py-1.5 hover:bg-neutral-900 hover:text-white transition-colors duration-300"
          >
            RÉSUMÉ ↓
          </a>
          <a
            href="#contact"
            className="font-mono text-[11px] uppercase tracking-widest hover:text-neutral-500 transition-colors"
          >
            Contact
          </a>
        </div>

        <button
          type="button"
          className="md:hidden flex items-center justify-center px-6 py-4 font-mono text-xl border-l border-neutral-200"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          ☰
        </button>
      </Reveal>

      {menuOpen && (
        <div className="md:hidden absolute inset-x-0 top-full bg-white border-b-2 border-neutral-900 shadow-lg z-50">
          <div className="flex flex-col py-4">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="font-mono text-[11px] uppercase tracking-widest px-6 py-3 hover:bg-neutral-50 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link}
              </a>
            ))}
            <a
              href="/resume.pdf"
              download="Shazaan_Raza_Resume.pdf"
              className={cn(
                'font-mono text-[11px] uppercase tracking-widest mx-6 my-2 py-3 text-center',
                'border border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors duration-300'
              )}
              onClick={() => setMenuOpen(false)}
            >
              RÉSUMÉ ↓
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
