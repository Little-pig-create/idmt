#!/usr/bin/env node
/**
 * 字体子集覆盖度检查（提示级，不阻断）。
 *
 *   npm run fonts:check
 *
 * 比对 dist 里真实渲染出的字符与子集字符表，报出没被覆盖的字符。
 *
 * 为什么只提示、不判失败：内容维护走「后台改 md → push → CI」这条链，
 * 而重新生成子集需要 41 MB 源字体和 python 工具链，不是改内容的人能做的。
 * 设成硬门禁等于让一次新用字卡住整条发布流水线。
 * 未覆盖的字符也不会变成豆腐块：@font-face 没写 unicode-range，
 * 浏览器会按 tokens.css 的字体栈回退到系统中文字体，代价只是那一个字观感不齐。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CHARSET = path.join(ROOT, 'src', 'styles', 'fonts-charset.txt');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

if (!fs.existsSync(CHARSET)) {
  console.error('缺 src/styles/fonts-charset.txt —— 先跑 npm run fonts');
  process.exit(1);
}
if (!fs.existsSync(DIST)) {
  console.error('缺 dist/ —— 先跑 npm run build');
  process.exit(1);
}

const covered = new Set(fs.readFileSync(CHARSET, 'utf8'));
const missing = new Map();
let pages = 0;

for (const file of walk(DIST)) {
  pages += 1;
  for (const ch of visibleText(fs.readFileSync(file, 'utf8'))) {
    const cp = ch.codePointAt(0);
    if (cp <= 0x20 || cp === 0xad || (cp >= 0x200b && cp <= 0x200f)) continue;
    if (covered.has(ch)) continue;
    if (!missing.has(ch)) missing.set(ch, []);
    const where = missing.get(ch);
    if (where.length < 3) where.push(path.relative(DIST, file));
  }
}

console.log(`字体子集覆盖度 · FONTS-001`);
console.log(`  扫描 ${pages} 页 · 子集覆盖 ${covered.size} 字符`);

if (missing.size === 0) {
  console.log('\n  ✓ 全部渲染字符都在子集内');
  process.exit(0);
}

console.log(`\n  ! ${missing.size} 个字符不在子集内，将以系统字体回退渲染：`);
for (const [ch, where] of [...missing].sort((a, b) => a[0].codePointAt(0) - b[0].codePointAt(0))) {
  console.log(`    ${ch} (U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})  ${where.join(', ')}`);
}
console.log('\n  补齐方式：把新字符写进内容后跑 npm run fonts，再提交 public/fonts/ 与 fonts-charset.txt');
console.log('  （不阻断发布，只是那几个字观感不齐）');
