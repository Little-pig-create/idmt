/**
 * 把出版条目（来自 src/content/publications/）转成 BibTeX 字符串。
 *
 * 设计原则：
 * - 中英文作者都按字面给出，姓氏在前（BibTeX 不强求英文）；
 * - key 用「首作者 + 年份 + 标题首个有意义的英文/拉丁词」拼成，不做去重；
 * - DOI 自动拼上 https://doi.org/ 前缀（如果原本没有 http）。
 */

const TYPE_MAP: Record<string, string> = {
  journal: 'article',
  conference: 'inproceedings',
  book: 'book',
  patent: 'misc',
  report: 'techreport',
};

function escape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/[{}]/g, '\\$&')
    .replace(/\s+/g, ' ');
}

function authorList(authors: string[]): string {
  if (authors.length === 0) return '';
  return authors.map((a) => a.trim()).filter(Boolean).join(' and ');
}

function makeKey(authors: string[], year: number, title: string): string {
  const firstAuthor = authors[0] ?? 'anon';
  // 优先取 ASCII 姓氏；若作者全为中文（无空格 → split 后唯一 token），用前 1 个汉字作姓
  const tokens = firstAuthor.split(/\s+/);
  const asciiSurname = tokens.length > 1 ? tokens[tokens.length - 1] : '';
  const cnSurname = !asciiSurname ? firstAuthor.charAt(0) : '';
  const surname = (asciiSurname || cnSurname || 'anon').toLowerCase();
  // 标题里取首个以 [A-Za-z0-9] 开头的英文/拉丁词；无则取前 8 个字符做 slug
  const enWord = title
    .split(/[\s,，。；：:；、·\(\)\[\]【】"'`]+/)
    .find((w) => /^[A-Za-z0-9]/.test(w));
  const tail = enWord ? enWord.toLowerCase().slice(0, 8) : title.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'pub';
  return `${surname}${year}${tail}`.replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
}

export interface BibtexPublication {
  title: string;
  authors: string[];
  venue: string;
  year: number;
  type: string;
  doi?: string;
  pdf?: string;
}

export function toBibtex(p: BibtexPublication): string {
  const entry = TYPE_MAP[p.type] ?? 'misc';
  const key = makeKey(p.authors, p.year, p.title);
  const doi = p.doi ? (p.doi.startsWith('http') ? p.doi : `https://doi.org/${p.doi}`) : undefined;
  const fields = [
    `  title = {${escape(p.title)}}`,
    `  author = {${authorList(p.authors)}}`,
    `  year = {${p.year}}`,
  ];
  if (entry === 'article') fields.push(`  journal = {${escape(p.venue)}}`);
  else if (entry === 'inproceedings') fields.push(`  booktitle = {${escape(p.venue)}}`);
  else fields.push(`  publisher = {${escape(p.venue)}}`);
  if (doi) fields.push(`  doi = {${escape(doi)}}`);
  if (p.pdf) fields.push(`  url = {${escape(p.pdf)}}`);
  if (entry === 'techreport') fields.push(`  institution = {数字管理研究院}`);
  return `@${entry}{${key},\n${fields.join(',\n')}\n}`;
}