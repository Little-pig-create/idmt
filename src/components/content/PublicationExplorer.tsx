import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { publicationTypeLabels } from '../../data/site';

export interface PublicationRecord {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  year: number;
  type: string;
  doi?: string;
  pdf?: string;
  tags: string[];
  featured?: boolean;
}

interface Props {
  items: PublicationRecord[];
  /** 每页条数，0 表示不分页 */
  pageSize?: number;
}

type Filters = { type: string; year: string; tag: string };

const EMPTY: Filters = { type: '', year: '', tag: '' };

function readFiltersFromUrl(): Filters {
  const p = new URLSearchParams(window.location.search);
  return {
    type: p.get('type') ?? '',
    year: p.get('year') ?? '',
    tag: p.get('tag') ?? '',
  };
}

function writeFiltersToUrl(f: Filters) {
  const p = new URLSearchParams();
  if (f.type) p.set('type', f.type);
  if (f.year) p.set('year', f.year);
  if (f.tag) p.set('tag', f.tag);
  const qs = p.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

export default function PublicationExplorer({ items, pageSize = 20 }: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [visible, setVisible] = useState(pageSize > 0 ? pageSize : Number.MAX_SAFE_INTEGER);
  const [isPending, startTransition] = useTransition();
  const hydrated = useRef(false);

  // 首次挂载：从 URL 还原筛选条件（可分享链接）
  useEffect(() => {
    const fromUrl = readFiltersFromUrl();
    if (fromUrl.type || fromUrl.year || fromUrl.tag) {
      setFilters(fromUrl);
    }
    hydrated.current = true;
  }, []);

  const years = useMemo(
    () => [...new Set(items.map((i) => i.year))].sort((a, b) => b - a),
    [items]
  );

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const t of item.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [items]);

  const types = useMemo(() => {
    const present = new Set(items.map((i) => i.type));
    return ['journal', 'conference', 'book', 'patent', 'report'].filter((t) => present.has(t));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filters.type && item.type !== filters.type) return false;
      if (filters.year && String(item.year) !== filters.year) return false;
      if (filters.tag && !item.tags.includes(filters.tag)) return false;
      return true;
    });
  }, [items, filters]);

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  const apply = useCallback((next: Filters) => {
    startTransition(() => {
      setFilters(next);
      setVisible(pageSize > 0 ? pageSize : Number.MAX_SAFE_INTEGER);
    });
    writeFiltersToUrl(next);
  }, [pageSize]);

  const toggle = useCallback(
    (key: keyof Filters, value: string) => {
      apply({ ...filters, [key]: filters[key] === value ? '' : value });
    },
    [apply, filters]
  );

  const hasFilters = Boolean(filters.type || filters.year || filters.tag);

  return (
    <div>
      {/* ---------- 筛选栏 ---------- */}
      <div className="sticky top-[var(--nav-h)] z-30 -mx-4 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div
            role="group"
            aria-label="按成果类型筛选"
            className="flex flex-wrap items-center gap-1"
          >
            <button
              type="button"
              onClick={() => apply({ ...filters, type: '' })}
              aria-pressed={filters.type === ''}
              className={[
                'min-h-9 rounded-sm px-3 text-ui transition-colors duration-150',
                filters.type === ''
                  ? 'bg-accent text-ink-invert'
                  : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink',
              ].join(' ')}
            >
              全部
            </button>
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggle('type', t)}
                aria-pressed={filters.type === t}
                className={[
                  'min-h-9 rounded-sm px-3 text-ui transition-colors duration-150',
                  filters.type === t
                    ? 'bg-accent text-ink-invert'
                    : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink',
                ].join(' ')}
              >
                {publicationTypeLabels[t] ?? t}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-ui text-ink-secondary">
            <span className="sr-only sm:not-sr-only">年份</span>
            <select
              value={filters.year}
              onChange={(e) => apply({ ...filters, year: e.target.value })}
              aria-label="按年份筛选"
              className="numeric min-h-9 rounded-sm border border-line-strong bg-surface px-2 text-ui text-ink outline-none focus:border-accent"
            >
              <option value="">全部年份</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <p className="numeric ml-auto text-meta text-ink-tertiary" aria-live="polite">
            {isPending ? '筛选中…' : `${filtered.length} 条`}
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={() => apply(EMPTY)}
              className="min-h-9 rounded-sm px-3 text-ui text-accent transition-colors duration-150 hover:bg-accent-soft"
            >
              清除筛选
            </button>
          )}
        </div>

        {tags.length > 0 && (
          <div role="group" aria-label="按标签筛选" className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 10).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggle('tag', t)}
                aria-pressed={filters.tag === t}
                className={[
                  'rounded-sm px-2 py-0.5 text-meta transition-colors duration-150',
                  filters.tag === t
                    ? 'bg-accent text-ink-invert'
                    : 'bg-accent-soft text-accent-ink hover:bg-accent hover:text-ink-invert',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- 结果 ---------- */}
      {filtered.length === 0 ? (
        <div className="mt-10 rounded-md border border-line bg-surface px-6 py-14 text-center">
          <p className="text-[1.0625rem] font-medium text-ink">当前条件下没有匹配的成果</p>
          <p className="mt-2 text-ui text-ink-secondary">
            可能是筛选条件过窄，试试放宽年份或类型。
          </p>
          <button type="button" onClick={() => apply(EMPTY)} className="btn btn-secondary mt-6">
            清除筛选
          </button>
        </div>
      ) : (
        <>
          <div className="mt-2">
            {shown.map((item) => (
              <article
                key={item.id}
                className="group border-b border-line py-5 transition-colors duration-150"
              >
                <p className="text-ui text-ink-secondary">
                  {item.authors.map((author, i) => (
                    <span key={author + i}>
                      {i > 0 && <span className="text-ink-tertiary">, </span>}
                      <span className="text-ink">{author}</span>
                    </span>
                  ))}
                </p>

                <h3 className="mt-1.5 text-[1.0625rem] font-normal leading-snug">
                  <a href={`/publications/${item.id}`} className="link-title">{item.title}</a>
                </h3>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="text-ui text-ink-secondary">
                    <span className="italic">{item.venue}</span>
                    <span className="numeric">, {item.year}</span>
                  </p>

                  <span className="tag tag-quiet">{publicationTypeLabels[item.type] ?? item.type}</span>
                  {item.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                  {item.featured && <span className="tag">精选</span>}

                  <span className="flex items-center gap-2 sm:opacity-0 sm:transition-opacity sm:duration-150 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    {item.pdf && (
                      <a
                        href={item.pdf}
                        className="numeric inline-flex min-h-8 items-center rounded-sm border border-line-strong px-2 text-[0.6875rem] text-ink-secondary transition-colors duration-150 hover:border-accent hover:text-accent"
                      >
                        PDF
                      </a>
                    )}
                    {item.doi && (
                      <a
                        href={item.doi.startsWith('http') ? item.doi : `https://doi.org/${item.doi}`}
                        rel="noopener"
                        className="numeric inline-flex min-h-8 items-center rounded-sm border border-line-strong px-2 text-[0.6875rem] text-ink-secondary transition-colors duration-150 hover:border-accent hover:text-accent"
                      >
                        DOI
                      </a>
                    )}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {pageSize > 0 && visible < filtered.length && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + pageSize)}
                className="btn btn-secondary"
              >
                加载更多（剩余 {filtered.length - visible} 条）
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
