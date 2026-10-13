import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 内容模型：字段缺失或类型错误时构建失败。
 * 这是内容质量的唯一守门人，不依赖人工检查。
 */

const news = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    author: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    /** 封面图 URL，例如 /images/foo.png；留空则回落抽象图形 */
    cover: z.string().optional(),
    /** 封面图替代文本 */
    coverAlt: z.string().optional(),
  }),
});

const notices = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notices' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    /** 公告类别 */
    category: z.enum(['招生', '会议', '科研', '人事', '其他']).default('其他'),
    /** 是否置顶 */
    pinned: z.boolean().default(false),
    /** 附件链接（可选） */
    attachment: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/publications' }),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    venue: z.string(),
    year: z.number().int().min(1990).max(2100),
    type: z.enum(['journal', 'conference', 'book', 'patent', 'report']),
    /**
     * 卷 / 期 / 页码：GB/T 7714 引用条目必需（`刊名, 年, 卷(期): 起止页码`）。
     * 全部可选 —— 会议论文、著作、报告通常没有卷期，缺失时引用生成器按类型降级。
     */
    volume: z.string().optional(),
    issue: z.string().optional(),
    /** 起止页码，用半角连字符，例如 "1-18" */
    pages: z.string().optional(),
    doi: z.string().optional(),
    pdf: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    /** 配图 URL（图形摘要 / 封面），例如 /images/foo.png；留空则回落抽象图形 */
    cover: z.string().optional(),
    /** 配图替代文本 */
    coverAlt: z.string().optional(),
  }),
});

const people = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/people' }),
  schema: z.object({
    name: z.string(),
    nameEn: z.string().optional(),
    title: z.string(),
    role: z.enum(['director', 'exec-director', 'vice-director', 'professor', 'associate', 'assistant', 'postdoc', 'phd']),
    researchAreas: z.array(z.string()).default([]),
    email: z.string().optional(),
    homepage: z.string().optional(),
    scholar: z.string().optional(),
    orcid: z.string().optional(),
    order: z.number().int().default(99),
    draft: z.boolean().default(false),
    /** 肖像照 URL，例如 /images/foo.jpg；留空则回落大号姓氏字牌 */
    portrait: z.string().optional(),
    /** 肖像照替代文本（缺省时用姓名） */
    portraitAlt: z.string().optional(),
  }),
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    order: z.number().int(),
    summary: z.string(),
    keywords: z.array(z.string()).default([]),
    lead: z.string().optional(),
    status: z.enum(['active', 'ongoing', 'planned']).default('active'),
    draft: z.boolean().default(false),
    /** 封面图 URL，例如 /images/foo.png；留空则回落抽象图形 */
    cover: z.string().optional(),
    /** 封面图替代文本 */
    coverAlt: z.string().optional(),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    location: z.string(),
    type: z.enum(['seminar', 'conference', 'lecture', 'workshop']),
    speakers: z.array(z.string()).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
    /** 海报 / 横幅 URL，例如 /images/foo.png；留空则回落抽象图形 */
    cover: z.string().optional(),
    /** 海报替代文本 */
    coverAlt: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    funder: z.string(),
    period: z.string(),
    status: z.enum(['ongoing', 'completed']),
    members: z.array(z.string()).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
    /** 配图 URL，例如 /images/foo.png；留空则回落抽象图形 */
    cover: z.string().optional(),
    /** 配图替代文本 */
    coverAlt: z.string().optional(),
  }),
});

/**
 * 专题：跨内容类型的横向聚合层。
 *
 * 研究成果 / 新闻 / 活动 / 项目 都是「纵向」列表，专题把它们按主题串起来 ——
 * 这是门户区别于「一堆列表」的关键一层。
 *
 * keywords 是聚合的唯一依据：命中即归入该专题。
 * 因此关键词必须取自其他集合真实使用的 tag / 领域词，写得太窄会导致专题页空空如也。
 */
const topics = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/topics' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number().default(99),
    /** 角标，例如「在研」「长期」 */
    badge: z.string().optional(),
    /** 抽象图形种子（配图回落后使用） */
    seed: z.string(),
    /** 真实封面图 URL；留空则回落抽象图形 */
    image: z.string().optional(),
    /** 聚合关键词，与其他集合的 tags / 领域词对应 */
    keywords: z.array(z.string()).default([]),
    /** 负责人姓名，匹配到 people 时给出主页链接 */
    lead: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

/**
 * 数据集：学术产出的一种，与论文同等重要（GB/T 7714 里标识码为 [DS]）。
 *
 * 此前它是 `src/pages/datasets.astro` 里的一个常量数组 —— 加数据集要改代码、
 * 后台管不了、搜索索引收不到。集合化后内容文件重新成为唯一数据源。
 */
const datasets = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/datasets' }),
  schema: z.object({
    /** 数据集名称（注意不是 title，避免与「页面标题」混淆） */
    name: z.string(),
    description: z.string(),
    /** 许可协议，例如 CC BY 4.0 */
    license: z.string(),
    /** 获取方式，例如「开放下载」「需提交研究用途说明后获取」 */
    access: z.string(),
    /** 覆盖时段，例如 2024-2027 */
    period: z.string().optional(),
    /** 数据体量或更新频率，例如「按季度更新」 */
    scale: z.string().optional(),
    /** 访问链接（开放下载时给出） */
    href: z.string().optional(),
    /** 检索关键词 */
    keywords: z.array(z.string()).default([]),
    /** 排序权重，越小越靠前 */
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  news,
  notices,
  publications,
  people,
  research,
  events,
  projects,
  topics,
  datasets,
};
