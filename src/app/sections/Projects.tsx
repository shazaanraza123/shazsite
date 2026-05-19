import { SectionBar } from '../components/ui/SectionBar';

const projects = [
  {
    title: 'FinSight',
    type: 'Full Stack Web App',
    year: '2025',
    description:
      'Income/expense tracking, budget planning, and financial report visualizations. React frontend deployed on Netlify, Express API on Render, MySQL backend.',
    tags: ['React', 'Express', 'MySQL', 'Figma'],
  },
  {
    title: 'Resume Builder',
    type: 'Web Application',
    year: '2025',
    description:
      'LaTeX resume generator using the Overleaf CLSI API and Node.js. Dockerized the CLSI service with PDF export and customizable templates.',
    tags: ['Node.js', 'Docker', 'LaTeX', 'API'],
  },
  {
    title: 'Real Estate Price Predictor',
    type: 'Machine Learning',
    year: '2025',
    description:
      'MLP and XGBoost models trained on 25K+ Milwaukee housing records. Achieved R² of 0.72 after feature engineering and outlier handling.',
    tags: ['Python', 'XGBoost', 'scikit-learn', 'pandas'],
  },
  {
    title: 'YZY Mobile App Prototype',
    type: 'Product Design',
    year: '2024',
    description:
      'Frontend UI design and feature planning for the official YZY mobile app. Built interactive prototypes in Swift and Figma to support executive product pitches.',
    tags: ['Swift', 'Figma', 'UI Design', 'Prototyping'],
  },
  {
    title: 'KWL Studio',
    type: 'Brand Identity',
    year: '2023',
    description:
      'End-to-end brand identity, merch design, and e-commerce buildout for a streetwear label. Full creative pipeline from concept to sale on Shopify.',
    tags: ['Figma', 'Illustrator', 'Shopify', 'Brand Design'],
  },
  {
    title: 'Ye Tour Media Campaign',
    type: 'Campaign & Content Strategy',
    year: '2025',
    description:
      "Cross-platform media campaign for Ye's world tour. Coordinated 20–30M+ views per show through content rollout across Instagram, TikTok, X, and Facebook.",
    tags: ['CapCut', 'Premiere', 'Strategy', 'Social'],
  },
];

export function Projects() {
  return (
    <section id="projects" className="border-b border-neutral-900 bg-white">
      <SectionBar cols={['03', 'Selected Projects', 'Full Stack & Design', '2024–2025']} />

      <div className="p-6 md:p-12 border-b border-neutral-200">
        <h2 className="font-serif text-5xl md:text-7xl uppercase leading-none">
          Selected
          <br />
          <span className="italic font-light">Projects</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-4 md:gap-6 p-6 md:p-12">
        {projects.map((project) => (
          <article
            key={project.title}
            className="group flex flex-col h-full p-6 bg-white border border-[#E5E5E5] transition-colors duration-300 hover:border-neutral-900"
          >
            <div className="flex justify-between items-start mb-6">
              <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500">
                {project.type}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">
                {project.year}
              </span>
            </div>

            <h3 className="font-serif text-2xl md:text-3xl mb-4 leading-tight">{project.title}</h3>

            <p className="font-serif text-sm leading-relaxed text-neutral-600 flex-1 mb-6">
              {project.description}
            </p>

            <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-500 mb-6">
              {project.tags.join(' · ')}
            </p>

            <span className="mt-auto font-mono text-[9px] uppercase tracking-widest text-neutral-400 transition-colors duration-300 group-hover:text-neutral-900">
              View Project →
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
