import { Reveal } from '../components/ui/Reveal';

const SPOTIFY_PLAYLIST_ID = "6nZKJFZT2tZUSzAa5Ursk4";

export function Music() {
  return (
    <section className="bg-white border-b border-neutral-900 pb-24">
      {/* Top Metadata */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200 text-[9px] font-mono uppercase tracking-widest text-neutral-500">
        <span>07.2024</span>
        <span className="text-center">andthedesign</span>
        <span>essence</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-12 py-12 md:py-24">
        {/* Title */}
        <Reveal className="text-center mb-16 md:mb-24">
          <h2 className="font-serif text-8xl md:text-[10rem] leading-none tracking-tighter lowercase">music</h2>
        </Reveal>

        {/* Spotify Playlist Embed */}
        <Reveal className="flex justify-center mb-12">
          <div className="w-full max-w-2xl">
            <iframe
              src={`https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?utm_source=generator&theme=0`}
              width="100%"
              height="380"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="cure - playlist by Shaz on Spotify"
              className="rounded-lg"
            />
          </div>
        </Reveal>

        {/* Description */}
        <div className="text-center max-w-lg mx-auto mb-16">
          <p className="font-serif text-lg leading-relaxed text-neutral-600">
            A few picks from my playlist, some songs I've been listening to lately.    
                              I listen to music while i do anything.
          </p>
        </div>

        {/* Gothic Logo */}
        <div className="flex justify-center mb-16">
          <span className="font-serif text-5xl font-bold">m</span>
        </div>

        {/* Bottom Text */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-neutral-200 text-[10px] font-mono uppercase tracking-wide text-neutral-500">
          <div>
            there are several things that make me up as a designer. that goes from physical materials to many different digital ones as well.
          </div>
          <div className="text-center md:text-left">
            I wanted to share some of my favourite essentials with you- also to disclose my most used typefaces for once and for all ;)
          </div>
          <div className="text-right font-bold text-neutral-900">
            my design essentials
          </div>
        </div>
      </div>
    </section>
  );
}
