/**
 * 路径基准。
 *
 * Astro 的 `base` 只重写**它自己生成**的链接（打包资源、canonical、sitemap），
 * 对源码里手写的根绝对路径（`href="/news"`、`fetch('/search-index.json')`、
 * CSS 的 `url("/fonts/…")`）一概不动。项目站部署在 `user.github.io/<repo>/`，
 * 未加前缀的根绝对路径会指到仓库之外的站点根，全站断链。
 *
 * 所以：数据层与模板一律存**根绝对路径**（`/news`），输出到 HTML 前用 `u()` 加前缀，
 * 路由匹配一律用 `routeOf()` 归一回根绝对路径。两个方向各一个入口，避免前缀被加两次。
 */
const raw = import.meta.env.BASE_URL ?? '/';
/** '' 或 '/idmt' —— 末尾不带斜杠，拼接时由调用方给出前导斜杠 */
export const base = raw === '/' ? '' : raw.replace(/\/+$/, '');

/**
 * '/idmt/' 或 '/' —— 末尾一定带斜杠，供客户端直接拼相对路径用。
 * `import.meta.env.BASE_URL` 就是 astro.config 里写的 `base` 原值，
 * **不补尾斜杠**；`BASE_URL + 'search-index.json'` 会拼成
 * `/idmtsearch-index.json`，这类错只有浏览器能发现，HTTP 冒烟测不出来。
 */
export const baseSlash = base === '' ? '/' : base + '/';

/** 给根绝对路径加上部署前缀；外链 / 协议链接 / 锚点原样返回 */
export function u(path: string): string {
  if (!base || !path.startsWith('/')) return path;
  return base + path;
}

/** 把带前缀的 pathname 归一回根绝对路由，供 active 判定与配置路由匹配使用 */
export function routeOf(pathname: string): string {
  if (!base) return pathname;
  const withoutSearch = pathname.replace(/\/+$/, '') || '/';
  if (!withoutSearch.startsWith(base)) return withoutSearch;
  return withoutSearch.slice(base.length) || '/';
}
