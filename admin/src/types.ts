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

/* ------------------------------------------------------------------
   前端粒度管理
   ------------------------------------------------------------------ */

export interface ConfigWarning {
  path: string;
  message: string;
}

export interface RouteConfig {
  state?: 'enabled' | 'hidden' | 'disabled';
  access?: 'public' | 'restricted';
  disabledMessage?: string;
  title?: string;
}

export interface BlockItemConfig {
  enabled?: boolean;
  title?: string;
  description?: string;
}

export interface BlockPageConfig {
  order?: string[];
  items?: Record<string, BlockItemConfig>;
}

export interface ElementConfig {
  enabled?: boolean;
  label?: string;
  ariaLabel?: string;
  href?: string;
  icon?: string;
}

export interface ThemeConfig {
  tokens?: Record<string, string>;
  logoText?: string;
  logoSubtext?: string;
  logoImage?: string;
  footerNote?: string;
}

export interface FrontendConfig {
  version: number;
  updatedAt?: string | null;
  routes: Record<string, RouteConfig>;
  blocks: Record<string, BlockPageConfig>;
  elements: Record<string, Record<string, ElementConfig>>;
  i18n: Record<string, Record<string, string>>;
  theme: ThemeConfig;
  features: Record<string, boolean>;
}

export interface SurfaceRoute {
  path: string;
  label: string;
}

export interface SurfaceBlock {
  id: string;
  label: string;
}

export interface SurfaceElement {
  id: string;
  label: string;
}

export interface Surface {
  routes: SurfaceRoute[];
  blocks: Record<string, SurfaceBlock[]>;
  elements: Record<string, SurfaceElement[]>;
}

export interface SurfaceResponse {
  surface: Surface;
  languages: string[];
  themeTokens: string[];
  featureKeys: string[];
  routeStates: string[];
  routeAccess: string[];
  version: number;
}

export interface ConfigSourceResponse {
  config: FrontendConfig;
  persisted: boolean;
  empty: boolean;
  warnings: ConfigWarning[];
}

export interface ConfigSaveResponse {
  config: FrontendConfig;
  warnings: ConfigWarning[];
  empty: boolean;
  message: string;
}

export interface Capabilities {
  frontendConfig: { canManage: boolean; role: string };
}
