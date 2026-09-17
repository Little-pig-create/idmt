/**
 * SCHEMA-REF-001：模板里引用的内容字段必须在某个集合的 schema 里存在。
 *
 * 由来：`publications/[slug].astro` 曾写 `data.body ? <Content /> : ...`，
 * 但 `data` 是 `item.data`（frontmatter），根本没有 `body` 字段 ——
 * 于是三元恒假，10 个成果页全部只显示「（暂无摘要）」，正文一次都没渲染。
 * 而 audit / taste / smoke 全都发现不了（页面照样 200、照样有标题）。
 *
 * 做法：解析 content.config.ts 取全部集合字段的并集，再扫模板里的
 * `.data.X` 与裸 `data.X`，凡不在并集里的即报警。
 *
 * 只做「全局并集」判存，不做「哪个集合该有哪个字段」的精确归属 ——
 * 后者需要跨文件推断变量对应的集合，成本高且易误报；
 * 而打错字段名（body / auther / titel）这类真实事故，并集判存足以全部抓住。
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CONFIG = join(ROOT, 'src/content.config.ts');

/** 递归收集文件 */
function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.astro') continue;
      walk(p, exts, out);
    } else if (exts.some((e) => p.endsWith(e))) {
      out.push(p);
    }
  }
  return out;
}

/** 解析 content.config.ts → { collections: Map<name, Set<field>>, allFields: Set } */
function parseSchema(src) {
  const collections = new Map();
  const allFields = new Set();
  // 每个 `const <name> = defineCollection({ ... });`
  const blockRe = /const\s+(\w+)\s*=\s*defineCollection\(\{([\s\S]*?)\n\}\);/g;
  let m;
  while ((m = blockRe.exec(src))) {
    const [, name, body] = m;
    const fields = new Set();
    // schema 是 z.object({...})，字段在文件里缩进 4 空格
    const objIdx = body.indexOf('z.object({');
    if (objIdx !== -1) {
      const objBody = body.slice(objIdx);
      for (const fm of objBody.matchAll(/^\s{4}(\w+):/gm)) fields.add(fm[1]);
    }
    collections.set(name, fields);
    for (const f of fields) allFields.add(f);
  }
  return { collections, allFields };
}

const configSrc = readFileSync(CONFIG, 'utf8');
const { collections, allFields } = parseSchema(configSrc);

if (collections.size === 0) {
  console.error('✗ 没能从 content.config.ts 解析出任何集合，检查解析正则');
  process.exit(2);
}

const files = walk(join(ROOT, 'src'), ['.astro', '.tsx', '.ts']);

/**
 * 已知合法的「非 frontmatter 字段」：内容条目自身的属性，不在 schema 里。
 * - body：原始正文（就是这次事故的元凶，必须放行到 entry 级，禁止出现在 data 下）
 * - id / filePath / digest / collection / rendered / slug：Astro 条目自带
 */
const ENTRY_LEVEL = new Set(['body', 'id', 'filePath', 'digest', 'collection', 'rendered', 'slug']);

const problems = [];
const seen = new Map(); // file -> Set(field)

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const hits = new Set();

  // 1) `.data.X`
  for (const m of src.matchAll(/\.data\.(\w+)/g)) hits.add(m[1]);
  // 2) 裸 `data.X`（前面不是 . 或单词字符），例如 `const data = item.data` 后的 `data.body`
  for (const m of src.matchAll(/(?<![.\w$])data\.(\w+)/g)) hits.add(m[1]);

  for (const field of hits) {
    if (allFields.has(field)) continue; // 是某个集合的合法字段
    if (ENTRY_LEVEL.has(field)) {
      // entry 级属性：只有挂在 entry 上才合法（item.body），挂在 data 下就是 bug。
      // 因为这里无法可靠区分 `item.body` 与 `data.body`，只在明确出现 `data.body` 时报警。
      if (new RegExp(`\\bdata\\.${field}\\b`).test(src)) {
        problems.push({ file, field, kind: 'entry-level-on-data' });
      }
      continue;
    }
    problems.push({ file, field, kind: 'unknown' });
  }
}

const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');

console.log(`集合数：${collections.size} · 字段并集：${allFields.size} 个 · 扫描文件：${files.length}`);
for (const [name, fields] of collections) {
  console.log(`  - ${name}: ${[...fields].join(', ')}`);
}

if (problems.length === 0) {
  console.log('\n✓ SCHEMA-REF-001 通过：模板引用的字段全部有定义');
  process.exit(0);
}

console.log(`\n✗ SCHEMA-REF-001：发现 ${problems.length} 处可疑字段引用\n`);
for (const p of problems) {
  const hint =
    p.kind === 'entry-level-on-data'
      ? '这是条目级属性，只能写成 `item.body`，不能写成 `data.body`（data 只有 frontmatter）'
      : 'schema 中不存在该字段';
  console.log(`  ${rel(p.file)}  →  data.${p.field}  （${hint}）`);
}
process.exit(1);
