import { cn } from '../../lib/utils';

export function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200">
      <div className="grid grid-cols-1 md:grid-cols-3 text-[10px] font-mono uppercase tracking-widest text-neutral-500">
        <div className="p-6 md:p-8 flex items-center justify-center md:justify-start border-b md:border-b-0 md:border-r border-neutral-200">
          © 2025 Shazaan Raza
        </div>
        <div className="p-6 md:p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-neutral-200">
          Designer & Developer
        </div>
        <div className="p-6 md:p-8 flex items-center justify-center md:justify-end">
          Hoffman Estates, IL
        </div>
      </div>
    </footer>
  );
}
