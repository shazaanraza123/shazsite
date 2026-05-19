import { Reveal } from '../components/ui/Reveal';
import { Crosshair } from '../components/ui/Crosshair';
import { SectionBar } from '../components/ui/SectionBar';

export function Statement() {
  return (
    <section className="border-b border-neutral-900 bg-white">
      <SectionBar cols={['—', 'Design Philosophy', '', 'Hoffman Estates, IL']} />

      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
        <div className="p-8 md:p-24 border-b md:border-b-0 md:border-r border-neutral-200 flex flex-col justify-between">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block mb-6">
              On design
            </span>
            <p className="font-serif text-lg leading-relaxed max-w-sm">
              Design is not decoration. It&apos;s the difference between a product that works and
              one that people want to use. I approach every project as a systems problem, what are
              the constraints, who is the user, what does success look like?
            </p>
          </div>
          <div className="self-start mt-12">
            <Crosshair size={32} />
          </div>
        </div>

        <div className="p-8 md:p-24 bg-neutral-900 text-white flex flex-col justify-center">
          <Reveal>
            <h2 className="font-serif text-6xl md:text-8xl uppercase leading-none tracking-tight text-right md:text-left">
              Design
              <br />
              <span className="italic font-light lowercase">is not</span>
              <br />
              Decoration.
            </h2>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
