#!/usr/bin/env node
/**
 * 产物冒烟（npm run smoke）
 * 直接检查 dist/：路由是否生成、首页标志性文案是否存在、内部链接与静态资源是否可达。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BASE = '/idmt';

if (!fs.existsSync(DIST)) {
  console.error('dist/ 不存在，请先 npm run build');
  process.exit(1);
}

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });

const fixedRoutes = [
  '/',
  '/about',
  '/research',
  '/products',
  '/labs',
  '/news',
  '/events',
  '/notices',
  '/join',
  '/contact',
  '/search',
];
const assetRoutes = ['/rss.xml', '/sitemap-index.xml', '/search-index.json', '/robots.txt'];

const distFile = (route) => {
  if (route === '/') return path.join(DIST, 'index.html');
  if (/\.(xml|json|txt)$/.test(route)) return path.join(DIST, route);
  return path.join(DIST, route, 'index.html');
};

for (const route of [...fixedRoutes, ...assetRoutes]) {
  const file = distFile(route);
  const exists = fs.existsSync(file);
  check(`路由 ${route}`, exists, exists ? '' : '文件不存在');
  if (exists && file.endsWith('.html')) {
    const html = fs.readFileSync(file, 'utf8');
    check(`  └ 含机构名`, html.includes('数字管理技术研究院'));
    check(`  └ 链接带部署前缀`, !/href="\/(?!idmt|#|mailto:|tel:)/.test(html.replace(/href="https?:[^"]*"/g, '')));
  }
}

for (const collection of ['research', 'products', 'news', 'events']) {
  const dir = path.join(ROOT, 'src', 'content', collection);
  const ids = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
  for (const id of ids) {
    const file = path.join(DIST, collection, id, 'index.html');
    check(`详情页 ${collection}/${id}`, fs.existsSync(file));
  }
}

const index = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
check('首页含首屏主张', index.includes('重塑产业未来'));
check('首页含研究方向', index.includes('智能算力与数字基础设施'));
check('首页含统计数据', index.includes('专业实验室'));

const searchIndex = JSON.parse(fs.readFileSync(path.join(DIST, 'search-index.json'), 'utf8'));
check('检索索引非空', searchIndex.length >= 40, `实际 ${searchIndex.length} 条`);

const images = fs.readdirSync(path.join(DIST, 'images'));
check('图片资源已产出', images.length >= 20, `实际 ${images.length} 个`);

const fonts = fs.readdirSync(path.join(DIST, 'fonts'));
check('字体子集已产出', fonts.some((f) => f.startsWith('NotoSansSC')) && fonts.some((f) => f.startsWith('LXGWZhiSong')));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  if (!item.ok) console.log(`  ✗ ${item.name} ${item.detail}`);
}
console.log(`\n  冒烟检查 ${checks.length} 项：${failed.length === 0 ? '全部通过' : `${failed.length} 项失败`}\n`);
process.exit(failed.length === 0 ? 0 : 1);
