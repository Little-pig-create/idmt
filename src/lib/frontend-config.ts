/**
 * 前台配置消费端 · 运行时
 *
 * ⚠️ 前后端分离边界
 * 本模块是**前台**的一部分。它只做三件事：
 *   1. 在运行时向后台拉取「动态构建」出的配置；
 *   2. 校验并规范化（非法值一律当未配置）；
 *   3. 提供按粒度读取的取值函数，**每项都带默认回落**。
 *
 * 它**不包含**任何后台逻辑、不 import 后台代码、不依赖后台构建产物。
 * 后台不可达时本模块必须完全静默，前台按默认渲染。
 *
 * 「动态构建」的含义（与本项目既有约定对齐后记录）：
 *   配置不预编译进前台静态产物；后台在每个请求时实时拼装并通过接口下发，
 *   前台在页面加载后运行时获取并应用。属于 runtime config resolution。
 *
 * 契约来源：`shared/frontend-config-contract.mjs`（纯 JS，前后台共用同一份，
 * 避免各写一份导致的漂移）。
 */

import {
  CONFIG_VERSION,
  FEATURE_KEYS,
  LANGUAGES,
  ROUTE_STATES,
  THEME_TOKENS,
  emptyConfig,
  isValidRoutePath,
  normalizeConfig,
} from '../../shared/frontend-config-contract.mjs';
import { u } from './paths';

/* ------------------------------------------------------------------
   默认值 —— 全部属于前台
   ------------------------------------------------------------------
   后台不得内联这些值。未配置 = 用这里的默认，因此**默认值就是现有行为**。
   ------------------------------------------------------------------ */

/** 默认语言。与 <html lang> 一致。 */
export const DEFAULT_LANGUAGE = 'zh-CN';

/**
 * 功能开关默认值。
 * 全部为 true = 保持现有行为。
 */
const FEATURE_DEFAULTS: Record<string, boolean> = {
  carouselAutoplay: true,
  searchEnabled: true,
  adminEntryVisible: true,
};

/**
 * 元素默认值：每个可配置元素的现状。
 * 配置只覆盖显式给出的键，其余取这里。
 */
const ELEMENT_DEFAULTS: Record<string, { enabled: boolean; label?: string; href?: string }> = {
  searchTrigger: { enabled: true, label: '全站搜索', href: '/search' },
  adminEntry: { enabled: true, label: '内容发布后台', href: '/admin' },
  languageSwitch: { enabled: true },
  quickJoin: { enabled: true, label: '研究生招生', href: '/join' },
  quickContact: { enabled: true, label: '联系我们', href: '/contact' },
  joinPrimary: { enabled: true, label: '招生与招聘', href: '/join' },
  joinSecondary: { enabled: true, label: '联系我们', href: '/contact' },
};

/* ------------------------------------------------------------------
   运行时状态
   ------------------------------------------------------------------ */

type Config = ReturnType<typeof emptyConfig>;

let current: Config = emptyConfig();
let loaded = false;
/** 配置到达前挂起的应用回调。页面渲染不阻塞在配置上。 */
const subscribers = new Set<(c: Config) => void>();

/** 当前配置（同步读；未加载完成时返回空配置 = 全默认） */
export function getConfig(): Config {
  return current;
}

/** 配置是否已成功加载 */
export function isConfigLoaded(): boolean {
  return loaded;
}

/** 订阅配置变化（配置到达后触发一次） */
export function onConfigReady(fn: (c: Config) => void): () => void {
  subscribers.add(fn);
  if (loaded) fn(current);
  return () => subscribers.delete(fn);
}

function publish(next: Config) {
  current = next;
  loaded = true;
  for (const fn of subscribers) {
    try {
      fn(next);
    } catch {
      /* 单个订阅者出错不影响其它订阅者，也绝不冒泡到页面 */
    }
  }
}

/**
 * 拉取并应用配置。
 *
 * **永不抛异常、永不阻塞渲染**：
 *   - 网络不通 / 超时 / 非 2xx / JSON 损坏 → 保持空配置（全默认）
 *   - 返回值只用于内部测试与诊断，调用方无需处理失败
 *
 * 超时 3s：配置是增强项，不值得让用户等。
 */
export async function loadConfig(endpoint = u('/api/frontend-config'), timeoutMs = 3000): Promise<Config> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      credentials: 'omit',
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      publish(emptyConfig());
      return current;
    }

    const body = await res.json();
    if (!body || body.ok !== true || typeof body.config !== 'object' || body.config === null) {
      publish(emptyConfig());
      return current;
    }

    const { config } = normalizeConfig(body.config);
    publish(config);
    return current;
  } catch {
    // 接口失败 / 网络不通 / 跨域被拒 / 超时：一律回落默认，不阻塞页面
    publish(emptyConfig());
    return current;
  }
}

/* ------------------------------------------------------------------
   粒度读取器 —— 每一项独立取值、独立回落
   ------------------------------------------------------------------ */

/**
 * 1. 路由级。
 * 返回三态 + 访问级别。任一项缺字段 → 该项取默认（enabled / public）。
 * 未知路由 / 非法值 → 全默认。
 */
export function resolveRoute(path: string): {
  state: 'enabled' | 'hidden' | 'disabled';
  access: 'public' | 'restricted';
  disabledMessage?: string;
  title?: string;
} {
  const fallback = { state: 'enabled' as const, access: 'public' as const };
  if (!isValidRoutePath(path)) return fallback;

  const entry = current.routes?.[path];
  if (!entry || typeof entry !== 'object') return fallback;

  return {
    state: ROUTE_STATES.includes(entry.state as string)
      ? (entry.state as 'enabled' | 'hidden' | 'disabled')
      : 'enabled',
    access: entry.access === 'restricted' ? 'restricted' : 'public',
    ...(typeof entry.disabledMessage === 'string' && entry.disabledMessage
      ? { disabledMessage: entry.disabledMessage }
      : {}),
    ...(typeof entry.title === 'string' && entry.title ? { title: entry.title } : {}),
  };
}

/** 路由是否应在导航中显示（enabled 才显示） */
export function isRouteVisibleInNav(path: string): boolean {
  return resolveRoute(path).state === 'enabled';
}

/** 路由是否可访问（disabled 不可访问；hidden 可直达） */
export function isRouteAccessible(path: string): boolean {
  const r = resolveRoute(path);
  return r.state !== 'disabled' && r.access !== 'restricted';
}

/**
 * 2. 区块级 —— 开关。
 * 未配置 → true（显示）。
 */
export function isBlockEnabled(route: string, blockId: string): boolean {
  const item = current.blocks?.[route]?.items?.[blockId];
  if (!item || typeof item !== 'object') return true;
  return item.enabled !== false; // 缺字段 = 默认显示
}

/**
 * 2. 区块级 —— 文案覆盖。
 * 未配置 → undefined，调用方用自身默认文案。
 */
export function resolveBlockText(
  route: string,
  blockId: string
): { title?: string; description?: string } {
  const item = current.blocks?.[route]?.items?.[blockId];
  if (!item || typeof item !== 'object') return {};
  const out: { title?: string; description?: string } = {};
  if (typeof item.title === 'string' && item.title) out.title = item.title;
  if (typeof item.description === 'string' && item.description) out.description = item.description;
  return out;
}

/**
 * 2. 区块级 —— 顺序。
 *
 * 语义：配置里列出的区块按给定顺序排在前，**未列出的保持原有相对顺序**接在后面。
 * 这样只调两个区块的顺序不会打乱其余区块 —— 满足「互不牵连」。
 *
 * @param defaultOrder 页面原本的区块顺序
 * @returns 重排后的顺序（长度与 defaultOrder 一致）
 */
export function resolveBlockOrder(route: string, defaultOrder: string[]): string[] {
  const configured = current.blocks?.[route]?.order;
  if (!Array.isArray(configured) || configured.length === 0) return defaultOrder;

  const known = new Set(defaultOrder);
  const front = configured.filter((id) => known.has(id));
  if (front.length === 0) return defaultOrder;

  const frontSet = new Set(front);
  return [...front, ...defaultOrder.filter((id) => !frontSet.has(id))];
}

/**
 * 3. 元素级。
 * 逐键回落：只覆盖配置里显式给出的键。
 */
export function resolveElement(
  route: string,
  elementId: string
): { enabled: boolean; label?: string; href?: string; icon?: string; ariaLabel?: string } {
  const base = ELEMENT_DEFAULTS[elementId] ?? { enabled: true };
  // 页面级配置优先于全局（'*'）
  const page = current.elements?.[route]?.[elementId];
  const global = current.elements?.['*']?.[elementId];
  const merged = { ...(global ?? {}), ...(page ?? {}) };

  return {
    enabled: merged.enabled !== undefined ? merged.enabled !== false : base.enabled,
    ...(merged.label ?? base.label ? { label: merged.label ?? base.label } : {}),
    ...(merged.href ?? base.href ? { href: merged.href ?? base.href } : {}),
    ...(merged.icon ? { icon: merged.icon } : {}),
    ...(merged.ariaLabel ? { ariaLabel: merged.ariaLabel } : {}),
  };
}

/**
 * 4. 文案 i18n。
 *
 * 按语言分别查表；查不到 → 返回默认文案（调用方传入）。
 * 改一种语言不影响其他语言 —— 表是按语言分开存的。
 */
export function t(key: string, fallback: string, lang: string = DEFAULT_LANGUAGE): string {
  if (!LANGUAGES.includes(lang)) return fallback;
  const value = current.i18n?.[lang]?.[key];
  return typeof value === 'string' && value !== '' ? value : fallback;
}

/**
 * 5. 主题。
 * 令牌只读白名单内、且为合法 hex 的值。
 */
export function resolveTheme(): {
  tokens: Record<string, string>;
  logoText?: string;
  logoSubtext?: string;
  logoImage?: string;
  footerNote?: string;
} {
  const th = current.theme ?? {};
  const tokens: Record<string, string> = {};
  for (const [k, v] of Object.entries(th.tokens ?? {})) {
    if (THEME_TOKENS.includes(k) && typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v)) {
      tokens[k] = v;
    }
  }
  return {
    tokens,
    ...(th.logoText ? { logoText: th.logoText } : {}),
    ...(th.logoSubtext ? { logoSubtext: th.logoSubtext } : {}),
    ...(th.logoImage ? { logoImage: th.logoImage } : {}),
    ...(th.footerNote ? { footerNote: th.footerNote } : {}),
  };
}

/** 主题令牌 → 内联 CSS 变量（只在有覆盖时输出，空则为空串） */
export function themeTokenCss(): string {
  const { tokens } = resolveTheme();
  const entries = Object.entries(tokens);
  if (entries.length === 0) return '';
  return `:root{${entries.map(([k, v]) => `${k}:${v}`).join(';')}}`;
}

/**
 * 6. 功能开关。
 * 未配置 → 默认（全部 true = 现有行为）。
 */
export function feature(key: string): boolean {
  if (!FEATURE_KEYS.includes(key)) return true;
  const v = current.features?.[key];
  return typeof v === 'boolean' ? v : (FEATURE_DEFAULTS[key] ?? true);
}

/**
 * 供调试：当前配置的版本指纹（页面可挂到 window 便于排查）。
 * 不影响渲染。
 */
export function configSnapshot() {
  return {
    version: current.version ?? CONFIG_VERSION,
    updatedAt: current.updatedAt ?? null,
    loaded,
    empty:
      Object.keys(current.routes).length === 0 &&
      Object.keys(current.blocks).length === 0 &&
      Object.keys(current.elements).length === 0 &&
      Object.keys(current.i18n).length === 0 &&
      Object.keys(current.theme).length === 0 &&
      Object.keys(current.features).length === 0,
  };
}

/** 测试用：直接塞入配置，跳过网络 */
export function __setConfigForTest(config: unknown) {
  const { config: normalized } = normalizeConfig(config);
  publish(normalized);
}

/** 测试用：重置为未加载状态 */
export function __resetForTest() {
  current = emptyConfig();
  loaded = false;
}
