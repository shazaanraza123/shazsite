import { Nav } from '../sections/Nav';
import { Hero } from '../sections/Hero';
import { About } from '../sections/About';
import { Work } from '../sections/Work';
import { Capabilities } from '../sections/Capabilities';
import { Statement } from '../sections/Statement';
import { VirgilVideo } from '../sections/VirgilVideo';
import { Contact } from '../sections/Contact';
import { Music } from '../sections/Music';
import { Footer } from '../sections/Footer';

export function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 selection:bg-neutral-900 selection:text-white font-serif text-neutral-900">
      <div className="max-w-[1920px] mx-auto bg-white shadow-2xl overflow-hidden border-x border-neutral-200">
        <Nav />
        <main>
          <Hero />
          <About />
          <Work />
          <Capabilities />
          <Statement />
          <VirgilVideo />
          <Contact />
          <Music />
        </main>
        <Footer />
      </div>
    </div>
  );
}
