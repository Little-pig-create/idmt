/**
 * 前台配置应用器 · 浏览器运行时
 *
 * 职责：把运行时拉到的配置**应用**到已渲染的 DOM 上。
 *
 * 设计要点（全部为了「配置坏了也不能白屏」）：
 *   1. **不阻塞首屏**：默认内容先正常渲染，配置到达后才做增删改。
 *   2. 配置未到达 / 接口失败 → 什么都不做，页面就是默认样子。
 *   3. 每一步都单独 try/catch，单点失败不影响其余步骤。
 *   4. 一律通过 `data-cfg*` 属性定位作用点，不在脚本里猜 DOM 结构。
 *
 * 与 View Transitions 的关系：换页后 <body> 被替换，必须重新应用
 * —— 挂在 `astro:page-load` 上（与项目既有约定一致）。
 */

import {
  feature,
  isBlockEnabled,
  isRouteAccessible,
  isRouteVisibleInNav,
  loadConfig,
  onConfigReady,
  resolveBlockText,
  resolveElement,
  resolveRoute,
  resolveTheme,
  themeTokenCss,
} from '../lib/frontend-config';

/** 隐藏节点。用 hidden 而非 remove —— 保留回滚与调试余地。 */
function hide(el: Element | null | undefined): void {
  if (el instanceof HTMLElement) el.hidden = true;
}

/** 只改元素内的第一个非空文本节点，避免破坏内部 SVG/图标 */
function setLabel(el: HTMLElement, value: string): void {
  const node = Array.from(el.childNodes).find(
    (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== ''
  );
  if (node) node.textContent = value;
  else el.textContent = value;
}

/**
 * 当前页路由（去掉尾部斜杠与部署前缀，与配置键的写法一致）。
 * 配置键是根绝对路径（`/about`），项目站部署在 `/idmt/` 下时
 * `location.pathname` 带前缀，不归一会所有按路由的配置静默失效。
 */
function currentRoute(): string {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');
  let p = window.location.pathname.replace(/\/+$/, '');
  if (base && p.startsWith(base)) p = p.slice(base.length);
  return p === '' ? '/' : p;
}

/* ------------------------------------------------------------------
   5. 主题与样式
   ------------------------------------------------------------------ */
function applyTheme(): void {
  const css = themeTokenCss();
  if (css) {
    let style = document.getElementById('dmi-theme-override');
    if (!style) {
      style = document.createElement('style');
      style.id = 'dmi-theme-override';
      document.head.appendChild(style);
    }
    style.textContent = css;
  }

  const theme = resolveTheme();
  if (theme.logoText) {
    const el = document.querySelector<HTMLElement>('[data-cfg="logo-text"]');
    if (el) el.textContent = theme.logoText;
  }
  if (theme.logoSubtext) {
    const el = document.querySelector<HTMLElement>('[data-cfg="logo-subtext"]');
    if (el) el.textContent = theme.logoSubtext;
  }
  if (theme.logoImage) {
    const el = document.querySelector<HTMLImageElement>('[data-cfg="logo-image"]');
    if (el) el.src = theme.logoImage;
  }
  if (theme.footerNote) {
    const el = document.querySelector<HTMLElement>('[data-cfg="footer-note"]');
    if (el) el.textContent = theme.footerNote;
  }
}

/* ------------------------------------------------------------------
   1. 路由级 —— 导航可见性
   ------------------------------------------------------------------ */
function applyNav(): void {
  document.querySelectorAll<HTMLElement>('[data-cfg-nav]').forEach((el) => {
    const path = el.dataset.cfgNav;
    if (!path || !path.startsWith('/')) return; // 外链不处理
    if (!isRouteVisibleInNav(path)) hide(el);
  });

  // Mega Menu / 移动抽屉内的条目
  document.querySelectorAll<HTMLElement>('[data-cfg-nav-item]').forEach((el) => {
    const path = el.dataset.cfgNavItem;
    if (!path || !path.startsWith('/')) return;
    if (!isRouteVisibleInNav(path)) hide(el);
  });
}

/* ------------------------------------------------------------------
   3. 元素级 —— 开关 / 文案 / 跳转
   ------------------------------------------------------------------ */
function applyElements(): void {
  const route = currentRoute();
  document.querySelectorAll<HTMLElement>('[data-cfg-el]').forEach((el) => {
    const id = el.dataset.cfgEl;
    if (!id) return;
    // 元素可以被限定在某个页面；缺省则用当前页
    const scope = el.dataset.cfgRoute ?? route;
    const cfg = resolveElement(scope, id);

    if (!cfg.enabled) {
      hide(el);
      return;
    }
    if (cfg.label) {
      const labelHost = el.querySelector<HTMLElement>('[data-cfg-label]') ?? el;
      setLabel(labelHost, cfg.label);
    }
    if (cfg.href && el instanceof HTMLAnchorElement) el.href = cfg.href;
    if (cfg.ariaLabel) el.setAttribute('aria-label', cfg.ariaLabel);
  });
}

/* ------------------------------------------------------------------
   2. 区块级 —— 开关 + 文案
   ------------------------------------------------------------------ */
function applyBlocks(): void {
  const route = currentRoute();
  document.querySelectorAll<HTMLElement>('[data-cfg-block]').forEach((el) => {
    const id = el.dataset.cfgBlock;
    if (!id) return;
    const scope = el.dataset.cfgRoute ?? route;

    if (!isBlockEnabled(scope, id)) {
      hide(el);
      return; // 已隐藏，无需再处理文案
    }

    // 文案覆盖：标题与说明各自独立，未配置则保留服务端渲染的默认文案
    const text = resolveBlockText(scope, id);
    if (text.title) {
      const titleEl = el.querySelector<HTMLElement>('.section-bar-title');
      // 标题带主色竖线伪元素（::before），只替换文本节点以保留它
      if (titleEl) setLabel(titleEl, text.title);
    }
    if (text.description) {
      const descEl = el.querySelector<HTMLElement>('.section-note');
      if (descEl) descEl.textContent = text.description;
    }
  });
}

/* ------------------------------------------------------------------
   6. 功能开关
   ------------------------------------------------------------------ */
function applyFeatures(): void {
  // 轮播自动播放：交给 Carousel 自身读取标记，避免这里重复实现计时逻辑
  const carousel = document.querySelector<HTMLElement>('[data-carousel]');
  if (carousel) carousel.dataset.cfgAutoplay = feature('carouselAutoplay') ? 'on' : 'off';

  if (!feature('searchEnabled')) {
    hide(document.querySelector('[data-cfg="search-form"]'));
    hide(document.querySelector('[data-cfg="search-toggle"]'));
    hide(document.querySelector('[data-cfg-el="searchTrigger"]'));
  }

  if (!feature('adminEntryVisible')) {
    hide(document.querySelector('[data-cfg-el="adminEntry"]'));
  }
}

/* ------------------------------------------------------------------
   路由级 —— 不可用提示（禁用 / 需权限）
   保留页头页脚与页面骨架，只替换 <main> 内容
   ------------------------------------------------------------------ */
function applyRouteGate(): void {
  const route = currentRoute();
  if (isRouteAccessible(route)) return;

  const cfg = resolveRoute(route);
  const restricted = cfg.access === 'restricted';

  const banner = document.createElement('div');
  banner.className = 'route-unavailable';
  banner.setAttribute('role', 'alert');

  const inner = document.createElement('div');
  inner.className = 'route-unavailable__inner';

  const title = document.createElement('p');
  title.className = 'route-unavailable__title';
  title.textContent = restricted ? '此页面需要权限' : '此页面当前不可用';

  const desc = document.createElement('p');
  desc.className = 'route-unavailable__desc';
  desc.textContent =
    cfg.disabledMessage ||
    (restricted
      ? '你当前的身份无权访问该页面。如需访问，请联系院务办公室。'
      : '该页面已下线或暂未开放。可以返回首页，或通过全站搜索查找其他内容。');

  const actions = document.createElement('p');
  actions.className = 'route-unavailable__actions';
  for (const [label, href, cls] of [
    ['返回首页', '/', 'btn btn-primary'],
    ['全站搜索', '/search', 'btn btn-secondary'],
  ] as const) {
    const a = document.createElement('a');
    a.href = href;
    a.className = cls;
    a.textContent = label;
    actions.appendChild(a);
  }

  inner.append(title, desc, actions);
  banner.appendChild(inner);

  const main = document.getElementById('main');
  // 只替换主内容：页头/页脚与站点骨架保留，用户仍有退路
  if (main) main.replaceChildren(banner);
}

/* ------------------------------------------------------------------
   编排
   ------------------------------------------------------------------ */
const STEPS: [string, () => void][] = [
  ['theme', applyTheme],
  ['nav', applyNav],
  ['elements', applyElements],
  ['blocks', applyBlocks],
  ['features', applyFeatures],
  ['routeGate', applyRouteGate],
];

function applyAll(): void {
  for (const [name, fn] of STEPS) {
    try {
      fn();
    } catch (err) {
      // 单步失败不影响其余步骤，也绝不向页面抛错
      if (import.meta.env?.DEV) console.warn(`[frontend-config] ${name} 应用失败`, err);
    }
  }
}

let booted = false;

function boot(): void {
  if (!booted) {
    booted = true;
    // 首次：拉取配置（不 await，失败/超时都不阻塞页面），到达后应用
    void loadConfig().finally(applyAll);
    return;
  }
  // 换页：配置已在内存，直接重新应用
  applyAll();
}

document.addEventListener('astro:page-load', boot);
if (document.readyState !== 'loading') boot();
else document.addEventListener('DOMContentLoaded', boot);

// 订阅一次，保证 loadConfig 的 publish 之后一定有应用（幂等）
onConfigReady(() => applyAll());
