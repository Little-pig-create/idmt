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
  // 数据集集合化后必须进搜索索引（此前是硬编码数组，索引收不到）
  { path: '/search-index.json', contains: '"/datasets#' },
  { path: '/search-index.json', contains: '基层治理数字化案例库' },
  { path: '/robots.txt', contains: 'Sitemap' },

  // ---------- 学术检索元数据（Highwire Press）----------
  // 没有这些标签，成果页在 Google Scholar 一类学术检索链路里是隐形的。
  { path: '/publications/local-data-bureau-diffusion', contains: 'name="citation_title"' },
  { path: '/publications/local-data-bureau-diffusion', contains: 'name="citation_author" content="陈立"' },
  { path: '/publications/local-data-bureau-diffusion', contains: 'name="citation_author" content="何雨桐"' },
  { path: '/publications/local-data-bureau-diffusion', contains: 'name="citation_journal_title"' },
  { path: '/publications/local-data-bureau-diffusion', contains: 'name="citation_doi"' },
  { path: '/publications/local-data-bureau-diffusion', contains: 'name="citation_abstract"' },
  { path: '/publications/local-data-bureau-diffusion', contains: 'name="citation_language" content="zh"' },
  // 卷 / 期 / 页码：GB/T 7714 引用条目必需，缺失时条目会不完整
  { path: '/publications/local-data-bureau-diffusion', contains: 'name="citation_volume"' },
  { path: '/publications/local-data-bureau-diffusion', contains: 'name="citation_issue"' },
  { path: '/publications/local-data-bureau-diffusion', contains: 'name="citation_firstpage"' },
  { path: '/publications/local-data-bureau-diffusion', contains: 'name="citation_lastpage"' },
  // 会议论文的载体字段名与期刊不同，写错抓取器会整条忽略
  { path: '/publications/elderly-platform-design-workshop', contains: 'name="citation_conference_title"' },

  // ---------- 学术体例 ----------
  // GB/T 7714 是中文期刊投稿与学位论文的强制引用格式
  { path: '/publications/local-data-bureau-diffusion', contains: 'GB/T 7714' },
  { path: '/publications/local-data-bureau-diffusion', contains: '[J]' },
  // 卷期页码齐备时条目必须是完整的 `刊名, 年, 卷(期): 起止页.`
  { path: '/publications/local-data-bureau-diffusion', contains: '公共管理学报, 2025, 22(6): 42-58.' },
  // 各文献类型的标识码（期刊 J / 会议 C / 著作 M / 报告 R）
  { path: '/publications/data-market-institutions-book', contains: '[M]' },
  { path: '/publications/elderly-platform-design-workshop', contains: '[C]' },
  { path: '/publications/open-data-trust-framework', contains: '[R]' },
  // 中文刊名用书名号，不用斜体（中文无真斜体，浏览器会合成机械倾斜）
  { path: '/publications/local-data-bureau-diffusion', contains: '《公共管理学报》' },
  { path: '/publications/local-data-bureau-diffusion', contains: 'not-italic' },
  // 拉丁刊名保留斜体
  { path: '/publications/robust-allocation-ambiguity', contains: 'European Journal of Operational Research' },
  // 摘要与关键词按学术体例标注
  { path: '/publications/local-data-bureau-diffusion', contains: 'abstract-block' },
  { path: '/publications/local-data-bureau-diffusion', contains: '关键词：' },
  // 数据集引用用国标 [DS] 标识码
  { path: '/datasets', contains: '[DS]' },
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