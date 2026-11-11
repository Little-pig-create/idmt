import { Marquee } from '@/components/ui/marquee';

export default function PartnerMarquee({ items }: { items: string[] }) {
  return (
    <div className="relative [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <Marquee repeat={3} pauseOnHover className="[--duration:38s] [--gap:4rem] py-1">
        {items.map((name) => (
          <span
            key={name}
            className="shrink-0 text-[14px] font-medium whitespace-nowrap text-ink-tertiary transition-colors hover:text-ink"
          >
            {name}
          </span>
        ))}
      </Marquee>
    </div>
  );
}
