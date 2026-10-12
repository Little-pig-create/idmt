import type { APIRoute } from 'astro';
import { base } from '../lib/paths';

/**
 * robots.txt 由构建生成，不写死：Sitemap 一行的绝对地址要跟着
 * astro.config 的 site 与 base 走，手抄一份会在换域名或换部署前缀时静默失效。
 */
export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL('https://little-pig-create.github.io')).origin;
  const body = `User-agent: *
Allow: /

Sitemap: ${origin}${base}/sitemap-index.xml
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
