import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export interface ProductCard {
  slug: string;
  href: string;
  title: string;
  category: string;
  summary: string;
  image: string;
  spec?: { label: string; value: string };
}

export default function ProductCarousel({ items }: { items: ProductCard[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ align: 'start', loop: false, dragFree: true });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on('select', onSelect).on('reInit', onSelect);
  }, [embla, onSelect]);

  return (
    <div>
      <div className="flex items-center justify-end gap-2 pb-6">
        <button
          type="button"
          onClick={() => embla?.scrollPrev()}
          disabled={!canPrev}
          aria-label="上一张"
          className="grid size-10 place-items-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-white/40 hover:text-white disabled:opacity-30"
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => embla?.scrollNext()}
          disabled={!canNext}
          aria-label="下一张"
          className="grid size-10 place-items-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-white/40 hover:text-white disabled:opacity-30"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>

      <div ref={emblaRef} className="overflow-hidden">
        <div className="-ml-5 flex touch-pan-y">
          {items.map((item) => (
            <article key={item.slug} className="min-w-0 shrink-0 grow-0 basis-[86%] pl-5 sm:basis-[52%] lg:basis-[38%]">
              <a
                href={item.href}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-night-2">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                  <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-white/80 backdrop-blur">
                    {item.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-[1.15rem] font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-white/55">{item.summary}</p>
                  {item.spec && (
                    <p className="mt-5 flex items-baseline gap-2 border-t border-white/10 pt-4">
                      <span className="font-mono text-[10px] tracking-[0.12em] text-white/35">{item.spec.label}</span>
                      <span className="text-[13px] font-medium text-[var(--color-brand-2)]">{item.spec.value}</span>
                    </p>
                  )}
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
