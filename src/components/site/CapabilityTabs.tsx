import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpRight } from 'lucide-react';

export interface Capability {
  id: string;
  label: string;
  en: string;
  title: string;
  description: string;
  points: string[];
  image: string;
  href: string;
}

export default function CapabilityTabs({ items }: { items: Capability[] }) {
  return (
    <Tabs defaultValue={items[0]?.id} className="gap-8">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-none border-b border-white/10 bg-transparent p-0">
        {items.map((item) => (
          <TabsTrigger
            key={item.id}
            value={item.id}
            className="h-auto flex-none rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-1 text-[14px] font-medium text-white/50 shadow-none data-[state=active]:border-[var(--color-brand-2)] data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            {item.label}
            <span className="ml-2 hidden font-mono text-[9px] tracking-[0.16em] text-white/30 sm:inline">{item.en}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {items.map((item) => (
        <TabsContent key={item.id} value={item.id} className="mt-8 outline-none">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
            <div className="relative overflow-hidden rounded-2xl border border-white/10">
              <img src={item.image} alt="" className="h-[320px] w-full object-cover lg:h-[400px]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-5 font-mono text-[10px] tracking-[0.18em] text-white/60">
                {item.en}
              </div>
            </div>

            <div>
              <h3 className="font-display text-[1.6rem] font-bold tracking-[-0.01em] text-white">{item.title}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-white/60">{item.description}</p>
              <ul className="mt-6 space-y-3">
                {item.points.map((point) => (
                  <li key={point} className="flex gap-3 text-[14px] text-white/75">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[var(--color-brand-2)]" />
                    {point}
                  </li>
                ))}
              </ul>
              <a
                href={item.href}
                className="mt-8 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--color-brand-2)] hover:text-white"
              >
                查看详情 <ArrowUpRight className="size-4" />
              </a>
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
