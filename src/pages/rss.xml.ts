import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';
import { base } from '../lib/paths';

export const GET: APIRoute = async (context) => {
  const news = await getCollection('news', ({ data }) => !data.draft);
  return rss({
    title: `${site.name} · 新闻`,
    description: site.description,
    site: new URL(`${base}/`, context.site ?? site.url),
    items: news
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map((item) => ({
        title: item.data.title,
        pubDate: item.data.date,
        description: item.data.summary,
        link: `${base}/news/${item.id}`,
      })),
    customData: '<language>zh-CN</language>',
  });
};
