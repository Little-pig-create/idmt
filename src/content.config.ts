import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 内容模型：字段缺失或类型错误时构建失败。
 * 内容源为 BP（IDMT 数研院 BP 初稿），后台 admin/server.mjs 的 COLLECTIONS 必须与本文件保持一致。
 */

const research = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    titleEn: z.string(),
    order: z.number().int(),
    summary: z.string(),
    keywords: z.array(z.string()).default([]),
    capabilities: z.array(z.string()).default([]),
    /** 该方向对应的产品 slug，详情页用于关联展示 */
    products: z.array(z.string()).default([]),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const products = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    titleEn: z.string().optional(),
    category: z.enum([
      '智能算力',
      '智能网联',
      '机器人',
      '数据智能',
      '先进制造',
      '新能源',
      '低空经济',
      '智慧空间',
      '智慧医疗',
    ]),
    summary: z.string(),
    order: z.number().int().default(99),
    specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    highlights: z.array(z.string()).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const labs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/labs' }),
  schema: z.object({
    name: z.string(),
    nameEn: z.string().optional(),
    group: z.enum(['专业实验室', '研究中心分中心', '公共平台']),
    order: z.number().int(),
    summary: z.string(),
    capability: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

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
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});

export const collections = { research, products, labs, news };
