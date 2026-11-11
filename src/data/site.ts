import settings from './site-settings.json';

/**
 * 站点级常量。基础值来自 site-settings.json（后台「站点设置」可编辑）。
 * 改这里会同时影响 SEO、页脚与结构化数据。
 */
export const site = {
  ...settings,
  slogan: 'RESEARCH · INNOVATION · IMPACT',
  url: 'https://little-pig-create.github.io',
} as const;
