export type FieldType =
  | 'string'
  | 'text'
  | 'date'
  | 'number'
  | 'boolean'
  | 'array'
  | 'enum'
  | 'image';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: FieldOption[];
  default?: unknown;
  min?: number;
  max?: number;
}

export interface CollectionSchema {
  label: string;
  icon: string;
  hasBody: boolean;
  fields: FieldDef[];
}

export type CollectionMap = Record<string, CollectionSchema>;

export interface Entry {
  id: string;
  file: string;
  data: Record<string, unknown>;
  body: string;
  updatedAt: string;
  bytes: number;
  broken?: boolean;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface Stats {
  total: number;
  drafts: number;
  broken: number;
}

export interface Asset {
  name: string;
  url: string;
  size: number;
  mtime: string;
}
