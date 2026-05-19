import { SectionBar } from '../components/ui/SectionBar';
import { cn } from '../../lib/utils';

const figures = [
  {
    name: 'Kanye West',
    quote: 'I am not a celebrity, I am a creative.',
    descriptor: 'Music · Fashion · Architecture · Total Creative Control',
    variant: 'light' as const,
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    name: 'Virgil Abloh',
    quote: 'Design is not decoration.',
    descriptor: 'Off-White · Louis Vuitton · 3% Rule · Systems Thinking',
    variant: 'dark' as const,
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    name: 'Pharrell Williams',
    quote: 'Creativity is a renewable resource.',
    descriptor: 'Music · Fashion · NERD · Human Race',
    variant: 'light' as const,
    span: 'md:col-span-1 md:row-span-2',
  },
  {
    name: 'Steve Jobs',
    quote: 'Design is not just what it looks like. Design is how it works.',
    descriptor: 'Apple · Simplicity · Obsession · Product',
    variant: 'dark' as const,
    span: 'md:col-span-2 md:row-span-1',
  },
  {
    name: 'James Turrell',
    quote: 'I want to create an experience of a light that seems to come from within.',
    descriptor: 'Light · Space · Perception · Skyspace',
    variant: 'light' as const,
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    name: 'Tom Ford',
    quote: 'Dressing well is a form of good manners.',
    descriptor: 'Gucci · TF Beauty · Cinema · Controlled Obsession',
    variant: 'dark' as const,
    span: 'md:col-span-1 md:row-span-1',
  },
];

export function Inspiration() {
  return (
    <section className="border-b border-neutral-900 bg-white">
      <SectionBar cols={['—', 'Influences & Inspiration', '', 'The people behind the work']} />

      <div className="p-6 md:p-12 bg-[#FAFAFA]">
        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[minmax(160px,auto)] md:auto-rows-[minmax(180px,auto)] gap-3 md:gap-4">
          {figures.map((figure) => (
            <figure
              key={figure.name}
              className={cn(
                'border border-neutral-200 p-5 md:p-8 flex flex-col justify-between',
                'transition-all duration-300 ease-out',
                'hover:border-neutral-400 hover:scale-[1.02]',
                figure.variant === 'dark'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-900',
                'col-span-1 row-span-1',
                figure.span
              )}
            >
              <div>
                <h3 className="font-serif text-2xl md:text-4xl leading-none mb-3 md:mb-4">
                  {figure.name}
                </h3>
                <p
                  className={cn(
                    'font-mono text-[8px] md:text-[9px] uppercase tracking-[0.2em] leading-relaxed',
                    figure.variant === 'dark' ? 'text-neutral-400' : 'text-neutral-500'
                  )}
                >
                  {figure.descriptor}
                </p>
              </div>
              <blockquote
                className={cn(
                  'font-serif italic text-sm md:text-base leading-snug mt-4 md:mt-6',
                  figure.variant === 'dark' ? 'text-neutral-300' : 'text-neutral-600'
                )}
              >
                &ldquo;{figure.quote}&rdquo;
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
