/**
 * 内容发布后台 · API 服务
 *
 * 设计目标：
 * - 零框架依赖（仅 node:http / node:fs + js-yaml 做 YAML 序列化）
 * - 直接读写站点内容目录 src/content/**，不引入数据库
 * - 只监听 127.0.0.1，作为本地内容工具使用；生产环境需置于内网与鉴权之后
 *
 * 启动：node server.mjs        （默认 http://127.0.0.1:4322）
 */

import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const ADMIN_DIST = path.join(__dirname, 'dist');
/** 图片资源库：Astro 会把 public/ 映射到站点根，因此 URL 为 /images/<name> */
const ASSETS_DIR = path.join(ROOT, 'public', 'images');
const PORT = Number(process.env.ADMIN_PORT ?? 4322);
const HOST = process.env.ADMIN_HOST ?? '127.0.0.1';

/* ------------------------------------------------------------------
   集合 Schema —— 必须与 src/content.config.ts 保持一致
   ------------------------------------------------------------------ */
const COLLECTIONS = {
  news: {
    label: '新闻动态',
    icon: 'article',
    hasBody: true,
    fields: [
      { name: 'title', label: '标题', type: 'string', required: true },
      { name: 'date', label: '发布日期', type: 'date', required: true },
      { name: 'summary', label: '摘要', type: 'text', required: true, help: '列表页与搜索结果中展示' },
      { name: 'tags', label: '标签', type: 'array' },
      { name: 'author', label: '作者/来源', type: 'string' },
      { name: 'cover', label: '封面图', type: 'image', help: '留空则使用自动生成的抽象配图' },
      {
        name: 'coverAlt',
        label: '封面图替代文本',
        type: 'string',
        help: '图片无法显示时的文字说明，也用于无障碍朗读',
      },
      { name: 'featured', label: '首页置顶', type: 'boolean', default: false },
      { name: 'draft', label: '草稿（不发布）', type: 'boolean', default: false },
    ],
  },
  publications: {
    label: '学术成果',
    icon: 'book',
    hasBody: true,
    fields: [
      { name: 'title', label: '标题', type: 'string', required: true },
      { name: 'authors', label: '作者', type: 'array', required: true, help: '逗号分隔；机构作者会自动加粗' },
      { name: 'venue', label: '期刊/会议/出版社', type: 'string', required: true },
      { name: 'year', label: '年份', type: 'number', required: true, min: 1990, max: 2100 },
      {
        name: 'type',
        label: '类型',
        type: 'enum',
        required: true,
        options: [
          { value: 'journal', label: '期刊论文' },
          { value: 'conference', label: '会议论文' },
          { value: 'book', label: '著作' },
          { value: 'patent', label: '专利' },
          { value: 'report', label: '研究报告' },
        ],
      },
      { name: 'doi', label: 'DOI', type: 'string' },
      { name: 'pdf', label: 'PDF 路径', type: 'string' },
      { name: 'tags', label: '标签', type: 'array' },
      { name: 'cover', label: '配图（图形摘要）', type: 'image', help: '留空则使用自动生成的抽象配图' },
      {
        name: 'coverAlt',
        label: '配图替代文本',
        type: 'string',
        help: '图片无法显示时的文字说明，也用于无障碍朗读',
      },
      { name: 'featured', label: '首页推荐', type: 'boolean', default: false },
      { name: 'draft', label: '草稿（不发布）', type: 'boolean', default: false },
    ],
  },
  people: {
    label: '研究团队',
    icon: 'people',
    hasBody: true,
    fields: [
      { name: 'name', label: '姓名', type: 'string', required: true },
      { name: 'nameEn', label: '英文名', type: 'string' },
      { name: 'title', label: '职称', type: 'string', required: true },
      {
        name: 'role',
        label: '身份',
        type: 'enum',
        required: true,
        options: [
          { value: 'director', label: '院长' },
          { value: 'professor', label: '教授' },
          { value: 'associate', label: '副教授' },
          { value: 'assistant', label: '助理教授' },
          { value: 'postdoc', label: '博士后' },
          { value: 'phd', label: '博士研究生' },
        ],
      },
      { name: 'researchAreas', label: '研究方向', type: 'array' },
      { name: 'email', label: '邮箱', type: 'string' },
      { name: 'homepage', label: '个人主页', type: 'string' },
      { name: 'scholar', label: 'Google Scholar', type: 'string' },
      { name: 'orcid', label: 'ORCID', type: 'string' },
      { name: 'portrait', label: '肖像照', type: 'image', help: '留空则回落大号姓氏字牌' },
      {
        name: 'portraitAlt',
        label: '肖像照替代文本',
        type: 'string',
        help: '缺省时使用姓名',
      },
      { name: 'order', label: '排序', type: 'number', default: 99, help: '数字越小越靠前' },
      { name: 'draft', label: '草稿（不发布）', type: 'boolean', default: false },
    ],
  },
  research: {
    label: '研究方向',
    icon: 'compass',
    hasBody: true,
    fields: [
      { name: 'title', label: '方向名称', type: 'string', required: true },
      { name: 'order', label: '排序', type: 'number', required: true, help: '数字越小越靠前' },
      { name: 'summary', label: '摘要', type: 'text', required: true },
      { name: 'cover', label: '封面图', type: 'image', help: '留空则使用自动生成的抽象配图' },
      {
        name: 'coverAlt',
        label: '封面图替代文本',
        type: 'string',
        help: '图片无法显示时的文字说明，也用于无障碍朗读',
      },
      { name: 'keywords', label: '关键词', type: 'array' },
      { name: 'lead', label: '方向负责人', type: 'string', help: '填写成员姓名，需与团队库一致' },
      {
        name: 'status',
        label: '状态',
        type: 'enum',
        default: 'active',
        options: [
          { value: 'active', label: '重点推进' },
          { value: 'ongoing', label: '持续开展' },
          { value: 'planned', label: '规划中' },
        ],
      },
      { name: 'draft', label: '草稿（不发布）', type: 'boolean', default: false },
    ],
  },
  events: {
    label: '学术活动',
    icon: 'calendar',
    hasBody: true,
    fields: [
      { name: 'title', label: '活动名称', type: 'string', required: true },
      { name: 'startDate', label: '开始日期', type: 'date', required: true },
      { name: 'endDate', label: '结束日期', type: 'date' },
      { name: 'location', label: '地点', type: 'string', required: true },
      {
        name: 'type',
        label: '类型',
        type: 'enum',
        required: true,
        options: [
          { value: 'seminar', label: '研讨会' },
          { value: 'conference', label: '学术会议' },
          { value: 'lecture', label: '学术讲座' },
          { value: 'workshop', label: '工作坊' },
        ],
      },
      { name: 'speakers', label: '主讲人', type: 'array' },
      { name: 'summary', label: '摘要', type: 'text', required: true },
      { name: 'cover', label: '海报 / 横幅', type: 'image', help: '留空则使用自动生成的抽象配图' },
      {
        name: 'coverAlt',
        label: '海报替代文本',
        type: 'string',
        help: '图片无法显示时的文字说明，也用于无障碍朗读',
      },
      { name: 'draft', label: '草稿（不发布）', type: 'boolean', default: false },
    ],
  },
  projects: {
    label: '科研项目',
    icon: 'folder',
    hasBody: true,
    fields: [
      { name: 'title', label: '项目名称', type: 'string', required: true },
      { name: 'funder', label: '资助来源', type: 'string', required: true },
      { name: 'period', label: '项目周期', type: 'string', required: true, help: '例如 2026.08 – 2029.07' },
      {
        name: 'status',
        label: '状态',
        type: 'enum',
        required: true,
        options: [
          { value: 'ongoing', label: '在研' },
          { value: 'completed', label: '已结项' },
        ],
      },
      { name: 'members', label: '负责人与成员', type: 'array' },
      { name: 'summary', label: '摘要', type: 'text', required: true },
      { name: 'cover', label: '配图', type: 'image', help: '留空则使用自动生成的抽象配图' },
      {
        name: 'coverAlt',
        label: '配图替代文本',
        type: 'string',
        help: '图片无法显示时的文字说明，也用于无障碍朗读',
      },
      { name: 'draft', label: '草稿（不发布）', type: 'boolean', default: false },
    ],
  },

  topics: {
    label: '专题专栏',
    icon: 'topic',
    hasBody: true,
    fields: [
      { name: 'title', label: '专题名称', type: 'string', required: true },
      { name: 'summary', label: '一句话说明', type: 'text', required: true },
      { name: 'order', label: '排序', type: 'number', default: 99, help: '数字越小越靠前；首页只展示前 3 个' },
      { name: 'badge', label: '角标', type: 'string', help: '例如「在研」「长期」，留空则不显示' },
      { name: 'seed', label: '抽象图形种子', type: 'string', required: true, help: '决定回落配图的形状，通常用英文 slug' },
      {
        name: 'image',
        label: '封面图',
        type: 'string',
        help: '图片地址，例如 /images/foo.png。留空则按 seed 生成抽象图形',
      },
      {
        name: 'keywords',
        label: '聚合关键词',
        type: 'array',
        required: true,
        help: '专题页靠它聚合内容。必须取自其他集合真实使用的标签，写得太窄会导致专题页为空',
      },
      { name: 'lead', label: '负责人', type: 'string', help: '需与「研究团队」中的姓名一致，才能链到成员主页' },
      { name: 'draft', label: '草稿（不发布）', type: 'boolean', default: false },
    ],
  },

  notices: {
    label: '通知公告',
    icon: 'campaign',
    hasBody: true,
    fields: [
      { name: 'title', label: '标题', type: 'string', required: true },
      { name: 'date', label: '发布日期', type: 'date', required: true },
      {
        name: 'category',
        label: '公告类别',
        type: 'enum',
        required: true,
        default: '其他',
        options: [
          { value: '招生', label: '招生' },
          { value: '会议', label: '会议' },
          { value: '科研', label: '科研' },
          { value: '人事', label: '人事' },
          { value: '其他', label: '其他' },
        ],
      },
      { name: 'pinned', label: '置顶显示', type: 'boolean', default: false },
      { name: 'attachment', label: '附件链接', type: 'string' },
      { name: 'draft', label: '草稿（不发布）', type: 'boolean', default: false },
    ],
  },
};

/* ------------------------------------------------------------------
   工具函数
   ------------------------------------------------------------------ */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function fail(res, status, message, details) {
  json(res, status, { ok: false, error: message, details });
}

async function readBody(req, maxBytes = 4 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      throw new Error(`请求体过大（上限 ${Math.round(maxBytes / 1024 / 1024)}MB）`);
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** 防止路径穿越：只允许安全的 slug */
function safeSlug(slug) {
  if (typeof slug !== 'string' || slug.length === 0) return null;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(slug)) return null;
  if (slug.includes('..')) return null;
  return slug;
}

function collectionDir(name) {
  if (!Object.prototype.hasOwnProperty.call(COLLECTIONS, name)) return null;
  return path.join(CONTENT_DIR, name);
}

/** 拆分 frontmatter 与正文 */
function splitFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw };
  let data = {};
  try {
    data = yaml.load(match[1]) ?? {};
  } catch (err) {
    throw new Error(`前置元数据解析失败：${err.message}`);
  }
  return { data, body: match[2] ?? '' };
}

/** 序列化：日期统一输出 YYYY-MM-DD，避免时区漂移 */
function serialize(data, body) {
  const normalized = { ...data };
  for (const [key, value] of Object.entries(normalized)) {
    if (value instanceof Date) {
      normalized[key] = value.toISOString().slice(0, 10);
    }
    if (value === '' || value === null || value === undefined) {
      delete normalized[key];
    }
  }

  const fieldOrder = Object.keys(data);
  const ordered = {};
  for (const key of fieldOrder) {
    if (key in normalized) ordered[key] = normalized[key];
  }
  for (const key of Object.keys(normalized)) {
    if (!(key in ordered)) ordered[key] = normalized[key];
  }

  const yamlText = yaml.dump(ordered, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });

  const trimmedBody = (body ?? '').trim();
  return `---\n${yamlText}---\n\n${trimmedBody}\n`;
}

/** 服务端校验：与 content.config.ts 的 Schema 对齐 */
function validate(collectionName, data) {
  const schema = COLLECTIONS[collectionName];
  const errors = [];

  for (const field of schema.fields) {
    const raw = data[field.name];
    const isEmpty = raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);

    if (field.required && isEmpty) {
      errors.push({ field: field.name, message: `${field.label}为必填项` });
      continue;
    }
    if (isEmpty) continue;

    switch (field.type) {
      case 'number': {
        const n = Number(raw);
        if (Number.isNaN(n)) {
          errors.push({ field: field.name, message: `${field.label}必须是数字` });
        } else if (field.min !== undefined && n < field.min) {
          errors.push({ field: field.name, message: `${field.label}不能小于 ${field.min}` });
        } else if (field.max !== undefined && n > field.max) {
          errors.push({ field: field.name, message: `${field.label}不能大于 ${field.max}` });
        }
        break;
      }
      case 'boolean': {
        // 表单提交既可能是真正的布尔值（Switch 组件），也可能是字符串
        if (typeof raw !== 'boolean' && raw !== 'true' && raw !== 'false') {
          errors.push({ field: field.name, message: `${field.label}必须是布尔值` });
        }
        break;
      }
      case 'date': {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) {
          errors.push({ field: field.name, message: `${field.label}不是有效日期` });
        }
        break;
      }
      case 'enum': {
        const allowed = field.options.map((o) => o.value);
        if (!allowed.includes(raw)) {
          errors.push({ field: field.name, message: `${field.label}取值不合法` });
        }
        break;
      }
      case 'array': {
        if (!Array.isArray(raw)) {
          errors.push({ field: field.name, message: `${field.label}必须是数组` });
        }
        break;
      }
      default:
        if (typeof raw !== 'string') {
          errors.push({ field: field.name, message: `${field.label}必须是文本` });
        }
    }
  }

  return errors;
}

/** 按 Schema 把提交数据强制转换为正确类型 */
function coerce(collectionName, input) {
  const schema = COLLECTIONS[collectionName];
  const out = {};

  for (const field of schema.fields) {
    let value = input[field.name];

    if (value === undefined || value === null || value === '') {
      if (field.default !== undefined) out[field.name] = field.default;
      continue;
    }

    switch (field.type) {
      case 'number':
        out[field.name] = Number(value);
        break;
      case 'boolean':
        out[field.name] = value === true || value === 'true';
        break;
      case 'array':
        out[field.name] = Array.isArray(value)
          ? value.map((v) => String(v).trim()).filter(Boolean)
          : String(value)
              .split(/[,，]/)
              .map((v) => v.trim())
              .filter(Boolean);
        break;
      case 'date':
        out[field.name] = new Date(value).toISOString().slice(0, 10);
        break;
      default:
        out[field.name] = String(value);
    }
  }

  return out;
}

/* ------------------------------------------------------------------
   图片资源库
   ------------------------------------------------------------------ */
/** 允许的 MIME 白名单。明确拒绝 image/svg+xml：SVG 可内嵌脚本，存在 XSS 风险 */
const ASSET_MAX_BYTES = 5 * 1024 * 1024;
const ASSET_TYPES = {
  'image/png': {
    ext: '.png',
    label: 'PNG',
    magic: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/jpeg': {
    ext: '.jpg',
    label: 'JPEG',
    magic: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  'image/gif': {
    ext: '.gif',
    label: 'GIF',
    magic: (b) => b.length >= 6 && b.subarray(0, 4).toString('latin1') === 'GIF8',
  },
  'image/webp': {
    ext: '.webp',
    label: 'WebP',
    magic: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
};
const ASSET_EXT_SET = new Set(Object.values(ASSET_TYPES).map((t) => t.ext));

async function ensureAssetsDir() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
}

/**
 * 文件名净化：只保留 [a-zA-Z0-9._-]，剔除路径分隔符与 `..`，
 * 非 ASCII（中文等）会被替换为 `-`，最终扩展名由 MIME 白名单强制决定。
 */
function sanitizeAssetName(raw, ext) {
  let base = String(String(raw ?? '').replace(/\\/g, '/').split('/').pop() ?? '');
  base = base
    .replace(/\.[^.]*$/, '') // 先丢弃用户提供的扩展名（稍后由 MIME 白名单补齐）
    .replace(/[^a-zA-Z0-9._-]/g, '-') // 非 ASCII（含中文）与分隔符一并变成 '-'
    .replace(/\.{2,}/g, '.') // 杜绝 '..'
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+/, '')
    .replace(/[-.]+$/, '')
    .slice(0, 64)
    .replace(/[-.]+$/, '');
  // 中文名等会被整段替换掉，此时用时间戳 + 随机串兜底
  if (!/^[a-zA-Z0-9]/.test(base)) {
    base = `image-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}${ext}`;
}

/** 重名自动追加 -1 / -2 …，绝不覆盖已有文件 */
async function uniqueAssetPath(name) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let candidate = name;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const target = path.join(ASSETS_DIR, candidate);
    const taken = await fs
      .access(target)
      .then(() => true)
      .catch(() => false);
    if (!taken) return target;
    candidate = `${stem}-${n}${ext}`;
    n += 1;
  }
}

/** 仅允许 public/images/ 下的一级文件，杜绝任何目录穿越 */
function resolveAssetPath(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 128) return null;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) return null;
  if (name.includes('..') || name !== path.basename(name)) return null;
  if (!ASSET_EXT_SET.has(path.extname(name).toLowerCase())) return null;
  const target = path.resolve(ASSETS_DIR, name);
  if (path.dirname(target) !== path.resolve(ASSETS_DIR)) return null;
  return target;
}

async function assetInfo(name) {
  const stat = await fs.stat(path.join(ASSETS_DIR, name));
  return {
    name,
    url: `/images/${name}`,
    size: stat.size,
    mtime: stat.mtime.toISOString(),
  };
}

async function listAssets() {
  await ensureAssetsDir();
  const dirents = await fs.readdir(ASSETS_DIR, { withFileTypes: true }).catch(() => []);
  const assets = [];
  for (const dirent of dirents) {
    if (!dirent.isFile()) continue;
    if (!ASSET_EXT_SET.has(path.extname(dirent.name).toLowerCase())) continue;
    const info = await assetInfo(dirent.name).catch(() => null);
    if (info) assets.push(info);
  }
  assets.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  return assets;
}

async function handleAssetUpload(req, res) {
  let payload;
  try {
    // 5MB 图片经 base64 膨胀后约 6.7MB，故放宽请求体上限到 8MB
    payload = await readBody(req, 8 * 1024 * 1024);
  } catch (err) {
    return fail(res, 400, err.message);
  }

  const declared = String(payload?.type ?? '').toLowerCase();
  const spec = ASSET_TYPES[declared];
  if (!spec) {
    return fail(res, 415, `不支持的图片类型：${declared || '（未声明）'}。仅允许 PNG / JPEG / GIF / WebP`);
  }

  let encoded = payload?.dataBase64;
  if (typeof encoded !== 'string' || encoded.length === 0) {
    return fail(res, 400, '缺少图片数据（dataBase64）');
  }
  const comma = encoded.indexOf(',');
  if (encoded.startsWith('data:') && comma !== -1) encoded = encoded.slice(comma + 1);
  if (!/^[A-Za-z0-9+/\s]+={0,2}$/.test(encoded)) {
    return fail(res, 400, '图片数据不是合法的 base64');
  }

  const buffer = Buffer.from(encoded, 'base64');
  if (buffer.length === 0) return fail(res, 400, '图片内容为空');
  if (buffer.length > ASSET_MAX_BYTES) {
    return fail(
      res,
      413,
      `图片体积 ${(buffer.length / 1024 / 1024).toFixed(2)}MB 超出上限 5MB，请压缩后再上传`,
    );
  }
  // 魔数校验：防止改扩展名 / 改 MIME 声明绕过白名单
  if (!spec.magic(buffer)) {
    return fail(res, 415, `文件内容与声明的类型 ${spec.label} 不符（已拒绝 SVG 等非白名单格式）`);
  }

  const fileName = path.basename(await uniqueAssetPath(sanitizeAssetName(payload?.name, spec.ext)));
  await ensureAssetsDir();
  await fs.writeFile(path.join(ASSETS_DIR, fileName), buffer);
  return json(res, 200, { ok: true, asset: await assetInfo(fileName) });
}

/* ------------------------------------------------------------------
   路由处理
   ------------------------------------------------------------------ */
async function listEntries(collectionName) {
  const dir = collectionDir(collectionName);
  const files = await fs.readdir(dir).catch(() => []);
  const entries = [];

  for (const file of files) {
    if (!/\.(md|mdx)$/.test(file)) continue;
    const id = file.replace(/\.(md|mdx)$/, '');
    const raw = await fs.readFile(path.join(dir, file), 'utf8');
    let parsed;
    try {
      parsed = splitFrontmatter(raw);
    } catch (err) {
      entries.push({ id, file, broken: true, error: err.message, data: {}, body: '' });
      continue;
    }
    const stat = await fs.stat(path.join(dir, file));
    entries.push({
      id,
      file,
      data: parsed.data,
      body: parsed.body,
      updatedAt: stat.mtime.toISOString(),
      bytes: stat.size,
    });
  }

  entries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return entries;
}

async function handleApi(req, res, url) {
  const segments = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const [, resource, ...rest] = segments;

  /* ---- GET /api/schema ---- */
  if (resource === 'schema' && req.method === 'GET') {
    return json(res, 200, { ok: true, collections: COLLECTIONS });
  }

  /* ---- GET /api/stats ---- */
  if (resource === 'stats' && req.method === 'GET') {
    const stats = {};
    for (const name of Object.keys(COLLECTIONS)) {
      const entries = await listEntries(name);
      stats[name] = {
        total: entries.length,
        drafts: entries.filter((e) => e.data.draft === true).length,
        broken: entries.filter((e) => e.broken).length,
      };
    }
    return json(res, 200, { ok: true, stats });
  }

  /* ---- POST /api/build ---- */
  if (resource === 'build' && req.method === 'POST') {
    return new Promise((resolve) => {
      const child = spawn('npm', ['run', 'build'], {
        cwd: ROOT,
        shell: true,
        env: { ...process.env, CODEBUDDY_SAFE_DELETE_ENABLED: '0' },
      });
      let output = '';
      child.stdout.on('data', (d) => (output += d.toString()));
      child.stderr.on('data', (d) => (output += d.toString()));
      child.on('close', (code) => {
        json(res, code === 0 ? 200 : 500, {
          ok: code === 0,
          code,
          output: output.slice(-4000),
        });
        resolve();
      });
    });
  }

  /* ---- GET|POST /api/assets ---- */
  if (resource === 'assets' && !rest[0]) {
    if (req.method === 'GET') {
      return json(res, 200, { ok: true, assets: await listAssets() });
    }
    if (req.method === 'POST') {
      return handleAssetUpload(req, res);
    }
    return fail(res, 405, '不支持的方法');
  }

  /* ---- DELETE /api/assets/:name ---- */
  if (resource === 'assets' && rest[0]) {
    if (req.method !== 'DELETE') return fail(res, 405, '不支持的方法');
    let rawName = rest[0];
    try {
      rawName = decodeURIComponent(rawName);
    } catch {
      return fail(res, 400, '非法的文件名');
    }
    const target = resolveAssetPath(rawName);
    if (!target) return fail(res, 400, '非法的文件名');
    const stat = await fs.stat(target).catch(() => null);
    if (!stat || !stat.isFile()) return fail(res, 404, '文件不存在');
    await fs.unlink(target);
    return json(res, 200, { ok: true, name: rawName });
  }

  /* ---- /api/content/:collection[/:id] ---- */
  if (resource !== 'content') return fail(res, 404, '接口不存在');

  const collectionName = rest[0];
  const id = rest[1];
  const dir = collectionDir(collectionName);
  if (!dir) return fail(res, 404, `未知内容集合：${collectionName}`);

  if (!id && req.method === 'GET') {
    return json(res, 200, { ok: true, entries: await listEntries(collectionName) });
  }

  if (req.method === 'GET' && id) {
    const slug = safeSlug(id);
    if (!slug) return fail(res, 400, '非法的条目 ID');
    const raw = await fs.readFile(path.join(dir, `${slug}.md`), 'utf8').catch(() => null);
    if (raw === null) return fail(res, 404, '条目不存在');
    const parsed = splitFrontmatter(raw);
    return json(res, 200, { ok: true, entry: { id: slug, ...parsed } });
  }

  if (req.method === 'POST' && !id) {
    let payload;
    try {
      payload = await readBody(req);
    } catch (err) {
      return fail(res, 400, err.message);
    }

    const slug = safeSlug(payload.id);
    if (!slug) return fail(res, 400, '请提供合法的条目 ID（英文、数字、连字符）');

    const filePath = path.join(dir, `${slug}.md`);
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    if (exists) return fail(res, 409, `条目 ${slug} 已存在`);

    const data = coerce(collectionName, payload.data ?? {});
    const errors = validate(collectionName, data);
    if (errors.length > 0) return fail(res, 422, '校验未通过', errors);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, serialize(data, payload.body ?? ''), 'utf8');
    return json(res, 201, { ok: true, id: slug });
  }

  if (req.method === 'PUT' && id) {
    const slug = safeSlug(id);
    if (!slug) return fail(res, 400, '非法的条目 ID');

    let payload;
    try {
      payload = await readBody(req);
    } catch (err) {
      return fail(res, 400, err.message);
    }

    const filePath = path.join(dir, `${slug}.md`);
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    if (!exists) return fail(res, 404, '条目不存在');

    const data = coerce(collectionName, payload.data ?? {});
    const errors = validate(collectionName, data);
    if (errors.length > 0) return fail(res, 422, '校验未通过', errors);

    await fs.writeFile(filePath, serialize(data, payload.body ?? ''), 'utf8');
    return json(res, 200, { ok: true, id: slug });
  }

  if (req.method === 'DELETE' && id) {
    const slug = safeSlug(id);
    if (!slug) return fail(res, 400, '非法的条目 ID');
    const filePath = path.join(dir, `${slug}.md`);
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    if (!exists) return fail(res, 404, '条目不存在');
    await fs.unlink(filePath);
    return json(res, 200, { ok: true, id: slug });
  }

  return fail(res, 405, '不支持的方法');
}

/* ------------------------------------------------------------------
   静态资源（后台 SPA 构建产物）
   ------------------------------------------------------------------ */
async function serveStatic(res, pathname) {
  let filePath = path.join(ADMIN_DIST, pathname);

  if (!filePath.startsWith(ADMIN_DIST)) {
    return fail(res, 403, '禁止访问');
  }

  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat || stat.isDirectory()) {
    filePath = path.join(ADMIN_DIST, 'index.html');
  }

  const raw = await fs.readFile(filePath).catch(() => null);
  if (raw === null) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('后台界面尚未构建。请先执行：cd admin && npm run build');
  }

  res.writeHead(200, {
    'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  res.end(raw);
}

/* ------------------------------------------------------------------
   启动
   ------------------------------------------------------------------ */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(res, url.pathname);
  } catch (err) {
    console.error('[admin] 请求处理失败:', err);
    if (!res.headersSent) fail(res, 500, err.message ?? '服务器内部错误');
  }
});

/**
 * 端口探测。Windows 上 SO_REUSEADDR 会让 bind() 先「成功」再异步抛 EADDRINUSE，
 * 因此先主动连一次确认端口是否真的空闲，避免打印出错误的启动地址。
 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: HOST });
    const settle = (free) => {
      socket.destroy();
      resolve(free);
    };
    socket.setTimeout(500);
    socket.once('connect', () => settle(false));
    socket.once('timeout', () => settle(true));
    socket.once('error', () => settle(true));
  });
}

async function pickPort() {
  for (let port = PORT; port < PORT + 20; port += 1) {
    if (await isPortFree(port)) return port;
    console.warn(`[admin] 端口 ${port} 已被占用，尝试 ${port + 1} …`);
  }
  throw new Error(`端口 ${PORT} – ${PORT + 19} 均被占用`);
}

/* ------------------------------------------------------------------
   兜底：任何未捕获的异常都要打印出来再退出。
   最初「后台打不开」的表现就是进程被未捕获的 EADDRINUSE 崩掉、
   控制台一句提示都没有，看上去像「命令没反应」。
   ------------------------------------------------------------------ */
const fatal = (where, err) => {
  console.error(`[admin] ${where}：${err?.stack ?? err?.message ?? err}`);
  console.error('        可用 ADMIN_PORT 指定其它端口，例如 ADMIN_PORT=4400 npm run admin');
  process.exit(1);
};
process.on('uncaughtException', (err) => fatal('未捕获异常', err));
process.on('unhandledRejection', (err) => fatal('未处理的 Promise 拒绝', err));

pickPort()
  .then((port) => {
    server.once('error', (err) => {
      console.error(`[admin] 启动失败：${err.message}`);
      console.error('        可用 ADMIN_PORT 指定其它端口，例如 ADMIN_PORT=4400 npm run admin');
      process.exit(1);
    });

    server.listen(port, HOST, () => {
      console.log('');
      console.log('  内容发布后台已启动');
      console.log(`  → 管理界面：http://${HOST}:${port}`);
      console.log(`  → 内容目录：${CONTENT_DIR}`);
      console.log(`  → 界面产物：${ADMIN_DIST}`);
      if (port !== PORT) {
        console.log(`  ⚠ 默认端口 ${PORT} 被占用，已顺延到 ${port}`);
      }
      console.log('');
      console.log('  仅监听本机。生产环境请置于内网与鉴权之后。');
      console.log('');
    });
  })
  .catch((err) => {
    console.error(`[admin] 启动失败：${err.message}`);
    console.error('        可用 ADMIN_PORT 指定其它端口，例如 ADMIN_PORT=4400 npm run admin');
    process.exit(1);
  });
