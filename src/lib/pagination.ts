export const PAGE_SIZE = 12;

export interface PageResult<T> {
  items: T[];
  current: number;
  totalPages: number;
}

export function paginateArray<T>(all: T[], page = 1, pageSize = PAGE_SIZE): PageResult<T> {
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = (current - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), current, totalPages };
}
