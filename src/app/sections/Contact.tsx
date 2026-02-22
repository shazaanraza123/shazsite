import { Reveal } from '../components/ui/Reveal';
import { Crosshair } from '../components/ui/Crosshair';

const contacts = [
  { name: "Email", handle: "shazaanraza123@gmail.com", href: "mailto:shazaanraza123@gmail.com" },
  { name: "LinkedIn", handle: "/in/Muhammedraza8", href: "https://linkedin.com/in/Muhammedraza8" },
  { name: "GitHub", handle: "shazaanraza123", href: "https://github.com/shazaanraza123" },
  { name: "Portfolio", handle: "shazmainweb.netlify.app", href: "https://shazmainweb.netlify.app" },
];

export function Contact() {
  return (
    <section id="contact" className="border-b border-neutral-900 bg-white">
      {/* Metadata Strip */}
      <div className="grid grid-cols-4 border-b border-neutral-200 text-[9px] font-mono uppercase tracking-widest">
        <div className="p-3 border-r border-neutral-200">04</div>
        <div className="p-3 border-r border-neutral-200">Contact</div>
        <div className="p-3 border-r border-neutral-200"></div>
        <div className="p-3">Open to opportunities</div>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left: Headline & Info */}
        <div className="p-12 md:p-24 border-b md:border-b-0 md:border-r border-neutral-200 flex flex-col justify-between min-h-[500px]">
          <div>
            <Reveal>
              <h2 className="font-serif text-6xl md:text-8xl uppercase leading-none tracking-tight mb-8">
                Let's<br />
                <span className="italic font-light lowercase">work</span><br />
                together.
              </h2>
            </Reveal>
            <p className="font-serif text-lg leading-relaxed max-w-sm">
              Open to product design roles, frontend positions, and select freelance projects. I respond to every message.
            </p>
          </div>
          <div className="self-start mt-12">
            <Crosshair size={32} />
          </div>
        </div>

        {/* Right: Links */}
        <div className="flex flex-col border-l-0 md:border-l border-neutral-200">
          {contacts.map((contact) => (
            <a 
              key={contact.name}
              href={contact.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-1 flex items-center justify-between p-8 md:p-12 border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50 transition-colors"
            >
              <span className="font-serif text-2xl md:text-4xl group-hover:underline decoration-1 underline-offset-4 decoration-neutral-400">
                {contact.name}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 group-hover:text-neutral-900 transition-colors">
                {contact.handle}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
