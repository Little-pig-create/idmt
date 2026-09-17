import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category?: string;
  guid: string;
}

/**
 * RSS 2.0 feed：聚合新闻 + 通知公告两类动态。
 * 这是学术门户的标配（学术成果条目通常用单独导出，不进 RSS）。
 */
export const GET: APIRoute = async ({ site: siteFromContext }) => {
  const origin = (siteFromContext ?? new URL('https://dmi.example.edu.cn')).origin;

  const news = await getCollection('news', ({ data }) => !data.draft);
  const notices = await getCollection('notices', ({ data }) => !data.draft);

  const items: FeedItem[] = [
    ...news.map((n) => ({
      title: n.data.title,
      link: `${origin}/news/${n.id}`,
      guid: `news:${n.id}`,
      description: n.data.summary,
      pubDate: new Date(n.data.date).toUTCString(),
      category: '新闻动态',
    })),
    ...notices.map((n) => ({
      title: `[${n.data.category}] ${n.data.title}`,
      link: `${origin}/notices#${n.id}`,
      guid: `notice:${n.id}`,
      description: n.data.title,
      pubDate: new Date(n.data.date).toUTCString(),
      category: '通知公告',
    })),
  ]
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 30);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(site.name)} · ${xmlEscape(site.shortName)}</title>
    <link>${origin}/</link>
    <description>${xmlEscape(site.tagline)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml" />
    ${items
      .map(
        (it) => `    <item>
      <title>${xmlEscape(it.title)}</title>
      <link>${xmlEscape(it.link)}</link>
      <guid isPermaLink="false">${xmlEscape(it.guid)}</guid>
      <description>${xmlEscape(it.description)}</description>
      <pubDate>${it.pubDate}</pubDate>
      ${it.category ? `<category>${xmlEscape(it.category)}</category>` : ''}
    </item>`
      )
      .join('\n')}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};