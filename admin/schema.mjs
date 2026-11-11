/**
 * 后台内容模型 —— 必须与 src/content.config.ts 保持一致。
 * 这里同时承担：表单生成、写入校验、YAML 序列化字段顺序。
 */

export const COLLECTIONS = {
  research: {
    label: '研究方向',
    icon: 'compass',
    description: '首页与 /research 的方向卡片、详情页',
    hasBody: true,
    fields: [
      { name: 'title', label: '中文名称', type: 'string', required: true },
      { name: 'titleEn', label: '英文名称', type: 'string', required: true },
      { name: 'order', label: '排序', type: 'number', required: true, default: 99 },
      { name: 'summary', label: '一句话概述', type: 'text', required: true },
      { name: 'keywords', label: '关键词', type: 'array' },
      { name: 'capabilities', label: '关键能力', type: 'array' },
      { name: 'products', label: '关联产品 slug', type: 'array' },
      { name: 'cover', label: '封面图', type: 'image' },
      { name: 'coverAlt', label: '封面替代文本', type: 'string' },
      { name: 'draft', label: '草稿', type: 'boolean', default: false },
    ],
  },
  products: {
    label: '产品与方案',
    icon: 'box',
    description: '产品库与详情页规格表',
    hasBody: true,
    fields: [
      { name: 'title', label: '产品名称', type: 'string', required: true },
      { name: 'titleEn', label: '英文名称', type: 'string' },
      {
        name: 'category',
        label: '分类',
        type: 'enum',
        required: true,
        options: ['智能算力', '智能网联', '机器人', '数据智能', '先进制造', '新能源', '低空经济', '智慧空间', '智慧医疗'],
      },
      { name: 'summary', label: '一句话概述', type: 'text', required: true },
      { name: 'order', label: '排序', type: 'number', default: 99 },
      { name: 'specs', label: '关键指标', type: 'keyvalue' },
      { name: 'highlights', label: '方案要点', type: 'array' },
      { name: 'image', label: '主图', type: 'image' },
      { name: 'imageAlt', label: '主图替代文本', type: 'string' },
      { name: 'tags', label: '标签', type: 'array' },
      { name: 'draft', label: '草稿', type: 'boolean', default: false },
    ],
  },
  labs: {
    label: '技术平台',
    icon: 'flask',
    description: '实验室、分中心与公共平台',
    hasBody: true,
    fields: [
      { name: 'name', label: '名称', type: 'string', required: true },
      { name: 'nameEn', label: '英文名称', type: 'string' },
      {
        name: 'group',
        label: '分组',
        type: 'enum',
        required: true,
        options: ['专业实验室', '研究中心分中心', '公共平台'],
      },
      { name: 'order', label: '排序', type: 'number', required: true, default: 99 },
      { name: 'summary', label: '概述', type: 'text', required: true },
      { name: 'capability', label: '能力说明', type: 'text' },
      { name: 'draft', label: '草稿', type: 'boolean', default: false },
    ],
  },
  news: {
    label: '新闻动态',
    icon: 'newspaper',
    description: '首页要闻、新闻列表与详情',
    hasBody: true,
    fields: [
      { name: 'title', label: '标题', type: 'string', required: true },
      { name: 'date', label: '发布日期', type: 'date', required: true },
      { name: 'summary', label: '摘要', type: 'text', required: true },
      { name: 'tags', label: '标签', type: 'array' },
      { name: 'author', label: '作者 / 来源', type: 'string' },
      { name: 'featured', label: '首页头条', type: 'boolean', default: false },
      { name: 'cover', label: '封面图', type: 'image' },
      { name: 'coverAlt', label: '封面替代文本', type: 'string' },
      { name: 'draft', label: '草稿', type: 'boolean', default: false },
    ],
  },
};

export const COLLECTION_KEYS = Object.keys(COLLECTIONS);
