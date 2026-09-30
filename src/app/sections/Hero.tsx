import { Reveal } from '../components/ui/Reveal';
import { Crosshair } from '../components/ui/Crosshair';
import { SectionBar } from '../components/ui/SectionBar';

export function Hero() {
  return (
    <section className="border-b border-neutral-900 bg-white">
      <SectionBar
        cols={['Product Design', 'Frontend Development', '(2022–Present)', 'Brand Identity & Code']}
      />

      <Reveal className="py-16 md:py-24 px-4 md:px-12 flex flex-col items-center justify-center text-center border-b border-neutral-200">
        <h1
          className="font-serif uppercase tracking-tighter leading-none flex flex-col md:block"
          style={{ fontSize: 'clamp(2.5rem, 10vw, 8rem)' }}
        >
          <span>Design</span>
          <span className="italic font-light mx-4 md:mx-8 lowercase md:uppercase">that</span>
          <span>Codes.</span>
        </h1>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 min-h-[120px]">
        <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-neutral-200 flex items-center">
          <p className="font-serif text-lg leading-snug max-w-md">
            A designer who engineers and an engineer who designs. I build products that are as
            intentional as they are functional, brand identity systems, UI products, and shipped
            code.
          </p>
        </div>

        <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-neutral-200 flex items-center justify-center">
          <Crosshair size={48} className="text-neutral-900" />
        </div>

        <div className="p-6 md:p-8 flex flex-col justify-center">
          <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mb-2">
            Status
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-sm uppercase tracking-wide">Available for work</span>
          </div>
        </div>
      </div>
    </section>
  );
}
