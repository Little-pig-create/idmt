export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'enum'
  | 'image'
  | 'keyvalue';

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  default?: unknown;
  help?: string;
  options?: string[];
}

export interface CollectionSchema {
  label: string;
  icon: string;
  description: string;
  hasBody: boolean;
  fields: Field[];
}

export type CollectionName = 'research' | 'products' | 'labs' | 'news' | 'events' | 'notices';

export interface Entry {
  id: string;
  draft?: boolean;
  _bodyLength?: number;
  _updatedAt?: string;
  [key: string]: unknown;
}

export interface EntryDetail {
  id: string;
  data: Record<string, unknown>;
  body: string;
}

export interface Asset {
  name: string;
  url: string;
  size: number;
  updatedAt: string;
}

export interface Stats {
  counts: Record<string, number>;
  drafts: number;
  assets: number;
  total: number;
  build: { status: string; startedAt: string | null; finishedAt: string | null };
  defaultPassword: boolean;
}

export interface BuildState {
  status: 'idle' | 'running' | 'success' | 'failed';
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  lines: string[];
}
