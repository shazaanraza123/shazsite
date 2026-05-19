import { Crosshair } from '../components/ui/Crosshair';
import { SectionBar } from '../components/ui/SectionBar';
import { cn } from '../../lib/utils';

const capabilities = [
  {
    id: '01',
    title: 'Product Design',
    italicTitle: 'Design',
    tools: ['Figma', 'Design Systems', 'Prototyping', 'User Flows'],
    description:
      'From user flows to shipped interfaces. I design with systems thinking — every component serves a purpose, every screen tells a story.',
  },
  {
    id: '02',
    title: 'Frontend Development',
    italicTitle: 'Development',
    tools: ['React / TypeScript', 'Flutter / Swift', 'HTML / CSS', 'Animation'],
    description:
      'I build what I design. React, TypeScript, Swift — production-ready code that matches the mockup pixel for pixel.',
  },
  {
    id: '03',
    title: 'Brand Identity',
    italicTitle: 'Identity',
    tools: ['Adobe Illustrator', 'Photoshop', 'Premiere / CapCut', 'Visual Strategy'],
    description:
      "Visual systems that scale. Logos, merch, campaigns — I've built identities for 20+ brands with 3M+ combined reach.",
  },
  {
    id: '04',
    title: 'Engineering',
    italicTitle: 'Engineering',
    tools: ['Node.js / Express', 'MySQL / Firebase', 'Docker', 'Python / ML'],
    description:
      'Full-stack when the project needs it. APIs, databases, ML pipelines — I go as deep as the problem requires.',
  },
];

export function Capabilities() {
  return (
    <section id="skills" className="border-b border-neutral-900 bg-white">
      <SectionBar cols={['04', 'Capabilities', '', 'Hover to explore']} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 min-h-[400px]">
        {capabilities.map((cap, i) => (
          <div
            key={cap.id}
            className={cn(
              'group relative p-8 md:p-12 border-b md:border-b-0 border-neutral-200',
              'transition-colors duration-300 ease-in-out',
              'hover:bg-neutral-900 hover:text-white cursor-crosshair flex flex-col justify-between',
              i < 3 && 'md:border-r'
            )}
          >
            <div className="flex justify-between items-start mb-12">
              <span className="font-mono text-sm group-hover:text-neutral-400 transition-colors duration-300">
                {cap.id}
              </span>
              <Crosshair
                size={24}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
            </div>

            <div>
              <h3 className="font-serif text-3xl md:text-4xl mb-8 leading-none">
                {cap.title.replace(cap.italicTitle, '')}
                <span className="italic font-light block">{cap.italicTitle}</span>
              </h3>

              <div className="space-y-4">
                <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 group-hover:text-neutral-400 block mb-2 transition-colors duration-300">
                  Tools
                </span>
                <ul className="space-y-1">
                  {cap.tools.map((tool) => (
                    <li
                      key={tool}
                      className="font-serif text-sm leading-relaxed text-neutral-600 group-hover:text-neutral-300 transition-colors duration-300"
                    >
                      {tool}
                    </li>
                  ))}
                </ul>

                <p
                  className={cn(
                    'font-serif text-sm leading-relaxed text-neutral-600 group-hover:text-neutral-300',
                    'opacity-0 max-h-0 overflow-hidden',
                    'group-hover:opacity-100 group-hover:max-h-40 group-hover:mt-4',
                    'transition-all duration-300 ease-in-out'
                  )}
                >
                  {cap.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
