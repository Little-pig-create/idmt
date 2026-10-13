/**
 * 站点冒烟脚本：对 preview/preview 部署做 HTTP 断言。
 *
 * 用法：
 *   1) 启服务：cd 仓库根 && npm run preview  （端口 4321）
 *   2) 另一进程：node scripts/smoke.mjs
 *
 * CI 中通常是先 build → 起预览 → 跑本脚本 → 关停。
 */
import path from 'node:path';
import { readSiteConfig } from './config.mjs';

const TARGET = process.env.SMOKE_URL ?? 'http://localhost:4321';

/**
 * 断言用的完整 URL。
 * 项目站挂在 /<repo>/ 下，根绝对路径的断言会全部打到站点之外；
 * SMOKE_URL 自带路径时以它为准，否则取 astro.config.mjs 的 base。
 */
const target = new URL(TARGET);
const prefix = target.pathname.replace(/\/+$/, '') || readSiteConfig(path.resolve(import.meta.dirname, '..')).base;
const targetUrl = (p) => `${target.origin}${prefix}${p}`;

const routes = [
  { path: '/', contains: '数字管理技术研究院' },
  { path: '/about', contains: '浙江树人学院' },
  { path: '/about', contains: '组织架构' },
  { path: '/research', contains: '研究方向' },
  { path: '/research/ai-unmanned-systems', contains: '人工智能与无人系统' },
  { path: '/research/digital-infrastructure-smart-city', contains: '数字新基建与智慧城市' },
  { path: '/research/cloud-data-intelligence', contains: '云计算与数据智能' },
  { path: '/research/industrial-digitalization', contains: '高端制造与工业数字化' },
  { path: '/people', contains: '研究团队' },
  { path: '/people/yan-hong', contains: '阎洪' },
  { path: '/people/wu-jie', contains: '执行院长' },
  { path: '/people/liu-ziyang', contains: '刘子阳' },
  { path: '/news', contains: '新闻动态' },
  { path: '/news/2025-11-yuehu-forum', contains: '越湖论坛' },
  { path: '/news/2026-07-asia-conference', contains: '亚太数字产业与安全文化' },
  { path: '/events', contains: '学术活动' },
  { path: '/events/2025-yuehu-forum', contains: '京畿大学' },
  { path: '/events/2026-asia-digital-safety-conference', contains: '杨汛桥校区' },
  { path: '/join', contains: '加入我们' },
  { path: '/contact', contains: '联系' },
  { path: '/search', contains: '搜索' },
  // rss.xml 只能收录已发布条目：新内容进、假内容不出，两端都要断言
  { path: '/rss.xml', contains: '<rss', type: ['application/rss+xml', 'text/xml', 'application/xml'] },
  { path: '/rss.xml', contains: '越湖论坛' },
  { path: '/sitemap-index.xml', contains: '<sitemapindex' },
  { path: '/search-index.json', contains: '[{' },
  // 回归防护：搜索索引必须指向详情页，而不是列表页
  { path: '/search-index.json', contains: '"/news/2025-11-yuehu-forum"' },
  { path: '/search-index.json', contains: '"/events/2025-yuehu-forum"' },
  { path: '/search-index.json', contains: '"/people/yan-hong"' },
  { path: '/robots.txt', contains: 'Sitemap' },

  // ---------- 空集合页必须落到诚实的空状态 ----------
  // 这些集合的旧条目是虚构内容，已整批置 draft: true。
  // 断言的是「页面存在 + 明示尚未录入」，而不是悄悄留一个空白页。
  { path: '/publications', contains: '暂无收录成果' },
  { path: '/projects', contains: '暂无项目信息' },
  { path: '/datasets', contains: '暂无开放数据集' },
  { path: '/topics', contains: '暂无专题' },
  { path: '/notices', contains: '暂无公告' },

  // ---------- 完整性守卫：虚构内容不得可达 ----------
  // draft 开关的验收标准不是「列表页看不见」，而是直接访问详情 URL 也必须 404。
  { path: '/people/chen-li', status: 404 },
  { path: '/research/digital-government', status: 404 },
  { path: '/research/data-economy', status: 404 },
  { path: '/publications/local-data-bureau-diffusion', status: 404 },
  { path: '/projects/public-data-pricing', status: 404 },
  { path: '/events/2026-09-causal-lecture', status: 404 },
  { path: '/topics/grassroots-governance', status: 404 },
  { path: '/datasets/grassroots-governance-cases', status: 404 },
  { path: '/news/2026-award', status: 404 },
  // 旧站名的拼音残留页也不应存在
  { path: '/search-index.json', doesNotContain: '基层治理数字化案例库' },
];

/**
 * 内容机制断言：验证的是 Highwire Press 标签、GB/T 7714 条目格式、文献类型标识码
 * （期刊 J / 会议 C / 著作 M / 报告 R）、书名号刊名 not-italic、摘要与关键词块、
 * 数据集 [DS] 标识码 —— 这些机制本身是对的，但断言对象是虚构成果，已随内容一起下架。
 * 真实成果入库后把这些条目移回 routes，覆盖即恢复。
 */
const deferred = [
  'citation_title / citation_author / citation_journal_title / citation_doi / citation_abstract',
  'citation_volume / citation_issue / citation_firstpage / citation_lastpage',
  'citation_conference_title（会议论文载体字段）',
  'GB/T 7714 条目与 [J] [C] [M] [R] 标识码',
  '中文刊名书名号 + not-italic，拉丁刊名保留斜体',
  'abstract-block 与「关键词：」',
  '数据集 [DS] 标识码',
];

let failed = 0;
for (const r of routes) {
  const url = targetUrl(r.path);
  const res = await fetch(url);
  const body = await res.text();
  // status 断言用于「必须不可达」的条目（下架内容），默认仍要求 2xx
  const statusOk = r.status ? res.status === r.status : res.ok;
  const contains = r.contains ? body.includes(r.contains) : true;
  const absent = r.doesNotContain ? !body.includes(r.doesNotContain) : true;
  const typeOk = r.type
    ? Array.isArray(r.type)
      ? r.type.some((t) => (res.headers.get('content-type') || '').includes(t))
      : (res.headers.get('content-type') || '').includes(r.type)
    : true;
  if (!statusOk || !contains || !absent || !typeOk) {
    failed += 1;
    console.log(
      `✗ ${r.path}  status=${res.status}${r.status ? `(期望 ${r.status})` : ''} contains=${contains} absent=${absent} type=${typeOk ? '—' : res.headers.get('content-type')}`,
    );
  } else {
    console.log(`✓ ${r.path}  ${res.status}  ${body.length}B`);
  }
}

if (failed > 0) {
  console.log(`\n${failed}/${routes.length} 条失败`);
  process.exit(1);
} else {
  console.log(`\n✅ ${routes.length}/${routes.length} 全部通过`);
}

if (deferred.length) {
  console.log(`\n⚠️  另有 ${deferred.length} 类内容机制断言挂起（断言对象随虚构内容一起下架，待真实成果入库后恢复）：`);
  for (const d of deferred) console.log(`   · ${d}`);
}