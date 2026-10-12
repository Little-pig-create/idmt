/**
 * 脚本侧的构建配置读取。
 *
 * 部署前缀（Astro `base`）会同时影响模板、生成的 CSS、审计与冒烟脚本。
 * 写在脚本里就是第二份真相，改配置忘改脚本会得到「门禁全绿但线上断链」，
 * 所以一律从 astro.config.mjs 反解。
 */
import fs from 'node:fs';
import path from 'node:path';

export function readSiteConfig(root) {
  const src = fs.readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');
  const rawBase = src.match(/^\s*base:\s*'([^']*)'/m)?.[1] ?? '/';
  return {
    /** '' 或 '/idmt' —— 末尾不带斜杠 */
    base: rawBase === '/' ? '' : rawBase.replace(/\/+$/, ''),
    /** astro.config 里的 site 原始值 */
    site: src.match(/^\s*site:\s*'([^']*)'/m)?.[1] ?? '',
  };
}
