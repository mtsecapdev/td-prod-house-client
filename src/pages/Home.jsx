import { Link } from 'react-router-dom';
import { FileSliders, FileText, Image, LayoutGrid } from 'lucide-react';

const types = [
  { type: 'deck', label: 'Slide deck', desc: 'Training presentations from your source material', icon: FileSliders, to: '/create/deck' },
  { type: 'doc', label: 'Training document', desc: 'Structured documents for print or digital', icon: FileText, disabled: true },
  { type: 'image', label: 'Image', desc: 'AI-generated images from a text prompt', icon: Image, disabled: true },
  { type: 'infographic', label: 'Infographic', desc: 'Process, comparison, stats and timeline visuals', icon: LayoutGrid, disabled: true },
];

export default function Home() {
  return (
    <main className="max-w-[820px] mx-auto px-8 py-6 flex flex-col gap-6">
      <h1 className="font-heading text-[32px] leading-10 font-bold tracking-tight m-0">
        What would you like to create?
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {types.map((t) => {
          const Icon = t.icon;
          if (t.disabled) {
            return (
              <div key={t.type} className="card p-6 flex gap-4 items-start opacity-50 cursor-not-allowed">
                <Icon size={24} className="text-slate mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-[15px]">{t.label}</p>
                  <p className="text-sm text-slate mt-1">{t.desc}</p>
                  <p className="text-xs text-slate mt-2">Coming soon</p>
                </div>
              </div>
            );
          }
          return (
            <Link key={t.type} to={t.to} className="card p-6 flex gap-4 items-start no-underline text-ink hover:shadow-raised transition-shadow">
              <Icon size={24} className="text-navy mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-[15px]">{t.label}</p>
                <p className="text-sm text-slate mt-1">{t.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
