import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { publicationTypeLabels, eventTypeLabels } from '../data/site';

export const GET: APIRoute = async () => {
  const [news, notices, publications, people, events, research, projects, topics] = await Promise.all([
    getCollection('news', ({ data }) => !data.draft),
    getCollection('notices', ({ data }) => !data.draft),
    getCollection('publications', ({ data }) => !data.draft),
    getCollection('people', ({ data }) => !data.draft),
    getCollection('events', ({ data }) => !data.draft),
    getCollection('research', ({ data }) => !data.draft),
    getCollection('projects', ({ data }) => !data.draft),
    getCollection('topics', ({ data }) => !data.draft),
  ]);

  const docs = [
    ...news.map((e) => ({
      title: e.data.title,
      url: `/news/${e.id}`,
      kind: '新闻动态',
      summary: e.data.summary,
      tags: e.data.tags,
    })),
    ...notices.map((e) => ({
      title: e.data.title,
      url: `/notices#${e.id}`,
      kind: '通知公告',
      summary: `${e.data.category} · ${e.data.date.getFullYear()}-${String(
        e.data.date.getMonth() + 1
      ).padStart(2, '0')}-${String(e.data.date.getDate()).padStart(2, '0')}`,
      tags: [e.data.category],
    })),
    ...publications.map((e) => ({
      title: e.data.title,
      url: `/publications/${e.id}`,
      kind: publicationTypeLabels[e.data.type] ?? '学术成果',
      summary: `${e.data.authors.join('、')} · ${e.data.venue} ${e.data.year}`,
      tags: e.data.tags,
    })),
    ...people.map((e) => ({
      title: e.data.name,
      url: `/people/${e.id}`,
      kind: '研究团队',
      summary: e.data.title,
      tags: e.data.researchAreas,
    })),
    ...events.map((e) => ({
      title: e.data.title,
      url: `/events/${e.id}`,
      kind: eventTypeLabels[e.data.type] ?? '学术活动',
      summary: e.data.summary,
      tags: [e.data.location],
    })),
    ...research.map((e) => ({
      title: e.data.title,
      url: `/research/${e.id}`,
      kind: '研究方向',
      summary: e.data.summary,
      tags: e.data.keywords,
    })),
    ...projects.map((e) => ({
      title: e.data.title,
      url: `/projects/${e.id}`,
      kind: '科研项目',
      summary: e.data.summary,
      tags: [e.data.funder],
    })),
    ...topics.map((e) => ({
      title: e.data.title,
      url: `/topics/${e.id}`,
      kind: '专题',
      summary: e.data.summary,
      tags: e.data.keywords,
    })),
  ];

  return new Response(JSON.stringify(docs), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
