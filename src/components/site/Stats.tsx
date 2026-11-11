import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

interface Stat {
  value: number;
  suffix?: string;
  label: string;
  note?: string;
}

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!inView || reduce) return;
    let frame = 0;
    const start = performance.now();
    const duration = 900;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    setDisplay(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}

export default function Stats({ items, tone = 'dark' }: { items: Stat[]; tone?: 'dark' | 'light' }) {
  const isDark = tone === 'dark';
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={isDark ? 'border-l border-white/15 pl-4' : 'border-l border-line pl-4'}>
          <dd className="flex items-baseline gap-1 font-display text-[2.4rem] font-bold leading-none tracking-[-0.03em]">
            <span className={isDark ? 'text-white' : 'text-ink'}>
              <CountUp value={item.value} />
            </span>
            {item.suffix && (
              <span className={isDark ? 'text-[1rem] font-medium text-white/50' : 'text-[1rem] font-medium text-ink-tertiary'}>
                {item.suffix}
              </span>
            )}
          </dd>
          <dt className={isDark ? 'mt-2 text-[13px] text-white/55' : 'mt-2 text-[13px] text-ink-secondary'}>
            {item.label}
          </dt>
          {item.note && (
            <p className={isDark ? 'mt-1 font-mono text-[10px] tracking-[0.12em] text-white/30' : 'mt-1 font-mono text-[10px] tracking-[0.12em] text-ink-tertiary'}>
              {item.note}
            </p>
          )}
        </div>
      ))}
    </dl>
  );
}
