/**
 * 学术引用与检索元数据生成。
 *
 * 两个出口：
 * 1. `toCitationMeta` —— Highwire Press `<meta name="citation_*">`，
 *    Google Scholar / 部分机构库抓取论文元数据靠的就是这套标签。
 *    没有它，成果页在常规搜索引擎里能搜到，但在学术检索链路里是隐形的。
 * 2. `toGbt7714` —— GB/T 7714-2015《信息与文献 参考文献著录规则》条目，
 *    中文期刊投稿与学位论文的强制格式。BibTeX 只服务 LaTeX 用户，覆盖不了这批人。
 *
 * 与 `bibtex.ts` 的分工：那个负责 BibTeX，这个负责检索元数据与国标引用，
 * 两者共用同一份 publications schema，不重复定义类型映射。
 */

/** 文献类型标识码（GB/T 7714-2015 表 1） */
const GB_TYPE_CODE: Record<string, string> = {
  journal: 'J',
  conference: 'C',
  book: 'M',
  patent: 'P',
  report: 'R',
};

/** 含中日韩统一表意文字即按中文体例处理（书名号 + 不倾斜） */
export function isCJK(value: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(value);
}

/**
 * 作品名按语言分流：
 * - 中文：GB/T 7714 与中文出版惯例用书名号《》，且中文没有真斜体
 *   （Noto Serif SC / Noto Sans SC 均无 italic 字重，浏览器会合成机械倾斜）。
 * - 拉丁：期刊名用斜体，这是国际通例。
 */
export function formatVenue(venue: string): { text: string; italic: boolean } {
  return isCJK(venue) ? { text: `《${venue}》`, italic: false } : { text: venue, italic: true };
}

export interface CitationSource {
  title: string;
  authors: string[];
  venue: string;
  year: number;
  type: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  pdf?: string;
  /** 摘要，用于 citation_abstract */
  abstract?: string;
}

/** 把 "1-18" / "1–18" / "1 - 18" 统一拆成起止页；单页返回 firstpage 一项 */
function splitPages(pages?: string): { first?: string; last?: string } {
  if (!pages) return {};
  const normalized = pages.replace(/[\u2013\u2014]/g, '-');
  const [first, last] = normalized.split('-').map((p) => p.trim());
  if (!first) return {};
  return last && last !== first ? { first, last } : { first };
}

/** DOI 补全为可点击 URL；已是 http(s) 的原样返回 */
export function doiToUrl(doi: string): string {
  return doi.startsWith('http') ? doi : `https://doi.org/${doi}`;
}

/**
 * 生成 Highwire Press 元数据标签列表。
 *
 * 返回 `{ name, content }[]` 而不是拼好的 HTML 字符串 ——
 * `citation_author` 必须一人一条 `<meta>`（Google Scholar 按标签出现次数收集作者），
 * 数组形式让调用方用 `.map()` 直接展开，不会漏掉这一点。
 */
export function toCitationMeta(p: CitationSource, baseUrl?: string): { name: string; content: string }[] {
  const tags: { name: string; content: string }[] = [];

  tags.push({ name: 'citation_title', content: p.title });
  for (const author of p.authors) {
    if (author.trim()) tags.push({ name: 'citation_author', content: author.trim() });
  }
  tags.push({ name: 'citation_publication_date', content: String(p.year) });

  // 载体名按文献类型选择对应字段：期刊用 journal_title，会议用 conference_title，
  // 著作用 book_title —— 写错字段名抓取器会忽略整条记录。
  if (p.type === 'journal') {
    tags.push({ name: 'citation_journal_title', content: p.venue });
  } else if (p.type === 'conference') {
    tags.push({ name: 'citation_conference_title', content: p.venue });
  } else if (p.type === 'book') {
    tags.push({ name: 'citation_book_title', content: p.venue });
    tags.push({ name: 'citation_publisher', content: p.venue });
  } else if (p.type === 'report') {
    tags.push({ name: 'citation_publisher', content: p.venue });
  }

  if (p.volume) tags.push({ name: 'citation_volume', content: p.volume });
  if (p.issue) tags.push({ name: 'citation_issue', content: p.issue });

  const { first, last } = splitPages(p.pages);
  if (first) tags.push({ name: 'citation_firstpage', content: first });
  if (last) tags.push({ name: 'citation_lastpage', content: last });

  if (p.doi) tags.push({ name: 'citation_doi', content: p.doi });
  if (p.abstract) tags.push({ name: 'citation_abstract', content: p.abstract });
  if (p.pdf) {
    // citation_pdf_url 必须是绝对 URL，相对路径抓取器不认
    tags.push({ name: 'citation_pdf_url', content: baseUrl ? new URL(p.pdf, baseUrl).href : p.pdf });
  }
  tags.push({ name: 'citation_language', content: 'zh' });

  return tags;
}

/**
 * 生成 GB/T 7714-2015 引用条目。
 *
 * 期刊：`作者. 题名[J]. 刊名, 年, 卷(期): 起止页码.`
 * 会议：`作者. 题名[C]//会议名, 年: 页码.`
 * 著作：`作者. 书名[M]. 出版者, 年.`
 * 报告：`作者. 题名[R]. 出版者, 年.`
 * 专利：`作者. 题名[P]. 年.`
 *
 * 卷期页码是可选字段：缺失时逐级降级（`28(4)` → `28` → `(4)` → 无），
 * 而不是留一个空的括号 —— 不完整的引用条目也比带空占位符的强。
 */
export function toGbt7714(p: CitationSource): string {
  const code = GB_TYPE_CODE[p.type] ?? 'Z';
  const authors = p.authors.map((a) => a.trim()).filter(Boolean).join(', ');
  const head = authors ? `${authors}. ` : '';
  const { first, last } = splitPages(p.pages);
  const pageText = first ? (last ? `${first}-${last}` : first) : '';

  // 中文题名后不加句点分隔符（题名本身可能以问号等结尾），统一用 `. ` 拼接
  const titlePart = `${p.title}[${code}]`;

  if (p.type === 'journal') {
    const volIssue = p.volume && p.issue ? `${p.volume}(${p.issue})` : (p.volume ?? (p.issue ? `(${p.issue})` : ''));
    const tail = [String(p.year), volIssue].filter(Boolean).join(', ');
    const withPages = pageText ? `${tail}: ${pageText}` : tail;
    return `${head}${titlePart}. ${p.venue}, ${withPages}.`;
  }

  if (p.type === 'conference') {
    const tail = pageText ? `${p.year}: ${pageText}` : String(p.year);
    return `${head}${titlePart}. ${p.venue}, ${tail}.`;
  }

  if (p.type === 'book') {
    return `${head}${titlePart}. ${p.venue}, ${p.year}.`;
  }

  if (p.type === 'report') {
    return `${head}${titlePart}. ${p.venue}, ${p.year}.`;
  }

  // patent 及其它：schema 未提供专利号与日期字段，只出最小合规条目
  return `${head}${titlePart}. ${p.year}.`;
}

export interface DatasetCitationSource {
  name: string;
  /** 责任者，通常取相关成员姓名 */
  authors: string[];
  /** 覆盖时段，例如 2024-2027；未知时留空 */
  period?: string;
  /** 发布机构，缺省用研究院名 */
  publisher: string;
}

/**
 * 数据集的 GB/T 7714-2015 引用条目。
 *
 * 数据集在国标里的文献类型标识码是 `[DS]`（Dataset），格式：
 * `主要责任者. 题名[DS]. 出版者, 出版年.`
 *
 * 时段与出版年不是同一回事：时段描述数据覆盖范围，出版年描述发布时点。
 * schema 未记录发布年，因此用时段起始年兜底，并在条目里以时段形式给出可核验的信息。
 */
export function toDatasetCitation(d: DatasetCitationSource): string {
  const authors = d.authors.map((a) => a.trim()).filter(Boolean).join(', ');
  const head = authors ? `${authors}. ` : '';
  const period = d.period ? `（${d.period}）` : '';
  return `${head}${d.name}${period}[DS]. ${d.publisher}.`;
}
