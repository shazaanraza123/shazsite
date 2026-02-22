import { Reveal } from '../components/ui/Reveal';
import { cn } from '../../lib/utils';
import { MetadataStrip } from '../components/ui/MetadataStrip';

export function About() {
  return (
    <section id="about" className="bg-white border-b border-neutral-900 overflow-hidden">
      {/* Metadata Strip */}
      <MetadataStrip 
        cols={[
          <span className="font-mono text-xs">01</span>,
          <span className="font-serif italic">About</span>,
          <span className="font-mono text-[9px]">Illinois Institute of Technology</span>,
          <span className="font-mono text-[9px]">B.A. Computer Science</span>
        ]}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[60px_2fr_0.5fr_2fr_0.5fr_1fr] min-h-[500px]">
        {/* Col 1: Vertical Text */}
        <div className="hidden md:flex flex-col items-center justify-center border-r border-neutral-200 py-12">
          <span className="font-serif italic text-2xl whitespace-nowrap rotate-180" style={{ writingMode: 'vertical-rl' }}>
            Shazaan Raza
          </span>
        </div>

        {/* Col 2: Display Headline */}
        <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-neutral-200 flex flex-col justify-center">
          <Reveal>
            <h2 className="font-serif text-5xl md:text-7xl uppercase leading-none tracking-tight">
              A creative<br />
              who actually<br />
              <span className="italic font-light lowercase">ships.</span>
            </h2>
          </Reveal>
        </div>

        {/* Col 3: Gap */}
        <div className="hidden md:block border-r border-neutral-200 bg-neutral-50/50" />

        {/* Col 4: Body Copy */}
        <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-neutral-200 flex flex-col justify-center gap-6">
          <p className="font-serif text-lg leading-relaxed">
            I'm Shazaan, a product designer and frontend developer studying Computer Science at Illinois Institute of Technology. My background spans brand identity for 50+ companies, UI design for the YZY mobile app, and full-stack engineering across internships at Azerty Studio and Azlan Technologies.
          </p>
          <p className="font-serif text-lg leading-relaxed">
            I sit at the intersection of visual craft and technical execution. I don't just design, I build it myself.
          </p>
        </div>

        {/* Col 5: Gap */}
        <div className="hidden md:block border-r border-neutral-200 bg-neutral-50/50" />

        {/* Col 6: Stats */}
        <div className="grid grid-rows-4 divide-y divide-neutral-200 border-b md:border-b-0">
          {[
            { num: "50+", label: "Brands worked with" },
            { num: "3M+", label: "Combined reach" },
            { num: "4+", label: "Years designing" },
            { num: "2026", label: "IIT graduation" },
          ].map((stat, i) => (
            <div key={i} className="p-4 flex flex-col justify-center">
              <span className="font-mono text-2xl font-bold">{stat.num}</span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-500 mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
