import { Reveal } from '../components/ui/Reveal';
import { SectionBar } from '../components/ui/SectionBar';

const SPOTIFY_PLAYLIST_ID = '6nZKJFZT2tZUSzAa5Ursk4';

export function Music() {
  return (
    <section className="bg-white border-b border-neutral-900">
      <SectionBar cols={['—', 'Now Playing', '', "What's in the rotation"]} />

      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] min-h-[420px]">
        <div className="p-8 md:p-16 lg:p-24 border-b md:border-b-0 md:border-r border-neutral-200 flex flex-col justify-center">
          <Reveal>
            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl uppercase leading-none tracking-tight mb-8">
              Music is
              <br />
              how I
              <br />
              think.
            </h2>
            <p className="font-serif text-base md:text-lg leading-relaxed text-neutral-600 max-w-sm">
              A few picks from my current rotation. I listen while I design, build, and everything
              in between.
            </p>
          </Reveal>
        </div>

        <div className="p-8 md:p-12 lg:p-16 flex items-center">
          <Reveal className="w-full">
            <iframe
              src={`https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?utm_source=generator&theme=0`}
              width="100%"
              height="380"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="cure - playlist by Shaz on Spotify"
              className="rounded-sm"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
