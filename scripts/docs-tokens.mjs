#!/usr/bin/env node
/**
 * docs-tokens.mjs —— 文档 / 令牌一致性门禁（DOCS-001）
 *
 * 为什么有这个脚本：
 *   docs/DESIGN_SYSTEM.md 曾两次与 tokens.css 漂移 ——
 *   列出过不存在的 `--color-border` / `--color-border-strong`（实际是 line / line-strong）
 *   和凭空出现的 `--color-info`；又曾把一个不存在的 `--shadow-focus` 写成 Button 的焦点环实现。
 *   文档天然混入「打算做」的内容，靠人肉记忆守不住，所以做一次名词反查。
 *
 * 判定：文档里以 `--xxx` 形式引用的每个令牌，必须在 tokens.css 里有定义。
 *   - 跳过纯破折号（`---` 是 markdown 分隔线）
 *   - 跳过以 `-` 结尾的名字（`--color-on-masthead-*` 这类通配写法）
 *   - 跳过 DELETED 白名单：这些是**故意**写在文档里、用来警告「已删除，不要加回来」的
 *
 * 用法：node scripts/docs-tokens.mjs     （发现问题退出码 1）
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = join(ROOT, 'docs');
const TOKENS = join(ROOT, 'src', 'styles', 'tokens.css');

/**
 * 已删除的令牌：文档里**必须**能提到它们（作为「别加回来」的警告），
 * 所以不算漂移。新增到此表前，请先确认它确实被删了且文档是在警告而非在描述现状。
 */
const DELETED = new Set([
  'color-masthead-soft', // 与 --color-accent-hover 同值，重复
  'color-info', // 从未使用
  'color-border', // 改名 --color-line
  'color-border-strong', // 改名 --color-line-strong
  'shadow-focus', // 与 global.css 的 :focus-visible outline 重复
  'header-h', // 与 --nav-h 同义重复
]);

const tokensCss = readFileSync(TOKENS, 'utf8');
const defined = new Set([...tokensCss.matchAll(/--([a-z0-9-]+)\s*:/g)].map((m) => m[1]));

const docs = readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md'));
let problems = 0;

console.log('\n  文档 / 令牌一致性门禁 · DOCS-001');
console.log(`  校验 ${docs.length} 份文档引用的令牌是否都存在于 tokens.css\n`);

for (const doc of docs) {
  // 先剥掉 HTML 注释再抽取令牌：文档里会写 <!--astro:end--> 这类标记做示例，
  // 其中的 `--astro` 会被令牌正则误当成令牌名（假阳性）。
  const text = readFileSync(join(DOCS_DIR, doc), 'utf8').replace(/<!--[\s\S]*?-->/g, ' ');
  const referenced = new Set(
    [...text.matchAll(/`(--[a-z0-9-]+)`|(--[a-z0-9-]+)/g)].map((m) => (m[1] || m[2]).slice(2))
  );

  const missing = [...referenced].filter((n) => {
    if (/^-+$/.test(n)) return false; // markdown 分隔线
    if (n.endsWith('-')) return false; // 通配前缀写法
    if (defined.has(n)) return false;
    if (DELETED.has(n)) return false; // 故意的「已删除」警告
    return true;
  });

  if (missing.length) {
    console.log(`  ${doc}`);
    for (const m of missing) console.log(`    ✗ --${m}  （tokens.css 中不存在）`);
    problems += missing.length;
  }
}

if (problems) {
  console.log(`\n  ✗ 共 ${problems} 处引用了不存在的令牌。`);
  console.log('    要么改文档，要么把令牌加进 tokens.css —— 若它确实已删除，');
  console.log('    请加入本脚本的 DELETED 白名单并写明删除原因。\n');
  process.exit(1);
}

console.log(`  ✓ 反查通过：${docs.length} 份文档引用的令牌全部有定义（已排除 ${DELETED.size} 个「已删除」白名单项）\n`);
