/**
 * 站点冒烟脚本：对 preview/preview 部署做 HTTP 断言。
 *
 * 用法：
 *   1) 启服务：cd 仓库根 && npm run preview  （端口 4321）
 *   2) 另一进程：node scripts/smoke.mjs
 *
 * CI 中通常是先 build → 起预览 → 跑本脚本 → 关停。
 */
const TARGET = process.env.SMOKE_URL ?? 'http://localhost:4321';

const routes = [
  { path: '/', contains: '数字管理研究院' },
  { path: '/about', contains: '研究院' },
  { path: '/research', contains: '研究方向' },
  { path: '/research/digital-governance', contains: '数字治理' },
  { path: '/people', contains: '研究人员' },
  { path: '/people/chen-li', contains: '陈立' },
  { path: '/publications', contains: '全部成果' },
  { path: '/publications/data-property-contract', contains: 'BibTeX' },
  { path: '/projects', contains: '科研项目' },
  { path: '/projects/public-data-pricing', contains: '定价机制' },
  { path: '/projects/institutional-fit-grassroots', contains: '制度适配' },
  { path: '/news', contains: '新闻动态' },
  { path: '/notices', contains: '通知公告' },
  { path: '/events', contains: '学术活动' },
  { path: '/events/2026-09-causal-lecture', contains: '因果识别' },
  { path: '/events/2026-05-youth-forum', contains: '青年学者论坛' },
  { path: '/topics', contains: '全部专题' },
  { path: '/topics/grassroots-governance', contains: '基层治理数字化观察' },
  { path: '/topics/data-authorization', contains: '公共数据授权运营' },
  { path: '/datasets', contains: '数据集' },
  { path: '/join', contains: '加入我们' },
  { path: '/contact', contains: '联系' },
  { path: '/search', contains: '搜索' },
  // dev 下由 endpoint 返回 application/rss+xml；静态托管时主机按扩展名推断为 text/xml，两者 RSS 阅读器都认
  { path: '/rss.xml', contains: '<rss', type: ['application/rss+xml', 'text/xml', 'application/xml'] },
  { path: '/sitemap-index.xml', contains: '<sitemapindex' },
  { path: '/search-index.json', contains: '[{' },
  // 回归防护：搜索索引必须指向详情页，而不是列表页
  { path: '/search-index.json', contains: '"/projects/public-data-pricing"' },
  { path: '/search-index.json', contains: '"/events/2026-09-causal-lecture"' },
  { path: '/search-index.json', contains: '"/publications/' },
  { path: '/robots.txt', contains: 'Sitemap' },
];

let failed = 0;
for (const r of routes) {
  const url = TARGET + r.path;
  const res = await fetch(url);
  const body = await res.text();
  const ok = res.ok;
  const contains = r.contains ? body.includes(r.contains) : true;
  const typeOk = r.type
    ? Array.isArray(r.type)
      ? r.type.some((t) => (res.headers.get('content-type') || '').includes(t))
      : (res.headers.get('content-type') || '').includes(r.type)
    : true;
  if (!ok || !contains || !typeOk) {
    failed += 1;
    console.log(`✗ ${r.path}  status=${res.status} contains=${contains} type=${typeOk ? '—' : res.headers.get('content-type')}`);
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