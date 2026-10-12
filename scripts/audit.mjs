/**
 * 构建产物静态审计：无障碍 + SEO + 结构化数据
 *
 * 用法：node scripts/audit.mjs
 *
 * 说明：这是静态正则审计，不能替代 axe / Lighthouse 的真实渲染检查，
 * 但能在 CI 里拦住最常见的回归（缺失 alt、标题层级跳跃、缺 canonical 等）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { readSiteConfig } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
/** 部署前缀（项目站为 '/<repo>'）；产物始终在 dist 根，前缀只存在于 URL 里 */
const BASE = readSiteConfig(path.resolve(__dirname, '..')).base;
/** 去掉 URL 的部署前缀，得到 dist 内的根绝对路径 */
const stripBase = (url) => (BASE && url.startsWith(BASE + '/') ? url.slice(BASE.length) : url);

if (!fs.existsSync(DIST)) {
  console.error('找不到 dist/，请先运行 npm run build');
  process.exit(1);
}

/**
 * 压缩后体积。未压缩的 CSS/JS 体积会严重误导预算判断：
 * Tailwind 产物未压缩常常几十 KB，但 gzip 后只剩零头 —— 真正过网线的是后者。
 */
function gzSize(p) {
  try {
    return gzipSync(fs.readFileSync(p), { level: 9 }).length;
  } catch {
    return 0;
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = walk(DIST);
const issues = [];
const stats = {
  pages: files.length,
  jsonld: 0,
  jsonldTypes: {},
  withH1: 0,
  htmlBytes: 0,
  uniqueJsBytes: 0,
  uniqueCssBytes: 0,
  uniqueJsGzBytes: 0,
  uniqueCssGzBytes: 0,
  internalLinks: 0,
  totalDistBytes: 0,
  maxHtml: { file: '', bytes: 0 },
};

/**
 * 站内路由表：'/research' -> dist/research/index.html
 * 用来判断内部链接是否指向真实存在的页面。
 */
const routeMap = new Map();
for (const f of files) {
  const rel = path.relative(DIST, f).replace(/\\/g, '/');
  const route =
    '/' +
    rel
      .replace(/index\.html$/, '')
      .replace(/\.html$/, '')
      .replace(/\/$/, '');
  routeMap.set(route || '/', f);
}

/* 非 HTML 的静态端点（rss.xml / robots.txt / sitemap / search-index.json …）同样是合法链接目标 */
function walkAll(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkAll(p, out);
    else out.push(p);
  }
  return out;
}
for (const f of walkAll(DIST)) {
  const rel = path.relative(DIST, f).replace(/\\/g, '/');
  if (rel.startsWith('_astro/') || rel.endsWith('.html')) continue;
  routeMap.set('/' + rel, f);
}

/**
 * 存在于静态产物之外、由其他服务提供的路由。
 * 后台是独立应用（admin/），不在 dist 里，但报头/页脚都会链过去，属于正常链接。
 */
const ROUTES_OUTSIDE_BUILD = new Set(['/admin']);

/** 把 href 拆成「路径 + 锚点」，外链/协议链接返回 null */
function parseInternal(href) {
  if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  let h = href.trim();
  const q = h.indexOf('?');
  if (q >= 0) h = h.slice(0, q);
  let anchor = '';
  const hash = h.indexOf('#');
  if (hash >= 0) {
    anchor = h.slice(hash + 1);
    h = h.slice(0, hash);
  }
  if (!h.startsWith('/')) return null;
  h = h.replace(/\/{2,}/g, '/');
  // 前缀检查交给 LINK-003，这里只负责归一
  h = stripBase(h);
  if (h.length > 1) h = h.replace(/\/$/, '');
  return { route: h || '/', anchor };
}

const anchorCache = new Map();
function anchorIds(file) {
  if (!anchorCache.has(file)) {
    const html = fs.readFileSync(file, 'utf8');
    anchorCache.set(file, new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1])));
  }
  return anchorCache.get(file);
}

function add(file, level, code, message) {
  issues.push({ file: path.relative(DIST, file), level, code, message });
}

const text = (s) => s.replace(/\s+/g, ' ').trim();

function safeSize(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return null;
  }
}

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');

  /* ---------- 文档级 ---------- */
  if (!/<html[^>]+lang=/i.test(html)) add(file, 'error', 'A11Y-001', '缺少 <html lang>');

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title || !text(title[1])) add(file, 'error', 'SEO-001', '缺少 <title>');
  else if (text(title[1]).length > 60) add(file, 'warn', 'SEO-002', `<title> 过长（${text(title[1]).length} 字符）`);

  if (!/<meta[^>]+name=["']description["']/i.test(html)) add(file, 'error', 'SEO-003', '缺少 meta description');
  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) add(file, 'warn', 'SEO-004', '缺少 canonical');
  if (!/<meta[^>]+property=["']og:title["']/i.test(html)) add(file, 'warn', 'SEO-005', '缺少 og:title');

  /* ---------- 结构 ---------- */
  if (!/<main\b/i.test(html)) add(file, 'error', 'A11Y-002', '缺少 <main> 地标');
  if (!/class=["'][^"']*skip-link/i.test(html)) add(file, 'warn', 'A11Y-003', '缺少跳转到主内容的 skip link');

  /* ---------- 产物洁净度 ---------- */
  // .astro 模板里的 <!-- --> 会被**原样输出**到 HTML（不像 JSX 会自动剥注释），
  // 用 {/* */} 写的开发注释才会被剥掉。
  // 历史上 4 个文件里的 21 处注释渲染到 51 个页面、共 472 处 / 16.5 KB，
  // 把设计决策与「不要这样做」的内部备注一起发给了所有访客。
  // Astro 自身会产出空注释 <!-- --> 与 <!--astro:end-->，这些不算 —— 只报有内容的。
  const leaked = [...html.matchAll(/<!--([\s\S]*?)-->/g)]
    .map((m) => m[1].trim())
    .filter((c) => c.length > 0 && !c.startsWith('astro:'));
  if (leaked.length) {
    add(
      file,
      'error',
      'HYG-001',
      `产物含 ${leaked.length} 处源码注释（改用 {/* */} 写注释）：${text(leaked[0]).slice(0, 40)}`
    );
  }

  /* ---------- 标题层级 ---------- */
  const heads = [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]));
  const h1 = heads.filter((l) => l === 1).length;
  if (h1 === 0) add(file, 'error', 'A11Y-004', '页面没有 h1');
  else if (h1 > 1) add(file, 'error', 'A11Y-005', `页面有 ${h1} 个 h1（应恰好 1 个）`);
  else stats.withH1 += 1;

  let prev = 0;
  for (const level of heads) {
    if (prev && level > prev + 1) {
      add(file, 'warn', 'A11Y-006', `标题层级跳跃：h${prev} → h${level}`);
      break;
    }
    prev = level;
  }

  /* ---------- 图片 ---------- */
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/\balt=/i.test(tag)) add(file, 'error', 'A11Y-007', `图片缺少 alt：${tag.slice(0, 70)}`);
  }

  /* ---------- 交互元素的可访问名称 ---------- */
  for (const m of html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const [, tag, attrs, inner] = m;
    const hasAria = /\baria-label=|\baria-labelledby=|\btitle=/i.test(attrs);
    const hasText = text(inner.replace(/<[^>]+>/g, '')).length > 0;
    const hasImg = /<img[^>]+alt=["'][^"']+["']/i.test(inner);
    if (!hasAria && !hasText && !hasImg) {
      add(file, 'error', 'A11Y-008', `<${tag}> 无可访问名称：${attrs.trim().slice(0, 70)}`);
    }
  }

  /* ---------- 表单控件 ---------- */
  for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const attrs = m[2];
    if (/\btype=["']hidden["']/i.test(attrs)) continue;
    if (!/\baria-label=|\baria-labelledby=|\bid=|\bname=/i.test(attrs)) {
      add(file, 'error', 'A11Y-009', `表单控件无标签：${attrs.trim().slice(0, 70)}`);
    }
  }

  /* ---------- 结构化数据 ---------- */
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1]);
      stats.jsonld += 1;
      const types = parsed['@type'] ? [parsed['@type']] : (parsed['@graph'] || []).map((g) => g['@type']);
      for (const t of types) stats.jsonldTypes[t] = (stats.jsonldTypes[t] || 0) + 1;
    } catch {
      add(file, 'error', 'SEO-006', 'JSON-LD 解析失败');
    }
  }

  /* ---------- 单页资源预算 ---------- */
  const seenAssets = (stats.__seenAssets ||= new Set());
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    const url = m[1];
    if (url.startsWith('http')) continue;
    const local = path.join(DIST, stripBase(url).replace(/^\//, ''));
    const size = safeSize(local);
    if (size == null) add(file, 'warn', 'PERF-001', `引用的脚本不存在：${url}`);
    else if (!seenAssets.has(local)) {
      seenAssets.add(local);
      stats.uniqueJsBytes += size;
      stats.uniqueJsGzBytes += gzSize(local);
    }
  }
  for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)) {
    const url = m[1];
    if (url.startsWith('http')) continue;
    const local = path.join(DIST, stripBase(url).replace(/^\//, ''));
    const size = safeSize(local);
    if (size != null && !seenAssets.has(local)) {
      seenAssets.add(local);
      stats.uniqueCssBytes += size;
      stats.uniqueCssGzBytes += gzSize(local);
    }
  }
  /* ---------- 内部链接可达性 ---------- */
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    const href = m[1];
    const parsed = parseInternal(href);
    if (!parsed) continue;
    stats.internalLinks += 1;
    if (BASE && !/^https?:/i.test(href) && !href.startsWith(BASE + '/') && href !== BASE) {
      add(file, 'error', 'LINK-003', `内部链接缺部署前缀（base=${BASE}）：${href}`);
      continue;
    }
    const target = routeMap.get(parsed.route);
    if (!target) {
      if (!ROUTES_OUTSIDE_BUILD.has(parsed.route)) add(file, 'error', 'LINK-001', `内部死链：${href}`);
      continue;
    }
    // 锚点目标必须真实存在（搜索索引会生成 /notices#id 这类链接）
    if (parsed.anchor && !anchorIds(target).has(parsed.anchor)) {
      add(file, 'warn', 'LINK-002', `锚点不存在：${href}`);
    }
  }

  const htmlBytes = fs.statSync(file).size;
  if (htmlBytes > 120 * 1024) add(file, 'warn', 'PERF-002', `HTML 过大：${(htmlBytes / 1024).toFixed(1)} KB（未压缩；建议 < 120 KB）`);
  stats.htmlBytes += htmlBytes;
  if (htmlBytes > stats.maxHtml.bytes) stats.maxHtml = { file: path.relative(DIST, file), bytes: htmlBytes };
}

/* ---------- CSS url() 可达性 ---------- */
// Astro 的 base 不重写 CSS 里的 url()：字体一类的根绝对路径必须自带部署前缀。
// 这类失效不出现在 <a href> 里，LINK-001/003 查不到，只能单独扫。
const missingCssUrl = (cssText, where) => {
  for (const m of cssText.matchAll(/url\(\s*['"]?(\/[^'")]+)/g)) {
    const local = path.join(DIST, stripBase(m[1]).replace(/^\//, ''));
    if (!fs.existsSync(local)) add(where, 'error', 'CSS-001', `url() 指向不存在的产物：${m[1]}`);
  }
};
for (const f of walkAll(DIST)) {
  if (!f.endsWith('.css')) continue;
  missingCssUrl(fs.readFileSync(f, 'utf8'), f);
}
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) missingCssUrl(m[1], f);
}

/* ---------- 部署前缀只能有一个出口 ---------- */
// import.meta.env.BASE_URL 就是 astro.config 的 base 原值，**不补尾斜杠**：
// `BASE_URL + 'search-index.json'` 拼出 /idmtsearch-index.json。
// 这类断链既不在 <a href> 里（LINK-001/003 查不到），也不在构建产物文本里
// （编译后只剩变量拼接），HTTP 冒烟同样测不出 —— 只有浏览器会暴露。
// 所以在源码层禁止直接用它，一律经 src/lib/paths.ts 的 u()/baseSlash/routeOf。
const SRC = path.resolve(__dirname, '..', 'src');
const ALLOWED_BASE_URL_FILE = path.join(SRC, 'lib', 'paths.ts');
for (const f of walkAll(SRC).filter((p) => /\.(astro|tsx?|jsx?|css)$/.test(p))) {
  if (f === ALLOWED_BASE_URL_FILE) continue;
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(/import\.meta\.env\.BASE_URL/g)) {
    const line = text.slice(0, m.index).split('\n').length;
    add(
      path.relative(SRC, f) + ':' + line,
      'error',
      'LINK-004',
      '直接用 import.meta.env.BASE_URL 拼路径（它不带尾斜杠，会拼成 /idmtxxx）；请改用 src/lib/paths.ts 导出的 u() 或 baseSlash'
    );
  }
}

/* ---------- 站点整体资源预算 ---------- */
let assetBytes = 0;
for (const f of walk(DIST)) assetBytes += fs.statSync(f).size;
stats.totalDistBytes = assetBytes;
if (assetBytes > 5 * 1024 * 1024) {
  add(DIST, 'warn', 'PERF-005', `dist 总体积：${(assetBytes / 1024 / 1024).toFixed(2)} MB（建议 < 5 MB）`);
}

/* ---------- 汇总 ---------- */
const byCode = new Map();
for (const i of issues) {
  const key = `${i.level} ${i.code}`;
  if (!byCode.has(key)) byCode.set(key, { count: 0, sample: i, files: new Set() });
  const rec = byCode.get(key);
  rec.count += 1;
  rec.files.add(i.file);
}

console.log(`扫描页面：${stats.pages}`);
console.log(`含 h1 且唯一：${stats.withH1}`);
console.log(`内部链接：${stats.internalLinks}`);
console.log(`JSON-LD 块（解析成功）：${stats.jsonld}`);
const types = Object.entries(stats.jsonldTypes).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}×${n}`).join(' ');
if (types) console.log(`JSON-LD 类型分布：${types}`);
console.log(
  `页面资源：HTML ${(stats.htmlBytes / 1024).toFixed(0)} KB 合计（均值 ${(stats.htmlBytes / stats.pages / 1024).toFixed(0)} KB/页）· JS ${(stats.uniqueJsBytes / 1024).toFixed(0)} KB · CSS ${(stats.uniqueCssBytes / 1024).toFixed(0)} KB`
);
console.log(
  `压缩后(gzip)：JS ${(stats.uniqueJsGzBytes / 1024).toFixed(1)} KB · CSS ${(stats.uniqueCssGzBytes / 1024).toFixed(1)} KB（预算以压缩后为准：JS ≤ 30 KB、CSS ≤ 20 KB）`
);
if (stats.uniqueCssGzBytes > 20 * 1024) {
  add(DIST, 'warn', 'PERF-006', `CSS 压缩后 ${(stats.uniqueCssGzBytes / 1024).toFixed(1)} KB，超过 20 KB 预算`);
}
if (stats.uniqueJsGzBytes > 30 * 1024) {
  add(DIST, 'warn', 'PERF-007', `JS 压缩后 ${(stats.uniqueJsGzBytes / 1024).toFixed(1)} KB，超过 30 KB 预算`);
}
console.log(`最大 HTML 页面：${stats.maxHtml.file || '—'}（${(stats.maxHtml.bytes / 1024).toFixed(1)} KB）`);
console.log(`dist 总体积：${(stats.totalDistBytes / 1024 / 1024).toFixed(2)} MB`);
console.log('');

if (issues.length === 0) {
  console.log('✅ 未发现问题');
} else {
  const rows = [...byCode.entries()].sort((a, b) => {
    const la = a[0].startsWith('error') ? 0 : 1;
    const lb = b[0].startsWith('error') ? 0 : 1;
    return la - lb || b[1].count - a[1].count;
  });
  for (const [key, rec] of rows) {
    const files = [...rec.files];
    const shown = files.slice(0, 3).join(', ') + (files.length > 3 ? ` …等 ${files.length} 页` : '');
    console.log(`${rec.sample.level === 'error' ? '✗' : '!'} ${key}  ×${rec.count}`);
    console.log(`   ${rec.sample.message}`);
    console.log(`   页面：${shown}`);
  }
  const errs = issues.filter((i) => i.level === 'error').length;
  console.log('');
  console.log(`合计：${issues.length} 项（error ${errs} / warn ${issues.length - errs}）`);
}

process.exit(issues.some((i) => i.level === 'error') ? 1 : 0);
