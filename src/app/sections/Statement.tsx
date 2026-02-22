import { Reveal } from '../components/ui/Reveal';
import { Crosshair } from '../components/ui/Crosshair';

export function Statement() {
  return (
    <section className="border-b border-neutral-900 bg-white">
      {/* Metadata Strip */}
      <div className="grid grid-cols-4 border-b border-neutral-200 text-[9px] font-mono uppercase tracking-widest">
        <div className="p-3 border-r border-neutral-200">—</div>
        <div className="p-3 border-r border-neutral-200">Design Philosophy</div>
        <div className="p-3 border-r border-neutral-200"></div>
        <div className="p-3">Hoffman Estates, IL</div>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
        {/* Left: Philosophy */}
        <div className="p-12 md:p-24 border-b md:border-b-0 md:border-r border-neutral-200 flex flex-col justify-between">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block mb-6">On design</span>
            <p className="font-serif text-lg leading-relaxed max-w-sm">
              Design is not decoration. It's the difference between a product that works and one that people want to use. I approach every project as a systems problem, what are the constraints, who is the user, what does success look like?
            </p>
          </div>
          <div className="self-start mt-12">
            <Crosshair size={32} />
          </div>
        </div>

        {/* Right: Display Type */}
        <div className="p-12 md:p-24 bg-neutral-900 text-white flex flex-col justify-center">
          <Reveal>
            <h2 className="font-serif text-6xl md:text-8xl uppercase leading-none tracking-tight text-right md:text-left">
              Design<br />
              <span className="italic font-light lowercase">is not</span><br />
              Decoration.
            </h2>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
