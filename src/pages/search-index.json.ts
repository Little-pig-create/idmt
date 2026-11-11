import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/** 全站检索索引：构建期生成，前端只做本地过滤。 */
export const GET: APIRoute = async () => {
  const research = await getCollection('research', ({ data }) => !data.draft);
  const products = await getCollection('products', ({ data }) => !data.draft);
  const news = await getCollection('news', ({ data }) => !data.draft);
  const events = await getCollection('events', ({ data }) => !data.draft);
  const notices = await getCollection('notices', ({ data }) => !data.draft);
  const labs = await getCollection('labs', ({ data }) => !data.draft);

  const entries = [
    ...research.map((e) => ({
      type: '研究方向',
      title: e.data.title,
      description: e.data.summary,
      href: `/research/${e.id}`,
      text: [e.data.titleEn, ...e.data.keywords, ...e.data.capabilities].join(' '),
    })),
    ...products.map((e) => ({
      type: '产品与方案',
      title: e.data.title,
      description: e.data.summary,
      href: `/products/${e.id}`,
      text: [e.data.category, ...e.data.tags, ...e.data.highlights].join(' '),
    })),
    ...news.map((e) => ({
      type: '新闻',
      title: e.data.title,
      description: e.data.summary,
      href: `/news/${e.id}`,
      text: [e.body ?? '', ...e.data.tags].join(' '),
    })),
    ...events.map((e) => ({
      type: '活动',
      title: e.data.title,
      description: e.data.summary,
      href: `/events/${e.id}`,
      text: [e.data.location, ...e.data.speakers].join(' '),
    })),
    ...notices.map((e) => ({
      type: '公告',
      title: e.data.title,
      description: e.data.summary ?? '',
      href: '/notices',
      text: e.data.category,
    })),
    ...labs.map((e) => ({
      type: '技术平台',
      title: e.data.name,
      description: e.data.summary,
      href: '/labs',
      text: [e.data.nameEn ?? '', e.data.capability ?? ''].join(' '),
    })),
  ];

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
