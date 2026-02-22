import { Reveal } from '../components/ui/Reveal';

export function VirgilVideo() {
  return (
    <section className="border-b border-neutral-900 bg-white">
      {/* Metadata Strip */}
      <div className="grid grid-cols-4 border-b border-neutral-200 text-[9px] font-mono uppercase tracking-widest">
        <div className="p-3 border-r border-neutral-200">—</div>
        <div className="p-3 border-r border-neutral-200">On Design</div>
        <div className="p-3 border-r border-neutral-200"></div>
        <div className="p-3">Virgil Abloh</div>
      </div>

      <div className="p-8 md:p-16">
        <Reveal className="max-w-2xl mx-auto mb-8">
          <p className="font-serif text-lg leading-relaxed text-neutral-600 text-center mb-2">
            Virgil Abloh on the candle, and his perspective on design, intention, and what makes objects meaningful.
          </p>
        </Reveal>

        <div className="flex justify-center">
          <div className="w-full max-w-md aspect-[9/16] bg-neutral-100 overflow-hidden rounded-sm">
            <iframe
              src="https://www.instagram.com/reel/DUlCuLviL7P/embed/"
              title="Virgil Abloh on design and the candle"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 text-center mt-6">
          <a
            href="https://www.instagram.com/reel/DUlCuLviL7P/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-600 transition-colors"
          >
            Watch on Instagram →
          </a>
        </p>
      </div>
    </section>
  );
}
