import { Reveal } from '../components/ui/Reveal';
import { Crosshair } from '../components/ui/Crosshair';
import { SectionBar } from '../components/ui/SectionBar';

const experiences = [
  {
    id: '01',
    role: 'Tour Media Coordinator',
    company: 'Yeezy',
    period: 'Jan 2025 – Present',
    bullets: [
      "Coordinate with photographers, videographers, and fan pages across Instagram, TikTok, X, and Facebook to maximize reach and visibility for Ye's world tour.",
      'Independently produced hype and teaser video edits and promotional graphics using CapCut and Premiere to build anticipation ahead of shows.',
      'Develop and execute pre-show marketing strategies to drive ticket sales, including content rollout planning and platform-specific promotion.',
      'Generated 20–30M+ views per show through coordinated cross-platform media campaigns.',
    ],
  },
  {
    id: '02',
    role: 'YZY App Developer & Marketing/Media Lead',
    company: 'Yeezy',
    period: 'Dec 2023 – Jun 2024',
    bullets: [
      "Led frontend UI design and feature planning for the YZY mobile app prototype, ensuring aesthetic alignment with Yeezy's brand language.",
      'Built interactive design prototypes using Swift and frontend frameworks to support executive product pitches.',
      'Directed influencer outreach strategy and produced viral campaign content for the Vultures album launch.',
      'Designed marketing banners, social assets, and full campaign plans in collaboration with media teams.',
    ],
  },
  {
    id: '03',
    role: 'Visual Brand Designer & Content Strategist',
    company: 'Self-Employed',
    period: 'Oct 2022 – Present',
    bullets: [
      'Developed visual brand identity and content systems for 20+ brands including LA Apparel and Yeezy across platforms with 3M+ combined followers.',
      'Designed and launched custom merch lines, apparel, home decor, and accessories using Figma, Illustrator, and Photoshop, managing full creative pipeline from concept to sale.',
      'Crafted trend-driven short-form video content using CapCut and Premiere; applied data-driven editing strategies to consistently achieve viral reach.',
    ],
  },
  {
    id: '04',
    role: 'Web Developer',
    company: 'Azerty Studio',
    period: 'Jun 2024 – Aug 2024',
    bullets: [
      'Built and maintained scalable web platforms using Node.js, Express, and MySQL for creative and e-commerce clients.',
      'Collaborated with designers to deliver visually engaging, mobile-responsive frontend experiences.',
    ],
  },
];

export function Work() {
  return (
    <section id="work" className="border-b border-neutral-900 bg-white">
      <SectionBar cols={['02', 'Work Experience', '', 'Design, dev & strategy']} />

      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-neutral-200">
        <div className="p-8 md:p-24 border-b md:border-b-0 md:border-r border-neutral-200 flex items-center">
          <Reveal>
            <h2 className="font-serif text-6xl md:text-8xl uppercase leading-none">
              Work
              <br />
              <span className="italic font-light">Experience</span>
            </h2>
          </Reveal>
        </div>
        <div className="p-8 md:p-24 flex flex-col justify-between">
          <div className="self-end">
            <Crosshair size={32} />
          </div>
          <div className="max-w-xs mt-12">
            <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block mb-2">
              Roles
            </span>
            <p className="font-serif text-lg leading-snug">
              Brand design, product development, and full-stack engineering across agencies and
              in-house teams.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full">
        {experiences.map((exp) => (
          <div
            key={exp.id}
            className="group border-b border-neutral-200 hover:bg-stone-50 transition-colors duration-300"
          >
            <div className="grid grid-cols-1 md:grid-cols-[80px_1fr]">
              <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-neutral-200 font-mono text-sm text-neutral-400 group-hover:text-neutral-900 transition-colors">
                {exp.id}
              </div>
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-baseline md:gap-3 mb-4">
                  <h3 className="font-serif text-2xl md:text-3xl">{exp.role}</h3>
                  <span className="font-mono text-xs text-neutral-500">
                    {exp.company} · {exp.period}
                  </span>
                </div>
                <ul className="space-y-2">
                  {exp.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="font-serif text-base leading-relaxed text-neutral-600 flex gap-2"
                    >
                      <span className="text-neutral-400 mt-1.5">·</span>
                      <span>{bullet}</span>
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
