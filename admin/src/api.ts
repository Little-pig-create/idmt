const BASE = '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: init?.body && !(init.body instanceof Blob) ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error ?? `请求失败（${response.status}）`);
    (error as Error & { details?: string[] }).details = data?.details;
    throw error;
  }
  return data as T;
}

export const api = {
  me: () => request<{ role: string; defaultPassword: boolean }>('/api/me'),
  login: (password: string) =>
    request<{ role: string; defaultPassword: boolean }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  logout: () => request('/api/logout', { method: 'POST' }),
  schema: () => request<{ collections: Record<string, import('./types').CollectionSchema> }>('/api/schema'),
  stats: () => request<import('./types').Stats>('/api/stats'),
  entries: (collection: string) =>
    request<{ entries: import('./types').Entry[] }>(`/api/entries?collection=${collection}`),
  entry: (collection: string, id: string) =>
    request<{ entry: import('./types').EntryDetail }>(`/api/entries/${collection}/${id}`),
  createEntry: (collection: string, payload: { id?: string; data: unknown; body: string }) =>
    request<{ id: string }>(`/api/entries/${collection}`, { method: 'POST', body: JSON.stringify(payload) }),
  updateEntry: (collection: string, id: string, payload: { data: unknown; body: string }) =>
    request(`/api/entries/${collection}/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEntry: (collection: string, id: string) =>
    request(`/api/entries/${collection}/${id}`, { method: 'DELETE' }),
  assets: () => request<{ assets: import('./types').Asset[] }>('/api/assets'),
  uploadAsset: (file: File) =>
    request<{ asset: import('./types').Asset }>(`/api/assets?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      body: file,
      headers: { 'Content-Type': file.type },
    }),
  deleteAsset: (name: string) => request(`/api/assets/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  settings: () => request<{ settings: Record<string, string> }>('/api/settings'),
  saveSettings: (patch: Record<string, string>) =>
    request<{ settings: Record<string, string> }>('/api/settings', { method: 'PUT', body: JSON.stringify(patch) }),
  build: () => request<{ build: import('./types').BuildState }>('/api/build'),
  startBuild: () => request<{ build: import('./types').BuildState }>('/api/build', { method: 'POST' }),
};
