import type { Asset, CollectionMap, Entry, Stats, ValidationError } from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok || !payload?.ok) {
    const error = new Error(payload?.error ?? `请求失败（HTTP ${res.status}）`);
    (error as Error & { details?: ValidationError[] }).details = payload?.details;
    throw error;
  }

  return payload as T;
}

export const api = {
  schema: () => request<{ collections: CollectionMap }>('/schema'),

  stats: () => request<{ stats: Record<string, Stats> }>('/stats'),

  list: (collection: string) =>
    request<{ entries: Entry[] }>(`/content/${collection}`),

  get: (collection: string, id: string) =>
    request<{ entry: Entry }>(`/content/${collection}/${id}`),

  create: (collection: string, id: string, data: Record<string, unknown>, body: string) =>
    request<{ id: string }>(`/content/${collection}`, {
      method: 'POST',
      body: JSON.stringify({ id, data, body }),
    }),

  update: (collection: string, id: string, data: Record<string, unknown>, body: string) =>
    request<{ id: string }>(`/content/${collection}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data, body }),
    }),

  remove: (collection: string, id: string) =>
    request<{ id: string }>(`/content/${collection}/${id}`, { method: 'DELETE' }),

  build: () =>
    request<{ code: number; output: string }>('/build', { method: 'POST' }),

  assets: {
    list: () => request<{ assets: Asset[] }>('/assets'),
    upload: (name: string, type: string, dataBase64: string) =>
      request<{ asset: Asset }>('/assets', { method: 'POST', body: JSON.stringify({ name, type, dataBase64 }) }),
    remove: (name: string) => request<{ name: string }>(`/assets/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  },
};
