import { Reveal } from '../components/ui/Reveal';
import { Crosshair } from '../components/ui/Crosshair';
import { cn } from '../../lib/utils';

const capabilities = [
  { 
    id: "01", 
    title: "Product Design", 
    italicTitle: "Design", 
    tools: ["Figma", "Design Systems", "Prototyping", "User Flows"]
  },
  { 
    id: "02", 
    title: "Frontend Development", 
    italicTitle: "Development", 
    tools: ["React / TypeScript", "Flutter / Swift", "HTML / CSS", "Animation"]
  },
  { 
    id: "03", 
    title: "Brand Identity", 
    italicTitle: "Identity", 
    tools: ["Adobe Illustrator", "Photoshop", "Premiere / CapCut", "Visual Strategy"]
  },
  { 
    id: "04", 
    title: "Engineering", 
    italicTitle: "Engineering", 
    tools: ["Node.js / Express", "MySQL / Firebase", "Docker", "Python / ML"]
  },
];

export function Capabilities() {
  return (
    <section id="skills" className="border-b border-neutral-900 bg-white">
      {/* Metadata Strip */}
      <div className="grid grid-cols-4 border-b border-neutral-200 text-[9px] font-mono uppercase tracking-widest">
        <div className="p-3 border-r border-neutral-200">03</div>
        <div className="p-3 border-r border-neutral-200">Capabilities</div>
        <div className="p-3 border-r border-neutral-200"></div>
        <div className="p-3">Hover to explore</div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 min-h-[400px]">
        {capabilities.map((cap, i) => (
          <div 
            key={cap.id}
            className={cn(
              "group relative p-8 md:p-12 border-b md:border-b-0 border-neutral-200 transition-colors duration-500 hover:bg-neutral-900 hover:text-white cursor-crosshair flex flex-col justify-between",
              i < 3 && "md:border-r"
            )}
          >
            {/* Top Row */}
            <div className="flex justify-between items-start mb-12">
              <span className="font-mono text-sm group-hover:text-neutral-400 transition-colors">
                {cap.id}
              </span>
              <Crosshair size={24} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Content */}
            <div>
              <h3 className="font-serif text-3xl md:text-4xl mb-8 leading-none">
                {cap.title.replace(cap.italicTitle, "")}
                <span className="italic font-light block">{cap.italicTitle}</span>
              </h3>
              
              <div className="space-y-4">
                <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 group-hover:text-neutral-400 block mb-2">
                  Tools
                </span>
                <ul className="space-y-1">
                  {cap.tools.map((tool) => (
                    <li key={tool} className="font-serif text-sm leading-relaxed text-neutral-600 group-hover:text-neutral-300">
                      {tool}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
