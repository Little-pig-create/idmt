/**
 * 前端粒度管理 · 配置契约（前后端共享的唯一真源）
 *
 * 这个文件定义「什么是可配置的」以及「配置长什么样」。
 * 它必须能被三种运行环境消费：
 *   1. admin/server.mjs      —— 纯 Node，用于校验与动态构建下发
 *   2. admin/src/**          —— 后台编辑界面（Vite + React）
 *   3. 前台配置消费端         —— 浏览器运行时
 *
 * 因此这里**只用纯 JS（无依赖、无 TS 语法、无 Node API）**，
 * 通过 JSDoc 提供类型。这样三边都能直接 import，不需要各自的副本
 * —— 副本就是漂移的来源。
 *
 * ⚠️ 前后端分离边界：本文件是**契约**，不是实现。
 * 它只描述 key 与形状，不包含任何具体站点的默认值。
 * 默认值属于前台（见 src/lib/frontend-config.ts），后台不得内联前台默认值。
 */

/** 配置文档的当前版本。结构不兼容变更时才递增。 */
export const CONFIG_VERSION = 1;

/** 配置文件落盘位置（相对仓库根）—— 后台唯一写入点 */
export const CONFIG_RELATIVE_PATH = 'src/data/site-config.json';

/**
 * 路由三态。
 * - enabled：导航显示，可直接访问（默认）
 * - hidden ：导航**不显示**，但直接输入地址**可访问**
 * - disabled：导航不显示，直接访问给出不可用提示
 *
 * 注：需求中「若本意是不可访问，则与禁用共用同一分支」——
 * 共用的是**渲染分支**（同一套不可用提示），但状态值仍分开保存，
 * 因为二者的**导航可见性**相同、**可访问性**不同，合并会丢失信息。
 */
export const ROUTE_STATES = ['enabled', 'hidden', 'disabled'];

/** 需要权限才可访问的路由（路由级第四态，与三态正交） */
export const ROUTE_ACCESS = ['public', 'restricted'];

/**
 * 可配置的语言码。
 * 前台当前只有 zh-CN；en 为预留（英文版建设中）。
 * 未在此列出的语言码一律视为非法并忽略。
 */
export const LANGUAGES = ['zh-CN', 'en'];

/**
 * 主题可覆盖的令牌白名单。
 * 只允许覆盖**已存在的设计令牌**，不允许新增任意 CSS 变量
 * —— 否则配置就成了注入 CSS 的后门。
 */
export const THEME_TOKENS = [
  '--color-accent',
  '--color-masthead',
  '--color-canvas',
  '--color-surface',
];

/**
 * 功能开关白名单。键必须与前台 feature() 的调用点一致。
 * 新增开关时：先在这里登记，再在前台接线，最后在后台界面出现。
 */
export const FEATURE_KEYS = [
  'carouselAutoplay',
  'searchEnabled',
  'adminEntryVisible',
];

/* ------------------------------------------------------------------
   运行时校验 + 规范化
   ------------------------------------------------------------------ */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string';
const isBool = (v) => typeof v === 'boolean';

/** 丢弃 undefined / null / 空字符串 的对象键，避免写出噪音 */
function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === undefined || v === null) continue;
    if (isStr(v) && v.trim() === '') continue;
    out[k] = v;
  }
  return out;
}

/**
 * 全局作用域：元素级配置写在这个作用域下时，对所有页面生效。
 * 它必须被 isValidRoutePath 放行，否则全局元素配置会被当成非法路径丢掉。
 */
export const GLOBAL_SCOPE = '*';

/**
 * 路由 path 的合法形状：以 / 开头，不含协议、不含空格、不含 ..
 * 只做形状校验，**不校验路由是否存在** —— 不存在由调用方用已知路由表比对。
 */
export function isValidRoutePath(p) {
  if (p === GLOBAL_SCOPE) return true;
  return isStr(p) && /^\/[A-Za-z0-9\-_/]*$/.test(p) && !p.includes('..');
}

/**
 * 校验并规范化一份配置文档。
 *
 * 设计原则：**永不抛异常**，非法值一律丢弃并记入 warnings。
 * 理由：配置坏了不能导致后台打不开或前台白屏 —— 这是需求的硬要求。
 * 调用方拿到的 result 永远是合法形状，warnings 用于给出可读提示。
 *
 * @param {unknown} input
 * @param {{ knownRoutes?: string[], knownBlocks?: string[] }} [ctx]
 * @returns {{ config: object, warnings: {path: string, message: string}[] }}
 */
export function normalizeConfig(input, ctx = {}) {
  /** @type {{path: string, message: string}[]} */
  const warnings = [];
  const warn = (p, message) => warnings.push({ path: p, message });

  if (!isObj(input)) {
    if (input !== undefined && input !== null) warn('', '配置根节点不是对象，已按空配置处理');
    return { config: emptyConfig(), warnings };
  }

  const knownRoutes = ctx.knownRoutes ? new Set(ctx.knownRoutes) : null;
  const knownBlocks = ctx.knownBlocks ? new Set(ctx.knownBlocks) : null;

  const config = emptyConfig();
  config.version = Number.isInteger(input.version) ? input.version : CONFIG_VERSION;
  if (isStr(input.updatedAt)) config.updatedAt = input.updatedAt;

  /* ---------- 1. 页面 / 路由级 ---------- */
  if (isObj(input.routes)) {
    for (const [route, raw] of Object.entries(input.routes)) {
      if (!isValidRoutePath(route)) {
        warn(`routes.${route}`, '路由路径非法（须以 / 开头且不含 ..），已忽略');
        continue;
      }
      if (knownRoutes && !knownRoutes.has(route)) {
        warn(`routes.${route}`, '路由不存在于站点路由表，已忽略');
        continue;
      }
      if (!isObj(raw)) {
        warn(`routes.${route}`, '配置不是对象，已忽略');
        continue;
      }
      const entry = {};
      if (raw.state !== undefined) {
        if (ROUTE_STATES.includes(raw.state)) entry.state = raw.state;
        else warn(`routes.${route}.state`, `状态非法（应为 ${ROUTE_STATES.join(' / ')}），已忽略`);
      }
      if (raw.access !== undefined) {
        if (ROUTE_ACCESS.includes(raw.access)) entry.access = raw.access;
        else warn(`routes.${route}.access`, `访问级别非法（应为 ${ROUTE_ACCESS.join(' / ')}），已忽略`);
      }
      if (raw.disabledMessage !== undefined) {
        if (isStr(raw.disabledMessage) && raw.disabledMessage.length <= 200) {
          entry.disabledMessage = raw.disabledMessage;
        } else {
          warn(`routes.${route}.disabledMessage`, '提示语非法或超过 200 字，已忽略');
        }
      }
      if (raw.title !== undefined) {
        if (isStr(raw.title) && raw.title.length <= 120) entry.title = raw.title;
        else warn(`routes.${route}.title`, '标题非法或超过 120 字，已忽略');
      }
      const cleaned = compact(entry);
      if (Object.keys(cleaned).length) config.routes[route] = cleaned;
    }
  } else if (input.routes !== undefined) {
    warn('routes', '不是对象，已忽略');
  }

  /* ---------- 2. 区块 / 组件级 ---------- */
  if (isObj(input.blocks)) {
    for (const [route, raw] of Object.entries(input.blocks)) {
      if (!isValidRoutePath(route)) {
        warn(`blocks.${route}`, '路由路径非法，已忽略');
        continue;
      }
      if (!isObj(raw)) {
        warn(`blocks.${route}`, '配置不是对象，已忽略');
        continue;
      }
      const page = {};
      if (Array.isArray(raw.order)) {
        const seen = new Set();
        const order = [];
        for (const id of raw.order) {
          if (!isStr(id) || !id.trim()) {
            warn(`blocks.${route}.order`, '顺序项不是非空字符串，已忽略该项');
            continue;
          }
          if (seen.has(id)) {
            warn(`blocks.${route}.order`, `顺序中存在重复项 ${id}，已去重`);
            continue;
          }
          if (knownBlocks && !knownBlocks.has(id)) {
            warn(`blocks.${route}.order`, `区块 ${id} 不存在，已忽略`);
            continue;
          }
          seen.add(id);
          order.push(id);
        }
        if (order.length) page.order = order;
      }
      if (isObj(raw.items)) {
        const items = {};
        for (const [id, item] of Object.entries(raw.items)) {
          if (!isObj(item)) {
            warn(`blocks.${route}.items.${id}`, '不是对象，已忽略');
            continue;
          }
          if (knownBlocks && !knownBlocks.has(id)) {
            warn(`blocks.${route}.items.${id}`, `区块 ${id} 不存在，已忽略`);
            continue;
          }
          const it = {};
          if (item.enabled !== undefined) {
            if (isBool(item.enabled)) it.enabled = item.enabled;
            else warn(`blocks.${route}.items.${id}.enabled`, '不是布尔值，已忽略');
          }
          for (const k of ['title', 'description']) {
            if (item[k] === undefined) continue;
            if (isStr(item[k]) && item[k].length <= 200) it[k] = item[k];
            else warn(`blocks.${route}.items.${id}.${k}`, '文案非法或超过 200 字，已忽略');
          }
          const cleaned = compact(it);
          if (Object.keys(cleaned).length) items[id] = cleaned;
        }
        if (Object.keys(items).length) page.items = items;
      }
      if (Object.keys(page).length) config.blocks[route] = page;
    }
  } else if (input.blocks !== undefined) {
    warn('blocks', '不是对象，已忽略');
  }

  /* ---------- 3. 元素级 ---------- */
  if (isObj(input.elements)) {
    for (const [route, raw] of Object.entries(input.elements)) {
      if (!isValidRoutePath(route)) {
        warn(`elements.${route}`, '路由路径非法，已忽略');
        continue;
      }
      if (!isObj(raw)) {
        warn(`elements.${route}`, '配置不是对象，已忽略');
        continue;
      }
      const page = {};
      for (const [id, el] of Object.entries(raw)) {
        if (!isObj(el)) {
          warn(`elements.${route}.${id}`, '不是对象，已忽略');
          continue;
        }
        const it = {};
        if (el.enabled !== undefined) {
          if (isBool(el.enabled)) it.enabled = el.enabled;
          else warn(`elements.${route}.${id}.enabled`, '不是布尔值，已忽略');
        }
        for (const k of ['label', 'ariaLabel']) {
          if (el[k] === undefined) continue;
          if (isStr(el[k]) && el[k].length <= 80) it[k] = el[k];
          else warn(`elements.${route}.${id}.${k}`, '文案非法或超过 80 字，已忽略');
        }
        if (el.href !== undefined) {
          // 允许站内路径、锚点、http(s)、mailto、tel；拦截 javascript: 等危险协议
          const ok =
            isStr(el.href) &&
            (/^\/[^\s]*$/.test(el.href) ||
              /^#[^\s]*$/.test(el.href) ||
              /^https?:\/\/[^\s]+$/.test(el.href) ||
              /^mailto:[^\s]+$/.test(el.href) ||
              /^tel:[^\s]+$/.test(el.href));
          if (ok) it.href = el.href;
          else warn(`elements.${route}.${id}.href`, '跳转目标非法（仅允许站内路径 / 锚点 / http(s) / mailto / tel），已忽略');
        }
        if (el.icon !== undefined) {
          if (isStr(el.icon) && /^[a-z0-9-]{1,32}$/.test(el.icon)) it.icon = el.icon;
          else warn(`elements.${route}.${id}.icon`, '图标名非法（仅小写字母数字连字符），已忽略');
        }
        const cleaned = compact(it);
        if (Object.keys(cleaned).length) page[id] = cleaned;
      }
      if (Object.keys(page).length) config.elements[route] = page;
    }
  } else if (input.elements !== undefined) {
    warn('elements', '不是对象，已忽略');
  }

  /* ---------- 4. 文案与 i18n ---------- */
  if (isObj(input.i18n)) {
    for (const [lang, table] of Object.entries(input.i18n)) {
      if (!LANGUAGES.includes(lang)) {
        warn(`i18n.${lang}`, `语言码不在支持列表（${LANGUAGES.join(' / ')}），已忽略`);
        continue;
      }
      if (!isObj(table)) {
        warn(`i18n.${lang}`, '不是对象，已忽略');
        continue;
      }
      const cleaned = {};
      for (const [key, value] of Object.entries(table)) {
        if (!/^[A-Za-z0-9._-]{1,64}$/.test(key)) {
          warn(`i18n.${lang}.${key}`, '文案键名非法，已忽略');
          continue;
        }
        if (isStr(value) && value.length <= 300) cleaned[key] = value;
        else warn(`i18n.${lang}.${key}`, '文案值非法或超过 300 字，已忽略');
      }
      if (Object.keys(cleaned).length) config.i18n[lang] = cleaned;
    }
  } else if (input.i18n !== undefined) {
    warn('i18n', '不是对象，已忽略');
  }

  /* ---------- 5. 主题与样式 ---------- */
  if (isObj(input.theme)) {
    const th = {};
    if (isObj(input.theme.tokens)) {
      const tokens = {};
      for (const [name, value] of Object.entries(input.theme.tokens)) {
        if (!THEME_TOKENS.includes(name)) {
          warn(`theme.tokens.${name}`, '不在允许覆盖的令牌白名单内，已忽略');
          continue;
        }
        // 只接受 hex 颜色，拒绝任意 CSS（防止注入）
        if (isStr(value) && /^#[0-9a-fA-F]{3,8}$/.test(value)) tokens[name] = value;
        else warn(`theme.tokens.${name}`, '颜色值非法（须为 #hex），已忽略');
      }
      if (Object.keys(tokens).length) th.tokens = tokens;
    }
    for (const k of ['logoText', 'logoSubtext']) {
      if (input.theme[k] === undefined) continue;
      if (isStr(input.theme[k]) && input.theme[k].length <= 60) th[k] = input.theme[k];
      else warn(`theme.${k}`, '文案非法或超过 60 字，已忽略');
    }
    if (input.theme.logoImage !== undefined) {
      if (isStr(input.theme.logoImage) && /^\/[^\s]*$/.test(input.theme.logoImage)) {
        th.logoImage = input.theme.logoImage;
      } else warn('theme.logoImage', '图片路径非法（须为站内路径），已忽略');
    }
    if (input.theme.footerNote !== undefined) {
      if (isStr(input.theme.footerNote) && input.theme.footerNote.length <= 200) {
        th.footerNote = input.theme.footerNote;
      } else warn('theme.footerNote', '页脚文案非法或超过 200 字，已忽略');
    }
    const cleaned = compact(th);
    if (Object.keys(cleaned).length) config.theme = cleaned;
  } else if (input.theme !== undefined) {
    warn('theme', '不是对象，已忽略');
  }

  /* ---------- 6. 功能开关 ---------- */
  if (isObj(input.features)) {
    const features = {};
    for (const [key, value] of Object.entries(input.features)) {
      if (!FEATURE_KEYS.includes(key)) {
        warn(`features.${key}`, '不在功能开关白名单内，已忽略');
        continue;
      }
      if (isBool(value)) features[key] = value;
      else warn(`features.${key}`, '不是布尔值，已忽略');
    }
    if (Object.keys(features).length) config.features = features;
  } else if (input.features !== undefined) {
    warn('features', '不是对象，已忽略');
  }

  return { config, warnings };
}

/** 空配置 —— 前台拿到它时行为必须与"完全没有配置"一致 */
export function emptyConfig() {
  return {
    version: CONFIG_VERSION,
    routes: {},
    blocks: {},
    elements: {},
    i18n: {},
    theme: {},
    features: {},
  };
}

/** 配置是否为空（用于后台空状态判定） */
export function isConfigEmpty(config) {
  if (!isObj(config)) return true;
  return (
    Object.keys(config.routes ?? {}).length === 0 &&
    Object.keys(config.blocks ?? {}).length === 0 &&
    Object.keys(config.elements ?? {}).length === 0 &&
    Object.keys(config.i18n ?? {}).length === 0 &&
    Object.keys(config.theme ?? {}).length === 0 &&
    Object.keys(config.features ?? {}).length === 0
  );
}

/**
 * 前台「已知路由 / 区块 / 元素」清单。
 *
 * 后台用它做下拉选项与合法性提示，前台用它做运行时校验。
 * 这是**站点结构的声明**，新增页面/区块时同步维护。
 */
export const SITE_SURFACE = {
  routes: [
    { path: '/', label: '首页' },
    { path: '/about', label: '研究院概况' },
    { path: '/research', label: '研究方向' },
    { path: '/people', label: '研究团队' },
    { path: '/publications', label: '学术成果' },
    { path: '/projects', label: '科研项目' },
    { path: '/news', label: '新闻动态' },
    { path: '/notices', label: '通知公告' },
    { path: '/events', label: '学术活动' },
    { path: '/topics', label: '专题专栏' },
    { path: '/datasets', label: '数据集与资源' },
    { path: '/join', label: '招生招聘' },
    { path: '/contact', label: '联系我们' },
    { path: '/search', label: '全站搜索' },
  ],
  blocks: {
    '/': [
      { id: 'positioning', label: '机构定位条' },
      { id: 'focus', label: '焦点图与通知公告' },
      { id: 'news', label: '要闻' },
      { id: 'events', label: '学术活动与科研项目' },
      { id: 'research', label: '研究方向' },
      { id: 'publications', label: '学术成果' },
      { id: 'people', label: '研究团队' },
      { id: 'statBand', label: '数据统计带' },
      { id: 'topics', label: '专题专栏' },
      { id: 'join', label: '加入我们' },
    ],
  },
  elements: {
    '*': [
      { id: 'searchTrigger', label: '全站搜索入口' },
      { id: 'adminEntry', label: '内容发布后台入口' },
      { id: 'languageSwitch', label: '语言切换' },
      { id: 'quickJoin', label: '报头·研究生招生' },
      { id: 'quickContact', label: '报头·联系我们' },
    ],
    '/': [
      { id: 'joinPrimary', label: '加入我们·招生与招聘' },
      { id: 'joinSecondary', label: '加入我们·联系我们' },
    ],
  },
};
