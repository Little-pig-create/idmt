import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { publicationTypeLabels, eventTypeLabels } from '../data/site';

/**
 * 把 Markdown 正文压成可检索的纯文本。
 *
 * 为什么要进索引：同行检索文献最常用的方式是搜概念词，而概念词通常在摘要里、
 * 不在标题里。此前 publications 的 summary 装的是「作者 · 期刊 年份」，
 * 搜摘要里的词永远搜不到。
 */
function bodyText(body?: string): string {
  if (!body) return '';
  return body
    .replace(/```[\s\S]*?```/g, ' ') // 代码块
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/<[^>]+>/g, ' ') // 内联 HTML
    .replace(/^\s{0,3}#{1,6}\s+/gm, ' ') // 标题标记
    .replace(/^\s{0,3}>\s?/gm, ' ') // 引用标记
    .replace(/^\s{0,3}[-*+]\s+/gm, ' ') // 列表标记
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const GET: APIRoute = async () => {
  const [news, notices, publications, people, events, research, projects, topics, datasets] =
    await Promise.all([
      getCollection('news', ({ data }) => !data.draft),
      getCollection('notices', ({ data }) => !data.draft),
      getCollection('publications', ({ data }) => !data.draft),
      getCollection('people', ({ data }) => !data.draft),
      getCollection('events', ({ data }) => !data.draft),
      getCollection('research', ({ data }) => !data.draft),
      getCollection('projects', ({ data }) => !data.draft),
      getCollection('topics', ({ data }) => !data.draft),
      getCollection('datasets', ({ data }) => !data.draft),
    ]);

  const docs = [
    ...news.map((e) => ({
      title: e.data.title,
      url: `/news/${e.id}`,
      kind: '新闻动态',
      summary: e.data.summary,
      // 正文也进索引，否则搜不到文章里的概念词
      body: bodyText(e.body),
      tags: e.data.tags,
    })),
    ...notices.map((e) => ({
      title: e.data.title,
      url: `/notices#${e.id}`,
      kind: '通知公告',
      summary: `${e.data.category} · ${e.data.date.getFullYear()}-${String(
        e.data.date.getMonth() + 1
      ).padStart(2, '0')}-${String(e.data.date.getDate()).padStart(2, '0')}`,
      body: bodyText(e.body),
      tags: [e.data.category],
    })),
    ...publications.map((e) => ({
      title: e.data.title,
      url: `/publications/${e.id}`,
      kind: publicationTypeLabels[e.data.type] ?? '学术成果',
      // 载体与作者作为可检索字段，但摘要正文单独放 body，不再挤在 summary 里
      summary: `${e.data.authors.join('、')} · ${e.data.venue} ${e.data.year}`,
      body: bodyText(e.body),
      tags: e.data.tags,
    })),
    ...people.map((e) => ({
      title: e.data.name,
      url: `/people/${e.id}`,
      kind: '研究团队',
      summary: e.data.title,
      body: bodyText(e.body),
      tags: e.data.researchAreas,
    })),
    ...events.map((e) => ({
      title: e.data.title,
      url: `/events/${e.id}`,
      kind: eventTypeLabels[e.data.type] ?? '学术活动',
      summary: e.data.summary,
      body: bodyText(e.body),
      tags: [e.data.location],
    })),
    ...research.map((e) => ({
      title: e.data.title,
      url: `/research/${e.id}`,
      kind: '研究方向',
      summary: e.data.summary,
      body: bodyText(e.body),
      tags: e.data.keywords,
    })),
    ...projects.map((e) => ({
      title: e.data.title,
      url: `/projects/${e.id}`,
      kind: '科研项目',
      summary: e.data.summary,
      body: bodyText(e.body),
      tags: [e.data.funder],
    })),
    ...topics.map((e) => ({
      title: e.data.title,
      url: `/topics/${e.id}`,
      kind: '专题',
      summary: e.data.summary,
      body: bodyText(e.body),
      tags: e.data.keywords,
    })),
    ...datasets.map((e) => ({
      title: e.data.name,
      url: `/datasets#${e.id}`,
      kind: '数据集',
      summary: e.data.description,
      body: bodyText(e.body),
      tags: e.data.keywords,
    })),
  ];

  return new Response(JSON.stringify(docs), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
