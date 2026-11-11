import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export interface GalleryItem {
  slug: string;
  href: string;
  title: string;
  category: string;
  summary: string;
  image: string;
  tags: string[];
}

export default function ProductGallery({ items }: { items: GalleryItem[] }) {
  const categories = useMemo(() => ['全部', ...Array.from(new Set(items.map((i) => i.category)))], [items]);
  const [active, setActive] = useState('全部');
  const visible = active === '全部' ? items : items.filter((i) => i.category === active);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActive(category)}
            className={cn(
              'h-9 rounded-full border px-4 text-[13px] font-medium transition-colors',
              active === category
                ? 'border-transparent bg-ink text-white'
                : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink',
            )}
            aria-pressed={active === category}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <a
            key={item.slug}
            href={item.href}
            className="group card-lift flex flex-col overflow-hidden rounded-2xl border border-line bg-surface"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                loading="lazy"
              />
              <span className="absolute left-3.5 top-3.5 rounded-full bg-black/45 px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-white/85 backdrop-blur">
                {item.category}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h2 className="font-display text-[1.1rem] font-semibold text-ink group-hover:text-brand">{item.title}</h2>
              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-secondary">{item.summary}</p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                {item.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded border border-line px-2 py-0.5 font-mono text-[10px] text-ink-tertiary">{tag}</span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>

      {visible.length === 0 && <p className="mt-10 text-center text-[14px] text-ink-tertiary">该分类下暂无产品。</p>}
    </div>
  );
}
